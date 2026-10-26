import assert from 'node:assert/strict';
import test from 'node:test';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { atomicJSON, automationDigest, fileReference, fingerprint, hash, readPrivateJSON, routeKey } from './standing-config.mjs';
import { runtimeIndex } from './package-runtime.mjs';
import { syntheticArchive } from './fixtures/release.mjs';
import { declaration } from './fixtures/reviewed-expectations.mjs';
import { syntheticSite } from './fixtures/site-continuation.mjs';

const api = () => import('./site-continuation.mjs').catch(error => { if (error.code === 'ERR_MODULE_NOT_FOUND') return {}; throw error; });
const automationRoot = realpathSync(new URL('../..', import.meta.url).pathname);
function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'site-read-only-'))); chmodSync(root, 0o700); t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const name of ['inputs', 'session', 'evidence']) mkdirSync(join(root, name), { mode: 0o700 });
  const put = (name, value) => { const path = join(root, name); atomicJSON(path, value); return fileReference(path); };
  const bytes = syntheticArchive(), persist = (name, bytes) => { const path = join(root, 'inputs', name); writeFileSync(path, bytes, { mode: 0o600 }); return { path, sha256: hash(bytes) }; };
  const archive = persist('published.tgz', bytes), runtimeSha256 = hash(JSON.stringify(runtimeIndex(bytes)));
  const release = { schemaVersion: 1, releaseId: 'naeil-ui-0.7.42', version: '0.7.42', previousVersion: '0.7.41', sourceRevision: 'a'.repeat(40), siteSourceRevision: 'b'.repeat(40), siteRuntimeSha256: runtimeSha256, archive, siteArchive: persist('original-site.tgz', bytes), contract: { version: '1', ...persist('chrome.json', Buffer.from('{}')) }, account: persist('account.json', Buffer.from('{}')) };
  release.expectations = put('inputs/expectations.json', declaration(release));
  const site = syntheticSite(root, release, syntheticArchive('0.7.42', 'export const synthetic = true;', 'new source archive'));
  const identity = { schemaVersion: 1, appId: 'naeil', artifactId: 'dpl_Original', sourceRevision: release.siteSourceRevision, ui: { version: release.version, contractVersion: '1' } };
  const service = { id: 'naeil', appId: 'naeil', origin: 'https://naeil.dev', routes: [{ path: '/en', locale: 'en', policy: 'shared', renderState: { access: 'public' } }, { path: '/en/account', locale: 'en', policy: 'shared', renderState: { access: 'protected', visible: '[data-synthetic-account]' } }], observer: { workflowPath: '.github/workflows/verify.yml', environment: 'Production', deploymentCreator: 'vercel[bot]', correlation: 'immutable-url' }, verification: { command: { file: realpathSync(process.execPath), args: ['never-spawned'], timeoutMs: 10 * 60_000 } } };
  const request = { schemaVersion: 1, kind: 'standing-site-read-only', release, service, idempotencyKey: 'synthetic:site-read-only', attemptId: 'check-1', expectedIdentity: identity, outputDirectory: join(root, 'evidence', 'check-1'), referencePath: release.contract.path, maxEvidenceAgeSeconds: 300 };
  const session = { supabaseUrl: 'https://synthetic.supabase.co', anonKey: 'synthetic-public-key', userId: 'synthetic-user', stateFile: join(root, 'session', 'session.json') };
  put('session/session.json', { access_token: 'synthetic-access', refresh_token: 'synthetic-refresh', user: { id: session.userId }, expires_at: Date.now() / 1000 + 3600 });
  const config = { schemaVersion: 1, evidenceRoot: join(root, 'evidence'), session, services: { naeil: service } };
  const authorization = { schemaVersion: 1, kind: 'standing-site-read-only-approval', input: put('inputs/request.json', request), verificationConfig: put('inputs/verifier.json', config), workspaceDirectory: root, automation: { root: automationRoot, sha256: automationDigest(automationRoot) }, trustedFiles: { [realpathSync(process.execPath)]: hash(readFileSync(process.execPath)) }, approvedBy: 'synthetic-owner', approvalRef: 'synthetic://site-read-only', approvedAt: '2020-01-01T00:00:00Z', expiresAt: '2099-01-01T00:00:00Z', revoked: false };
  const authorizationRef = put('inputs/authorization.json', authorization), events = [];
  const github = { mainAncestor: async sha => { events.push(['main', sha]); }, workflow: async sha => { events.push(['ci', sha]); return { state: 'success', id: 10 }; }, pages: async path => path.endsWith('/statuses') ? [{ id: 12, state: 'success', created_at: new Date().toISOString(), creator: { login: 'vercel[bot]' }, environment_url: 'https://synthetic.vercel.app' }] : [{ id: 11, sha: identity.sourceRevision, environment: 'Production', creator: { login: 'vercel[bot]' } }] };
  const fetchImpl = async () => Response.json(identity);
  const verify = async (input, verifierConfig, hooks) => {
    events.push(['browser', input.service.routes.map(route => route.renderState.access)]); hooks.beforeAction(); hooks.beforeWrite();
    return { schemaVersion: 1, passed: true, releaseId: release.releaseId, serviceId: 'naeil', idempotencyKey: request.idempotencyKey, attemptId: request.attemptId, phase: 'site-read-only', identity: structuredClone(identity), checkedAt: new Date().toISOString(), archiveSha256: release.archive.sha256, referenceSha256: release.contract.sha256, accountReferenceSha256: release.account.sha256, expectationsSha256: release.expectations.sha256, siteTargetSha256: fingerprint(input.siteTarget), routes: input.service.routes.map(route => ({ path: route.path, routeKey: routeKey(route), passed: true })) };
  };
  return { root, request, release, site, identity, config, authorization, authorizationRef, put, events, github, fetchImpl, verify };
}

