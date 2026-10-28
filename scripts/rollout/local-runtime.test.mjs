import assert from 'node:assert/strict';
import test from 'node:test';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const runtime = await import('./local-runtime.mjs').catch(() => ({}));
const fixture = t => { const directory = realpathSync(mkdtempSync(join(tmpdir(), 'local-runtime-'))); t.after(() => rmSync(directory, { recursive: true, force: true })); return directory; };

test('atomic state replacement preserves the previous readable JSON on invalid replacement', t => {
  const directory = fixture(t), path = join(directory, 'state.json');
  assert.equal(typeof runtime.atomicJSON, 'function');
  runtime.atomicJSON(path, { old: true });
  assert.throws(() => runtime.atomicJSON(path, { tooLarge: 'x'.repeat(4096) }, 100), /bound|large/);
  assert.deepEqual(JSON.parse(readFileSync(path)), { old: true });
  assert.deepEqual(readdirSync(directory), ['state.json']);
});

test('attempt receipts are immutable and digest checked before being consumed', t => {
  const directory = fixture(t);
  assert.equal(typeof runtime.appendReceipt, 'function');
  const ref = runtime.appendReceipt(directory, { stage: 'deploy', status: 'intent', previousArtifact: { id: 'before' } });
  assert.equal(runtime.readReceipt(directory, ref).previousArtifact.id, 'before');
  writeFileSync(join(directory, ref.path), '{}', { mode: 0o600 });
  assert.throws(() => runtime.readReceipt(directory, ref), /digest/);
});

test('another process cannot acquire the same machine lock and a crashed owner lock is not stolen', async t => {
  const directory = fixture(t), lockFile = join(directory, 'machine.lock');
  assert.equal(typeof runtime.acquireMachineLock, 'function');
  const moduleURL = pathToFileURL(join(import.meta.dirname, 'local-runtime.mjs')).href;
  const child = spawn(process.execPath, ['--input-type=module', '-e', `import {acquireMachineLock} from ${JSON.stringify(moduleURL)}; acquireMachineLock(${JSON.stringify(lockFile)}); process.stdout.write('ready\\n'); setInterval(()=>{},1000);`], { stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => { if (child.exitCode === null) child.kill('SIGKILL'); });
  await once(child.stdout, 'data');
  const original = readFileSync(lockFile);
  assert.throws(() => runtime.acquireMachineLock(lockFile), error => error.reasonCode === 'machine-busy');
  assert.deepEqual(readFileSync(lockFile), original);
  child.kill('SIGKILL'); await once(child, 'exit');
  assert.throws(() => runtime.acquireMachineLock(lockFile), error => error.reasonCode === 'lock-recovery-required');
  assert.deepEqual(readFileSync(lockFile), original);
  assert.equal(typeof runtime.recoverMachineLock, 'function');
  assert.throws(() => runtime.recoverMachineLock(lockFile, { ownerId: 'different-owner' }), /owner/);
  runtime.recoverMachineLock(lockFile, { ownerId: JSON.parse(original).ownerId });
  const recovered = runtime.acquireMachineLock(lockFile); recovered.release(); assert.equal(existsSync(lockFile), false);
});

test('retained lock remains available for process ownership investigation', t => {
  const directory = fixture(t), path = join(directory, 'machine.lock');
  assert.equal(typeof runtime.acquireMachineLock, 'function');
  const lease = runtime.acquireMachineLock(path);
  lease.retain(); lease.release();
  assert(existsSync(path));
  assert.throws(() => runtime.acquireMachineLock(path), error => error.reasonCode === 'machine-busy');
});

test('machine lock cannot be released while a registered child process still runs', async t => {
  const directory = fixture(t), path = join(directory, 'machine.lock');
  const lease = runtime.acquireMachineLock(path);
  const child = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { stdio: 'ignore', detached: true });
  t.after(() => { if (child.exitCode === null) child.kill('SIGKILL'); });
  assert.equal(typeof lease.registerChild, 'function'); lease.registerChild(child, { processGroup: true });
  assert.throws(() => lease.release(), error => error.reasonCode === 'child-recovery-required');
  assert.equal(JSON.parse(readFileSync(path)).children[0].pid, child.pid);
  child.kill('SIGKILL'); await once(child, 'exit'); lease.release();
  assert.equal(existsSync(path), false);
});

test('a gated child never runs when its parent ends before durable registration', async t => {
  const directory = fixture(t), source = new URL('./local-runtime.mjs', import.meta.url).href;
  // The parent exits inside registration (the reviewed crash window) or registers normally.
  const parent = (marker, register) => `import { execFile } from 'node:child_process'; import { promisify } from 'node:util'; import { GATE, startRegistered } from ${JSON.stringify(source)};
const pending = promisify(execFile)('/bin/sh', [...GATE, '/usr/bin/touch', ${JSON.stringify(marker)}], { detached: true });
startRegistered(pending, () => { ${register ? '' : 'process.exit(0);'} }); await pending;`;
  const crashed = join(directory, 'crashed'), registered = join(directory, 'registered');
  for (const [marker, register] of [[crashed, false], [registered, true]]) { const child = spawn(process.execPath, ['--input-type=module', '-e', parent(marker, register)]); await once(child, 'exit'); }
  await new Promise(resolve => setTimeout(resolve, 300));
  assert.equal(existsSync(crashed), false); assert.equal(existsSync(registered), true);
});
