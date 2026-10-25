import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync, rmSync, realpathSync, chmodSync, symlinkSync, linkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, test } from 'node:test';
import { createArtifact, runStanding, assertVerification, installDependencies, installedPackage } from './estimate-standing-adapter.mjs';
import { routeKey } from './standing-config.mjs';

const hash = value => createHash('sha256').update(value).digest('hex');
let root, input, config, calls, dependencies, candidate, current;
const put = (path, value) => writeFileSync(path, typeof value === 'string' ? value : JSON.stringify(value) + '\n', { mode: 0o600 });
function release(version, source = 'a'.repeat(40)) {
  const path = join(root, 'ui-' + version + '.tgz'); put(path, 'synthetic-ui-' + version);
  const archive = { path, sha256: hash(readFileSync(path)), url: 'https://example.test/v' + version + '/ui.tgz' };
  const reference = { schemaVersion: 1, kind: 'independent-release-render', frozen: true, archiveSha256: archive.sha256, sourceRevision: source, ui: { version, contractVersion: '1' }, cases: [{}] };
  const frame = join(root, 'frame-' + version + '.json'); put(frame, reference);
  const account = join(root, 'account-' + version + '.json'); put(account, { ...reference, kind: 'independent-account-render' });
  return { schemaVersion: 1, releaseId: 'ui-' + version, version, previousVersion: version === '0.7.1' ? '0.6.0' : '0.7.1', sourceRevision: source, changes: ['fix'], archive, contract: { path: frame, sha256: hash(readFileSync(frame)), version: '1' }, account: { path: account, sha256: hash(readFileSync(account)) } };
}
function nativeRelease(name, version, source) {
  const directory = join(root, name); mkdirSync(join(directory, 'app/.next'), { recursive: true, mode: 0o700 });
  const artifactId = name + '-build';
  put(join(directory, 'app/server.js'), '// synthetic unchanged application');
  put(join(directory, 'app/.next/BUILD_ID'), artifactId);
  const identity = { schemaVersion: 1, appId: 'abestimate', artifactId, sourceRevision: source, ui: { version, contractVersion: '1' } };
  const manifest = { schemaVersion: 1, releaseId: source.slice(0, 12) + '-' + hash(name).slice(0, 12), node: 'v24.21.0', sourceCommit: source, buildId: artifactId, serverPath: 'app/server.js', runtimeDataIncluded: false, uiBuildIdentity: identity,
    sourceFiles: { 'src/server/naeil-shared-session.ts': hash('session'), 'src/server/naeil-auth-client.ts': hash('grant'), ['vendor/naeil-ui-' + version + '.tgz']: hash('synthetic-ui-' + version) },
    packageVersions: { '@naeil/ui': 'file:vendor/naeil-ui-' + version + '.tgz' },
    artifactFiles: { '.next/BUILD_ID': hash(artifactId), 'server.js': hash('// synthetic unchanged application') } };
  put(join(directory, 'manifest.json'), manifest);
  return { directory, releaseId: manifest.releaseId, manifestSha256: hash(readFileSync(join(directory, 'manifest.json'))), artifactId, sourceRevision: source, ui: identity.ui };
}
function verified(request) {
  return { schemaVersion: 1, releaseId: request.release.releaseId, serviceId: request.service.id, idempotencyKey: request.idempotencyKey, attemptId: request.attemptId, phase: request.phase, passed: true,
    identity: request.expectedIdentity, archiveSha256: request.release.archive.sha256, referenceSha256: request.release.contract.sha256, accountReferenceSha256: request.release.account.sha256, checkedAt: new Date().toISOString(),
    routes: request.service.routes.map(route => ({ path: route.path, routeKey: routeKey(route), passed: true })) };
}
beforeEach(() => {
  root = realpathSync(mkdtempSync(join(tmpdir(), 'estimate-standing-')));
  for (const dir of ['state', 'artifacts', 'worktree', 'native-state', 'bin']) mkdirSync(join(root, dir), { mode: 0o700 });
  mkdirSync(join(root, 'worktree/ops'), { mode: 0o700 });
  const bridge = join(root, 'worktree/ops/code-activation.mts'); put(bridge, '// synthetic reviewed bridge');
  const loader = join(root, 'durable-loader.mjs'); put(loader, '// immutable loader');
  const helper = join(root, 'dispatcher-helper.mjs'); put(helper, '// immutable full dispatcher closure');
  const executables = Object.fromEntries(['node', 'pnpm', 'git'].map(name => { const file = join(root, 'bin', name); put(file, 'synthetic ' + name); chmodSync(file, 0o700); return [name, file]; }));
  executables.tar = realpathSync('/usr/bin/tar');
  current = nativeRelease('current', '0.7.1', 'a'.repeat(40)); candidate = nativeRelease('candidate', '0.7.2', 'b'.repeat(40));
  const released = release('0.7.1');
  input = { schemaVersion: 1, release: released, service: { id: 'estimate', appId: 'abestimate', origin: 'https://abestimate.naeil.dev', routes: [{ path: '/', state: 'authenticated' }, { path: '/login', state: 'anonymous' }], verification: { command: { file: executables.node, args: [], timeoutMs: 1000 } } },
    policy: { schemaVersion: 1, enabled: true, approvedBy: 'synthetic-owner', approvalRef: 'synthetic://standing', expiresAt: new Date(Date.now() + 3600000).toISOString(), services: ['naeil', 'estimate', 'jev'], stopFile: join(root, 'STOP'), maxEvidenceAgeSeconds: 60, rollbackApproved: true, rollbackScope: 'code-only',
      patchWindow: { minVersion: '0.7.2', maxVersion: '0.7.99', contractVersion: '1', startsAt: new Date(Date.now() - 1000).toISOString(), expiresAt: new Date(Date.now() + 3600000).toISOString(), approvedBy: 'synthetic-owner', approvalRef: 'synthetic://standing', reason: 'authorized fixes', services: ['estimate'] } },
    idempotencyKey: 'synthetic:ui-0.7.1:estimate', attemptId: 'adopt-1', mode: 'adopt', trustedFiles: { [helper]: hash(readFileSync(helper)) } };
  config = { schemaVersion: 1, enabled: true, serviceId: 'estimate', appId: 'abestimate', origin: input.service.origin, worktree: join(root, 'worktree'), branch: 'rollout/standing', reviewedSourceRevision: 'e'.repeat(40), pnpmVersion: '10.30.3', executionPath: join(root, 'bin') + ':/usr/bin:/bin:/usr/sbin:/sbin', executables,
    bridgePath: bridge, tsxPath: loader, bridgeSha256: hash(readFileSync(bridge)), trustedFiles: Object.fromEntries([...Object.values(executables), bridge, loader].map(path => [path, hash(readFileSync(path))])),
    stateDirectory: join(root, 'state'), artifactDirectory: join(root, 'artifacts'), currentBaseline: current,
    baselineRelease: { releaseId: released.releaseId, version: '0.7.1', sourceRevision: released.sourceRevision, archiveSha256: released.archive.sha256, referenceSha256: released.contract.sha256, accountReferenceSha256: released.account.sha256 },
    activation: { schemaVersion: 1, enabled: true, serviceId: 'estimate', appId: 'abestimate', nodePath: executables.node, stateDirectory: join(root, 'native-state'), stopFile: input.policy.stopFile, deploymentRoot: join(root, 'deploy'), dataDirectory: join(root, 'data'), runtimeEnvironmentSha256: { APP_ORIGIN: hash(input.service.origin), NAEIL_SUPABASE_URL: hash('synthetic URL'), NAEIL_SUPABASE_ANON_KEY: hash('synthetic key') } } };
  calls = [];
  dependencies = {
    native: async (action, request) => { calls.push(action); const ref = action === 'inspect' ? request.config.current : action === 'rollback' ? request.config.previous : request.config.candidate; return { schemaVersion: 1, releaseId: request.releaseId, serviceId: 'estimate', idempotencyKey: request.idempotencyKey, attemptId: request.attemptId, action, passed: true, nativeReleaseId: ref.releaseId, artifactId: ref.artifactId, ...(action === 'inspect' ? { mutationAttempted: false } : action === 'deploy' ? { deploymentId: ref.releaseId } : { activated: true, preservationVerified: true }) }; },
    verify: async request => { calls.push('verify:' + request.phase); return verified(request); },
    command: async (_file, args) => { calls.push('command:' + args.join(' ')); return { stdout: args[0] === '--version' ? 'v24.21.0' : args[0] === 'branch' ? config.branch : args[0] === 'rev-parse' ? candidate.sourceRevision : '', stderr: '' }; },
    update: async () => { calls.push('update'); return { uiVersion: '0.7.2', archiveSha256: input.release.archive.sha256, dependencyExact: true, sourceRevision: candidate.sourceRevision }; },
    packageCheck: async () => 'synthetic verified installed files',
    package: async () => { calls.push('package'); return createArtifact(candidate, config); },
    onError: error => { dependencies.lastError = error; },
  };
  config.executables.tar = realpathSync('/usr/bin/tar');
});
afterEach(() => rmSync(root, { recursive: true, force: true }));
async function adopt() { const result = await runStanding(input, config, dependencies); assert.equal(result.state, 'production-verified', dependencies.lastError?.stack ?? result.reason); return result; }
function standing() {
  input = { ...input, release: release('0.7.2', 'c'.repeat(40)), mode: 'standing', attemptId: 'standing-2', idempotencyKey: 'synthetic:ui-0.7.2:estimate' };
  const original = dependencies.command;
  dependencies.command = async (file, args, opts) => args[0] === '--version' ? { stdout: file === config.executables.node ? 'v24.21.0' : '10.30.3', stderr: '' } : original(file, args, opts);
  calls.length = 0;
}

