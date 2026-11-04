import assert from 'node:assert/strict';
import test from 'node:test';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const core = await import('./local-runner.mjs').catch(() => ({}));
const { readReceipt } = await import('./local-runtime.mjs');
function fixture(t, services = [{ id: 'naeil', mode: 'verify-only' }, { id: 'jev', mode: 'deploy' }]) {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'local-runner-')));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const archive = join(directory, 'archive.tgz'); writeFileSync(archive, 'synthetic archive', { mode: 0o600 });
  services = services.map(service => service.mode === 'deploy' ? { ...service, currentArtifact: { id: 'previous', sourceRevision: 'b'.repeat(40), sha256: '1'.repeat(64) }, prepared: { previousArtifact: { id: 'previous', sourceRevision: 'b'.repeat(40), sha256: '1'.repeat(64) }, candidateArtifact: { id: 'candidate', sourceRevision: 'c'.repeat(40), sha256: '2'.repeat(64) }, consumerInputsSha256: 'd'.repeat(64) } } : service);
  const config = { stateDirectory: join(directory, 'state'), lockFile: join(directory, 'machine.lock'), stopFile: join(directory, 'STOP'), approvalFile: join(directory, 'approval.json'), retry: { maxAttempts: 3, baseDelayMs: 0 }, plan: { schemaVersion: 1, release: { releaseId: 'synthetic-0.7.42', version: '0.7.42', sourceRevision: 'a'.repeat(40), archive: { path: archive, sha256: '74a06ea6113b7f98d70ba2286ddaa21a9a17e25ed2bb8736a823dbc46177eb44' } }, services } };
  assert.equal(typeof core.runLocal, 'function');
  const approval = core.approvalFor(config.plan);
  writeFileSync(config.approvalFile, JSON.stringify(approval), { mode: 0o600 });
  return { directory, config };
}
function system(directory, overrides = {}) {
  const current = join(directory, 'current.json'); writeFileSync(current, JSON.stringify({ id: 'previous', sourceRevision: 'b'.repeat(40), sha256: '1'.repeat(64) }), { mode: 0o600 });
  return {
    async validateRelease() { return { passed: true }; },
    async inspect() { return { artifact: JSON.parse(readFileSync(current)) }; },
    async prepare() { return { candidateArtifact: { id: 'candidate', sourceRevision: 'c'.repeat(40), sha256: '2'.repeat(64) }, consumerInputsSha256: 'd'.repeat(64) }; },
    async deploy({ transaction }) {
      assert.equal(transaction.previousArtifact.id, 'previous');
      const state = JSON.parse(readFileSync(join(directory, 'state/state.json')));
      assert.equal(state.transactions[transaction.id].native.status, 'intent');
      writeFileSync(current, JSON.stringify(transaction.candidateArtifact));
      return { outcome: 'completed', artifact: transaction.candidateArtifact };
    },
    async verify({ service, transaction }) {
      if (service.mode === 'deploy') assert.equal(JSON.parse(readFileSync(current)).id, transaction.candidateArtifact.id);
      return { passed: true };
    },
    async rollback({ transaction }) { writeFileSync(current, JSON.stringify(transaction.previousArtifact)); return { outcome: 'completed', artifact: transaction.previousArtifact }; },
    ...overrides,
  };
}

test('sequential run verifies imported services and durably deploys the exact candidate once', async t => {
  const { directory, config } = fixture(t), deps = system(directory);
  const state = await core.runLocal(config, deps);
  assert.equal(state.status, 'production-verified');
  assert.equal(state.services.naeil.status, 'production-verified');
  assert.equal(state.services.jev.status, 'production-verified');
  const tx = state.transactions[state.services.jev.transactionId];
  assert.equal(tx.previousArtifact.id, 'previous'); assert.equal(tx.native.status, 'complete');
  assert(readdirSync(join(config.stateDirectory, 'attempts')).length > 5);
  const current = readFileSync(join(directory, 'current.json'));
  const repeated = await core.runLocal(config, { ...deps, deploy() { throw Error('must not redeploy'); } });
  assert.equal(repeated.status, 'production-verified'); assert.deepEqual(readFileSync(join(directory, 'current.json')), current);
});

test('HTTP 403 verification retries safely and retains structured reason without raw secret output', async t => {
  const { directory, config } = fixture(t), deps = system(directory); let failures = 0;
  deps.verify = async ({ service }) => { if (service.id === 'naeil' && failures++ < 2) throw Object.assign(Error('synthetic confidential DOM'), { status: 403 }); return { passed: true }; };
  const state = await core.runLocal(config, deps);
  assert.equal(state.status, 'production-verified');
  const receipts = readdirSync(join(config.stateDirectory, 'attempts')).map(name => readFileSync(join(config.stateDirectory, 'attempts', name), 'utf8')).join('\n');
  assert.match(receipts, /"status": 403/); assert.match(receipts, /"retryable": true/); assert.doesNotMatch(receipts, /confidential/);
});

test('positively not-started native busy deferrals retry the same exact forward transaction', async t => {
  const { directory, config } = fixture(t, [{ id: 'jev', mode: 'deploy' }]), deps = system(directory), deploy = deps.deploy, prepare = deps.prepare;
  const transactions = []; let preparations = 0, sleeps = 0;
  deps.prepare = async context => { preparations++; return prepare(context); };
  deps.sleep = async () => { sleeps++; };
  deps.deploy = async context => {
    transactions.push(context.transaction.id);
    if (transactions.length < 3) throw Object.assign(Error('private busy payload'), { outcome: 'not-started', reasonCode: 'native-busy', retryable: true });
    return deploy(context);
  };
  const state = await core.runLocal(config, deps);
  assert.equal(state.status, 'production-verified'); assert.equal(preparations, 1); assert.equal(sleeps, 2); assert.equal(transactions.length, 3); assert.equal(new Set(transactions).size, 1);
  const tx = state.transactions[transactions[0]]; assert.deepEqual(tx.nativeHistory.map(item => item.status), ['not-started', 'not-started']);
  assert.doesNotMatch(readFileSync(join(config.stateDirectory, 'state.json'), 'utf8'), /private busy payload/);
});

