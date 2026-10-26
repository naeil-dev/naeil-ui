import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import test from 'node:test';
import { observe } from './naeil-standing-observer.mjs';
import { hash, routeKey } from './standing-config.mjs';
import { runtimeIndex } from './package-runtime.mjs';
import { GitHubUnavailable } from './standing-github.mjs';

const frozen = readFileSync(new URL('../../docs/rollout/frozen/naeil-ui-0.7.1.tgz', import.meta.url));
const chrome = readFileSync(new URL('../../docs/rollout/frozen/naeil-chrome-0.7.1.json', import.meta.url));
const account = readFileSync(new URL('../../docs/rollout/frozen/naeil-account-0.7.1.json', import.meta.url));
const packageSource = '32108fd8e1cb1db6dae24a09f3ca72ac9a91f618';
const siteSource = 'a'.repeat(40);
const json = value => new Response(JSON.stringify(value), { headers: { 'content-type': 'application/json' } });

function fixture(t) {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'naeil-observer-'))); chmodSync(directory, 0o700);
  t.after(() => rmSync(directory, { force: true, recursive: true }));
  const persist = (name, bytes) => { const path = join(directory, name); writeFileSync(path, bytes, { mode: 0o600 }); return { path, sha256: hash(bytes) }; };
  const helper = persist('trusted-helper.mjs', 'export const reviewed=true;');
  const outputDirectory = join(directory, 'output'); mkdirSync(outputDirectory, { mode: 0o700 });
  const request = {
    schemaVersion: 1, idempotencyKey: 'ui-0.7.1:naeil', attemptId: 'attempt-fixture', mode: 'adopt', outputDirectory,
    release: { releaseId: 'naeil-ui-0.7.1', version: '0.7.1', sourceRevision: packageSource, siteSourceRevision: siteSource, siteRuntimeSha256: hash(JSON.stringify(runtimeIndex(frozen))), archive: persist('package.tgz', frozen), siteArchive: persist('site.tgz', frozen), contract: { version: '1', ...persist('chrome.json', chrome) }, account: persist('account.json', account) },
    service: { id: 'naeil', appId: 'naeil', origin: 'https://naeil.dev', observer: { workflowPath: '.github/workflows/verify.yml', environment: 'Production', deploymentCreator: 'vercel[bot]', correlation: 'immutable-url' }, verification: { command: { file: process.execPath, args: ['fixture'], timeoutMs: 1000 }, options: { safe: true } }, routes: [{ path: '/', policy: 'canonical', renderState: { access: 'public' } }, { path: '/en/account', policy: 'canonical', state: 'authenticated', renderState: { access: 'protected', visible: '[data-account]' } }] },
    policy: { enabled: true, approvedBy: 'fixture-owner', approvalRef: 'fixture-approval', stopFile: join(directory, 'STOP'), expiresAt: new Date(Date.now() + 86400000).toISOString(), maxEvidenceAgeSeconds: 3600 },
    trustedFiles: { [helper.path]: helper.sha256 }, executionPath: '/usr/bin:/bin',
  };
  const identity = { schemaVersion: 1, appId: 'naeil', artifactId: 'dpl_Fixture', sourceRevision: siteSource, ui: { version: '0.7.1', contractVersion: '1' } };
  const deployment = { id: 12, sha: siteSource, environment: 'Production', creator: { login: 'vercel[bot]' } };
  const status = { id: 13, state: 'success', created_at: new Date().toISOString(), creator: { login: 'vercel[bot]' }, environment_url: 'https://design-system-fixture.vercel.app' };
  const calls = [], verifications = [];
  const github = {
    workflow: async (revision, path) => { calls.push({ kind: 'workflow', revision, path }); return { state: 'success', id: 11 }; },
    pages: async path => { calls.push({ kind: 'github', path }); return path.endsWith('/statuses') ? [status] : [deployment]; },
  };
  const fetchImpl = async (url, options) => { calls.push({ kind: 'fetch', url, options }); return json(identity); };
  const verify = async (command, input, path, kind) => {
    verifications.push({ command, input, path, kind });
    return { schemaVersion: 1, releaseId: input.release.releaseId, serviceId: input.service.id, idempotencyKey: input.idempotencyKey, attemptId: input.attemptId, phase: input.phase, passed: true, identity: structuredClone(identity), archiveSha256: input.release.archive.sha256, referenceSha256: input.release.contract.sha256, accountReferenceSha256: input.release.account.sha256, expectationsSha256: hash(readFileSync(new URL('./expectations/0.7.1.json', import.meta.url))), checkedAt: new Date().toISOString(), routes: input.service.routes.map(route => ({ path: route.path, routeKey: routeKey(route), status: 'production-verified' })) };
  };
  return { directory, request, identity, deployment, status, github, fetchImpl, verify, calls, verifications, helper, persist };
}

