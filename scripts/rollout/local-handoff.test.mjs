import assert from 'node:assert/strict';
import test from 'node:test';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { approvalFor, planDigest } from './local-runner.mjs';
import { hash, readReceipt } from './local-runtime.mjs';
import { acquireControlLock } from './rollout-io.mjs';

const handoff = await import('./local-handoff.mjs').catch(() => ({}));
const put = (path, value) => { const bytes = Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)); writeFileSync(path, bytes, { mode: 0o600 }); return { path, sha256: hash(bytes), bytes: bytes.length }; };
function fixture(t) {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'local-handoff-'))); t.after(() => rmSync(directory, { recursive: true, force: true }));
  const controlDirectory = join(directory, 'control'), epochDirectory = join(directory, 'epoch'), automation = join(directory, 'old-automation');
  for (const path of [controlDirectory, epochDirectory, automation]) mkdirSync(path, { mode: 0o700 });
  const artifact = (id, version, sha) => ({ id, sourceRevision: 'a'.repeat(40), sha256: sha.repeat(64), ui: { version, contractVersion: '1' } });
  const previousArtifact = artifact('previous-jev', '0.7.1', '1'), candidateArtifact = artifact('candidate-jev', '0.7.2', '2');
  const release = { releaseId: 'synthetic-0.7.2', version: '0.7.2', previousVersion: '0.7.1', sourceRevision: 'b'.repeat(40), archive: { path: join(directory, 'release.tgz'), sha256: '3'.repeat(64) } };
  const naeil = artifact('site-current', '0.7.2', '4'), estimate = artifact('estimate-current', '0.7.2', '5');
  const stop = put(join(directory, 'STOP'), 'owner stop');
  const references = [put(join(controlDirectory, 'active.json'), { epochDirectory }), put(join(controlDirectory, 'transition.json'), { phase: 'completed' }), put(join(directory, 'old-config.json'), { stateDirectory: epochDirectory })];
  const plan = { schemaVersion: 1, release, services: [{ id: 'naeil', mode: 'verify-only', artifact: naeil }, { id: 'estimate', mode: 'verify-only', artifact: estimate }, { id: 'jev', mode: 'deploy', currentArtifact: previousArtifact, prepared: { previousArtifact, candidateArtifact, consumerInputsSha256: '6'.repeat(64) } }], handoff: { schemaVersion: 1, kind: 'local-rollout-handoff', controlDirectory, epochDirectory, stop, references, workerDirectories: [automation] } };
  const state = { schemaVersion: 1, repository: 'synthetic', observedAt: '2026-10-28T11:00:00Z', lastState: 'stopped', blocked: { releaseId: release.releaseId, reasonCode: 'release-or-config-validation-failed' }, releases: { old: { releaseId: 'synthetic-0.7.1', version: '0.7.1', services: { jev: { state: 'production-verified', result: { artifact: previousArtifact } } } }, current: { releaseId: release.releaseId, version: '0.7.2', services: { naeil: { state: 'production-verified', request: { release }, result: { artifact: naeil } }, estimate: { state: 'production-verified', request: { release }, result: { artifact: estimate } } } } } };
  const sourcePath = join(epochDirectory, 'state.json'); put(sourcePath, state);
  const config = { plan, approvalFile: join(directory, 'approval.json'), stopFile: join(directory, 'NEW_STOP'), stateDirectory: join(directory, 'new-state') }; put(config.approvalFile, approvalFor(plan));
  assert.equal(typeof handoff.withLocalHandoff, 'function');
  return { directory, config, state, sourcePath, controlDirectory, automation, originals: [stop.path, ...references.map(ref => ref.path), sourcePath] };
}
const noWorkers = { listProcesses: async () => [] };

test('missing or mismatched approval refuses before any legacy-control write', async t => {
  const { config, controlDirectory } = fixture(t); unlinkSync(config.approvalFile);
  await assert.rejects(() => handoff.withLocalHandoff(config, () => assert.fail('unauthorized'), noWorkers), error => error.reasonCode === 'handoff-approval-required');
  assert.deepEqual(readdirSync(controlDirectory).sort(), ['active.json', 'transition.json']); assert.equal(existsSync(config.stateDirectory), false);
  put(config.approvalFile, { ...approvalFor(config.plan), planSha256: '0'.repeat(64) });
  await assert.rejects(() => handoff.withLocalHandoff(config, () => assert.fail('wrong approval'), noWorkers), error => error.reasonCode === 'handoff-approval-mismatch');
  assert.equal(existsSync(join(controlDirectory, 'control.lock')), false);
});

test('the unchanged original STOP is required before creating an exclusion fence', async t => {
  const { config, controlDirectory } = fixture(t); unlinkSync(config.plan.handoff.stop.path);
  await assert.rejects(() => handoff.withLocalHandoff(config, () => assert.fail('no STOP'), noWorkers), error => error.reasonCode === 'legacy-stop-required');
  assert.equal(existsSync(join(controlDirectory, 'control.lock')), false);
  put(config.plan.handoff.stop.path, 'changed STOP');
  await assert.rejects(() => handoff.withLocalHandoff(config, () => assert.fail('changed STOP'), noWorkers), error => error.reasonCode === 'legacy-reference-mismatch');
  assert.equal(existsSync(join(controlDirectory, 'control.lock')), false);
});

