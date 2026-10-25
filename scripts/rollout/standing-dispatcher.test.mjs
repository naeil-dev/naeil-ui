import assert from 'node:assert/strict';
import { chmodSync, existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import test from 'node:test';
import { assertServiceResult, inspect, poll, reconcile } from './standing-dispatcher.mjs';
import { atomicJSON, automationDigest, hash, IDS, invokeJSON, ORIGINS, readPrivateJSON, routeKey, validateConfig } from './standing-config.mjs';
import { GitHub, GitHubUnavailable } from './standing-github.mjs';
import { runtimeIndex } from './package-runtime.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
function archive(version) {
  const chunks = [];
  for (const [name, value] of Object.entries({ 'package/package.json': JSON.stringify({ name: '@naeil/ui', version, type: 'module', exports: { '.': './dist/index.js' } }), 'package/dist/index.js': `export const version=${JSON.stringify(version)};` })) {
    const bytes = Buffer.from(value), header = Buffer.alloc(512);
    header.write(name); header.write('0000644\0', 100); header.write('0000000\0', 108); header.write('0000000\0', 116);
    header.write(`${bytes.length.toString(8).padStart(11, '0')}\0`, 124); header.write('00000000000\0', 136);
    header.fill(32, 148, 156); header.write('0', 156); header.write('ustar\0', 257); header.write('00', 263);
    header.write(`${[...header].reduce((a, b) => a + b).toString(8).padStart(6, '0')}\0 `, 148);
    chunks.push(header, bytes, Buffer.alloc((512 - bytes.length % 512) % 512));
  }
  return gzipSync(Buffer.concat([...chunks, Buffer.alloc(1024)]));
}

function fixture(t, patches = [1]) {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'standing-rollout-'))); chmodSync(directory, 0o700);
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const stateDirectory = join(directory, 'state'); mkdirSync(stateDirectory, { mode: 0o700 });
  const data = new Map(), releases = [];
  for (const n of patches) {
    const version = `0.7.${n}`, source = String(n).repeat(40), site = 'a'.repeat(40);
    const tar = archive(version), archiveSha256 = hash(tar), ui = { version, contractVersion: '1' };
    const reference = Buffer.from(JSON.stringify({ schemaVersion: 1, kind: 'independent-release-render', frozen: true, sourceRevision: source, archiveSha256, ui, cases: [{}] }));
    const account = Buffer.from(JSON.stringify({ schemaVersion: 1, kind: 'independent-account-render', sourceRevision: source, archiveSha256, ui, cases: [{}] }));
    const url = name => `https://github.com/naeil-dev/naeil-ui/releases/download/v${version}/${name}`;
    const manifest = { schemaVersion: 1, releaseId: `ui-${version}`, version, previousVersion: `0.7.${n - 1}`, sourceRevision: source, siteSourceRevision: site, siteRuntimeSha256: hash(JSON.stringify(runtimeIndex(tar))), archive: { url: url('package.tgz'), sha256: archiveSha256 }, siteArchive: { url: url('site.tgz'), sha256: archiveSha256 }, contract: { version: '1', url: url('chrome.json'), sha256: hash(reference) }, account: { url: url('account.json'), sha256: hash(account) }, changes: n === 1 ? ['api', 'dom', 'fix'] : ['fix'] };
    const files = { 'package.tgz': tar, 'site.tgz': tar, 'chrome.json': reference, 'account.json': account, 'rollout-manifest.json': Buffer.from(JSON.stringify(manifest)) };
    const assets = Object.entries(files).map(([name, bytes], i) => { data.set(url(name), bytes); return { id: n * 10 + i, name, size: bytes.length, digest: `sha256:${hash(bytes)}`, browser_download_url: url(name) }; });
    releases.push({ id: n, tag_name: `v${version}`, draft: false, prerelease: false, author: { login: 'owner' }, published_at: new Date().toISOString(), assets });
  }
  const config = { schemaVersion: 1, enabled: true, repository: 'naeil-dev/naeil-ui', trustedPublishers: ['owner'], automation: { root, sha256: automationDigest(root) }, stateDirectory, policy: { enabled: true, approvedBy: 'owner', approvalRef: 'fixture-approval', expiresAt: new Date(Date.now() + 86400000).toISOString(), stopFile: join(directory, 'STOP'), services: IDS, maxEvidenceAgeSeconds: 10800, rollbackApproved: true, rollbackScope: 'code-only', patchWindow: { minVersion: '0.7.2', maxVersion: '0.7.99', contractVersion: '1' } }, services: Object.fromEntries(IDS.map(id => [id, { id, appId: id === 'estimate' ? 'abestimate' : id, origin: ORIGINS[id], command: { file: process.execPath, args: ['fixture'], timeoutMs: 1000 }, verification: { command: { file: process.execPath, args: ['fixture'], timeoutMs: 1000 } }, adapterOptions: { standingConfigPath: join(directory, `${id}-private.json`) }, routes: [{ path: '/', policy: 'canonical', renderState: { access: 'public' } }] }])) };
  config.trustedFiles = { [process.execPath]: hash(readFileSync(process.execPath)) }; config.executionPath = '/usr/bin:/bin:/usr/sbin:/sbin';
  config.policy.schemaVersion = 1;
  Object.assign(config.policy.patchWindow, { approvedBy: config.policy.approvedBy, approvalRef: config.policy.approvalRef, reason: 'Owner-authorized compatible shared UI fixes', startsAt: new Date(Date.now() - 86400000).toISOString(), expiresAt: config.policy.expiresAt, services: IDS });
  const initial = JSON.parse(data.get(releases.find(value => value.id === 1)?.assets.find(value => value.name === 'rollout-manifest.json').browser_download_url) || '{}');
  // Some tests deliberately begin with only a future release; their configured
  // baseline remains pinned independently of that incomplete event history.
  const baseTar = archive('0.7.1'), baseHash = hash(baseTar), baseUI = { version: '0.7.1', contractVersion: '1' };
  config.baseline = { version: '0.7.1', releaseId: 'ui-0.7.1', sourceRevision: '1'.repeat(40), archiveSha256: baseHash, referenceSha256: initial.contract?.sha256 || hash(Buffer.from(JSON.stringify({ schemaVersion: 1, kind: 'independent-release-render', frozen: true, sourceRevision: '1'.repeat(40), archiveSha256: baseHash, ui: baseUI, cases: [{}] }))), accountReferenceSha256: initial.account?.sha256 || hash(Buffer.from(JSON.stringify({ schemaVersion: 1, kind: 'independent-account-render', sourceRevision: '1'.repeat(40), archiveSha256: baseHash, ui: baseUI, cases: [{}] }))) };
  const github = { releases: async () => releases, asset: async value => data.get(value.browser_download_url), tagRevision: async tag => tag.slice(5).repeat(40), mainAncestor: async () => {}, workflow: async () => ({ state: 'success', id: 10 }) };
  const calls = [];
  const invoke = async (command, request) => { calls.push(request); return success(request); };
  const changeManifest = (n, change) => {
    const item = releases.find(item => item.id === n), asset = item.assets.find(asset => asset.name === 'rollout-manifest.json');
    const value = JSON.parse(data.get(asset.browser_download_url)); change(value);
    const bytes = Buffer.from(JSON.stringify(value)); data.set(asset.browser_download_url, bytes); asset.size = bytes.length; asset.digest = `sha256:${hash(bytes)}`;
  };
  return { directory, config, github, invoke, calls, releases, data, changeManifest, state: () => readPrivateJSON(join(stateDirectory, 'state.json')) };
}

