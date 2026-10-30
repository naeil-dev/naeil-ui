import assert from 'node:assert/strict';
import test from 'node:test';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import * as configAPI from './standing-config.mjs';

const { atomicJSON, fingerprint, hash } = configAPI;
const automationRoot = resolve(new URL('../..', import.meta.url).pathname);
function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'standing-launcher-'))); chmodSync(root, 0o700);
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const controlDirectory = join(root, 'control'), stateDirectory = join(root, 'epoch');
  for (const path of [controlDirectory, stateDirectory]) mkdirSync(path, { mode: 0o700 });
  const verifier = join(root, 'verifier.json'); atomicJSON(verifier, { schemaVersion: 1, synthetic: 'verifier' });
  const pin = path => ({ path, sha256: hash(readFileSync(path)), bytes: readFileSync(path).length });
  const configReferences = [pin(verifier)], config = { schemaVersion: 1, enabled: true, policy: { enabled: true, approvedBy: 'synthetic-owner', approvalRef: 'synthetic://standing', expiresAt: '2099-01-01', stopFile: join(root,'STOP') }, generationSha256: 'a'.repeat(64), stateDirectory, configReferences, configReferencesSha256: fingerprint(configReferences), generationControl: { controlDirectory, generationId: 'synthetic-v2', epochId: 'synthetic-epoch' } };
  config.automation = { root: automationRoot, sha256: configAPI.automationDigest(automationRoot) };
  const path = join(root, 'config.json'); atomicJSON(path, config);
  atomicJSON(join(stateDirectory, 'state.json'), { schemaVersion: 2, epochId: 'synthetic-epoch' });
  const plan = { kind:'standing-0.7.2-continuation', next:{generationId:'synthetic-v2',generationSha256:config.generationSha256,config:pin(path),configReferencesSha256:config.configReferencesSha256,stateDirectory,epochId:'synthetic-epoch'},previousApprovalSha256:'b'.repeat(64),release:{version:'0.7.2'},estimate:{priorAttemptId:'original',newAttemptId:'new'} };plan.planSha256=fingerprint(plan);
  const approval={schemaVersion:1,kind:'standing-continuation-approval',action:'continue-0.7.2-after-source-gate-failure',planSha256:plan.planSha256,generationSha256:config.generationSha256,previousApprovalSha256:plan.previousApprovalSha256,successorOf:plan.previousApprovalSha256,releaseSha256:fingerprint(plan.release),priorAttemptId:'original',attemptId:'new',approvedBy:'synthetic-owner',approvalRef:'synthetic://continuation',approvedAt:'2020-01-01',expiresAt:'2099-01-01',revoked:false};
  const planPath=join(controlDirectory,'plan.json'),approvalPath=join(controlDirectory,'approval.json');atomicJSON(planPath,plan);atomicJSON(approvalPath,approval);
  const pointer = { schemaVersion: 1, generationId: 'synthetic-v2', generationSha256: config.generationSha256, config: pin(path), configReferencesSha256: config.configReferencesSha256, stateDirectory, epochId: 'synthetic-epoch', authorizationSha256: fingerprint(approval), transitionPlanSha256: plan.planSha256 };
  atomicJSON(join(controlDirectory,'transition.json'),{schemaVersion:1,oldPointer:null,imported:null,validatedState:null,proof:null,phase:'completed',newPointer:pointer,planSha256:plan.planSha256,approvalSha256:fingerprint(approval),plan:pin(planPath),approval:pin(approvalPath)});
  atomicJSON(join(controlDirectory, 'active.json'), pointer);
  const fence = { controlDirectory, pointerSha256: hash(readFileSync(join(controlDirectory, 'active.json'))) };
  return { root, config, controlDirectory, stateDirectory, pointer, fence, verifier, pin };
}

test('active generation binds the exact config, manifest, epoch and immutable pointer for each worker', t => {
  const f = fixture(t);
  assert.doesNotThrow(() => configAPI.assertGenerationFence({ ...f.config, generationFence: f.fence }));
  const changed = { ...f.pointer, generationId: 'successor' }; atomicJSON(join(f.controlDirectory, 'active.json'), changed);
  assert.throws(() => configAPI.assertGenerationFence({ ...f.config, generationFence: f.fence }), /generation|pointer/i);
});

