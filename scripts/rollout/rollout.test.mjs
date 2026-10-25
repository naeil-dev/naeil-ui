import { routeKey } from './route-contract.mjs';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import { packageStandalone } from './naeil-adapter.mjs';
import { aggregate, assertReference, digest, policyGate, runService, verifyIdentity, validateRelease, validateReleaseEvent } from './rollout.mjs';

const sha = 'a'.repeat(64);
const revision = 'b'.repeat(40);
const release = { schemaVersion: 1, releaseId: 'ui-0.6.1', version: '0.6.1', previousVersion: '0.6.0', sourceRevision: revision, archive: { url: 'https://example.com/naeil-ui-0.6.1.tgz', sha256: sha }, contract: { version: '1', path: 'reference.json', sha256: sha }, changes: [] };
const service = { id: 'example', origin: 'https://example.com', routes: [{ path: '/', policy: 'shared', renderState: { access: 'public' } }], deployment: { adapterId: 'example' }, ui: { adoption: 'adopted' } };
const patchWindow = { minVersion: '0.6.1', maxVersion: '0.6.9', contractVersion: '1', services: ['example'], approvedBy: 'owner', approvalRef: 'patch-window-1', reason: 'Bounded same-contract fixes', startsAt: '2026-01-01', expiresAt: '2099-01-01' };
const policy = { schemaVersion: 1, enabled: true, approvedBy: 'owner', approvalRef: 'approval-1', patchWindow, expiresAt: '2099-01-01T00:00:00.000Z', services: ['example'], stopFile: '/nonexistent/rollout-stop', maxEvidenceAgeSeconds: 3600, rollbackApproved: true, rollbackScope: 'code-only' };
const adapter = { runner: ['ubuntu-latest'], cwd: '/tmp', commands: Object.fromEntries(['update', 'test', 'build', 'package', 'deploy', 'activate', 'rollback'].map(step => [step, { file: process.execPath, args: ['adapter.mjs', step] }])) };
const artifactBytes = Buffer.from('immutable application package');
const artifactSha = digest(artifactBytes);
const artifact = { id: 'artifact-1', sha256: artifactSha, storageRef: `https://example.com/artifacts/${artifactSha}`, immutable: true, sourceRevision: revision, ui: { version: release.version, contractVersion: '1' } };
const previous = { ...artifact, id: 'artifact-0', sha256: 'c'.repeat(64), storageRef: `https://example.com/artifacts/${'c'.repeat(64)}`, sourceRevision: 'd'.repeat(40), ui: { version: '0.6.0', contractVersion: '1' } };

test('policy defaults disabled, requires approved patch window, blocks 0.x minors and contract/frame/DOM/guard changes', () => {
  assert.equal(policyGate(release, service, { ...policy, enabled: false }).state, 'review-required');
  assert.equal(policyGate(release, service, { ...policy, patchWindow: null }).state, 'review-required');
  assert.equal(policyGate({ ...release, version: '0.7.0' }, service, policy).state, 'review-required');
  for (const change of ['frame', 'dom', 'guard', 'contract']) assert.equal(policyGate({ ...release, changes: [change] }, service, policy).state, 'review-required');
  assert.equal(policyGate(release, service, policy).state, 'eligible');
});

test('bounded patch window permits future IDs but rejects range, contract, service and time drift', () => {
  assert.equal(policyGate({ ...release, releaseId: 'future-unknown-id', version: '0.6.8', previousVersion: '0.6.7' }, service, policy).state, 'eligible');
  for (const changed of [{ version: '0.6.10', previousVersion: '0.6.9' }, { version: '0.6.0', previousVersion: '0.5.9' }, { contract: { ...release.contract, version: '2' } }]) assert.equal(policyGate({ ...release, ...changed }, service, policy).state, 'review-required');
  for (const changed of [{ minVersion: '0.6.2' }, { maxVersion: '0.7.9' }, { services: [] }, { startsAt: '2099-01-01' }, { expiresAt: '2000-01-01' }, { contractVersion: '2' }]) assert.equal(policyGate(release, service, { ...policy, patchWindow: { ...patchWindow, ...changed } }).state, 'review-required');
  assert.equal(policyGate(release, service, { ...policy, patchWindow: null, approvedReleaseIds: [release.releaseId] }).state, 'review-required');
});

test('floating versions and unhashed archives/references cannot enter pipeline', () => {
  for (const candidate of [{ ...release, version: 'latest' }, { ...release, archive: { ...release.archive, sha256: 'bad' } }, { ...release, contract: { version: '1', path: 'reference.json' } }]) assert.throws(() => validateRelease(candidate));
});