function success(request) {
  const { service, release } = request;
  const artifact = { id: `${service.id}-${release.version}`, sourceRevision: service.id === 'naeil' ? release.siteSourceRevision : 'b'.repeat(40), ui: { version: release.version, contractVersion: '1' }, ...(service.id === 'naeil' ? { platform: { kind: 'vercel-git', deploymentId: 'dpl_fixture' } } : { sha256: 'c'.repeat(64) }) };
  const production = { schemaVersion: 1, releaseId: release.releaseId, serviceId: service.id, idempotencyKey: request.idempotencyKey, attemptId: request.attemptId, phase: request.mode === 'adopt' ? 'adopt' : 'production', passed: true, identity: { schemaVersion: 1, appId: service.appId, artifactId: artifact.id, sourceRevision: artifact.sourceRevision, ui: artifact.ui }, archiveSha256: release.archive.sha256, referenceSha256: release.contract.sha256, accountReferenceSha256: release.account.sha256, checkedAt: new Date().toISOString(), routes: service.routes.map(route => ({ path: route.path, routeKey: routeKey(route), status: 'production-verified' })) };
  return { schemaVersion: 1, releaseId: release.releaseId, serviceId: service.id, idempotencyKey: request.idempotencyKey, attemptId: request.attemptId, state: 'production-verified', artifact, production };
}

test('scoped baseline adoption, queued consecutive patches and idempotent later polling', async t => {
  const f = fixture(t, [1, 2, 3]);
  const result = await poll(f.config, f);
  assert.equal(result.currentVersion, '0.7.3'); assert.equal(result.allDiscoveredServicesComplete, false);
  assert.deepEqual(f.calls.map(value => value.service.id), [...IDS, ...IDS, ...IDS]);
  assert.deepEqual(f.calls.map(value => value.mode), ['adopt', 'adopt', 'adopt', ...Array(6).fill('standing')]);
  assert.equal(f.calls[1].adapterOptions.standingConfigPath, f.config.services.estimate.adapterOptions.standingConfigPath);
  assert.equal((await poll(f.config, f)).currentVersion, '0.7.3'); assert.equal(f.calls.length, 9);
});

test('missing predecessor and pending CI defer before app work, drafts/prereleases do not run', async t => {
  const future = fixture(t, [2]); assert.equal((await poll(future.config, future)).state, 'waiting-predecessor'); assert.equal(future.calls.length, 0);
  const pending = fixture(t, [1, 2]); pending.github.workflow = async () => ({ state: 'pending' });
  const result = await poll(pending.config, pending); assert.equal(result.currentVersion, '0.7.1'); assert.equal(result.state, 'waiting-package-ci'); assert.equal(pending.calls.length, 3);
  const drafts = fixture(t); drafts.releases[0].draft = true; assert.equal((await poll(drafts.config, drafts)).state, 'waiting-release'); assert.equal(drafts.calls.length, 0);
});

test('untrusted publisher, wrong tag, invalid archive and classified migrations block before dependent work', async t => {
  for (const mutate of [f => { f.releases[0].author.login = 'outsider'; }, f => { f.github.tagRevision = async () => 'f'.repeat(40); }, f => f.changeManifest(1, value => { value.archive.sha256 = 'f'.repeat(64); }), f => f.changeManifest(1, value => { value.siteSourceRevision = undefined; })]) {
    const f = fixture(t); mutate(f); assert.equal((await poll(f.config, f)).state, 'blocked'); assert.equal(f.calls.length, 0);
  }
  const migration = fixture(t, [1, 2]); migration.changeManifest(2, value => { value.changes = ['fix', 'dom']; });
  assert.equal((await poll(migration.config, migration)).currentVersion, '0.7.1'); assert.equal(migration.calls.length, 3);
});