test('adopts actual UI0.7.1 without a predecessor, dependency update or activation', async () => {
  const result = await adopt(); assert.equal(result.mutationAttempted, false);
  assert.deepEqual(calls, ['inspect', 'verify:adopt', 'inspect']);
  assert.equal(result.artifact.id, current.artifactId); assert.equal(result.production.identity.artifactId, current.artifactId);
  assert(existsSync(result.artifact.path)); assert(result.artifact.storageRef.includes(result.artifact.sha256));
  assert.equal(JSON.parse(readFileSync(join(config.stateDirectory, 'baseline.json'))).artifact.id, current.artifactId);
});
test('rejects mismatched account provenance before native inspection', async () => {
  const account = JSON.parse(readFileSync(input.release.account.path)); account.sourceRevision = 'f'.repeat(40); put(input.release.account.path, account); input.release.account.sha256 = hash(readFileSync(input.release.account.path));
  const result = await runStanding(input, config, dependencies); assert.equal(result.state, 'gate-failed'); assert.deepEqual(calls, []);
});
test('refuses a historical password artifact without the current shared-session source', async () => {
  const path = join(current.directory, 'manifest.json'), manifest = JSON.parse(readFileSync(path)); delete manifest.sourceFiles['src/server/naeil-shared-session.ts']; put(path, manifest); current.manifestSha256 = hash(readFileSync(path));
  const result = await runStanding(input, config, dependencies); assert.equal(result.state, 'gate-failed'); assert(!calls.includes('verify:adopt'));
});
test('STOP and an existing lock defer safely without native calls', async () => {
  put(input.policy.stopFile, 'stop'); let result = await runStanding(input, config, dependencies); assert.equal(result.state, 'deferred'); assert.equal(result.mutationAttempted, false); assert.deepEqual(calls, []);
  rmSync(input.policy.stopFile); put(join(config.stateDirectory, 'running.lock'), 'unresolved');
  result = await runStanding(input, config, dependencies); assert.equal(result.state, 'deferred'); assert.equal(result.mutationAttempted, false); assert.deepEqual(calls, []);
});
test('rejects response binding, stale evidence and missing authenticated route receipts', async () => {
  await adopt(); const request = { ...input, phase: 'adopt', artifact: (JSON.parse(readFileSync(join(config.stateDirectory, 'baseline.json')))).artifact };
  request.expectedIdentity = { schemaVersion: 1, appId: 'abestimate', artifactId: request.artifact.id, sourceRevision: request.artifact.sourceRevision, ui: request.artifact.ui };
  for (const override of [{ attemptId: 'wrong' }, { phase: 'production' }, { archiveSha256: '0'.repeat(64) }, { checkedAt: '2000-01-01T00:00:00Z' }, { routes: [verified(request).routes[1]] }]) assert.throws(() => assertVerification({ ...verified(request), ...override }, request));
});
test('failed read-only adoption preserves evidence and permits a fresh verification attempt', async () => {
  dependencies.verify = async () => { throw new Error('synthetic verifier failure'); };
  let result = await runStanding(input, config, dependencies); assert.equal(result.state, 'gate-failed'); assert(!existsSync(join(config.stateDirectory, 'baseline.json')));
  calls.length = 0; input.attemptId = 'another-attempt'; dependencies.verify = async request => verified(request); result = await runStanding(input, config, dependencies); assert.equal(result.state, 'production-verified'); assert.equal(result.mutationAttempted, false); assert.deepEqual(calls, ['inspect', 'inspect']);
});
test('standing requires a verified baseline', async () => {
  standing(); const result = await runStanding(input, config, dependencies); assert.equal(result.state, 'gate-failed'); assert(!calls.includes('update'));
});
test('runs all build gates before staging and binds activation to the verified predecessor', async () => {
  await adopt(); standing(); const result = await runStanding(input, config, dependencies); assert.equal(result.state, 'production-verified', dependencies.lastError?.stack ?? result.reason);
  for (const stage of ['update', 'command:run typecheck', 'command:run lint', 'command:run test --maxWorkers=1', 'command:run build', 'package', 'deploy', 'activate', 'verify:production']) assert(calls.includes(stage), 'Missing ' + stage);
  assert(calls.indexOf('deploy') > calls.indexOf('package')); assert(calls.indexOf('activate') > calls.indexOf('deploy')); assert.equal(result.previousArtifact.id, current.artifactId);
});
test('rejects contract/API patches before updater mutations', async () => {
  await adopt(); standing(); input.release.changes = ['api']; const result = await runStanding(input, config, dependencies); assert.equal(result.state, 'gate-failed'); assert(!calls.includes('update'));
});
test('a DOM patch runs only with an owner-approved migration of this exact release', async () => {
  await adopt(); standing(); input.release.changes = ['dom'];
  assert.equal((await runStanding(input, config, dependencies)).state, 'gate-failed'); assert(!calls.includes('update'));
  const { releaseId, version, sourceRevision, changes } = input.release;
  input.policy.reviewedMigration = { releaseId, version, sourceRevision, changes, archiveSha256: input.release.archive.sha256, services: ['estimate'], approvedBy: 'owner', approvalRef: 'migration-approval', reason: 'Reviewed header catalog change', expiresAt: new Date(Date.now() + 86400000).toISOString() };
  input.attemptId = 'attempt-migration'; input.idempotencyKey += '-migration';
  const result = await runStanding(input, config, dependencies); assert.equal(result.state, 'production-verified', dependencies.lastError?.stack ?? result.reason);
});
test('source test failure leaves production alone and is never deferred', async () => {
  await adopt(); standing(); const original = dependencies.command; dependencies.command = async (...args) => { if (args[1].join(' ') === 'run test --maxWorkers=1') throw new Error('test failed'); return original(...args); };
  const result = await runStanding(input, config, dependencies); assert.equal(result.state, 'gate-failed'); assert.equal(result.mutationAttempted, true); assert(!calls.includes('deploy')); assert(!calls.includes('activate'));
});
test('lost activation result retains lock and prevents replay or automatic rollback', async () => {
  await adopt(); standing(); const original = dependencies.native; dependencies.native = async (action, request) => { if (action === 'activate') { calls.push(action); throw new Error('lost response after invocation'); } return original(action, request); };
  const result = await runStanding(input, config, dependencies); assert.equal(result.state, 'activation-pending'); assert(existsSync(join(config.stateDirectory, 'running.lock'))); assert(!calls.includes('rollback'));
  assert.equal(JSON.parse(readFileSync(join(config.stateDirectory, 'attempts/standing-2/native-activate/dispatch.json'))).state, 'invoked');
});
test('failed production verification rolls code back to the verified shared-session baseline', async () => {
  await adopt(); standing(); dependencies.verify = async request => { calls.push('verify:' + request.phase); if (request.phase === 'production') throw new Error('new production differs'); return verified(request); };
  const result = await runStanding(input, config, dependencies); assert.equal(result.state, 'gate-failed'); assert.equal(result.rollback.state, 'production-verified'); assert(calls.includes('rollback')); assert(calls.includes('verify:rollback')); assert(!existsSync(join(config.stateDirectory, 'running.lock')));
  assert.equal(JSON.parse(readFileSync(join(config.stateDirectory, 'baseline.json'))).artifact.id, current.artifactId);
});
test('a maximum-length attempt ID still permits an authorized code rollback', async () => {
  await adopt(); standing(); input.attemptId = 'a'.repeat(100);
  dependencies.verify = async request => { if (request.phase === 'production') throw new Error('new production differs'); return verified(request); };
  const original = dependencies.native, operationIds = [];
  dependencies.native = async (action, request) => {
    assert.match(request.approval.operationId, /^[-a-zA-Z0-9_.]{1,100}$/, 'Native approval ID must remain within its accepted bound');
    operationIds.push(request.approval.operationId);
    return original(action, request);
  };
  const result = await runStanding(input, config, dependencies);
  assert.equal(result.state, 'gate-failed'); assert.equal(result.rollback.state, 'production-verified');
  assert(calls.includes('rollback')); assert(!existsSync(join(config.stateDirectory, 'running.lock')));
  assert.equal(new Set(operationIds).size, operationIds.length, 'Each native action retains a distinct approval ID');
});
test('uncertain rollback retains the durable pending state', async () => {
  await adopt(); standing(); dependencies.verify = async request => { if (request.phase === 'production') throw new Error('failed production'); return verified(request); };
  const original = dependencies.native; dependencies.native = async (action, request) => { if (action === 'rollback') throw new Error('rollback result lost'); return original(action, request); };
  const result = await runStanding(input, config, dependencies); assert.equal(result.state, 'activation-pending'); assert(existsSync(join(config.stateDirectory, 'running.lock')));
});
test('rejects changed artifact bytes and never archives private data', async () => {
  put(join(current.directory, 'app/credential.json'), 'synthetic forbidden private file');
  await assert.rejects(createArtifact(current, config), /[Ff]orbidden|[Pp]rivate/);
  rmSync(join(current.directory, 'app/credential.json')); put(join(current.directory, 'app/server.js'), 'changed');
  await assert.rejects(createArtifact(current, config), /[Ii]nventory|[Hh]ash/);
  assert.deepEqual(readdirSync(config.artifactDirectory), []);
});
test('isolated installs retain development tools even under production NODE_ENV', () => {
  const log = join(root, 'install-log.jsonl');
  put(config.executables.pnpm, '#!' + process.execPath + '\n' + "require('node:fs').appendFileSync(" + JSON.stringify(log) + ", JSON.stringify({args:process.argv.slice(2),nodeEnv:process.env.NODE_ENV})+'\\n');\n");
  chmodSync(config.executables.pnpm, 0o700);
  installDependencies(config);
  const runs = readFileSync(log, 'utf8').trim().split('\n').map(line => JSON.parse(line));
  assert.equal(runs.length, 2);
  for (const run of runs) { assert.equal(run.nodeEnv, 'production'); assert(run.args.includes('--prod=false')); assert(run.args.includes('--ignore-scripts')); }
  assert(runs[0].args.includes('--no-frozen-lockfile')); assert(runs[1].args.includes('--frozen-lockfile'));
});
test('rehashes the full dispatcher closure immediately before a verifier call', async () => {
  const original = dependencies.native;
  dependencies.native = async (action, request) => {
    const response = await original(action, request);
    if (action === 'inspect') put(Object.keys(input.trustedFiles)[0], 'changed after successful inspection');
    return response;
  };
  const result = await runStanding(input, config, dependencies);
  assert.equal(result.state, 'gate-failed'); assert.equal(result.mutationAttempted, false);
  assert(!calls.includes('verify:adopt')); assert(!existsSync(join(config.stateDirectory, 'baseline.json')));
});

