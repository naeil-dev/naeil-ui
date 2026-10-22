import { afterEach, describe, expect, it, vi } from "vitest";
import { createServiceReturnHandler, isCanonicalServiceReturnPath, isServiceReturnPath, serviceReturnHandler } from "../service-return";

const nonce = "A".repeat(43);
const destinations = {
  console: "https://jay-macmini-2.tail165003.ts.net:2455/api/console/auth/callback",
};
const handle = (query: string, path = "/auth/return/console", method = "GET", host: string | null = "naeil.dev") => {
  const headers = new Headers();
  if (host !== null) headers.set("host", host);
  return serviceReturnHandler({ url: `https://internal.invalid${path}?${query}`, method, headers });
};
function protectedResponse(response: Response) {
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  expect(response.headers.get("x-frame-options")).toBe("DENY");
  expect(response.headers.get("content-security-policy")).toBe("default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; object-src 'none'");
  expect(response.headers.has("set-cookie")).toBe(false);
}
afterEach(() => vi.unstubAllGlobals());

describe("backslash namespace recognition remains rejection-only", () => {
  it.each([
    "/auth\\return\\console", "\\auth\\return\\console", "/auth/return\\console",
    "/auth%5Creturn%5Cconsole", "/auth%5creturn%5cconsole", "/auth%5Creturn/console", "/auth/return%5cconsole",
    "/auth%255Creturn%255cconsole", "/auth%25255creturn%25255Cconsole",
    "/ja\\auth\\return\\console", "/ja%5Cauth%5creturn%5Cconsole", "/ja/auth%5Creturn%5Cconsole",
    "/api\\internal\\service-return", "/api%5Cinternal%5Cservice-return", "/api/internal%5cservice-return",
    "/ja%5Capi%255cinternal%5Cservice-return", "/auth%5Creturn%5Cconsole%GG",
  ])("recognizes but never relays %s", async (path) => {
    expect(isServiceReturnPath(path)).toBe(true);
    expect(isCanonicalServiceReturnPath(path)).toBe(false);
    const response = handle(`nonce=${nonce}&code=ok`, path);
    expect(response.status).toBe(404);
    expect(response.headers.has("location")).toBe(false);
    expect(await response.text()).toBe("");
    protectedResponse(response);
  });
  it.each([
    "/ja%5Clogin", "/auth%5Ccallback", "/auth%5Creturns%5Cconsole", "/oauth%5Creturn%5Cconsole",
    "/authentic%5Creturn%5Cconsole", "/api%5Cinternal%5Cservice-returning", "/api%5Cexternal%5Cservice-return",
    "/ja%5Cauth%5Creturning%5Cconsole", "/auth%5Creturn-to%5Cconsole", "/images%5Clogo.png",
  ])("does not claim unrelated path %s", (path) => {
    expect(isServiceReturnPath(path)).toBe(false);
    expect(isCanonicalServiceReturnPath(path)).toBe(false);
  });
});

