import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "@/app/auth/invite/route";
import { createInviteHandler } from "../invite";
import { invitationProxyResponse } from "../invite-proxy";

const config = {
  siteOrigin: "https://naeil.dev",
  supabaseUrl: "https://fixture.supabase.co",
  anonKey: "fixture-anon",
  serviceRoleKey: "fixture-service",
  transactionStore: "supabase" as const,
  encryptionKey: Buffer.alloc(32, 7).toString("base64url"),
};
const proof = {
  id: "10000000-0000-4000-8000-000000000001",
  version: 1,
  nonce: "n".repeat(48),
  token_hash: "a".repeat(64),
};
function request(
  method = "GET",
  suffix = "",
  payload?: unknown,
  cookie?: string,
) {
  return new Request(config.siteOrigin + "/auth/invite" + suffix, {
    method,
    headers: {
      host: "naeil.dev",
      origin: config.siteOrigin,
      accept: "application/json",
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  });
}
beforeEach(() => {
  vi.stubEnv("NAEIL_INVITE_CONFIG_FILE", "");
  vi.stubEnv("NAEIL_INVITE_CONFIG_JSON", JSON.stringify(config));
  vi.stubEnv("NAEIL_INVITE_ACCEPT_ENABLED", undefined);
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error("Unexpected upstream");
    }),
  );
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

it.each([undefined, "false", "TRUE", "1", "true "])(
  "holds actual GET/HEAD/POST and slash alias with complete D config (%s)",
  async (value) => {
    vi.stubEnv("NAEIL_INVITE_ACCEPT_ENABLED", value);
    vi.stubEnv("NAEIL_AUTH_EMAIL_ENABLED", "true");
    const cookie = `__Host-naeil_invite=${"a".repeat(43)}`;
    for (const suffix of ["", "/", "?locale=ja"]) {
      for (const method of ["GET", "HEAD"]) {
        const r = await GET(request(method, suffix, undefined, cookie));
        expect(r.status).toBe(503);
        expect(r.headers.get("set-cookie")).toBeNull();
        expect(r.headers.get("cache-control")).toContain("no-store");
        expect(r.headers.get("referrer-policy")).toBe("no-referrer");
      }
      for (const action of ["stage", "confirm", "status"]) {
        const r = await POST(
          request(
            "POST",
            suffix,
            { action, csrf: "retained", ...proof },
            cookie,
          ),
        );
        expect(r.status).toBe(503);
        expect(await r.json()).toEqual({ status: "paused" });
        expect(r.headers.get("set-cookie")).toBeNull();
      }
    }
    for (const method of ["GET", "HEAD", "POST"]) {
      const r = invitationProxyResponse(new NextRequest(request(method, "/")));
      expect(r.status).toBe(503);
      expect(r.headers.get("location")).toBeNull();
    }
    expect(fetch).not.toHaveBeenCalled();
  },
);
it("does not even read private config or start a transaction while paused", async () => {
  const readConfig = vi.fn(() => config);
  const handler = createInviteHandler({ readConfig });
  await handler.GET(request());
  await handler.POST(request("POST", "", { action: "confirm" }));
  expect(readConfig).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});
it("replaces an untrusted nonce on the paused HTML slash alias", async () => {
  const req = request("GET", "/");
  req.headers.set("accept", "text/html");
  req.headers.set("x-naeil-invite-nonce", "a".repeat(43));
  const r = invitationProxyResponse(new NextRequest(req));
  const html = await r.text();
  const nonce = html.match(/<script nonce="([^"]+)"/)?.[1];
  expect(nonce).toBeTruthy();
  expect(nonce).not.toBe("a".repeat(43));
  expect(r.headers.get("content-security-policy")).toContain(`'nonce-${nonce}'`);
});
it("holds a transaction staged before OFF, including GET readback and replayed confirmation", async () => {
  vi.stubEnv("NAEIL_INVITE_ACCEPT_ENABLED", "true");
  const readConfig = vi.fn(() => ({ ...config, transactionStore: undefined }));
  const handler = createInviteHandler({ readConfig });
  const initial = await handler.GET(request());
  const cookie = initial.headers.get("set-cookie")!.split(";")[0];
  const staged = await handler.POST(
    request(
      "POST",
      "",
      {
        action: "stage",
        csrf: (await initial.json()).csrf,
        ...proof,
      },
      cookie,
    ),
  );
  expect(staged.status).toBe(200);
  const csrf = (await staged.json()).csrf;
  readConfig.mockClear();
  vi.stubEnv("NAEIL_INVITE_ACCEPT_ENABLED", "false");
  for (let replay = 0; replay < 2; replay++) {
    expect(
      (
        await handler.POST(
          request("POST", "", { action: "confirm", csrf }, cookie),
        )
      ).status,
    ).toBe(503);
    expect(
      (await handler.GET(request("GET", "", undefined, cookie))).status,
    ).toBe(503);
  }
  expect(readConfig).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
  // A hold retains state; it does not delete or mutate the earlier transaction.
  vi.stubEnv("NAEIL_INVITE_ACCEPT_ENABLED", "true");
  expect(
    await (await handler.GET(request("GET", "", undefined, cookie))).json(),
  ).toMatchObject({ status: "staged", csrf });
});
it.each(["ko", "ja", "en"])(
  "serves a localized paused HTML response with no CSRF/cookie (%s)",
  async (locale) => {
    const req = request("GET", `?locale=${locale}`);
    req.headers.set("accept", "text/html");
    const r = await GET(req);
    const html = await r.text();
    expect(r.status).toBe(503);
    expect(html).toContain(`lang="${locale}"`);
    expect(html).toContain(`href="${locale === "en" ? "" : `/${locale}`}/login"`);
    expect(html).toContain('"status":"paused"');
    expect(html).not.toContain('"csrf":');
    expect(r.headers.get("set-cookie")).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  },
);