test('published release event must match frozen UI version tag and reviewed UI source', () => {
  assert.doesNotThrow(() => validateReleaseEvent(release, { tag: 'v0.6.1', sourceRevision: revision }));
  assert.throws(() => validateReleaseEvent(release, { tag: 'v0.6.2', sourceRevision: revision }), /tag/);
  assert.throws(() => validateReleaseEvent(release, { tag: 'v0.6.1', sourceRevision: 'd'.repeat(40) }), /source/);
});

test('one-time reviewed migration binds exact release identity, change classes, service and approval expiry', () => {
  const migration = { ...release, version: '0.7.0', changes: ['frame', 'dom', 'guard'] };
  const reviewedMigration = { releaseId: migration.releaseId, version: migration.version, sourceRevision: migration.sourceRevision, archiveSha256: migration.archive.sha256, changes: migration.changes, services: ['example'], approvedBy: 'owner', approvalRef: 'migration-approval', reason: 'Reviewed migration', expiresAt: '2099-01-01T00:00:00Z' };
  assert.equal(policyGate(migration, service, { ...policy, reviewedMigration }).mode, 'reviewed-migration');
  assert.equal(policyGate({ ...migration, archive: { ...migration.archive, sha256: 'd'.repeat(64) } }, service, { ...policy, reviewedMigration }).state, 'review-required');
  assert.equal(policyGate(migration, service, { ...policy, reviewedMigration: { ...reviewedMigration, expiresAt: '2000-01-01T00:00:00Z' } }).state, 'review-required');
});

function fixture(t, overrides = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'naeil-rollout-test-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const archive = join(dir, 'ui.tgz'); const reference = join(dir, 'reference.json');
  writeFileSync(archive, 'frozen archive');
  const referenceBytes = Buffer.from(JSON.stringify({ schemaVersion: 1, kind: 'independent-release-render', frozen: true, archiveSha256: digest(Buffer.from('frozen archive')), sourceRevision: revision, ui: { version: release.version, contractVersion: '1' } }));
  writeFileSync(reference, referenceBytes);
  const frozen = { ...release, archive: { ...release.archive, path: archive, sha256: digest(Buffer.from('frozen archive')) }, contract: { ...release.contract, path: reference, sha256: digest(referenceBytes) } };
  const artifactPath = join(dir, 'app.tar'); writeFileSync(artifactPath, artifactBytes);
  const calls = [];
  const execute = async (step, _command, context) => {
    calls.push(step);
    if (overrides[step] instanceof Error) throw overrides[step];
    if (overrides[step]) return overrides[step];
    if (step === 'update') return { uiVersion: frozen.version, archiveSha256: frozen.archive.sha256, dependencyExact: true, sourceRevision: revision };
    if (step === 'package') return { artifact: { ...artifact, path: artifactPath }, previousArtifact: previous };
    if (step === 'deploy') return { deploymentId: 'deployment-1', artifactId: artifact.id, artifactSha256: artifact.sha256 };
    if (step === 'activate') return { activated: true, artifactId: artifact.id, artifactSha256: artifact.sha256 };
    if (step === 'rollback') return { activated: true, artifactId: context.previousArtifact.id, artifactSha256: context.previousArtifact.sha256 };
    return { passed: true };
  };
  const verifyProduction = async () => ({ passed: true, referenceSha256: frozen.contract.sha256, checkedAt: new Date().toISOString(), identity: { schemaVersion: 1, appId: service.id, artifactId: artifact.id, sourceRevision: revision, ui: artifact.ui }, routes: [{ path: '/', routeKey: routeKey(service.routes[0]), passed: true }] });
  const verifyRollback = async () => ({ schemaVersion: 1, appId: service.id, artifactId: previous.id, sourceRevision: previous.sourceRevision, ui: previous.ui });
  return { dir, calls, options: { release: frozen, service, adapter, policy, stateDir: dir, execute, verifyProduction, verifyRollback } };
}

