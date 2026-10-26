import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { validateVerificationRequest, assertAccountReference, verifySiteReadOnly } from './standing-verification.mjs';
import { renewVerificationSession, readPrivateJson } from './verification-session.mjs';

const tuple = JSON.parse(readFileSync(new URL('./expectations/0.7.1.json',import.meta.url))).release;
const release = { releaseId:tuple.releaseId,version:tuple.version,sourceRevision:tuple.sourceRevision,archive:{sha256:tuple.archiveSha256},contract:{version:'1',sha256:tuple.chromeSha256},account:{sha256:tuple.accountSha256} };
const route = { path: '/', locale: 'ja', policy: 'shared', renderState: { access: 'protected', visible: '.workspace' } };
const service = { id: 'jev', appId: 'jev', origin: 'https://jev.naeil.dev', routes: [route] };
const artifact = { id: 'test-build', sourceRevision: 'b'.repeat(40), ui: { version: '0.7.1', contractVersion: '1' } };
const identity = { schemaVersion: 1, appId: 'jev', artifactId: artifact.id, sourceRevision: artifact.sourceRevision, ui: artifact.ui };
const request = { schemaVersion: 1, mode: 'adopt', phase: 'adopt', release, service, artifact, expectedIdentity: identity, idempotencyKey: 'release:jev', attemptId: 'attempt-1' };
const config = { schemaVersion: 1, services: { jev: service } };

test('verifier binds identity and route scope to local service configuration', () => {
  assert.deepEqual(validateVerificationRequest(request, config), identity);
  for (const changed of [
    { ...request, service: { ...service, origin: 'https://evil.test' } },
    { ...request, service: { ...service, routes: [{ ...route, renderState: { access: 'public' } }] } },
    { ...request, expectedIdentity: { ...identity, appId: 'naeil' } },
    { ...request, artifact: { ...artifact, sourceRevision: 'development' } },
    { ...request, phase: 'invented' },
  ]) assert.throws(() => validateVerificationRequest(changed, config));
});

test('account presentation checks use independent reference geometry without collecting account text', () => {
  const reference = JSON.parse(readFileSync(new URL('../../docs/rollout/frozen/naeil-account-0.7.1.json', import.meta.url))).cases[0].render;
  assertAccountReference(reference, reference, 'ja');
  assertAccountReference({ ...reference, fontFamily: 'Pretendard Variable' }, reference, 'ko');
  assert.throws(() => assertAccountReference({ ...reference, fontFamily: 'Arial' }, reference, 'ko'), /font/i);
  assert.throws(() => assertAccountReference({ ...reference, menu: { ...reference.menu, width: '180px' } }, reference, 'ja'), /menu/i);
  assert.throws(() => assertAccountReference({ ...reference, uiVersion: '0.6.0' }, reference, 'ja'), /version/i);
});

test('new verification binds reviewed route profiles and rejects unapproved overrides before browser/network work',()=>{
  const changed={...route,chrome:{projectProfile:{id:'unknown',sha256:'f'.repeat(64)}}};
  const services={jev:{...service,routes:[changed]}};
  assert.throws(()=>validateVerificationRequest({...request,service:services.jev},{...config,services}),/profile/i);
  const override={...route,chrome:{projects:[{href:'https://attacker.test'}]}};
  const unapproved={...service,routes:[override]};
  assert.throws(()=>validateVerificationRequest({...request,service:unapproved},{...config,services:{jev:unapproved}}),/chrome|override/i);
});

test('production evidence requires the independent expectation digest for every new verification',async()=>{
 const {assertProduction}=await import('./standing-config.mjs');
 const {loadReleaseExpectations}=await import('./release-expectations.mjs');
 const {routeKey}=await import('./route-contract.mjs');
 const r={...request,policy:{maxEvidenceAgeSeconds:300}};
 const production={schemaVersion:1,passed:true,releaseId:release.releaseId,serviceId:'jev',idempotencyKey:r.idempotencyKey,attemptId:r.attemptId,phase:'adopt',identity,archiveSha256:release.archive.sha256,referenceSha256:release.contract.sha256,accountReferenceSha256:release.account.sha256,checkedAt:new Date().toISOString(),routes:[{path:'/',routeKey:routeKey(route),passed:true}]};
 assert.throws(()=>assertProduction(production,r,artifact),/expectations/i);
 production.expectationsSha256=loadReleaseExpectations(release).sha256;
 assert.doesNotThrow(()=>assertProduction(production,r,artifact));
 assert.throws(()=>assertProduction({...production,expectationsSha256:'f'.repeat(64)},r,artifact),/expectations/i);
});