test('observes current reviewed Git app source, proves package runtime and forwards protected verification', async t => {
  const f = fixture(t), result = await observe(f.request, f);
  assert.equal(result.state, 'production-verified'); assert.equal(result.mutationAttempted, false);
  assert.equal(result.artifact.sourceRevision, siteSource); assert.notEqual(result.artifact.sourceRevision, packageSource);
  assert.equal(result.artifact.platform.kind, 'vercel-git'); assert.equal(result.artifact.platform.githubDeploymentId, '12');
  assert.equal(result.artifact.platform.deploymentId, 'dpl_Fixture'); assert(!('sha256' in result.artifact));
  assert.deepEqual(f.calls[0], { kind: 'workflow', revision: siteSource, path: '.github/workflows/verify.yml' });
  assert(f.calls.filter(value => value.kind === 'fetch').every(value => value.options.redirect === 'error' && !value.options.method));
  const verification = f.verifications[0]; assert.equal(verification.kind, 'verify');
  assert.equal(verification.input.phase, 'adopt'); assert.deepEqual(verification.input.expectedIdentity, f.identity);
  assert.equal(verification.input.referencePath, f.request.release.contract.path); assert.deepEqual(verification.input.options, { safe: true });
  assert.equal(verification.input.service.routes[1].renderState.access, 'protected');
});

test('only pending CI or deployment returns explicit no-mutation deferral', async t => {
  for (const type of ['ci', 'missing', 'pending', 'failed-ci', 'failed-deployment']) {
    const f = fixture(t);
    if (type.endsWith('ci')) f.github.workflow = async () => ({ state: type === 'ci' ? 'pending' : 'failed' });
    if (type === 'missing') f.github.pages = async () => [];
    if (type === 'pending') f.status.state = 'pending';
    if (type === 'failed-deployment') f.status.state = 'failure';
    const result = await observe(f.request, f);
    assert.equal(result.state, type.startsWith('failed') ? 'gate-failed' : 'deferred');
    assert.equal(result.mutationAttempted, false); assert.equal(f.verifications.length, 0);
    assert(!f.calls.some(value => value.kind === 'fetch'));
    if (type.startsWith('failed')) assert.equal(result.recoveryRequired, true);
  }
});

test('development, wrong UI or deployment identity cannot gate native consumers', async t => {
  for (const change of [value => { value.sourceRevision = 'development'; }, value => { value.ui.version = '0.7.0'; }, value => { value.ui.contractVersion = '2'; }, value => { value.artifactId = 'native-fixture'; }, value => { value.appId = 'estimate'; }]) {
    const f = fixture(t); change(f.identity); await assert.rejects(observe(f.request, f)); assert.equal(f.verifications.length, 0);
  }
});

