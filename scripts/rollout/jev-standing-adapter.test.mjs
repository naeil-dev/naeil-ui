import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, symlinkSync, chmodSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { runStanding, createArtifact, invokeVerifier, runCommand, cleanEnvironment } from './jev-standing-adapter.mjs';
import { fixtureManifest } from './jev-candidate.mjs';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const put = (path, value) => writeFileSync(path, JSON.stringify(value), { mode: 0o600 });
const source = 'a'.repeat(40);
function fixture(t, mode = 'adopt') {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'jev-standing-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const archive = join(root, 'ui.tgz'); writeFileSync(archive, 'fictional approved UI archive');
  const release = { schemaVersion: 1, releaseId: 'ui-0.7.1', version: '0.7.1', previousVersion: '0.7.0', sourceRevision: source, archive: { path: archive, sha256: hash(readFileSync(archive)), url: 'https://example.test/ui.tgz' }, contract: { version: '1', path: join(root, 'reference.json') }, changes: ['fix'] };
  const reference = { schemaVersion: 1, kind: 'independent-release-render', frozen: true, archiveSha256: release.archive.sha256, sourceRevision: source, ui: { version: release.version, contractVersion: '1' } };
  put(release.contract.path, reference); release.contract.sha256 = hash(readFileSync(release.contract.path));
  const artifactPath = join(root, 'baseline.tar.gz'); writeFileSync(artifactPath, 'fictional immutable application');
  const baselineArtifact = { id: 'jev-current', sourceRevision: 'b'.repeat(40), ui: { version: '0.7.1', contractVersion: '1' }, packageSha256: release.archive.sha256, immutable: true, path: artifactPath, sha256: hash(readFileSync(artifactPath)), manifestPath: join(root, 'manifest.json'), manifestSha256: hash('{}'), buildId: 'current-build' };
  put(baselineArtifact.manifestPath, {});
  baselineArtifact.storageRef = `file:///fictional/${baselineArtifact.sha256}`;
  const policy = { schemaVersion: 1, enabled: true, approvedBy: 'fixture', approvalRef: 'fixture', expiresAt: '2099-01-01', services: ['jev'], stopFile: join(root, 'STOP'), maxEvidenceAgeSeconds: 3600, rollbackApproved: true, rollbackScope: 'code-only', patchWindow: { approvedBy: 'fixture', approvalRef: 'fixture', reason: 'synthetic', startsAt: '2020-01-01', expiresAt: '2099-01-01', minVersion: '0.7.1', maxVersion: '0.7.9', services: ['jev'], contractVersion: '1' } };
  const input = { schemaVersion: 1, release, service: { id: 'jev', appId: 'jev', origin: 'https://jev.example.test', routes: [{ path: '/', policy: 'canonical', renderState: { access: 'protected', visible: '.comparison', hidden: ['.login'] } }] }, policy, idempotencyKey: 'ui-0.7.1:jev', attemptId: 'attempt-1', mode };
  const trustedPath = join(root, 'reviewed-script.mjs'); writeFileSync(trustedPath, 'reviewed fixture helper'); input.trustedFiles = { [trustedPath]: hash(readFileSync(trustedPath)) };
  const worktree = join(root, 'checkout'); mkdirSync(worktree);
  const config = { schemaVersion: 1, enabled: true, worktree, branch: 'rollout/standing', reviewedSourceRevision: source, stateDirectory: join(root, 'state'), artifactDirectory: join(root, 'artifacts'), nodeExecutable: process.execPath, nodeVersion: process.version, pnpmExecutable: '/fictional/pnpm', pnpmVersion: '10.30.3', pythonExecutable: '/usr/bin/python3', baselineArtifact, native: {}, verificationCommand: { file: process.execPath, args: [] } };
  const events = [];
  const deps = {
    native: async (action, request) => { events.push(action); return { schemaVersion: 1, releaseId: request.release.releaseId, serviceId: request.service.id, attemptId: request.attemptId, idempotencyKey: request.idempotencyKey, action, passed: true, safe: true, activated: action === 'activate' || action === 'rollback' }; },
    verify: async request => { events.push(`verify-${request.phase}`); return { schemaVersion: 1, releaseId: request.release.releaseId, serviceId: 'jev', idempotencyKey: request.idempotencyKey, attemptId: request.attemptId, phase: request.phase, passed: true, identity: structuredClone(request.expectedIdentity), archiveSha256: request.release.archive.sha256, referenceSha256: request.release.contract.sha256, accountReferenceSha256: request.release.account?.sha256, checkedAt: new Date().toISOString(), routes: [{ path: '/', routeKey: '2c09b6f6a8841c77d6ecf46d6f889e5f6194b7f9ba10ef42bbbe739751984391', status: 'production-verified' }] }; },
    command: async (file, args) => { events.push(args.join(' ')); return { stdout: args[0] === '--version' ? file === config.nodeExecutable ? process.version : '10.30.3' : '', stderr: '' }; },
    packageCheck: async () => ({ fileCount: 1, contentSha256: 'd'.repeat(64) }),
    sourceCheck: async () => {},
    prepareCandidate: (_release, _worktree, directory) => ({ directory, configPath: join(directory, 'playwright.config.ts'), releasePath: join(directory, 'release.json'), receipt: { fixture: true } }),
    assertCandidate: () => {},
    update: async () => { events.push('update'); return { uiVersion: input.release.version, archiveSha256: input.release.archive.sha256, dependencyExact: true, sourceRevision: source }; },
  };
  return { root, input, config, deps, events };
}

