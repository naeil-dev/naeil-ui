import { describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { createNaeilLocaleProxy, createNaeilRequestConfig, getRequestLocale, localeMetadata, localeRequestKind } from "./server";

// Node's non-react-server condition selects next-intl's client rejection stub.
// Its server getRequestConfig implementation is an identity wrapper; exercise
// our real loader/config logic while keeping actual middleware unmocked.
vi.mock("next-intl/server", () => ({ getRequestConfig: <T,>(factory: T): T => factory }));

const request = (path: string, init?: ConstructorParameters<typeof NextRequest>[1]) => new NextRequest("https://abestimate.naeil.dev" + path, init);
const allow = () => ({ access: "allowed" as const });
describe("common proxy preserves auth and protocol boundaries", () => {
  it("overwrites external locale/access markers and ignores locale preference/browser hints", async () => {
    const proxy = createNaeilLocaleProxy({ service: "estimate", authorize: allow });
    const response = await proxy(request("/calendar", { headers: { "x-naeil-locale": "ko", "x-next-intl-locale": "ko", "x-naeil-locale-access": "allowed", cookie: "naeil_locale_v1=ko; NEXT_LOCALE=ja", "accept-language": "ja" } }));
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-rewrite")).toBe("https://abestimate.naeil.dev/en/calendar");
    expect(response.headers.get("x-middleware-request-x-naeil-locale")).toBe("en");
    expect(response.headers.get("x-middleware-request-x-next-intl-locale")).toBe("en");
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("link")).toBeNull();
  });
  it("applies auth before one-hop alias normalization and preserves refreshed response cookies", async () => {
    const seen: string[] = [];
    const cookieResponse = NextResponse.next(); cookieResponse.cookies.set("session", "refreshed", { httpOnly: true });
    const proxy = createNaeilLocaleProxy({ service: "estimate", authorize: ({ route }) => { seen.push(route.logicalPath); return { access: "allowed", cookiesFrom: cookieResponse }; } });
    const response = await proxy(request("/en/calendar?lang=ja&view=week"));
    expect(seen).toEqual(["/calendar"]);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://abestimate.naeil.dev/calendar?view=week");
    expect(response.cookies.get("session")?.value).toBe("refreshed");
    expect(response.cookies.get("naeil_locale_v1")).toBeUndefined();
  });
  it("preserves localized document denial and never redirects unauthorized RSC to HTML/login", async () => {
    const proxy = createNaeilLocaleProxy({ service: "estimate", authorize: () => ({ access: "unauthenticated", response: NextResponse.redirect("https://naeil.dev/ko/login", 303) }) });
    const document = await proxy(request("/ko/calendar"));
    expect(document.status).toBe(303);
    expect(document.headers.get("location")).toBe("https://naeil.dev/ko/login");
    const rsc = await proxy(request("/ko/calendar", { headers: { rsc: "1" } }));
    expect(rsc.status).toBe(200);
    expect(rsc.headers.get("location")).toBeNull();
    expect(rsc.headers.get("x-middleware-next")).toBe("1");
    expect(rsc.headers.get("x-middleware-request-x-naeil-locale-access")).toBe("unauthenticated");
    expect(rsc.headers.get("cache-control")).toBe("private, no-store");
  });
  it("forwards refreshed request cookies, validates framework formats and rejects denied Actions", async () => {
    const proxy = createNaeilLocaleProxy({ service: "estimate", authorize: ({ request }) => { const headers = new Headers(request.headers); headers.set("cookie", "session=updated"); return { access: "allowed", requestHeaders: headers }; } });
    const response = await proxy(request("/ja/calendar", { headers: { rsc: "1", cookie: "session=old" } }));
    expect(response.headers.get("x-middleware-request-cookie")).toBe("session=updated");
    expect(localeRequestKind(request("/calendar", { method: "POST", headers: { "next-action": "opaque", rsc: "1" } }))).toBe("action");
    const denied = createNaeilLocaleProxy({ service: "estimate", authorize: () => ({ access: "forbidden" }) });
    const action = await denied(request("/ko/calendar", { method: "POST", headers: { "next-action": "opaque" } }));
    expect(action.status).toBe(403); expect(action.headers.get("location")).toBeNull();
  });
  it("recovers browser Flight requests after Next16 strips their internal headers, without granting access", async () => {
    const proxy = createNaeilLocaleProxy({ service: "estimate", authorize: () => ({ access: "unauthenticated", response: NextResponse.redirect("https://naeil.dev/ko/login") }) });
    const headers = { "sec-fetch-dest": "empty", "sec-fetch-mode": "cors" };
    const response = await proxy(request("/ko/calendar", { headers }));
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-request-x-naeil-locale-access")).toBe("unauthenticated");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(localeRequestKind(request("/ko/calendar", { headers: { ...headers, "next-action": "opaque" }, method: "POST" }))).toBe("action");
    expect(localeRequestKind(request("/ko/calendar", { headers: { "sec-fetch-dest": "document", "sec-fetch-mode": "navigate" } }))).toBe("document");
  });
  it("leaves exact protocols alone, rejects prefixes before app auth and sanitizes excluded routes", async () => {
    let authorizations = 0;
    const proxy = createNaeilLocaleProxy({ service: "estimate", authorize: () => { authorizations++; return { access: "allowed" }; } });
    for (const path of ["/ko/api/private", "/ja/auth/callback", "/ko/%61pi/private", "/ko/ja/calendar"]) expect((await proxy(request(path))).status).toBe(404);
    expect(authorizations).toBe(0);
    const protocol = await proxy(request("/api/private", { headers: { "x-naeil-locale": "ja", "x-naeil-locale-access": "allowed" } }));
    expect(protocol.headers.get("x-middleware-rewrite")).toBeNull();
    expect(protocol.headers.get("x-middleware-request-x-naeil-locale")).toBeNull();
    expect(protocol.headers.get("x-middleware-override-headers")).not.toContain("x-naeil-locale");
  });
  it("does not turn legacy RSC/Action requests into document redirects", async () => {
    const proxy = createNaeilLocaleProxy({ service: "estimate", authorize: allow });
    const response = await proxy(request("/en/calendar?lang=ja", { headers: { rsc: "1" } }));
    expect(response.status).toBe(400); expect(response.headers.get("location")).toBeNull();
    const bad = await proxy(request("/ko/calendar?lang=ja&lang=ko"));
    expect(bad.status).toBe(400);
    expect(await bad.text()).toContain('href="/ja"');
  });
  it("runs protected protocol hooks before UI normalization", async () => {
    const proxy = createNaeilLocaleProxy({ service: "estimate", protocol: request => request.nextUrl.pathname.includes("auth/callback") ? new NextResponse(null, { status: 418 }) : undefined });
    expect((await proxy(request("/ko/auth/callback"))).status).toBe(418);
  });
  it("fails closed on protected inventory entries without an app authorizer", async () => {
    const proxy = createNaeilLocaleProxy({ service: "estimate" });
    expect((await proxy(request("/ko/calendar"))).status).toBe(503);
    const rsc = await proxy(request("/ko/calendar", { headers: { rsc: "1" } }));
    expect(rsc.headers.get("x-middleware-request-x-naeil-locale-access")).toBe("unavailable");
    expect((await proxy(request("/ko/login"))).status).toBe(200);
  });
  it.each(["en", "ko", "ja"] as const)("renders a localized private dependency failure for %s", async locale => {
    const proxy = createNaeilLocaleProxy({ service: "estimate" });
    const response = await proxy(request(`${locale === "en" ? "" : `/${locale}`}/calendar`));
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toContain("no-store");
    const html = await response.text();
    expect(html).toContain(`<html lang="${locale}">`);
    expect(html).toContain('name="robots" content="noindex"');
    expect(html).toContain('href="/favicon.svg"');
    expect(html).not.toContain('rel="alternate"');
  });
  it("keeps internal rewrites and aliases on the app-validated request authority", async () => {
    const proxy = createNaeilLocaleProxy({ service: "estimate", authorize: allow, requestOrigin: () => "http://127.0.0.1:2480" });
    const rewrite = await proxy(request("/calendar"));
    expect(rewrite.headers.get("x-middleware-rewrite")).toBe("http://127.0.0.1:2480/en/calendar");
    const alias = await proxy(request("/en/calendar"));
    expect(alias.headers.get("location")).toBe("http://127.0.0.1:2480/calendar");
    const invalidOrigin = createNaeilLocaleProxy({ service: "estimate", requestOrigin: () => "https://abestimate.naeil.dev/path" });
    await expect(invalidOrigin(request("/calendar"))).rejects.toThrow("validated HTTP request origin");
  });
  it.each(["main", "estimate"] as const)("passes through the icon linked by the %s error document", async service => {
    const proxy = createNaeilLocaleProxy({ service });
    const response = await proxy(request("/missing"));
    const icon = (await response.text()).match(/<link rel="icon" href="([^"]+)">/)?.[1];
    expect(icon).toBeTruthy();
    const asset = await proxy(request(icon!));
    expect(asset.status).toBe(200);
    expect(asset.headers.get("x-middleware-next")).toBe("1");
    expect(asset.headers.get("x-middleware-rewrite")).toBeNull();
    expect((await proxy(request("/ko" + icon))).status).toBe(404);
  });
  it("uses only a validated explicit path locale for invalid-request documents", async () => {
    const proxy = createNaeilLocaleProxy({ service: "estimate", authorize: allow });
    for (const [path, locale, status] of [["/ko/missing", "ko", 404], ["/ja/calendar?lang=bad", "ja", 400], ["/ko/api/private", "ko", 404], ["/%6ao/calendar", "en", 404]] as const) {
      const response = await proxy(request(path, { headers: { "x-naeil-locale": "ja" } }));
      expect(response.status).toBe(status);
      expect(await response.text()).toContain(`<html lang="${locale}">`);
    }
  });
  it("removes external markers when an existing protocol hook passes a request through", async () => {
    const proxy = createNaeilLocaleProxy({ service: "estimate", protocol: () => NextResponse.next() });
    const response = await proxy(request("/api/private", { headers: { "x-naeil-locale": "ja", "x-next-intl-locale": "ko", "x-naeil-locale-access": "allowed", cookie: "session=original" } }));
    expect(response.headers.has("x-middleware-override-headers")).toBe(true);
    // Markers are listed without values, which makes Next delete them.
    for (const marker of ["x-naeil-locale", "x-next-intl-locale", "x-naeil-locale-access"]) expect(response.headers.get(`x-middleware-request-${marker}`)).toBeNull();
    expect(response.headers.get("x-middleware-request-cookie")).toBe("session=original");
  });
  it.each(["next", "rewrite"] as const)("preserves protocol hook header deletions and replacements on %s", async mode => {
    const proxy = createNaeilLocaleProxy({ service: "estimate", protocol: incoming => {
      const headers = new Headers(incoming.headers);
      headers.delete("x-user-id");
      headers.set("cookie", "session=refreshed");
      headers.set("x-naeil-locale", "ja");
      headers.set("x-next-intl-locale", "ja");
      headers.set("x-naeil-locale-access", "allowed");
      headers.set("x-naeil-locale-path", "/calendar");
      return mode === "next" ? NextResponse.next({ request: { headers } }) : NextResponse.rewrite("https://abestimate.naeil.dev/api/target", { request: { headers } });
    } });
    const response = await proxy(request("/api/private", { headers: { "x-user-id": "spoofed", cookie: "session=old", accept: "application/json" } }));
    expect(response.headers.get("x-middleware-request-x-user-id")).toBeNull();
    expect(response.headers.get("x-middleware-request-cookie")).toBe("session=refreshed");
    expect(response.headers.get("x-middleware-request-accept")).toBe("application/json");
    expect(response.headers.get("x-middleware-override-headers")?.split(",").sort()).toEqual(["accept", "cookie", "x-naeil-locale", "x-naeil-locale-access", "x-naeil-locale-path", "x-next-intl-locale"]);
    for (const marker of ["x-naeil-locale", "x-next-intl-locale", "x-naeil-locale-access", "x-naeil-locale-path"]) expect(response.headers.get(`x-middleware-request-${marker}`)).toBeNull();
    if (mode === "rewrite") expect(response.headers.get("x-middleware-rewrite")).toBe("https://abestimate.naeil.dev/api/target");
  });
  it("keeps an explicitly empty protocol override non-empty so Next cannot fall back to raw headers", async () => {
    const proxy = createNaeilLocaleProxy({ service: "estimate", protocol: () => NextResponse.next({ request: { headers: new Headers() } }) });
    const response = await proxy(request("/api/private", { headers: { "x-user-id": "spoofed", "x-naeil-locale-access": "allowed" } }));
    const listed = response.headers.get("x-middleware-override-headers")!.split(",");
    expect(listed).toEqual(expect.arrayContaining(["x-naeil-locale", "x-naeil-locale-access"]));
    expect(listed).not.toContain("x-user-id");
    expect(response.headers.get("x-middleware-request-x-user-id")).toBeNull();
    expect(response.headers.get("x-middleware-request-x-naeil-locale-access")).toBeNull();
  });
  it("allows safe English config outside locale routes and rejects supplied unsupported locales", async () => {
    const config = createNaeilRequestConfig({ namespace: "app", messages: { en: async () => ({ app: { save: "Save" } }), ko: async () => ({ app: { save: "저장" } }), ja: async () => ({ app: { save: "保存" } }) } });
    await expect(config({ requestLocale: Promise.resolve(undefined) })).resolves.toMatchObject({ locale: "en" });
    await expect(config({ requestLocale: Promise.resolve("invalid") })).rejects.toThrow("Unsupported");
  });
  it("supports safe excluded-route fallback and advertises only real translations", () => {
    expect(getRequestLocale(new Headers())).toBe("en");
    expect(getRequestLocale(new Headers({ "x-naeil-locale": "ja" }))).toBe("ja");
    expect(() => getRequestLocale(new Headers({ "x-naeil-locale": "evil" }))).toThrow();
    expect(localeMetadata({ service: "main", route: "/design", locale: "ko", title: "디자인", serviceName: ".naeil", public: true, translatedLocales: ["en", "ko"] })).toMatchObject({ title: "디자인 — .naeil", alternates: { canonical: "https://naeil.dev/ko/design", languages: { en: "https://naeil.dev/design", ko: "https://naeil.dev/ko/design", "x-default": "https://naeil.dev/design" } } });
    expect(localeMetadata({ service: "estimate", route: "/calendar", locale: "ko", title: "달력", serviceName: "Estimate" })).not.toHaveProperty("alternates");
  });
});

describe("AB Storm protected locale documents", () => {
  it.each(["en", "ko", "ja"] as const)("fails closed with app identity in %s", async locale => {
    const proxy = createNaeilLocaleProxy({ service: "abstorm" });
    const prefix = locale === "en" ? "" : `/${locale}`;
    const response = await proxy(new NextRequest(`https://abstorm.naeil.dev${prefix}/new`));
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toContain("no-store");
    const html = await response.text();
    expect(html).toContain(`<html lang="${locale}">`);
    expect(html).toContain(" — abstorm</title>");
    expect(html).not.toContain('rel="icon"');
    for (const href of ["/", "/ko", "/ja"]) expect(html).toContain(`href="${href}"`);
    expect((await proxy(new NextRequest(`https://abstorm.naeil.dev${prefix}/unknown`))).status).toBe(404);
  });
});
