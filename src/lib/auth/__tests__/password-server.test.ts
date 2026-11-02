import { describe, expect, it } from "vitest";
import {
  authTransport,
  changeCookie,
  newChange,
  performChange,
  expiredLogin,
  LoginFailure,
  type ChangeOperation,
} from "../password-server";
import { requiresPasswordChange, loginEmail } from "../password-policy";

const uid = "a2000000-0000-0000-0000-000000000001",
  sid = "a2000000-0000-0000-0000-000000000002",
  oid = "a2000000-0000-0000-0000-000000000003";
const marker = {
  must_change: true,
  generation: 2,
  issued_at: new Date(Date.now() - 60000).toISOString(),
  locked: false,
  operation_id: oid,
};
const token = `header.${Buffer.from(JSON.stringify({ sub: uid, session_id: sid })).toString("base64url")}.signature`;
const config = {
  siteOrigin: "https://naeil.dev",
  supabaseUrl: "https://fictional.supabase.co",
  anonKey: "fictional-anon",
  serviceRoleKey: "fictional-private-canary",
  encryptionKey: Buffer.alloc(32, 7).toString("base64url"),
};
const password = { password: "fictional-password" };
const op: ChangeOperation = {
  id: oid,
  user: uid,
  session: sid,
  generation: 2,
  expires: Date.now() + 60000,
};
function fixture(
  options: {
    dispatch?: boolean;
    failure?: string;
    generation?: number;
    malformed?: boolean;
    reject?: boolean;
    ambiguous?: number;
  } = {},
) {
  const calls: {
    path: string;
    method: string;
    key: string;
    body: Record<string, unknown>;
  }[] = [];
  let applied = false;
  const fetcher: typeof fetch = async (input, init) => {
    const path = new URL(String(input)).pathname,
      method = init?.method || "GET",
      body = JSON.parse(String(init?.body || "{}"));
    calls.push({
      path,
      method,
      key: new Headers(init?.headers).get("Authorization") || "",
      body,
    });
    if (path.endsWith("/user") && method === "PUT") {
      if (options.ambiguous)
        return Response.json(
          { error_code: "edge_timeout" },
          { status: options.ambiguous },
        );
      if (options.reject)
        return Response.json({ error_code: "weak_password" }, { status: 422 });
      if (options.failure === "password") throw new Error("response lost");
      return Response.json({ id: uid });
    }
    if (path.endsWith("/user"))
      return Response.json({
        id: uid,
        app_metadata: {
          console_temp: {
            ...marker,
            generation: options.generation || 2,
            must_change: !applied,
          },
        },
      });
    if (path.endsWith("console_temp_prepare"))
      return Response.json({
        userId: uid,
        operationId: oid,
        generation: 2,
        dispatch: options.dispatch ?? true,
      });
    if (path.endsWith("console_temp_operation"))
      return Response.json({ userId: uid, applied });
    if (path.endsWith("console_temp_complete_change")) {
      if (options.failure === "completion-reissue") {
        options.generation = 3;
        return Response.json({ code: "PT409" }, { status: 409 });
      }
      if (options.failure === "completion")
        return Response.json({ code: "PT409" }, { status: 409 });
      return Response.json({
        userId: options.malformed ? sid : uid,
        marker: { ...marker, must_change: false },
        applied,
      });
    }
    if (path.endsWith(uid)) {
      applied = true;
      if (options.failure === "admin") throw new Error("response lost");
      return Response.json({ id: uid });
    }
    throw new Error("Unexpected test endpoint");
  };
  return { calls, fetcher };
}
describe("S2 site-direct completion", () => {
  it("binds a server operation to a freshly verified own JWT session", async () => {
    const f = fixture(),
      plan = await newChange(config, token, f.fetcher);
    expect(
      plan.user === uid &&
        plan.session === sid &&
        plan.generation === 2 &&
        plan.id !== oid,
    ).toBe(true);
    expect(f.calls.map((c) => c.path)).toEqual(["/auth/v1/user"]);
    expect(() =>
      changeCookie(config, String(changeCookie(config, plan)) + "tamper"),
    ).toThrow(LoginFailure);
    expect(changeCookie(config, String(changeCookie(config, plan)))).toEqual(
      plan,
    );
  });
  it("stabilizes concurrent starts and advances only a confirmed rejection", async () => {
    const f = fixture();
    const [a, b] = await Promise.all([
      newChange(config, token, f.fetcher),
      newChange(config, token, f.fetcher),
    ]);
    expect(a.id).toBe(b.id);
    const next = await newChange(config, token, f.fetcher, a);
    expect(next.id).not.toBe(a.id);
    expect((await newChange(config, token, f.fetcher, a)).id).toBe(next.id);
  });
  it.each([408, 429])(
    "retains completion-only recovery after ambiguous HTTP %s",
    async (ambiguous) => {
      const f = fixture({ ambiguous });
      await performChange(config, token, op, password, f.fetcher);
      expect(
        f.calls.filter((c) => c.method === "PUT" && c.path.endsWith("/user")),
      ).toHaveLength(1);
      expect(
        f.calls.some((c) => c.path.endsWith("console_temp_complete_change")),
      ).toBe(true);
    },
  );
  it("uses service prepare → user PUT → service completion → exact admin marker → fresh user", async () => {
    const f = fixture();
    await performChange(config, token, op, password, f.fetcher);
    expect(f.calls.map((c) => `${c.method} ${c.path}`)).toEqual([
      "GET /auth/v1/user",
      "POST /rest/v1/rpc/console_temp_prepare",
      "PUT /auth/v1/user",
      "POST /rest/v1/rpc/console_temp_complete_change",
      `PUT /auth/v1/admin/users/${uid}`,
      "GET /auth/v1/user",
    ]);
    expect(
      f.calls[1].key.endsWith(config.serviceRoleKey) &&
        f.calls[2].key.endsWith(token),
    ).toBe(true);
    expect(f.calls[4].body).toEqual({
      app_metadata: { console_temp: { ...marker, must_change: false } },
    });
  });
  it.each([false, true])(
    "never repeats a password for replay/unknown result (dispatch=%s)",
    async (dispatch) => {
      const f = fixture({ dispatch, failure: "password" });
      await performChange(config, token, op, password, f.fetcher);
      expect(
        f.calls.filter((c) => c.path === "/auth/v1/user" && c.method === "PUT")
          .length,
      ).toBe(dispatch ? 1 : 0);
    },
  );
  it("lost admin outcome resumes readback/completion only", async () => {
    const f = fixture({ failure: "admin" });
    await expect(
      performChange(config, token, op, password, f.fetcher),
    ).rejects.toThrow(LoginFailure);
    const count = f.calls.length;
    await performChange(config, token, op, undefined, f.fetcher);
    expect(f.calls.slice(count).some((c) => c.method === "PUT")).toBe(false);
    expect(f.calls.slice(count).map((c) => c.path)).toContain(
      "/rest/v1/rpc/console_temp_operation",
    );
  });
  it("generation mismatch and malformed completion cannot clear the marker", async () => {
    for (const options of [{ generation: 3 }, { malformed: true }]) {
      const f = fixture(options);
      await expect(
        performChange(config, token, op, undefined, f.fetcher),
      ).rejects.toThrow(LoginFailure);
      expect(f.calls.some((c) => c.path.startsWith("/auth/v1/admin/"))).toBe(
        false,
      );
    }
  });
  it("confirmed rejection never invokes completion", async () => {
    const f = fixture({ reject: true });
    await expect(
      performChange(config, token, op, password, f.fetcher),
    ).rejects.toMatchObject({ code: "rejected" });
    expect(
      f.calls.some((c) => c.path.endsWith("console_temp_complete_change")),
    ).toBe(false);
  });
  it("reports a generation race during completion as reissued", async () => {
    const f = fixture({ failure: "completion-reissue" });
    await expect(
      performChange(config, token, op, password, f.fetcher),
    ).rejects.toMatchObject({ code: "reissued" });
    expect(f.calls.some((c) => c.path.startsWith("/auth/v1/admin/"))).toBe(
      false,
    );
  });
  it("unconfirmed completion retries cannot repeat the password", async () => {
    const f = fixture({ failure: "completion" });
    await expect(
      performChange(config, token, op, password, f.fetcher),
    ).rejects.toThrow(LoginFailure);
    await expect(
      performChange(config, token, op, undefined, f.fetcher),
    ).rejects.toThrow(LoginFailure);
    expect(
      f.calls.filter((c) => c.path === "/auth/v1/user" && c.method === "PUT"),
    ).toHaveLength(1);
  });
  it("bounds bodies and suppresses upstream diagnostics", async () => {
    await expect(
      authTransport(config, async () =>
        Response.json({ padding: "x".repeat(66000) }),
      )("/auth/v1/user", token),
    ).rejects.toThrow("Sign-in operation unavailable");
  });
  it("reads fresh expiry evidence only after a typed temp/ban error", async () => {
    let count = 0;
    const fetcher: typeof fetch = async (input) => {
      count++;
      return Response.json(
        String(input).includes("admin/users?")
          ? {
              users: [
                {
                  id: uid,
                  email: "temp@users.naeil.dev",
                  app_metadata: { console_temp: marker },
                },
              ],
            }
          : [{ userId: uid, state: "expired" }],
      );
    };
    expect(
      await expiredLogin(
        "temp@users.naeil.dev",
        { status: 400, code: "invalid_credentials" },
        config,
        fetcher,
      ),
    ).toBe(false);
    expect(count).toBe(0);
    expect(
      await expiredLogin(
        "temp@users.naeil.dev",
        { status: 409, code: "PT409" },
        config,
        fetcher,
      ),
    ).toBe(true);
    expect(count).toBe(2);
    expect(
      await expiredLogin(
        "temp@users.naeil.dev",
        { status: 400, code: "user_banned" },
        config,
        fetcher,
      ),
    ).toBe(true);
  });
  it("gates malformed/server temporary metadata and validates IDs", () => {
    expect(
      requiresPasswordChange({
        id: uid,
        app_metadata: { console_temp: { ...marker, must_change: false } },
      }),
    ).toBe(false);
    for (const m of [null, {}, marker, { ...marker, generation: -1 }])
      expect(
        requiresPasswordChange({ id: uid, app_metadata: { console_temp: m } }),
      ).toBe(true);
    expect(loginEmail(" A@USERS.NAEIL.DEV ")).toBe("a@users.naeil.dev");
    expect(loginEmail("a@b@x.dev")).toBeNull();
  });
});