test('F2 regression: pre-mutation STOP records terminal deferral and preserves history on retry', async () => {
  await adopt(); standing();
  const original = dependencies.native;
  dependencies.native = async (action, request) => {
    const response = await original(action, request);
    if (action === 'inspect') put(input.policy.stopFile, 'synthetic STOP after inspect');
    return response;
  };
  const first = await runStanding(input, config, dependencies);
  assert.equal(first.state, 'deferred'); assert.equal(first.mutationAttempted, false);
  assert(!calls.includes('update')); assert(!calls.includes('activate'));
  rmSync(input.policy.stopFile); dependencies.native = original;
  const key = join(config.stateDirectory, 'keys', hash(input.idempotencyKey) + '.json');
  assert.equal(JSON.parse(readFileSync(key)).state, 'deferred');
  calls.length = 0;
  const second = await runStanding({ ...input, attemptId: 'retry-after-stop' }, config, dependencies);
  assert.equal(second.state, 'production-verified', dependencies.lastError?.stack);
  assert(calls.includes('activate'));
  const history = readdirSync(join(config.stateDirectory, 'keys')).filter(name => name.includes('.history-'));
  assert.equal(history.length, 1);
  assert.equal(JSON.parse(readFileSync(join(config.stateDirectory, 'keys', history[0]))).state, 'deferred');
});

