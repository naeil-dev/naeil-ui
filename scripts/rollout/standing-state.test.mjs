import assert from 'node:assert/strict';
import test from 'node:test';
import { chmodSync, linkSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { atomicJSON, hash, JSON_LIMITS, readPrivateJSON } from './rollout-io.mjs';
import { parseStandingJSON, readStandingEvidence, readStandingState } from './standing-state.mjs';
import * as api from './standing-state.mjs';

// Exact bytes produced by the retired writer, before its removal. No encoder is
// kept in production or recreated here; malformed graph cases use small nodes.
const fixtureBytes = readFileSync(new URL('./fixtures/historical-state.json', import.meta.url));
const historical = JSON.parse(fixtureBytes);
const initial = () => ({ schemaVersion: 1, repository: 'synthetic', releases: {} });
const materialize = value => JSON.parse(JSON.stringify(value));
function fixture(t, encoded = true) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'historical-state-'))); chmodSync(root, 0o700);
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'evidence'), { mode: 0o700 });
  if (encoded) {
    writeFileSync(join(root, 'state.json'), historical.root, { mode: 0o600 });
    for (const [name, bytes] of Object.entries(historical.evidence)) writeFileSync(join(root, 'evidence', name), bytes, { mode: 0o600 });
  }
  return root;
}
function node(root, value) {
  const bytes = Buffer.from(JSON.stringify({ schemaVersion: 1, ...value }) + '\n'), sha256 = hash(bytes);
  writeFileSync(join(root, 'evidence', sha256 + '.json'), bytes, { mode: 0o600 });
  return { path: `evidence/${sha256}.json`, sha256, bytes: bytes.length };
}
function setRoot(root, ref) {
  const index = JSON.parse(historical.root); index.state = ref; atomicJSON(join(root, 'state.json'), index);
}
const snapshot = root => Object.fromEntries(['state.json', ...readdirSync(join(root, 'evidence')).map(name => 'evidence/' + name)].map(name => [name, readFileSync(join(root, name))]));

test('golden schema2 catalog/history decodes every binding and native tuple without writing', t => {
  assert.equal(hash(fixtureBytes), '9fe46d77a0477f7cfffaea4cb4c803dd07220f9c792185c64c2ff885b467e668');
  const root = fixture(t), before = snapshot(root), state = readStandingState(root);
  assert.deepEqual(materialize(state), historical.expected);
  assert.equal(state.releases['0'].history.at(-1).attemptId, 'attempt-34');
  assert.equal(state.releases['0'].history[0].attemptId, 'attempt-0');
  assert.throws(() => state.releases['0'].history.push({ attemptId: 'unwritten' }), /read-only/);
  assert.throws(() => { state.releases['0'].history[0].prior.passed = true; }, TypeError);
  assert.deepEqual(snapshot(root), before);
  assert.deepEqual(Object.keys(api).sort(), ['JSON_LIMITS', 'parseStandingJSON', 'readStandingEvidence', 'readStandingState']);
});

test('bounded schema1 reads are explicit and never convert or import on demand', t => {
  const root = fixture(t, false); atomicJSON(join(root, 'state.json'), initial()); const before = snapshot(root);
  assert.throws(() => readStandingState(root), /import/i);
  assert.deepEqual(readStandingState(root, { allowLegacy: true }), initial()); assert.deepEqual(snapshot(root), before);
  writeFileSync(join(root, 'state.json'), Buffer.alloc(JSON_LIMITS.evidence + 1, 32));
  assert.throws(() => readStandingState(root, { allowLegacy: true }), /bounded/);
});

test('unknown encoding, traversal, changed digest/size, duplicate JSON keys and linked state fail closed', t => {
  for (const update of [r => { r.encodingVersion = 99; }, r => { r.state.path = '../escape'; }, r => { r.state.bytes++; }, r => { r.state.sha256 = '0'.repeat(64); }, r => { r.extra = true; }]) {
    const root = fixture(t), value = JSON.parse(historical.root); update(value); atomicJSON(join(root, 'state.json'), value);
    assert.throws(() => readStandingState(root));
  }
  for (const kind of ['duplicate', 'symlink', 'hardlink', 'public']) {
    const root = fixture(t, false), path = join(root, 'state.json');
    if (kind === 'duplicate') writeFileSync(path, '{"schemaVersion":2,"schemaVersion":2}', { mode: 0o600 });
    if (kind === 'symlink') symlinkSync(join(root, 'absent'), path);
    if (kind === 'hardlink') { writeFileSync(join(root, 'other'), historical.root, { mode: 0o600 }); linkSync(join(root, 'other'), path); }
    if (kind === 'public') writeFileSync(path, historical.root, { mode: 0o644 });
    assert.throws(() => readStandingState(root));
  }
});

test('evidence digest/byte limits and missing nodes are checked without changing any byte', t => {
  for (const kind of ['digest', 'length', 'missing', 'symlink', 'overflow']) {
    const root = fixture(t), ref = JSON.parse(historical.root).state, path = join(root, ref.path);
    if (kind === 'digest') writeFileSync(path, Buffer.alloc(ref.bytes, 32));
    if (kind === 'length') writeFileSync(path, historical.evidence[ref.sha256 + '.json'] + ' ');
    if (kind === 'missing') rmSync(path);
    if (kind === 'symlink') { rmSync(path); symlinkSync(join(root, 'outside'), path); }
    if (kind === 'overflow') writeFileSync(path, Buffer.alloc(JSON_LIMITS.evidence + 1, 32));
    const index = readFileSync(join(root, 'state.json')); assert.throws(() => readStandingState(root)); assert.deepEqual(readFileSync(join(root, 'state.json')), index);
  }
});

