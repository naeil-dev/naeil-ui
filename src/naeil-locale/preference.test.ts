import { describe, expect, it, vi } from "vitest";
import { browserLocaleHint, legacyLocaleHint, preferenceCookieWrites, readLocalePreference, writeLocalePreference } from "./preference";
import { createLocaleIntentGate } from "./intent";

describe("preference is an explicit committed intent", () => {
  it("does not commit merely because navigation started; ignores duplicate/stale arrivals", () => {
    const gate = createLocaleIntentGate("estimate");
    const intent = gate.begin("/ko/calendar?view=week#today", "ko", 0)!;
    expect(gate.begin("/ja/calendar", "ja")).toBeUndefined();
    expect(gate.arrive(intent.token, "/calendar?view=week#today", "en")).toBeUndefined();
    expect(gate.arrive(intent.token + 1, intent.href, "ko")).toBeUndefined();
    expect(gate.arrive(intent.token, intent.href, "ko")).toEqual(intent);
    expect(gate.arrive(intent.token, intent.href, "ko")).toBeUndefined();
  });
  it("cancellation and history traversal invalidate arrivals and allow a new retry token", () => {
    const gate = createLocaleIntentGate("jev");
    const first = gate.begin("/ko", "ko")!;
    gate.cancel();
    expect(gate.arrive(first.token, "/ko", "ko")).toBeUndefined();
    const second = gate.begin("/ja", "ja")!;
    expect(second.token).toBeGreaterThan(first.token);
    expect(gate.arrive(first.token, "/ja", "ja")).toBeUndefined();
    expect(gate.arrive(second.token, "/ja", "ja")).toEqual(second);
  });
  it("rejects mismatched or noncanonical intent URLs", () => {
    const gate = createLocaleIntentGate("jev");
    expect(() => gate.begin("/?lang=ko", "ko")).toThrow();
    expect(() => gate.begin("/ko", "ja")).toThrow();
  });
  it("disables all writes until rollout activation and isolates development", () => {
    const writeCookie = vi.fn();
    const environment = { location: { hostname: "jev.naeil.dev", protocol: "https:" }, writeCookie };
    expect(writeLocalePreference("ko", environment)).toBe(false);
    expect(writeCookie).not.toHaveBeenCalled();
    expect(writeLocalePreference("ko", environment, true)).toBe(true);
    expect(writeCookie.mock.calls.map(call => call[0])).toEqual([
      "naeil_locale_v1=; Path=/; Max-Age=0; Secure; SameSite=Lax",
      "naeil_locale_v1=ko; Domain=naeil.dev; Path=/; Max-Age=31536000; Secure; SameSite=Lax",
    ]);
    expect(preferenceCookieWrites("ja", { hostname: "localhost", protocol: "http:" })).toEqual(["naeil_locale_dev_v1=ja; Path=/; Max-Age=31536000; SameSite=Lax"]);
    expect(preferenceCookieWrites("ko", { hostname: "naeil.dev", protocol: "http:" })).toEqual([]);
  });
  it("does not throw or revert URL intent when storage is blocked", () => {
    expect(writeLocalePreference("ja", { location: { hostname: "naeil.dev", protocol: "https:" }, writeCookie: () => { throw new Error("blocked"); } }, true)).toBe(false);
  });
  it("treats duplicates, unsupported, empty and expired cookies as no preference", () => {
    expect(readLocalePreference("other=x; naeil_locale_v1=ko")).toBe("ko");
    for (const cookie of ["naeil_locale_v1=ko; naeil_locale_v1=ko", "naeil_locale_v1=fr", "naeil_locale_v1=", "NEXT_LOCALE=ja", ""]) expect(readLocalePreference(cookie)).toBeUndefined();
    expect(readLocalePreference("naeil_locale_dev_v1=ja", true)).toBe("ja");
  });
  it("uses supported BCP47 bases and terminates legacy hints at T+90 days", () => {
    expect(browserLocaleHint(["fr-FR", "ko-KR"])).toBe("ko");
    expect(browserLocaleHint(["ja_JP", "???"])).toBeUndefined();
    expect(legacyLocaleHint({ activatedAt: 0, now: 89 * 86400000, values: ["fr", "ja"] })).toBe("ja");
    expect(legacyLocaleHint({ activatedAt: 0, now: 90 * 86400000, values: ["ko"] })).toBeUndefined();
    expect(legacyLocaleHint({ activatedAt: undefined, now: 0, values: ["ko"] })).toBeUndefined();
  });
});
