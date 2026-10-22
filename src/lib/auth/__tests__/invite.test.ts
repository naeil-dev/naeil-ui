import { describe, it, expect, vi } from "vitest";
import { createInviteHandler } from "../invite";

const origin = "http://127.0.0.1:2482";
const id = "10000000-0000-4000-8000-000000000001";
const userId = "20000000-0000-4000-8000-000000000002";
const sessionId = "30000000-0000-4000-8000-000000000003";
const email = "recipient@example.test";
const proof = {
  id,
  version: 1,
  nonce: "n".repeat(48),
  token_hash: "a".repeat(64),
};
const config = {
  siteOrigin: origin,
  supabaseUrl: "http://127.0.0.1:54321",
  anonKey: "fixture-anon",
  serviceRoleKey: "fixture-service",
};
const jwt = (sub = userId, sid = sessionId) =>
  `${Buffer.from('{"alg":"HS256"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub, session_id: sid, exp: 9999999999 })).toString("base64url")}.fixture`;
const user = { id: userId, email, email_confirmed_at: "2026-10-15T01:00:00Z" };
const receipt = {
  inviteId: id,
  version: 1,
  userId,
  services: ["jev", "abestimate"],
  acceptedAt: "2026-10-15T01:00:00Z",
};
function harness(
  overrides: {
    now?: () => number;
    reply?: (
      path: string,
      body: Record<string, unknown>,
      init: RequestInit,
    ) => Response | Promise<Response>;
  } = {},
) {
  const calls: {
    path: string;
    body: Record<string, unknown>;
    init: RequestInit;
  }[] = [];
  const json = (data: unknown, status = 200) => Response.json(data, { status });
  const fetcher = vi.fn(
    async (url: string | URL | Request, init: RequestInit = {}) => {
      const path = new URL(String(url)).pathname;
      const body = init.body ? JSON.parse(String(init.body)) : {};
      calls.push({ path, body, init });
      if (overrides.reply) return overrides.reply(path, body, init);
      if (path.endsWith("console_invite_preflight"))
        return json({ userId, email, verificationType: "invite" });
      if (path.endsWith("/verify")) return json({ access_token: jwt(), user });
      if (path.endsWith("/user")) return json(user);
      if (path.endsWith("console_invite_record_verification"))
        return json({ verified: true, expiresAt: "2099-01-01T00:00:00Z" });
      if (path.endsWith("accept_console_invite")) return json(receipt);
      throw new Error("Unexpected request");
    },
  );
  const h = createInviteHandler({
    readConfig: () => config,
    fetch: fetcher as typeof fetch,
    now: overrides.now,
  });
  let cookie = "";
  let csrf = "";
  const request = (
    method: string,
    data?: unknown,
    headers: Record<string, string> = {},
  ) =>
    new Request(`${origin}/auth/invite`, {
      method,
      headers: {
        host: "127.0.0.1:2482",
        accept: "application/json",
        ...(method === "POST"
          ? { origin, "content-type": "application/json" }
          : {}),
        ...(cookie ? { cookie } : {}),
        ...headers,
      },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    });
  async function get() {
    const r = await h.GET(request("GET"));
    cookie = r.headers.get("set-cookie")?.split(";")[0] || cookie;
    const b = await r.json();
    csrf = b.csrf;
    return { r, b };
  }
  async function post(data: Record<string, unknown>) {
    const r = await h.POST(request("POST", { csrf, ...data }));
    const b = await r.json();
    if (b.csrf) csrf = b.csrf;
    return { r, b };
  }
  return {
    h,
    calls,
    request,
    get,
    post,
    get csrf() {
      return csrf;
    },
    get cookie() {
      return cookie;
    },
  };
}
function protectedHeaders(r: Response) {
  expect(r.headers.get("cache-control")).toContain("no-store");
  expect(r.headers.get("referrer-policy")).toBe("no-referrer");
  expect(r.headers.get("vary")).toContain("Cookie");
  expect(r.headers.get("x-content-type-options")).toBe("nosniff");
  expect(r.headers.get("x-frame-options")).toBe("DENY");
  expect(r.headers.get("content-security-policy")).toContain(
    "frame-ancestors 'none'",
  );
}