test('adoption verifies actual current artifact without updating, staging or selecting password-era predecessor', async t => {
  const f = fixture(t);
  const result = await runStanding(f.input, f.config, f.deps);
  assert.equal(result.state, 'production-verified');
  assert.equal(result.artifact.id, 'jev-current');
  assert.deepEqual(f.events, ['inspect', 'verify-adopt', 'inspect']);
  assert.equal(JSON.parse(readFileSync(join(f.config.stateDirectory, 'baseline.json'))).artifact.id, 'jev-current');
});

test('disabled policy and stop switch refuse before any app operation', async t => {
  for (const cause of ['policy', 'stop']) {
    const f = fixture(t);
    if (cause === 'policy') f.input.policy.enabled = false;
    else writeFileSync(f.input.policy.stopFile, 'stop');
    assert.equal((await runStanding(f.input, f.config, f.deps)).state, 'gate-failed');
    assert.deepEqual(f.events, []);
  }
});

test('reviewed PATH and hermetic git options replace inherited runtime and git injection', t => {
  const f = fixture(t), executionPath = `${f.root}:${dirname(process.execPath)}:/usr/bin:/bin`;
  const original = process.env;
  let env;
  try { process.env = { ...original, NODE_OPTIONS: '--inspect=0', PYTHONPATH: '/unreviewed', LD_PRELOAD: '/unreviewed', GIT_CONFIG_COUNT: '1', GIT_CONFIG_KEY_0: 'include.path', GIT_CONFIG_VALUE_0: '/unreviewed' }; env = cleanEnvironment({ ...f.config, executionPath }); }
  finally { process.env = original; }
  assert.equal(env.PATH, executionPath); assert.equal(env.NODE_OPTIONS, ''); assert.equal(env.NODE_PATH, '');
  assert.equal(env.PYTHONPATH, undefined); assert.equal(env.LD_PRELOAD, undefined);
  assert.equal(env.GIT_CONFIG_NOSYSTEM, '1'); assert.equal(env.GIT_CONFIG_GLOBAL, '/dev/null');
  assert.equal(env.GIT_CONFIG_KEY_0, 'core.hooksPath'); assert.equal(env.GIT_CONFIG_VALUE_0, '/dev/null');
  assert.equal(env.GIT_CONFIG_KEY_1, 'core.fsmonitor'); assert.equal(env.GIT_CONFIG_VALUE_1, 'false');
  assert.equal(env.GIT_CONFIG_KEY_2, 'commit.gpgsign'); assert.equal(env.GIT_CONFIG_VALUE_2, 'false');
});

test('full trusted-file drift during verification refuses the next native boundary', async t => {
  const f = fixture(t), verify = f.deps.verify;
  f.deps.verify = async request => { const response = await verify(request); writeFileSync(Object.keys(f.input.trustedFiles)[0], 'changed after dispatch'); return response; };
  assert.equal((await runStanding(f.input, f.config, f.deps)).state, 'gate-failed');
  assert.deepEqual(f.events, ['inspect', 'verify-adopt']); assert(!existsSync(join(f.config.stateDirectory, 'baseline.json')));
});

test('dispatcher-shaped policy adopts exact current0.7.1 even with historical API/DOM changes and no patch predecessor', async t => {
  const f = fixture(t); f.input.release.changes = ['dom', 'api']; f.input.release.previousVersion = '0.1.0';
  delete f.input.policy.schemaVersion; delete f.input.policy.patchWindow; delete f.input.policy.reviewedMigration;
  assert.equal((await runStanding(f.input, f.config, f.deps)).state, 'production-verified');
  assert.deepEqual(f.events, ['inspect', 'verify-adopt', 'inspect']);
});

