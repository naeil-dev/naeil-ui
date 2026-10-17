import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { digest } from './rollout.mjs';
import { runVercelStage } from './vercel-adapter.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'naeil-vercel-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, '.vercel/output/static/.well-known'), { recursive: true });
  symlinkSync('config.json', join(root, '.vercel/output/config-link.json'));
  mkdirSync(join(root, '.next/server/app/.well-known'), { recursive: true });
  const project = JSON.stringify({ projectId: 'prj_fixture', orgId: 'team_fixture', settings: {} });
  writeFileSync(join(root, '.vercel/project.json'), project);
  const sourceRevision = 'b'.repeat(40), archive = join(root, 'ui.tgz'), reference = join(root, 'reference.json');
  writeFileSync(archive, 'frozen');
  const release = { schemaVersion: 1, releaseId: 'ui-0.7.1', version: '0.7.1', previousVersion: '0.7.0', sourceRevision, archive: { url: 'https://example.com/ui-0.7.1.tgz', path: archive, sha256: digest('frozen') }, contract: { version: '1', path: reference }, changes: ['fix'] };
  const ref = JSON.stringify({ schemaVersion: 1, kind: 'independent-release-render', frozen: true, sourceRevision, archiveSha256: release.archive.sha256, ui: { version: release.version, contractVersion: '1' } });
  writeFileSync(reference, ref); release.contract.sha256 = digest(ref);
  const previousArtifact = { id: 'old-artifact', immutable: true, sha256: 'c'.repeat(64), sourceRevision: 'd'.repeat(40), storageRef: `sha256:${'c'.repeat(64)}`, ui: { version: '0.7.0', contractVersion: '1' }, platform: { kind: 'vercel-prebuilt', deploymentId: 'dpl_old', deploymentUrl: 'https://old.vercel.app', projectId: 'prj_fixture', teamId: 'team_fixture' } };
  const previousPath = join(root, 'previous.json'); writeFileSync(previousPath, JSON.stringify(previousArtifact));
  const context = { schemaVersion: 1, release, service: { id: 'naeil', origin: 'https://naeil.example' }, sourceRevision, idempotencyKey: 'ui-0.7.1:naeil', policy: { schemaVersion: 1, enabled: true, approvedBy: 'owner', approvalRef: 'test', expiresAt: '2099-01-01', services: ['naeil'], approvedReleaseIds: [release.releaseId], stopFile: join(root, 'STOP'), maxEvidenceAgeSeconds: 3600, rollbackApproved: true, rollbackScope: 'code-only' }, adapterOptions: { artifactDirectory: join(root, 'artifacts'), previousArtifactPath: previousPath, vercel: { enabled: true, executable: '/reviewed/vercel', version: '99.0.0', projectId: 'prj_fixture', teamId: 'team_fixture', projectContextSha256: digest(project), stateDirectory: join(root, 'platform-state'), identityOutputPath: 'static/.well-known/naeil-ui.json' } } };
  context.policy.patchWindow = { minVersion: '0.7.1', maxVersion: '0.7.9', contractVersion: '1', services: ['naeil'], approvedBy: 'owner', approvalRef: 'window-test', reason: 'Fictional bounded test approval', startsAt: '2026-01-01', expiresAt: '2099-01-01' };
  const calls = []; let alias = 'dpl_old', identity; const responses = new Map();
  const deployment = (id, artifact) => ({ id, url: id === 'dpl_old' ? 'old.vercel.app' : 'new.vercel.app', readyState: 'READY', target: 'production', projectId: 'prj_fixture', ownerId: 'team_fixture', meta: { naeilSourceRevision: artifact.sourceRevision, naeilArtifactId: artifact.id, naeilArtifactSha256: artifact.sha256 }, env: { DO_NOT_PERSIST: 'private-field-fixture' } });
  const deps = {
    verifyIdentity: async (_origin, expected) => ({ artifactId: expected.id }),
    run: async (file, args, options) => {
      calls.push({ file, args, options });
      assert.equal(options.shell, false);
      const verb = args[0];
      if (verb === 'git') throw new Error('Unexpected git invocation');
      if (file === 'git') return { stdout: args[0] === 'rev-parse' ? sourceRevision : '' };
      if (verb === '--version') return { stdout: '99.0.0\n' };
      if (verb === 'api') {
        const endpoint = args[1];
        if (endpoint.startsWith('/v9/projects/')) return { stdout: JSON.stringify({ id: 'prj_fixture', accountId: 'team_fixture' }) };
        if (endpoint.startsWith('/v4/aliases/')) return { stdout: JSON.stringify({ alias: 'naeil.example', deploymentId: alias, projectId: 'prj_fixture' }) };
        const id = endpoint.includes('dpl_old') || endpoint.includes('old.vercel.app') ? 'dpl_old' : 'dpl_new';
        return { stdout: JSON.stringify(responses.get(id) ?? deployment(id, id === 'dpl_old' ? previousArtifact : context.artifact)) };
      }
      if (verb === 'build') {
        identity = { schemaVersion: 1, appId: 'naeil', artifactId: options.env.NAEIL_APP_ARTIFACT_ID, sourceRevision, ui: { version: release.version, contractVersion: '1' } };
        writeFileSync(join(root, '.next/BUILD_ID'), identity.artifactId);
        writeFileSync(join(root, '.next/server/app/.well-known/naeil-ui.json.body'), JSON.stringify(identity));
        writeFileSync(join(root, '.vercel/output/static/.well-known/naeil-ui.json'), JSON.stringify(identity));
        writeFileSync(join(root, '.vercel/output/config.json'), '{"version":3}');
        return { stdout: 'built' };
      }
      if (verb === 'deploy') return { stdout: 'https://new.vercel.app\n' };
      if (verb === 'promote') { alias = args[1]; return { stdout: 'promoted' }; }
      if (verb === 'rollback') { alias = args[1]; return { stdout: 'rolled back' }; }
      throw new Error(`Unexpected command ${file} ${args.join(' ')}`);
    }
  };
  return { root, context, calls, deps, responses, setAlias: value => { alias = value; }, run: step => runVercelStage(step, context, { root, ...deps }) };
}

