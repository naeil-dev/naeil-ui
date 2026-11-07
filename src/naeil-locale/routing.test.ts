import { describe, expect, it } from "vitest";
import { defineLocaleService, localeHref, localePath, naeilRouting, naeilServices, resolveLocaleUrl, sameLogicalRoute } from "./routing";

describe("owned locale routing", () => {
  it("uses deterministic paths with all next-intl personalization disabled", () => {
    expect(naeilRouting).toEqual({ locales: ["en", "ko", "ja"], defaultLocale: "en", localePrefix: "as-needed", localeDetection: false, localeCookie: false, alternateLinks: false });
    for (const service of ["main", "jev", "estimate", "abstorm"] as const) for (const locale of ["en", "ko", "ja"] as const) {
      expect(localeHref(service, "/", locale)).toBe(naeilServices[service].origin + (locale === "en" ? "/" : "/" + locale));
    }
  });
  it.each([
    ["/?lang=ko", "/ko", "ko"],
    ["/calendar?view=week&lang=ja#today", "/ja/calendar?view=week#today", "ja"],
    ["/en/calendar?lang=ja&view=week", "/calendar?view=week", "en"],
    ["/ko/calendar?lang=ja&view=week", "/ko/calendar?view=week", "ko"],
    ["/calendar", "/calendar", "en"],
    ["/ja/estimates/a%20b", "/ja/estimates/a%20b", "ja"],
  ])("normalizes %s once", (input, canonicalPath, locale) => {
    const result = resolveLocaleUrl("estimate", input);
    expect(result).toMatchObject({ kind: "ui", canonicalPath, locale });
    expect(resolveLocaleUrl("estimate", canonicalPath)).toMatchObject({ kind: "ui", alias: false });
  });
  it("preserves non-language query bytes and nested return values", () => {
    expect(localePath("estimate", "/calendar?view=a%2Bb&next=https%3A%2F%2Fnaeil.dev%2Fja%3Flang%3Den&lang=ko#one", "ja")).toBe("/ja/calendar?view=a%2Bb&next=https%3A%2F%2Fnaeil.dev%2Fja%3Flang%3Den#one");
    expect(resolveLocaleUrl("main", "/?lang=ko&lang=ja")).toMatchObject({ kind: "ui", locale: "en", canonicalPath: "/?lang=ko&lang=ja", alias: false });
  });
  it.each(["?lang=", "?lang=fr", "?lang=ko&lang=ko", "?lang=ko&%6cang=ja"])("rejects invalid legacy input %s even with an explicit path", query => {
    expect(resolveLocaleUrl("estimate", "/ko/calendar" + query)).toMatchObject({ kind: "invalid", status: 400 });
  });
  it.each(["/ko/api/private", "/ja/auth/callback", "/en/auth/invite", "/ko/ja/calendar", "/%6bo/calendar", "/ko/%61pi/private", "/ko/%2561pi/private", "/ko/estimates/a%2Fb", "/ko/estimates/%2e%2e", "/ko/estimates/..", "/ko//calendar", "//evil.test/ko", "/ko\\calendar", "/ko/koala", "/unregistered", "https://naeil.dev.evil.test/"])("rejects protocol/nested/encoded/unregistered %s", input => {
    expect(resolveLocaleUrl("estimate", input).kind).toBe("invalid");
  });
  it("keeps exact protocol paths outside locale handling and allows only audited UI exceptions", () => {
    expect(resolveLocaleUrl("estimate", "/auth/callback")).toMatchObject({ kind: "protocol" });
    expect(resolveLocaleUrl("estimate", "/ko/auth/complete")).toMatchObject({ kind: "ui", logicalPath: "/auth/complete" });
    expect(resolveLocaleUrl("estimate", "/ko/auth/complete/extra").kind).toBe("invalid");
    expect(() => defineLocaleService({ id: "jev", origin: "https://evil.test", routes: ["/"] })).toThrow();
    expect(() => defineLocaleService({ id: "jev", origin: "https://jev.naeil.dev", routes: ["/auth/[slug]"], uiProtocolExceptions: ["/auth/[slug]"] })).toThrow();
  });
  it("never silently localizes an already localized destination", () => {
    expect(() => localePath("estimate", "/ko/calendar", "ja")).toThrow();
    expect(() => localePath("jev", "/auth/callback", "ja")).toThrow();
    expect(() => localePath("main", "/sa/reports", "ja")).toThrow();
  });
  it("distinguishes locale-only navigation from entity, query and fragment changes", () => {
    expect(sameLogicalRoute("estimate", "/ko/estimates/one?tab=1#row", "/ja/estimates/one?tab=1#row")).toBe(true);
    for (const target of ["/ja/estimates/two?tab=1#row", "/ja/estimates/one?tab=2#row", "/ja/estimates/one?tab=1#other"]) expect(sameLogicalRoute("estimate", "/ko/estimates/one?tab=1#row", target)).toBe(false);
  });
});

describe("abstorm registered UI and protocol boundaries", () => {
  it.each(["/", "/new", "/runs/example", "/runs/example/report", "/experts"])("protects %s in each language", path => {
    for (const locale of ["en", "ko", "ja"] as const) {
      const href = localeHref("abstorm", path, locale);
      expect(href.startsWith("https://abstorm.naeil.dev/")).toBe(true);
      expect(resolveLocaleUrl("abstorm", href)).toMatchObject({ kind: "ui", locale, route: { protected: true } });
    }
  });
  it("does not localize auth/api or allow other origins", () => {
    for (const path of ["/auth/session", "/auth/logout", "/api/runs", "/health"]) {
      expect(resolveLocaleUrl("abstorm", path).kind).toBe("protocol");
      for (const locale of ["en", "ko", "ja"] as const) {
        expect(resolveLocaleUrl("abstorm", `/${locale}${path}`).kind).toBe("invalid");
        expect(() => localePath("abstorm", path, locale)).toThrow();
      }
    }
    expect(() => defineLocaleService({id: "abstorm", origin: "https://abstorm.naeil.dev.evil.test", routes: ["/"]})).toThrow();
  });
  it("preserves AB Storm copy queries and rejects unregistered or foreign routes", () => {
    expect(localeHref("abstorm", "/new?copy=one#review", "ja")).toBe("https://abstorm.naeil.dev/ja/new?copy=one#review");
    for (const path of ["/settings", "/runs", "/runs/one/extra", "https://x.abstorm.naeil.dev/", "https://abstorm.naeil.dev.evil.example/", "http://abstorm.naeil.dev/"]) expect(resolveLocaleUrl("abstorm", path).kind).toBe("invalid");
  });
});
