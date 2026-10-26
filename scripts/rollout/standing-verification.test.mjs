import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateVerificationRequest, assertAccountReference } from './standing-verification.mjs';

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
