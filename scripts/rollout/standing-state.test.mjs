import assert from 'node:assert/strict';
import test from 'node:test';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { atomicJSON, hash, readPrivateJSON } from './standing-config.mjs';
import { assertEvidencePath, importLegacyState, JSON_LIMITS, readStandingState, writeStandingState } from './standing-state.mjs';

function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'standing-state-'))); chmodSync(root, 0o700);
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const old = join(root, 'old'), destination = join(root, 'new'); mkdirSync(old, { mode: 0o700 });
  return { root, old, destination };
}
const initial = () => ({ schemaVersion: 1, repository: 'naeil-dev/naeil-ui', releases: {} });
const materialize = value => JSON.parse(JSON.stringify(value));

test('2,926,952-byte offline snapshot preserves every binding and attempt with bounded index and exact inventory', t => {
  const f = fixture(t), output = join(f.old, 'receipt.json'); atomicJSON(output, { schemaVersion: 1, old: true });
  const state = initial(); state.releases['1'] = { binding: 'original-binding', services: { naeil: { request: { referencePath: output }, result: { original: true }, reverifications: Array.from({ length: 3000 }, (_, i) => ({ request: { attemptId: `old-${i}`, outputDirectory: f.old }, production: { binding: `binding-${i}`, padding: 'p'.repeat(650) } })) } }, history: [{ prior: { attemptId: 'first' } }] };
  const base = JSON.stringify(state); state.padding = 'x'.repeat(2926952 - Buffer.byteLength(base) - 13);
  const bytes = Buffer.from(JSON.stringify(state)); assert.equal(bytes.length, 2926952);
  const sourcePath = join(f.root, 'legacy.json'); writeFileSync(sourcePath, bytes, { mode: 0o600 });
  assert.throws(() => readPrivateJSON(sourcePath));
  const manifest = importLegacyState({ sourcePath, expectedSha256: hash(bytes), destination: f.destination, epochId: 'synthetic-epoch', evidenceRoot: f.old });
  assert.equal(manifest.oldSha256, hash(bytes)); assert.equal(hash(readFileSync(sourcePath)), manifest.oldSha256);
  assert.equal(hash(readFileSync(join(f.destination, 'state.json'))), manifest.newIndexSha256);
  assert(readFileSync(join(f.destination, 'state.json')).length <= JSON_LIMITS.controlIndex);
  t.diagnostic(`synthetic source=${bytes.length} bytes; v2 root=${readFileSync(join(f.destination, 'state.json')).length} bytes; immutable files=${readdirSync(join(f.destination, 'evidence')).length}`);
  assert.deepEqual(materialize(readStandingState(f.destination)), state);
  assert.equal(assertEvidencePath({ stateDirectory: f.destination }, output), output);
  const outside = join(f.old, 'unlisted.json'); atomicJSON(outside, {});
  assert.throws(() => assertEvidencePath({ stateDirectory: f.destination }, outside));
  atomicJSON(output, { changed: true }); assert.throws(() => assertEvidencePath({ stateDirectory: f.destination }, output));
});

test('offline import rejects wrong hash, overflow, symlinks, nonempty destination, traversal and missing evidence', t => {
  for (const kind of ['hash', 'overflow', 'symlink', 'nonempty', 'escape', 'missing']) {
    const f = fixture(t), sourcePath = join(f.root, 'legacy.json'), state = initial();
    if (kind === 'escape') state.referencePath = join(f.old, '..', 'outside.json');
    if (kind === 'missing') state.referencePath = join(f.old, 'absent.json');
    const bytes = Buffer.from(kind === 'overflow' ? ' '.repeat(16777217) : JSON.stringify(state));
    writeFileSync(sourcePath, bytes, { mode: 0o600 });
    let input = sourcePath;
    if (kind === 'symlink') { input = join(f.root, 'link'); symlinkSync(sourcePath, input); }
    if (kind === 'nonempty') { mkdirSync(f.destination, { mode: 0o700 }); atomicJSON(join(f.destination, 'occupied.json'), {}); }
    assert.throws(() => importLegacyState({ sourcePath: input, expectedSha256: kind === 'hash' ? '0'.repeat(64) : hash(bytes), destination: f.destination, epochId: 'epoch', evidenceRoot: f.old }));
    assert(!existsSync(join(f.destination, 'state.json')));
  }
});

test('ordinary reads never import v1; explicit bounded legacy read is read-only', t => {
  const f = fixture(t); mkdirSync(f.destination, { mode: 0o700 }); atomicJSON(join(f.destination, 'state.json'), initial());
  const before = readFileSync(join(f.destination, 'state.json'));
  assert.throws(() => readStandingState(f.destination), /import/i);
  assert.deepEqual(readStandingState(f.destination, { allowLegacy: true }), initial());
  assert.deepEqual(readFileSync(join(f.destination, 'state.json')), before);
});