async function prepared(t) {
  const f = fixture(t); await f.run('build'); const packaged = await f.run('package');
  Object.assign(f.context, packaged); return f;
}

test('Vercel bridge is disabled before any subprocess and refuses an unpinned executable', async t => {
  const f = fixture(t); f.context.adapterOptions.vercel.enabled = false;
  await assert.rejects(f.run('build'), /disabled/); assert.equal(f.calls.length, 0);
  f.context.adapterOptions.vercel.enabled = true; f.context.adapterOptions.vercel.version = null;
  await assert.rejects(f.run('build'), /version/); assert.equal(f.calls.length, 0);
});

test('production prebuilt output is packaged, deployed without promotion, inspected, promoted and code-rolled back exactly once', async t => {
  const f = await prepared(t);
  const deployed = await f.run('deploy'); assert.equal(deployed.deploymentId, 'dpl_new');
  assert.equal(f.calls.filter(c => c.args[0] === 'promote').length, 0);
  const command = f.calls.find(c => c.args[0] === 'deploy');
  for (const flag of ['--prebuilt', '--prod', '--skip-domain']) assert(command.args.includes(flag));
  assert.equal(command.options.cwd, join(f.context.adapterOptions.artifactDirectory, f.context.artifact.sha256));
  assert.equal((await f.run('deploy')).deploymentId, 'dpl_new');
  await f.run('activate'); await f.run('activate');
  await f.run('rollback'); await f.run('rollback');
  assert.equal(f.calls.filter(c => c.args[0] === 'deploy').length, 1);
  assert.deepEqual(f.calls.filter(c => ['promote', 'rollback'].includes(c.args[0])).map(c => c.args.slice(0, 2)), [['promote', 'dpl_new'], ['rollback', 'dpl_old']]);
  const marker = readFileSync(join(f.context.adapterOptions.vercel.stateDirectory, 'ui-0.7.1', 'naeil', 'deploy.json'), 'utf8');
  assert(!marker.includes('private-field-fixture'));
});