describe("isolated invitation HTTP boundary", () => {
  it("GET is inert and sets only a bounded host-only invitation cookie", async () => {
    const t = harness();
    const { r, b } = await t.get();
    expect(b.status).toBe("empty");
    expect(b.csrf).toMatch(/^[A-Za-z0-9_-]{32,}$/);
    expect(t.calls).toHaveLength(0);
    const cookie = r.headers.get("set-cookie")!;
    expect(cookie).toContain("naeil_invite_loopback=");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).toContain("Max-Age=600");
    expect(cookie).not.toContain("Domain=");
    protectedHeaders(r);
  });
  it("stages without verifying, then accepts only after explicit confirmation with fixed links", async () => {
    const t = harness();
    await t.get();
    const staged = await t.post({ action: "stage", ...proof });
    expect(staged.b.status).toBe("staged");
    expect(t.calls).toHaveLength(0);
    const { r, b } = await t.post({ action: "confirm" });
    expect(r.status).toBe(200);
    expect(b.status).toBe("complete");
    expect(b.links).toEqual([
      { label: "JEV", href: "https://jev.naeil.dev/" },
      { label: "AB Estimate", href: "https://abestimate.naeil.dev/" },
    ]);
    expect(t.calls.map((c) => c.path)).toEqual([
      "/rest/v1/rpc/console_invite_preflight",
      "/auth/v1/verify",
      "/auth/v1/user",
      "/rest/v1/rpc/console_invite_record_verification",
      "/rest/v1/rpc/accept_console_invite",
    ]);
    expect(t.calls[1].body).toEqual({
      token_hash: proof.token_hash,
      type: "invite",
    });
    expect(t.calls[3].body).toMatchObject({
      p_user_id: userId,
      p_session_id: sessionId,
    });
    expect(t.calls[0].body.p_nonce_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(t.calls[4].body).toEqual({
      p_invite_id: id,
      p_version: 1,
      p_nonce: proof.nonce,
    });
    expect(t.calls[4].init.headers).toMatchObject({
      Authorization: `Bearer ${jwt()}`,
      apikey: config.anonKey,
    });
    const text = JSON.stringify(b);
    expect(text).not.toContain(proof.nonce);
    expect(text).not.toContain(jwt());
    protectedHeaders(r);
    const count = t.calls.length;
    await t.post({ action: "confirm" });
    expect(t.calls).toHaveLength(count);
  });
  it("renders a fragment-clearing script with no automatic confirmation or third-party dependencies", async () => {
    const t = harness();
    const r = await t.h.GET(
      t.request("GET", undefined, { accept: "text/html" }),
    );
    const html = await r.text();
    expect(html).toContain("history.replaceState");
    expect(html.indexOf("history.replaceState")).toBeLessThan(
      html.indexOf("action:'stage'"),
    );
    expect(html).toContain("addEventListener('click'");
    expect(html).toContain("action:'confirm'");
    expect(html).not.toMatch(/https?:\/\/[^< ]+\.(?:js|css)/);
    protectedHeaders(r);
  });
  it.each(["https://evil.example", "null", `${origin}/`, ""])(
    "rejects unsafe or missing Origin %s",
    async (bad) => {
      const t = harness();
      await t.get();
      const r = await t.h.POST(
        t.request(
          "POST",
          { action: "stage", csrf: t.csrf, ...proof },
          { origin: bad },
        ),
      );
      expect(r.status).toBe(403);
      protectedHeaders(r);
      expect(t.calls).toHaveLength(0);
    },
  );
  it("rejects Host spoofing, query authority and wrong CSRF without upstream calls", async () => {
    const t = harness();
    await t.get();
    for (const headers of [
      { host: "evil.example" },
      { origin: `${origin}, https://evil.example` },
    ] as Record<string, string>[]) {
      const r = await t.h.POST(
        t.request("POST", { action: "confirm", csrf: t.csrf }, headers),
      );
      expect(r.status).toBe(403);
      protectedHeaders(r);
    }
    const r = await t.h.GET(
      new Request(`${origin}/auth/invite?next=https://evil.example`, {
        headers: { host: "127.0.0.1:2482" },
      }),
    );
    expect(r.status).toBe(400);
    protectedHeaders(r);
    expect(
      (await t.post({ action: "stage", csrf: "bad", ...proof })).r.status,
    ).toBe(403);
    expect(t.calls).toHaveLength(0);
  });
  it.each([
    { ...proof, type: "recovery" },
    { ...proof, email },
    { ...proof, userId },
    { ...proof, services: ["jev"] },
    { ...proof, next: "/" },
    { ...proof, version: 0 },
    { ...proof, nonce: "short" },
    { ...proof, token_hash: "a".repeat(513) },
    { ...proof, id: "bad" },
  ])("rejects untrusted or malformed stage envelope %#", async (data) => {
    const t = harness();
    await t.get();
    const { r } = await t.post({ action: "stage", ...data });
    expect(r.status).toBe(400);
    protectedHeaders(r);
    expect(t.calls).toHaveLength(0);
  });
  it("rejects duplicate JSON keys, oversized streams, non-JSON and replacement of staged proof", async () => {
    const t = harness();
    await t.get();
    const req = t.request("POST");
    const r = await t.h.POST(
      new Request(req, {
        body: `{"action":"confirm","action":"stage","csrf":"${t.csrf}"}`,
      }),
    );
    expect(r.status).toBe(400);
    expect(
      (
        await t.h.POST(
          new Request(t.request("POST"), { body: "x".repeat(5000) }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await t.h.POST(
          t.request(
            "POST",
            { action: "confirm", csrf: t.csrf },
            { "content-type": "text/plain" },
          ),
        )
      ).status,
    ).toBe(400);
    await t.post({ action: "stage", ...proof });
    expect(
      (await t.post({ action: "stage", ...proof, version: 2 })).r.status,
    ).toBe(409);
  });
  it("expires absolutely without letting ordinary session cookies authorize confirmation", async () => {
    let clock = 1000;
    const t = harness({ now: () => clock });
    await t.get();
    await t.post({ action: "stage", ...proof });
    clock += 600001;
    const r = await t.h.POST(
      t.request(
        "POST",
        { action: "confirm", csrf: t.csrf },
        { cookie: `${t.cookie}; sb-fixture-auth-token=older-jwt` },
      ),
    );
    expect(r.status).toBe(403);
    expect(t.calls).toHaveLength(0);
  });
  it("bounds active transactions without evicting valid staged proofs", async () => {
    const t = harness();
    for (let i = 0; i < 256; i++)
      expect((await t.h.GET(t.request("GET"))).status).toBe(200);
    const r = await t.h.GET(t.request("GET"));
    expect(r.status).toBe(503);
    protectedHeaders(r);
  });
});

describe("verified-proof retry and fail-closed transport", () => {
  it.each(["record", "accept"])(
    "retains verified identity after %s DB503 and never consumes OTP twice",
    async (fail) => {
      let failed = false;
      const paths: string[] = [];
      const t = harness({
        reply: (path, body) => {
          paths.push(path);
          if (path.endsWith("preflight"))
            return Response.json({
              userId,
              email,
              verificationType: "recovery",
            });
          if (path.endsWith("/verify")) {
            expect(body.type).toBe("recovery");
            return Response.json({ access_token: jwt(), user });
          }
          if (path.endsWith("/user")) return Response.json(user);
          if (path.endsWith("record_verification")) {
            if (fail === "record" && !failed) {
              failed = true;
              return Response.json({}, { status: 503 });
            }
            return Response.json({
              verified: true,
              expiresAt: "2099-01-01T00:00:00Z",
            });
          }
          if (!failed) {
            failed = true;
            return Response.json({}, { status: 503 });
          }
          return Response.json(receipt);
        },
      });
      await t.get();
      await t.post({ action: "stage", ...proof });
      expect((await t.post({ action: "confirm" })).r.status).toBe(503);
      expect((await t.post({ action: "confirm" })).b.status).toBe("complete");
      expect(paths.filter((p) => p.endsWith("/verify"))).toHaveLength(1);
      expect(
        paths.filter((p) => p.endsWith("record_verification")),
      ).toHaveLength(fail === "record" ? 2 : 1);
    },
  );
  it("coalesces double confirmation while preventing replacement midflight", async () => {
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    let count = 0;
    const t = harness({
      reply: async (path) => {
        if (path.endsWith("preflight")) {
          count++;
          await gate;
          return Response.json({ userId, email, verificationType: "invite" });
        }
        if (path.endsWith("/verify"))
          return Response.json({ access_token: jwt(), user });
        if (path.endsWith("/user")) return Response.json(user);
        if (path.endsWith("record_verification"))
          return Response.json({
            verified: true,
            expiresAt: "2099-01-01T00:00:00Z",
          });
        return Response.json(receipt);
      },
    });
    await t.get();
    await t.post({ action: "stage", ...proof });
    const csrf = t.csrf;
    const a = t.h.POST(t.request("POST", { action: "confirm", csrf }));
    const b = t.h.POST(t.request("POST", { action: "confirm", csrf }));
    const replacement = await t.post({ action: "stage", ...proof, version: 2 });
    expect(replacement.r.status).toBe(409);
    release();
    expect((await a).status).toBe(200);
    expect((await b).status).toBe(200);
    expect(count).toBe(1);
  });
  it.each(["preflight", "verify", "user", "record", "accept"])(
    "fails closed on malformed %s success",
    async (broken) => {
      const t = harness({
        reply: (path) => {
          if (path.endsWith("preflight"))
            return Response.json(
              broken === "preflight"
                ? { userId, email, verificationType: "magiclink" }
                : { userId, email, verificationType: "invite" },
            );
          if (path.endsWith("/verify"))
            return Response.json(
              broken === "verify"
                ? {
                    access_token: jwt("40000000-0000-4000-8000-000000000004"),
                    user,
                  }
                : { access_token: jwt(), user },
            );
          if (path.endsWith("/user"))
            return Response.json(
              broken === "user"
                ? {
                    ...user,
                    email_confirmed_at: null,
                    user_metadata: { email_confirmed: true },
                  }
                : user,
            );
          if (path.endsWith("record_verification"))
            return Response.json(
              broken === "record"
                ? { verified: false }
                : { verified: true, expiresAt: "2099-01-01T00:00:00Z" },
            );
          return Response.json(
            broken === "accept" ? { ...receipt, services: ["evil"] } : receipt,
          );
        },
      });
      await t.get();
      await t.post({ action: "stage", ...proof });
      const { r, b } = await t.post({ action: "confirm" });
      expect(r.status).toBe(503);
      expect(b.status).not.toBe("complete");
      protectedHeaders(r);
    },
  );
  it.each([400, 401, 403, 404, 409, 422])(
    "treats unknown upstream %i as dependency failure without exposing its body",
    async (status) => {
      const t = harness({
        reply: () =>
          Response.json({ message: "private provider message" }, { status }),
      });
      await t.get();
      await t.post({ action: "stage", ...proof });
      const { r, b } = await t.post({ action: "confirm" });
      expect(r.status).toBe(503);
      expect((await t.get()).b.status).toBe("staged");
      expect(JSON.stringify(b)).not.toContain("private");
      expect(t.calls).toHaveLength(1);
    },
  );
  it("all fetches forbid redirects, time out, and use fixed transport paths", async () => {
    const t = harness();
    await t.get();
    await t.post({ action: "stage", ...proof });
    await t.post({ action: "confirm" });
    for (const c of t.calls) {
      expect(c.init.redirect).toBe("error");
      expect(c.init.signal).toBeInstanceOf(AbortSignal);
    }
  });
});

describe("additional consumed OTP and parser regression boundaries", () => {
  it("does not reverify a consumed OTP when fresh /user is temporarily unavailable", async () => {
    let failed = false;
    const paths: string[] = [];
    const t = harness({
      reply: (path) => {
        paths.push(path);
        if (path.endsWith("preflight"))
          return Response.json({ userId, email, verificationType: "invite" });
        if (path.endsWith("/verify"))
          return Response.json({ access_token: jwt(), user });
        if (path.endsWith("/user")) {
          if (!failed) {
            failed = true;
            return Response.json({}, { status: 503 });
          }
          return Response.json(user);
        }
        if (path.endsWith("record_verification"))
          return Response.json({
            verified: true,
            expiresAt: "2099-01-01T00:00:00Z",
          });
        return Response.json({ ...receipt, services: ["abestimate"] });
      },
    });
    await t.get();
    await t.post({ action: "stage", ...proof });
    expect((await t.post({ action: "confirm" })).r.status).toBe(503);
    expect((await t.post({ action: "confirm" })).b.status).toBe("complete");
    expect(paths.filter((p) => p.endsWith("/verify"))).toHaveLength(1);
  });
  it("returns 400 for malformed JSON/UTF8 and never reveals parser detail", async () => {
    const t = harness();
    await t.get();
    for (const bad of ["{", "null", "[1]", '{"action":"confirm",}']) {
      const r = await t.h.POST(new Request(t.request("POST"), { body: bad }));
      expect(r.status).toBe(400);
      expect(await r.text()).not.toContain("SyntaxError");
    }
    expect(
      (
        await t.h.POST(
          new Request(t.request("POST"), { body: new Uint8Array([255, 254]) }),
        )
      ).status,
    ).toBe(400);
  });
  it("does not re-record a known receipt after a thrown unknown acceptance result", async () => {
    let tries = 0;
    const t = harness({
      reply: (path) => {
        if (path.endsWith("preflight"))
          return Response.json({ userId, email, verificationType: "invite" });
        if (path.endsWith("/verify"))
          return Response.json({ access_token: jwt(), user });
        if (path.endsWith("/user")) return Response.json(user);
        if (path.endsWith("record_verification"))
          return Response.json({
            verified: true,
            expiresAt: "2099-01-01T00:00:00Z",
          });
        if (++tries === 1) throw new Error("private-disconnect");
        return Response.json({ ...receipt, services: ["jev"] });
      },
    });
    await t.get();
    await t.post({ action: "stage", ...proof });
    expect((await t.post({ action: "confirm" })).r.status).toBe(503);
    expect((await t.post({ action: "confirm" })).b.links).toEqual([
      { label: "JEV", href: "https://jev.naeil.dev/" },
    ]);
    expect(
      t.calls.filter((c) => c.path.endsWith("record_verification")),
    ).toHaveLength(1);
  });
});

describe("bounded stream deadline", () => {
  it("rejects a stalled request body within the fixed deadline", async () => {
    vi.useFakeTimers();
    try {
      const t = harness();
      await t.get();
      const stalled = new ReadableStream<Uint8Array>();
      const req = new Request(t.request("POST"), {
        body: stalled,
        duplex: "half",
      } as RequestInit);
      let status: unknown = "still pending";
      const pending = t.h.POST(req).then((r) => {
        status = r.status;
      });
      await vi.advanceTimersByTimeAsync(8001);
      expect(status).toBe(400);
      await pending;
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("authoritative denial versus retained consumed-OTP recovery", () => {
  const rpcError = (code: string, message: string) => ({
    code,
    message,
    details: null,
    hint: null,
  });
  const cases = [
    ...[
      ["session_not_found"],
      ["user_not_found"],
      [["session_not_found"]],
      [["user_not_found"]],
    ].map((error_code) => ({
      path: "/auth/v1/user",
      status: 403,
      raw: JSON.stringify({ code: 403, error_code, msg: "private upstream failure" }),
    })),
    ...[
      "/auth/v1/user",
      "/rest/v1/rpc/console_invite_record_verification",
      "/rest/v1/rpc/accept_console_invite",
    ].flatMap((path) =>
      [401, 403, 404].map((status) => ({
        path,
        status,
        raw: JSON.stringify({ message: "private infrastructure failure" }),
      })),
    ),
    {
      path: "/rest/v1/rpc/console_invite_record_verification",
      status: 403,
      raw: JSON.stringify(rpcError("PT403", "trusted service required")),
    },
    {
      path: "/rest/v1/rpc/accept_console_invite",
      status: 404,
      raw: JSON.stringify(rpcError("PGRST202", "schema cache unavailable")),
    },
    {
      path: "/auth/v1/user",
      status: 401,
      raw: "<html>private gateway failure</html>",
    },
    {
      path: "/rest/v1/rpc/console_invite_record_verification",
      status: 409,
      raw: "{broken",
    },
    {
      path: "/rest/v1/rpc/accept_console_invite",
      status: 409,
      raw: JSON.stringify(rpcError("PT404", "invitation not found")),
    },
    {
      path: "/rest/v1/rpc/accept_console_invite",
      status: 409,
      raw: JSON.stringify(rpcError("PT409", "unknown private denial")),
    },
    {
      path: "/rest/v1/rpc/accept_console_invite",
      status: 409,
      raw: '{"code":"PT404","code":"PT409","message":"recipient proof conflict","details":null,"hint":null}',
    },
    {
      path: "/rest/v1/rpc/console_invite_record_verification",
      status: 404,
      raw: "x".repeat(65537),
    },
    {
      path: "/auth/v1/user",
      status: 403,
      raw: JSON.stringify({
        code: 401,
        error_code: "session_not_found",
        msg: "private",
      }),
    },
    {
      path: "/rest/v1/rpc/accept_console_invite",
      status: 409,
      raw: JSON.stringify({
        ...rpcError("PT409", "recipient proof conflict"),
        error_code: "unexpected_failure",
      }),
    },
  ];
  it.each(cases)(
    "retains identity after $path HTTP$status ambiguous error %#",
    async ({ path: broken, status, raw }) => {
      let failed = false;
      const t = harness({
        reply: (path) => {
          if (path === broken && !failed) {
            failed = true;
            return new Response(raw, { status });
          }
          if (path.endsWith("preflight"))
            return Response.json({ userId, email, verificationType: "invite" });
          if (path.endsWith("/verify"))
            return Response.json({ access_token: jwt(), user });
          if (path.endsWith("/user")) return Response.json(user);
          if (path.endsWith("record_verification"))
            return Response.json({
              verified: true,
              expiresAt: "2099-01-01T00:00:00Z",
            });
          return Response.json(receipt);
        },
      });
      await t.get();
      await t.post({ action: "stage", ...proof });
      const failure = await t.post({ action: "confirm" });
      expect(failure.r.status).toBe(503);
      expect(JSON.stringify(failure.b)).not.toContain("private");
      const before = t.calls.length;
      expect((await t.get()).b.status).toBe("retry");
      expect((await t.post({ action: "status" })).b.status).toBe("retry");
      expect(t.calls).toHaveLength(before);
      expect((await t.post({ action: "confirm" })).b.status).toBe("complete");
      expect(t.calls.filter((c) => c.path.endsWith("/verify"))).toHaveLength(1);
      const userCalls = t.calls.filter((c) => c.path.endsWith("/user"));
      const accepts = t.calls.filter((c) =>
        c.path.endsWith("accept_console_invite"),
      );
      for (const call of [...userCalls, ...accepts])
        expect(call.init.headers).toMatchObject({
          Authorization: `Bearer ${jwt()}`,
        });
      expect(
        t.calls.filter((c) => c.path.endsWith("record_verification")),
      ).toHaveLength(broken.endsWith("record_verification") ? 2 : 1);
    },
  );
  it.each([
    {
      path: "preflight",
      status: 404,
      body: rpcError("PT404", "invitation not found"),
    },
    {
      path: "preflight",
      status: 409,
      body: rpcError("PT409", "invitation proof conflict"),
    },
    {
      path: "record_verification",
      status: 409,
      body: rpcError("PT409", "verified subject conflict"),
    },
    {
      path: "accept_console_invite",
      status: 409,
      body: rpcError("PT409", "invitation expired or closed"),
    },
    {
      path: "accept_console_invite",
      status: 422,
      body: rpcError("PT422", "services must be active and verified"),
    },
    {
      path: "accept_console_invite",
      status: 401,
      body: rpcError("PT401", "authenticated session required"),
    },
    {
      path: "/verify",
      status: 403,
      body: {
        code: 403,
        error_code: "otp_expired",
        msg: "Token has expired or is invalid",
      },
    },
    {
      path: "/user",
      status: 403,
      body: {
        code: 403,
        error_code: "session_not_found",
        msg: "Session does not exist",
      },
    },
  ])(
    "keeps recognized $path denial terminal",
    async ({ path: broken, status, body }) => {
      const t = harness({
        reply: (path) => {
          if (path.endsWith(broken)) return Response.json(body, { status });
          if (path.endsWith("preflight"))
            return Response.json({ userId, email, verificationType: "invite" });
          if (path.endsWith("/verify"))
            return Response.json({ access_token: jwt(), user });
          if (path.endsWith("/user")) return Response.json(user);
          return Response.json({
            verified: true,
            expiresAt: "2099-01-01T00:00:00Z",
          });
        },
      });
      await t.get();
      await t.post({ action: "stage", ...proof });
      expect((await t.post({ action: "confirm" })).r.status).toBe(409);
      expect((await t.get()).b.status).toBe("invalid");
      const count = t.calls.length;
      expect((await t.post({ action: "confirm" })).r.status).toBe(409);
      expect(t.calls).toHaveLength(count);
    },
  );
});
