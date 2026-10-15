# Exact archive digest gate

Changed only `scripts/check-package.ts` and `scripts/check-consumers.ts`: import `createHash` from `node:crypto`; immediately after each existing npm pack compute and print SHA-256 of the actual tarball bytes using existing readFileSync. If `NAEIL_UI_EXPECTED_ARCHIVE_SHA256` is defined, assert `/^[0-9a-f]{64}$/` and exact equality before extraction or consumer installation. Unset env preserves previous behavior. No new helper/API/dependency/packaging flow.

Source addition in each script (the existing consumer tarball variable supplies its path):

```ts
const archiveSha256 = createHash("sha256").update(readFileSync(tarball)).digest("hex");
console.log(`Packed archive SHA-256: ${archiveSha256}`);
const expectedArchiveSha256 = process.env.NAEIL_UI_EXPECTED_ARCHIVE_SHA256;
if (expectedArchiveSha256 !== undefined) {
  assert.match(expectedArchiveSha256, /^[0-9a-f]{64}$/, "NAEIL_UI_EXPECTED_ARCHIVE_SHA256 must be a full lowercase SHA-256 digest");
  assert.equal(archiveSha256, expectedArchiveSha256, "Packed archive SHA-256 does not match the expected candidate");
}
```

Verification:

- RED before implementation: `NAEIL_UI_EXPECTED_ARCHIVE_SHA256=` followed by64zeros, `pnpm check:package:boundary` unexpectedly exited0 (missing rejection reproduced); `archive-digest-red.log` preserves output.
- After implementation same wrong digest exits1 with actual/expected mismatch before extraction; `archive-digest-rejection.log`.
- `NAEIL_UI_EXPECTED_ARCHIVE_SHA256=INVALID pnpm check:package:boundary` exits1 with required-format assertion; `archive-digest-format-rejection.log`.
- Default `pnpm check:package:boundary` exits0, logs digest and passes124file boundary; `archive-default-boundary.log`.
- `pnpm check:types`, scoped ESLint of both scripts and `git diff --check` pass (exit0).

The three post-change packs logged the same temporary current-source SHA256 `4e1482eb0e5ba942384f917aded3e2db6c4ef865e579e185b2273cb026b85e0e`; this is diagnostic identity, not a final frozen-candidate claim. Main will run expected final digest GREEN plus clean consumers after freeze. No consumer install/browser checks, builds, commits, publication or deployment run during this task. Existing earlier consumer-header edits in check-consumers.ts remain intact; this task adds only the digest gate.
