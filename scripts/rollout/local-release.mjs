/** Release preparation may contact GitHub; execution validates pinned local bytes. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { assertFrozen, digest } from './rollout.mjs';
import { runtimeIndex, compareRuntime } from './package-runtime.mjs';
import { loadReleaseExpectations } from './release-expectations.mjs';
import { GitHub, materializeRelease } from './release-discovery.mjs';

export function validateLocalRelease({ plan }) {
  const { release } = plan;
  assert(/^0\.7\.(0|[1-9]\d*)$/.test(release.version), 'Local runner supports the reviewed 0.7.x release line');
  assertFrozen(release);
  for (const entry of [release.account, release.siteArchive, ...(release.expectations ? [release.expectations] : [])]) {
    assert(entry && isAbsolute(entry.path || ''), 'Pinned local release asset required');
    assert.equal(digest(readFileSync(entry.path)), entry.sha256, 'Release asset digest mismatch');
  }
  const account = JSON.parse(readFileSync(release.account.path));
  assert.equal(account.kind, 'independent-account-render');
  assert.equal(account.sourceRevision, release.sourceRevision);
  assert.equal(account.archiveSha256, release.archive.sha256);
  assert.deepEqual(account.ui, { version: release.version, contractVersion: release.contract.version });
  assert(account.cases?.length, 'Independent account cases required');
  const frozen = runtimeIndex(readFileSync(release.archive.path));
  assert.equal(frozen.package.version, release.version, 'Package version mismatch');
  const runtime = compareRuntime(frozen, runtimeIndex(readFileSync(release.siteArchive.path)));
  assert.equal(runtime.runtimeSha256, release.siteRuntimeSha256, 'Site runtime mismatch');
  const expectations = loadReleaseExpectations(release);
  return { passed: true, archiveSha256: release.archive.sha256, expectationsSha256: expectations.sha256 };
}

/** Only discovery/materialization uses the network; no approval is created. */
export async function discoverLocalRelease({ version, directory, trustedPublishers, manifestAsset = 'release.json' }, github = new GitHub()) {
  assert(/^0\.7\.(0|[1-9]\d*)$/.test(version), 'Exact supported release version required');
  assert(isAbsolute(directory) && Array.isArray(trustedPublishers) && trustedPublishers.length, 'Private release directory and publishers required');
  const releases = await github.releases();
  const selected = releases.filter(item => item.tag_name === `v${version}` && !item.draft && !item.prerelease);
  assert.equal(selected.length, 1, 'Exactly one published release required');
  const snapshot = await materializeRelease(selected[0], { stateDirectory: directory, trustedPublishers, manifestAsset }, github);
  validateLocalRelease({ plan: { release: snapshot.release } });
  const workflow = await github.workflow(snapshot.release.sourceRevision, '.github/workflows/verify.yml');
  assert.equal(workflow.state, 'success', 'Exact published source CI must pass');
  return { ...snapshot, workflow };
}
