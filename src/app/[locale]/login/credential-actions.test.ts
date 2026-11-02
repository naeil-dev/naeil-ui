import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  password: vi.fn(),
  otp: vi.fn(),
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
vi.mock("./actions", () => ({ prepareLogin: state.prepare }));
import * as passwordServer from "@/lib/auth/password-server";
import { changeCookie, LoginFailure } from "@/lib/auth/password-server";
import {
  passwordLogin,
  emailLogin,
  submitPasswordChange,
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
  vi.stubEnv("NAEIL_INVITE_CONFIG_JSON", JSON.stringify(config));
  vi.stubEnv("NAEIL_INVITE_CONFIG_FILE", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", config.supabaseUrl);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", config.anonKey);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
describe("login server actions", () => {
  it.each([2, 3])(
    "preserves an unresolved write until confirmed reissue (generation %s)",
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
      expect(state.del).toHaveBeenCalledTimes(generation === 3 ? 1 : 0);
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
      state.otp.mockImplementation(() => {
        if (error) throw error;
        return { error: null };
      });
      expect(await emailLogin(form())).toEqual({ status: "sent" });
      expect(state.otp.mock.calls[0][0].options.shouldCreateUser).toBe(false);
      expect(state.otp.mock.calls[0][0]).not.toHaveProperty("password");
    },
  );
});