test('build context drift and output tampering stop before a deployment command', async t => {
  const f = fixture(t); writeFileSync(join(f.root, '.vercel/project.json'), '{}');
  await assert.rejects(f.run('build'), /context/);
  const g = await prepared(t); writeFileSync(join(g.context.adapterOptions.artifactDirectory, g.context.artifact.sha256, '.vercel/output/config.json'), '{"version":2}');
  await assert.rejects(g.run('deploy'), /output|changed|digest/);
  assert(!g.calls.some(c => c.args[0] === 'deploy'));
});

test('extra cwd or project configuration outside the reviewed output cannot reach deploy', async t => {
  for (const path of ['vercel.json', '.vercel/.env.production.local']) {
    const f = await prepared(t);
    writeFileSync(join(f.context.adapterOptions.artifactDirectory, f.context.artifact.sha256, path), '{}');
    await assert.rejects(f.run('deploy'), /Unmanifested file/);
    assert(!f.calls.some(c => c.args[0] === 'deploy'));
  }
});

test('secret filenames, escaping output symlinks, and CLI version drift fail closed', async t => {
  const f = fixture(t); writeFileSync(join(f.root, '.vercel/output/.env.local'), 'fictional');
  await assert.rejects(f.run('build'), /secret/); assert(!f.calls.some(c => c.args[0] === 'deploy'));
  const g = fixture(t); symlinkSync('../../ui.tgz', join(g.root, '.vercel/output/escape'));
  await assert.rejects(g.run('build'), /symlink/);
  const h = fixture(t); h.context.adapterOptions.vercel.version = '99.0.1';
  await assert.rejects(h.run('build'), /version/); assert(!h.calls.some(c => c.args[0] === 'build'));
});

test('wrong team/project/source/artifact or non-READY deployment cannot be promoted', async t => {
  for (const wrong of [{ ownerId: 'team_wrong' }, { projectId: 'prj_wrong' }, { readyState: 'BUILDING' }, { meta: { naeilSourceRevision: null } }, { meta: { naeilSourceRevision: 'e'.repeat(40) } }, { meta: { naeilArtifactId: 'wrong' } }, { meta: { naeilArtifactSha256: 'f'.repeat(64) } }]) {
    const f = await prepared(t); const meta = { naeilSourceRevision: f.context.artifact.sourceRevision, naeilArtifactId: f.context.artifact.id, naeilArtifactSha256: f.context.artifact.sha256, ...wrong.meta };
    f.responses.set('dpl_new', { id: 'dpl_new', url: 'new.vercel.app', readyState: 'READY', target: 'production', projectId: 'prj_fixture', ownerId: 'team_fixture', ...wrong, meta });
    await assert.rejects(f.run('deploy'));
    assert(!f.calls.some(c => c.args[0] === 'promote'));
  }
});

test('timeout after promotion dispatch creates uncertain durable state and blocks retry or racing rollback', async t => {
  const f = await prepared(t); await f.run('deploy');
  const normal = f.deps.run; f.deps.run = async (...args) => { if (args[1][0] === 'promote') throw new Error('simulated timeout'); return normal(...args); };
  await assert.rejects(f.run('activate'), /uncertain|failed/);
  f.deps.run = normal;
  await assert.rejects(f.run('activate'), /reconcil/);
  await assert.rejects(f.run('rollback'), /reconcil/);
});

test('unrelated alias ownership and revoked rollback approval block all platform mutation', async t => {
  const f = await prepared(t); f.setAlias('dpl_unrelated');
  await assert.rejects(f.run('deploy'), /alias/); assert(!f.calls.some(c => c.args[0] === 'deploy'));
  const g = await prepared(t); await g.run('deploy'); await g.run('activate'); g.context.policy.rollbackApproved = false;
  await assert.rejects(g.run('rollback'), /rollback/i); assert(!g.calls.some(c => c.args[0] === 'rollback'));
});
