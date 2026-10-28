import assert from 'node:assert/strict';
import test from 'node:test';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, readdirSync, rmSync, symlinkSync, truncateSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { atomicJSON, fileReference, hash, readPrivateJSON } from './standing-config.mjs';
import { assertEvidencePath, importLegacyState, JSON_LIMITS, readStandingEvidence, readStandingState, writeStandingEvidence, writeStandingState } from './standing-state.mjs';
import * as stateAPI from './standing-state.mjs';

function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'standing-state-'))); chmodSync(root, 0o700);
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const old = join(root, 'old'), destination = join(root, 'new'); mkdirSync(old, { mode: 0o700 });
  return { root, old, destination };
}
const initial = () => ({ schemaVersion: 1, repository: 'naeil-dev/naeil-ui', releases: {} });
const materialize = value => JSON.parse(JSON.stringify(value));

test('schema2 epoch inventory admits every dispatcher receipt family without collecting unrelated files',async t=>{
  for(const name of ['runs/2/receipt.json','runs/2/naeil/attempt/input.json','runs/2/naeil/reverify-attempt/invocation/output.json','runs/2/naeil/attempt/verification/command/input.json','runs/2/naeil/attempt/verification/render-verification.json','prerequisites/naeil-'+ 'a'.repeat(64)+'.json',...['archive.tgz','siteArchive.tgz','contract.json','account.json','expectations.json','snapshot.json'].map(name=>'releases/2/'+name)])await t.test(name,st=>{
    const f=fixture(st),path=join(f.old,name);mkdirSync(join(path,'..'),{recursive:true,mode:0o700});atomicJSON(path,{synthetic:true});
    const ref=fileReference(path),state=initial();state.receipt=name.startsWith('releases/')?{path,sha256:ref.sha256,url:'https://synthetic.invalid/asset'}:ref;
    writeFileSync(join(f.old,'unreferenced.json'),'unreferenced',{mode:0o644});
    writeStandingState(f.old,state);
    assert.deepEqual(stateAPI.standingEpochInventory(f.old).receipts,[ref]);
  });
});

test('schema2 epoch inventory rejects unknown families, escapes and mismatched pinned digest or byte count',async t=>{
  for(const cause of ['unknown','release-id','release-name','run-service','run-name','monitor','digest','length','escape'])await t.test(cause,st=>{
    const f=fixture(st),names={unknown:'other/input.json','release-id':'releases/not-a-number/archive.tgz','release-name':'releases/2/other.tgz','run-service':'runs/2/unknown/attempt/input.json','run-name':'runs/2/naeil/attempt/other.json',monitor:'monitor-history/'+ 'a'.repeat(64)+'.json'};
    const path=join(f.old,names[cause]||'runs/2/naeil/attempt/input.json');mkdirSync(join(path,'..'),{recursive:true,mode:0o700});atomicJSON(path,{synthetic:true});
    const ref=fileReference(path),state=initial();
    if(cause==='digest')ref.sha256='0'.repeat(64);if(cause==='length')ref.bytes++;if(cause==='escape')ref.path=f.old+'/runs/2/naeil/attempt/../../../../outside.json';
    state.receipt=ref;writeStandingState(f.old,state);
    assert.throws(()=>stateAPI.standingEpochInventory(f.old),/Epoch receipt|digest|byte count|Canonical|escape/i);
  });
});

test('schema2 release archives permit exactly 64MiB while JSON receipts retain the 2MiB bound',t=>{
  const f=fixture(t),path=join(f.old,'releases/2/archive.tgz');mkdirSync(join(path,'..'),{recursive:true,mode:0o700});writeFileSync(path,'x',{mode:0o600});
  truncateSync(path,64*1024*1024);
  const ref=fileReference(path,64*1024*1024),state=initial();state.receipt={path,sha256:ref.sha256};writeStandingState(f.old,state);
  assert.deepEqual(stateAPI.standingEpochInventory(f.old).receipts,[ref]);
  truncateSync(path,64*1024*1024+1);assert.throws(()=>stateAPI.standingEpochInventory(f.old),/bounded/i);
  const json=join(f.old,'releases/2/contract.json');writeFileSync(json,Buffer.alloc(JSON_LIMITS.evidence+1),{mode:0o600});state.receipt={path:json,sha256:hash(readFileSync(json))};writeStandingState(f.old,state);
  assert.throws(()=>stateAPI.standingEpochInventory(f.old),/bounded/i);
});

test('completed imports are validated and reused without conversion; conflicting roots retain all evidence', t => {
  const f = fixture(t), sourcePath = join(f.root, 'legacy.json'), output = join(f.old, 'output.json');
  atomicJSON(output, { state: 'gate-failed' }); const state = initial(); state.releases['2'] = { services: { estimate: { request: { outputDirectory: f.old } } } };
  atomicJSON(sourcePath, state);
  const input = { sourcePath, expectedSha256: hash(readFileSync(sourcePath)), destination: f.destination, epochId: 'exact-epoch', evidenceRoot: f.old };
  const manifest = importLegacyState(input), before = readdirSync(join(f.destination, 'evidence'));
  assert.deepEqual(stateAPI.validateCompletedImport(input), manifest);
  assert.deepEqual(readdirSync(join(f.destination, 'evidence')), before);
  atomicJSON(output, { state: 'changed' }); assert.throws(() => stateAPI.validateCompletedImport(input), /digest|bytes|size/i);
  assert.deepEqual(readdirSync(join(f.destination, 'evidence')), before);
});

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