test('an existing old lock is preserved without stealing, truncation or invocation', async t => {
  const { config, controlDirectory } = fixture(t), lock = join(controlDirectory, 'control.lock');
  put(lock, { schemaVersion: 1, pid: process.pid, token: 'old-lock', acquisition: { kind: 'standing-active-generation-acquisition' } }); const bytes = readFileSync(lock);
  await assert.rejects(() => handoff.withLocalHandoff(config, () => assert.fail('old lock collision'), noWorkers), error => error.reasonCode === 'legacy-control-busy');
  assert.deepEqual(readFileSync(lock), bytes); assert.equal(existsSync(config.stateDirectory), false);
});

test('stopped-poll timestamp changes before approved acceptance do not change the plan or require another approval', async t => {
  const { config, state, sourcePath, controlDirectory, originals } = fixture(t), approved = planDigest(config.plan);
  state.observedAt = '2026-10-28T11:05:00Z'; put(sourcePath, state);
  const before = originals.map(path => readFileSync(path));
  const result = await handoff.withLocalHandoff(config, ({ selection, importReceipt }) => {
    assert.equal(selection.services.naeil.mode, 'verify-only'); assert.equal(selection.services.estimate.mode, 'verify-only'); assert.equal(selection.services.jev.status, 'not-started');
    const receipt = readReceipt(config.stateDirectory, importReceipt); assert.equal(receipt.sourceState.sha256, hash(readFileSync(sourcePath))); assert.equal(receipt.planSha256, approved);
    return 'accepted';
  }, noWorkers);
  assert.equal(result, 'accepted'); assert.equal(planDigest(config.plan), approved);
  const lock = JSON.parse(readFileSync(join(controlDirectory, 'control.lock'))); assert.equal(lock.acquisition.kind, 'local-rollout-handoff'); assert.equal(lock.acquisition.planSha256, approved);
  originals.forEach((path, index) => assert.deepEqual(readFileSync(path), before[index]));
});

test('lingering old orchestration workers and their descendants prevent invocation', async t => {
  const { config, controlDirectory, automation } = fixture(t);
  const dependencies = { listProcesses: async () => [{ pid: 123, parentPid: 1, command: '/synthetic/node', cwd: automation }, { pid: 124, parentPid: 123, command: '/synthetic/python', cwd: '/elsewhere' }] };
  await assert.rejects(() => handoff.withLocalHandoff(config, () => assert.fail('worker still running'), dependencies), error => error.reasonCode === 'legacy-workers-running');
  assert.equal(existsSync(join(controlDirectory, 'control.lock')), false);
});

test('normal application processes are permitted and a callback exception retains exclusion and original bytes', async t => {
  const { config, controlDirectory, originals } = fixture(t), before = originals.map(path => readFileSync(path));
  const dependencies = { listProcesses: async () => [{ pid: 456, parentPid: 1, command: 'next-server', cwd: '/synthetic/deployed-app' }] };
  await assert.rejects(() => handoff.withLocalHandoff(config, () => { throw Error('synthetic callback failed'); }, dependencies), /synthetic callback failed/);
  assert(existsSync(join(controlDirectory, 'control.lock'))); originals.forEach((path, index) => assert.deepEqual(readFileSync(path), before[index]));
});

test('an exact retained handoff fence is reused read-only after worker absence is checked', async t => {
  const { config, controlDirectory } = fixture(t);
  await handoff.withLocalHandoff(config, async () => {}, noWorkers);
  const lock = join(controlDirectory, 'control.lock'), bytes = readFileSync(lock);
  await handoff.withLocalHandoff(config, async () => {}, noWorkers);
  assert.deepEqual(readFileSync(lock), bytes);
  assert.throws(() => acquireControlLock(controlDirectory), /EEXIST/);
  assert.deepEqual(readFileSync(lock), bytes);
});

test('legacy selection binds artifacts and pending Jev without inheriting any legacy deployment approval', t => {
  const { config, state } = fixture(t);
  state.policy = { approved: true }; state.releases.current.approval = { legacy: true };
  const selection = handoff.selectLegacy072(state, config.plan);
  assert.equal(selection.services.naeil.status, 'verification-pending'); assert.equal(selection.services.estimate.status, 'verification-pending'); assert.equal(selection.services.jev.currentArtifact.ui.version, '0.7.1');
  assert.equal(selection.approval, undefined); assert.equal(selection.policy, undefined);
  const changed = structuredClone(state); changed.releases.current.services.jev = { state: 'invoking' };
  assert.throws(() => handoff.selectLegacy072(changed, config.plan), error => error.reasonCode === 'legacy-jev-already-started');
  const wrong = structuredClone(state); wrong.releases.current.services.estimate.result.artifact.id = 'other';
  assert.throws(() => handoff.selectLegacy072(wrong, config.plan), error => error.reasonCode === 'legacy-artifact-mismatch');
});