test('T7 exact site target requires a complete approved old-to-new source and independent runtime proof', async t => {
  const { resolveSiteTarget } = await api(), f = fixture(t), original = structuredClone(f.release);
  assert.equal(typeof resolveSiteTarget, 'function');
  assert.equal(resolveSiteTarget(f.release).sourceRevision, f.release.siteSourceRevision);
  const target = resolveSiteTarget(f.release, f.site.approval);
  assert.equal(target.sourceRevision, f.site.approval.sourceRevision); assert.equal(target.deploymentId, 'dpl_Continued'); assert.equal(target.approvalSha256, fingerprint(f.site.approval));
  assert.notEqual(target.archive.sha256, f.release.siteArchive.sha256); assert.deepEqual(f.release, original);
  for (const change of [a => { a.oldSourceRevision = 'f'.repeat(40); }, a => { a.sourceRevision = 'f'.repeat(40); }, a => { a.diffSha256 = 'f'.repeat(64); }, a => { a.files.pop(); }, a => { a.files[0].newSha256 = 'f'.repeat(64); }, a => { a.treeSha = 'f'.repeat(40); }, a => { a.packageProof.sourceRevision = a.oldSourceRevision; }, a => { a.packageProof.runtimeSha256 = 'f'.repeat(64); }, a => { a.expiresAt = '2001-01-01'; }, a => { a.revoked = true; }, a => { a.releaseSha256 = 'f'.repeat(64); }]) {
    const invalid = structuredClone(f.site.approval); change(invalid); assert.throws(() => resolveSiteTarget(f.release, invalid));
  }
});

test('T7 site approval rejects disconnected Git history and executable local Git configuration', async t => {
  const { resolveSiteTarget } = await api();
  {
    const f = fixture(t), a = f.site.approval;
    f.site.git(['checkout', '--orphan', 'disconnected']); f.site.git(['-c', 'commit.gpgsign=false', 'commit', '--allow-empty', '-qm', 'disconnected synthetic source']);
    a.sourceRevision = f.site.git(['rev-parse', 'HEAD']).toString().trim(); a.packageProof.sourceRevision = a.sourceRevision;
    assert.throws(() => resolveSiteTarget(f.release, a), /Git|inspection/);
  }
  {
    const f = fixture(t); f.site.git(['config', 'diff.external', '/untrusted/synthetic-hook']);
    assert.throws(() => resolveSiteTarget(f.release, f.site.approval), /Git|configuration/);
  }
});

test('T7 standalone entrypoint works with STOP present and no active pointer; records only separate exact evidence', async t => {
  const { validateSiteReadOnly } = await api(), f = fixture(t);
  writeFileSync(join(f.root, 'STOP'), 'STOP\n', { mode: 0o600 }); const stop = readFileSync(join(f.root, 'STOP'));
  assert.equal(typeof validateSiteReadOnly, 'function');
  const result = await validateSiteReadOnly(f.request, { ...f, authorization: f.authorizationRef });
  assert.equal(result.state, 'production-verified'); assert.equal(result.kind, 'standing-site-read-only-result');
  assert.deepEqual(f.events.find(event => event[0] === 'browser')[1], ['public', 'protected']);
  assert.deepEqual(readFileSync(join(f.root, 'STOP')), stop); assert(!existsSync(join(f.root, 'active.json'))); assert(!existsSync(join(f.root, 'state.json'))); assert(!existsSync(join(f.root, 'dispatcher.lock')));
  assert.deepEqual(readPrivateJSON(join(f.request.outputDirectory, 'result.json')), result);
});