test('offline import preserves native artifact tuples without reading or inventorying their binary paths', t => {
  const f = fixture(t), reference = join(f.old, 'chrome.json'); atomicJSON(reference, { schemaVersion: 1, frozen: true });
  // Missing external binaries and a non-private in-root binary prove that
  // artifact data is preserved without attempting any file read.
  const external = id => ({ id: `${id}-artifact`, sourceRevision: 'a'.repeat(40), path: join(f.root, `${id}-native`, 'artifact.tar'), sha256: 'b'.repeat(64), ui: { version: '0.7.2', contractVersion: '1' } });
  const internal = { ...external('estimate-old'), path: join(f.old, 'native-binary.tar') };
  writeFileSync(internal.path, Buffer.alloc(2097153), { mode: 0o644 });
  const estimate = external('estimate'), jev = external('jev');
  const state = initial(); state.releases['2'] = {
    binding: 'unchanged-original-binding',
    services: {
      estimate: { request: { referencePath: reference }, result: { artifact: estimate }, reverifications: [{ request: { artifact: estimate, referencePath: reference }, production: { passed: true } }] },
      jev: { result: { artifact: jev } },
    },
    history: [{ serviceId: 'estimate', prior: { result: { artifact: internal } }, result: { artifact: internal } }],
  };
  const sourcePath = join(f.root, 'legacy.json'), bytes = Buffer.from(JSON.stringify(state)); writeFileSync(sourcePath, bytes, { mode: 0o600 });
  importLegacyState({ sourcePath, expectedSha256: hash(bytes), destination: f.destination, epochId: 'native-artifacts', evidenceRoot: f.old });
  assert.deepEqual(materialize(readStandingState(f.destination)), state);
  assert.deepEqual(readFileSync(join(f.destination, 'legacy-source.json')), bytes);
  assert.equal(assertEvidencePath({ stateDirectory: f.destination }, reference), reference);
  for (const path of [estimate.path, jev.path, internal.path]) assert.throws(() => assertEvidencePath({ stateDirectory: f.destination }, path));
  const index = readPrivateJSON(join(f.destination, 'state.json')), inventory = readStandingEvidence(f.destination, index.legacy.inventory);
  assert.deepEqual(inventory.files.map(file => file.path), ['chrome.json']);
});

test('state depth boundary accepts readable nodes and rejects deeper saves before changing the prior root', t => {
  for (const wrap of [value => ({ child: value }), value => [value]]) {
    const f = fixture(t); mkdirSync(f.destination, { mode: 0o700 }); writeStandingState(f.destination, initial());
    let nested = 'leaf'; for (let n = 0; n < 126; n++) nested = wrap(nested);
    const accepted = { ...initial(), nested }; writeStandingState(f.destination, accepted);
    assert.deepEqual(materialize(readStandingState(f.destination)), accepted);
    const path = join(f.destination, 'state.json'), before = readFileSync(path), files = readdirSync(join(f.destination, 'evidence'));
    assert.throws(() => writeStandingState(f.destination, { ...initial(), nested: wrap(nested) }), error => /JSON nesting exceeds bound/.test(error.cause?.message));
    assert.deepEqual(readFileSync(path), before); assert.deepEqual(readdirSync(join(f.destination, 'evidence')), files);
    assert.deepEqual(materialize(readStandingState(f.destination)), accepted);
  }
});

test('immutable evidence depth boundary accepts readable nodes and rejects deeper values without writes', t => {
  for (const wrap of [value => ({ child: value }), value => [value]]) {
    const f = fixture(t); mkdirSync(f.destination, { mode: 0o700 }); writeStandingState(f.destination, initial());
    let accepted = 'leaf'; for (let n = 0; n < 127; n++) accepted = wrap(accepted);
    const reference = writeStandingEvidence(f.destination, accepted);
    assert.deepEqual(readStandingEvidence(f.destination, reference), accepted);
    const path = join(f.destination, 'state.json'), before = readFileSync(path), files = readdirSync(join(f.destination, 'evidence'));
    assert.throws(() => writeStandingEvidence(f.destination, wrap(accepted)), error => /JSON nesting exceeds bound/.test(error.cause?.message));
    assert.deepEqual(readFileSync(path), before); assert.deepEqual(readdirSync(join(f.destination, 'evidence')), files);
    assert.deepEqual(readStandingEvidence(f.destination, reference), accepted);
  }
});

test('generation-bound epoch refuses stale and unfenced writers before any evidence or root changes',t=>{
 const f=fixture(t);mkdirSync(f.destination,{mode:0o700});const state=initial();writeStandingState(f.destination,state);
 atomicJSON(join(f.destination,'generation-binding.json'),{schemaVersion:1,controlDirectory:join(f.root,'control'),generationSha256:'a'.repeat(64),epochId:'initial'});
 const before=readFileSync(join(f.destination,'state.json')),files=readdirSync(join(f.destination,'evidence'));state.lastState='changed';
 for(const config of [undefined,{stateDirectory:f.destination,generationSha256:'b'.repeat(64),generationFence:{controlDirectory:join(f.root,'control'),pointerSha256:'c'.repeat(64)}}])assert.throws(()=>writeStandingState(f.destination,state,config),/storage/i);
 assert.deepEqual(readFileSync(join(f.destination,'state.json')),before);assert.deepEqual(readdirSync(join(f.destination,'evidence')),files);
});