test('dispatcher-shaped fix window authorizes only consecutive contract1 patches', async t => {
  for (const cause of ['valid', 'dom', 'contract', 'range', 'minor', 'expiry']) {
    const f = fixture(t); await runStanding(f.input, f.config, f.deps); future(f); f.input.attemptId = 'attempt-2';
    delete f.input.policy.schemaVersion;
    f.input.policy.patchWindow = { minVersion: '0.7.2', maxVersion: '0.7.99', contractVersion: '1' };
    if (cause === 'dom') f.input.release.changes = ['dom'];
    if (cause === 'contract') f.input.policy.patchWindow.contractVersion = '2';
    if (cause === 'range') f.input.policy.patchWindow.minVersion = '0.7.3';
    if (cause === 'minor') f.input.release.previousVersion = '0.6.9';
    if (cause === 'expiry') f.input.policy.expiresAt = '2000-01-01';
    assert.equal((await runStanding(f.input, f.config, f.deps)).state, cause === 'valid' ? 'production-verified' : 'gate-failed');
  }
});

test('adoption refuses a different installed version or archive drift before verification', async t => {
  for (const cause of ['version', 'archive']) {
    const f = fixture(t);
    if (cause === 'version') f.config.baselineArtifact.ui.version = '0.7.0';
    else writeFileSync(f.config.baselineArtifact.path, 'changed');
    assert.equal((await runStanding(f.input, f.config, f.deps)).state, 'gate-failed');
    assert.deepEqual(f.events, []);
  }
});

test('foreign or incomplete verifier result cannot establish a baseline', async t => {
  for (const mutate of [r => { r.attemptId = 'foreign'; }, r => { r.identity.artifactId = 'foreign'; }, r => { r.referenceSha256 = 'f'.repeat(64); }, r => { r.routes = []; }, r => { r.checkedAt = '2000-01-01'; }]) {
    const f = fixture(t); const verify = f.deps.verify;
    f.deps.verify = async request => { const result = await verify(request); mutate(result); return result; };
    assert.equal((await runStanding(f.input, f.config, f.deps)).state, 'gate-failed');
    assert.equal(existsSync(join(f.config.stateDirectory, 'baseline.json')), false);
  }
});

test('native receipts must echo the complete current action binding', async t => {
  for (const field of ['schemaVersion', 'releaseId', 'serviceId', 'attemptId', 'idempotencyKey', 'action']) {
    const f = fixture(t), native = f.deps.native;
    f.deps.native = async (action, request) => ({ ...await native(action, request), [field]: 'foreign' });
    assert.equal((await runStanding(f.input, f.config, f.deps)).state, 'gate-failed');
    assert(!existsSync(join(f.config.stateDirectory, 'baseline.json')));
  }
});

test('a held global lock defers without invoking native operations', async t => {
  const f = fixture(t); mkdirSync(f.config.stateDirectory, { mode: 0o700 }); writeFileSync(join(f.config.stateDirectory, 'running.lock'), 'uncertain');
  const result = await runStanding(f.input, f.config, f.deps); assert.equal(result.state, 'deferred'); assert.equal(result.mutationAttempted, false);
  assert.deepEqual(f.events, []);
  assert.equal(readFileSync(join(f.config.stateDirectory, 'running.lock'), 'utf8'), 'uncertain');
});

function future(f) {
  f.input.mode = 'standing'; f.input.release.previousVersion = '0.7.1'; f.input.release.version = '0.7.2';
  const ref = JSON.parse(readFileSync(f.input.release.contract.path)); ref.ui.version = '0.7.2'; f.input.release.contract.path = join(f.root, 'reference-0.7.2.json'); put(f.input.release.contract.path, ref); f.input.release.contract.sha256 = hash(readFileSync(f.input.release.contract.path));
  const standalone = join(f.config.worktree, '.next/standalone'); mkdirSync(join(standalone, 'public/.well-known'), { recursive: true }); mkdirSync(join(standalone, '.next'));
  put(join(standalone, 'public/.well-known/naeil-ui.json'), { schemaVersion: 1, appId: 'jev', artifactId: 'jev-next', sourceRevision: source, ui: { version: '0.7.2', contractVersion: '1' } });
  writeFileSync(join(standalone, '.next/BUILD_ID'), 'new-build'); writeFileSync(join(standalone, 'server.js'), 'new code');
}

test('future patch needs an actually verified current baseline before update', async t => {
  const f = fixture(t); future(f);
  assert.equal((await runStanding(f.input, f.config, f.deps)).state, 'gate-failed');
  assert.deepEqual(f.events, []);
});

test('future same-contract pipeline packages immutable bytes and advances baseline after verification', async t => {
  const f = fixture(t); await runStanding(f.input, f.config, f.deps);
  f.input.attemptId = 'attempt-2'; future(f); f.events.length = 0;
  const result = await runStanding(f.input, f.config, f.deps);
  assert.equal(result.state, 'production-verified');
  assert.equal(result.artifact.ui.version, '0.7.2');
  assert.equal(result.previousArtifact.id, 'jev-current');
  assert(f.events.indexOf('update') < f.events.indexOf('stage'));
  assert(f.events.indexOf('verify-adopt') < f.events.indexOf('update'));
  assert(f.events.includes('verify-adopt'));
  assert(f.events.indexOf('stage') < f.events.indexOf('activate'));
  assert(f.events.indexOf('activate') < f.events.indexOf('verify-production'));
  assert.equal(JSON.parse(readFileSync(join(f.config.stateDirectory, 'baseline.json'))).artifact.id, 'jev-next');
});

