import { describe, expect, it } from "vitest";
import { defineLocaleService, localeHref, localePath, naeilRouting, naeilServices, resolveLocaleUrl, sameLogicalRoute } from "./routing";

describe("owned locale routing", () => {
  it("uses deterministic paths with all next-intl personalization disabled", () => {
    expect(naeilRouting).toEqual({ locales: ["en", "ko", "ja"], defaultLocale: "en", localePrefix: "as-needed", localeDetection: false, localeCookie: false, alternateLinks: false });
    for (const service of ["main", "jev", "estimate"] as const) for (const locale of ["en", "ko", "ja"] as const) {
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
