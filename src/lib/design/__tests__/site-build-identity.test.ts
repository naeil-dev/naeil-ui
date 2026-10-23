import { describe, expect, it } from "vitest";
import { resolveSiteSourceRevision } from "../../../../scripts/site-build-identity";

describe("compiled website source identity", () => {
  const source = "a".repeat(40);
  it("binds an explicit reviewed app source even when Git metadata is unavailable", () => {
    expect(resolveSiteSourceRevision({ NAEIL_SOURCE_REVISION: source }, () => "development")).toBe(source);
    expect(resolveSiteSourceRevision({ VERCEL: "1", VERCEL_GIT_COMMIT_SHA: source }, () => "development")).toBe(source);
  });
  it("rejects conflicting deployment provenance and unknown Vercel source", () => {
    expect(() => resolveSiteSourceRevision({ NAEIL_SOURCE_REVISION: source, VERCEL_GIT_COMMIT_SHA: "b".repeat(40) }, () => source)).toThrow(/conflict/);
    expect(() => resolveSiteSourceRevision({ VERCEL: "1" }, () => "development")).toThrow(/source/);
  });
  it("preserves local development while requiring exact explicit source values", () => {
    expect(resolveSiteSourceRevision({}, () => "development")).toBe("development");
    expect(resolveSiteSourceRevision({}, () => source)).toBe(source);
    expect(() => resolveSiteSourceRevision({ NAEIL_SOURCE_REVISION: "main" }, () => source)).toThrow(/revision/);
  });
});