test('only newest matching trusted Production deployment and successful trusted status can gate', async t => {
  const f = fixture(t); f.github.pages = async path => path.endsWith('/statuses') ? [f.status, { ...f.status, id: 14, created_at: new Date(Date.now() + 1).toISOString(), state: 'pending' }] : [{ ...f.deployment, id: 11 }, f.deployment, { ...f.deployment, id: 15, sha: packageSource }];
  assert.equal((await observe(f.request, f)).state, 'deferred'); assert.equal(f.verifications.length, 0);
  const unknown = fixture(t); unknown.status.creator.login = 'outsider'; await assert.rejects(observe(unknown.request, unknown));
  const foreign = fixture(t); foreign.deployment.creator.login = 'outsider'; assert.equal((await observe(foreign.request, foreign)).state, 'deferred');
});

test('immutable URL must be a Vercel deployment with the exact same identity', async t => {
  const f = fixture(t); f.fetchImpl = async url => json({ ...f.identity, ...(url.startsWith('https://design-system-') ? { artifactId: 'dpl_Other' } : {}) });
  await assert.rejects(observe(f.request, f)); assert.equal(f.verifications.length, 0);
  for (const url of ['https://attacker.example', 'https://fixture.vercel.app/path', 'https://fixture.vercel.app?secret=anything']) {
    const invalid = fixture(t); invalid.status.environment_url = url; await assert.rejects(observe(invalid.request, invalid)); assert.equal(invalid.verifications.length, 0);
  }
});

test('frozen bytes, reviewed runtime digest and site runtime parity are checked before network', async t => {
  for (const change of [f => { f.request.release.siteRuntimeSha256 = 'f'.repeat(64); }, f => { f.request.release.archive.sha256 = 'f'.repeat(64); }, f => { f.request.release.siteArchive.sha256 = 'f'.repeat(64); }, f => {
    const bytes = gunzipSync(frozen); let position = 0;
    while (position + 512 <= bytes.length) {
      const name = bytes.subarray(position, position + 100).toString().replace(/\0.*$/s, '');
      if (name.startsWith('package/dist/') && bytes[position + 156] === 48) { bytes[position + 512] ^= 1; break; }
      const size = parseInt(bytes.subarray(position + 124, position + 136).toString().trim(), 8); position += 512 + Math.ceil(size / 512) * 512;
    }
    assert(position + 512 < bytes.length, 'Runtime member fixture missing');
    f.request.release.siteArchive = f.persist('changed-site.tgz', gzipSync(bytes));
  }]) {
    const f = fixture(t); change(f); await assert.rejects(observe(f.request, f)); assert.equal(f.calls.length, 0);
  }
});

test('verifier echoes, account digest, route states and evidence age are independently checked', async t => {
  for (const change of [value => { value.attemptId = 'old-attempt'; }, value => { value.phase = 'production'; }, value => { value.accountReferenceSha256 = 'f'.repeat(64); }, value => { value.routes[1].routeKey = 'foreign'; }, value => { value.identity.sourceRevision = packageSource; }, value => { value.checkedAt = '2000-01-01T00:00:00Z'; }]) {
    const f = fixture(t), original = f.verify;
    f.verify = async (...args) => { const result = await original(...args); change(result); return result; };
    await assert.rejects(observe(f.request, f));
  }
});

test('public source change, STOP or trusted helper tamper during verifier prevents completion', async t => {
  for (const change of [f => { f.identity.artifactId = 'dpl_Changed'; }, f => { writeFileSync(f.request.policy.stopFile, 'STOP'); }, f => { writeFileSync(f.helper.path, 'unreviewed helper'); }]) {
    const f = fixture(t), original = f.verify;
    f.verify = async (...args) => { const value = await original(...args); change(f); return value; };
    await assert.rejects(observe(f.request, f));
  }
});

