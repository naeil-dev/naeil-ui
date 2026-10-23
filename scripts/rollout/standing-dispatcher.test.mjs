import assert from 'node:assert/strict';
import { chmodSync, existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import test from 'node:test';
import { assertServiceResult, poll } from './standing-dispatcher.mjs';
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
  const stopped = fixture(t); writeFileSync(stopped.config.policy.stopFile, 'stop'); await assert.rejects(poll(stopped.config, stopped)); assert.equal(stopped.calls.length, 0);
  const broken = fixture(t); symlinkSync(join(broken.directory, 'missing-stop-target'), broken.config.policy.stopFile); await assert.rejects(poll(broken.config, broken)); assert.equal(broken.calls.length, 0);
  const expired = fixture(t); expired.config.policy.expiresAt = '2000-01-01'; await assert.rejects(poll(expired.config, expired));
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
  assert.equal((await poll(stopped.config, stopped)).state, 'blocked'); assert.equal(stopped.calls.length, 1);
  const stale = fixture(t), invoke = stale.invoke; let deferred = true;
  stale.invoke = async (command, request) => request.service.id === 'estimate' && deferred ? { ...success(request), state: 'deferred', mutationAttempted: false } : invoke(command, request);
  await poll(stale.config, stale);
  const state = stale.state(); state.releases['1'].services.naeil.result.production.checkedAt = '2000-01-01T00:00:00Z'; atomicJSON(join(stale.config.stateDirectory, 'state.json'), state);
  deferred = false; assert.equal((await poll(stale.config, stale)).state, 'blocked'); assert.equal(stale.calls.length, 1);
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