test('T7 standalone binds a separately approved new site and rejects an unapproved live SHA', async t => {
  const { validateSiteReadOnly, resolveSiteTarget } = await api();
  {
    const f = fixture(t); f.request.service.siteContinuationApproval = f.site.approval;
    f.request.siteTarget = resolveSiteTarget(f.release, f.site.approval);
    f.identity.sourceRevision = f.site.approval.sourceRevision; f.identity.artifactId = f.site.approval.deploymentId;
    f.authorization.input = f.put('inputs/request.json', f.request); f.authorization.verificationConfig = f.put('inputs/verifier.json', f.config); f.authorizationRef = f.put('inputs/authorization.json', f.authorization);
    const result = await validateSiteReadOnly(f.request, { ...f, authorization: f.authorizationRef });
    assert.equal(result.siteTarget.approvalSha256, fingerprint(f.site.approval)); assert.equal(result.artifact.sourceRevision, f.site.approval.sourceRevision);
    await assert.rejects(() => validateSiteReadOnly(f.request, { ...f, authorization: f.authorizationRef }), /already exists/);
  }
  {
    const f = fixture(t); f.identity.sourceRevision = f.site.approval.sourceRevision;
    await assert.rejects(() => validateSiteReadOnly(f.request, { ...f, authorization: f.authorizationRef })); assert(!existsSync(f.request.outputDirectory));
  }
});

test('T7 standalone refuses unbound config/session/routes/target/approval and stale evidence before success', async t => {
  const { validateSiteReadOnly } = await api(); assert.equal(typeof validateSiteReadOnly, 'function');
  for (const cause of ['input', 'config', 'session', 'route', 'target', 'expired', 'stale', 'during-action', 'operational', 'ignoreStop']) {
    const f = fixture(t);
    if (cause === 'input') f.request.attemptId = 'unapproved';
    if (cause === 'config') atomicJSON(f.authorization.verificationConfig.path, { ...f.config, unapproved: true });
    if (cause === 'session') f.config.session.stateFile = join(f.root, 'native-session.json');
    if (cause === 'route') f.request.service.routes[1].renderState.access = 'public';
    if (cause === 'target') f.request.siteTarget = { sourceRevision: f.site.approval.sourceRevision };
    if (cause === 'operational') f.request.policy = { enabled: true };
    if (cause === 'ignoreStop') f.request.ignoreStop = true;
    if (cause === 'operational' || cause === 'ignoreStop') { f.authorization.input = f.put('inputs/request.json', f.request); f.authorizationRef = f.put('inputs/authorization.json', f.authorization); }
    if (cause === 'expired') { f.authorization.expiresAt = '2001-01-01'; f.authorizationRef = f.put('inputs/authorization.json', f.authorization); }
    if (cause === 'during-action') { const verify = f.verify; f.verify = async (...args) => { atomicJSON(f.authorization.input.path, { changed: true }); return verify(...args); }; }
    if (cause === 'stale') { const verify = f.verify; f.verify = async (...args) => ({ ...await verify(...args), checkedAt: '2000-01-01' }); }
    if (cause === 'session') { f.authorization.verificationConfig = f.put('inputs/verifier.json', f.config); f.authorizationRef = f.put('inputs/authorization.json', f.authorization); }
    await assert.rejects(() => validateSiteReadOnly(f.request, { ...f, authorization: f.authorizationRef }));
    assert(!existsSync(join(f.request.outputDirectory, 'result.json')));
  }
});

test('T7 standalone refuses protected/public evidence that expires during final provenance awaits', async t => {
  const { validateSiteReadOnly } = await api(), f = fixture(t), now = Date.now(); let calls = 0;
  f.github.mainAncestor = async () => { if (++calls === 2) t.mock.method(Date, 'now', () => now + 301_000); };
  await assert.rejects(() => validateSiteReadOnly(f.request, { ...f, authorization: f.authorizationRef }), /Stale production/);
  assert(!existsSync(join(f.request.outputDirectory, 'result.json')));
});

test('T7 standalone bounds its session/browser action lifetime without a subprocess or active generation', async t => {
  const { validateSiteReadOnly } = await api(), f = fixture(t), now = Date.now(), verify = f.verify;
  f.verify = async (...args) => { t.mock.method(Date, 'now', () => now + f.request.service.verification.command.timeoutMs + 1000); return verify(...args); };
  await assert.rejects(() => validateSiteReadOnly(f.request, { ...f, authorization: f.authorizationRef }), /deadline expired/);
  assert(!existsSync(join(f.request.outputDirectory, 'result.json')));
});