test('an owner-approved migration of the exact release runs through every selected service; partial or mismatched approval blocks', async t => {
  const approve = (f, services, tweak = value => value) => {
    let manifest; f.changeManifest(2, value => { value.changes = ['dom']; manifest = value; });
    f.config.policy.reviewedMigration = tweak({ releaseId: manifest.releaseId, version: manifest.version, sourceRevision: manifest.sourceRevision, siteSourceRevision: manifest.siteSourceRevision, archiveSha256: manifest.archive.sha256, contractSha256: manifest.contract.sha256, changes: ['dom'], services, approvedBy: 'owner', approvalRef: 'migration-approval', reason: 'Reviewed header catalog change', expiresAt: new Date(Date.now() + 86400000).toISOString() });
  };
  const approved = fixture(t, [1, 2]); approve(approved, [...approved.config.policy.services]);
  assert.equal((await poll(approved.config, approved)).currentVersion, '0.7.2'); assert.equal(approved.calls.length, 6);
  const partial = fixture(t, [1, 2]); approve(partial, partial.config.policy.services.slice(1));
  assert.equal((await poll(partial.config, partial)).currentVersion, '0.7.1'); assert.equal(partial.calls.length, 3);
  const otherBytes = fixture(t, [1, 2]); approve(otherBytes, [...otherBytes.config.policy.services], value => ({ ...value, archiveSha256: 'f'.repeat(64) }));
  assert.equal((await poll(otherBytes.config, otherBytes)).currentVersion, '0.7.1'); assert.equal(otherBytes.calls.length, 3);
  const otherReference = fixture(t, [1, 2]); approve(otherReference, [...otherReference.config.policy.services], value => ({ ...value, contractSha256: 'f'.repeat(64) }));
  assert.equal((await poll(otherReference.config, otherReference)).currentVersion, '0.7.1'); assert.equal(otherReference.calls.length, 3);
});

test('changed published asset or moved tag remains blocked even after completed baseline', async t => {
  const f = fixture(t); await poll(f.config, f); f.releases[0].assets[0].id++;
  assert.equal((await poll(f.config, f)).reasonCode, 'published-release-changed'); assert.equal(f.calls.length, 3);
  const tag = fixture(t); await poll(tag.config, tag); tag.github.tagRevision = async () => 'f'.repeat(40);
  assert.equal((await poll(tag.config, tag)).state, 'blocked'); assert.equal(tag.calls.length, 3);
});

test('native failure stops next service and release; uncertain command never replays', async t => {
  for (const uncertain of [false, true]) {
    const f = fixture(t, [1, 2]); const original = f.invoke;
    f.invoke = async (command, request) => { if (request.service.id !== 'estimate') return original(command, request); f.calls.push(request); if (uncertain) throw Error('private child output'); return { ...success(request), state: 'gate-failed' }; };
    const result = await poll(f.config, f); assert.equal(result.state, 'blocked'); assert.equal(result.blockedService, 'estimate'); assert.equal(f.calls.length, 2);
    await poll(f.config, f); assert.equal(f.calls.length, 2); assert(!JSON.stringify(result).includes('private child'));
  }
});

test('crash marker and existing dispatcher lock never cause automatic replay or lock stealing', async t => {
  const f = fixture(t);
  atomicJSON(join(f.config.stateDirectory, 'state.json'), { schemaVersion: 1, repository: f.config.repository, currentVersion: null, releases: { '1': { releaseId: 'ui-0.7.1', services: { estimate: { state: 'invoking' } } } } });
  assert.equal((await poll(f.config, f)).reasonCode, 'interrupted-invocation'); assert.equal(f.calls.length, 0);
  const lock = fixture(t), lockPath = join(lock.config.stateDirectory, 'dispatcher.lock'); writeFileSync(lockPath, '{}', { mode: 0o600 });
  await assert.rejects(poll(lock.config, lock)); assert(existsSync(lockPath)); assert.equal(lock.calls.length, 0);
});

test('only explicit no-mutation deferral retries, preserving previously passed services', async t => {
  const f = fixture(t); const original = f.invoke; let deferred = false;
  f.invoke = async (command, request) => { if (request.service.id === 'estimate' && !deferred) { deferred = true; f.calls.push(request); return { ...success(request), state: 'deferred', mutationAttempted: false }; } return original(command, request); };
  assert.equal((await poll(f.config, f)).state, 'deferred'); assert.equal((await poll(f.config, f)).currentVersion, '0.7.1');
  assert.deepEqual(f.calls.map(value => value.service.id), ['naeil', 'estimate', 'estimate', 'jev']); assert.notEqual(f.calls[1].attemptId, f.calls[2].attemptId);
  const unsafe = fixture(t); unsafe.invoke = async (command, request) => ({ ...success(request), state: 'deferred' });
  assert.equal((await poll(unsafe.config, unsafe)).state, 'blocked');
});