test('same-process overlapping acceptance cannot reuse its in-flight handoff fence', async t => {
  const { config, controlDirectory } = fixture(t); let release, entered;
  const waiting = new Promise(resolve => { release = resolve; }), ready = new Promise(resolve => { entered = resolve; });
  const first = handoff.withLocalHandoff(config, async () => { entered(); await waiting; }, noWorkers);
  await ready;
  await assert.rejects(() => handoff.withLocalHandoff(config, () => assert.fail('concurrent invocation'), noWorkers), error => error.reasonCode === 'legacy-control-busy');
  release(); await first; assert(existsSync(join(controlDirectory, 'control.lock')));
});

test('same-process exclusion starts before the asynchronous worker inspection', async t => {
  const { config } = fixture(t); let release, inspected, scans = 0;
  const waiting = new Promise(resolve => { release = resolve; }), ready = new Promise(resolve => { inspected = resolve; });
  const dependencies = { listProcesses: async () => { if (++scans === 1) { inspected(); await waiting; } return []; } };
  const first = handoff.withLocalHandoff(config, () => {}, dependencies);
  await ready;
  try { await assert.rejects(() => handoff.withLocalHandoff(config, () => assert.fail('concurrent invocation'), dependencies), error => error.reasonCode === 'legacy-control-busy'); }
  finally { release(); await first; }
});

test('approval revoked during the final worker inspection prevents receipt and callback but retains the fence', async t => {
  const { config, controlDirectory } = fixture(t); let scans = 0;
  const dependencies = { listProcesses: async () => { if (++scans === 2) unlinkSync(config.approvalFile); return []; } };
  await assert.rejects(() => handoff.withLocalHandoff(config, () => assert.fail('revoked approval'), dependencies), error => error.reasonCode === 'handoff-approval-required');
  assert(existsSync(join(controlDirectory, 'control.lock'))); assert.equal(existsSync(config.stateDirectory), false);
});

for (const timing of ['before', 'first-scan', 'second-scan']) test(`the new runner STOP ${timing} cancels handoff without importing old state`, async t => {
  const { config, controlDirectory } = fixture(t); let scans = 0;
  if (timing === 'before') put(config.stopFile, 'owner cancelled');
  const dependencies = { listProcesses: async () => { if (++scans === (timing === 'first-scan' ? 1 : 2)) put(config.stopFile, 'owner cancelled'); return []; } };
  await assert.rejects(() => handoff.withLocalHandoff(config, () => assert.fail('cancelled acceptance'), dependencies), error => error.reasonCode === 'stop-requested');
  assert.equal(existsSync(join(controlDirectory, 'control.lock')), timing === 'second-scan'); assert.equal(existsSync(config.stateDirectory), false);
});

test('new import storage cannot overlap the original control or epoch directories', async t => {
  const { config, controlDirectory, directory } = fixture(t);
  for (const path of [controlDirectory, join(controlDirectory, 'import'), config.plan.handoff.epochDirectory, join(config.plan.handoff.epochDirectory, 'import'), directory]) {
    await assert.rejects(() => handoff.withLocalHandoff({ ...config, stateDirectory: path }, () => assert.fail('old storage overlap'), noWorkers), /Separate new local import directory required/);
    assert.equal(existsSync(join(controlDirectory, 'control.lock')), false);
  }
});

test('a symlinked import ancestor cannot create receipt directories in old storage', async t => {
  const { config, controlDirectory, directory } = fixture(t), link = join(directory, 'linked-storage');
  symlinkSync(config.plan.handoff.epochDirectory, link);
  await assert.rejects(() => handoff.withLocalHandoff({ ...config, stateDirectory: join(link, 'new-import') }, () => assert.fail('symlinked storage'), noWorkers), /Separate real local import directory required/);
  assert.equal(existsSync(join(config.plan.handoff.epochDirectory, 'new-import')), false); assert.equal(existsSync(join(controlDirectory, 'control.lock')), false);
});

test('a new pending legacy intent during acceptance is reported while retaining exclusion', async t => {
  const { config, controlDirectory } = fixture(t);
  await assert.rejects(() => handoff.withLocalHandoff(config, () => { put(join(config.plan.handoff.epochDirectory, 'pending-intent.json'), { unexpected: true }); }, noWorkers), error => error.reasonCode === 'legacy-pending-intent');
  assert(existsSync(join(controlDirectory, 'control.lock')));
});

test('metadata-only Mac process inspection catches a real worker in its approved orchestration directory', { skip: process.platform !== 'darwin' }, async t => {
  const { config, automation } = fixture(t);
  const child = spawn(process.execPath, ['-e', "process.stdout.write('ready\\n');setInterval(()=>{},1000)"], { cwd: automation, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => { if (child.exitCode === null) child.kill('SIGKILL'); });
  await once(child.stdout, 'data');
  const processes = await handoff.listHandoffProcesses();
  assert(handoff.legacyWorkerPids(processes, config.plan.handoff).includes(child.pid));
  child.kill('SIGKILL'); await once(child, 'exit');
});