test('stale or mismatched predecessor verification prevents dependency changes', async t => {
  const f = fixture(t); await runStanding(f.input, f.config, f.deps); future(f); f.input.attemptId = 'attempt-2'; f.events.length = 0;
  f.deps.verify = async () => { throw new Error('baseline no longer matches'); };
  assert.equal((await runStanding(f.input, f.config, f.deps)).state, 'gate-failed');
  assert(!f.events.includes('update'));
});

async function reviewedCheckout(f) {
  const cwd = f.config.worktree, env = cleanEnvironment(f.config);
  const git = async args => (await runCommand('/usr/bin/git', args, { cwd, env })).stdout.trim();
  writeFileSync(join(cwd, '.gitignore'), '.next/\nnode_modules/\n');
  writeFileSync(join(cwd, 'application.mjs'), 'reviewed application');
  put(join(cwd, 'package.json'), { private: true });
  for (const args of [['init', '--initial-branch=rollout/standing'], ['add', '.'], ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-m', 'reviewed consumer']]) await git(args);
  f.config.reviewedSourceRevision = await git(['rev-parse', 'HEAD']);
  f.config.gitExecutable = '/usr/bin/git';
  const command = f.deps.command;
  f.deps.command = (file, args, options) => file === '/usr/bin/git' ? runCommand(file, args, options) : command(file, args, options);
  delete f.deps.sourceCheck;
  return async () => {
    writeFileSync(join(cwd, 'application.mjs'), 'unreviewed committed application');
    await git(['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-am', 'unrelated application change']);
    return git(['rev-parse', 'HEAD']);
  };
}

test('committed unrelated consumer source drift refuses before updater invocation', async t => {
  const f = fixture(t); await runStanding(f.input, f.config, f.deps);
  const drift = await reviewedCheckout(f); await drift(); future(f); f.input.attemptId = 'attempt-2'; f.events.length = 0;
  assert.equal((await runStanding(f.input, f.config, f.deps)).state, 'gate-failed');
  assert(!f.events.includes('update')); assert(!f.events.includes('run test')); assert(!f.events.includes('stage'));
});

test('committed application drift introduced by updater refuses before consumer scripts', async t => {
  const f = fixture(t); await runStanding(f.input, f.config, f.deps);
  const drift = await reviewedCheckout(f), update = f.deps.update;
  f.deps.update = async () => ({ ...await update(), sourceRevision: await drift() });
  future(f); f.input.attemptId = 'attempt-2'; f.events.length = 0;
  assert.equal((await runStanding(f.input, f.config, f.deps)).state, 'gate-failed');
  assert(f.events.includes('update')); assert(!f.events.includes('run test')); assert(!f.events.includes('stage'));
});

test('browser-modified artifact tree and concurrent source changes refuse before staging', async t => {
  for (const cause of ['artifact', 'source']) {
    const f = fixture(t); await runStanding(f.input, f.config, f.deps); future(f); f.input.attemptId = 'attempt-2'; f.events.length = 0;
    const command = f.deps.command; let browserRan = false;
    f.deps.command = async (file, args, options) => {
      const response = await command(file, args, options);
      if (args.includes('playwright')) {
        browserRan = true;
        if (cause === 'artifact') writeFileSync(join(options.env.JEV_TEST_STANDALONE, 'server.js'), 'concurrently changed');
      }
      return response;
    };
    f.deps.sourceCheck = async () => { if (cause === 'source' && browserRan) throw new Error('dirty source'); };
    assert.equal((await runStanding(f.input, f.config, f.deps)).state, 'gate-failed');
    assert(!f.events.includes('stage'));
  }
});

test('durable receipt failure after activation keeps the operation locked', async t => {
  const f = fixture(t); await runStanding(f.input, f.config, f.deps); future(f); f.input.attemptId = 'attempt-2';
  const native = f.deps.native;
  f.deps.native = async (action, request) => {
    const response = await native(action, request);
    if (action === 'activate') mkdirSync(join(f.config.stateDirectory, 'attempts', 'attempt-2', 'result.json.next'));
    return response;
  };
  assert.equal((await runStanding(f.input, f.config, f.deps)).state, 'activation-pending');
  assert(existsSync(join(f.config.stateDirectory, 'running.lock')));
});

test('known native busy refusal permits a new attempt while unknown activation bindings retain lock', async t => {
  for (const cause of ['busy', 'binding']) {
    const f = fixture(t); await runStanding(f.input, f.config, f.deps); future(f); f.input.attemptId = 'attempt-2';
    const native = f.deps.native;
    f.deps.native = async (action, request) => {
      const response = await native(action, request);
      if (action === 'activate') return cause === 'busy' ? { ...response, passed: false, safe: true, deferred: true } : { ...response, attemptId: 'foreign' };
      return response;
    };
    const result = await runStanding(f.input, f.config, f.deps);
    assert.equal(result.state, cause === 'busy' ? 'deferred' : 'activation-pending');
    assert.equal(result.mutationAttempted, cause !== 'busy');
    assert.equal(existsSync(join(f.config.stateDirectory, 'running.lock')), cause !== 'busy');
  }
});

test('uncertain native activation retains durable lock and forbids a second attempt', async t => {
  const f = fixture(t); await runStanding(f.input, f.config, f.deps); future(f); f.input.attemptId = 'attempt-2';
  const native = f.deps.native; f.deps.native = async (action, request) => { if (action === 'activate') throw new Error('private socket or process output'); return native(action, request); };
  const result = await runStanding(f.input, f.config, f.deps);
  assert.equal(result.state, 'activation-pending');
  assert(!JSON.stringify(result).includes('private socket'));
  assert(existsSync(join(f.config.stateDirectory, 'running.lock')));
  f.input.attemptId = 'attempt-3'; assert.equal((await runStanding(f.input, f.config, f.deps)).state, 'deferred');
});

test('failed production verification rolls back only captured predecessor and keeps prior verified baseline', async t => {
  const f = fixture(t); await runStanding(f.input, f.config, f.deps); future(f); f.input.attemptId = 'attempt-2';
  const verify = f.deps.verify; f.deps.verify = request => { if (request.phase === 'production') throw new Error('verification failed'); return verify(request); };
  const result = await runStanding(f.input, f.config, f.deps);
  assert.equal(result.state, 'gate-failed'); assert.equal(result.rollback.state, 'production-verified');
  assert.equal(result.rollback.artifact.id, 'jev-current');
  assert.equal(JSON.parse(readFileSync(join(f.config.stateDirectory, 'baseline.json'))).artifact.id, 'jev-current');
  assert.equal(existsSync(join(f.config.stateDirectory, 'running.lock')), false);
});

test('rollback rechecks trusted files before verification and final native inspection', async t => {
  for (const boundary of ['after-native', 'after-verification']) {
    const f = fixture(t); await runStanding(f.input, f.config, f.deps); future(f); f.input.attemptId = 'attempt-2'; f.events.length = 0;
    const native = f.deps.native, verify = f.deps.verify;
    const drift = () => writeFileSync(Object.keys(f.input.trustedFiles)[0], 'changed during rollback');
    f.deps.native = async (action, request) => { const response = await native(action, request); if (action === 'rollback' && boundary === 'after-native') drift(); return response; };
    f.deps.verify = async request => {
      if (request.phase === 'production') throw new Error('production verification failed');
      const response = await verify(request);
      if (request.phase === 'rollback' && boundary === 'after-verification') drift();
      return response;
    };
    const result = await runStanding(f.input, f.config, f.deps);
    assert.equal(result.state, 'activation-pending'); assert.equal(result.rollback.state, 'activation-pending');
    assert.equal(f.events.at(-1), boundary === 'after-native' ? 'rollback' : 'verify-rollback');
    assert(existsSync(join(f.config.stateDirectory, 'running.lock')));
    assert.equal(JSON.parse(readFileSync(join(f.config.stateDirectory, 'baseline.json'))).artifact.id, 'jev-current');
  }
});

test('package preserves internal dependency links and refuses an escaping link', async t => {
  const f = fixture(t); future(f);
  const tree = join(f.config.worktree, '.next/standalone'); mkdirSync(join(tree, 'node_modules'));
  writeFileSync(join(tree, 'node_modules/package.js'), 'module'); symlinkSync('package.js', join(tree, 'node_modules/link.js'));
  const artifact = await createArtifact(f.input, f.config, source);
  assert(artifact.storageRef.includes(artifact.sha256));
  assert.equal(hash(readFileSync(artifact.path)), artifact.sha256);
  symlinkSync('../../../outside', join(tree, 'node_modules/escape'));
  await assert.rejects(() => createArtifact(f.input, f.config, source));
});

test('verifier uses isolated private transport and shell:false argv', async t => {
  const f = fixture(t);
  const script = join(f.root, 'verifier.mjs'); writeFileSync(script, `import{readFileSync,writeFileSync,statSync}from'node:fs';const i=JSON.parse(readFileSync(process.env.NAEIL_VERIFY_INPUT));if((statSync(process.env.NAEIL_VERIFY_INPUT).mode&511)!==384)process.exit(3);writeFileSync(process.env.NAEIL_VERIFY_OUTPUT,JSON.stringify({passed:true,phase:i.phase,argument:process.argv[2]}),{mode:384});`);
  f.config.verificationCommand.args = [script, 'literal $(do-not-execute)'];
  const result = await invokeVerifier({ phase: 'adopt' }, f.config, f.root);
  assert.equal(result.argument, 'literal $(do-not-execute)');
  assert.equal(result.phase, 'adopt');
});

function subprocessFixture(f) {
  const nativePath = join(f.root, 'fake-native'), verifierPath = join(f.root, 'fake-verifier.mjs'), logPath = join(f.root, 'subprocess.jsonl');
  const io = `import{readFileSync,writeFileSync,appendFileSync,statSync}from'node:fs';const read=p=>JSON.parse(readFileSync(p));const log=x=>appendFileSync(${JSON.stringify(logPath)},JSON.stringify(x)+'\\n');`;
  writeFileSync(nativePath, `#!${process.execPath}\n${io}const i=read(process.env.NAEIL_ROLLOUT_INPUT);if((statSync(process.env.NAEIL_ROLLOUT_INPUT).mode&511)!==384||process.env.JEV_PASSWORD_FILE||process.env.NAEIL_SUPABASE_ANON_KEY)process.exit(2);log({action:i.action,attemptId:i.attemptId});writeFileSync(process.env.NAEIL_ROLLOUT_OUTPUT,JSON.stringify({schemaVersion:1,releaseId:i.release.releaseId,serviceId:i.service.id,attemptId:i.attemptId,idempotencyKey:i.idempotencyKey,action:i.action,passed:true,safe:true,activated:['activate','rollback'].includes(i.action)}),{mode:384});`); chmodSync(nativePath, 0o700);
  writeFileSync(verifierPath, `${io}const i=read(process.env.NAEIL_VERIFY_INPUT);if((statSync(process.env.NAEIL_VERIFY_INPUT).mode&511)!==384||i.referencePath!==i.release.contract.path||!i.outputDirectory)process.exit(2);log({phase:i.phase,version:i.artifact.ui.version});writeFileSync(process.env.NAEIL_VERIFY_OUTPUT,JSON.stringify({schemaVersion:1,releaseId:i.release.releaseId,serviceId:i.service.id,attemptId:i.attemptId,idempotencyKey:i.idempotencyKey,phase:i.phase,passed:true,identity:i.expectedIdentity,archiveSha256:i.release.archive.sha256,referenceSha256:i.release.contract.sha256,accountReferenceSha256:i.release.account?.sha256,checkedAt:new Date().toISOString(),routes:[{path:'/',routeKey:'2c09b6f6a8841c77d6ecf46d6f889e5f6194b7f9ba10ef42bbbe739751984391',passed:true}]}),{mode:384});`);
  f.config.pythonExecutable = nativePath; f.config.native.baseDirectory = join(f.root, 'runtime'); f.config.verificationCommand = { file: process.execPath, args: [verifierPath] };
  const configPath = join(f.root, 'private-config.json'); f.input.service.adapterOptions = { standingConfigPath: configPath };
  return { logPath, async execute() {
    put(configPath, f.config);
    const inputPath = join(f.root, `${f.input.attemptId}.input.json`), outputPath = join(f.root, `${f.input.attemptId}.output.json`); put(inputPath, f.input);
    await runCommand(process.execPath, [fileURLToPath(new URL('./jev-standing-adapter.mjs', import.meta.url))], { env: { ...cleanEnvironment(f.config), JEV_ROLLOUT_CONFIG: '/never-read-fallback', NAEIL_ROLLOUT_INPUT: inputPath, NAEIL_ROLLOUT_OUTPUT: outputPath }, cwd: f.root });
    return JSON.parse(readFileSync(outputPath));
  } };
}

test('actual adapter CLI adopts through canonical private config and two independent native transports', async t => {
  const f = fixture(t), subprocess = subprocessFixture(f);
  const result = await subprocess.execute(); assert.equal(result.state, 'production-verified');
  assert.equal(result.artifact.id, f.config.baselineArtifact.id);
  const events = readFileSync(subprocess.logPath, 'utf8').trim().split('\n').map(JSON.parse);
  assert.deepEqual(events.map(event => event.action || event.phase), ['inspect', 'adopt', 'inspect']);
});

async function npmArchive(root, version) {
  const directory = join(root, `npm-${version}`); mkdirSync(join(directory, 'package/dist'), { recursive: true });
  put(join(directory, 'package/package.json'), { name: '@naeil/ui', version });
  put(join(directory, 'package/dist/ui-release.json'), { version, contractVersion: '1' });
  const archive = join(root, `ui-${version}.tgz`); await runCommand('/usr/bin/tar', ['-czf', archive, '-C', directory, 'package']); return archive;
}

function frozen(f, version, archive) {
  f.input.release.version = version; f.input.release.releaseId = `ui-${version}`; f.input.idempotencyKey = `ui-${version}:jev`;
  f.input.release.archive.path = archive; f.input.release.archive.sha256 = hash(readFileSync(archive));
  const common = { schemaVersion: 1, archiveSha256: f.input.release.archive.sha256, sourceRevision: f.input.release.sourceRevision, ui: { version, contractVersion: '1' } };
  f.input.release.contract.path = join(f.root, `contract-${version}.json`); put(f.input.release.contract.path, { ...common, frozen: true, kind: 'independent-release-render' }); f.input.release.contract.sha256 = hash(readFileSync(f.input.release.contract.path));
  f.input.release.account = { path: join(f.root, `account-${version}.json`) }; put(f.input.release.account.path, { ...common, kind: 'independent-account-render', cases: [] }); f.input.release.account.sha256 = hash(readFileSync(f.input.release.account.path));
}

test('complete synthetic CLI pipeline uses real updater commit, package bytes, copied tests and structured production verification', async t => {
  const f = fixture(t), subprocess = subprocessFixture(f), checkout = f.config.worktree;
  const git = join(f.root, 'git'), gitLog = join(f.root, 'git-calls.jsonl');
  writeFileSync(git, `#!${process.execPath}\nimport{appendFileSync}from'node:fs';import{execFileSync}from'node:child_process';if(process.env.GIT_CONFIG_NOSYSTEM!=='1'||process.env.GIT_CONFIG_GLOBAL!=='/dev/null'||process.env.GIT_CONFIG_KEY_0!=='core.hooksPath'||process.env.GIT_CONFIG_VALUE_0!=='/dev/null'||process.env.GIT_CONFIG_VALUE_1!=='false'||process.env.GIT_CONFIG_VALUE_2!=='false')process.exit(91);appendFileSync(${JSON.stringify(gitLog)},JSON.stringify(process.argv.slice(2))+'\\n');process.stdout.write(execFileSync('/usr/bin/git',process.argv.slice(2),{env:process.env}));`); chmodSync(git, 0o700);
  f.input.executionPath = `${f.root}:${dirname(process.execPath)}:/usr/bin:/bin:/usr/sbin:/sbin`; f.config.gitExecutable = git;
  f.input.trustedFiles[git] = hash(readFileSync(git));
  const oldArchive = await npmArchive(f.root, '0.7.1'), nextArchive = await npmArchive(f.root, '0.7.2'); frozen(f, '0.7.1', oldArchive);
  delete f.input.policy.schemaVersion; f.input.policy.patchWindow = { minVersion: '0.7.2', maxVersion: '0.7.99', contractVersion: '1' };
  f.input.release.changes = ['dom', 'api']; f.input.release.previousVersion = '0.1.0';
  f.config.baselineArtifact.packageSha256 = f.input.release.archive.sha256;
  assert.equal((await subprocess.execute()).state, 'production-verified');
  mkdirSync(join(checkout, 'vendor')); mkdirSync(join(checkout, 'scripts')); mkdirSync(join(checkout, 'tests/e2e'), { recursive: true });
  writeFileSync(join(checkout, 'vendor/naeil-ui-0.7.1.tgz'), readFileSync(oldArchive));
  put(join(checkout, 'package.json'), { private: true, type: 'module', packageManager: 'pnpm@10.30.3', dependencies: { '@naeil/ui': 'file:vendor/naeil-ui-0.7.1.tgz' } });
  writeFileSync(join(checkout, 'pnpm-lock.yaml'), 'synthetic previous lock\n'); writeFileSync(join(checkout, '.gitignore'), 'node_modules/\n.next/\n');
  writeFileSync(join(checkout, 'scripts/candidate-files.mjs'), `import{readFileSync,readdirSync}from'node:fs';import{execFileSync}from'node:child_process';import{join}from'node:path';export function verifyInstalledPackage(archive,root){for(const file of ['package.json','dist/ui-release.json']){const expected=execFileSync('/usr/bin/tar',['-xOf',archive,'package/'+file]);if(!expected.equals(readFileSync(join(root,file))))throw Error('installed package drift');}return{fileCount:2};}`);
  writeFileSync(join(checkout, 'tests/e2e/shared-chrome.spec.ts'), 'expect(header).toHaveAttribute("data-naeil-ui-version", "0.7.1"); expect(footer).toHaveAttribute("data-naeil-ui-contract", "1"); expect(identity).toMatchObject({ui: {version: "0.7.1", contractVersion: "1"}});');
  writeFileSync(join(checkout, 'tests/e2e/account-control.spec.ts'), 'const bytes=readFileSync("vendor/naeil-account-0.7.1.json");expect(hash(bytes)).toBe("158dd3bca9d5c4dd8068cf97d70de1c65d7b187f3057f9388409a7685b447bc5");');
  writeFileSync(join(checkout, 'playwright.config.ts'), 'export default {};'); f.config.candidateFixtureSha256 = hash(JSON.stringify(fixtureManifest(checkout)));
  for (const args of [['init', '--initial-branch=rollout/standing'], ['add', '.'], ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.test', 'commit', '-m', 'synthetic consumer']]) await runCommand('/usr/bin/git', args, { cwd: checkout });
  f.config.reviewedSourceRevision = (await runCommand('/usr/bin/git', ['rev-parse', 'HEAD'], { cwd: checkout })).stdout.trim();
  const pnpm = join(f.root, 'pnpm'), commandLog = join(f.root, 'commands.jsonl');
  writeFileSync(pnpm, `#!${process.execPath}
import{readFileSync,writeFileSync,mkdirSync,rmSync,appendFileSync,existsSync}from'node:fs';import{execFileSync}from'node:child_process';import{createHash}from'node:crypto';import{join}from'node:path';const args=process.argv.slice(2);const read=p=>JSON.parse(readFileSync(p));const put=(p,v)=>writeFileSync(p,JSON.stringify(v));appendFileSync(${JSON.stringify(commandLog)},JSON.stringify(args)+'\\n');if(args[0]==='--version'){console.log('10.30.3');}else if(args[0]==='install'){const pkg=read('package.json'),archive=pkg.dependencies['@naeil/ui'].slice(5),target='node_modules/@naeil/ui';rmSync(target,{recursive:true,force:true});mkdirSync(target,{recursive:true});execFileSync('/usr/bin/tar',['-xzf',archive,'-C',target,'--strip-components=1']);writeFileSync('pnpm-lock.yaml','integrity: sha512-'+createHash('sha512').update(readFileSync(archive)).digest('base64')+'\\n');}else if(args[0]==='run'){if(args[1]==='build'){const source=execFileSync('/usr/bin/git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),tree='.next/standalone';mkdirSync(tree+'/public/.well-known',{recursive:true});mkdirSync(tree+'/.next');put(tree+'/public/.well-known/naeil-ui.json',{schemaVersion:1,appId:'jev',artifactId:'jev-ui07-'+source.slice(0,12),sourceRevision:source,ui:read('node_modules/@naeil/ui/dist/ui-release.json')});writeFileSync(tree+'/.next/BUILD_ID','synthetic-build');writeFileSync(tree+'/server.js','synthetic application');}else if(!['test','typecheck','lint'].includes(args[1]))process.exit(3);}else if(args[0]==='exec'&&args[1]==='playwright'){const release=read(process.env.JEV_CANDIDATE_RELEASE),identity=read(join(process.env.JEV_TEST_STANDALONE,'public/.well-known/naeil-ui.json')),receipt=read(join(process.env.JEV_TEST_STANDALONE,'../receipt.json'));if(identity.ui.version!==release.version||identity.artifactId!==receipt.artifactId||!readFileSync('tests/e2e/account-control.spec.ts','utf8').includes('rolloutRelease.account.sha256')||args[3]!=='--config'||!existsSync(args[4]))process.exit(4);}else process.exit(5);
`); chmodSync(pnpm, 0o700); f.config.pnpmExecutable = pnpm;
  f.input.mode = 'standing'; f.input.attemptId = 'attempt-2'; f.input.release.previousVersion = '0.7.1'; f.input.release.changes = ['fix']; frozen(f, '0.7.2', nextArchive);
  const result = await subprocess.execute(); assert.equal(result.state, 'production-verified'); assert.equal(result.artifact.ui.version, '0.7.2');
  assert(result.checks.length === 5 && result.checks.every(check => check.passed));
  assert.equal(result.candidateHarness.fixturesSha256, f.config.candidateFixtureSha256);
  const commands = readFileSync(commandLog, 'utf8').trim().split('\n').map(JSON.parse);
  assert(commands.some(args => args.join(' ') === 'install --no-frozen-lockfile --ignore-scripts'));
  assert(commands.some(args => args.join(' ') === 'install --frozen-lockfile --ignore-scripts'));
  const gitCalls = readFileSync(gitLog, 'utf8').trim().split('\n').map(JSON.parse);
  assert(gitCalls.some(args => args.includes('commit'))); assert(gitCalls.filter(args => args.join(' ') === 'rev-parse HEAD').length >= 4);
  const commit = await runCommand('/usr/bin/git', ['log', '-1', '--format=%s'], { cwd: checkout }); assert.equal(commit.stdout.trim(), 'chore: consume @naeil/ui 0.7.2');
  assert.equal(JSON.parse(readFileSync(join(f.config.stateDirectory, 'baseline.json'))).artifact.id, result.artifact.id);
});
