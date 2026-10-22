import { describe, it, expect } from "vitest";
import { isAllowedRedirect } from "../redirect";

describe("isAllowedRedirect", () => {
  it("allows relative path /login", () => {
    expect(isAllowedRedirect("/login")).toBe(true);
  });

  it("allows /sa/reports/123", () => {
    expect(isAllowedRedirect("/sa/reports/123")).toBe(true);
  });

  it("allows https://naeil.dev/x", () => {
    expect(isAllowedRedirect("https://naeil.dev/x")).toBe(true);
  });

  it("allows https://esg.naeil.dev/x", () => {
    expect(isAllowedRedirect("https://esg.naeil.dev/x")).toBe(true);
  });

  it("blocks https://evil.com", () => {
    expect(isAllowedRedirect("https://evil.com")).toBe(false);
  });

  it("blocks javascript: URIs", () => {
    expect(isAllowedRedirect("javascript:alert(1)")).toBe(false);
  });

  it("blocks malformed URLs", () => {
    expect(isAllowedRedirect("ht!tp://bad")).toBe(false);
  });

  it("handles empty string", () => {
    expect(isAllowedRedirect("")).toBe(false);
  });
});

import { canonicalRedirect, redirectCookieTarget } from "../redirect";
describe("canonical return destination", () => {
  it.each([
    "//evil.example",
    "/\\evil.example",
    "/a\\b",
    " /safe",
    "/safe path",
    "/safe\npath",
    "/%2fevil.example",
    "/%2F%2Fevil.example",
    "/%255cevil.example",
    "https://unknown.naeil.dev/",
    "http://naeil.dev/",
    "ftp://naeil.dev/",
    "https://naeil.dev:444/",
    "https://user@naeil.dev/",
    "https://naeil.dev.evil.example/",
    "https://x.jev.naeil.dev/",
    "https://naeil.dev/with%0acontrol",
  ])("rejects %s", (value) => {
    expect(canonicalRedirect(value)).toBeNull();
    expect(isAllowedRedirect(value)).toBe(false);
  });
  it.each([
    "https://naeil.dev/a",
    "https://esg.naeil.dev/a",
    "https://work.naeil.dev/a",
    "https://jev.naeil.dev/a",
    "https://abestimate.naeil.dev/a",
  ])("allows exact canonical service %s", (value) =>
    expect(canonicalRedirect(value)).toBe(value),
  );
  it("returns the parsed safe value and safely decodes a malformed redirect cookie", () => {
    expect(canonicalRedirect("/safe/../reports?x=1")).toBe("/reports?x=1");
    expect(canonicalRedirect("https://NAEIL.dev:443/a")).toBe(
      "https://naeil.dev/a",
    );
    expect(redirectCookieTarget("%E0%A4%A")).toBe("/");
    expect(redirectCookieTarget("%2F%2Fevil.example")).toBe("/");
    expect(redirectCookieTarget("%2Freports")).toBe("/reports");
  });
  it("preserves encoded query data and fragments already decoded by Next cookies", () => {
    const destination = "/ja/blog?q=two%20words%26three%3Dfour#result%20one";
    expect(redirectCookieTarget(destination)).toBe(destination);
    expect(redirectCookieTarget(encodeURIComponent(destination))).toBe(destination);
    expect(canonicalRedirect("/ja/blog?q=100%25#success%25")).toBe("/ja/blog?q=100%25#success%25");
    expect(canonicalRedirect("/ja/blog?q=%25E0%25A4")).toBe("/ja/blog?q=%25E0%25A4");
  });
});