test('STOP while waiting after a safe native deferral blocks the next forward invocation', async t => {
  const { directory, config } = fixture(t, [{ id: 'jev', mode: 'deploy' }]), deps = system(directory); let calls = 0;
  deps.deploy = async () => { calls++; return { outcome: 'not-started', reasonCode: 'native-busy', retryable: true }; };
  deps.sleep = async () => { writeFileSync(config.stopFile, 'owner stop'); };
  const state = await core.runLocal(config, deps);
  assert.equal(state.status, 'stopped'); assert.equal(state.failure.reasonCode, 'stop-requested'); assert.equal(calls, 1); assert.equal(existsSync(config.lockFile), false);
  assert.equal(state.transactions[state.services.jev.transactionId].native.status, 'not-started');
});

test('safe native deferral exhaustion stays retryable and a later command resumes the same transaction', async t => {
  const { directory, config } = fixture(t, [{ id: 'jev', mode: 'deploy' }]), deps = system(directory), deploy = deps.deploy; let calls = 0;
  deps.deploy = async () => { calls++; return { outcome: 'not-started', reasonCode: 'native-busy', retryable: true }; };
  const exhausted = await core.runLocal(config, deps), id = exhausted.services.jev.transactionId;
  assert.equal(exhausted.status, 'retryable'); assert.equal(exhausted.failure.reasonCode, 'native-busy'); assert.equal(exhausted.failure.retryable, true); assert.equal(calls, 3); assert.equal(existsSync(config.lockFile), false);
  deps.deploy = async context => { assert.equal(context.transaction.id, id); return deploy(context); };
  assert.equal((await core.runLocal(config, deps)).status, 'production-verified');
});

test('an explicit rollback never automatically repeats even a proven retryable native deferral', async t => {
  const { directory, config } = fixture(t, [{ id: 'jev', mode: 'deploy' }]), deps = system(directory); let calls = 0;
  const deployed = await core.runLocal(config, deps);
  deps.rollback = async () => { calls++; throw Object.assign(Error(), { outcome: 'not-started', reasonCode: 'native-busy', retryable: true }); };
  deps.sleep = async () => assert.fail('rollback is never automatically retried');
  const state = await core.runLocal(config, deps, { command: 'rollback', transactionId: deployed.services.jev.transactionId });
  assert.equal(state.status, 'retryable'); assert.equal(calls, 1);
});

test('retry exhaustion resumes verification without repeating a known deployment', async t => {
  const { directory, config } = fixture(t, [{ id: 'jev', mode: 'deploy' }]), deps = system(directory); let unavailable = true;
  deps.verify = async () => { if (unavailable) throw Object.assign(Error(), { status: 503 }); return { passed: true }; };
  const first = await core.runLocal(config, deps);
  assert.equal(first.status, 'retryable'); assert.equal(JSON.parse(readFileSync(join(directory, 'current.json'))).id, 'candidate');
  unavailable = false;
  const second = await core.runLocal(config, { ...deps, deploy() { throw Error('duplicate native invocation'); } });
  assert.equal(second.status, 'production-verified');
});

test('STOP observed after native completion records deployment and prevents later forward verification', async t => {
  const { directory, config } = fixture(t, [{ id: 'jev', mode: 'deploy' }]), deps = system(directory), deploy = deps.deploy;
  deps.deploy = async ctx => { const result = await deploy(ctx); writeFileSync(config.stopFile, 'stop', { mode: 0o600 }); return result; };
  deps.verify = () => { throw Error('verification crossed STOP'); };
  const state = await core.runLocal(config, deps);
  assert.equal(state.status, 'stopped');
  const tx = state.transactions[state.services.jev.transactionId]; assert.equal(tx.native.status, 'complete'); assert.equal(tx.candidateArtifact.id, 'candidate');
  const rolledBack = await core.runLocal(config, deps, { command: 'rollback', transactionId: tx.id });
  assert.equal(rolledBack.services.jev.status, 'rolled-back'); assert.equal(JSON.parse(readFileSync(join(directory, 'current.json'))).id, 'previous');
});

test('approval deletion at a stage boundary revokes forward native execution', async t => {
  const { directory, config } = fixture(t, [{ id: 'jev', mode: 'deploy' }]), deps = system(directory), prepare = deps.prepare;
  deps.prepare = async ctx => { const result = await prepare(ctx); unlinkSync(config.approvalFile); return result; };
  const state = await core.runLocal(config, deps);
  assert.equal(state.status, 'stopped'); assert.equal(state.failure.reasonCode, 'approval-revoked');
  assert.equal(JSON.parse(readFileSync(join(directory, 'current.json'))).id, 'previous');
});

test('wrong plan approval digest holds before any native operation', async t => {
  const { directory, config } = fixture(t), approval = core.approvalFor(config.plan);
  approval.planSha256 = 'e'.repeat(64); writeFileSync(config.approvalFile, JSON.stringify(approval));
  const state = await core.runLocal(config, system(directory));
  assert.equal(state.status, 'held'); assert.equal(state.failure.reasonCode, 'approval-mismatch');
  assert.equal(JSON.parse(readFileSync(join(directory, 'current.json'))).id, 'previous');
});