async function activationFailure({ pointer = 'to', markerChange, stop = false, recoverFails = false, markerMode, policyChange, responseChange } = {}) {
  await adopt(); standing();
  const releases = join(config.activation.deploymentRoot, 'releases');
  mkdirSync(releases, { recursive: true, mode: 0o700 });
  for (const ref of [current, candidate]) mkdirSync(join(releases, ref.releaseId), { mode: 0o700 });
  if (pointer === 'elsewhere') mkdirSync(join(releases, 'elsewhere'), { mode: 0o700 });
  symlinkSync(join(releases, pointer === 'from' ? current.releaseId : pointer === 'to' ? candidate.releaseId : 'elsewhere'), join(config.activation.deploymentRoot, 'current'));
  const original = dependencies.native;
  let recovered;
  dependencies.native = async (action, request) => {
    if (action === 'activate') {
      calls.push(action);
      const marker = { operationId: request.approval.operationId, action: 'activate', from: current.releaseId, to: candidate.releaseId, phase: 'bootstrap-requested' };
      markerChange?.(marker);
      const path = join(config.activation.stateDirectory, 'operation.json'); put(path, marker);
      if (markerMode === 'public') chmodSync(path, 0o644);
      if (markerMode === 'hardlink') linkSync(path, join(root, 'marker-alias'));
      if (stop) put(input.policy.stopFile, 'STOP');
      policyChange?.(input.policy);
      throw new Error('synthetic interrupted activate');
    }
    if (action !== 'recover') return original(action, request);
    calls.push(action); recovered = request;
    assert.equal(request.approval.action, 'recover');
    assert.equal(request.approval.recoveryMarkerSha256, hash(readFileSync(join(config.activation.stateDirectory, 'operation.json'))));
    assert.equal(request.approval.expectedCurrentReleaseId, pointer === 'from' ? current.releaseId : candidate.releaseId);
    assert.equal(request.approval.targetReleaseId, current.releaseId);
    assert.equal(request.config.current.releaseId, request.approval.expectedCurrentReleaseId);
    assert.equal(request.config.previous.releaseId, current.releaseId);
    assert.equal(request.config.candidate.releaseId, candidate.releaseId);
    if (recoverFails) throw new Error('synthetic lost recovery response');
    const response = { schemaVersion: 1, releaseId: request.releaseId, serviceId: 'estimate', idempotencyKey: request.idempotencyKey, attemptId: request.attemptId, action, passed: true, activated: true, preservationVerified: true, nativeReleaseId: current.releaseId, artifactId: current.artifactId };
    responseChange?.(response); return response;
  };
  return { result: await runStanding(input, config, dependencies), recovered };
}
for (const pointer of ['from', 'to']) test('F1 deterministic recovery verifies baseline with pointer at ' + pointer, async () => {
  const { result, recovered } = await activationFailure({ pointer });
  assert(recovered); assert.equal(result.state, 'gate-failed'); assert.equal(result.runtimeMutationAttempted, true);
  assert.equal(result.rollback.state, 'production-verified'); assert.equal(result.rollback.mode, 'recover');
  assert.equal(result.rollback.production.identity.artifactId, current.artifactId);
  assert(calls.includes('verify:rollback')); assert(!calls.includes('rollback'));
  assert(!existsSync(join(config.stateDirectory, 'running.lock')));
  assert.equal(JSON.parse(readFileSync(join(config.stateDirectory, 'baseline.json'))).artifact.id, current.artifactId);
});
for (const [name, options] of [
  ['foreign operation', { markerChange: marker => { marker.operationId = 'another-operation'; } }],
  ['foreign action', { markerChange: marker => { marker.action = 'rollback'; } }],
  ['foreign predecessor', { markerChange: marker => { marker.from = candidate.releaseId; } }],
  ['foreign candidate', { markerChange: marker => { marker.to = current.releaseId; } }],
  ['completed phase', { markerChange: marker => { marker.phase = 'completed'; } }],
  ['pointer elsewhere', { pointer: 'elsewhere' }],
  ['STOP', { stop: true }],
  ['public marker', { markerMode: 'public' }],
  ['linked marker', { markerMode: 'hardlink' }],
  ['unapproved recovery', { policyChange: policy => { policy.rollbackApproved = false; } }],
  ['expired authorization', { policyChange: policy => { policy.expiresAt = '2000-01-01'; } }],
  ['foreign rollback scope', { policyChange: policy => { policy.rollbackScope = 'restore-data'; } }],
]) test('F1 refuses recovery for ' + name + ' and retains the pending lock', async () => {
  const { result, recovered } = await activationFailure(options);
  assert.equal(result.state, 'activation-pending'); assert(!recovered); assert(!calls.includes('recover'));
  assert(existsSync(join(config.stateDirectory, 'running.lock'))); assert(existsSync(join(config.activation.stateDirectory, 'operation.json')));
});
test('F1 uncertain recover keeps activation-pending without browser success', async () => {
  const { result, recovered } = await activationFailure({ recoverFails: true });
  assert(recovered); assert.equal(result.state, 'activation-pending'); assert.equal(result.rollback.state, 'activation-pending');
  assert(!calls.includes('verify:rollback')); assert(existsSync(join(config.stateDirectory, 'running.lock')));
});
test('F8 STOP accompanying a refused read-only inspect defers without consuming the retry', async () => {
  dependencies.native = async () => { put(input.policy.stopFile, 'STOP'); throw new Error('inspect refused'); };
  const result = await runStanding(input, config, dependencies);
  assert.equal(result.state, 'deferred'); assert.equal(result.mutationAttempted, false); assert.equal(result.runtimeMutationAttempted, false);
  const ledger = JSON.parse(readFileSync(join(config.stateDirectory, 'keys', hash(input.idempotencyKey) + '.json')));
  assert.equal(ledger.state, 'deferred'); assert.equal(ledger.runtimeMutationAttempted, false);
});
test('F8 STOP after source update is gate-failed with runtime untouched', async () => {
  await adopt(); standing(); const update = dependencies.update;
  dependencies.update = async (...args) => { const updated = await update(...args); put(input.policy.stopFile, 'STOP'); return updated; };
  const result = await runStanding(input, config, dependencies);
  assert.equal(result.state, 'gate-failed'); assert.equal(result.reasonCode, 'stopped-after-source-update');
  assert.equal(result.mutationAttempted, true); assert.equal(result.runtimeMutationAttempted, false);
  assert(!calls.includes('deploy')); assert(!calls.includes('command:run typecheck'));
});
test('F2 source-only gate failure requires reconciliation for the exact prior attempt', async () => {
  await adopt(); standing(); const command = dependencies.command;
  dependencies.command = async (...args) => { if (args[1].join(' ') === 'run typecheck') throw new Error('synthetic typecheck'); return command(...args); };
  const first = await runStanding(input, config, dependencies);
  assert.equal(first.state, 'gate-failed'); assert.equal(first.runtimeMutationAttempted, false);
  const priorAttemptId = input.attemptId; calls.length = 0; dependencies.command = command;
  for (const reconciliation of [undefined, { priorAttemptId: 'foreign' }]) {
    const result = await runStanding({ ...input, attemptId: 'unapproved-retry', reconciliation }, config, dependencies);
    assert.equal(result.state, 'review-required'); assert.deepEqual(calls, []);
  }
  const result = await runStanding({ ...input, attemptId: 'approved-retry', reconciliation: { priorAttemptId } }, config, dependencies);
  assert.equal(result.state, 'production-verified', dependencies.lastError?.stack);
  assert.equal(readdirSync(join(config.stateDirectory, 'keys')).filter(name => name.includes('.history-')).length, 1);
});
for (const [name, prior] of [
  ['nonterminal', { state: 'invoked', mutationAttempted: false, runtimeMutationAttempted: false }],
  ['runtime-mutated', { state: 'gate-failed', mutationAttempted: true, runtimeMutationAttempted: true }],
  ['verified', { state: 'production-verified', mutationAttempted: false, runtimeMutationAttempted: false }],
]) test('F2 ledger ' + name + ' requires review and is preserved byte-for-byte', async () => {
  const keys = join(config.stateDirectory, 'keys'); mkdirSync(keys, { mode: 0o700 });
  const path = join(keys, hash(input.idempotencyKey) + '.json'); put(path, { ...prior, idempotencyKey: input.idempotencyKey, attemptId: 'prior-attempt' });
  const bytes = readFileSync(path);
  const result = await runStanding({ ...input, reconciliation: { priorAttemptId: 'prior-attempt' } }, config, dependencies);
  assert.equal(result.state, 'review-required'); assert.deepEqual(calls, []); assert.deepEqual(readFileSync(path), bytes);
});

