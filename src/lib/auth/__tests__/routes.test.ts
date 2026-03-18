import { describe, it, expect } from "vitest";
import { isProtectedReportRoute } from "../routes";

describe("isProtectedReportRoute", () => {
  it("matches /sa/reports/123", () => {
    expect(isProtectedReportRoute("/sa/reports/123")).toBe(true);
  });

  it("matches /en/sa/reports/123", () => {
    expect(isProtectedReportRoute("/en/sa/reports/123")).toBe(true);
  });

  it("matches /ko/sa/reports/abc-def", () => {
    expect(isProtectedReportRoute("/ko/sa/reports/abc-def")).toBe(true);
  });

  it("does not match /sa/reports (no ID)", () => {
    expect(isProtectedReportRoute("/sa/reports")).toBe(false);
  });

  it("does not match /sa", () => {
    expect(isProtectedReportRoute("/sa")).toBe(false);
  });

  it("does not match /blog", () => {
    expect(isProtectedReportRoute("/blog")).toBe(false);
  });

  it("does not match /", () => {
    expect(isProtectedReportRoute("/")).toBe(false);
  });
});