test('wrong archive bytes hold before preparation or deployment', async t => {
  const { directory, config } = fixture(t); writeFileSync(config.plan.release.archive.path, 'tampered');
  const state = await core.runLocal(config, system(directory));
  assert.equal(state.status, 'held'); assert.equal(state.failure.reasonCode, 'archive-digest-mismatch');
  assert.equal(JSON.parse(readFileSync(join(directory, 'current.json'))).id, 'previous');
});

test('authentication expiry pauses safely and explicit recheck resumes without redeployment', async t => {
  const { directory, config } = fixture(t, [{ id: 'jev', mode: 'deploy' }]), deps = system(directory);
  deps.verify = async () => { throw Object.assign(Error('credentials never persisted'), { reasonCode: 'session-expired', status: 401 }); };
  const state = await core.runLocal(config, deps); assert.equal(state.status, 'auth-required'); assert.equal(state.failure.retryable, false);
  const resumed = await core.runLocal(config, { ...deps, verify: async () => ({ passed: true }), deploy() { throw Error('repeat'); } }, { retryHeld: true });
  assert.equal(resumed.status, 'production-verified');
});

test('identity mismatch remains held until explicit recheck and never silently redeploys', async t => {
  const { directory, config } = fixture(t, [{ id: 'jev', mode: 'deploy' }]), deps = system(directory);
  deps.verify = async () => ({ passed: false, reasonCode: 'identity-mismatch' });
  const first = await core.runLocal(config, deps); assert.equal(first.status, 'held');
  const next = { ...deps, verify: async () => ({ passed: true }), deploy() { throw Error('repeat'); } };
  assert.equal((await core.runLocal(config, next)).status, 'held');
  assert.equal((await core.runLocal(config, next, { retryHeld: true })).status, 'production-verified');
});

test('rollback ignores absent approval, STOP and unavailable release/verifier but rejects arbitrary artifacts', async t => {
  const { directory, config } = fixture(t, [{ id: 'jev', mode: 'deploy' }]), deps = system(directory);
  const state = await core.runLocal(config, deps), tx = state.transactions[state.services.jev.transactionId];
  unlinkSync(config.approvalFile); unlinkSync(config.plan.release.archive.path); writeFileSync(config.stopFile, 'stop');
  const poisoned = { ...deps, validateRelease() { throw Error('release unavailable'); }, verify() { throw Error('verifier unavailable'); } };
  await assert.rejects(() => core.runLocal(config, poisoned, { command: 'rollback', transactionId: tx.id, artifact: { id: 'arbitrary' } }), /Unsupported|Unknown|artifact/);
  const restored = await core.runLocal(config, poisoned, { command: 'rollback', transactionId: tx.id });
  assert.equal(restored.services.jev.status, 'rolled-back'); assert.equal(JSON.parse(readFileSync(join(directory, 'current.json'))).id, 'previous');
});

test('safe prepare and verification commands need no deploy approval', async t => {
  const { directory, config } = fixture(t), deps = system(directory); unlinkSync(config.approvalFile);
  const prepared = await core.runLocal(config, deps, { command: 'prepare' });
  assert.equal(prepared.services.jev.status, 'prepared'); assert.equal(JSON.parse(readFileSync(join(directory, 'current.json'))).id, 'previous');
  const verified = await core.runLocal(config, deps, { command: 'verify', serviceId: 'naeil' });
  assert.equal(verified.services.naeil.status, 'production-verified');
});