test('reference binds reviewed archive/source/UI/contract even when wrong reference bytes have their own valid hash', async t => {
  const f = fixture(t);
  const good = { schemaVersion: 1, kind: 'independent-release-render', frozen: true, archiveSha256: f.options.release.archive.sha256, sourceRevision: revision, ui: { version: release.version, contractVersion: '1' } };
  for (const wrong of [{ ...good, archiveSha256: sha }, { ...good, sourceRevision: 'd'.repeat(40) }, { ...good, frozen: false }, { ...good, ui: { ...good.ui, version: '0.6.0' } }, { ...good, ui: { ...good.ui, contractVersion: '2' } }]) {
    const bytes = Buffer.from(JSON.stringify(wrong)); const candidate = { ...f.options.release, contract: { ...f.options.release.contract, sha256: digest(bytes) } };
    assert.throws(() => assertReference(candidate, bytes), /Reference/);
    writeFileSync(candidate.contract.path, bytes);
    await assert.rejects(runService({ ...f.options, release: candidate }), /Reference/); assert.deepEqual(f.calls, []);
  }
  assert.throws(() => assertReference(f.options.release, Buffer.from(JSON.stringify({ ...good, frozen: false }))), /digest/);
});

test('deploy CLI requires frozen release manifest and rejects unrelated reference before HTTP/browser work', t => {
  const f = fixture(t); const releasePath = join(f.dir, 'release.json'); const expected = join(f.dir, 'expected.json'); const routes = join(f.dir, 'routes.json');
  const unrelated = Buffer.from(JSON.stringify({ schemaVersion: 1, kind: 'independent-release-render', frozen: true, archiveSha256: sha, sourceRevision: revision, ui: artifact.ui }));
  writeFileSync(f.options.release.contract.path, unrelated); writeFileSync(releasePath, JSON.stringify({ ...f.options.release, contract: { ...f.options.release.contract, sha256: digest(unrelated) } }));
  writeFileSync(expected, JSON.stringify({ schemaVersion: 1, appId: service.id, artifactId: artifact.id, sourceRevision: revision, ui: artifact.ui })); writeFileSync(routes, JSON.stringify(service.routes));
  assert.throws(() => execFileSync(process.execPath, ['scripts/rollout/verify-deploy.mjs', '--origin', 'http://127.0.0.1:1', '--expected', expected, '--routes', routes, '--release', releasePath, '--reference', f.options.release.contract.path, '--output', join(f.dir, 'result')], { stdio: 'pipe' }), error => error.status === 1 && error.stderr.toString().includes('Reference archive digest differs'));
  assert(!existsSync(join(f.dir, 'result')));
});

test('failed test stops build/package/deployment and preserves step failure', async t => {
  const f = fixture(t, { test: new Error('test failed') });
  const result = await runService(f.options);
  assert.equal(result.state, 'gate-failed'); assert.deepEqual(f.calls, ['update', 'test']); assert.match(result.failure.message, /test failed/);
});

test('partial update or digest mismatch never deploys', async t => {
  for (const update of [{ uiVersion: '0.6.0', archiveSha256: sha, dependencyExact: true, sourceRevision: revision }, { uiVersion: release.version, archiveSha256: sha, dependencyExact: false, sourceRevision: revision }]) {
    const f = fixture(t, { update }); assert.equal((await runService(f.options)).state, 'gate-failed'); assert.deepEqual(f.calls, ['update']);
  }
  const f = fixture(t); f.options.release.archive.sha256 = sha;
  await assert.rejects(runService(f.options), /digest/); assert.deepEqual(f.calls, []);
});

test('unknown adapter and non-adoption remain visible blockers', async t => {
  const f = fixture(t);
  assert.equal((await runService({ ...f.options, adapter: undefined })).state, 'unresolved');
  assert.equal((await runService({ ...f.options, adapter: undefined, policy: { ...policy, services: ['not-adopted-example'], patchWindow: { ...patchWindow, services: ['not-adopted-example'] } }, service: { ...service, id: 'not-adopted-example', ui: { adoption: 'not-adopted' } } })).state, 'not-adopted');
  assert.deepEqual(f.calls, []);
});

test('successful pipeline verifies production, records immutable previous artifact, and rerun is idempotent', async t => {
  const f = fixture(t); const first = await runService(f.options); const again = await runService(f.options);
  assert.equal(first.state, 'production-verified'); assert.deepEqual(again, first);
  assert.deepEqual(f.calls, ['update', 'test', 'build', 'package', 'deploy', 'activate']);
  assert.deepEqual(first.previousArtifact, previous);
  await assert.rejects(runService({ ...f.options, service: { ...service, routes: [{ path: '/new', policy: 'shared' }] } }), /stale/);
});

