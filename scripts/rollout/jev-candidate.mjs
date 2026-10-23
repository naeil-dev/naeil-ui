/** Run the reviewed Jev behavior suite against release-bound expectations.
 * Historical files remain untouched. Only version/contract/account-reference
 * literals change in a private copied harness; every other assertion is kept.
 */
import assert from 'node:assert/strict';
import { cpSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REVIEWED_FIXTURE_SHA256 = 'f35c241851f35bec1f4d5cbdfceec460a381b9ba20b64cb1c74165a82ba45367';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const prefix = 'import { readFileSync as rolloutRead } from "node:fs";\nconst rolloutRelease = JSON.parse(rolloutRead(process.env.JEV_CANDIDATE_RELEASE, "utf8"));\n';

function replaceExact(source, pattern, count, replacement) {
  assert.equal([...source.matchAll(pattern)].length, count, 'Historical candidate assertion changed; review fixture provenance');
  return source.replace(pattern, replacement);
}

export function parameterizeTests(shared, account) {
  assert(!shared.includes('rolloutRelease') && !account.includes('rolloutRelease'), 'Candidate fixture already parameterized');
  shared = replaceExact(shared, /"0\.7\.1"/g, 2, 'rolloutRelease.version');
  shared = replaceExact(shared, /("data-naeil-ui-contract",\s*)"1"/g, 1, '$1rolloutRelease.contract.version');
  shared = replaceExact(shared, /contractVersion: "1"/g, 1, 'contractVersion: rolloutRelease.contract.version');
  account = replaceExact(account, /"vendor\/naeil-account-0\.7\.1\.json"/g, 1, 'rolloutRelease.account.path');
  account = replaceExact(account, /"158dd3bca9d5c4dd8068cf97d70de1c65d7b187f3057f9388409a7685b447bc5"/g, 1, 'rolloutRelease.account.sha256');
  return { shared: prefix + shared, account: prefix + account };
}

export function fixtureManifest(worktree) {
  const tests = join(worktree, 'tests'); assert(lstatSync(tests).isDirectory() && !lstatSync(tests).isSymbolicLink(), 'Real candidate test directory required');
  const files = {};
  function walk(directory, prefix = '') {
    for (const name of readdirSync(directory).sort()) {
      const path = join(directory, name), stat = lstatSync(path), key = prefix + name;
      assert(!stat.isSymbolicLink(), 'Candidate test symlink refused');
      if (stat.isDirectory()) walk(path, `${key}/`);
      else { assert(stat.isFile() && stat.nlink === 1, 'Regular candidate test required'); files[key] = hash(readFileSync(path)); }
    }
  }
  walk(join(worktree, 'tests'), 'tests/');
  const config = join(worktree, 'playwright.config.ts'); assert(lstatSync(config).isFile() && !lstatSync(config).isSymbolicLink());
  files['playwright.config.ts'] = hash(readFileSync(config));
  return Object.fromEntries(Object.entries(files).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
}

export function assertCandidateHarness(harness) {
  assert.deepEqual(fixtureManifest(harness.directory), { ...harness.receipt.originalFiles, ...harness.receipt.parameterizedFiles }, 'Candidate harness changed during browser gates');
}

export function prepareCandidateHarness(release, worktree, directory, sourceRevision, expectedFixtures = REVIEWED_FIXTURE_SHA256) {
  assert(isAbsolute(worktree) && isAbsolute(directory), 'Absolute candidate paths required');
  assert(/^[a-f0-9]{40}$/.test(sourceRevision) && /^[a-f0-9]{64}$/.test(expectedFixtures), 'Reviewed candidate source pin required');
  const files = fixtureManifest(worktree), fixturesSha256 = hash(JSON.stringify(files));
  assert.equal(fixturesSha256, expectedFixtures, 'Candidate fixture source drift; review before rollout');
  assert(release.account && isAbsolute(release.account.path), 'Independent account reference required');
  const bytes = readFileSync(release.account.path), account = JSON.parse(bytes);
  assert.equal(hash(bytes), release.account.sha256, 'Candidate account reference digest mismatch');
  assert.equal(account.kind, 'independent-account-render'); assert.equal(account.sourceRevision, release.sourceRevision);
  assert.equal(account.archiveSha256, release.archive.sha256); assert.deepEqual(account.ui, { version: release.version, contractVersion: release.contract.version });
  mkdirSync(directory, { mode: 0o700 }); assert.equal(realpathSync(directory), directory, 'Candidate harness symlink escape');
  cpSync(join(worktree, 'tests'), join(directory, 'tests'), { recursive: true, dereference: false, errorOnExist: true, force: false });
  cpSync(join(worktree, 'playwright.config.ts'), join(directory, 'playwright.config.ts'), { errorOnExist: true, force: false });
  assert.deepEqual(fixtureManifest(directory), files, 'Candidate fixture copy changed source');
  const sharedPath = join(directory, 'tests/e2e/shared-chrome.spec.ts'), accountPath = join(directory, 'tests/e2e/account-control.spec.ts');
  const parameterized = parameterizeTests(readFileSync(sharedPath, 'utf8'), readFileSync(accountPath, 'utf8'));
  writeFileSync(sharedPath, parameterized.shared); writeFileSync(accountPath, parameterized.account);
  symlinkSync(join(worktree, 'node_modules'), join(directory, 'node_modules'));
  writeFileSync(join(directory, 'package.json'), '{"private":true,"type":"module"}\n', { mode: 0o600, flag: 'wx' });
  // Copied access tests resolve the Next data route from ./.next/BUILD_ID; use the packaged build's ID.
  const buildId = readFileSync(join(worktree, '.next/standalone/.next/BUILD_ID'), 'utf8').trim(); assert(/^[A-Za-z0-9_-]{1,120}$/.test(buildId), 'Built candidate BUILD_ID required');
  mkdirSync(join(directory, '.next'), { mode: 0o700 }); writeFileSync(join(directory, '.next/BUILD_ID'), buildId + '\n', { mode: 0o600, flag: 'wx' });
  const releasePath = join(directory, 'frozen-release.json'); writeFileSync(releasePath, JSON.stringify(release), { mode: 0o600, flag: 'wx' });
  const receipt = { schemaVersion: 1, sourceRevision, buildId, fixturesSha256, helperSha256: hash(readFileSync(fileURLToPath(import.meta.url))), archiveSha256: release.archive.sha256, referenceSha256: release.contract.sha256, accountReferenceSha256: release.account.sha256, originalFiles: files, parameterizedFiles: { 'tests/e2e/shared-chrome.spec.ts': hash(parameterized.shared), 'tests/e2e/account-control.spec.ts': hash(parameterized.account) } };
  writeFileSync(join(directory, 'harness-receipt.json'), JSON.stringify(receipt, null, 2), { mode: 0o600, flag: 'wx' });
  return { directory, configPath: join(directory, 'playwright.config.ts'), releasePath, receipt };
}