test('pending transition, config drift and referenced verifier drift prohibit work before any callback', async t => {
  const launcher = await import('./standing-launcher.mjs').catch(() => ({}));
  for (const cause of ['pending', 'config', 'verifier', 'epoch']) {
    const f = fixture(t); let called = false;
    if (cause === 'pending') atomicJSON(join(f.controlDirectory, 'transition.json'), { phase: 'prepared' });
    if (cause === 'config') atomicJSON(f.pointer.config.path, { ...f.config, changed: true });
    if (cause === 'verifier') atomicJSON(f.verifier, { changed: true });
    if (cause === 'epoch') atomicJSON(join(f.stateDirectory, 'state.json'), { schemaVersion: 2, epochId: 'foreign' });
    await assert.rejects(async () => launcher.runActiveGeneration(f.controlDirectory, { poll: () => { called = true; } }));
    assert.equal(called, false);
    const heartbeat = JSON.parse(readFileSync(join(f.controlDirectory, 'launcher-status.json')));
    assert.equal(heartbeat.state, 'refused'); assert.equal(heartbeat.exitCode, 1);
  }
});

test('launcher heartbeats survive unreadable dispatcher state and never steal an existing control lock', async t => {
  const launcher = await import('./standing-launcher.mjs').catch(() => ({})), f = fixture(t);
  await assert.rejects(() => launcher.runActiveGeneration(f.controlDirectory, { poll: async () => { throw Error('synthetic unreadable state'); } }));
  const heartbeat = JSON.parse(readFileSync(join(f.controlDirectory, 'launcher-status.json')));
  assert.equal(heartbeat.state, 'failed'); assert.equal(heartbeat.exitCode, 1); assert(heartbeat.startedAt && heartbeat.endedAt);
  assert(!existsSync(join(f.controlDirectory, 'control.lock')));
  atomicJSON(join(f.controlDirectory, 'control.lock'), { retained: true });
  const before = readFileSync(join(f.controlDirectory, 'control.lock'));
  await assert.rejects(() => launcher.runActiveGeneration(f.controlDirectory, { poll: () => assert.fail('locked launcher dispatched') }));
  assert.deepEqual(readFileSync(join(f.controlDirectory, 'control.lock')), before);
});

test('IF1 active launcher records the exact pointer and completed journal in its first control acquisition', async t => {
  const f = fixture(t), launcher = await import('./standing-launcher.mjs'); let called = false;
  await launcher.runActiveGeneration(f.controlDirectory, { poll: async () => {
    called = true;
    const lock = configAPI.readPrivateJSON(join(f.controlDirectory, 'control.lock'));
    assert.deepEqual(lock.acquisition, { kind: 'standing-active-generation-acquisition', pointer: f.pin(join(f.controlDirectory, 'active.json')), journal: f.pin(join(f.controlDirectory, 'transition.json')) });
    return { state: 'stopped' };
  } });
  assert(called); assert(!existsSync(join(f.controlDirectory, 'control.lock')));
});

test('an active file without its completed approved journal is never execution authority', t=>{
  const f=fixture(t);rmSync(join(f.controlDirectory,'transition.json'));
  assert.throws(()=>configAPI.assertGenerationFence({...f.config,generationFence:f.fence}),/journal|transition/i);
});

test('STOP during admitted work permits fenced completion evidence and independently refuses each new action',t=>{
  const f=fixture(t),request={...f.config,generationFence:f.fence};
  assert.doesNotThrow(()=>configAPI.assertGenerationExecution(request));
  atomicJSON(f.config.policy.stopFile,{reason:'synthetic owner stop'});
  assert.doesNotThrow(()=>configAPI.assertGenerationFence(request));
  assert.throws(()=>configAPI.assertGenerationExecution(request),/STOP/);
});

test('I2: a stale executing launcher refuses before entering its dispatcher while the approved root is intact', async t => {
  const f = fixture(t), staleRoot = join(f.root, 'stale-copy'), scripts = join(staleRoot, 'scripts', 'rollout');
  mkdirSync(scripts, { recursive: true, mode: 0o700 });
  for (const relative of configAPI.AUTOMATION_FILES) {
    const destination=join(staleRoot,relative);mkdirSync(dirname(destination),{recursive:true,mode:0o700});
    cpSync(join(automationRoot,relative),destination);
  }
  const entered = join(f.root, 'stale-dispatcher-entered');
  writeFileSync(join(scripts, 'standing-dispatcher.mjs'), `import {writeFileSync} from 'node:fs'; export async function poll() {writeFileSync(${JSON.stringify(entered)}, 'entered');return {state:'stopped'};}`);
  const stale = await import(pathToFileURL(join(scripts, 'standing-launcher.mjs')).href);
  await assert.rejects(() => stale.runActiveGeneration(f.controlDirectory));
  assert(!existsSync(entered), 'The stale imported dispatcher must never be entered');
  assert.equal(configAPI.automationDigest(automationRoot), f.config.automation.sha256);
  assert.equal(JSON.parse(readFileSync(join(f.controlDirectory, 'launcher-status.json'))).state, 'refused');
});