test('deploy and activation pending have distinct non-success states', async t => {
  const f = fixture(t, { deploy: new Error('platform unavailable') }); assert.equal((await runService(f.options)).state, 'not-deployed');
  const pending = fixture(t, { activate: { activated: false, pending: true } }); assert.equal((await runService(pending.options)).state, 'activation-pending');
});

test('pending update is PR-pending and does not test or deploy', async t => {
  const f = fixture(t, { update: { pending: true, pullRequest: 'https://example.com/pull/1' } });
  assert.equal((await runService(f.options)).state, 'pr-pending'); assert.deepEqual(f.calls, ['update']);
});

test('artifact bytes and deployment digest mismatch stop dependent activation', async t => {
  const f = fixture(t, { deploy: { deploymentId: 'deployment-1', artifactId: artifact.id, artifactSha256: sha } });
  assert.equal((await runService(f.options)).state, 'not-deployed'); assert(!f.calls.includes('activate'));
  const broken = fixture(t); writeFileSync(join(broken.dir, 'app.tar'), 'tampered');
  assert.equal((await runService(broken.options)).state, 'gate-failed'); assert(!broken.calls.includes('deploy'));
});

test('adapter shell commands are rejected before updates', async t => {
  const f = fixture(t); f.options.adapter = { ...adapter, commands: { ...adapter.commands, update: { file: '/bin/sh', args: ['-c', 'true'] } } };
  assert.equal((await runService(f.options)).state, 'gate-failed'); assert.deepEqual(f.calls, []);
});

test('real argv adapter runs every stage with bound structured receipts and rejects a foreign service receipt', async t => {
  for (const foreign of [false, true]) {
    const f = fixture(t); const script = join(f.dir, 'adapter.mjs');
    writeFileSync(script, `
      import {readFileSync,writeFileSync} from 'node:fs';
      const c=JSON.parse(readFileSync(process.env.NAEIL_ROLLOUT_INPUT,'utf8'));
      const step=process.env.NAEIL_ROLLOUT_STEP;
      const result={releaseId:c.release.releaseId,serviceId:${foreign ? "'foreign-service'" : 'c.service.id'},idempotencyKey:c.idempotencyKey,passed:true};
      if(step==='update')Object.assign(result,{uiVersion:c.release.version,archiveSha256:c.release.archive.sha256,dependencyExact:true,sourceRevision:'${revision}'});
      if(step==='package')Object.assign(result,{artifact:${JSON.stringify({ ...artifact, path: join(f.dir, 'app.tar') })},previousArtifact:${JSON.stringify(previous)}});
      if(step==='deploy')Object.assign(result,{deploymentId:'deployment-1',artifactId:c.artifact.id,artifactSha256:c.artifact.sha256});
      if(step==='activate')Object.assign(result,{activated:true,artifactId:c.artifact.id,artifactSha256:c.artifact.sha256});
      writeFileSync(process.env.NAEIL_ROLLOUT_OUTPUT,JSON.stringify(result));
    `);
    f.options.execute = undefined;
    f.options.adapter = { ...adapter, cwd: f.dir, commands: Object.fromEntries(Object.keys(adapter.commands).map(step => [step, { file: process.execPath, args: [script] }])) };
    const result = await runService(f.options);
    assert.equal(result.state, foreign ? 'gate-failed' : 'production-verified');
    if (foreign) assert.match(result.failure.message, /service mismatch/);
    else assert.deepEqual(result.steps.map(step => step.step), ['update', 'test', 'build', 'package', 'deploy', 'activate']);
  }
});

test('failed production checks use only authorized previous immutable artifact rollback', async t => {
  const f = fixture(t); f.options.verifyProduction = async () => { throw new Error('production identity mismatch'); };
  const receipt = await runService(f.options); assert.equal(receipt.state, 'gate-failed'); assert.equal(receipt.rollback.state, 'previous-identity-verified'); assert.equal(f.calls.at(-1), 'rollback');
  const denied = fixture(t); denied.options.verifyProduction = f.options.verifyProduction; denied.options.policy = { ...policy, rollbackApproved: false };
  assert.equal((await runService(denied.options)).rollback.state, 'approval-required'); assert(!denied.calls.includes('rollback'));
});

test('rollback never claims restored when previous production identity does not match', async t => {
  const f = fixture(t); f.options.verifyProduction = async () => { throw new Error('new release browser failed'); };
  f.options.verifyRollback = async () => ({ schemaVersion: 1, appId: service.id, artifactId: artifact.id, sourceRevision: revision, ui: artifact.ui });
  const result = await runService(f.options); assert.equal(result.state, 'gate-failed'); assert.equal(result.rollback.state, 'failed');
});

