import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  password: vi.fn(),
  otp: vi.fn(),
  clear: vi.fn(),
  reauth: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  prepare: vi.fn(),
  stored: undefined as string | undefined,
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      signInWithPassword: state.password,
      signInWithOtp: state.otp,
      reauthenticate: state.reauth,
      getSession: async () => ({
        data: { session: { access_token: "fictional-token" } },
      }),
    },
  }),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    delete: state.del,
    set: state.set,
    get: () => (state.stored ? { value: state.stored } : undefined),
  }),
  headers: async () => new Headers({ origin: "https://naeil.dev" }),
}));
vi.mock("./actions", () => ({
  prepareLogin: state.prepare,
  clearLocalSession: state.clear,
}));
import * as passwordServer from "@/lib/auth/password-server";
import { changeCookie, LoginFailure } from "@/lib/auth/password-server";
import {
  passwordLogin,
  emailLogin,
  submitPasswordChange,
  beginPasswordChange,
  resumePasswordChange,
  leavePasswordChange,
  requestPasswordCode,
} from "./credential-actions";
const config = {
  siteOrigin: "https://naeil.dev",
  supabaseUrl: "https://fictional.supabase.co",
  anonKey: "fictional-anon",
  serviceRoleKey: "fictional-private",
  transactionStore: "supabase" as const,
  encryptionKey: Buffer.alloc(32, 7).toString("base64url"),
};
const form = () => {
  const f = new FormData();
  f.set("email", "id@users.naeil.dev");
  f.set("password", "fictional-password");
  f.set("locale", "ja");
  f.set("next", "https://jev.naeil.dev/");
  return f;
};
beforeEach(() => {
  vi.resetAllMocks();
  state.stored = undefined;
  state.set.mockImplementation((_name, value) => {
    state.stored = value;
  });
  state.del.mockImplementation(() => {
    state.stored = undefined;
  });
  vi.stubEnv("NAEIL_INVITE_CONFIG_JSON", JSON.stringify(config));
  vi.stubEnv("NAEIL_INVITE_CONFIG_FILE", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", config.supabaseUrl);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", config.anonKey);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
describe("login server actions", () => {
  it.each([2, 3])(
    "password sign-in retires the prior session binding (generation %s)",
    async (generation) => {
      const user = "a2000000-0000-0000-0000-000000000001",
        id = "a2000000-0000-0000-0000-000000000003";
      state.stored = changeCookie(config, {
        id,
        user,
        session: "a2000000-0000-0000-0000-000000000002",
        generation: 2,
        expires: Date.now() + 60000,
      }) as string;
      state.password.mockResolvedValue({
        data: {
          user: {
            id: user,
            app_metadata: {
              console_temp: {
                must_change: true,
                generation,
                locked: false,
                issued_at: new Date().toISOString(),
                operation_id: id,
              },
            },
          },
        },
      });
      expect((await passwordLogin(form())).status).toBe("signedIn");
      expect(state.del).toHaveBeenCalledTimes(1);
    },
  );
  it("advances the sealed binding only after a definitive password rejection", async () => {
    const op = {
      id: "a2000000-0000-0000-0000-000000000003",
      user: "a2000000-0000-0000-0000-000000000001",
      session: "a2000000-0000-0000-0000-000000000002",
      generation: 2,
      expires: Date.now() + 60000,
    };
    state.stored = changeCookie(config, op) as string;
    const next = { ...op, id: "a2000000-0000-0000-0000-000000000004" };
    vi.spyOn(passwordServer, "performChange").mockRejectedValue(
      new LoginFailure(422, "rejected"),
    );
    const start = vi.spyOn(passwordServer, "newChange").mockResolvedValue(next);
    const f = form();
    f.set("confirm", "fictional-password");
    expect(await submitPasswordChange(f)).toEqual({ status: "rejected" });
    expect(start).toHaveBeenCalledWith(
      config,
      "fictional-token",
      undefined,
      op,
    );
    expect(changeCookie(config, state.set.mock.calls[0][1])).toEqual(next);
    expect(state.del).not.toHaveBeenCalled();
  });
  it.each([2, 3])(
    "reconciles reissued OAuth/OTP sessions without losing generation %s writes",
    async (generation) => {
      const op = {
        id: "a2000000-0000-0000-0000-000000000003",
        user: "a2000000-0000-0000-0000-000000000001",
        session: "a2000000-0000-0000-0000-000000000002",
        generation: 2,
        expires: Date.now() + 60000,
      };
      state.stored = changeCookie(config, op) as string;
      vi.spyOn(passwordServer, "verifiedSession").mockResolvedValue({
        user: {
          id: op.user,
          app_metadata: {
            console_temp: {
              must_change: true,
              generation,
              locked: false,
              issued_at: new Date().toISOString(),
              operation_id: op.id,
            },
          },
        },
        session: op.session,
        call: vi.fn(),
      });
      vi.spyOn(passwordServer, "authTransport").mockReturnValue(async () => ({
        userId: op.user,
      }));
      const start = vi
        .spyOn(passwordServer, "newChange")
        .mockResolvedValue({ ...op, generation });
      expect((await beginPasswordChange()).status).toBe(
        generation === 3 ? "ready" : "retry",
      );
      expect(start).toHaveBeenCalledTimes(generation === 3 ? 1 : 0);
      expect(state.del).toHaveBeenCalledTimes(generation === 3 ? 1 : 0);
    },
  );
  it("retries initialization without submitting a password when no operation was admitted", async () => {
    vi.spyOn(passwordServer, "verifiedSession").mockResolvedValue({
      user: {
        id: "user",
        app_metadata: { console_temp: { must_change: true } },
      },
      session: "session",
      call: vi.fn(),
    });
    const start = vi.spyOn(passwordServer, "newChange").mockResolvedValue({
      id: "id",
      user: "user",
      session: "session",
      generation: 2,
      expires: Date.now() + 60000,
    });
    const write = vi.spyOn(passwordServer, "performChange");
    expect((await resumePasswordChange()).status).toBe("ready");
    expect(start).toHaveBeenCalledTimes(1);
    expect(write).not.toHaveBeenCalled();
  });
  it.each(["session", "user"])(
    "starts a new binding after changing %s on one browser",
    async (changed) => {
      const old = {
        id: "a2000000-0000-0000-0000-000000000003",
        user: "a2000000-0000-0000-0000-000000000001",
        session: "a2000000-0000-0000-0000-000000000002",
        generation: 2,
        expires: Date.now() + 60000,
      };
      const next = {
        ...old,
        [changed]: "a2000000-0000-0000-0000-000000000004",
      };
      state.stored = changeCookie(config, old) as string;
      vi.spyOn(passwordServer, "verifiedSession").mockResolvedValue({
        user: {
          id: next.user,
          app_metadata: { console_temp: { must_change: true } },
        },
        session: next.session,
        call: vi.fn(),
      });
      vi.spyOn(passwordServer, "newChange").mockResolvedValue(next);
      const write = vi
        .spyOn(passwordServer, "performChange")
        .mockResolvedValue();
      expect((await beginPasswordChange()).status).toBe("ready");
      const f = form();
      f.set("confirm", "fictional-password");
      expect((await submitPasswordChange(f)).status).toBe("changed");
      expect(write.mock.calls[0][2]).toEqual(next);
    },
  );
  it("recovers weak-password → back → sign in again → completes", async () => {
    const old = {
      id: "a2000000-0000-0000-0000-000000000003",
      user: "a2000000-0000-0000-0000-000000000001",
      session: "a2000000-0000-0000-0000-000000000002",
      generation: 2,
      expires: Date.now() + 60000,
    };
    state.stored = changeCookie(config, old) as string;
    const write = vi
      .spyOn(passwordServer, "performChange")
      .mockRejectedValueOnce(new LoginFailure(422, "rejected"))
      .mockResolvedValue();
    vi.spyOn(passwordServer, "newChange").mockResolvedValue(old);
    const f = form();
    f.set("confirm", "fictional-password");
    expect((await submitPasswordChange(f)).status).toBe("rejected");
    await leavePasswordChange();
    expect(state.stored).toBeUndefined();
    expect(state.clear).toHaveBeenCalled();
    state.password.mockResolvedValue({
      data: {
        user: {
          id: old.user,
          app_metadata: { console_temp: { must_change: true } },
        },
      },
    });
    expect((await passwordLogin(form())).status).toBe("signedIn");
    const next = { ...old, session: "a2000000-0000-0000-0000-000000000005" };
    vi.spyOn(passwordServer, "verifiedSession").mockResolvedValue({
      user: {
        id: old.user,
        app_metadata: { console_temp: { must_change: true } },
      },
      session: next.session,
      call: vi.fn(),
    });
    vi.mocked(passwordServer.newChange).mockResolvedValue(next);
    expect((await beginPasswordChange()).status).toBe("ready");
    expect((await submitPasswordChange(f)).status).toBe("changed");
    expect(write.mock.calls[1][2].session).toBe(next.session);
  });
  it.each([
    "invalid_credentials",
    "user_banned",
    "unexpected_failure",
    "PT409",
  ])("keeps %s neutral without any account lookup", async (code) => {
    state.password.mockResolvedValue({
      data: { user: null },
      error: { status: code === "unexpected_failure" ? 500 : 400, code },
    });
    const upstream = vi.spyOn(passwordServer, "authTransport");
    expect(await passwordLogin(form())).toEqual({ status: "error" });
    expect(upstream).not.toHaveBeenCalled();
  });
  it("validates empty email and requests a signed-in reauthentication code", async () => {
    const f = form();
    f.set("email", "");
    expect(await emailLogin(f)).toEqual({ status: "invalidEmail" });
    expect(state.otp).not.toHaveBeenCalled();
    state.reauth.mockResolvedValue({ error: null });
    expect(await requestPasswordCode()).toEqual({ status: "codeSent" });
  });
  it("overrides service next for must-change login", async () => {
    state.password.mockResolvedValue({
      data: {
        user: {
          id: "user",
          app_metadata: { console_temp: { must_change: true } },
        },
      },
    });
    expect(await passwordLogin(form())).toEqual({
      status: "signedIn",
      location: "/ja/login/change-password",
    });
  });
  it("keeps validated next for ordinary login and suppresses errors", async () => {
    state.password.mockResolvedValue({ data: { user: { id: "user" } } });
    const f = form();
    f.set("next", "//evil.test");
    expect(await passwordLogin(f)).toEqual({
      status: "signedIn",
      location: "/",
    });
    state.password.mockRejectedValue(new Error("private diagnostic"));
    expect(await passwordLogin(form())).toEqual({ status: "error" });
  });
  it.each([null, new Error("missing account"), new Error("throttled")])(
    "OTP is existing-user only and neutral (%s)",
    async (error) => {
      vi.useFakeTimers({ toFake: ["setTimeout", "performance"] });
      state.otp.mockImplementation(() => {
        if (error) throw error;
        return { error: null };
      });
      const started = performance.now(),
        result = emailLogin(form());
      await vi.runAllTimersAsync();
      expect(await result).toEqual({ status: "sent" });
      expect(performance.now() - started).toBe(1500);
      expect(state.otp.mock.calls[0][0].options.shouldCreateUser).toBe(false);
      expect(state.otp.mock.calls[0][0]).not.toHaveProperty("password");
    },
  );
});
