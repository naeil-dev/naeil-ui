import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import proxy from "@/proxy";
import { POST as invitePost } from "@/app/auth/invite/route";

const fixture = vi.hoisted(() => ({
  manifest: "",
  unavailable: false,
  sessionReads: 0,
  localeReads: 0,
}));
vi.mock("node:fs/promises", async (original) => ({
  ...await original<typeof import("node:fs/promises")>(),
  readFile: async () => {
    if (fixture.unavailable) throw new Error("Missing independent manifest");
    return fixture.manifest;
  },
}));
vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: () => {
    fixture.sessionReads++;
    return { response: NextResponse.next(), user: { id: "authenticated-action-fixture" }, unavailable: false };
  },
}));
vi.mock("next-intl/middleware", () => ({
  default: () => () => {
    fixture.localeReads++;
    return NextResponse.next();
  },
}));
// Proxy uses routing configuration, never React navigation hooks.
vi.mock("next-intl/navigation", () => ({ createNavigation: () => ({}) }));

const email = "40" + "1".repeat(40);
const code = "00" + "2".repeat(40);
const password = "40" + "3".repeat(40);
const logout = "40" + "4".repeat(40);
const clear = "00" + "5".repeat(40);
const prepare = "60" + "6".repeat(40);
const missing = "00" + "7".repeat(40);
const loginWorkers = ["app/[locale]/login/page", "app/[locale]/login/change-password/page"];
const globalWorkers = [
  "app/[locale]/(landing)/page", "app/[locale]/(content)/blog/page",
  "app/[locale]/(content)/blog/[slug]/page", "app/[locale]/(content)/design/page",
  "app/[locale]/(content)/projects/page", ...loginWorkers,
];
function entry(name: string, paths: string[]) {
  return { exportedName: name, workers: Object.fromEntries(paths.map(path => [path, { moduleId: 1, async: false }])) };
}
function manifest() {
  return { node: {
    [email]: entry("emailLogin", loginWorkers), [code]: entry("requestPasswordCode", loginWorkers),
    [password]: entry("passwordLogin", loginWorkers), [logout]: entry("logout", globalWorkers),
    [clear]: entry("clearLocalSession", globalWorkers), [prepare]: entry("prepareLogin", [loginWorkers[0]]),
  }, edge: {} };
}
function request(path: string, id = code, headers: Record<string, string> = {}, method = "POST") {
  return new NextRequest(`https://naeil.dev${path}`, {
    method, headers: { host: "naeil.dev", origin: "https://naeil.dev", "next-action": id, ...headers },
  });
}
async function rejected(response: Response, status: number, result: string) {
  expect(response.status).toBe(status);
  expect(await response.json()).toEqual({ status: result });
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  for (const name of ["set-cookie", "location", "x-middleware-next", "x-middleware-rewrite"]) expect(response.headers.has(name)).toBe(false);
  expect(fixture.sessionReads).toBe(0);
  expect(fixture.localeReads).toBe(0);
}
beforeEach(() => {
  vi.stubEnv("NAEIL_ACTION_MANIFEST_PATH", "independent-fixture/server/server-reference-manifest.json");
  vi.stubEnv("NAEIL_AUTH_EMAIL_ENABLED", "false");
  vi.stubEnv("NAEIL_INVITE_ACCEPT_ENABLED", "false");
  fixture.manifest = JSON.stringify(manifest()); fixture.unavailable = false;
  fixture.sessionReads = 0; fixture.localeReads = 0;
});
afterEach(() => vi.unstubAllEnvs());

