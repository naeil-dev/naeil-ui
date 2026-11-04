import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { assertFrozen, assertReference, digest, releaseFingerprint, verifyIdentity, validateRelease, validateReleaseEvent } from './rollout.mjs';

const sha = 'a'.repeat(64), revision = 'b'.repeat(40);
const release = { schemaVersion: 1, releaseId: 'ui-0.7.2', version: '0.7.2', previousVersion: '0.7.1', sourceRevision: revision, archive: { url: 'https://example.com/naeil-ui-0.7.2.tgz', sha256: sha }, contract: { version: '1', sha256: sha }, changes: ['fix'] };
const artifact = { id: 'artifact-1', sourceRevision: revision, ui: { version: release.version, contractVersion: '1' } };
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'release-validation-')); t.after(() => rmSync(dir, { recursive: true, force: true }));
  const archive = join(dir, 'ui.tgz'), reference = join(dir, 'reference.json'); writeFileSync(archive, 'frozen archive');
  const good = { schemaVersion: 1, kind: 'independent-release-render', frozen: true, archiveSha256: digest('frozen archive'), sourceRevision: revision, ui: artifact.ui };
  const bytes = Buffer.from(JSON.stringify(good)); writeFileSync(reference, bytes);
  return { dir, good, release: { ...release, archive: { ...release.archive, path: archive, sha256: good.archiveSha256 }, contract: { ...release.contract, path: reference, sha256: digest(bytes) } } };
}

test('floating versions and unhashed archives/references are rejected', () => {
  for (const changed of [{ version: 'latest' }, { version: '^0.7.2' }, { sourceRevision: 'main' }, { archive: { ...release.archive, sha256: '' } }, { contract: { ...release.contract, sha256: '' } }, { archive: { ...release.archive, url: 'https://example.com/latest/ui.tgz' } }]) assert.throws(() => validateRelease({ ...release, ...changed }));
});
test('published release event binds exact version tag and reviewed source', () => {
  assert.doesNotThrow(() => validateReleaseEvent(release, { tag: 'v0.7.2', sourceRevision: revision }));
  for (const event of [{ tag: 'v0.7.1', sourceRevision: revision }, { tag: 'v0.7.2', sourceRevision: 'c'.repeat(40) }]) assert.throws(() => validateReleaseEvent(release, event));
});
test('frozen reference binds archive, source, version, contract and provenance even with a valid byte hash', t => {
  const f = fixture(t); assertFrozen(f.release);
  for (const wrong of [{ ...f.good, archiveSha256: sha }, { ...f.good, sourceRevision: 'd'.repeat(40) }, { ...f.good, frozen: false }, { ...f.good, ui: { ...f.good.ui, version: '0.6.0' } }, { ...f.good, ui: { ...f.good.ui, contractVersion: '2' } }]) {
    const bytes = Buffer.from(JSON.stringify(wrong)), candidate = { ...f.release, contract: { ...f.release.contract, sha256: digest(bytes) } };
    assert.throws(() => assertReference(candidate, bytes), /Reference/); writeFileSync(candidate.contract.path, bytes); assert.throws(() => assertFrozen(candidate), /Reference/);
  }
  assert.throws(() => assertReference(f.release, Buffer.from('{}')), /digest/);
  writeFileSync(f.release.archive.path, 'changed'); assert.throws(() => assertFrozen(f.release), /digest/);
});
test('manual deploy verifier rejects an unrelated frozen reference before HTTP/browser work', t => {
  const f = fixture(t), releasePath = join(f.dir, 'release.json'), expected = join(f.dir, 'expected.json'), routes = join(f.dir, 'routes.json');
  const bytes = Buffer.from(JSON.stringify({ ...f.good, archiveSha256: sha })); writeFileSync(f.release.contract.path, bytes);
  writeFileSync(releasePath, JSON.stringify({ ...f.release, contract: { ...f.release.contract, sha256: digest(bytes) } }));
  writeFileSync(expected, JSON.stringify({ schemaVersion: 1, appId: 'example', artifactId: artifact.id, sourceRevision: revision, ui: artifact.ui })); writeFileSync(routes, JSON.stringify([{ path: '/', policy: 'shared', renderState: { access: 'public' } }]));
  assert.throws(() => execFileSync(process.execPath, ['scripts/rollout/verify-deploy.mjs', '--origin', 'http://127.0.0.1:1', '--expected', expected, '--routes', routes, '--release', releasePath, '--reference', f.release.contract.path, '--output', join(f.dir, 'result')], { stdio: 'pipe' }), error => error.status === 1 && error.stderr.toString().includes('Reference archive digest differs'));
  assert(!existsSync(join(f.dir, 'result')));
});
test('public production identity requires every exact field; HTTP 200 alone is insufficient', async t => {
  let body = { schemaVersion: 1, appId: 'wrong', artifactId: artifact.id, sourceRevision: revision, ui: artifact.ui };
  const server = createServer((_request, response) => { response.setHeader('content-type', 'application/json'); response.end(JSON.stringify(body)); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); t.after(() => server.close());
  const origin = `http://127.0.0.1:${server.address().port}`, expected = { appId: 'example', ...artifact };
  await assert.rejects(verifyIdentity(origin, expected), /appId/); body.appId = 'example'; assert.deepEqual(await verifyIdentity(origin, expected), body);
  for (const changed of [{ ...body, internalManifest: '/private/path' }, { ...body, sourceRevision: 'development' }, { ...body, ui: { ...body.ui, contractVersion: '2' } }]) { body = changed; await assert.rejects(verifyIdentity(origin, expected)); body = { schemaVersion: 1, appId: 'example', artifactId: artifact.id, sourceRevision: revision, ui: artifact.ui }; }
});
test('releaseFingerprint golden preserves insertion order and excludes only archive/contract paths', () => {
  const value = { releaseId: 'synthetic', archive: { path: '/epoch/archive', sha256: 'a'.repeat(64) }, contract: { path: '/epoch/reference', sha256: 'b'.repeat(64), version: '1' }, account: { path: '/epoch/account', sha256: 'c'.repeat(64) } };
  assert.equal(releaseFingerprint(value), '0180f9668d1adc48745423a406411a74d73095144fcdc55939ca954e6b918a1e');
  assert.equal(releaseFingerprint({ ...value, archive: { ...value.archive, path: '/other' }, contract: { ...value.contract, path: '/other' } }), releaseFingerprint(value));
  assert.notEqual(releaseFingerprint({ ...value, account: { ...value.account, path: '/other' } }), releaseFingerprint(value));
  assert.notEqual(releaseFingerprint({ archive: value.archive, releaseId: value.releaseId, contract: value.contract, account: value.account }), releaseFingerprint(value));
});
