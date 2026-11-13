import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertUnpublished, validateArchive, verifyRegistry, verifyRegistryWithRetry } from "../../../../scripts/ci/npm-release.mjs";

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

  describe("post-publication propagation", () => {
    beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); });
    afterEach(() => { vi.useRealTimers(); });
    const wait = async (milliseconds: number) => { vi.setSystemTime(Date.now() + milliseconds); };

    it("accepts matching metadata that appears after the former 25-second window", async () => {
      const start = Date.now();
      const run = () => Date.now() - start < 90_000
        ? result(1, { error: { code: "E404" } })
        : result(0, { shasum: metadata.sha1, integrity: metadata.integrity });
      await verifyRegistryWithRetry("1.2.3", metadata, { run, wait });
      expect(Date.now() - start).toBe(90_000);
    });
    it("retries failed requests as well as missing versions", async () => {
      const responses = [result(null, {}), result(1, { error: { code: "E503" } }), result(0, { shasum: metadata.sha1, integrity: metadata.integrity })];
      const start = Date.now();
      await verifyRegistryWithRetry("1.2.3", metadata, { run: () => responses.shift()!, wait });
      expect(Date.now() - start).toBe(30_000);
    });
    it.each(["shasum", "integrity"])("fails immediately on a present version's %s mismatch, even after a request failure", async (field) => {
      let reads = 0;
      const run = () => ++reads === 1 ? result(1, {}) : result(0, { shasum: metadata.sha1, integrity: metadata.integrity, [field]: "wrong" });
      const start = Date.now();
      await expect(verifyRegistryWithRetry("1.2.3", metadata, { run, wait })).rejects.toThrow(new RegExp(`Registry ${field} mismatch`));
      expect(reads).toBe(2);
      expect(Date.now() - start).toBe(15_000);
    });
    it.each(["{}", "null", "not JSON"])("does not retry malformed or incomplete successful metadata: %s", async (stdout) => {
      let waited = false;
      await expect(verifyRegistryWithRetry("1.2.3", metadata, {
        run: () => ({ status: 0, stdout, stderr: "" }),
        wait: async () => { waited = true; },
      })).rejects.toThrow();
      expect(waited).toBe(false);
    });
    it("stops after 40 unsuccessful reads spaced 15 seconds apart", async () => {
      let reads = 0;
      const start = Date.now();
      await expect(verifyRegistryWithRetry("1.2.3", metadata, { run: () => { reads++; return result(1, {}); }, wait })).rejects.toThrow(/Registry verification request failed/);
      expect(reads).toBe(40);
      expect(Date.now() - start).toBe(39 * 15_000);
    });
    it("bounds slow requests by the remaining ten-minute budget", async () => {
      const start = Date.now();
      const timeouts: number[] = [];
      const run = (_args: string[], timeout = 0) => {
        timeouts.push(timeout);
        vi.setSystemTime(Date.now() + timeout);
        return result(null, {});
      };
      await expect(verifyRegistryWithRetry("1.2.3", metadata, { run, wait })).rejects.toThrow(/Registry verification request failed/);
      expect(Date.now() - start).toBe(600_000);
      expect(timeouts).toEqual([120_000, 120_000, 120_000, 120_000, 60_000]);
    });
  });
});