test('new-generation verification requires the current fence before any session or browser work',()=>{
 assert.throws(()=>validateVerificationRequest({...request,generationSha256:'a'.repeat(64)},config),/fence|generation/i);
});

test('T7 standalone uses the same protected/public renderer and approved session refresh hooks without operational policy', async t => {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'site-verifier-'))); chmodSync(directory, 0o700); t.after(() => rmSync(directory, { recursive: true, force: true }));
  const accountPath = join(directory, 'account.json'); writeFileSync(accountPath, readFileSync(new URL('../../docs/rollout/frozen/naeil-account-0.7.1.json', import.meta.url)), { mode: 0o600 });
  const evidenceRoot = join(directory, 'evidence'); mkdirSync(evidenceRoot, { mode: 0o700 });
  const session = { supabaseUrl: 'https://synthetic.supabase.co', anonKey: 'synthetic-public', userId: 'synthetic-user', stateFile: join(directory, 'session.json') };
  const old = { access_token: 'old-synthetic-access', refresh_token: 'old-synthetic-refresh', user: { id: session.userId }, expires_at: Date.now() / 1000 + 4000 };
  writeFileSync(session.stateFile, JSON.stringify(old), { mode: 0o600 });
  const routes = [{ path: '/en', locale: 'en', policy: 'shared', renderState: { access: 'public' } }, { path: '/en/account', locale: 'en', policy: 'shared', renderState: { access: 'protected', visible: '[data-synthetic]' } }];
  const site = { id: 'naeil', appId: 'naeil', origin: 'https://naeil.dev', routes, verification: { command: { timeoutMs: 1000 } } };
  const artifact = { id: 'dpl_Synthetic', sourceRevision: 'b'.repeat(40), ui: { version: '0.7.1', contractVersion: '1' }, platform: { kind: 'vercel-git', deploymentId: 'dpl_Synthetic' } };
  const input = { schemaVersion: 1, kind: 'standing-site-read-only', phase: 'site-read-only', release: { ...release, siteSourceRevision: artifact.sourceRevision, account: { ...release.account, path: accountPath } }, service: site, artifact, expectedIdentity: { schemaVersion: 1, appId: 'naeil', artifactId: artifact.id, sourceRevision: artifact.sourceRevision, ui: artifact.ui }, idempotencyKey: 'site:synthetic', attemptId: 'synthetic-1', outputDirectory: join(evidenceRoot, 'check-1') };
  const config = { schemaVersion: 1, evidenceRoot, services: { naeil: site }, session };
  let actions = 0, writes = 0, refreshed = false, rendered = false;
  const hooks = { beforeAction: () => { actions++; }, beforeWrite: () => { writes++; } };
  const result = await verifySiteReadOnly(input, config, hooks, {
    sessionRenewer: (selected, options) => renewVerificationSession(selected, { ...options, fetchImpl: async (url, request) => {
      assert.equal(url, session.supabaseUrl + '/auth/v1/token?grant_type=refresh_token'); assert.equal(JSON.parse(request.body).refresh_token, old.refresh_token); refreshed = true;
      return Response.json({ ...old, access_token: 'new-synthetic-access', refresh_token: 'new-synthetic-refresh' });
    } }),
    productionVerifier: async options => {
      rendered = true; assert(refreshed); assert.deepEqual(options.routes, routes); assert.equal(options.screenshots, false); assert.equal(typeof options.checkAccount, 'function');
      const contexts = [];
      await options.contextFactory({ browser: { newContext: async () => ({ addCookies: async cookies => { contexts.push(cookies); } }) }, origin: site.origin, contextOptions: {} });
      assert.equal(contexts[0][0].domain, '.naeil.dev'); options.beforeAction(); options.beforeWrite();
      return { passed: true, identity: input.expectedIdentity, routes: [] };
    },
    boundaryFetch: () => { throw Error('No synthetic boundaries declared'); },
  });
  assert(rendered && actions >= 4 && writes >= 4); assert.equal(result.phase, 'site-read-only');
  assert.equal((await readPrivateJson(session.stateFile)).refresh_token, 'new-synthetic-refresh');
  assert.equal(input.policy, undefined); assert.equal(input.generationFence, undefined);
  await assert.rejects(() => verifySiteReadOnly(input, config), /guards/);
  await assert.rejects(() => verifySiteReadOnly({ ...input, service: { ...site, id: 'jev' } }, config, hooks), /only naeil/);
  assert.throws(() => validateVerificationRequest(input, config), /Standalone/);
});
