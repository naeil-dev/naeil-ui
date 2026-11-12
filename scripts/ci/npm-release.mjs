import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { setTimeout } from "node:timers/promises";

// Read-only guards. Publishing stays explicit in publish-npm.yml.
export function validateArchive({ version, sha256, distTag, root = "." }) {
  assert(typeof version === "string" && version.trim() === version && /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version), "Expected a stable version such as 0.13.0");
  assert(typeof sha256 === "string" && sha256.length === 64 && /^[a-f0-9]{64}$/.test(sha256), "Expected a lowercase SHA-256 digest");
  assert(["next", "latest"].includes(distTag), "Unsupported dist-tag");
  const directory = resolve(root, "docs/releases", version);
  const archive = `naeil-ui-${version}.tgz`;
  const archivePath = resolve(directory, archive);
  const metadata = JSON.parse(readFileSync(resolve(directory, "archive.json"), "utf8"));
  assert.equal(metadata.version, version, "Metadata version mismatch");
  assert.equal(metadata.archive, archive, "Metadata archive mismatch");
  const bytes = readFileSync(archivePath);
  const hash = (algorithm, encoding = "hex") => createHash(algorithm).update(bytes).digest(encoding);
  assert.equal(hash("sha256"), sha256, "Input SHA-256 mismatch");
  assert.equal(metadata.sha256, sha256, "Metadata SHA-256 mismatch");
  assert.equal(metadata.sha1, hash("sha1"), "Metadata SHA-1 mismatch");
  assert.equal(metadata.integrity, `sha512-${hash("sha512", "base64")}`, "Metadata integrity mismatch");
  const pkg = JSON.parse(execFileSync("tar", ["-xOzf", archivePath, "package/package.json"], { encoding: "utf8" }));
  assert(pkg.name === "@naeil/ui" && pkg.version === version, "Tarball package identity mismatch");
  return { archivePath, metadata };
}

/** @type {(args: string[]) => {status: number | null, stdout: string, stderr: string}} */
const npm = (args) => spawnSync("npm", args, { encoding: "utf8", timeout: 120_000 });
const registryArgs = (version, field) => ["view", `@naeil/ui@${version}`, field, "--json", "--registry", "https://registry.npmjs.org"];

export function assertUnpublished(version, run = npm) {
  const response = run(registryArgs(version, "version"));
  assert(response.status !== 0, "Version already exists on npm; inspect its identity instead of republishing");
  // Network/auth/CLI failures must never be mistaken for an unpublished version.
  let code;
  try { code = JSON.parse(response.stdout).error?.code; } catch { /* Fail closed below. */ }
  assert(Number.isInteger(response.status) && response.status > 0 && code === "E404", "Registry absence not established by npm E404; stop");
}

export function verifyRegistry(version, metadata, run = npm) {
  const response = run(registryArgs(version, "dist"));
  assert.equal(response.status, 0, "Registry verification request failed");
  const dist = JSON.parse(response.stdout);
  assert.equal(dist.shasum, metadata.sha1, "Registry shasum mismatch");
  assert.equal(dist.integrity, metadata.integrity, "Registry integrity mismatch");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const version = process.env.RELEASE_VERSION;
  const { archivePath, metadata } = validateArchive({ version, sha256: process.env.RELEASE_SHA256, distTag: process.env.RELEASE_DIST_TAG });
  const mode = process.argv[2];
  if (mode === "check") {
    assertUnpublished(version);
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `archive_path=${archivePath}\n`);
    console.log(`Verified frozen @naeil/ui@${version}; version absent from npm`);
  } else if (mode === "verify") {
    // Read retries tolerate registry propagation; never retry the publish itself.
    for (let attempt = 0; ; attempt++) {
      try { verifyRegistry(version, metadata); break; } catch (error) {
        if (attempt === 5) throw error;
        await setTimeout(5_000);
      }
    }
    console.log(`Registry identity matches frozen @naeil/ui@${version}`);
  } else {
    throw new Error("Expected check or verify");
  }
}
