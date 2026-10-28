import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { validateLocalRelease, discoverLocalRelease } from './local-release.mjs';

test('execution validates all frozen release bytes offline and rejects altered inputs', t => {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'local-release-')));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const tuple = JSON.parse(readFileSync(new URL('./expectations/0.7.1.json', import.meta.url))).release;
  const archivePath = join(directory, 'archive.tgz'), contractPath = join(directory, 'contract.json'), accountPath = join(directory, 'account.json');
  for (const [path, name] of [[archivePath, 'naeil-ui-0.7.1.tgz'], [contractPath, 'naeil-chrome-0.7.1.json'], [accountPath, 'naeil-account-0.7.1.json']]) writeFileSync(path, readFileSync(new URL('../../docs/rollout/frozen/' + name, import.meta.url)), { mode: 0o600 });
  const release = { schemaVersion: 1, releaseId: tuple.releaseId, version: tuple.version, previousVersion: '0.7.0', sourceRevision: tuple.sourceRevision, changes: ['dom', 'api', 'fix'], siteRuntimeSha256: 'e8fde8b4bc67535bd15bc8dc3861f12207c19b1e9851954fadda9d82ca4fefff', archive: { path: archivePath, sha256: tuple.archiveSha256, url: 'https://github.com/naeil-dev/naeil-ui/releases/download/v0.7.1/naeil-ui-0.7.1.tgz' }, contract: { path: contractPath, sha256: tuple.chromeSha256, version: '1' }, account: { path: accountPath, sha256: tuple.accountSha256 } };
  release.siteArchive = release.archive;
  assert.equal(validateLocalRelease({ plan: { release } }).passed, true);
  writeFileSync(accountPath, '{}');
  assert.throws(() => validateLocalRelease({ plan: { release } }), /digest/);
});

test('discovery refuses 0.8.x before network and cannot create approval', async () => {
  let calls = 0;
  await assert.rejects(() => discoverLocalRelease({ version: '0.8.0', directory: '/tmp', trustedPublishers: ['fixture'] }, { releases() { calls++; } }), /supported/);
  assert.equal(calls, 0);
});