test('non-UI routes are explicit exclusions while unknown UI and unapproved showcase block', async t => {
  const f = fixture(t); f.options.service = { ...service, routes: [...service.routes, { path: '/api/health', policy: 'non-ui' }] };
  assert.equal((await runService(f.options)).state, 'production-verified');
  const unknown = fixture(t); unknown.options.service = { ...service, routes: [...service.routes, { path: '/unknown', policy: 'unavailable-ui' }] };
  assert.equal((await runService(unknown.options)).state, 'gate-failed'); assert.deepEqual(unknown.calls, []);
  const approved = fixture(t); approved.options.service = { ...service, routes: [...service.routes, { path: '/protected', policy: 'canonical' }] };
  approved.options.policy = { ...policy, exceptions: [{ serviceId: service.id, path: '/protected', routeKey: routeKey(approved.options.service.routes[1]), releaseId: release.releaseId, approvedBy: 'owner', approvalRef: 'route-approval', reason: 'Temporary isolated auth fixture unavailable', expiresAt: '2099-01-01T00:00:00Z' }] };
  const result = await runService(approved.options); assert.equal(result.state, 'production-verified'); assert.equal(result.routePolicies[0].state, 'approved-exception');
});

test('stop switch prevents work and failure receipts cannot silently retry', async t => {
  const f = fixture(t); const stopFile = join(f.dir, 'STOP'); writeFileSync(stopFile, 'stop');
  assert.equal((await runService({ ...f.options, policy: { ...policy, stopFile } })).state, 'gate-failed'); assert.deepEqual(f.calls, []);
  const failed = fixture(t, { test: new Error('failed') }); await runService(failed.options); await runService(failed.options); assert.deepEqual(failed.calls, ['update', 'test']);
});

test('aggregate cannot close unknown DNS, missing routes, stale or cross-release receipts, or non-adoption', async t => {
  const f = fixture(t); const receipt = await runService(f.options);
  const registry = { schemaVersion: 1, scope: { dnsComplete: true }, services: [service] };
  assert.equal(aggregate(f.options.release, registry, [receipt], policy).complete, true);
  assert.equal(aggregate(f.options.release, { ...registry, scope: { dnsComplete: false } }, [receipt], policy).complete, false);
  for (const bad of [{ ...receipt, releaseId: 'older' }, { ...receipt, completedAt: '2000-01-01T00:00:00Z' }, { ...receipt, production: { ...receipt.production, routes: [] } }, { ...receipt, production: { ...receipt.production, referenceSha256: sha } }, { ...receipt, state: 'pr-pending' }, { ...receipt, state: 'not-adopted' }]) assert.equal(aggregate(f.options.release, registry, [bad], policy).complete, false);
  const exception = { serviceId: 'example', releaseId: release.releaseId, approvedBy: 'owner', approvalRef: 'exception-1', reason: 'approved temporary omission', expiresAt: '2099-01-01T00:00:00Z' };
  assert.equal(aggregate(f.options.release, registry, [], { ...policy, exceptions: [exception] }).services[0].state, 'approved-exception');
  assert.equal(aggregate(f.options.release, { ...registry, scope: { dnsComplete: false } }, [], { ...policy, exceptions: [exception] }).complete, false);
});

test('production identity requires all exact public fields; HTTP 200 is insufficient', async t => {
  let body = { schemaVersion: 1, appId: 'wrong', artifactId: artifact.id, sourceRevision: revision, ui: artifact.ui };
  const server = createServer((_request, response) => { response.setHeader('content-type', 'application/json'); response.end(JSON.stringify(body)); });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve)); t.after(() => server.close());
  const origin = `http://127.0.0.1:${server.address().port}`;
  await assert.rejects(verifyIdentity(origin, { appId: service.id, ...artifact }), /appId/);
  body = { ...body, appId: service.id }; assert.deepEqual(await verifyIdentity(origin, { appId: service.id, ...artifact }), body);
  body = { ...body, internalManifest: '/private/path' }; await assert.rejects(verifyIdentity(origin, { appId: service.id, ...artifact }), /extra fields/); delete body.internalManifest;
  body = { ...body, sourceRevision: 'development' }; await assert.rejects(verifyIdentity(origin, { appId: service.id, ...artifact }), /full reviewed source/); body.sourceRevision = revision;
  body = { ...body, ui: { ...body.ui, contractVersion: '2' } }; await assert.rejects(verifyIdentity(origin, { appId: service.id, ...artifact, ui: { version: release.version, contractVersion: '1' } }), /contractVersion/);
});

