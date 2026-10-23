import assert from 'node:assert/strict';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { assertActive, assertProduction, assertTrustedFiles, atomicJSON, hash, invokeJSON, privateDirectory, readPrivateBytes, readPrivateJSON, REVISION } from './standing-config.mjs';
import { GitHub, GitHubUnavailable } from './standing-github.mjs';
import { compareRuntime, runtimeIndex } from './package-runtime.mjs';

async function boundedJSON(response, maximum) {
  const chunks = []; let length = 0;
  for await (const chunk of response.body) {
    length += chunk.length; assert(length <= maximum, 'Observation response exceeds bound'); chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function publicIdentity(origin, fetchImpl) {
  const url = new URL('/.well-known/naeil-ui.json', origin);
  assert.equal(url.protocol, 'https:');
  const response = await fetchImpl(url.href, { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15000), headers: { 'cache-control': 'no-cache' } });
  assert.equal(response.status, 200, 'Public identity unavailable');
  assert.match(response.headers.get('content-type') || '', /application\/json/);
  return boundedJSON(response, 4096);
}

function deploymentOrigin(value) {
  const url = new URL(value);
  assert(url.protocol === 'https:' && /^[a-z0-9-]+\.vercel\.app$/.test(url.hostname) && !url.username && !url.password && !url.port && url.pathname === '/' && !url.search && !url.hash, 'Exact immutable Vercel deployment URL required');
  return url.origin;
}

async function correlate(deployment, identity, observer, fetchImpl, github) {
  const origin = deploymentOrigin(deployment.environment_url);
  if (observer.correlation === 'immutable-url') {
    assert.deepEqual(await publicIdentity(origin, fetchImpl), identity, 'GitHub immutable deployment differs from public production');
    return { deploymentId: identity.artifactId, deploymentUrl: origin, correlation: 'immutable-url' };
  }
  if (observer.correlation === 'github-status') {
    const options = observer.githubStatus;
    for (const slug of [options?.teamSlug, options?.projectSlug]) assert(/^[a-z0-9][a-z0-9-]{0,99}$/.test(slug || ''), 'Reviewed Vercel team/project URL segments required');
    // This API path binds the status to the exact reviewed app SHA in the
    // trusted UI repository. Never select an older successful status after a
    // newer pending/failed/untrusted one in the same Vercel context.
    const statuses = await github.pages(`/repos/naeil-dev/naeil-ui/commits/${identity.sourceRevision}/statuses`);
    const status = statuses.filter(value => value.context === 'Vercel').sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || b.id - a.id)[0];
    if (!status) return { pending: true };
    assert.equal(status.creator?.login, 'vercel[bot]', 'Unexpected Vercel commit status publisher');
    if (status.url) assert.equal(status.url, `https://api.github.com/repos/naeil-dev/naeil-ui/statuses/${identity.sourceRevision}`, 'Vercel commit status source mismatch');
    if (status.state === 'pending') return { pending: true };
    assert.equal(status.state, 'success', 'Latest Vercel commit status did not succeed');
    assert(Number.isSafeInteger(status.id) && status.id > 0, 'Exact Vercel commit status ID required');
    const expected = `https://vercel.com/${options.teamSlug}/${options.projectSlug}/${identity.artifactId.slice(4)}`;
    assert.equal(new URL(status.target_url).href, expected, 'Vercel commit status target differs from live artifact/team/project');
    return { deploymentId: identity.artifactId, deploymentUrl: origin, correlation: 'github-status', githubStatusId: String(status.id) };
  }
  assert.equal(observer.correlation, 'vercel-api', 'Explicit deployment correlation method required');
  const options = observer.vercel;
  assert(/^prj_[A-Za-z0-9]+$/.test(options?.projectId) && /^team_[A-Za-z0-9]+$/.test(options?.teamId), 'Reviewed existing Vercel project/team required');
  assert.equal(options.tokenEnvironment, 'NAEIL_STANDING_VERCEL_TOKEN', 'Fixed private read-only Vercel credential source required');
  const token = process.env.NAEIL_STANDING_VERCEL_TOKEN;
  assert(token && /^dpl_[A-Za-z0-9]+$/.test(identity.artifactId), 'Private Vercel reader and exact deployment ID required');
  const response = await fetchImpl(`https://api.vercel.com/v13/deployments/${identity.artifactId}?teamId=${options.teamId}`, { redirect: 'error', signal: AbortSignal.timeout(30000), headers: { authorization: `Bearer ${token}` } });
  assert.equal(response.status, 200, 'Vercel deployment correlation unavailable');
  // Authenticated API objects are never returned or persisted as evidence.
  const remote = await boundedJSON(response, 2 * 1024 * 1024);
  assert(remote.id === identity.artifactId && remote.projectId === options.projectId && remote.ownerId === options.teamId && remote.readyState === 'READY' && remote.target === 'production', 'Vercel project/owner/deployment mismatch');
  assert.equal(deploymentOrigin(`https://${remote.url}`), origin, 'GitHub deployment URL and Vercel artifact differ');
  assert((remote.gitSource?.sha || remote.meta?.githubCommitSha) === identity.sourceRevision, 'Vercel app source mismatch');
  return { deploymentId: remote.id, deploymentUrl: origin, correlation: 'vercel-api' };
}

/** Observes existing Git integration only. Never pushes, deploys or promotes. */
export async function observe(request, options = {}) {
  try { return await observeOnce(request, options); }
  catch (error) {
    if (!(error instanceof GitHubUnavailable)) throw error;
    return { schemaVersion: 1, releaseId: request.release.releaseId, serviceId: request.service.id, idempotencyKey: request.idempotencyKey, attemptId: request.attemptId, mutationAttempted: false, state: 'deferred', reasonCode: 'site-metadata-unavailable' };
  }
}