for (const [name, responseChange] of [
  ['missing preservation proof', response => { response.preservationVerified = false; }],
  ['wrong baseline identity', response => { response.artifactId = candidate.artifactId; }],
]) test('F1 recovery ' + name + ' retains pending without rollback browser verification', async () => {
  const { result, recovered } = await activationFailure({ responseChange });
  assert(recovered); assert.equal(result.state, 'activation-pending'); assert(!calls.includes('verify:rollback'));
  assert(existsSync(join(config.stateDirectory, 'running.lock')));
});

test('installed UI check accepts only pnpm .bin shims beside the exact frozen files', async () => {
  const { execFileSync } = await import('node:child_process');
  const source = join(root, 'pack'); mkdirSync(join(source, 'package/dist'), { recursive: true });
  put(join(source, 'package/package.json'), { name: '@naeil/ui', version: '0.7.2' }); put(join(source, 'package/dist/index.js'), 'export {};');
  const archive = join(root, 'naeil-ui-0.7.2.tgz'); execFileSync('/usr/bin/tar', ['-czf', archive, '-C', source, 'package'], { env: { COPYFILE_DISABLE: '1' } });
  const worktree = join(root, 'consumer'), installed = join(worktree, 'node_modules/@naeil/ui');
  mkdirSync(join(installed, 'dist'), { recursive: true });
  put(join(installed, 'package.json'), { name: '@naeil/ui', version: '0.7.2' }); put(join(installed, 'dist/index.js'), 'export {};');
  const settings = { worktree, executables: { tar: '/usr/bin/tar', node: process.execPath }, executionPath: '/usr/bin:/bin' };
  const run = async (file, args) => ({ stdout: execFileSync(file, args, { encoding: 'utf8' }) });
  const check = () => installedPackage({ release: { archive: { path: archive } } }, settings, run);
  assert.deepEqual(Object.keys(await check()).sort(), ['dist/index.js', 'package.json']);
  mkdirSync(join(installed, 'node_modules/.bin'), { recursive: true }); put(join(installed, 'node_modules/.bin/next'), '#!/bin/sh\n');
  assert.deepEqual(Object.keys(await check()).sort(), ['dist/index.js', 'package.json'], 'pnpm tool shims are not package content');
  mkdirSync(join(installed, 'node_modules/next')); put(join(installed, 'node_modules/next/index.js'), 'nested');
  await assert.rejects(check, /unexpected nested dependencies/);
  rmSync(join(installed, 'node_modules'), { recursive: true }); put(join(installed, 'extra.js'), 'drift');
  await assert.rejects(check, /exactly the frozen files/);
});