test('naeil preparation packages runnable standalone bytes and refuses bundled environment files', async t => {
  const f = fixture(t); const root = join(f.dir, 'app');
  mkdirSync(join(root, '.next/standalone'), { recursive: true }); mkdirSync(join(root, '.next/static'), { recursive: true }); mkdirSync(join(root, 'public'), { recursive: true });
  writeFileSync(join(root, '.next/standalone/server.js'), 'console.log("standalone server");');
  writeFileSync(join(root, '.next/static/style.css'), 'body{}');
  writeFileSync(join(root, '.next/BUILD_ID'), artifact.id);
  writeFileSync(join(root, '.gitignore'), '.next/\n'); writeFileSync(join(root, 'public/favicon.svg'), '<svg/>');
  execFileSync('git', ['init', '-q', root]); execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'Build source'], { cwd: root });
  const builtRevision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  writeFileSync(join(root, '.next/naeil-rollout-build.json'), JSON.stringify({ schemaVersion: 1, appId: 'naeil', artifactId: artifact.id, sourceRevision: builtRevision, ui: artifact.ui }));
  const packaged = await packageStandalone(root, join(f.dir, 'artifacts'));
  assert(existsSync(packaged.path)); assert.equal(packaged.id, artifact.id); assert(packaged.storageRef.includes(packaged.sha256));
  writeFileSync(join(root, '.next/standalone/.env.local'), 'PRIVATE_VALUE=should-never-package');
  await assert.rejects(packageStandalone(root, join(f.dir, 'other-artifacts')), /environment/);
  rmSync(join(root, '.next/standalone/.env.local'));
  writeFileSync(join(root, 'public/favicon.svg'), '<svg>changed after build</svg>');
  await assert.rejects(packageStandalone(root, join(f.dir, 'changed-artifacts')), /clean/);
  execFileSync('git', ['add', 'public/favicon.svg'], { cwd: root }); execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-qm', 'New source after build'], { cwd: root });
  await assert.rejects(packageStandalone(root, join(f.dir, 'wrong-source-artifacts')), /source revision/);
});

test('same-URL locale and authenticated state each require their own browser receipt', async t => {
  const f = fixture(t);
  f.options.service = { ...service, routes: [
    { ...service.routes[0], locale: 'ko', state: 'login' },
    { ...service.routes[0], locale: 'ko', state: 'dashboard', renderState: { access: 'protected', visible: '[data-workspace]' } },
    { ...service.routes[0], locale: 'en', state: 'login' },
  ] };
  const original = f.options.verifyProduction;
  f.options.verifyProduction = async () => ({ ...await original(), routes: [{ path: '/', routeKey: routeKey(f.options.service.routes[0]), passed: true }] });
  const result = await runService(f.options);
  assert.equal(result.state, 'gate-failed');
  assert.match(result.failure.message, /Missing browser route verification/);
});

test('route exception is bound to its exact locale and render state', async t => {
  const f = fixture(t);
  const protectedRoute = { path: '/', policy: 'canonical', locale: 'ko', state: 'dashboard', renderState: { access: 'protected', visible: '[data-workspace]' } };
  f.options.service = { ...service, routes: [...service.routes, protectedRoute] };
  f.options.policy = { ...policy, exceptions: [{ serviceId: service.id, releaseId: release.releaseId, path: '/', routeKey: routeKey({ ...protectedRoute, locale: 'en' }), approvedBy: 'owner', approvalRef: 'specific-state', reason: 'Approved English only', expiresAt: '2099-01-01' }] };
  const result = await runService(f.options);
  assert.equal(result.state, 'gate-failed');
  assert.match(result.failure.message, /Missing browser route verification/);
});

test('a route exception cannot close the whole service without production evidence', t => {
  const f = fixture(t);
  const exception = { serviceId: service.id, releaseId: release.releaseId, path: '/', routeKey: routeKey(service.routes[0]), approvedBy: 'owner', approvalRef: 'one-route', reason: 'One reviewed route', expiresAt: '2099-01-01' };
  const result = aggregate(f.options.release, { schemaVersion: 1, scope: { dnsComplete: true }, services: [service] }, [], { ...policy, exceptions: [exception] });
  assert.equal(result.complete, false);
  assert.equal(result.services[0].state, 'unresolved');
});
