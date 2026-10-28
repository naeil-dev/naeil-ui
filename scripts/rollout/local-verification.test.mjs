import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { verifyLocalProduction } from './standing-verification.mjs';
import { assertLocalVerification } from './local-verification.mjs';
import { loadReleaseExpectations } from './release-expectations.mjs';
import { routeKey } from './route-contract.mjs';

const tuple = JSON.parse(readFileSync(new URL('./expectations/0.7.1.json', import.meta.url))).release;
const release = { releaseId: tuple.releaseId, version: tuple.version, sourceRevision: tuple.sourceRevision, archive: { sha256: tuple.archiveSha256 }, contract: { version: '1', sha256: tuple.chromeSha256 }, account: { sha256: tuple.accountSha256, path: fileURLToPath(new URL('../../docs/rollout/frozen/naeil-account-0.7.1.json', import.meta.url)) } };
const route = { path: '/', locale: 'ja', policy: 'shared', renderState: { access: 'protected', visible: '.workspace' } };
const service = { id: 'jev', appId: 'jev', origin: 'https://jev.naeil.dev', routes: [route] };
const artifact = { id: 'local-test', sourceRevision: 'b'.repeat(40), ui: { version: '0.7.1', contractVersion: '1' } };
const request = { schemaVersion: 1, kind: 'local-rollout-verification', phase: 'production', verificationTimeoutMs: 2400000, release, service, artifact, idempotencyKey: 'test:jev', attemptId: 'attempt' };

test('local verification keeps protected rendering and exact receipt validation without legacy authority', async t => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'local-verification-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const config = { schemaVersion: 1, services: { jev: service }, evidenceRoot: root, session: { supabaseUrl: 'https://synthetic.supabase.co' } };
  let renewed = false;
  const started = Date.now();
  const result = await verifyLocalProduction({ ...request, outputDirectory: join(root, 'render') }, config, { beforeAction() {}, beforeWrite() {} }, {
    sessionRenewer: async (session, options) => { assert.equal(options.minimumValidityMs, 45 * 60_000); renewed = true; return { expires_at: Date.now() / 1000 + 3600, synthetic: true }; },
    productionVerifier: async options => {
      assert(renewed); assert.equal(options.screenshots, false); assert.equal(typeof options.checkAccount, 'function');
      return { schemaVersion: 1, passed: true, identity: { schemaVersion: 1, appId: 'jev', artifactId: artifact.id, sourceRevision: artifact.sourceRevision, ui: artifact.ui }, referenceSha256: release.contract.sha256, expectationsSha256: loadReleaseExpectations(release).sha256, checkedAt: new Date().toISOString(), routes: [{ path: '/', routeKey: routeKey(route), status: 'production-verified' }] };
    },
  });
  assertLocalVerification(result, request, started);
  assert.throws(() => assertLocalVerification({ ...result, attemptId: 'different' }, request, started), /attemptId/);
  assert.throws(() => assertLocalVerification({ ...result, routes: [] }, request, started), /route/);
  await assert.rejects(() => verifyLocalProduction({ ...request, policy: {} }, config, { beforeAction() {}, beforeWrite() {} }), /legacy/);
});

test('403 at anonymous boundary is retryable and cannot enter session rotation or browser work', async t => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'local-verification-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const config = { schemaVersion: 1, services: { jev: { ...service, anonymousBoundaries: [{ path: '/', status: 307 }] } }, evidenceRoot: root };
  await assert.rejects(() => verifyLocalProduction({ ...request, outputDirectory: join(root, 'render') }, config, { beforeAction() {}, beforeWrite() {} }, {
    boundaryFetch: async () => new Response('', { status: 403 }),
    sessionRenewer: () => assert.fail('403 must precede session mutation'),
  }), error => error.retryable && error.status === 403 && error.stage === 'anonymous-boundary');
});