test('STOP and expired policy prevent dispatch; wrong attempt, account, route or app source cannot verify', async t => {
  const stopped = fixture(t); writeFileSync(stopped.config.policy.stopFile, 'stop'); assert.equal((await poll(stopped.config, stopped)).state, 'stopped'); assert.equal(stopped.calls.length, 0);
  const broken = fixture(t); symlinkSync(join(broken.directory, 'missing-stop-target'), broken.config.policy.stopFile); assert.equal((await poll(broken.config, broken)).state, 'stopped'); assert.equal(broken.calls.length, 0);
  const expired = fixture(t); expired.config.policy.expiresAt = '2000-01-01'; assert.equal((await poll(expired.config, expired)).state, 'authorization-expired');
  const f = fixture(t); await poll(f.config, f); const request = f.calls[0];
  for (const change of [value => { value.attemptId = 'foreign'; }, value => { value.production.accountReferenceSha256 = 'f'.repeat(64); }, value => { value.production.routes[0].routeKey = 'foreign'; }, value => { value.artifact.sourceRevision = request.release.sourceRevision; }]) { const result = success(request); change(result); assert.throws(() => assertServiceResult(result, request)); }
});

test('private config scope, source digest, symlink and permissions are enforced', t => {
  const f = fixture(t); validateConfig(f.config);
  const changed = structuredClone(f.config); changed.services.home = changed.services.naeil; assert.throws(() => validateConfig(changed));
  const digest = structuredClone(f.config); digest.automation.sha256 = 'f'.repeat(64); assert.throws(() => validateConfig(digest));
  const file = join(f.directory, 'config.json'); atomicJSON(file, f.config); assert.deepEqual(readPrivateJSON(file), f.config);
  chmodSync(file, 0o644); assert.throws(() => readPrivateJSON(file)); chmodSync(file, 0o600);
  const link = join(f.directory, 'link.json'); symlinkSync(file, link); assert.throws(() => readPrivateJSON(link));
});

test('real child uses shell:false private JSON transport and suppresses child failure output', async t => {
  const f = fixture(t), script = join(f.directory, 'child.mjs');
  writeFileSync(script, "import{readFileSync,writeFileSync}from'node:fs'; const value=JSON.parse(readFileSync(process.env.NAEIL_ROLLOUT_INPUT));writeFileSync(process.env.NAEIL_ROLLOUT_OUTPUT,JSON.stringify({literal:value.literal}),{mode:0o600});");
  const result = await invokeJSON({ file: process.execPath, args: [script], timeoutMs: 1000 }, { literal: '$(never-execute); `never`' }, join(f.directory, 'invoke'));
  assert.equal(result.literal, '$(never-execute); `never`');
  await assert.rejects(invokeJSON({ file: process.execPath, args: ['-e', 'console.error("PRIVATE_SENTINEL");process.exit(1)'], timeoutMs: 1000 }, {}, join(f.directory, 'fail')), error => !error.message.includes('PRIVATE_SENTINEL'));
});

test('GitHub polling paginates rather than trusting latest and blocks foreign redirects', async () => {
  const calls = [];
  const github = new GitHub({ token: 'fixture', fetchImpl: async (url, options) => { calls.push({ url, options }); return new Response(JSON.stringify(new URL(url).searchParams.get('page') === '1' ? Array.from({ length: 100 }, (_, id) => ({ id })) : [{ id: 100 }]), { status: 200 }); } });
  assert.equal((await github.releases()).length, 101); assert.equal(calls.length, 2); assert(calls.every(value => value.options.redirect === 'error'));
  const redirect = new GitHub({ fetchImpl: async () => new Response('', { status: 302, headers: { location: 'https://attacker.example/archive' } }) });
  await assert.rejects(redirect.asset({ browser_download_url: 'https://github.com/naeil-dev/naeil-ui/releases/download/v0.7.2/package.tgz', size: 0 }));
});

test('transient release metadata or asset failures retry before dispatch without skipping a patch', async t => {
  const f = fixture(t), original = f.github.asset; let unavailable = true;
  f.github.asset = async asset => { if (unavailable) throw new GitHubUnavailable(); return original(asset); };
  assert.equal((await poll(f.config, f)).state, 'release-unavailable'); assert.equal(f.calls.length, 0); assert(!f.state().blocked);
  unavailable = false; assert.equal((await poll(f.config, f)).currentVersion, '0.7.1'); assert.equal(f.calls.length, 3);
  const timeout = new GitHub({ fetchImpl: async () => { throw Error('private failure details'); } });
  await assert.rejects(timeout.releases(), GitHubUnavailable);
  const limited = new GitHub({ fetchImpl: async () => new Response('', { status: 429 }) }); await assert.rejects(limited.releases(), GitHubUnavailable);
});

test('cached frozen references or archives cannot be replaced with linked, public or changed bytes', async t => {
  for (const type of ['symlink', 'hardlink', 'permission', 'bytes']) {
    const f = fixture(t), original = f.invoke;
    f.invoke = async (command, request) => request.service.id === 'estimate' ? { ...success(request), state: 'deferred', mutationAttempted: false } : original(command, request);
    assert.equal((await poll(f.config, f)).state, 'deferred');
    const path = join(f.config.stateDirectory, 'releases', '1', type === 'bytes' ? 'account.json' : 'archive.tgz');
    if (['symlink', 'hardlink'].includes(type)) {
      const copied = join(f.directory, 'copied'); writeFileSync(copied, readFileSync(path), { mode: 0o600 }); unlinkSync(path);
      if (type === 'symlink') symlinkSync(copied, path); else linkSync(copied, path);
    } else if (type === 'permission') chmodSync(path, 0o644);
    else writeFileSync(path, '{}');
    assert.equal((await poll(f.config, f)).state, 'blocked'); assert.equal(f.calls.length, 1);
  }
});

