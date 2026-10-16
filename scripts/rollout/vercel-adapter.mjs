import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { closeSync, cpSync, existsSync, fsyncSync, lstatSync, mkdirSync, mkdtempSync, openSync, readFileSync, readdirSync, readlinkSync, realpathSync, renameSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { assertFrozen, digest, policyGate, releaseFingerprint, verifyIdentity } from './rollout.mjs';

const exec = promisify(execFile);
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const HEX = /^[0-9a-f]{64}$/;
const ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/;
const inside = (path, root) => path === root || (!relative(root, path).startsWith('..') && !isAbsolute(relative(root, path)));

function durable(path, value) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${randomUUID()}.tmp`;
  const fd = openSync(temporary, 'wx', 0o600);
  try { writeFileSync(fd, JSON.stringify(value, null, 2)); fsyncSync(fd); } finally { closeSync(fd); }
  renameSync(temporary, path);
  const directory = openSync(dirname(path), 'r'); try { fsyncSync(directory); } finally { closeSync(directory); }
}

// Hash executable modes as well as bytes. Only contained, portable symlinks and
// regular files are accepted. No environment/config credentials enter a tar.
function inventory(root) {
  assert(lstatSync(root).isDirectory() && !lstatSync(root).isSymbolicLink(), 'Output root must not be a symlink');
  root = realpathSync(root);
  const files = {};
  const visit = directory => {
    for (const name of readdirSync(directory).sort()) {
      assert(!/^(?:\.env(?:\.|$)|server\.env$|credential\.json$|signing\.key$)/i.test(name), 'Forbidden secret filename in Vercel output');
      const path = join(directory, name), info = lstatSync(path), key = relative(root, path);
      if (info.isDirectory()) visit(path);
      else if (info.isSymbolicLink()) {
        const link = readlinkSync(path);
        assert(!isAbsolute(link) && inside(resolve(directory, link), root) && inside(realpathSync(path), root), 'Output symlink escapes immutable artifact');
        files[key] = { link };
      } else { assert(info.isFile(), 'Non-file in output'); files[key] = { sha256: digest(readFileSync(path)), mode: info.mode & 0o777 }; }
    }
  };
  visit(root); return digest(JSON.stringify(files));
}

function outputIdentity(output, path, identity) {
  assert(typeof path === 'string' && path && !isAbsolute(path) && inside(resolve(output, path), output), 'Reviewed relative identityOutputPath required');
  assert.deepEqual(read(join(output, path)), identity, 'Prebuilt output identity mismatch');
  assert.equal(read(join(output, 'config.json')).version, 3, 'Vercel Build Output API version 3 required');
}

function deploymentUrl(value) {
  const url = new URL(value.startsWith('https://') ? value : `https://${value}`);
  assert(url.protocol === 'https:' && /^[a-z0-9-]+\.vercel\.app$/.test(url.hostname) && !url.username && !url.password && !url.port && url.pathname === '/' && !url.search && !url.hash, 'Exact immutable Vercel deployment URL required');
  return url.origin;
}

function previousIdentity(artifact, context, config) {
  assert.equal(artifact?.immutable, true, 'Immutable previous artifact required');
  assert.match(artifact.id, ID); assert.match(artifact.sha256, HEX); assert.match(artifact.sourceRevision, /^[0-9a-f]{40}$/);
  assert(artifact.storageRef?.includes(artifact.sha256), 'Previous artifact requires digest-addressed storage');
  assert.equal(artifact.ui?.version, context.release.previousVersion, 'Previous UI version mismatch');
  assert.equal(artifact.ui?.contractVersion, context.release.contract.version, 'Previous UI contract mismatch');
  assert.equal(artifact.platform?.kind, 'vercel-prebuilt');
  assert.equal(artifact.platform.projectId, config.projectId); assert.equal(artifact.platform.teamId, config.teamId);
  assert.match(artifact.platform.deploymentId, /^dpl_[A-Za-z0-9]+$/);
  deploymentUrl(artifact.platform.deploymentUrl);
}

