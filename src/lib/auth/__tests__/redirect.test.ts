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