test('external trusted helper bytes and executable closure are mandatory and rechecked between apps', async t => {
  const f = fixture(t), helper = join(f.directory, 'helper.mjs'); writeFileSync(helper, 'reviewed');
  f.config.trustedFiles[helper] = hash(readFileSync(helper)); validateConfig(f.config);
  const missing = structuredClone(f.config); delete missing.trustedFiles[process.execPath]; assert.throws(() => validateConfig(missing));
  const invalidPath = structuredClone(f.config); invalidPath.executionPath = '.:/usr/bin'; assert.throws(() => validateConfig(invalidPath));
  const original = f.invoke; f.invoke = async (...args) => { const value = await original(...args); writeFileSync(helper, 'changed'); return value; };
  assert.equal((await poll(f.config, f)).state, 'blocked'); assert.deepEqual(f.calls.map(value => value.service.id), ['naeil']);
});

test('STOP and stale cached production prevent later app dispatch without replaying earlier apps', async t => {
  const stopped = fixture(t), original = stopped.invoke;
  stopped.invoke = async (...args) => { const value = await original(...args); writeFileSync(stopped.config.policy.stopFile, 'STOP'); return value; };
  assert.equal((await poll(stopped.config, stopped)).state, 'stopped'); assert.equal(stopped.calls.length, 1);
  assert(!stopped.state().blocked); assert.equal(stopped.state().releases['1'].state, 'stopped');
  unlinkSync(stopped.config.policy.stopFile); stopped.invoke = original; assert.equal((await poll(stopped.config, stopped)).state, 'complete'); assert.equal(stopped.calls.length, 3);
  const stale = fixture(t), invoke = stale.invoke; let deferred = true;
  stale.invoke = async (command, request) => request.service.id === 'estimate' && deferred ? { ...success(request), state: 'deferred', mutationAttempted: false } : invoke(command, request);
  await poll(stale.config, stale);
  const state = stale.state(); state.releases['1'].services.naeil.result.production.checkedAt = '2000-01-01T00:00:00Z'; atomicJSON(join(stale.config.stateDirectory, 'state.json'), state);
  deferred = false; stale.verify = async (_command, request) => success(request).production;
  assert.equal((await poll(stale.config, stale)).state, 'complete'); assert.equal(stale.calls.length, 3);
});

test('child command uses configured PATH and removes inherited runtime injection options', async t => {
  const f = fixture(t), script = join(f.directory, 'environment.mjs');
  writeFileSync(script, "import{writeFileSync}from'node:fs';writeFileSync(process.env.NAEIL_ROLLOUT_OUTPUT,JSON.stringify(Object.fromEntries(['PATH','NODE_OPTIONS','NODE_PATH','PYTHONPATH','LD_PRELOAD'].map(k=>[k,process.env[k]??null]))),{mode:0o600});");
  const changed = { PATH: '/UNTRUSTED', NODE_OPTIONS: '--require=/UNTRUSTED', NODE_PATH: '/UNTRUSTED', PYTHONPATH: '/UNTRUSTED', LD_PRELOAD: '/UNTRUSTED' };
  const previous = Object.fromEntries(Object.keys(changed).map(key => [key, process.env[key]]));
  Object.assign(process.env, changed);
  try {
    const result = await invokeJSON({ file: process.execPath, args: [script], timeoutMs: 1000 }, { executionPath: '/usr/bin:/bin' }, join(f.directory, 'environment'));
    assert.deepEqual(result, { PATH: '/usr/bin:/bin', NODE_OPTIONS: null, NODE_PATH: null, PYTHONPATH: null, LD_PRELOAD: null });
  } finally { for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } }
});

test('F3 regression: stale cached evidence is reverified without replaying the adapter', async t => {
  const f = fixture(t);
  const original = f.invoke;
  f.invoke = async (command, request, directory) => request.service.id === 'estimate' ? { ...success(request), state: 'deferred', mutationAttempted: false } : original(command, request, directory);
  assert.equal((await poll(f.config, f)).state, 'deferred');
  const state = f.state();
  state.releases['1'].services.naeil.result.production.checkedAt = new Date(Date.now() - (f.config.policy.maxEvidenceAgeSeconds + 60) * 1000).toISOString();
  atomicJSON(join(f.config.stateDirectory, 'state.json'), state);
  const prior = structuredClone(state.releases['1'].services.naeil.result);
  f.verify = async (_command, request) => success(request).production;
  const result = await poll(f.config, f);
  assert.equal(result.state, 'deferred');
  const saved = f.state().releases['1'].services.naeil;
  assert.deepEqual(saved.result, prior);
  assert.equal(saved.reverifications.length, 1);
  assert.equal(f.calls.filter(r => r.service.id === 'naeil').length, 1);
});

test('F4 regression: bound nonzero gate-failed result is retained and classified', async t => {
  const f = fixture(t);
  const script = join(f.directory, 'adapter.mjs');
  writeFileSync(script, "import{readFileSync,writeFileSync}from'node:fs';const r=JSON.parse(readFileSync(process.env.NAEIL_ROLLOUT_INPUT));writeFileSync(process.env.NAEIL_ROLLOUT_OUTPUT,JSON.stringify({schemaVersion:1,releaseId:r.release.releaseId,serviceId:r.service.id,idempotencyKey:r.idempotencyKey,attemptId:r.attemptId,state:'gate-failed',mutationAttempted:false}),{mode:0o600});process.exitCode=1;", {mode:0o600});
  f.config.services.estimate.command = {file:process.execPath,args:[script],timeoutMs:3000};
  f.config.trustedFiles[script] = hash(readFileSync(script));
  const original = f.invoke;
  let outputPath;
  f.invoke = async (command, request, directory, kind, options) => {
    if(request.service.id!=='estimate') return original(command,request,directory);
    outputPath=join(directory,'output.json');return invokeJSON(command,request,directory,kind,options);
  };
  const result = await poll(f.config, f);
  assert.equal(result.state, 'blocked'); assert.equal(result.reasonCode, 'gate-failed');
  const output = readPrivateJSON(outputPath);
  assert.equal(output.state,'gate-failed');assert.equal(output.mutationAttempted,false);
  assert.equal(f.state().releases['1'].services.estimate.state,'gate-failed');
  assert.equal(f.state().releases['1'].services.estimate.result.transportExitCode, 1);
});