test('read-only Vercel metadata correlation binds existing project, owner, deployment and app source', async t => {
  const previous = process.env.NAEIL_STANDING_VERCEL_TOKEN; process.env.NAEIL_STANDING_VERCEL_TOKEN = 'fixture-only-token';
  t.after(() => { if (previous === undefined) delete process.env.NAEIL_STANDING_VERCEL_TOKEN; else process.env.NAEIL_STANDING_VERCEL_TOKEN = previous; });
  for (const mismatch of [null, 'projectId', 'ownerId', 'source', 'url', 'readyState', 'target']) {
    const f = fixture(t); f.request.service.observer = { ...f.request.service.observer, correlation: 'vercel-api', vercel: { projectId: 'prj_Fixture', teamId: 'team_Fixture', tokenEnvironment: 'NAEIL_STANDING_VERCEL_TOKEN' } };
    const remote = { id: f.identity.artifactId, projectId: 'prj_Fixture', ownerId: 'team_Fixture', readyState: 'READY', target: 'production', gitSource: { sha: siteSource }, url: 'design-system-fixture.vercel.app' };
    if (mismatch === 'source') remote.gitSource.sha = packageSource;
    else if (mismatch) remote[mismatch] = 'wrong';
    f.fetchImpl = async (url, options) => {
      if (!url.startsWith('https://api.vercel.com/')) return json(f.identity);
      assert.equal(new URL(url).searchParams.get('teamId'), 'team_Fixture'); assert.equal(options.headers.authorization, 'Bearer fixture-only-token'); assert.equal(options.redirect, 'error');
      return json(remote);
    };
    if (mismatch) await assert.rejects(observe(f.request, f));
    else { const result = await observe(f.request, f); assert.equal(result.artifact.platform.correlation, 'vercel-api'); assert(!JSON.stringify(result).includes('fixture-only-token')); }
  }
});

test('standing mode forwards production phase and bounded public JSON rejects oversized response', async t => {
  const f = fixture(t); f.request.mode = 'standing';
  assert.equal((await observe(f.request, f)).production.phase, 'production');
  const large = fixture(t); large.fetchImpl = async () => json({ ...large.identity, padding: 'x'.repeat(4097) });
  await assert.rejects(observe(large.request, large)); assert.equal(large.verifications.length, 0);
});

test('temporary GitHub metadata unavailability safely defers an observer with no deployment action', async t => {
  const f = fixture(t); f.github.pages = async () => { throw new GitHubUnavailable(); };
  const result = await observe(f.request, f); assert.equal(result.state, 'deferred'); assert.equal(result.mutationAttempted, false); assert.equal(f.verifications.length, 0);
});

test('GitHub Vercel commit status can correlate protected immutable URL without a broader credential', async t => {
  const f = fixture(t), pages = f.github.pages;
  f.request.service.observer = { ...f.request.service.observer, correlation: 'github-status', githubStatus: { teamSlug: 'naeils-projects', projectSlug: 'design-system' } };
  f.github.pages = async path => {
    if (!path.includes('/commits/')) return pages(path);
    assert.equal(path, `/repos/naeil-dev/naeil-ui/commits/${siteSource}/statuses`);
    return [{ id: 20, context: 'Vercel', state: 'success', creator: { login: 'vercel[bot]' }, created_at: new Date().toISOString(), url: `https://api.github.com/repos/naeil-dev/naeil-ui/statuses/${siteSource}`, target_url: 'https://vercel.com/naeils-projects/design-system/Fixture' }];
  };
  const fetchImpl = f.fetchImpl; f.fetchImpl = async (url, options) => { assert(!url.includes('vercel.app') && !url.includes('api.vercel.com')); return fetchImpl(url, options); };
  const result = await observe(f.request, f); assert.equal(result.state, 'production-verified'); assert.equal(result.artifact.platform.correlation, 'github-status'); assert.equal(result.artifact.platform.githubStatusId, '20');
});