async function observeOnce(request, { github = new GitHub(), fetchImpl = fetch, verify = invokeJSON } = {}) {
  const { release, service } = request;
  assert(request.schemaVersion === 1 && ['adopt', 'standing'].includes(request.mode) && service.id === 'naeil' && service.appId === 'naeil' && service.origin === 'https://naeil.dev', 'Reviewed Naeil standing envelope required');
  assert.match(release.siteSourceRevision, REVISION, 'Separate reviewed website SHA required');
  const base = { schemaVersion: 1, releaseId: release.releaseId, serviceId: service.id, idempotencyKey: request.idempotencyKey, attemptId: request.attemptId, mutationAttempted: false };
  const observer = service.observer;
  assert(observer?.workflowPath === '.github/workflows/verify.yml' && observer.environment === 'Production' && observer.deploymentCreator === 'vercel[bot]', 'Reviewed existing Git/Vercel observation context required');
  const authorize = () => { assertActive({ enabled: true, policy: request.policy }); assertTrustedFiles(request.trustedFiles); };
  authorize();
  const frozenBytes = readPrivateBytes(release.archive.path), siteBytes = readPrivateBytes(release.siteArchive.path);
  assert.equal(hash(frozenBytes), release.archive.sha256, 'Frozen package bytes changed');
  assert.equal(hash(siteBytes), release.siteArchive.sha256, 'Site package proof bytes changed');
  const frozenIndex = runtimeIndex(frozenBytes);
  assert.equal(frozenIndex.package.version, release.version, 'Frozen archive version differs from release');
  const runtime = compareRuntime(frozenIndex, runtimeIndex(siteBytes));
  assert.equal(runtime.runtimeSha256, release.siteRuntimeSha256, 'Reviewed site runtime proof mismatch');
  const workflow = await github.workflow(release.siteSourceRevision, observer.workflowPath);
  if (workflow.state === 'pending') return { ...base, state: 'deferred', reasonCode: 'site-ci-pending' };
  if (workflow.state !== 'success') return { ...base, state: 'gate-failed', reasonCode: 'site-ci-failed', recoveryRequired: true };
  const values = await github.pages(`/repos/naeil-dev/naeil-ui/deployments?sha=${release.siteSourceRevision}&environment=Production`);
  const deployments = values.filter(value => value.sha === release.siteSourceRevision && value.environment === observer.environment && value.creator?.login === observer.deploymentCreator).sort((a, b) => b.id - a.id);
  if (!deployments.length) return { ...base, state: 'deferred', reasonCode: 'site-deployment-pending' };
  const deployment = deployments[0];
  const statuses = await github.pages(`/repos/naeil-dev/naeil-ui/deployments/${deployment.id}/statuses`);
  const status = statuses.sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || b.id - a.id)[0];
  if (!status || ['pending', 'queued', 'in_progress'].includes(status.state)) return { ...base, state: 'deferred', reasonCode: 'site-deployment-pending' };
  if (status.state !== 'success') return { ...base, state: 'gate-failed', reasonCode: 'site-deployment-failed', recoveryRequired: true };
  assert.equal(status.creator?.login, observer.deploymentCreator, 'Unexpected deployment status publisher');
  authorize();
  const identity = await publicIdentity(service.origin, fetchImpl);
  assert.match(identity.artifactId, /^dpl_[A-Za-z0-9]+$/, 'Expected Git/Vercel artifact identity');
  const expected = { schemaVersion: 1, appId: 'naeil', artifactId: identity.artifactId, sourceRevision: release.siteSourceRevision, ui: { version: release.version, contractVersion: '1' } };
  assert.deepEqual(identity, expected, 'Live website has not adopted the reviewed app source and UI release');
  const platform = await correlate(status, identity, observer, fetchImpl, github);
  if (platform.pending) return { ...base, state: 'deferred', reasonCode: 'site-commit-status-pending' };
  const artifact = { id: identity.artifactId, sourceRevision: identity.sourceRevision, ui: identity.ui, platform: { kind: 'vercel-git', ...platform, githubDeploymentId: String(deployment.id), githubRunId: String(workflow.id) } };
  const directory = join(request.outputDirectory, 'verification'); privateDirectory(directory, true);
  const verification = { ...request, phase: request.mode === 'adopt' ? 'adopt' : 'production', artifact, expectedIdentity: expected, origin: service.origin, outputDirectory: directory, referencePath: release.contract.path, options: service.verification.options || {} };
  authorize();
  const production = await verify(service.verification.command, verification, join(directory, 'command'), 'verify');
  assertProduction(production, request, artifact);
  authorize();
  assert.deepEqual(await publicIdentity(service.origin, fetchImpl), expected, 'Production changed during verification');
  return { ...base, state: 'production-verified', artifact, production };
}

export async function main() {
  const request = readPrivateJSON(resolve(process.env.NAEIL_ROLLOUT_INPUT || ''));
  let result;
  try { result = await observe(request); }
  catch { result = { schemaVersion: 1, releaseId: request.release.releaseId, serviceId: request.service.id, idempotencyKey: request.idempotencyKey, attemptId: request.attemptId, state: 'gate-failed', mutationAttempted: false, reasonCode: 'site-provenance-or-live-verification-failed', recoveryRequired: true }; }
  atomicJSON(resolve(process.env.NAEIL_ROLLOUT_OUTPUT || ''), result);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(() => { console.error('Naeil observation stopped; inspect private invocation state.'); process.exitCode = 1; });
