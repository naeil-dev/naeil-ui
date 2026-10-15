import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, realpathSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { GET, POST } from "@/app/auth/invite/route";
const dirs: string[] = [];
afterEach(() => {
  delete process.env.NAEIL_INVITE_CONFIG_FILE;
  for (const d of dirs) rmSync(d, { recursive: true, force: true });
  dirs.length = 0;
  vi.unstubAllGlobals();
});
function config(siteOrigin = "https://naeil.dev") {
  const dir = mkdtempSync(join(realpathSync(tmpdir()), "invite-route-"));
  dirs.push(dir);
  const path = join(dir, "private.json");
  writeFileSync(
    path,
    JSON.stringify({
      siteOrigin,
      supabaseUrl: "https://fixture.supabase.co",
      anonKey: "fixture-anon",
      serviceRoleKey: "fixture-service",
    }),
    { mode: 0o600 },
  );
  process.env.NAEIL_INVITE_CONFIG_FILE = path;
}
describe("actual exported invitation route", () => {
  it("defaults to isolated 503 without private configuration", async () => {
    delete process.env.NAEIL_INVITE_CONFIG_FILE;
    const r = await GET(
      new Request("https://naeil.dev/auth/invite", {
        headers: { host: "naeil.dev" },
      }),
    );
    expect(r.status).toBe(503);
    expect(await r.json()).toEqual({ status: "unavailable" });
    expect(r.headers.get("referrer-policy")).toBe("no-referrer");
    expect(r.headers.get("cache-control")).toContain("no-store");
  });
  it("uses __Host secure HTTPS cookies and stages with no upstream request", async () => {
    config();
    const network = vi.fn(() => {
      throw new Error("No upstream during stage");
    });
    vi.stubGlobal("fetch", network);
    const r = await GET(
      new Request("https://naeil.dev/auth/invite", {
        headers: { host: "naeil.dev", accept: "application/json" },
      }),
    );
    const b = await r.json();
    const cookie = r.headers.get("set-cookie")!;
    expect(cookie).toContain("__Host-naeil_invite=");
    expect(cookie).toContain("Secure");
    expect(cookie).not.toContain("Domain=");
    const staged = await POST(
      new Request("https://naeil.dev/auth/invite", {
        method: "POST",
        headers: {
          host: "naeil.dev",
          origin: "https://naeil.dev",
          "content-type": "application/json",
          cookie: cookie.split(";")[0],
        },
        body: JSON.stringify({
          action: "stage",
          csrf: b.csrf,
          id: "10000000-0000-4000-8000-000000000001",
          version: 1,
          nonce: "n".repeat(48),
          token_hash: "a".repeat(64),
        }),
      }),
    );
    expect(staged.status).toBe(200);
    expect((await staged.json()).status).toBe("staged");
    expect(network).not.toHaveBeenCalled();
  });
  it("rejects authority in query, forwarded origin and duplicate invitation cookies", async () => {
    config();
    const r = await GET(
      new Request("https://naeil.dev/auth/invite?token_hash=private-fixture", {
        headers: { host: "naeil.dev" },
      }),
    );
    expect(r.status).toBe(400);
    expect(await r.text()).not.toContain("private-fixture");
    const wrong = await GET(
      new Request("https://evil.example/auth/invite", {
        headers: {
          host: "evil.example",
          "x-forwarded-host": "naeil.dev",
          "x-forwarded-proto": "https",
        },
      }),
    );
    expect(wrong.status).toBe(403);
    const duplicate = await POST(
      new Request("https://naeil.dev/auth/invite", {
        method: "POST",
        headers: {
          host: "naeil.dev",
          origin: "https://naeil.dev",
          "content-type": "application/json",
          cookie: `__Host-naeil_invite=${"a".repeat(43)}; __Host-naeil_invite=${"a".repeat(43)}`,
        },
        body: "{}",
      }),
    );
    expect(duplicate.status).toBe(403);
  });
});

import { PUT, PATCH, DELETE, OPTIONS } from "@/app/auth/invite/route";
describe("explicit unsupported method responses", () => {
  it.each([PUT, PATCH, DELETE, OPTIONS])(
    "returns a protected secret-free 405",
    async (method) => {
      const r = await method();
      expect(r.status).toBe(405);
      expect(r.headers.get("cache-control")).toContain("no-store");
      expect(r.headers.get("referrer-policy")).toBe("no-referrer");
      expect(r.headers.get("content-security-policy")).toContain(
        "frame-ancestors 'none'",
      );
      expect(r.headers.get("allow")).toBe("GET, HEAD, POST");
      expect(await r.json()).toEqual({ status: "invalid" });
    },
  );
});

it("uses exact configured Host/Origin rather than Next internal request URL authority", async () => {
  config("http://127.0.0.1:2482");
  const r = await GET(
    new Request("http://localhost:2482/auth/invite", {
      headers: {
        host: "127.0.0.1:2482",
        accept: "application/json",
        "x-forwarded-host": "evil.example",
        "x-forwarded-proto": "https",
      },
    }),
  );
  expect(r.status).toBe(200);
  const b = await r.json();
  const p = await POST(
    new Request("http://localhost:2482/auth/invite", {
      method: "POST",
      headers: {
        host: "127.0.0.1:2482",
        origin: "http://127.0.0.1:2482",
        "content-type": "application/json",
        cookie: r.headers.get("set-cookie")!.split(";")[0],
      },
      body: JSON.stringify({ action: "status", csrf: b.csrf }),
    }),
  );
  expect(p.status).toBe(200);
});