test('repetitive history and release catalogs grow in pages while root remains bounded and latest remains available', t => {
  const f = fixture(t); mkdirSync(f.destination, { mode: 0o700 });
  const state = initial(); state.releases['1'] = { history: [], services: { naeil: { reverifications: [] } } };
  for (let n = 0; n < 100; n++) {
    state.releases['1'].history.push({ attemptId: `attempt-${n}`, payload: 'p'.repeat(10000) });
    state.releases['1'].services.naeil.reverifications.push({ request: { attemptId: `verify-${n}` }, production: { passed: true } });
  }
  for (let n = 2; n < 1100; n++) state.releases[String(n)] = { binding: `binding-${n}`, history: [{ old: true }] };
  writeStandingState(f.destination, state);
  let loaded = readStandingState(f.destination);
  assert.equal(loaded.releases['1'].services.naeil.reverifications.at(-1).request.attemptId, 'verify-99');
  loaded.releases['1'].history.push({ attemptId: 'new' }); writeStandingState(f.destination, loaded);
  assert.deepEqual(materialize(readStandingState(f.destination)).releases['1'].history, [...state.releases['1'].history, { attemptId: 'new' }]);
  assert(readFileSync(join(f.destination, 'state.json')).length < 262144);
  for (const name of readdirSync(join(f.destination, 'evidence'))) assert(readFileSync(join(f.destination, 'evidence', name)).length <= 2097152);
});

test('unknown encodings, duplicate JSON keys, unsafe refs, changed evidence fail closed', t => {
  const f = fixture(t); mkdirSync(f.destination, { mode: 0o700 }); writeStandingState(f.destination, initial());
  const path = join(f.destination, 'state.json'), root = readPrivateJSON(path);
  for (const update of [r => { r.encodingVersion = 99; }, r => { r.state.path = '../escape'; }, r => { r.state.bytes++; }, r => { r.state.sha256 = '0'.repeat(64); }]) {
    const changed = structuredClone(root); update(changed); atomicJSON(path, changed); assert.throws(() => readStandingState(f.destination));
  }
  writeFileSync(path, '{"schemaVersion":2,"schemaVersion":2}', { mode: 0o600 }); assert.throws(() => readStandingState(f.destination), /duplicate/i);
});

test('STOP is observable independently of disabled or expired authorization', async t => {
  const { readOperatorStatus } = await import('./standing-state.mjs');
  const f = fixture(t); mkdirSync(f.destination, { mode: 0o700 });
  const stopFile = join(f.root, 'STOP'); writeFileSync(stopFile, 'STOP', { mode: 0o600 });
  for (const enabled of [true, false]) {
    const status = readOperatorStatus({ stateDirectory: f.destination, enabled, policy: { enabled, expiresAt: '2000-01-01', stopFile } });
    assert.equal(status.intent, 'stopped'); assert.equal(status.stopActive, true); assert.equal(status.stateError, 'state-missing');
    assert.equal(status.authorizationState, enabled ? 'authorization-expired' : 'disabled');
  }
});

test('unrepresentable JSON values are rejected without publishing a root', t => {
  for (const value of [undefined, NaN, Infinity, new Date(), () => {}, new Map(), { toJSON: () => 'hidden' }]) {
    const f = fixture(t); mkdirSync(f.destination, { mode: 0o700 });
    assert.throws(() => writeStandingState(f.destination, { ...initial(), unsafe: value }));
    assert(!existsSync(join(f.destination, 'state.json')));
  }
});

test('immutable historical pages are reused without hydrating old attempts on subsequent writes', t => {
  const f = fixture(t); mkdirSync(f.destination, { mode: 0o700 });
  const state = initial(); state.releases['1'] = { history: Array.from({ length: 100 }, (_, n) => ({ attemptId: String(n), padding: 'p'.repeat(2000) })) };
  writeStandingState(f.destination, state); const loaded = readStandingState(f.destination);
  const before = new Map(readdirSync(join(f.destination, 'evidence')).map(name => [name, readFileSync(join(f.destination, 'evidence', name))]));
  loaded.releases['1'].history.push({ attemptId: 'new' }); writeStandingState(f.destination, loaded);
  for (const [name, bytes] of before) assert.deepEqual(readFileSync(join(f.destination, 'evidence', name)), bytes);
  assert.equal(loaded.releases['1'].history.at(-1).attemptId, 'new');
});

test('dangling state symlinks and evidence with an old mismatched digest fail closed', t => {
  const f = fixture(t); mkdirSync(f.destination, { mode: 0o700 }); symlinkSync(join(f.root, 'absent'), join(f.destination, 'state.json'));
  assert.throws(() => readStandingState(f.destination)); assert.throws(() => writeStandingState(f.destination, initial()));
  const receipt = join(f.old, 'receipt.json'); atomicJSON(receipt, { changed: true });
  const sourcePath = join(f.root, 'source.json'), state = { ...initial(), reference: { path: receipt, sha256: '0'.repeat(64) } };
  const bytes = Buffer.from(JSON.stringify(state)); writeFileSync(sourcePath, bytes, { mode: 0o600 });
  assert.throws(() => importLegacyState({ sourcePath, expectedSha256: hash(bytes), destination: join(f.root, 'import'), epochId: 'epoch', evidenceRoot: f.old }));
});