for (const status of ['disabled', 'authorization-expired', 'stopped']) test('F8 entry ' + status + ' writes resumable summary and persists since', async t => {
  const f = fixture(t); let network = 0; f.github.releases = async () => { network++; return f.releases; };
  if (status === 'disabled') f.config.enabled = false;
  if (status === 'authorization-expired') f.config.policy.expiresAt = '2000-01-01';
  if (status === 'stopped') writeFileSync(f.config.policy.stopFile, 'STOP');
  const first = await poll(f.config, f); assert.equal(first.state, status); assert(first.since); assert(!f.state().blocked);
  const saved = f.state(); saved.observedAt = '2000-01-01'; atomicJSON(join(f.config.stateDirectory, 'state.json'), saved);
  const second = await poll(f.config, f); assert.equal(second.since, first.since); assert.notEqual(f.state().observedAt, saved.observedAt);
  assert.deepEqual(readPrivateJSON(join(f.config.stateDirectory, 'summary.json')), second);
  assert.equal(network, 0); assert.equal(f.calls.length, 0);
});
for (const status of ['disabled', 'authorization-expired']) test('F8 mid-loop ' + status + ' leaves release stopped without a durable block', async t => {
  const f = fixture(t), original = f.invoke;
  f.invoke = async (...args) => { const result = await original(...args); if (status === 'disabled') f.config.enabled = false; else f.config.policy.expiresAt = '2000-01-01'; return result; };
  assert.equal((await poll(f.config, f)).state, status); assert.equal(f.state().releases['1'].state, 'stopped'); assert(!f.state().blocked); assert.equal(f.calls.length, 1);
});
test('F15 cancelled exact package CI waits and resumes after the rerun succeeds', async t => {
  const f = fixture(t, [1, 2]); f.github.workflow = async () => ({ state: 'cancelled' });
  const waiting = await poll(f.config, f); assert.equal(waiting.state, 'waiting-package-ci'); assert.equal(waiting.reasonCode, 'cancelled'); assert(waiting.since); assert(!f.state().blocked); assert.equal(f.calls.length, 3);
  const again = await poll(f.config, f); assert.equal(again.since, waiting.since);
  f.github.workflow = async () => ({ state: 'success' }); assert.equal((await poll(f.config, f)).state, 'complete'); assert.equal(f.calls.length, 6);
});
test('F3 fresh identity or binding failure during re-verification blocks without replay', async t => {
  for (const failure of ['identity', 'route', 'stale', 'command', 'cached-binding']) {
    const f = fixture(t), original = f.invoke;
    f.invoke = async (command, request) => request.service.id === 'estimate' ? { ...success(request), state: 'deferred', mutationAttempted: false } : original(command, request);
    await poll(f.config, f);
    const saved = f.state(), prior = saved.releases['1'].services.naeil;
    prior.result.production.checkedAt = '2000-01-01';
    if (failure === 'cached-binding') prior.result.production.accountReferenceSha256 = 'f'.repeat(64);
    atomicJSON(join(f.config.stateDirectory, 'state.json'), saved);
    let checks = 0;
    f.verify = async (_command, request) => {
      checks++; assert.equal(readPrivateJSON(join(f.config.stateDirectory, 'summary.json')).state, 'cached-evidence-expired');
      if (failure === 'command') throw new Error('synthetic verifier refusal');
      const value = success(request).production;
      if (failure === 'identity') value.identity.artifactId = 'foreign';
      if (failure === 'route') value.routes = [];
      if (failure === 'stale') value.checkedAt = '2000-01-01';
      return value;
    };
    const blocked = await poll(f.config, f); assert.equal(blocked.reasonCode, 'cached-evidence-reverification-failed');
    assert.equal(checks, failure === 'cached-binding' ? 0 : 1); assert.equal(f.calls.length, 1);
    await poll(f.config, f); assert.equal(f.calls.length, 1);
  }
});
test('F3 successive read-only refreshes append receipts and use new private attempt directories', async t => {
  const f = fixture(t), original = f.invoke, checks = [];
  f.invoke = async (command, request) => request.service.id === 'estimate' ? { ...success(request), state: 'deferred', mutationAttempted: false } : original(command, request);
  f.verify = async (_command, request, directory, kind) => { checks.push(request); assert.equal(kind, 'verify'); assert(directory.startsWith(request.outputDirectory)); return success(request).production; };
  await poll(f.config, f);
  const path = join(f.config.stateDirectory, 'state.json');
  for (let index = 0; index < 2; index++) {
    const saved = f.state(), prior = saved.releases['1'].services.naeil;
    (index ? prior.reverifications.at(-1).production : prior.result.production).checkedAt = '2000-01-01'; atomicJSON(path, saved);
    assert.equal((await poll(f.config, f)).state, 'deferred');
  }
  const prior = f.state().releases['1'].services.naeil;
  assert.equal(prior.reverifications.length, 2); assert.equal(prior.result.production.checkedAt, '2000-01-01');
  assert.notEqual(checks[0].attemptId, checks[1].attemptId); assert.notEqual(checks[0].outputDirectory, checks[1].outputDirectory);
  assert(checks.every(value => value.outputDirectory.includes('/naeil/reverify-') && value.phase === 'adopt'));
  assert.equal(f.calls.filter(value => value.service.id === 'naeil').length, 1);
});
for (const outcome of ['activation-pending', 'review-required', 'not-deployed', 'production-verified', 'deferred', 'unbound', 'invalid', 'missing', 'timeout', 'signal', 'maxBuffer']) test('F4 transport classifies nonzero ' + outcome + ' conservatively', async t => {
  const f = fixture(t), script = join(f.directory, 'nonzero.mjs'), original = f.invoke;
  let code = "import{readFileSync,writeFileSync}from'node:fs';const r=JSON.parse(readFileSync(process.env.NAEIL_ROLLOUT_INPUT));";
  if (outcome !== 'missing') code += outcome === 'invalid' ? "writeFileSync(process.env.NAEIL_ROLLOUT_OUTPUT,'invalid',{mode:0o600});" : "writeFileSync(process.env.NAEIL_ROLLOUT_OUTPUT,JSON.stringify(r.syntheticResult),{mode:0o600});";
  code += outcome === 'timeout' ? 'setInterval(()=>{},1000);' : outcome === 'signal' ? "process.kill(process.pid,'SIGTERM');" : outcome === 'maxBuffer' ? "process.stdout.write('x'.repeat(2*1024*1024));process.exitCode=1;" : 'process.exitCode=1;';
  writeFileSync(script, code, { mode: 0o600 });
  f.config.services.estimate.command = { file: process.execPath, args: [script], timeoutMs: outcome === 'timeout' ? 150 : 3000 }; f.config.trustedFiles[script] = hash(readFileSync(script));
  f.invoke = async (command, request, directory, kind, options) => {
    if (request.service.id !== 'estimate') return original(command, request);
    const result = { ...success(request), state: ['unbound', 'invalid', 'missing', 'timeout', 'signal', 'maxBuffer'].includes(outcome) ? 'gate-failed' : outcome, mutationAttempted: false };
    if (outcome === 'unbound') result.attemptId = 'foreign';
    return invokeJSON(command, { ...request, syntheticResult: result }, directory, kind, options);
  };
  const result = await poll(f.config, f), accepted = ['activation-pending', 'review-required', 'not-deployed'].includes(outcome);
  assert.equal(result.reasonCode, accepted ? outcome : 'command-or-result-uncertain');
  assert.equal(f.state().releases['1'].services.estimate.state, accepted ? outcome : 'uncertain');
  const count = f.calls.length; await poll(f.config, f); assert.equal(f.calls.length, count);
});
function nativeInspectionFixture(f) {
  const stateDirectory = join(f.directory, 'estimate-state'), nativeState = join(f.directory, 'estimate-native');
  mkdirSync(stateDirectory, { mode: 0o700 }); mkdirSync(nativeState, { mode: 0o700 }); mkdirSync(join(stateDirectory, 'keys'), { mode: 0o700 });
  atomicJSON(f.config.services.estimate.adapterOptions.standingConfigPath, { stateDirectory, activation: { stateDirectory: nativeState } });
  return { stateDirectory, nativeState };
}
const ownerResolution = { approvedBy: 'synthetic-owner', reason: 'Bound evidence proves this retry is before native dispatch' };
test('F4 inspect exposes bounded operational facts and validates retained output without writing', async t => {
  const f = fixture(t), native = nativeInspectionFixture(f), original = f.invoke;
  f.invoke = async (command, request, directory) => {
    if (request.service.id !== 'estimate') return original(command, request);
    atomicJSON(join(directory, 'output.json'), { ...success(request), state: 'gate-failed', mutationAttempted: true, runtimeMutationAttempted: false }); throw new Error('synthetic transport loss');
  };
  await poll(f.config, f);
  const prior = f.state().releases['1'].services.estimate;
  atomicJSON(join(native.nativeState, 'operation.json'), { phase: 'stopped', secret: 'PRIVATE_SENTINEL' });
  atomicJSON(join(native.stateDirectory, 'running.lock'), { secret: 'PRIVATE_SENTINEL' });
  atomicJSON(join(native.stateDirectory, 'keys', hash(prior.request.idempotencyKey) + '.json'), { state: 'gate-failed', mutationAttempted: true, runtimeMutationAttempted: false, secret: 'PRIVATE_SENTINEL' });
  const before = readFileSync(join(f.config.stateDirectory, 'state.json'));
  const result = await inspect(f.config, { fetchImpl: async url => { const id = IDS.find(id => ORIGINS[id] === new URL(url).origin); const request = { ...f.calls[0], service: f.config.services[id] }; return Response.json(success(request).production.identity); } });
  assert(!JSON.stringify(result).includes('PRIVATE_SENTINEL')); assert.deepEqual(readFileSync(join(f.config.stateDirectory, 'state.json')), before); assert(!existsSync(join(f.config.stateDirectory, 'dispatcher.lock')));
  const estimate = result.releases[0].services[1];
  assert.deepEqual(estimate.retainedOutput, { exists: true, validates: true }); assert.equal(estimate.native.phase, 'stopped'); assert(estimate.native.runningLock); assert(estimate.native.operationMarker); assert.equal(estimate.native.ledger.state, 'gate-failed');
  assert.equal(estimate.mutationAttempted, true); assert.equal(estimate.runtimeMutationAttempted, false); assert.equal(result.liveIdentity.estimate.appId, 'abestimate');
});
test('F4 explicit pre-mutation reconciliation uses retained bound proof and preserves prior record', async t => {
  const f = fixture(t); f.invoke = async (_command, request, directory) => { atomicJSON(join(directory, 'output.json'), { ...success(request), state: 'gate-failed', mutationAttempted: false, runtimeMutationAttempted: false }); throw new Error('synthetic lost transport'); };
  await poll(f.config, f); const prior = f.state().releases['1'].services.naeil;
  await assert.rejects(reconcile(f.config, 'ui-0.7.1', 'naeil', 'retry-pre-mutation', { reason: 'missing owner' }), /approver/);
  await reconcile(f.config, 'ui-0.7.1', 'naeil', 'retry-pre-mutation', ownerResolution);
  const saved = f.state(), record = saved.releases['1']; assert(!saved.blocked); assert.deepEqual(record.history[0].prior, prior); assert.equal(record.history[0].approvedBy, ownerResolution.approvedBy);
  f.invoke = async (_command, request) => { f.calls.push(request); return success(request); };
  assert.equal((await poll(f.config, f)).state, 'complete'); assert.equal(f.calls[0].reconciliation.priorAttemptId, prior.attemptId);
});
test('F2 gate-failure reconciliation requires absent native state and live predecessor identity', async t => {
  const f = fixture(t, [1, 2]), native = nativeInspectionFixture(f), original = f.invoke;
  f.invoke = async (command, request) => request.release.version === '0.7.2' && request.service.id === 'estimate' ? { ...success(request), state: 'gate-failed', mutationAttempted: true, runtimeMutationAttempted: false } : original(command, request);
  await poll(f.config, f);
  const path = join(f.config.stateDirectory, 'state.json'), before = readFileSync(path), prior = f.state().releases['2'].services.estimate;
  const options = { ...ownerResolution, fetchImpl: async () => Response.json(f.state().releases['1'].services.estimate.result.production.identity) };
  for (const nativePath of [join(native.stateDirectory, 'running.lock'), join(native.nativeState, 'operation.json')]) {
    atomicJSON(nativePath, {}); await assert.rejects(reconcile(f.config, 'ui-0.7.2', 'estimate', 'retry-after-gate-failure', options), /lock or native marker/); assert.deepEqual(readFileSync(path), before); unlinkSync(nativePath);
  }
  await assert.rejects(reconcile(f.config, 'ui-0.7.2', 'estimate', 'retry-after-gate-failure', { ...options, fetchImpl: async () => Response.json(success(prior.request).production.identity) }), /Live public identity/);
  await reconcile(f.config, 'ui-0.7.2', 'estimate', 'retry-after-gate-failure', options);
  f.invoke = async (command, request) => { if (request.service.id === 'estimate' && request.release.version === '0.7.2') assert.equal(request.reconciliation.priorAttemptId, prior.attemptId); return original(command, request); };
  assert.equal((await poll(f.config, f)).currentVersion, '0.7.2');
});
for (const [name, fields] of [
  ['pending', { state: 'activation-pending', mutationAttempted: true, runtimeMutationAttempted: false }],
  ['runtime mutation', { state: 'gate-failed', mutationAttempted: true, runtimeMutationAttempted: true }],
  ['pending rollback', { state: 'gate-failed', mutationAttempted: false, runtimeMutationAttempted: false, rollback: { state: 'activation-pending' } }],
  ['missing mutation proof', { state: 'gate-failed' }],
  ['foreign attempt', { state: 'gate-failed', mutationAttempted: false, attemptId: 'foreign' }],
]) test('F4 reconciliation refuses ' + name + ' without changing durable evidence', async t => {
  const f = fixture(t); f.invoke = async (_command, request) => ({ ...success(request), ...fields }); await poll(f.config, f);
  const path = join(f.config.stateDirectory, 'state.json'), before = readFileSync(path);
  await assert.rejects(reconcile(f.config, 'ui-0.7.1', 'naeil', 'retry-pre-mutation', ownerResolution)); assert.deepEqual(readFileSync(path), before);
});

