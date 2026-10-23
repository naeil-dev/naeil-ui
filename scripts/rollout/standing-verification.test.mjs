import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateVerificationRequest, assertAccountReference } from './standing-verification.mjs';

const release = { ...JSON.parse(readFileSync(new URL('../../docs/rollout/release.json', import.meta.url))), account: { sha256: 'a'.repeat(64) } };
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
