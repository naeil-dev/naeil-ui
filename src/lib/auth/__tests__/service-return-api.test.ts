import type { NextRequest } from "next/server";
import { afterEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import * as consoleRoute from "@/app/auth/return/console/route";
import * as rejected from "@/app/auth/return/[...rejected]/route";

const nonce = "A".repeat(43);
const routes = [
  { service: "console", adapter: consoleRoute, target: "https://jay-macmini-2.tail165003.ts.net:2455/api/console/auth/callback" },
] as const;
const methods = ["HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;

// Deliberately do not construct a Request: these are the URL/Host values already
// delivered by the platform, without another normalization before the parser.
function delivered(url: string, method = "GET", host: string | null = "naeil.dev") {
  const headers = new Headers({ "x-forwarded-host": "naeil.dev", "x-invoke-path": "/auth/return/console", "x-original-url": "https://naeil.dev/auth/return/console" });
  if (host !== null) headers.set("host", host);
  const get = headers.get.bind(headers);
  headers.get = (name) => {
    if (name.toLowerCase() !== "host") throw new Error(`Must not read ${name}`);
    return get(name);
  };
  const request = { url, method, headers };
  for (const key of ["cookies", "body", "json", "text", "formData"]) Object.defineProperty(request, key, { get() { throw new Error(`Must not read ${key}`); } });
  return request as Request;
}
async function protectedResponse(response: Response, status: number, location?: string) {
  expect(response.status).toBe(status);
  expect(await response.text()).toBe("");
  expect(response.headers.get("location")).toBe(location ?? null);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect(response.headers.get("x-frame-options")).toBe("DENY");
  expect(response.headers.get("content-security-policy")).toBe("default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'");
  expect(response.headers.has("set-cookie")).toBe(false);
}
afterEach(() => vi.unstubAllGlobals());

describe.each(routes)("static $service App Router adapter", ({ service, adapter, target }) => {
  const url = (query = `nonce=${nonce}&code=ok`, path = `/auth/return/${service}`) => `https://internal.invalid${path}?${query}`;
  it("exports public Request first arguments for Next route validation", () => {
    // Next's generated validator checks the declared first argument extends
    // Request | NextRequest; normal function assignability accepts a smaller Pick.
    type RouteMethod = "GET" | (typeof methods)[number];
    type FirstArgument = Parameters<(typeof adapter)[RouteMethod]>[0];
    expectTypeOf<FirstArgument extends Request | NextRequest ? true : false>().toEqualTypeOf<true>();
  });
  it("declares dynamic Node execution", () => {
    expect(adapter.dynamic).toBe("force-dynamic");
    expect(adapter.runtime).toBe("nodejs");
  });
  it("relays GET using the fixed destination without Auth, cookies, body or network", async () => {
    vi.stubGlobal("fetch", () => { throw new Error("No network"); });
    await protectedResponse(adapter.GET(delivered(url(`nonce=${nonce}&code=ORIGINAL%2Bvalue`))), 303, `${target}?nonce=${nonce}&code=ORIGINAL%2Bvalue#`);
  });
  it("accepts a public Request without private metadata or a version check", async () => {
    await protectedResponse(adapter.GET(new Request(url(), { headers: { host: "naeil.dev" } })), 303, `${target}?nonce=${nonce}&code=ok#`);
  });
  it.each(["error=access_denied&error_description=sensitive", "code=ok&error=denied", "code=ok&path=console", "code=ok&nxtPpath=console", "code=ok&access_token=secret", "%63ode=ok", "code=ok&", "code=ok&nxtPnonce=opaque", "code=ok&_rsc=opaque"])("forwards only a canonical failure for %s", async (fields) => {
    await protectedResponse(adapter.GET(delivered(url(`nonce=${nonce}&${fields}`))), 303, `${target}?nonce=${nonce}&error=authentication_failed#`);
  });
  it.each(methods)("exports an explicit protected %s 405", async (method) => {
    const response = adapter[method](delivered("not-a-url", method));
    await protectedResponse(response, 405);
    expect(response.headers.get("allow")).toBe("GET");
  });
  it.each(routes)("cannot select another service from the delivered URL: $service", async ({ service: other }) => {
    const response = adapter.GET(delivered(url(undefined, `/auth/return/${other}`)));
    await protectedResponse(response, other === service ? 303 : 404, other === service ? `${target}?nonce=${nonce}&code=ok#` : undefined);
  });
  it.each([null, "evil.example", "naeil.dev:443", "naeil.dev, evil.example", "NAEIL.DEV"])("rejects unexpected delivered Host %s", async (host) => {
    await protectedResponse(adapter.GET(delivered(url(), "GET", host)), 403);
  });
  it.each([
    "/auth/return/abestimate", "/auth/return/jev",
    "/api/internal/service-return", "/api/internal/service-return/", "/auth/return/console/", "/auth/return/console.rsc",
    "/auth/return/unknown", "/auth/return/%63onsole", "/auth/return/%2e/console", "/auth/return/x/../console",
    "/auth/return/x/%2e%2e/console", "/ja/auth/return/console", "/_next/data/build/auth/return/console.json",
  ])("rejects a delivered noncanonical path: %s", async (path) => {
    await protectedResponse(adapter.GET(delivered(url(undefined, path))), 404);
  });
  it.each(["#", "#forged", "\n", "\t"])("rejects delivered literal fragments/controls before parsing row %#", async (suffix) => {
    await protectedResponse(adapter.GET(delivered(url() + suffix)), 400);
  });
  it.each([`%6eonce=${nonce}&code=ok`, `nonce=${nonce}&code=%`, `nonce=${nonce}&code=%FF`, `nonce=${nonce}&code=%C0%AF`, `%6eonce=${nonce}&nonce=${nonce}&code=ok`])("preserves strict delivered spelling row %#", async (query) => {
    await protectedResponse(adapter.GET(delivered(url(query))), 400);
  });
  it("applies size to delivered apostrophes without Request reconstruction (RAW-01 replacement)", async () => {
    await protectedResponse(adapter.GET(delivered(url(`nonce=${nonce}&unknown=${"'".repeat(6000)}`))), 303, `${target}?nonce=${nonce}&error=authentication_failed#`);
  });
  it("does not trim delivered trailing spaces before the query byte limit (RAW-01 replacement)", async () => {
    await protectedResponse(adapter.GET(delivered(url(`nonce=${nonce}&code=ok${" ".repeat(16384)}`))), 400);
  });
  it.each([
    { id: "D01 original", fields: `nonce=${nonce}&code=synthetic-platform-v1`, status: 303, result: "code=synthetic-platform-v1" },
    { id: "D01 delivered", fields: `nonce=${nonce}&code=synthetic-platform-v1`, status: 303, result: "code=synthetic-platform-v1" },
    { id: "D03 original", fields: `nonce=${nonce}&code=%2f`, status: 303, result: "code=%2F" },
    { id: "D03 delivered (D04)", fields: `nonce=${nonce}&code=%2F`, status: 303, result: "code=%2F" },
    { id: "D09 original", fields: `%6eonce=${nonce}&nonce=${nonce}&code=x`, status: 400 },
    { id: "D09 delivered (D10)", fields: `nonce=${nonce}&nonce=${nonce}&code=x`, status: 400 },
    { id: "D12 original", fields: `nonce=${nonce}&code=%`, status: 400 },
    { id: "D12 delivered (D27)", fields: `nonce=${nonce}&code=`, status: 303, result: "error=authentication_failed" },
    { id: "D30 original", fields: `nonce=${nonce}&code=synthetic-platform-v1&&`, status: 303, result: "error=authentication_failed" },
    { id: "D30 delivered (D01)", fields: `nonce=${nonce}&code=synthetic-platform-v1`, status: 303, result: "code=synthetic-platform-v1" },
  ])("distinguishes selected original/delivered forms: $id", async ({ fields, status, result }) => {
    // Synthetic shape regressions, not a repeat or reclassification of hosted
    // observations. The adapter can only validate what the platform delivers.
    await protectedResponse(adapter.GET(delivered(url(fields))), status, result ? `${target}?nonce=${nonce}&${result}#` : undefined);
  });
});


describe("unconditional return rejection fallback", () => {
  it("declares dynamic Node execution and Next-compatible public method arguments", () => {
    expect(rejected.dynamic).toBe("force-dynamic");
    expect(rejected.runtime).toBe("nodejs");
    type Method = "GET" | (typeof methods)[number];
    type FirstArgument = Parameters<(typeof rejected)[Method]>[0];
    expectTypeOf<FirstArgument extends Request | NextRequest ? true : false>().toEqualTypeOf<true>();
  });
  it.each(["GET", ...methods] as const)("returns only protected404 for %s without any request/context access", async (method) => {
    vi.stubGlobal("fetch", () => { throw new Error("No network"); });
    const request = new Proxy({} as Request, { get() { throw new Error("Must not read request"); } });
    await protectedResponse(rejected[method](request), 404);
  });
  it.each([
    "/auth/return/abestimate", "/auth/return/console", "/auth/return/jev",
    "/auth/return/console.rsc", "/auth/return/console/../console", "/auth/return/%2e/console", "/auth/return/x/%2e%2e/console",
  ])("never turns a delivered canonical or normalized-looking URL into a relay: %s", async (path) => {
    await protectedResponse(rejected.GET(delivered(`https://naeil.dev${path}?nonce=${nonce}&code=synthetic&access_token=secret&destination=https%3A%2F%2Fevil.example`)), 404);
  });
});
