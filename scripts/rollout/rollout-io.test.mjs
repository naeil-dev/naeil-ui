import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { atomicJSON, acquireControlLock, fileReference, fingerprint, generationDigest, JSON_LIMITS, readExactReference, readPrivateBytes, readPrivateJSON, releaseIdentityDigest } from './rollout-io.mjs';

test('IF1 oversized acquisition refuses before creating ownership and retained acquisition cannot be stolen', async t => {
 const root=realpathSync(mkdtempSync(join(tmpdir(),'standing-acquisition-')));fs.chmodSync(root,0o700);t.after(()=>rmSync(root,{recursive:true,force:true}));
 assert.throws(()=>acquireControlLock(root,{kind:'synthetic-unvalidated',bytes:'x'.repeat(JSON_LIMITS.controlIndex)}),/limit/);assert.deepEqual(fs.readdirSync(root),[]);
 const acquisition={kind:'synthetic-unvalidated',planSha256:'a'.repeat(64),approvalSha256:'b'.repeat(64)},lease=acquireControlLock(root,acquisition);
 const path=join(root,'control.lock'),before=readFileSync(path);assert.deepEqual(readPrivateJSON(path).acquisition,acquisition);lease.retain();
 assert.throws(()=>acquireControlLock(root),/EEXIST/);assert.deepEqual(readFileSync(path),before);
});

test('all JSON budgets accept exact boundary and reject limit+1 before replacement', async t => {
 const directory = realpathSync(mkdtempSync(join(tmpdir(), 'standing-budgets-')));
 t.after(() => rmSync(directory, { recursive: true, force: true }));
 for (const [kind, limit] of Object.entries(JSON_LIMITS)) {
  const path = join(directory, kind + '.json'), overhead = Buffer.byteLength(JSON.stringify({ value: '' }, null, 2) + '\n');
  const value = { value: 'x'.repeat(limit - overhead) }; atomicJSON(path, value, limit);
  assert.equal(readFileSync(path).length, limit); assert.deepEqual(readPrivateJSON(path, limit), value);
  const before = readFileSync(path); assert.throws(() => atomicJSON(path, { value: value.value + 'x' }, limit), /bound|limit|large/i);
  assert.deepEqual(readFileSync(path), before);
 }
});

test('published release identity ignores only known runner-local asset paths and retains optional public metadata',()=>{
 const release={releaseId:'synthetic',version:'0.7.2',sourceRevision:'a'.repeat(40),archive:{path:'/epoch1/archive.tgz',sha256:'b'.repeat(64),url:'https://example.test/archive'},contract:{path:'/epoch1/contract.json',version:'1',sha256:'c'.repeat(64)},account:{path:'/epoch1/account.json',sha256:'d'.repeat(64)},siteArchive:{path:'/epoch1/site.tgz',sha256:'e'.repeat(64)},expectations:{path:'/epoch1/expectations.json',sha256:'f'.repeat(64),url:'https://example.test/expectations'},publicAssets:[{name:'optional',path:'/public/logo.png',sha256:'1'.repeat(64)}]};
 const relocated=structuredClone(release);for(const kind of ['archive','contract','account','siteArchive','expectations'])relocated[kind].path=relocated[kind].path.replace('/epoch1/','/epoch2/');
 assert.equal(releaseIdentityDigest(relocated),releaseIdentityDigest(release));
 for(const change of [value=>{value.archive.url+='changed';},value=>{value.siteArchive.sha256='0'.repeat(64);},value=>{value.expectations.sha256='0'.repeat(64);},value=>{value.publicAssets[0].path='/public/other.png';},value=>{value.publicAssets.push({name:'new'});},value=>{value.sourceRevision='0'.repeat(40);}]){const changed=structuredClone(release);change(changed);assert.notEqual(releaseIdentityDigest(changed),releaseIdentityDigest(release));}
});


test('insertion-order fingerprint and historical generationDigest retain golden bytes/field ordering', () => {
  assert.equal(fingerprint({ z: 1, a: 2 }), 'c5c2b1fdd0d4a83cda3ff79c9c74f2c72e2a92920afda20bcafc90c1a72f86a9');
  assert.notEqual(fingerprint({ z: 1, a: 2 }), fingerprint({ a: 2, z: 1 }));
  const identity = { automationSha256: 'a'.repeat(64), trustedFiles: { '/z/tool': 'c'.repeat(64), '/a/tool': 'b'.repeat(64) }, executionPath: '/runtime:/usr/bin', stateSchemaVersion: 2 };
  assert.equal(generationDigest(identity), '8b9718577043c34784512c6f3e0b2edd103c5f9960b4e27512dd26bea46b3ddb');
  assert.equal(generationDigest({ ...identity, trustedFiles: { '/a/tool': 'b'.repeat(64), '/z/tool': 'c'.repeat(64) } }), generationDigest(identity));
  assert.throws(() => generationDigest({ ...identity, configSha256: 'd'.repeat(64) }), /field/);
  assert.notEqual(generationDigest({ ...identity, stateSchemaVersion: 3 }), generationDigest(identity));
});
test('private IO rejects symlinks, hardlinks, public files and tampered immutable references', t => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'rollout-io-'))); t.after(() => rmSync(root, { recursive: true, force: true }));
  const path = join(root, 'input.json'); atomicJSON(path, { synthetic: true }); const ref = fileReference(path); assert.deepEqual(readExactReference(ref), readPrivateBytes(path));
  for (const changed of [{ ...ref, bytes: ref.bytes + 1 }, { ...ref, sha256: '0'.repeat(64) }, { ...ref, extra: true }]) assert.throws(() => readExactReference(changed));
  const link = join(root, 'link'); fs.symlinkSync(path, link); assert.throws(() => readPrivateBytes(link)); fs.unlinkSync(link);
  fs.linkSync(path, link); assert.throws(() => readPrivateBytes(path)); fs.unlinkSync(link);
  fs.chmodSync(path, 0o644); assert.throws(() => readPrivateBytes(path)); assert.throws(() => atomicJSON(path, {}));
});
test('compatible control lock preserves archive interlock and refuses changed ownership', t => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'handoff-lock-'))); t.after(() => rmSync(root, { recursive: true, force: true }));
  atomicJSON(join(root, 'control-archive.lock'), {}); assert.throws(() => acquireControlLock(root), /archival/); fs.unlinkSync(join(root, 'control-archive.lock'));
  const lock = acquireControlLock(root), path = join(root, 'control.lock'); assert.equal(readPrivateJSON(path).token, lock.token);
  atomicJSON(path, { token: 'foreign' }); assert.throws(() => lock.release(), /ownership/); lock.retain(); assert.equal(readPrivateJSON(path).token, 'foreign');
});