export async function runVercelStage(step, context, { root = process.cwd(), run = exec, verifyIdentity: verify = verifyIdentity } = {}) {
  assert(['build', 'package', 'deploy', 'activate', 'rollback'].includes(step), 'Unsupported Vercel bridge stage');
  const options = context.adapterOptions || {}, config = options.vercel || {};
  assert.equal(config.enabled, true, 'Vercel bridge is disabled');
  assert(isAbsolute(config.executable || ''), 'Reviewed absolute Vercel executable required');
  assert.match(config.version || '', /^\d+\.\d+\.\d+$/, 'Exact reviewed Vercel CLI version required');
  assert.match(config.projectId || '', /^prj_[A-Za-z0-9]+$/, 'Reviewed Vercel project required');
  assert.match(config.teamId || '', /^team_[A-Za-z0-9]+$/, 'Reviewed Vercel team required');
  assert.match(config.projectContextSha256 || '', HEX, 'Reviewed existing project context hash required');
  for (const [name, path] of [['state', config.stateDirectory], ['artifact', options.artifactDirectory], ['previous artifact', options.previousArtifactPath]]) assert(isAbsolute(path || ''), `Absolute ${name} path required`);
  assert.match(context.release.releaseId, ID); assert.match(context.service.id, ID);
  const origin = new URL(context.service.origin);
  assert(origin.protocol === 'https:' && !origin.username && !origin.password && !origin.port && origin.pathname === '/' && !origin.search && !origin.hash, 'Reviewed production origin required');
  const authorize = () => {
    assertFrozen(context.release);
    assert.equal(policyGate(context.release, context.service, context.policy).state, 'eligible', 'Current rollout approval required');
    assert(!existsSync(context.policy.stopFile), 'Stop switch is active');
    if (step === 'rollback') assert(context.policy.rollbackApproved === true && context.policy.rollbackScope === 'code-only' && context.rollbackScope !== 'data', 'Code-only rollback approval required');
  };
  authorize();
  const env = { ...process.env, CI: '1', NO_COLOR: '1', VERCEL_ORG_ID: config.teamId, VERCEL_PROJECT_ID: config.projectId };
  const cli = async (args, cwd = root, extraEnv = {}) => {
    // Never persist CLI stdout/stderr: authenticated API objects may contain env.
    try { return await run(config.executable, args, { cwd, shell: false, env: { ...env, ...extraEnv }, timeout: 900000, maxBuffer: 16 * 1024 * 1024 }); }
    catch { throw new Error(`Vercel ${args[0]} command failed; platform outcome may require reconciliation`); }
  };
  const version = await cli(['--version']);
  assert([config.version, `Vercel CLI ${config.version}`].includes((version.stdout || '').trim()) || (version.stderr || '').trim() === `Vercel CLI ${config.version}`, 'Installed Vercel CLI version differs from reviewed pin');
  const scoped = ['--scope', config.teamId, '--non-interactive'];
  const api = async endpoint => JSON.parse((await cli(['api', `${endpoint}${endpoint.includes('?') ? '&' : '?'}teamId=${config.teamId}`, '--raw', ...scoped])).stdout);
  const project = await api(`/v9/projects/${config.projectId}`);
  assert.equal(project.id, config.projectId, 'Remote project mismatch'); assert.equal(project.accountId, config.teamId, 'Remote project team mismatch');
  const checkAlias = async allowed => {
    const alias = await api(`/v4/aliases/${encodeURIComponent(origin.hostname)}`);
    assert.equal(alias.alias, origin.hostname, 'Production alias hostname mismatch');
    assert.equal(alias.projectId, config.projectId, 'Production alias project mismatch');
    assert(allowed.includes(alias.deploymentId), 'Production alias changed; reconcile before mutation');
    return alias.deploymentId;
  };
  const inspect = async (target, artifact) => {
    const item = await api(`/v13/deployments/${encodeURIComponent(target)}`);
    assert.match(item.id, /^dpl_[A-Za-z0-9]+$/); assert.equal(item.readyState, 'READY', 'Deployment is not READY');
    if (target.startsWith('dpl_')) assert.equal(item.id, target, 'Deployment ID mismatch');
    else assert.equal(new URL(deploymentUrl(item.url)).hostname, target, 'Deployment URL lookup mismatch');
    assert.equal(item.projectId, config.projectId, 'Deployment project mismatch'); assert.equal(item.ownerId, config.teamId, 'Deployment team mismatch');
    assert.equal(item.target, 'production', 'Deployment must be built for production');
    assert.equal(item.meta?.naeilSourceRevision, artifact.sourceRevision, 'Deployment source mismatch');
    assert.equal(item.meta?.naeilArtifactId, artifact.id, 'Deployment artifact mismatch');
    assert.equal(item.meta?.naeilArtifactSha256, artifact.sha256, 'Deployment artifact digest mismatch');
    // Whitelist only public provenance; do not write full authenticated objects.
    return { deploymentId: item.id, deploymentUrl: deploymentUrl(item.url), projectId: item.projectId, teamId: item.ownerId, readyState: item.readyState, sourceRevision: artifact.sourceRevision, artifactId: artifact.id, artifactSha256: artifact.sha256 };
  };
  const identityFor = artifact => ({ appId: context.service.identity?.appId ?? context.service.id, ...artifact });
  const stageDirectory = join(config.stateDirectory, context.release.releaseId, context.service.id);
  const markerPath = join(stageDirectory, `${step}.json`);
  const binding = digest(JSON.stringify({ release: releaseFingerprint(context.release), service: context.service, sourceRevision: context.sourceRevision, idempotencyKey: context.idempotencyKey, options, ...(['deploy', 'activate', 'rollback'].includes(step) ? { artifact: context.artifact, previousArtifact: context.previousArtifact } : {}) }));
  mkdirSync(config.stateDirectory, { recursive: true, mode: 0o700 });
  const lockPath = join(config.stateDirectory, `${config.projectId}.lock`), lock = openSync(lockPath, 'wx', 0o600);
  let marker;
  const validateLocal = artifact => {
    assert.equal(digest(readFileSync(artifact.path)), artifact.sha256, 'Immutable archive digest changed');
    const directory = join(options.artifactDirectory, artifact.sha256);
    // The CLI also consumes cwd-level configuration, not only .vercel/output.
    // Nothing outside the exact packaged tree may influence deployment.
    for (const [path, expected] of [[directory, ['.vercel', 'naeil-vercel-artifact.json']], [join(directory, '.vercel'), ['output', 'project.json']]]) {
      assert(lstatSync(path).isDirectory() && !lstatSync(path).isSymbolicLink(), 'Immutable artifact directory must not be a symlink');
      assert.deepEqual(readdirSync(path).sort(), expected, 'Unmanifested file in immutable deployment tree');
    }
    for (const path of [join(directory, 'naeil-vercel-artifact.json'), join(directory, '.vercel/project.json')]) assert(lstatSync(path).isFile() && !lstatSync(path).isSymbolicLink(), 'Immutable deployment metadata must be a regular file');
    const metadata = read(join(directory, 'naeil-vercel-artifact.json'));
    assert.deepEqual(Object.keys(metadata).sort(), ['identity', 'outputSha256', 'projectId', 'teamId'], 'Unmanifested deployment metadata');
    assert.deepEqual(metadata.identity, { schemaVersion: 1, appId: context.service.identity?.appId ?? context.service.id, artifactId: artifact.id, sourceRevision: artifact.sourceRevision, ui: artifact.ui }, 'Artifact identity changed');
    assert.equal(metadata.projectId, config.projectId); assert.equal(metadata.teamId, config.teamId);
    assert.deepEqual(read(join(directory, '.vercel/project.json')), { projectId: config.projectId, orgId: config.teamId }, 'Artifact project context changed');
    assert.equal(inventory(join(directory, '.vercel/output')), metadata.outputSha256, 'Immutable output changed');
    assert.equal(metadata.outputSha256, artifact.platform.outputSha256, 'Output digest differs from artifact receipt');
    outputIdentity(join(directory, '.vercel/output'), config.identityOutputPath, metadata.identity);
    return directory;
  };
  const dispatched = () => { authorize(); marker.dispatchedAt = new Date().toISOString(); durable(markerPath, marker); };
  try {
    if (existsSync(markerPath)) {
      const prior = read(markerPath); assert.equal(prior.binding, binding, 'Vercel stage inputs changed; reconcile existing marker');
      assert.equal(prior.state, 'completed', 'Interrupted/failed Vercel stage requires explicit reconciliation; never replay mutation');
      if (step === 'package') validateLocal(prior.result.artifact);
      if (step === 'build') assert.equal(inventory(join(root, '.vercel/output')), prior.result.outputSha256, 'Built output changed');
      if (step === 'deploy') { const checked = await inspect(prior.result.deploymentId, context.artifact); assert.equal(checked.deploymentUrl, prior.result.deploymentUrl); }
      if (['activate', 'rollback'].includes(step)) { await checkAlias([prior.result.deploymentId]); await verify(origin.origin, identityFor(step === 'rollback' ? context.previousArtifact : context.artifact)); }
      return prior.result;
    }
    marker = { schemaVersion: 1, step, binding, state: 'started', startedAt: new Date().toISOString() }; durable(markerPath, marker);
    let result;
    if (['build', 'package'].includes(step)) {
      assert.equal(digest(readFileSync(join(root, '.vercel/project.json'))), config.projectContextSha256, 'Reviewed existing project context changed');
      const localProject = read(join(root, '.vercel/project.json'));
      assert.equal(localProject.projectId, config.projectId, 'Existing project context ID mismatch');
      assert.equal(localProject.orgId, config.teamId, 'Existing project context team mismatch');
      const git = async args => (await run('git', args, { cwd: root, shell: false, env: process.env })).stdout.trim();
      assert.equal(await git(['rev-parse', 'HEAD']), context.release.sourceRevision, 'Build source differs from reviewed UI source');
      assert.equal(await git(['status', '--porcelain', '--untracked-files=normal']), '', 'Clean committed source required');
      if (step === 'build') {
        const identity = { schemaVersion: 1, appId: context.service.identity?.appId ?? context.service.id, artifactId: `naeil-${randomUUID()}`, sourceRevision: context.release.sourceRevision, ui: { version: context.release.version, contractVersion: context.release.contract.version } };
        dispatched(); await cli(['build', '--prod', ...scoped], root, { NAEIL_APP_ARTIFACT_ID: identity.artifactId, VERCEL_GIT_COMMIT_SHA: identity.sourceRevision });
        assert.equal(readFileSync(join(root, '.next/BUILD_ID'), 'utf8').trim(), identity.artifactId, 'Build ID mismatch');
        assert.deepEqual(read(join(root, '.next/server/app/.well-known/naeil-ui.json.body')), identity, 'Compiled identity mismatch');
        outputIdentity(join(root, '.vercel/output'), config.identityOutputPath, identity);
        result = { passed: true, identity, outputSha256: inventory(join(root, '.vercel/output')) };
      } else {
        const build = read(join(stageDirectory, 'build.json')); assert.equal(build.state, 'completed', 'Completed Vercel build required');
        assert.equal(build.binding, binding, 'Build receipt inputs changed');
        assert.equal(inventory(join(root, '.vercel/output')), build.result.outputSha256, 'Output changed after build');
        const previousArtifact = read(options.previousArtifactPath); previousIdentity(previousArtifact, context, config);
        mkdirSync(options.artifactDirectory, { recursive: true, mode: 0o700 });
        const temporary = mkdtempSync(join(options.artifactDirectory, '.prebuilt-'));
        try {
          mkdirSync(join(temporary, '.vercel')); cpSync(join(root, '.vercel/output'), join(temporary, '.vercel/output'), { recursive: true, verbatimSymlinks: true });
          assert.equal(inventory(join(temporary, '.vercel/output')), build.result.outputSha256, 'Copied output changed');
          writeFileSync(join(temporary, '.vercel/project.json'), JSON.stringify({ projectId: config.projectId, orgId: config.teamId }));
          writeFileSync(join(temporary, 'naeil-vercel-artifact.json'), JSON.stringify({ identity: build.result.identity, outputSha256: build.result.outputSha256, projectId: config.projectId, teamId: config.teamId }));
          const tarball = `${temporary}.tar.gz`;
          await exec('/usr/bin/tar', ['-czf', tarball, '-C', temporary, '.vercel', 'naeil-vercel-artifact.json'], { shell: false, env: { ...process.env, COPYFILE_DISABLE: '1' } });
          const sha256 = digest(readFileSync(tarball)), path = join(options.artifactDirectory, `${sha256}.tar.gz`), directory = join(options.artifactDirectory, sha256);
          assert(!existsSync(path) && !existsSync(directory), 'Immutable artifact destination already exists; reconcile before retry');
          renameSync(temporary, directory); renameSync(tarball, path);
          const identity = build.result.identity;
          result = { previousArtifact, artifact: { id: identity.artifactId, immutable: true, sha256, path, storageRef: pathToFileURL(path).href, sourceRevision: identity.sourceRevision, ui: identity.ui, platform: { kind: 'vercel-prebuilt', projectId: config.projectId, teamId: config.teamId, outputSha256: build.result.outputSha256 } } };
          validateLocal(result.artifact);
        } finally { rmSync(temporary, { recursive: true, force: true }); }
      }
    } else {
      previousIdentity(context.previousArtifact, context, config);
      assert.equal(context.artifact?.immutable, true, 'Immutable candidate required');
      assert.match(context.artifact.id, ID); assert.match(context.artifact.sha256, HEX);
      assert.equal(context.artifact.sourceRevision, context.release.sourceRevision, 'Candidate source mismatch');
      assert.equal(context.artifact.ui?.version, context.release.version, 'Candidate version mismatch');
      assert.equal(context.artifact.ui?.contractVersion, context.release.contract.version, 'Candidate contract mismatch');
      assert.equal(context.artifact.platform?.kind, 'vercel-prebuilt');
      assert.equal(context.artifact.platform.projectId, config.projectId); assert.equal(context.artifact.platform.teamId, config.teamId);
      assert.notEqual(context.previousArtifact.id, context.artifact.id, 'Rollback target must differ from candidate');
      const previous = await inspect(context.previousArtifact.platform.deploymentId, context.previousArtifact);
      assert.equal(previous.deploymentUrl, deploymentUrl(context.previousArtifact.platform.deploymentUrl), 'Previous deployment URL mismatch');
      await verify(previous.deploymentUrl, identityFor(context.previousArtifact));
      if (step === 'deploy') {
        const directory = validateLocal(context.artifact); await checkAlias([previous.deploymentId]);
        const args = ['deploy', '--prebuilt', '--prod', '--skip-domain', '--yes', '--meta', `naeilSourceRevision=${context.artifact.sourceRevision}`, '--meta', `naeilArtifactId=${context.artifact.id}`, '--meta', `naeilArtifactSha256=${context.artifact.sha256}`, ...scoped];
        dispatched(); const deployed = await cli(args, directory);
        const url = deploymentUrl(deployed.stdout.trim()), checked = await inspect(new URL(url).hostname, context.artifact);
        assert.equal(checked.deploymentUrl, url, 'CLI deployment URL mismatch');
        await checkAlias([previous.deploymentId]); await verify(url, identityFor(context.artifact)); validateLocal(context.artifact);
        result = checked;
      } else {
        const deployment = read(join(stageDirectory, 'deploy.json'));
        assert.equal(deployment.state, 'completed', 'Completed deployment receipt required');
        assert.equal(deployment.binding, binding, 'Deployment receipt inputs changed');
        const candidate = await inspect(deployment.result.deploymentId, context.artifact);
        assert.equal(candidate.artifactSha256, deployment.result.artifactSha256, 'Deployment receipt artifact mismatch');
        const activationPath = join(stageDirectory, 'activate.json');
        if (step === 'rollback' && existsSync(activationPath)) assert(read(activationPath).state !== 'uncertain' && !['started'].includes(read(activationPath).state), 'Promotion outcome requires reconciliation before rollback');
        const target = step === 'rollback' ? previous : candidate;
        await checkAlias(step === 'rollback' ? [candidate.deploymentId, previous.deploymentId] : [previous.deploymentId]);
        await verify(target.deploymentUrl, identityFor(step === 'rollback' ? context.previousArtifact : context.artifact));
        dispatched(); await cli([step === 'rollback' ? 'rollback' : 'promote', target.deploymentId, '--timeout=5m', ...scoped]);
        await checkAlias([target.deploymentId]);
        await verify(origin.origin, identityFor(step === 'rollback' ? context.previousArtifact : context.artifact));
        result = { ...target, activated: true };
      }
    }
    marker.state = 'completed'; marker.completedAt = new Date().toISOString(); marker.result = result; durable(markerPath, marker);
    return result;
  } catch (error) {
    if (marker) { marker.state = marker.dispatchedAt ? 'uncertain' : 'failed'; marker.failure = error.message; durable(markerPath, marker); }
    throw error;
  } finally { closeSync(lock); unlinkSync(lockPath); }
}

export async function main() {
  assert(process.env.NAEIL_ROLLOUT_INPUT && process.env.NAEIL_ROLLOUT_OUTPUT, 'Coordinator JSON I/O required');
  const context = read(process.env.NAEIL_ROLLOUT_INPUT);
  const result = await runVercelStage(process.argv[2], context);
  durable(process.env.NAEIL_ROLLOUT_OUTPUT, { releaseId: context.release.releaseId, serviceId: context.service.id, idempotencyKey: context.idempotencyKey, ...result });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