describe("fixed service return transport", () => {
  it.each(["abestimate", "jev"])("rejects retired %s relay with protected 404", async (service) => {
    const path = `/auth/return/${service}`;
    expect(isServiceReturnPath(path)).toBe(true);
    expect(isCanonicalServiceReturnPath(path)).toBe(false);
    const response = handle(`nonce=${nonce}&code=ok`, path);
    expect(response.status).toBe(404);
    expect(response.headers.has("location")).toBe(false);
    expect(await response.text()).toBe("");
    protectedResponse(response);
  });
  it.each(Object.entries(destinations))("forwards only the delivered nonce/code to %s and explicitly clears fragments", (service, target) => {
    const response = handle(`nonce=${nonce}&code=a%2Bb%2Fc%3D%26nonce%3Dother%23fragment`, `/auth/return/${service}`);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`${target}?nonce=${nonce}&code=a%2Bb%2Fc%3D%26nonce%3Dother%23fragment#`);
    protectedResponse(response);
  });
  it("decodes form values exactly once", () => {
    const response = handle(`code=%252F+%2B&nonce=${nonce}`);
    expect(response.headers.get("location")).toBe(`https://jay-macmini-2.tail165003.ts.net:2455/api/console/auth/callback?nonce=${nonce}&code=%252F+%2B#`);
  });
  it.each([
    "error=access_denied",
    "error=access_denied&error_description=Sensitive+provider+text&error_code=provider_error",
    "error=server_error&error_description=&error_code=",
  ])("canonicalizes a bound provider failure: %s", (fields) => {
    const response = handle(`nonce=${nonce}&${fields}`);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`https://jay-macmini-2.tail165003.ts.net:2455/api/console/auth/callback?nonce=${nonce}&error=authentication_failed#`);
    protectedResponse(response);
  });
  it("accepts exactly 4096 code characters", () => {
    const response = handle(`nonce=${nonce}&code=${"a".repeat(4096)}`);
    expect(response.status).toBe(303);
    expect(new URL(response.headers.get("location")!).searchParams.get("code")).toHaveLength(4096);
  });
  it("lets only the pure harness inject a fixed loopback map and ignores forwarded authority", () => {
    const handler = createServiceReturnHandler({ siteAuthority: "127.0.0.1:24601", destinations: { ...destinations, console: "http://127.0.0.1:24602/auth/callback" } });
    const response = handler(new Request(`http://internal.invalid/auth/return/console?nonce=${nonce}&code=ok`, { headers: { host: "127.0.0.1:24601", "x-forwarded-host": "evil.example", "x-forwarded-proto": "https" } }));
    expect(response.headers.get("location")).toBe(`http://127.0.0.1:24602/auth/callback?nonce=${nonce}&code=ok#`);
  });
  it("never reads cookies, body, or network", () => {
    vi.stubGlobal("fetch", () => { throw new Error("Unexpected network"); });
    const request = new Request(`https://naeil.dev/auth/return/console?nonce=${nonce}&code=ok`, { headers: { host: "naeil.dev", cookie: "sb-fixture-auth-token=opaque" } });
    const get = request.headers.get.bind(request.headers);
    request.headers.get = (name) => {
      if (name.toLowerCase() === "cookie") throw new Error("Unexpected cookie read");
      return get(name);
    };
    Object.defineProperty(request, "body", { get() { throw new Error("Unexpected body read"); } });
    const response = serviceReturnHandler(request);
    expect(response.status).toBe(303);
    protectedResponse(response);
  });
});

describe("unbound failures never select a consumer attempt", () => {
  it.each([
    "code=ok", `nonce=&code=ok`, `nonce=${"A".repeat(42)}&code=ok`, `nonce=${"A".repeat(44)}&code=ok`,
    `nonce=${"A".repeat(42)}%2B&code=ok`, `nonce=${nonce}&nonce=${nonce}&code=ok`,
    `%6eonce=${nonce}&code=ok`, `%6eonce=${nonce}&nonce=${nonce}&code=ok`,
    `nonce=${nonce}&%6Eonce=${"B".repeat(43)}&code=ok`, `nonce=${nonce}%0A&code=ok`,
    `nonce=${nonce}&code=%`, `nonce=${nonce}&code=%GG`, `nonce=${nonce}&code=%FF`,
    `nonce=${nonce}&code=%C0%AF`, `nonce=${nonce}&code=%ED%A0%80`, `nonce=${nonce}&%FF=x&code=ok`,
    `nonce=${nonce}&code=${"a".repeat(16384)}`,
  ])("returns protected 400 for query row %#", async (query) => {
    const response = handle(query);
    expect(response.status).toBe(400);
    expect(response.headers.has("location")).toBe(false);
    expect(await response.text()).toBe("");
    protectedResponse(response);
  });
  it("counts delivered query bytes, allowing the exact 16KiB boundary before classifying fields", () => {
    const prefix = `nonce=${nonce}&unknown=`;
    expect(handle(prefix + "x".repeat(16384 - prefix.length)).status).toBe(303);
    expect(handle(prefix + "x".repeat(16385 - prefix.length)).status).toBe(400);
    const multibyte = `nonce=${nonce}&code=${"%E3%81%82".repeat(1820)}`;
    expect(handle(multibyte).status).toBe(400);
  });
  it.each([null, "evil.example", "naeil.dev:443", "naeil.dev.evil.example", "naeil.dev, evil.example", "NAEIL.DEV"])("rejects unexpected delivered Host %s", (host) => {
    const response = handle(`nonce=${nonce}&code=ok`, undefined, undefined, host);
    expect(response.status).toBe(403);
    expect(response.headers.has("location")).toBe(false);
    protectedResponse(response);
  });
  it.each([
    "/auth/return", "/auth/return/unknown", "/auth/return/console/", "/auth/return/console/extra", "/auth/return/%63onsole",
    "/%61uth/return/console", "/auth/%72eturn/console", "/ja/auth/return/console", "/auth/return/console.rsc",
    "/_next/data/build/auth/return/console.json", "/auth/return/constructor", "/auth/return/__proto__",
  ])("rejects noncanonical service path %s", (path) => {
    const response = handle(`nonce=${nonce}&code=ok`, path);
    expect(response.status).toBe(404);
    expect(response.headers.has("location")).toBe(false);
    protectedResponse(response);
  });
});

