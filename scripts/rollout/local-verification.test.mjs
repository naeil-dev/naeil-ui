import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { verifyLocalProduction } from './production-verifier.mjs';
import { assertLocalVerification, createLocalVerifier } from './local-verification.mjs';
import { loadReleaseExpectations } from './release-expectations.mjs';
import { routeKey } from './route-contract.mjs';
import { runLocal } from './local-runner.mjs';
import { hash } from './local-runtime.mjs';

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
  for (const field of ['releaseId', 'serviceId', 'attemptId', 'idempotencyKey', 'phase', 'archiveSha256', 'referenceSha256', 'accountReferenceSha256', 'expectationsSha256']) {
    const missing = { ...result }; delete missing[field];
    for (const changed of [missing, { ...result, [field]: 'foreign' }]) assert.throws(() => assertLocalVerification(changed, request, started), new RegExp(field));
  }
  for (const mutate of [
    value => { value.schemaVersion = 2; }, value => { value.passed = false; },
    value => { value.identity.artifactId = 'foreign'; }, value => { value.identity.sourceRevision = 'f'.repeat(40); },
    value => { value.identity.ui.version = '0.7.42'; }, value => { value.identity.extra = 'unapproved'; },
    value => { value.checkedAt = '2000-01-01T00:00:00Z'; }, value => { value.checkedAt = new Date(Date.now() + 60_000).toISOString(); },
    value => { value.checkedAt = 'invalid'; }, value => { value.routes = []; },
    value => { value.routes[0].routeKey = 'foreign'; }, value => { value.routes[0].path = '/different'; },
    value => { value.routes[0].status = 'failed'; },
  ]) {
    const changed = structuredClone(result); mutate(changed);
    assert.throws(() => assertLocalVerification(changed, request, started));
  }
  assert.equal(result.expectationsSha256, loadReleaseExpectations(release).sha256);
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

test('R3 explicit recovery still refuses an unresolved refresh lock in the real verifier child', async t => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'local-verification-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const stateFile = join(root, 'session.json'), configPath = join(root, 'verifier.json');
  writeFileSync(stateFile, JSON.stringify({ access_token: 'fake-access', refresh_token: 'fake-refresh', expires_at: 4102444800, user: { id: 'fake-user' } }), { mode: 0o600 });
  mkdirSync(stateFile + '.refresh-lock', { mode: 0o700 });
  writeFileSync(stateFile + '.refresh-lock/pending.json', JSON.stringify({ phase: 'refresh-requested' }), { mode: 0o600 });
  const siteArtifact = { ...artifact, platform: { kind: 'vercel-git', deploymentId: artifact.id } };
  const site = { ...service, id: 'naeil', appId: 'naeil', origin: 'https://naeil.dev', mode: 'verify-only', artifact: siteArtifact };
  writeFileSync(configPath, JSON.stringify({ schemaVersion: 1, services: { naeil: site }, session: { stateFile, userId: 'fake-user', supabaseUrl: 'https://synthetic.supabase.co', anonKey: 'fake-key' } }), { mode: 0o600 });
  const nodeExecutable = realpathSync(process.execPath);
  site.verification = { configPath, configSha256: hash(readFileSync(configPath)), nodeExecutable, nodeSha256: hash(readFileSync(nodeExecutable)), browserDirectory: root };
  const config = { stateDirectory: join(root, 'state'), lockFile: join(root, 'machine.lock'), stopFile: join(root, 'STOP'), approvalFile: join(root, 'approval.json'), plan: { schemaVersion: 1, release: { ...release, archive: { ...release.archive, path: fileURLToPath(new URL('../../docs/rollout/frozen/naeil-ui-0.7.1.tgz', import.meta.url)) }, contract: { ...release.contract, path: fileURLToPath(new URL('../../docs/rollout/frozen/naeil-chrome-0.7.1.json', import.meta.url)) } }, services: [site] } };
  let children = 0;
  const verify = createLocalVerifier(config);
  const deps = { validateRelease: async () => ({ passed: true }), inspect: async () => ({ artifact: siteArtifact }), verify: context => verify({ ...context, registerChild: (child, options) => { children++; context.registerChild(child, options); } }) };
  const options = { command: 'verify', serviceId: 'naeil' };
  const first = await runLocal(config, deps, options);
  assert.equal(first.status, 'manual-recovery'); assert.equal(first.failure.reasonCode, 'session-refresh-locked');
  const second = await runLocal(config, deps, { ...options, recoverVerification: true });
  assert.equal(second.status, 'manual-recovery'); assert.equal(second.failure.stage, 'session-refresh'); assert.equal(second.failure.reasonCode, 'session-refresh-locked'); assert.equal(children, 2);
  assert.deepEqual(JSON.parse(readFileSync(stateFile + '.refresh-lock/pending.json')), { phase: 'refresh-requested' });
  const receipts = readdirSync(join(config.stateDirectory, 'attempts')).map(name => JSON.parse(readFileSync(join(config.stateDirectory, 'attempts', name))));
  assert.equal(receipts.filter(value => value.kind === 'verification-recovery').length, 1);
  assert.doesNotMatch(JSON.stringify(receipts), /fake-access|fake-refresh|fake-key/);
});