test('F2 reconciliation refuses uncertain, runtime-mutated or conflicting Estimate ledgers', async t => {
  const f = fixture(t), native = nativeInspectionFixture(f);
  f.invoke = async (_command, request) => request.service.id === 'estimate' ? { ...success(request), state: 'gate-failed', mutationAttempted: false, runtimeMutationAttempted: false } : success(request);
  await poll(f.config, f); const prior = f.state().releases['1'].services.estimate;
  const path = join(f.config.stateDirectory, 'state.json'), before = readFileSync(path), ledger = join(native.stateDirectory, 'keys', hash(prior.request.idempotencyKey) + '.json');
  const bound = { attemptId: prior.attemptId, idempotencyKey: prior.request.idempotencyKey, state: 'gate-failed', mutationAttempted: false, runtimeMutationAttempted: false };
  for (const fields of [{ state: 'invoked' }, { runtimeMutationAttempted: true }, { attemptId: 'foreign' }, { mutationAttempted: true }]) {
    atomicJSON(ledger, { ...bound, ...fields });
    await assert.rejects(reconcile(f.config, 'ui-0.7.1', 'estimate', 'retry-pre-mutation', ownerResolution), /Estimate ledger/); assert.deepEqual(readFileSync(path), before);
  }
  atomicJSON(ledger, bound); await reconcile(f.config, 'ui-0.7.1', 'estimate', 'retry-pre-mutation', ownerResolution); assert(!f.state().blocked);
});