describe("Server Action dispatch before session/locale and framework forwarding", () => {
  // Without the boundary, this admitted request reaches the locale proxy and
  // the compiled runtime loops through a literal dynamic worker before its mail gate.
  it.each([email, code])("rejects an off-owner disabled mail action before Auth", async id => {
    await rejected(await proxy(request("/projects", id)), 409, "mailPaused");
  });
  it.each([
    "/ja/projects", "/en/projects", "/projects/", "/no-page", "/[locale]/login",
    "/[locale]/login/change-password", "/%5Blocale%5D/login", "/%255Blocale%255D/login",
    "/en/%5Blocale%5D/login", "/login%2Fchange-password", "/login%252Fchange-password",
    "/login%5Cchange-password", "/%6cogin", "/%65n/login", "/LOGIN", "/fr/login",
    "/login//", "/ja//login", "/login%GG", "/login%00", "/_next/data/build/login.json",
  ])("does not broaden ownership for delivered path %s", async path => {
    await rejected(await proxy(request(path)), 409, "mailPaused");
  });
  it.each(["", "0", "1", "anything"])("does not trust a forwarded-header value %#", async value => {
    await rejected(await proxy(request("/login", code, { "x-action-forwarded": value })), 409, "mailPaused");
  });
  it("still rejects off-owner dispatch when email is explicitly enabled", async () => {
    vi.stubEnv("NAEIL_AUTH_EMAIL_ENABLED", "true");
    await rejected(await proxy(request("/projects", email)), 409, "invalidActionRoute");
  });
  it("rejects a credential action and OAuth preparation on a non-owner page", async () => {
    await rejected(await proxy(request("/projects", password)), 409, "invalidActionRoute");
    await rejected(await proxy(request("/login/change-password", prepare)), 409, "invalidActionRoute");
  });
  it.each(["", "x", "0".repeat(41), "0".repeat(43), "F".repeat(42), "0".repeat(42) + ",x"])("rejects malformed action ID %#", async id => {
    await rejected(await proxy(request("/login", id)), 400, "invalidAction");
  });
  it("preserves the typed stale-action signal for a missing well-formed ID", async () => {
    const response = await proxy(request("/login", missing));
    expect(response.headers.get("x-nextjs-action-not-found")).toBe("1");
    await rejected(response, 404, "invalidAction");
  });
  it.each(["missing", "bad-json", "missing-node", "bad-workers", "bad-name", "bad-worker-metadata", "catchall", "optional", "parallel", "intercepting"])("fails closed for unavailable metadata: %s", async kind => {
    const data = manifest();
    if (kind === "missing") fixture.unavailable = true;
    else if (kind === "bad-json") fixture.manifest = "{";
    else if (kind === "missing-node") fixture.manifest = JSON.stringify({ edge: {} });
    else {
      const bad = data.node[code] as unknown as Record<string, unknown>;
      if (kind === "bad-workers") bad.workers = [];
      else if (kind === "bad-name") bad.exportedName = null;
      else if (kind === "bad-worker-metadata") bad.workers = { "app/[locale]/login/page": { moduleId: {}, async: "no" } };
      else bad.workers = { [({ catchall: "app/[locale]/[...slug]/page", optional: "app/[locale]/[[...slug]]/page", parallel: "app/[locale]/@slot/login/page", intercepting: "app/[locale]/(.)login/page" } as Record<string, string>)[kind]]: { moduleId: 1, async: false } };
      fixture.manifest = JSON.stringify(data);
    }
    await rejected(await proxy(request("/login")), 503, "actionUnavailable");
  });
  it.each(["/login", "/ko/login", "/ja/login", "/login/change-password", "/ko/login/change-password", "/ja/login/change-password"])("preserves credential owner %s", async path => {
    for (const id of [email, code, password]) expect((await proxy(request(path, id))).headers.get("x-middleware-next")).toBe("1");
    expect(fixture.sessionReads).toBe(3); expect(fixture.localeReads).toBe(3);
  });
  it.each(["/", "/blog", "/blog/example-post", "/blog/%ED%95%9C%EA%B8%80", "/design", "/projects", "/login", "/login/change-password"])("preserves global actions on actual page %s", async path => {
    for (const locale of ["", "/ko", "/ja"]) for (const id of [logout, clear]) {
      const delivered = locale + (path === "/" ? "" : path) || "/";
      expect((await proxy(request(delivered, id))).headers.get("x-middleware-next")).toBe("1");
    }
    expect(fixture.sessionReads).toBe(6);
  });
  it("rejects noncanonical Action paths without a document redirect and keeps forwarding guard", async () => {
    const response = await proxy(request("/ja/login/", prepare));
    expect(response.status).toBe(400); expect(response.headers.get("location")).toBeNull();
    fixture.sessionReads = 0; fixture.localeReads = 0;
    await rejected(await proxy(request("/projects", logout, { "x-action-forwarded": "1" })), 409, "invalidActionRoute");
  });
  it.each(["GET", "HEAD"])("leaves ordinary %s untouched even with action-like headers", async method => {
    fixture.unavailable = true;
    expect((await proxy(request("/projects", "not-an-id", {}, method))).headers.get("x-middleware-next")).toBe("1");
  });
  it("does not read the manifest for a POST without an action header", async () => {
    fixture.unavailable = true;
    expect((await proxy(new NextRequest("https://naeil.dev/projects", { method: "POST" }))).headers.get("x-middleware-next")).toBe("1");
  });
  it("preserves C ingress ahead of the action boundary", async () => {
    fixture.unavailable = true;
    const incoming = request("/auth/invite", code);
    const dispatch = await proxy(incoming);
    expect(dispatch.headers.get("x-middleware-next")).toBe("1");
    expect(dispatch.headers.get("referrer-policy")).toBe("no-referrer");
    const response = await invitePost(incoming);
    expect(response.status).toBe(503); expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.has("set-cookie")).toBe(false); expect(fixture.sessionReads).toBe(0);
  });
  it("preserves protected service-return rejection ahead of action dispatch", async () => {
    fixture.unavailable = true;
    const response = await proxy(request("/auth/return/console", code));
    expect(response.status).toBe(405); expect(response.headers.get("allow")).toBe("GET");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer"); expect(fixture.sessionReads).toBe(0);
  });
});
