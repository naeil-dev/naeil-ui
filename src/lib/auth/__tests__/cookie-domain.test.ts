import { describe, it, expect } from "vitest";
import { getCookieDomainFromHost } from "../cookie-domain";

describe("getCookieDomainFromHost", () => {
  it("returns .naeil.dev for naeil.dev", () => {
    expect(getCookieDomainFromHost("naeil.dev")).toBe(".naeil.dev");
  });

  it("returns .naeil.dev for esg.naeil.dev", () => {
    expect(getCookieDomainFromHost("esg.naeil.dev")).toBe(".naeil.dev");
  });

  it("returns .naeil.dev for foo.bar.naeil.dev", () => {
    expect(getCookieDomainFromHost("foo.bar.naeil.dev")).toBe(".naeil.dev");
  });

  it("returns undefined for localhost", () => {
    expect(getCookieDomainFromHost("localhost")).toBeUndefined();
  });

  it("returns undefined for 127.0.0.1", () => {
    expect(getCookieDomainFromHost("127.0.0.1")).toBeUndefined();
  });

  it("returns undefined for null", () => {
    expect(getCookieDomainFromHost(null)).toBeUndefined();
  });

  it("returns undefined for undefined", () => {
    expect(getCookieDomainFromHost(undefined)).toBeUndefined();
  });
});