test('catalogs reject duplicate keys/pages, wrong page types and unknown node shapes', t => {
  for (const kind of ['object-key', 'catalog-key', 'catalog-ref', 'array-type', 'unknown', 'extra']) {
    const root = fixture(t), leaf = node(root, { type: 'json', value: { a: 1 } });
    const other = node(root, { type: 'json', value: { a: 2 } });
    const data = {
      'object-key': { type: 'object', entries: [['a', leaf], ['a', other]] },
      'catalog-key': { type: 'object-pages', pages: [leaf, other] },
      'catalog-ref': { type: 'object-pages', pages: [leaf, leaf] },
      'array-type': { type: 'array-pages', pages: [leaf] },
      unknown: { type: 'unsupported' }, extra: { type: 'json', value: {}, extra: true },
    }[kind];
    assert.throws(() => readStandingEvidence(root, node(root, data)));
  }
});

test('history page count, entry references and sequence validation survive retirement', t => {
  const root = fixture(t), entry = node(root, { type: 'json', value: { attemptId: 'one' } });
  const page = node(root, { type: 'history-page', previous: null, entries: [entry], count: 1 });
  const history = tail => node(root, { type: 'history', tail, count: 2 });
  assert.throws(() => readStandingEvidence(root, history(page)), /count/);
  const broken = node(root, { type: 'history-page', previous: page, entries: [entry], count: 3 });
  const array = readStandingEvidence(root, node(root, { type: 'history', tail: broken, count: 3 }));
  assert.throws(() => [...array], /sequence/);
  assert.throws(() => readStandingEvidence(root, node(root, { type: 'history', tail: null, count: 1 })), /descriptor/);
  const invalid = node(root, { type: 'history-page', previous: null, entries: [{ ...entry, path: '../escape' }], count: 1 });
  assert.throws(() => readStandingEvidence(root, node(root, { type: 'history', tail: invalid, count: 1 })), /reference/);
});

test('parser and graph depth bounds reject hidden duplicate names and excessive nesting', t => {
  for (const text of ['{"a":{"x":1,"x":2}}', '[{"x":1,"x":2}]', '{} trailing', '['.repeat(130) + '0' + ']'.repeat(130)]) assert.throws(() => parseStandingJSON(Buffer.from(text)));
  const root = fixture(t); let ref = node(root, { type: 'json', value: 'leaf' });
  for (let n = 0; n < 127; n++) ref = node(root, { type: 'array', entries: [ref] });
  assert.doesNotThrow(() => readStandingEvidence(root, ref)); ref = node(root, { type: 'array', entries: [ref] });
  assert.throws(() => readStandingEvidence(root, ref), /nesting/);
  const invalid = node(root, { type: 'json', value: initial() });
  const path = join(root, invalid.path), bytes = Buffer.from('{"schemaVersion":1,"type":"json","value":{"schemaVersion":1,"releases":{},"bad":1e999}}');
  writeFileSync(path, bytes); const changed = { path: `evidence/${hash(bytes)}.json`, sha256: hash(bytes), bytes: bytes.length };
  writeFileSync(join(root, changed.path), bytes, { mode: 0o600 }); setRoot(root, changed);
  assert.throws(() => readStandingState(root), /Finite/);
});

test('pending intents, orphan intent and incomplete imports remain explicit read barriers', t => {
  const root = fixture(t), intent = { releaseId: 'synthetic', serviceId: 'jev', kind: 'rollout', attemptId: 'attempt', requestSha256: 'a'.repeat(64) };
  const path = join(root, 'pending-intent.json'); atomicJSON(path, { schemaVersion: 1, intents: [intent] });
  const before = snapshot(root); assert.deepEqual(readStandingState(root).storageIntents.intents, [intent]); assert.deepEqual(snapshot(root), before);
  for (const intents of [[intent, intent], [{ ...intent, kind: 'unknown' }], [{ ...intent, requestSha256: 'bad' }], []]) {
    atomicJSON(path, { schemaVersion: 1, intents }); assert.throws(() => readStandingState(root));
  }
  rmSync(join(root, 'state.json')); assert.throws(() => readStandingState(root), /Orphan/);
  rmSync(path); assert.equal(readStandingState(root), null);
  atomicJSON(join(root, 'import-incomplete.json'), {}); assert.throws(() => readStandingState(root), /incomplete/);
});

test('retained epoch descriptors reject duplicates and unsafe reference paths', t => {
  const root = fixture(t), index = readPrivateJSON(join(root, 'state.json')), epoch = { evidenceRoot: root, inventory: index.state, sourceSha256: 'a'.repeat(64) };
  index.epochs = [epoch, epoch]; atomicJSON(join(root, 'state.json'), index); assert.throws(() => readStandingState(root), /duplicate/);
  index.epochs = [{ ...epoch, inventory: { ...index.state, path: '../escape' } }]; atomicJSON(join(root, 'state.json'), index); assert.throws(() => readStandingState(root), /reference/);
});

test('historical inline state retains the exact readable depth boundary', t => {
 for (const wrap of [value => ({ child: value }), value => [value]]) {
  const root = fixture(t); let nested = 'leaf'; for (let n = 0; n < 126; n++) nested = wrap(nested);
  const accepted = { ...initial(), nested }; setRoot(root, node(root, { type: 'json', value: accepted }));
  assert.deepEqual(materialize(readStandingState(root)), accepted);
  const rejected = { ...initial(), nested: wrap(nested) }; setRoot(root, node(root, { type: 'json', value: rejected }));
  assert.throws(() => readStandingState(root), /nesting/);
 }
});