test('GitHub status correlation rejects another publisher, artifact, source, team or project', async t => {
  for (const change of [value => { value.creator.login = 'outsider'; }, value => { value.target_url = 'https://vercel.com/naeils-projects/design-system/Other'; }, value => { value.target_url = 'https://vercel.com/other/design-system/Fixture'; }, value => { value.target_url = 'https://vercel.com/naeils-projects/other/Fixture'; }, value => { value.target_url = 'https://vercel.com/naeils-projects/design-system/dpl_Fixture'; }, value => { value.target_url = 'https://vercel.com/naeils-projects/design-system/Fixture?anything'; }, value => { value.target_url = 'https://vercel.com.attacker.example/naeils-projects/design-system/Fixture'; }, value => { value.url = `https://api.github.com/repos/naeil-dev/naeil-ui/statuses/${packageSource}`; }, value => { value.state = 'failure'; }]) {
    const f = fixture(t), pages = f.github.pages;
    f.request.service.observer = { ...f.request.service.observer, correlation: 'github-status', githubStatus: { teamSlug: 'naeils-projects', projectSlug: 'design-system' } };
    const status = { id: 20, context: 'Vercel', state: 'success', creator: { login: 'vercel[bot]' }, created_at: new Date().toISOString(), target_url: 'https://vercel.com/naeils-projects/design-system/Fixture' }; change(status);
    f.github.pages = async path => path.includes('/commits/') ? [status] : pages(path);
    await assert.rejects(observe(f.request, f)); assert.equal(f.verifications.length, 0);
  }
});

test('latest exact Vercel context status controls correlation, pending never falls back to old success', async t => {
  for (const state of ['pending', 'failure', 'missing', 'untrusted']) {
    const f = fixture(t), pages = f.github.pages;
    f.request.service.observer = { ...f.request.service.observer, correlation: 'github-status', githubStatus: { teamSlug: 'naeils-projects', projectSlug: 'design-system' } };
    const old = { id: 20, context: 'Vercel', state: 'success', creator: { login: 'vercel[bot]' }, created_at: '2026-01-01T00:00:00Z', target_url: 'https://vercel.com/naeils-projects/design-system/Fixture' };
    f.github.pages = async path => path.includes('/commits/') ? state === 'missing' ? [{ ...old, context: 'Other' }] : [old, { ...old, id: 21, state: state === 'untrusted' ? 'success' : state, creator: { login: state === 'untrusted' ? 'outsider' : 'vercel[bot]' }, created_at: '2026-01-02T00:00:00Z' }] : pages(path);
    if (['failure', 'untrusted'].includes(state)) await assert.rejects(observe(f.request, f));
    else { const result = await observe(f.request, f); assert.equal(result.state, 'deferred'); assert.equal(result.mutationAttempted, false); }
    assert.equal(f.verifications.length, 0);
  }
});

test('F15 cancelled site CI defers without observing deployment or running browser checks', async t => {
  const f = fixture(t); f.github.workflow = async () => ({ state: 'cancelled' });
  const result = await observe(f.request, f); assert.equal(result.state, 'deferred'); assert.equal(result.reasonCode, 'site-ci-cancelled'); assert.equal(result.mutationAttempted, false); assert.equal(f.calls.length, 0); assert.equal(f.verifications.length, 0);
});
test('F15 another valid live site revision defers and a later matching deploy verifies', async t => {
  const f = fixture(t); f.identity.sourceRevision = packageSource;
  const result = await observe(f.request, f); assert.equal(result.state, 'deferred'); assert.equal(result.reasonCode, 'site-revision-not-live'); assert.equal(f.verifications.length, 0);
  f.identity.sourceRevision = siteSource; assert.equal((await observe(f.request, f)).state, 'production-verified');
});
test('F15 a different main deployment winning during browser verification remains a deferral', async t => {
  const f = fixture(t), verify = f.verify;
  f.verify = async (...args) => { const result = await verify(...args); f.identity.sourceRevision = packageSource; return result; };
  const result = await observe(f.request, f); assert.equal(result.state, 'deferred'); assert.equal(result.reasonCode, 'site-revision-not-live'); assert.equal(result.mutationAttempted, false);
});

test('new-generation observer cannot drop its fence before metadata, directory or verifier work',async t=>{
 const f=fixture(t);f.request.generationSha256='a'.repeat(64);
 await assert.rejects(()=>observe(f.request,f),/fence|generation/i);assert.equal(f.calls.length,0);assert.equal(f.verifications.length,0);
});
