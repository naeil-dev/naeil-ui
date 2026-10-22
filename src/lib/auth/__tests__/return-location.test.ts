import { describe, expect, it } from "vitest";
import { authLocale, loginDestination, loginErrorLocation } from "../return-location";

describe("login return location", () => {
  it("preserves the localized route, query and fragment across failure/retry", () => {
    const next = "/ja/blog?tag=auth%20test#results";
    expect(loginDestination(next)).toBe(next);
    const retry = loginErrorLocation("https://naeil.dev", next, "ja");
    expect(retry.pathname).toBe("/ja/login");
    expect(retry.searchParams.get("next")).toBe(next);
    expect(retry.searchParams.get("error")).toBe("auth");
  });
  it.each(["/login", "/ko/login?next=/ko", "/auth/callback", "//evil.test", "/%2f%2fevil.test", "https://unknown.naeil.dev"]) (
    "rejects auth loops and unsafe destinations %s", value => expect(loginDestination(value)).toBe("/"),
  );
  it("keeps deliberate exact-host compatibility and rejects invalid locales", () => {
    expect(loginDestination("https://esg.naeil.dev/reports?y=2026#one")).toBe("https://esg.naeil.dev/reports?y=2026#one");
    expect(authLocale("de")).toBe("en");
  });
});
