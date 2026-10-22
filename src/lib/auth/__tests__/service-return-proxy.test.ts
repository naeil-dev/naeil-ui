import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import proxy, { config } from "@/proxy";

vi.mock("@/lib/supabase/middleware", () => ({ updateSession: () => { throw new Error("Relay must not execute site Auth"); } }));
vi.mock("next-intl/middleware", () => ({ default: () => () => { throw new Error("Relay must not execute locale middleware"); } }));
vi.mock("@/i18n/routing", () => ({ routing: { locales: ["en", "ko", "ja"], defaultLocale: "ko" } }));

const query = `nonce=${"A".repeat(43)}&code=ok`;
describe("return namespace before site Auth/locale middleware", () => {
  it.each([
    "/auth%5Creturn%5Cconsole", "/auth%5creturn%5cconsole", "/auth%5Creturn/console", "/auth/return%5cconsole",
    "/auth%255Creturn%255cconsole", "/ja%5Cauth%5creturn%5Cconsole", "/ja/auth%5Creturn%5Cconsole",
    "/api%5Cinternal%5Cservice-return", "/api/internal%5cservice-return", "/ja%5Capi%255cinternal%5Cservice-return",
  ])("rejects delivered backslash alias %s before site Auth/locale", async (path) => {
    const url = `https://naeil.dev${path}?${query}`;
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true);
    const request = new NextRequest(url, { headers: { host: "naeil.dev", cookie: "opaque=ignored" } });
    expect(new URL(request.url).pathname).toBe(path);
    const response = await proxy(request);
    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("content-security-policy")).toBe("default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'");
    for (const header of ["location", "set-cookie", "x-middleware-next", "x-middleware-rewrite"]) {
      expect(response.headers.has(header)).toBe(false);
    }
    expect(await response.text()).toBe("");
  });
  it.each([
    "/auth/return/abestimate", "/auth/return/jev",
    "/auth/return", "/auth/return/console", "/auth/return/console/", "/auth/return/unknown", "/auth/return/console/extra",
    "/%61uth/return/console", "/auth/%72eturn/console", "/auth/return/%63onsole", "/%2561uth/return/console",
    "/ja/auth/return/console", "/auth/return/console.rsc", "/auth/return/console.json", "/auth/return/console%2fextra",
    "/_next/data/build/auth/return/console.json", "/_next/data/build/ja/auth/return/console.json",
    "/api/internal/service-return", "/api/internal/service-return/", "/api/internal/service-return.rsc",
    "/api/%69nternal/service-return", "/ja/api/internal/service-return",
    "/%61uth/return/console%GG", "/auth/%72eturn/%FF", "/auth/return;bad/console",
  ])("isolates %s without cookies or app shell", async (path) => {
    const url = `https://naeil.dev${path}?${query}`;
    expect(unstable_doesMiddlewareMatch({ config, url })).toBe(true);
    const response = await proxy(new NextRequest(url, { headers: { host: "naeil.dev", cookie: "opaque=ignored" } }));
    expect(response.status).toBe(path === "/auth/return/console" ? 200 : 404);
    expect(response.headers.get("x-middleware-next")).toBe(path === "/auth/return/console" ? "1" : null);
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.has("set-cookie")).toBe(false);
    expect(await response.text()).toBe("");
  });
  it.each(["console"])("passes canonical %s GET to its public route without site Auth/locale", async (service) => {
    const response = await proxy(new NextRequest(`https://naeil.dev/auth/return/${service}?${query}`, { headers: { host: "naeil.dev" } }));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.has("location")).toBe(false);
    expect(response.headers.has("set-cookie")).toBe(false);
  });
  it.each(["HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])("does not let %s consume a callback", async (method) => {
    const response = await proxy(new NextRequest(`https://naeil.dev/auth/return/console?${query}`, { method, headers: { host: "naeil.dev" } }));
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET");
    expect(response.headers.has("location")).toBe(false);
  });
  it.each(["", "0", "1"])("retains canonical static-route dispatch for any present data header row %#", async (value) => {
    const response = await proxy(new NextRequest(`https://naeil.dev/auth/return/console?${query}`, { headers: { host: "naeil.dev", "x-nextjs-data": value } }));
    expect(response.headers.get("x-middleware-next")).toBe("1");
    expect(response.headers.has("location")).toBe(false);
    expect(response.headers.has("x-nextjs-redirect")).toBe(false);
  });
  it.each(["", "0", "1"])("does not let a data header override Host precedence row %#", async (value) => {
    const response = await proxy(new NextRequest(`https://naeil.dev/auth/return/console?${query}`, { method: "POST", headers: { host: "evil.example", "x-nextjs-data": value } }));
    expect(response.status).toBe(403);
    expect(response.headers.has("location")).toBe(false);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it.each(["HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"])("does not let a data header override %s rejection", async (method) => {
    const response = await proxy(new NextRequest(`https://naeil.dev/auth/return/console?${query}`, { method, headers: { host: "naeil.dev", "x-nextjs-data": "1" } }));
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET");
    expect(response.headers.has("location")).toBe(false);
  });
  it("rejects forged Host even when Next URL and forwarded headers look trusted", async () => {
    const response = await proxy(new NextRequest(`https://naeil.dev/auth/return/console?${query}`, { headers: { host: "evil.example", "x-forwarded-host": "naeil.dev" } }));
    expect(response.status).toBe(403);
    expect(response.headers.has("location")).toBe(false);
  });
  it.each(["/_next/static/chunk.js", "/api/health", "/favicon.ico", "/auth/callback", "/images/logo.png"])("preserves bypass of site Auth for %s", async (path) => {
    const response = await proxy(new NextRequest(`https://naeil.dev${path}`));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
  it("preserves ordinary trailing-slash canonicalization", async () => {
    const response = await proxy(new NextRequest("https://naeil.dev/ja/login/?next=%2Fja%2Fsa"));
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe("https://naeil.dev/ja/login?next=%2Fja%2Fsa");
  });
});
