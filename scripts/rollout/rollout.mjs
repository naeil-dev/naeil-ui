/** Frozen release/reference/public identity validation. No rollout orchestration. */
import { requireHTTP, verificationFetch, verificationBody } from './verification-error.mjs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { isAbsolute } from 'node:path';

const HEX = /^[0-9a-f]{64}$/;
const REVISION = /^[0-9a-f]{40}$/;
const ID = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$/;
const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const fingerprint = value => digest(JSON.stringify(value));
// Runner-local download paths are transport details, not release identity.
const releaseIdentity = release => ({ ...release, archive: { ...release.archive, path: undefined }, contract: { ...release.contract, path: undefined } });
export const releaseFingerprint = release => fingerprint(releaseIdentity(release));
export function validateRelease(release) {
  assert.equal(release.schemaVersion, 1, 'Unsupported release schema');
  assert.match(release.releaseId, ID, 'Invalid release id');
  assert.match(release.version, VERSION, 'Release requires an exact stable version');
  assert.match(release.previousVersion, VERSION, 'Previous version must be exact');
  assert.match(release.sourceRevision, REVISION, 'Full source revision required');
  assert.match(release.archive?.sha256, HEX, 'Frozen archive digest required');
  assert.match(release.contract?.sha256, HEX, 'Frozen reference digest required');
  assert.equal(new URL(release.archive.url).protocol, 'https:', 'Archive URL must use HTTPS');
  assert(!/(?:^|[\/@])latest(?:[/.?#]|$)/i.test(release.archive.url), 'Floating archive URL prohibited');
  assert(typeof release.contract.version === 'string' && release.contract.version, 'Contract version required');
  assert(Array.isArray(release.changes) && release.changes.every(value => ['internal', 'fix', 'docs', 'frame', 'dom', 'guard', 'contract', 'api'].includes(value)), 'Explicit classified change list required');
  return release;
}

export function validateReleaseEvent(release, event) {
  validateRelease(release);
  assert.equal(event.tag, `v${release.version}`, 'Published release tag differs from frozen UI version');
  assert.equal(event.sourceRevision, release.sourceRevision, 'Published release source differs from frozen UI source');
}

export function assertReference(release, referenceBytes) {
  validateRelease(release);
  assert.equal(digest(referenceBytes), release.contract.sha256, 'Reference byte digest mismatch');
  const reference = JSON.parse(referenceBytes.toString('utf8'));
  assert.equal(reference.schemaVersion, 1, 'Reference schema mismatch');
  assert.equal(reference.kind, 'independent-release-render', 'Reference provenance kind mismatch');
  assert.equal(reference.frozen, true, 'Reference must be frozen from clean reviewed source');
  assert.equal(reference.archiveSha256, release.archive.sha256, 'Reference archive digest differs from release');
  assert.equal(reference.sourceRevision, release.sourceRevision, 'Reference source revision differs from release');
  assert.equal(reference.ui?.version, release.version, 'Reference UI version differs from release');
  assert.equal(reference.ui?.contractVersion, release.contract.version, 'Reference contractVersion differs from release');
  if (reference.contract) assert.equal(reference.contract.contractVersion, release.contract.version, 'Reference geometry contractVersion differs from release');
  return reference;
}

export function assertFrozen(release) {
  validateRelease(release);
  for (const [name, entry] of [['archive', release.archive], ['reference', release.contract]]) {
    assert(isAbsolute(entry.path || ''), `Absolute frozen ${name} path required`);
    assert.equal(digest(readFileSync(entry.path)), entry.sha256, `${name} digest mismatch`);
  }
  assertReference(release, readFileSync(release.contract.path));
}

function assertIdentity(actual, expected) {
  assert.deepEqual(Object.keys(actual || {}).sort(), ['appId', 'artifactId', 'schemaVersion', 'sourceRevision', 'ui'], 'Public identity contains missing or extra fields');
  assert.deepEqual(Object.keys(actual.ui || {}).sort(), ['contractVersion', 'version'], 'Public UI identity contains missing or extra fields');
  assert.equal(actual?.schemaVersion, 1, 'Identity schema mismatch');
  assert.match(actual.appId, ID, 'Production appId is invalid'); assert.match(actual.artifactId, ID, 'Production artifactId is invalid');
  assert.match(actual.sourceRevision, REVISION, 'Production sourceRevision must be a full reviewed source hash');
  assert.match(actual.ui.version, VERSION, 'Production UI version must be exact');
  assert.match(actual.ui.contractVersion, /^[1-9]\d*$/, 'Production contractVersion must be explicit');
  for (const key of ['appId', 'artifactId', 'sourceRevision']) assert.equal(actual[key], key === 'artifactId' ? expected.artifactId ?? expected.id : expected[key], `Production ${key} mismatch`);
  for (const key of ['version', 'contractVersion']) assert.equal(actual.ui?.[key], expected.ui?.[key], `Production ui.${key} mismatch`);
}

export async function verifyIdentity(origin, expected) {
  const url = new URL('/.well-known/naeil-ui.json', origin);
  assert(['https:', 'http:'].includes(url.protocol), 'HTTP origin required');
  assert(!url.username && !url.password, 'Public identity origin must not embed credentials');
  if (url.protocol === 'http:') assert(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname), 'Production identity requires HTTPS');
  const response = await verificationFetch(url, { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15000), headers: { 'cache-control': 'no-cache' } });
  requireHTTP(response, 'production-identity');
  assert.match(response.headers.get('content-type') || '', /application\/json/, 'Production identity is not JSON');
  const body = await verificationBody(() => response.text(), 'production-identity'); assert(body.length <= 4096, 'Production identity exceeds public identity size limit');
  const actual = JSON.parse(body); assertIdentity(actual, expected); return actual;
}