test('crash after durable native intent cannot trigger native deployment again on restart', async t => {
  const { directory, config } = fixture(t, [{ id: 'jev', mode: 'deploy' }]);
  const runnerURL = pathToFileURL(join(import.meta.dirname, 'local-runner.mjs')).href;
  const childScript = `import {runLocal} from ${JSON.stringify(runnerURL)}; import {writeFileSync} from 'node:fs'; const config=${JSON.stringify(config)}; await runLocal(config, {validateRelease:async()=>({passed:true}),inspect:async()=>({artifact:config.plan.services[0].prepared.previousArtifact}),prepare:async()=>({candidateArtifact:config.plan.services[0].prepared.candidateArtifact,consumerInputsSha256:config.plan.services[0].prepared.consumerInputsSha256}),deploy:async({transaction})=>{writeFileSync(${JSON.stringify(join(directory, 'native-launched'))},transaction.id);process.stdout.write('native\\n');setInterval(()=>{},1000);await new Promise(()=>{});}});`;
  const child = spawn(process.execPath, ['--input-type=module', '-e', childScript], { stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => { if (child.exitCode === null) child.kill('SIGKILL'); });
  await once(child.stdout, 'data'); child.kill('SIGKILL'); await once(child, 'exit');
  assert(existsSync(join(directory, 'native-launched')));
  const before = JSON.parse(readFileSync(join(config.stateDirectory, 'state.json')));
  assert.equal(before.transactions[before.services.jev.transactionId].native.status, 'intent');
  await assert.rejects(() => core.runLocal(config, system(directory)), error => error.reasonCode === 'lock-recovery-required');
  // Explicit operator recovery of a synthetic dead process lock, never a live operational path.
  unlinkSync(config.lockFile);
  const resumed = await core.runLocal(config, system(directory));
  assert.equal(resumed.status, 'manual-recovery'); assert.equal(resumed.failure.reasonCode, 'native-outcome-unknown');
  assert.equal(resumed.transactions[resumed.services.jev.transactionId].native.status, 'intent');
});

test('ambiguous verification session rotation requires manual recovery and never retries', async t => {
  const { directory, config } = fixture(t), deps = system(directory);
  deps.verify = async () => { throw Object.assign(Error(), { reasonCode: 'session-lifecycle-uncertain', manualRecovery: true, retryable: false }); };
  const state = await core.runLocal(config, deps);
  assert.equal(state.status, 'manual-recovery'); assert.equal(state.failure.reasonCode, 'session-lifecycle-uncertain');
  const second = await core.runLocal(config, system(directory), { retryHeld: true }); assert.equal(second.status, 'manual-recovery');
});

test('failure on later service preserves already verified predecessors', async t => {
  const { directory, config } = fixture(t), deps = system(directory);
  deps.inspect = async ({ service }) => ({ artifact: { id: service.id === 'naeil' ? 'imported' : 'changed' } });
  const state = await core.runLocal(config, deps);
  assert.equal(state.status, 'held'); assert.equal(state.services.naeil.status, 'production-verified'); assert.equal(state.services.jev.status, 'held');
});

test('draft plans cannot gain approval and prepare cannot substitute approved consumer input bytes', async t => {
  const { directory, config } = fixture(t, [{ id: 'jev', mode: 'deploy' }]), draft = structuredClone(config.plan);
  delete draft.services[0].prepared;
  assert.throws(() => core.approvalFor(draft), /final|prepared/i);
  const finalized = core.finalizePlan(draft, { jev: config.plan.services[0].prepared });
  assert.deepEqual(core.approvalFor(finalized), core.approvalFor(config.plan));
  const deps = system(directory), prepare = deps.prepare;
  deps.prepare = async ctx => ({ ...await prepare(ctx), consumerInputsSha256: '9'.repeat(64) });
  const state = await core.runLocal(config, deps);
  assert.equal(state.status, 'held'); assert.equal(state.failure.reasonCode, 'prepared-input-mismatch');
  assert.equal(JSON.parse(readFileSync(join(directory, 'current.json'))).id, 'previous');
});

test('explicit rollback can restore an unresolved deployment after operator confirms native process exit', async t => {
  const { directory, config } = fixture(t, [{ id: 'jev', mode: 'deploy' }]), deps = system(directory), deploy = deps.deploy;
  deps.deploy = async ctx => { await deploy(ctx); throw Error('transport lost after activation'); };
  const state = await core.runLocal(config, deps), id = state.services.jev.transactionId;
  assert.equal(state.status, 'manual-recovery'); assert(existsSync(config.lockFile));
  // This fake native has no workers. A real operator must prove all workers are
  // gone and use explicit lock recovery; no production path is used here.
  unlinkSync(config.lockFile); unlinkSync(config.approvalFile); writeFileSync(config.stopFile, 'stop');
  const restored = await core.runLocal(config, deps, { command: 'rollback', transactionId: id });
  assert.equal(restored.services.jev.status, 'rolled-back'); assert.equal(JSON.parse(readFileSync(join(directory, 'current.json'))).id, 'previous');
});

test('proven not-started rollback can be retried while original deployment evidence stays intact', async t => {
  const { directory, config } = fixture(t, [{ id: 'jev', mode: 'deploy' }]), deps = system(directory), rollback = deps.rollback;
  const deployed = await core.runLocal(config, deps), id = deployed.services.jev.transactionId;
  deps.rollback = async () => ({ outcome: 'not-started', reasonCode: 'native-busy' });
  const refused = await core.runLocal(config, deps, { command: 'rollback', transactionId: id });
  assert.equal(refused.status, 'held'); assert.equal(existsSync(config.lockFile), false);
  assert.equal(refused.transactions[id].nativeHistory[0].operation, 'deploy');
  assert.equal(refused.transactions[id].nativeHistory[0].status, 'complete');
  deps.rollback = rollback;
  const restored = await core.runLocal(config, deps, { command: 'rollback', transactionId: id });
  assert.equal(restored.services.jev.status, 'rolled-back'); assert.equal(JSON.parse(readFileSync(join(directory, 'current.json'))).id, 'previous');
});

test('rejected verifier with a running child retains ownership and cannot retry the child', async t => {
  const { directory, config } = fixture(t, [{ id: 'naeil', mode: 'verify-only' }]), deps = system(directory); let child; const children = [];
  t.after(() => { for (const item of children) if (item.exitCode === null) item.kill('SIGKILL'); });
  deps.verify = async ({ registerChild }) => {
    child = spawn(process.execPath, ['-e', 'setInterval(()=>{},1000)'], { stdio: 'ignore', detached: true });
    children.push(child);
    registerChild(child, { processGroup: true }); throw Object.assign(Error(), { status: 503 });
  };
  const state = await core.runLocal(config, deps);
  assert.equal(state.status, 'manual-recovery'); assert.equal(state.failure.reasonCode, 'child-recovery-required');
  assert(existsSync(config.lockFile)); assert.equal(JSON.parse(readFileSync(config.lockFile)).children.length, 1);
  await assert.rejects(() => core.runLocal(config, deps, { command: 'verify', serviceId: 'naeil', recoverVerification: true }), error => error.reasonCode === 'machine-busy');
  child.kill('SIGKILL'); await once(child, 'exit');
});

test('native run cannot select a later service and bypass predecessors', async t => {
  const { directory, config } = fixture(t);
  await assert.rejects(() => core.runLocal(config, system(directory), { command: 'run', serviceId: 'jev' }), /service|sequential/i);
  assert.equal(existsSync(config.stateDirectory), false);
});

test('unrelated verification and prepare preserve another service hold until that service is rechecked', async t => {
  const { directory, config } = fixture(t), deps = system(directory);
  deps.verify = async ({ service }) => ({ passed: service.id !== 'jev', reasonCode: 'identity-mismatch' });
  const held = await core.runLocal(config, deps); assert.equal(held.services.jev.status, 'held');
  deps.verify = async () => ({ passed: true });
  const unrelated = await core.runLocal(config, deps, { command: 'verify', serviceId: 'naeil' });
  assert.equal(unrelated.status, 'held'); assert.equal(unrelated.services.jev.status, 'held');
  const prepared = await core.runLocal(config, deps, { command: 'prepare' }); assert.equal(prepared.status, 'held');
  const unchanged = await core.runLocal(config, { ...deps, verify() { throw Error('implicit held-service retry'); } }); assert.equal(unchanged.status, 'held');
  const rechecked = await core.runLocal(config, deps, { command: 'verify', serviceId: 'jev' });
  assert.equal(rechecked.status, 'production-verified');
});

test('proven native recovery records the exact restored predecessor and releases lock without redeployment', async t => {
  const { directory, config } = fixture(t, [{ id: 'jev', mode: 'deploy' }]), deps = system(directory);
  deps.deploy = async ({ plan, service, transaction }) => ({ outcome: 'failed', recovered: true, reasonCode: 'activation-failed-current-code-recovered', artifact: transaction.previousArtifact, receipt: { schemaVersion: 1, releaseId: plan.release.releaseId, serviceId: service.id, attemptId: transaction.id, planSha256: core.planDigest(plan), action: 'deploy', safe: true, passed: false, outcome: 'failed', phase: 'recovered' } });
  const recovered = await core.runLocal(config, deps), id = recovered.services.jev.transactionId;
  assert.equal(recovered.services.jev.status, 'rolled-back'); assert.equal(recovered.transactions[id].native.recovered, true); assert.equal(existsSync(config.lockFile), false);
  const next = await core.runLocal(config, { ...deps, deploy() { throw Error('unsafe native repeat'); } });
  assert.equal(next.status, 'held'); assert.equal(next.failure.reasonCode, 'transaction-rolled-back');
  const explicit = await core.runLocal(config, { ...deps, deploy() { throw Error('unsafe recovered native repeat'); } }, { retryHeld: true });
  assert.equal(explicit.status, 'held'); assert.equal(explicit.failure.reasonCode, 'transaction-rolled-back'); assert.equal(existsSync(config.lockFile), false);
  assert.equal(JSON.parse(readFileSync(join(directory, 'current.json'))).id, 'previous');
});

test('failed rollback recovered to candidate keeps deployment proof and permits an explicit rollback retry', async t => {
  const { directory, config } = fixture(t, [{ id: 'jev', mode: 'deploy' }]), deps = system(directory), rollback = deps.rollback;
  const state = await core.runLocal(config, deps), id = state.services.jev.transactionId;
  deps.rollback = async ({ plan, service, transaction }) => ({ outcome: 'failed', recovered: true, reasonCode: 'rollback-failed-current-code-recovered', artifact: transaction.candidateArtifact, receipt: { schemaVersion: 1, releaseId: plan.release.releaseId, serviceId: service.id, attemptId: transaction.id, planSha256: core.planDigest(plan), action: 'rollback', safe: true, passed: false, outcome: 'failed', phase: 'recovered' } });
  const recovered = await core.runLocal(config, deps, { command: 'rollback', transactionId: id });
  assert.equal(recovered.status, 'held'); assert.equal(existsSync(config.lockFile), false); assert.equal(JSON.parse(readFileSync(join(directory, 'current.json'))).id, 'candidate');
  deps.rollback = rollback;
  const restored = await core.runLocal(config, deps, { command: 'rollback', transactionId: id });
  assert.equal(restored.services.jev.status, 'rolled-back'); assert.equal(JSON.parse(readFileSync(join(directory, 'current.json'))).id, 'previous');
});

test('safe dependency stage survives in failure diagnostics while raw error message is discarded', async t => {
  const { directory, config } = fixture(t), deps = system(directory);
  deps.verify = async () => { throw Object.assign(Error('synthetic confidential payload'), { stage: 'session-refresh', reasonCode: 'session-expired', status: 401 }); };
  const state = await core.runLocal(config, deps);
  assert.equal(state.failure.stage, 'session-refresh'); assert.equal(state.failure.reasonCode, 'session-expired');
  assert.doesNotMatch(readFileSync(join(config.stateDirectory, 'state.json'), 'utf8'), /confidential/);
});

for (const operation of ['rollback', 'deploy']) for (const current of ['previous', 'candidate', 'mixed']) test(`explicit interrupted ${operation} recovery inspects exact ${current} state after the real owner exits`, async t => {
  const { directory, config } = fixture(t, [{ id: 'jev', mode: 'deploy' }]), currentPath = join(directory, 'current.json');
  const runnerURL = pathToFileURL(join(import.meta.dirname, 'local-runner.mjs')).href;
  const childScript = `import {runLocal} from ${JSON.stringify(runnerURL)}; import {readFileSync,writeFileSync} from 'node:fs'; const config=${JSON.stringify(config)},pin=config.plan.services[0].prepared,path=${JSON.stringify(currentPath)};writeFileSync(path,JSON.stringify(pin.previousArtifact));const deps={validateRelease:async()=>({passed:true}),inspect:async()=>({artifact:JSON.parse(readFileSync(path))}),prepare:async()=>({candidateArtifact:pin.candidateArtifact,consumerInputsSha256:pin.consumerInputsSha256}),deploy:async()=>{writeFileSync(path,JSON.stringify(pin.candidateArtifact));return{outcome:'completed',artifact:pin.candidateArtifact}},verify:async()=>({passed:true}),rollback:async()=>{writeFileSync(path,JSON.stringify(${current === 'previous' ? 'pin.previousArtifact' : current === 'candidate' ? 'pin.candidateArtifact' : "{id:'mixed'}"}));process.stdout.write('rollback\\n');setInterval(()=>{},1000);await new Promise(()=>{});}};${operation === 'deploy' ? 'deps.deploy=deps.rollback;' : ''}const deployed=await runLocal(config,deps);${operation === 'rollback' ? "await runLocal(config,deps,{command:'rollback',transactionId:deployed.services.jev.transactionId});" : ''}`;
  const child = spawn(process.execPath, ['--input-type=module', '-e', childScript], { stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => { if (child.exitCode === null) child.kill('SIGKILL'); });
  await once(child.stdout, 'data'); child.kill('SIGKILL'); await once(child, 'exit');
  const runtime = await import('./local-runtime.mjs');
  runtime.recoverMachineLock(config.lockFile, { ownerId: JSON.parse(readFileSync(config.lockFile)).ownerId });
  const state = JSON.parse(readFileSync(join(config.stateDirectory, 'state.json'))), id = state.services.jev.transactionId;
  unlinkSync(config.approvalFile); unlinkSync(config.plan.release.archive.path); writeFileSync(config.stopFile, 'stop');
  const dependencies = {
    inspect: async ({ transaction }) => { const artifact = JSON.parse(readFileSync(currentPath)); if (JSON.stringify(artifact) !== JSON.stringify(transaction.inspectionArtifact)) throw Object.assign(Error(), { reasonCode: 'identity-mismatch' }); return { artifact, receipt: { inspected: current } }; },
    rollback: async ({ transaction, directory: stateDirectory }) => {
      assert.equal(current, 'candidate', 'already restored/mixed must not enter native');
      const proof = runtime.readReceipt(stateDirectory, transaction.rollbackReconciliation);
      assert.equal(proof.kind, 'rollback-reconciliation'); assert.equal(proof.planSha256, core.planDigest(config.plan)); assert.equal(proof.transactionId, id); assert.equal(proof.serviceId, 'jev');
      assert.deepEqual(proof.artifact, transaction.candidateArtifact); assert.equal(proof.intentReceipt.sha256, transaction.nativeHistory.at(-1).intentReceipt.sha256);
      assert.deepEqual(proof.nativeInspection, { inspected: current });
      writeFileSync(currentPath, JSON.stringify(transaction.previousArtifact)); return { outcome: 'completed', artifact: transaction.previousArtifact };
    },
  };
  const recovered = await core.runLocal(config, dependencies, { command: 'rollback', transactionId: id });
  assert.equal(recovered.status, current === 'mixed' ? 'manual-recovery' : 'rolled-back');
  assert.equal(existsSync(config.lockFile), current === 'mixed');
  assert.equal(JSON.parse(readFileSync(currentPath)).id, current === 'mixed' ? 'mixed' : 'previous');
});

for (const cancellation of ['stop-requested', 'approval-revoked']) test(`R1 final ${cancellation} preserves every completed service`, async t => {
  const { directory, config } = fixture(t), deps = system(directory);
  deps.verify = async ({ service }) => {
    if (service.id === 'jev') {
      if (cancellation === 'stop-requested') writeFileSync(config.stopFile, 'stop');
      else unlinkSync(config.approvalFile);
    }
    return { passed: true };
  };
  const state = await core.runLocal(config, deps);
  assert.equal(state.status, 'stopped'); assert.equal(state.failure.reasonCode, cancellation);
  for (const record of Object.values(state.services)) { assert.equal(record.status, 'production-verified'); assert(record.verifiedAt); assert.equal(record.failure, null); }
  const failures = readdirSync(join(config.stateDirectory, 'attempts')).map(name => JSON.parse(readFileSync(join(config.stateDirectory, 'attempts', name)))).filter(value => value.status === 'failed');
  assert.equal(failures.at(-1).serviceId, null);
});

for (const id of ['naeil', 'jev']) test(`R3 explicit verification recovery resumes only ${id} and preserves its original failure`, async t => {
  const { directory, config } = fixture(t), deps = system(directory); let verifies = 0;
  deps.verify = async ({ service }) => { if (service.id === id) throw Object.assign(Error('private verifier body'), { stage: 'session-refresh', reasonCode: 'session-refresh-locked', manualRecovery: true }); return { passed: true }; };
  const first = await core.runLocal(config, deps), failure = first.services[id].failure, priorReceipt = first.lastReceipt;
  const original = Object.fromEntries(readdirSync(join(config.stateDirectory, 'attempts')).map(name => [name, readFileSync(join(config.stateDirectory, 'attempts', name))]));
  assert.equal(first.status, 'manual-recovery'); assert.equal(existsSync(config.lockFile), false);
  const next = { ...deps, prepare() { assert.fail('verification recovery cannot prepare'); }, deploy() { assert.fail('verification recovery cannot deploy'); }, rollback() { assert.fail('verification recovery cannot rollback'); }, verify: async ({ service }) => { assert.equal(service.id, id); verifies++; return { passed: true }; } };
  for (const options of [{}, { retryHeld: true }, { command: 'verify', serviceId: id }]) assert.equal((await core.runLocal(config, next, options)).status, 'manual-recovery');
  assert.equal(verifies, 0);
  const recovered = await core.runLocal(config, next, { command: 'verify', serviceId: id, recoverVerification: true });
  assert.equal(recovered.services[id].status, 'production-verified'); assert.equal(verifies, 1);
  assert.deepEqual(recovered.transactions, first.transactions);
  const receipts = readdirSync(join(config.stateDirectory, 'attempts')).map(name => JSON.parse(readFileSync(join(config.stateDirectory, 'attempts', name))));
  const recovery = receipts.filter(value => value.kind === 'verification-recovery'); assert.equal(recovery.length, 1);
  assert.equal(recovery[0].serviceId, id); assert.deepEqual(recovery[0].priorFailure, failure); assert.deepEqual(recovery[0].priorReceipt, priorReceipt);
  assert.deepEqual(readReceipt(config.stateDirectory, priorReceipt).failure, failure);
  for (const [name, bytes] of Object.entries(original)) assert.deepEqual(readFileSync(join(config.stateDirectory, 'attempts', name)), bytes);
  assert.doesNotMatch(JSON.stringify(receipts), /private verifier body/);
  if (id === 'naeil') { assert.equal(recovered.services.jev.status, 'not-started'); assert.equal(Object.keys(recovered.transactions).length, 0); }
  else assert.equal(recovered.status, 'production-verified');
});

test('R3 recovery flag rejects ambiguous command and selector combinations before state creation', async t => {
  const { directory, config } = fixture(t), deps = system(directory);
  for (const options of [{}, { command: 'verify' }, { command: 'run', serviceId: 'jev' }, { command: 'prepare', serviceId: 'jev' }, { command: 'rollback', transactionId: 'fake' }, { command: 'status' }, { command: 'verify', serviceId: 'jev', retryHeld: true }]) {
    await assert.rejects(() => core.runLocal(config, deps, { ...options, recoverVerification: true }), /recover|verif|sequential/i);
  }
  assert.equal(existsSync(config.stateDirectory), false);
});

test('R3 recovery refuses non-session failures, other manual services and incomplete native deployments', async t => {
  for (const variant of ['ready', 'wrong-service', 'other-manual', 'native-intent', 'no-deployment', 'identity', 'stop', 'child', 'lock', 'transaction', 'wrong-stage']) {
    const { directory, config } = fixture(t), deps = system(directory);
    deps.verify = async () => { throw Object.assign(Error(), { stage: 'session-refresh', reasonCode: 'session-refresh-locked', manualRecovery: true }); };
    const state = await core.runLocal(config, deps);
    let id = 'naeil';
    if (variant === 'ready') { state.status = 'ready'; state.services.naeil.status = 'not-started'; }
    if (variant === 'wrong-service') id = 'jev';
    if (variant === 'other-manual') Object.assign(state.services.jev, { status: 'manual-recovery', failure: state.failure });
    if (variant === 'native-intent') state.transactions.fake = { id: 'fake', serviceId: 'jev', native: { operation: 'deploy', status: 'intent' } };
    if (variant === 'no-deployment') { id = 'jev'; state.services.naeil.status = 'production-verified'; Object.assign(state.services.jev, { status: 'manual-recovery', failure: state.failure }); }
    const reasons = { identity: 'identity-mismatch', stop: 'stop-requested', child: 'child-recovery-required', lock: 'lock-recovery-required', transaction: 'transaction-binding-mismatch' };
    if (reasons[variant]) state.services.naeil.failure = state.failure = { ...state.failure, reasonCode: reasons[variant] };
    if (variant === 'wrong-stage') state.services.naeil.failure = state.failure = { ...state.failure, stage: 'deploy' };
    core.writeLocalState(config.stateDirectory, state);
    let calls = 0;
    const result = await core.runLocal(config, { ...deps, verify: async () => { calls++; return { passed: true }; }, deploy() { assert.fail('native recovery authority'); } }, { command: 'verify', serviceId: id, recoverVerification: true }).catch(error => { assert.match(error.message, /recover|verif/i); return null; });
    assert.equal(calls, 0, variant);
    if (result) assert.notEqual(result.status, 'production-verified', variant);
    const receipts = readdirSync(join(config.stateDirectory, 'attempts')).map(name => JSON.parse(readFileSync(join(config.stateDirectory, 'attempts', name))));
    if (variant !== 'no-deployment') assert.equal(receipts.filter(value => value.kind === 'verification-recovery').length, 0, variant);
  }
});

for (const mode of ['throw', 'return']) for (const outcome of ['not-started', 'recovered']) test(`E native ${mode} ${outcome} preserves safe stage/status/timeout diagnostics`, async t => {
  const { directory, config } = fixture(t, [{ id: 'jev', mode: 'deploy' }]), deps = system(directory);
  config.retry.maxAttempts = 1;
  deps.deploy = async ({ plan, service, transaction }) => {
    const result = { outcome: outcome === 'recovered' ? 'failed' : outcome, reasonCode: 'native-http-status', stage: 'native-identity-http', status: 503, timeout: true, retryable: true };
    if (outcome === 'recovered') Object.assign(result, { recovered: true, artifact: transaction.previousArtifact, receipt: { schemaVersion: 1, releaseId: plan.release.releaseId, serviceId: service.id, attemptId: transaction.id, planSha256: core.planDigest(plan), action: 'deploy', safe: true, passed: false, outcome: 'failed', phase: 'recovered' } });
    if (mode === 'throw') throw Object.assign(Error('private native body'), result);
    return result;
  };
  const state = await core.runLocal(config, deps);
  assert.equal(state.failure.stage, 'native-identity-http'); assert.equal(state.failure.status, 503); assert.equal(state.failure.timeout, true);
  assert.deepEqual(state.services.jev.failure, state.failure); assert.equal(state.services.jev.stage, 'native-identity-http');
  const receipts = readdirSync(join(config.stateDirectory, 'attempts')).map(name => JSON.parse(readFileSync(join(config.stateDirectory, 'attempts', name))));
  assert(receipts.some(value => value.failure?.stage === 'native-identity-http' && value.failure.status === 503 && value.failure.timeout === true));
  assert.doesNotMatch(JSON.stringify(receipts), /private native body/);
  assert.equal(existsSync(config.lockFile), false);
});

test('R3 recovery records its receipt before STOP and retains normal inspect identity checks', async t => {
  for (const stopped of [false, true]) {
    const artifact = { id: 'previous', sourceRevision: 'b'.repeat(40), sha256: '1'.repeat(64) };
    const { directory, config } = fixture(t, [{ id: 'naeil', mode: 'verify-only', artifact }]), deps = system(directory);
    deps.verify = async () => { throw Object.assign(Error(), { stage: 'production-verify', reasonCode: 'session-rotation-uncertain', manualRecovery: true }); };
    const first = await core.runLocal(config, deps);
    if (stopped) writeFileSync(config.stopFile, 'stop');
    deps.inspect = async () => ({ artifact: { ...artifact, id: 'foreign' } });
    deps.verify = async () => assert.fail('recovery cannot bypass STOP or identity');
    const state = await core.runLocal(config, deps, { command: 'verify', serviceId: 'naeil', recoverVerification: true });
    assert.equal(state.failure.reasonCode, stopped ? 'stop-requested' : 'identity-mismatch');
    const receipts = readdirSync(join(config.stateDirectory, 'attempts')).map(name => JSON.parse(readFileSync(join(config.stateDirectory, 'attempts', name))));
    const recovery = receipts.find(value => value.kind === 'verification-recovery');
    assert(recovery); assert.deepEqual(recovery.priorFailure, first.failure);
    assert.equal(Object.keys(state.transactions).length, 0);
  }
});

test('status reads state without the machine lock while another owner holds it', async t => {
  const { directory, config } = fixture(t);
  await core.runLocal(config, system(directory), { command: 'prepare' });
  const { acquireMachineLock } = await import('./local-runtime.mjs'), lease = acquireMachineLock(config.lockFile);
  try {
    const before = readFileSync(join(config.stateDirectory, 'state.json'));
    assert.equal((await core.runLocal(config, {}, { command: 'status' })).services.jev.status, 'prepared');
    assert.deepEqual(readFileSync(join(config.stateDirectory, 'state.json')), before);
  } finally { lease.release(); }
});

test('verify before deployment reports nothing to verify without holding the later approved run', async t => {
  const { directory, config } = fixture(t), deps = system(directory);
  const verified = await core.runLocal(config, deps, { command: 'verify' });
  assert.equal(verified.status, 'ready'); assert.equal(verified.services.jev.status, 'not-started'); assert.equal(verified.services.naeil.status, 'production-verified');
  const skipped = readdirSync(join(config.stateDirectory, 'attempts')).map(name => JSON.parse(readFileSync(join(config.stateDirectory, 'attempts', name)))).filter(item => item.status === 'skipped');
  assert.deepEqual(skipped.map(item => [item.serviceId, item.reasonCode]), [['jev', 'no-deployment-to-verify']]);
  assert.equal((await core.runLocal(config, deps)).status, 'production-verified');
});

test('a STOP-cancelled verification recovery keeps the service latch and resumes only with the same command', async t => {
  const artifact = { id: 'previous', sourceRevision: 'b'.repeat(40), sha256: '1'.repeat(64) };
  const { directory, config } = fixture(t, [{ id: 'naeil', mode: 'verify-only', artifact }]), deps = system(directory);
  deps.verify = async () => { throw Object.assign(Error(), { stage: 'production-verify', reasonCode: 'session-refresh-locked', manualRecovery: true }); };
  await core.runLocal(config, deps); writeFileSync(config.stopFile, 'stop');
  assert.equal((await core.runLocal(config, deps, { command: 'verify', serviceId: 'naeil', recoverVerification: true })).status, 'stopped');
  unlinkSync(config.stopFile); let calls = 0; deps.verify = async () => { calls++; return { passed: true }; };
  for (const options of [{}, { retryHeld: true }, { command: 'verify', serviceId: 'naeil' }, { command: 'verify' }]) {
    const state = await core.runLocal(config, deps, options);
    assert.equal(state.status, 'manual-recovery'); assert.equal(state.failure.reasonCode, 'session-refresh-locked');
  }
  assert.equal(calls, 0);
  const resumed = await core.runLocal(config, deps, { command: 'verify', serviceId: 'naeil', recoverVerification: true });
  assert.equal(resumed.services.naeil.status, 'production-verified'); assert.equal(calls, 1);
});

test('a verifier child that outlived its stage resumes only through explicit verification recovery', async t => {
  const artifact = { id: 'previous', sourceRevision: 'b'.repeat(40), sha256: '1'.repeat(64) };
  for (const stage of ['verify', 'inspect']) {
    const { directory, config } = fixture(t, [{ id: 'naeil', mode: 'verify-only', artifact }]), deps = system(directory);
    deps[stage] = async () => { throw Object.assign(Error(), { reasonCode: 'child-recovery-required', manualRecovery: true }); };
    assert.equal((await core.runLocal(config, deps)).failure.reasonCode, 'child-recovery-required');
    const resumed = core.runLocal(config, system(directory), { command: 'verify', serviceId: 'naeil', recoverVerification: true });
    if (stage === 'verify') assert.equal((await resumed).services.naeil.status, 'production-verified');
    else await assert.rejects(resumed, /session\/verification failure/);
  }
});
