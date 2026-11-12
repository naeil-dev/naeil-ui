import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertUnpublished, validateArchive, verifyRegistry } from "../../../../scripts/ci/npm-release.mjs";

describe("frozen npm publication guards", () => {
  let root: string;
  let metadataPath: string;
  let metadata: { version: string; archive: string; sha256: string; sha1: string; integrity: string };
  const result = (status: number | null, value: unknown) => ({ status, stdout: JSON.stringify(value), stderr: "" });
  const options = () => ({ root, version: "1.2.3", sha256: metadata.sha256, distTag: "next" });

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "naeil-npm-release-"));
    const directory = join(root, "docs/releases/1.2.3");
    mkdirSync(directory, { recursive: true });
    mkdirSync(join(root, "package"));
    writeFileSync(join(root, "package/package.json"), JSON.stringify({ name: "@naeil/ui", version: "1.2.3" }));
    const archive = "naeil-ui-1.2.3.tgz";
    execFileSync("tar", ["-czf", join(directory, archive), "-C", root, "package"]);
    const bytes = readFileSync(join(directory, archive));
    const hash = (algorithm: string, encoding: "hex" | "base64" = "hex") => createHash(algorithm).update(bytes).digest(encoding);
    metadata = { version: "1.2.3", archive, sha256: hash("sha256"), sha1: hash("sha1"), integrity: `sha512-${hash("sha512", "base64")}` };
    metadataPath = join(directory, "archive.json");
    writeFileSync(metadataPath, JSON.stringify(metadata));
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));

  it("accepts the retained archive and both approved tags", () => {
    expect(validateArchive(options()).metadata).toEqual(metadata);
    expect(validateArchive({ ...options(), distTag: "latest" }).archivePath).toBe(join(root, "docs/releases/1.2.3", metadata.archive));
  });
  it("validates the actual frozen 0.13.0 archive without repacking", () => {
    const frozen = JSON.parse(readFileSync("docs/releases/0.13.0/archive.json", "utf8"));
    expect(validateArchive({ version: "0.13.0", sha256: frozen.sha256, distTag: "next" }).metadata.integrity).toBe(frozen.integrity);
  });
  it.each(["../1.2.3", "", "v1.2.3", "1.2.3\n", "01.2.3"])("rejects unsafe or nonstable version %j", (version) => {
    expect(() => validateArchive({ ...options(), version })).toThrow(/version/);
  });
  it("rejects unsupported tags and malformed digests", () => {
    expect(() => validateArchive({ ...options(), distTag: "beta" })).toThrow(/tag/);
    expect(() => validateArchive({ ...options(), sha256: "abc" })).toThrow(/SHA-256/);
  });
  it("requires the input and metadata digest to match the actual bytes", () => {
    expect(() => validateArchive({ ...options(), sha256: "0".repeat(64) })).toThrow(/SHA-256/);
    writeFileSync(metadataPath, JSON.stringify({ ...metadata, sha256: "0".repeat(64) }));
    expect(() => validateArchive(options())).toThrow(/SHA-256/);
  });
  it.each(["version", "archive", "sha1", "integrity"])("rejects inconsistent metadata %s before publishing", (key) => {
    writeFileSync(metadataPath, JSON.stringify({ ...metadata, [key]: "wrong" }));
    expect(() => validateArchive(options())).toThrow();
  });
  it.each([{ name: "other", version: "1.2.3" }, { name: "@naeil/ui", version: "1.2.4" }])("rejects mismatched tarball package identity %j", (pkg) => {
    writeFileSync(join(root, "package/package.json"), JSON.stringify(pkg));
    execFileSync("tar", ["-czf", join(root, "docs/releases/1.2.3", metadata.archive), "-C", root, "package"]);
    const bytes = readFileSync(join(root, "docs/releases/1.2.3", metadata.archive));
    metadata.sha256 = createHash("sha256").update(bytes).digest("hex");
    metadata.sha1 = createHash("sha1").update(bytes).digest("hex");
    metadata.integrity = `sha512-${createHash("sha512").update(bytes).digest("base64")}`;
    writeFileSync(metadataPath, JSON.stringify(metadata));
    expect(() => validateArchive(options())).toThrow(/package identity/);
  });
  it("allows only an explicit npm E404 to establish registry absence", () => {
    expect(() => assertUnpublished("1.2.3", () => result(1, { error: { code: "E404" } }))).not.toThrow();
    for (const response of [result(0, "1.2.3"), result(1, { error: { code: "E503" } }), result(null, {}), { status: 1, stdout: "", stderr: "network failure" }]) {
      expect(() => assertUnpublished("1.2.3", () => response)).toThrow();
    }
  });
  it("requires both registry shasum and integrity to match", () => {
    const dist = { shasum: metadata.sha1, integrity: metadata.integrity };
    expect(() => verifyRegistry("1.2.3", metadata, () => result(0, dist))).not.toThrow();
    expect(() => verifyRegistry("1.2.3", metadata, () => result(0, { ...dist, shasum: "wrong" }))).toThrow();
    expect(() => verifyRegistry("1.2.3", metadata, () => result(0, { ...dist, integrity: "wrong" }))).toThrow();
    expect(() => verifyRegistry("1.2.3", metadata, () => result(1, dist))).toThrow();
  });
});
