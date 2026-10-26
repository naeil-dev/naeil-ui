import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, writeFileSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertTrustedFiles, hash, invokeJSON } from './standing-config.mjs';
import { invokeVerifier } from './jev-standing-adapter.mjs';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { assertConfigReferences, fingerprint } from './standing-config.mjs';

const credentials = ['GH_TOKEN', 'GITHUB_TOKEN', 'NAEIL_STANDING_VERCEL_TOKEN'];
// Linux images may link /bin to /usr/bin; the Jev transport requires canonical PATH entries.
const executionPath = [...new Set(['/usr/bin', '/bin'].map(path => realpathSync(path)))].join(':');

test('pinned child receives credential key names only for naeil observer rollout', async t => {
 const root = realpathSync(mkdtempSync(join(tmpdir(), 'standing-env-')));
 t.after(() => rmSync(root, { recursive: true, force: true }));
 const script = join(root, 'env-keys.mjs'), node = realpathSync(process.execPath);
 // Persist key names only, even if the parent has real unrelated credentials.
 writeFileSync(script, "import { writeFileSync } from 'node:fs'; writeFileSync(process.env.NAEIL_VERIFY_OUTPUT || process.env.NAEIL_ROLLOUT_OUTPUT, JSON.stringify(Object.keys(process.env).sort()), { mode: 0o600 });");
 const pins = { [node]: hash(readFileSync(node)), [script]: hash(readFileSync(script)) };
 const previous = process.env;
 process.env = { ...previous, GH_TOKEN: 'fixture', GITHUB_TOKEN: 'fixture', NAEIL_STANDING_VERCEL_TOKEN: 'fixture', NODE_OPTIONS: '--unreviewed', PYTHONPATH: '/unreviewed' };
 t.after(() => { process.env = previous; });
 const command = { file: node, args: [script], timeoutMs: 5000 };
 for (const [name, request, kind, allowed] of [
  ['dispatcher to observer', { service: { id: 'naeil' } }, 'rollout', true],
  ['observer to verifier', { service: { id: 'naeil' } }, 'verify', false],
  ['dispatcher to Estimate', { service: { id: 'estimate' } }, 'rollout', false],
  ['dispatcher to Jev', { service: { id: 'jev' } }, 'rollout', false],
  ['Estimate to native bridge', { serviceId: 'estimate', action: 'deploy' }, 'rollout', false],
  ['Estimate to verifier', { service: { id: 'estimate' } }, 'verify', false],
  ['Jev verification envelope', { service: { id: 'jev' } }, 'verify', false],
  ['missing service', {}, 'rollout', false],
 ]) await t.test(name, async () => {
  assertTrustedFiles(pins);
  const keys = await invokeJSON(command, { ...request, executionPath }, join(root, name.replaceAll(' ', '-')), kind);
  assert.deepEqual(keys.filter(key => credentials.includes(key)), allowed ? [...credentials].sort() : []);
  assert(!keys.includes('NODE_OPTIONS')); assert(!keys.includes('PYTHONPATH'));
  assert(keys.includes('PATH')); assert(keys.includes(kind === 'verify' ? 'NAEIL_VERIFY_INPUT' : 'NAEIL_ROLLOUT_INPUT'));
 });
 await t.test('Jev existing verifier transport strips credentials independently', async () => {
  assertTrustedFiles(pins);
  const keys = await invokeVerifier({ phase: 'production' }, { verificationCommand: command, executionPath, worktree: root }, root);
  assert.deepEqual(keys.filter(key => credentials.includes(key)), []);
 });
});

// Every writer budget uses serialized UTF-8 bytes, including indentation/newline.
// Rejection must precede even opening the replacement temporary file.
test('all JSON budgets accept exact boundary and reject limit+1 before replacement', async t => {
 const { atomicJSON, readPrivateJSON } = await import('./standing-config.mjs');
 const { JSON_LIMITS } = await import('./standing-state.mjs');
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

test('unapproved configuration paths are refused before opening their bytes', t => {
 const root=realpathSync(mkdtempSync(join(tmpdir(),'standing-config-refs-')));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const approved=join(root,'approved.json'),outside=join(root,'synthetic-private-canary.json');
 writeFileSync(approved,'{}',{mode:0o600});writeFileSync(outside,'synthetic private canary',{mode:0o600});
 const refs=[{path:outside,sha256:hash(readFileSync(outside)),bytes:readFileSync(outside).length}];
 const original=fs.openSync;let reads=0;
 try {fs.openSync=(path,...args)=>{if(path===outside)reads++;return original(path,...args);};syncBuiltinESMExports();assert.throws(()=>assertConfigReferences(refs,fingerprint(refs),[approved]),/inventory/);}
 finally {fs.openSync=original;syncBuiltinESMExports();}
 assert.equal(reads,0,'An unapproved path must not become a private-file read allowance');
});