describe("bound malformed fields retire only the nonce with a canonical failure", () => {
  it.each([
    "", "code", "code=", `code=${"x".repeat(4097)}`, "code=ok&code=other", "code=ok&error=access_denied",
    "code=ok&error_description=text", "error=", "error_code=denied", "error_description=text",
    "error=denied&error=other", "error=denied&error_description=a&error_description=b",
    "error=denied&error_code=a&error_code=b", `error=${"x".repeat(4097)}`,
    `error=denied&error_description=${"x".repeat(4097)}`, `error=denied&error_code=${"x".repeat(4097)}`,
    "%63ode=ok", "code=ok&%65rror=denied", "code=ok&unknown=x", "code=ok&access_token=secret",
    "code=ok&refresh_token=secret", "code=ok&verifier=secret", "code=ok&destination=https%3A%2F%2Fevil.example",
    "code=ok&returnTo=%2Fevil", "code=ok&host=evil.example", "code=ok&service=console", "code=ok&=empty",
    "code=ok&", "code=ok;error=denied&unknown=x", "code=ok%0D%0ALocation%3Aevil", "code=ok%00",
    "code=ok%C2%85", "%00=ok", "error=denied&error_description=%09text", "error=denied&%65rror_code=text",
  ])("returns only fixed error for malformed field row %#", async (fields) => {
    const response = handle(`nonce=${nonce}${fields ? `&${fields}` : ""}`);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(`https://jay-macmini-2.tail165003.ts.net:2455/api/console/auth/callback?nonce=${nonce}&error=authentication_failed#`);
    expect(await response.text()).toBe("");
    protectedResponse(response);
  });
});

describe("production handler methods", () => {
  it("uses production fixed destinations", () => {
    const response = serviceReturnHandler(new Request(`https://naeil.dev/auth/return/console?nonce=${nonce}&code=ok`, { headers: { host: "naeil.dev" } }));
    expect(response.headers.get("location")).toBe(`https://jay-macmini-2.tail165003.ts.net:2455/api/console/auth/callback?nonce=${nonce}&code=ok#`);
  });
  it.each(["HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const)("returns an explicit protected %s 405", (method) => {
    const response = serviceReturnHandler(new Request(`https://naeil.dev/auth/return/console?nonce=${nonce}&code=ok`, { method, headers: { host: "naeil.dev" } }));
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET");
    expect(response.headers.has("location")).toBe(false);
    protectedResponse(response);
  });
});


describe("delivered URL boundary before strict parsing", () => {
  it.each(["#", "#forged", "\n", "\r", "\t", "\u0000", "\u007f", "\u0085"])("rejects literal fragment/control row %#", async (suffix) => {
    const response = handle(`nonce=${nonce}&code=ok${suffix}`);
    expect(response.status).toBe(400);
    expect(response.headers.has("location")).toBe(false);
    expect(await response.text()).toBe("");
    protectedResponse(response);
  });
  it.each(["\n", "\t", "\u0085"])("rejects controls anywhere in the delivered URL row %#", (control) => {
    const response = serviceReturnHandler({ url: `https://internal${control}.invalid/auth/return/console?nonce=${nonce}&code=ok`, method: "GET", headers: new Headers({ host: "naeil.dev" }) });
    expect(response.status).toBe(400);
    expect(response.headers.has("location")).toBe(false);
    protectedResponse(response);
  });
});
