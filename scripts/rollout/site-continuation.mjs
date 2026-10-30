/** Exact website provenance is a separate channel from the published release.
 * This module never changes a release tuple or grants native execution. */
import assert from 'node:assert/strict';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertExecutingAutomation, assertProduction, assertTrustedFiles, atomicJSON, fingerprint, hash, HEX, pathExists, privateDirectory, readExactReference, readPrivateBytes, releaseIdentityDigest, REVISION } from './standing-config.mjs';
import { handoffGit } from './consumer-preflight.mjs';
import { compareRuntime, runtimeIndex } from './package-runtime.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const exact = (value, keys, reason) => assert(value && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(','), reason);
const currentApproval = approval => {
  assert(approval.revoked === false && typeof approval.approvedBy === 'string' && approval.approvedBy.trim() && typeof approval.approvalRef === 'string' && approval.approvalRef.trim(), 'Recorded unrevoked site approval required');
  const start = Date.parse(approval.approvedAt), end = Date.parse(approval.expiresAt);
  assert(Number.isFinite(start) && start <= Date.now() && Date.now() < end && start < end, 'Site approval expired or outside its exact window');
};

/** Full local Git objects, with executable Git configuration disabled. Root
 * supplies a separate retained clone; no fetch, checkout, build or pack runs. */
export function collectSiteSourceFacts(source, oldSourceRevision, sourceRevision) {
  assert(source && Object.keys(source).every(key => ['root', 'gitSha256', 'gitDirectory'].includes(key)), 'Exact site source reader required');
  assert(REVISION.test(oldSourceRevision) && REVISION.test(sourceRevision), 'Exact old/new site commits required');
  const git = args => handoffGit(source.root, args, { gitSha256: source.gitSha256, gitDirectory: source.gitDirectory, maxBuffer: 16777216 });
  git(['merge-base', '--is-ancestor', oldSourceRevision, sourceRevision]);
  const paths = git(['diff', '--no-renames', '--name-only', '-z', oldSourceRevision, sourceRevision, '--']).toString().split('\0').filter(Boolean).sort();
  const blob = (sha, path) => {
    const tree = git(['ls-tree', '-z', sha, '--', path]).toString();
    if (!tree) return { sha256: null, mode: null };
    const match = /^(100644|100755) blob ([a-f0-9]{40})\t([^\0]+)\0$/.exec(tree);
    assert(match && match[3] === path, 'Site review requires regular exact Git blobs');
    return { sha256: hash(git(['cat-file', 'blob', match[2]])), mode: match[1] };
  };
  const files = paths.map(path => {
    assert(!path.startsWith('/') && !path.includes('\\') && !path.split('/').some(part => ['', '.', '..'].includes(part)), 'Safe reviewed site path required');
    const old = blob(oldSourceRevision, path), next = blob(sourceRevision, path);
    return { path, oldSha256: old.sha256, newSha256: next.sha256, oldMode: old.mode, newMode: next.mode };
  });
  return { treeSha: git(['rev-parse', `${sourceRevision}^{tree}`]).toString().trim(), diffSha256: hash(git(['diff', '--no-ext-diff', '--no-textconv', '--binary', '--full-index', oldSourceRevision, sourceRevision, '--'])), files };
}

export function resolveSiteTarget(release, approval) {
  assert(REVISION.test(release.siteSourceRevision), 'Exact published site source required');
  if (approval === undefined) return { schemaVersion: 1, sourceRevision: release.siteSourceRevision, deploymentId: null, archive: release.siteArchive, runtimeSha256: release.siteRuntimeSha256, approvalSha256: null };
  exact(approval, ['schemaVersion', 'kind', 'service', 'repository', 'releaseSha256', 'oldSourceRevision', 'sourceRevision', 'deploymentId', 'source', 'treeSha', 'diffSha256', 'files', 'packageProof', 'approvedBy', 'approvalRef', 'approvedAt', 'expiresAt', 'revoked'], 'Exact site continuation approval required');
  assert(approval.schemaVersion === 1 && approval.kind === 'standing-site-continuation-approval' && approval.service === 'naeil' && approval.repository === 'naeil-dev/naeil-ui', 'Unsupported site continuation approval');
  currentApproval(approval);
  assert.equal(approval.releaseSha256, releaseIdentityDigest(release), 'Site approval changed the original published release');
  assert.equal(approval.oldSourceRevision, release.siteSourceRevision, 'Site approval must extend the original site source');
  assert(REVISION.test(approval.sourceRevision) && approval.sourceRevision !== approval.oldSourceRevision && /^dpl_[A-Za-z0-9]+$/.test(approval.deploymentId), 'Exact new site source/deployment required');
  assert(REVISION.test(approval.treeSha) && HEX.test(approval.diffSha256), 'Exact whole-site tree/diff required');
  const facts = collectSiteSourceFacts(approval.source, approval.oldSourceRevision, approval.sourceRevision);
  assert.equal(approval.treeSha, facts.treeSha, 'Reviewed site tree changed');
  assert.equal(approval.diffSha256, facts.diffSha256, 'Reviewed full site diff changed');
  assert(Array.isArray(approval.files) && approval.files.length === facts.files.length, 'Complete reviewed site file inventory required');
  const files = approval.files.map(file => {
    exact(file, ['path', 'oldSha256', 'newSha256', 'oldMode', 'newMode', 'purpose'], 'Exact reviewed site file/purpose required');
    assert(typeof file.purpose === 'string' && file.purpose.trim(), 'Whole-site review purpose required');
    const { purpose, ...identity } = file; return identity;
  });
  assert.deepEqual(files, facts.files, 'Reviewed whole-site files changed');
  const proof = approval.packageProof;
  exact(proof, ['schemaVersion', 'sourceRevision', 'archive', 'runtimeSha256'], 'Exact new-source package proof required');
  assert(proof.schemaVersion === 1 && proof.sourceRevision === approval.sourceRevision, 'Package proof belongs to another site source');
  assert.notEqual(proof.archive.path, release.siteArchive.path, 'Original site archive cannot be renamed as new-source proof');
  const siteBytes = readExactReference(proof.archive, 64 * 1024 * 1024), frozenBytes = readPrivateBytes(release.archive.path);
  assert.equal(hash(frozenBytes), release.archive.sha256, 'Frozen package bytes changed');
  const frozen = runtimeIndex(frozenBytes); assert.equal(frozen.package.version, release.version, 'Frozen package version changed');
  const runtime = compareRuntime(frozen, runtimeIndex(siteBytes));
  assert.equal(proof.runtimeSha256, runtime.runtimeSha256, 'New site runtime proof changed');
  assert.equal(proof.runtimeSha256, release.siteRuntimeSha256, 'New site runtime differs from published release');
  return { schemaVersion: 1, sourceRevision: approval.sourceRevision, deploymentId: approval.deploymentId, archive: proof.archive, runtimeSha256: proof.runtimeSha256, approvalSha256: fingerprint(approval) };
}

export function requestSiteTarget(request) {
  const target = resolveSiteTarget(request.release, request.service.siteContinuationApproval);
  if (request.siteTarget !== undefined) assert.deepEqual(request.siteTarget, target, 'Site target differs from exact configured approval');
  else assert(!request.service.siteContinuationApproval, 'Approved continuation requires its explicit site target');
  return target;
}

export function assertSiteArtifact(request, artifact) {
  const target = requestSiteTarget(request);
  assert.equal(artifact.sourceRevision, target.sourceRevision, 'Site artifact differs from approved source');
  if (target.deploymentId) assert.equal(artifact.id, target.deploymentId, 'Site artifact differs from approved deployment');
  assert.equal(artifact.platform?.kind, 'vercel-git', 'Existing Git/Vercel provenance required');
  assert(typeof artifact.platform.deploymentId === 'string' && artifact.platform.deploymentId, 'Exact platform deployment required');
  if (target.deploymentId) assert.equal(artifact.platform.deploymentId, target.deploymentId, 'Platform deployment differs from site target');
  return target;
}

/** A standalone approval is its own authority. It has no active-generation,
 * standing policy, STOP exception, native transport or dispatcher state. */
function readOnlyAuthority(request, authorizationRef) {
  const approval = JSON.parse(readExactReference(authorizationRef));
  exact(approval, ['schemaVersion', 'kind', 'input', 'verificationConfig', 'workspaceDirectory', 'automation', 'trustedFiles', 'approvedBy', 'approvalRef', 'approvedAt', 'expiresAt', 'revoked'], 'Exact standalone site approval required');
  assert(approval.schemaVersion === 1 && approval.kind === 'standing-site-read-only-approval', 'Standalone read-only approval required'); currentApproval(approval);
  assertExecutingAutomation(approval, root); assertTrustedFiles(approval.trustedFiles);
  privateDirectory(approval.workspaceDirectory);
  const inputs = privateDirectory(join(approval.workspaceDirectory, 'inputs'));
  for (const ref of [authorizationRef, approval.input, approval.verificationConfig]) assert.equal(dirname(ref.path), inputs, 'Standalone inputs must remain in their separate input directory');
  assert.equal(fingerprint(request), fingerprint(JSON.parse(readExactReference(approval.input))), 'Standalone request differs from exact approved input');
  exact(request, ['schemaVersion', 'kind', 'release', 'service', 'idempotencyKey', 'attemptId', 'expectedIdentity', 'outputDirectory', 'referencePath', 'maxEvidenceAgeSeconds', ...(Object.hasOwn(request, 'siteTarget') ? ['siteTarget'] : [])], 'Unsupported standalone input; operational authority is prohibited');
  assert(request.schemaVersion === 1 && request.kind === 'standing-site-read-only' && request.service.id === 'naeil', 'Only standalone site validation is supported');
  assert(/^[A-Za-z0-9._-]{1,100}$/.test(request.attemptId) && !['.', '..'].includes(request.attemptId), 'Exact standalone attempt required');
  assert(Number.isSafeInteger(request.maxEvidenceAgeSeconds) && request.maxEvidenceAgeSeconds > 0 && request.maxEvidenceAgeSeconds <= 21600, 'Bounded standalone evidence lifetime required');
  const config = JSON.parse(readExactReference(approval.verificationConfig));
  exact(config, ['schemaVersion', 'evidenceRoot', 'session', 'services'], 'Exact standalone verifier config required');
  assert.equal(config.schemaVersion, 1); assert.deepEqual(Object.keys(config.services), ['naeil'], 'Standalone scope is only naeil');
  assert.deepEqual(request.service, config.services.naeil, 'Standalone service/routes/profile drift');
  assert(request.service.routes?.some(route => route.renderState?.access === 'public') && request.service.routes.some(route => route.renderState?.access === 'protected'), 'Standalone validation requires exact public and protected route specimens');
  assert.equal(config.evidenceRoot, join(approval.workspaceDirectory, 'evidence'), 'Separate standalone evidence root required'); privateDirectory(config.evidenceRoot);
  exact(config.session, ['supabaseUrl', 'anonKey', 'userId', 'stateFile'], 'Exact standalone session profile required');
  const stateFile=config.session.stateFile;
  assert.equal(request.outputDirectory, join(config.evidenceRoot, request.attemptId), 'Standalone evidence escaped its exact attempt directory');
  assert.equal(request.referencePath, request.release.contract.path, 'Standalone frozen reference path drift');
  const target = requestSiteTarget(request), identity = request.expectedIdentity;
  assert.deepEqual(identity, { schemaVersion: 1, appId: 'naeil', artifactId: identity?.artifactId, sourceRevision: target.sourceRevision, ui: { version: request.release.version, contractVersion: '1' } }, 'Standalone exact expected identity changed');
  assert(/^dpl_[A-Za-z0-9]+$/.test(identity.artifactId) && (!target.deploymentId || target.deploymentId === identity.artifactId), 'Exact standalone deployment identity required');
  // Evidence has a separate tree. The existing rotating cache grants only its
  // exact file/marker namespace, never its external parent directory.
  const protectedPaths = [authorizationRef.path, approval.input.path, approval.verificationConfig.path, ...Object.keys(approval.trustedFiles), ...['archive', 'siteArchive', 'contract', 'account', 'expectations'].flatMap(kind => request.release[kind]?.path ? [request.release[kind].path] : []), target.archive?.path, request.service.siteContinuationApproval?.source.root].filter(Boolean);
  for (const path of protectedPaths) {
    assert(path!==config.evidenceRoot&&!path.startsWith(config.evidenceRoot+'/'),'Standalone evidence tree overlaps approved input/source');
    assert(!sessionMember(stateFile,path),'Standalone session writes overlap approved input/source');
  }
  for(const directory of [inputs,config.evidenceRoot,approval.automation.root,request.service.siteContinuationApproval?.source.root].filter(Boolean))assert(stateFile!==directory&&!stateFile.startsWith(directory+'/'),'Standalone session must be separate from inputs/evidence/executable/source trees');
  for(const directory of [approval.automation.root,request.service.siteContinuationApproval?.source.root].filter(Boolean))assert(directory!==config.evidenceRoot&&!config.evidenceRoot.startsWith(directory+'/')&&!directory.startsWith(config.evidenceRoot+'/'),'Standalone evidence must be separate from executable/source trees');
  privateDirectory(dirname(stateFile));
  const session=JSON.parse(readPrivateBytes(stateFile,8*1024*1024));
  assert(typeof config.session.userId==='string'&&config.session.userId&&session.user?.id===config.session.userId,'Standalone verification account mismatch');
  assert(typeof session.refresh_token==='string'&&session.refresh_token,'Existing standalone renewing session required');
  if(pathExists(stateFile+'.refresh-lock'))privateDirectory(stateFile+'.refresh-lock');
  for(const path of [stateFile+'.refresh-lock/pending.json',stateFile+'.last-refresh.json'])if(pathExists(path))readPrivateBytes(path,8*1024*1024);
  return { approval, config, target };
}

const temporaryFor=(path,target)=>typeof path==='string'&&path.startsWith(target+'.')&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}\.tmp$/.test(path.slice(target.length+1));
function sessionMember(stateFile,path) {
  const lock=stateFile+'.refresh-lock',pending=join(lock,'pending.json');
  return [stateFile,lock,pending,stateFile+'.last-refresh.json'].includes(path)||temporaryFor(path,stateFile)||temporaryFor(path,pending);
}
function assertSessionWrite(stateFile,write) {
  const lock=stateFile+'.refresh-lock',pending=join(lock,'pending.json'),last=stateFile+'.last-refresh.json';
  if(write.operation==='mkdir'||write.operation==='rmdir') {
    exact(write,['operation','path'],'Exact session lock operation required');assert.equal(write.path,lock,'Unapproved standalone session lock path');
  } else if(write.operation==='create'||write.operation==='write') {
    exact(write,['operation','path','target'],'Exact session atomic write required');
    assert([stateFile,pending].includes(write.target)&&temporaryFor(write.path,write.target),'Unapproved standalone session temporary/target');
  } else {
    exact(write,['operation','path','destination'],'Exact session rename required');
    assert(write.operation==='rename'&&([stateFile,pending].includes(write.destination)&&temporaryFor(write.path,write.destination)||write.path===pending&&write.destination===last),'Unapproved standalone session rename');
  }
  privateDirectory(dirname(write.path));
  for(const path of [write.path,write.target,write.destination].filter(Boolean))if(pathExists(path)) {
    if(path===lock)privateDirectory(path);else readPrivateBytes(path,8*1024*1024);
  }
}

export async function validateSiteReadOnly(request, { authorization, github, fetchImpl, verify } = {}) {
  let deadline = Infinity;
  const authority = () => { assert(Date.now() <= deadline, 'Standalone verification deadline expired'); return readOnlyAuthority(request, authorization); };
  const { config, target } = authority();
  const timeout = request.service.verification?.command?.timeoutMs ?? 20 * 60_000;
  assert(Number.isSafeInteger(timeout) && timeout > 0 && timeout <= 3 * 60 * 60_000, 'Bounded standalone verification deadline required');
  deadline = Date.now() + timeout;
  assert(!pathExists(request.outputDirectory), 'Standalone evidence attempt already exists; use a newly approved attempt');
  const { checkSiteProvenance } = await import('./naeil-standing-observer.mjs');
  const { verifySiteReadOnly } = await import('./standing-verification.mjs');
  authority();
  const input = { ...request, siteTarget: target };
  const observed = await checkSiteProvenance(input, { github, fetchImpl, beforeAction: authority }); authority();
  assert.equal(observed.state, 'observed', 'Current site provenance is not ready for standalone validation');
  const artifact = observed.artifact;
  assert.deepEqual(request.expectedIdentity, { schemaVersion: 1, appId: 'naeil', artifactId: artifact.id, sourceRevision: artifact.sourceRevision, ui: artifact.ui }, 'Observed site differs from approved standalone identity');
  authority(); privateDirectory(request.outputDirectory, true);
  const verification = { ...input, artifact, phase: 'site-read-only' };
  const hooks = { beforeAction: authority, beforeWrite: write => {const current=authority();if(write)assertSessionWrite(current.config.session.stateFile,write);} };
  const production = await (verify || verifySiteReadOnly)(verification, config, hooks); authority();
  assertProduction(production, verification, artifact);
  const after = await checkSiteProvenance(input, { github, fetchImpl, beforeAction: authority }); authority();
  assert.equal(after.state, 'observed', 'Site provenance changed during standalone validation');
  assert.deepEqual(after.artifact, artifact, 'Site deployment provenance changed during standalone validation');
  assertProduction(production, verification, artifact);
  const result = { schemaVersion: 1, kind: 'standing-site-read-only-result', state: 'production-verified', mutationAttempted: false, authorizationSha256: authorization.sha256, inputSha256: authority().approval.input.sha256, verificationConfigSha256: authority().approval.verificationConfig.sha256, automationSha256: authority().approval.automation.sha256, siteTarget: target, artifact, production };
  authority(); atomicJSON(join(request.outputDirectory, 'result.json'), result);
  return result;
}

export async function main(args = process.argv.slice(2)) {
  process.umask(0o077);
  assert(args.length === 4 && args[0] === 'validate' && args[1] === '--authorization' && HEX.test(args[3]), 'Usage: site-continuation.mjs validate --authorization APPROVAL.json APPROVAL_SHA256');
  const path = resolve(args[2]), bytes = readPrivateBytes(path, 2097152);
  assert.equal(hash(bytes), args[3], 'Standalone approval bytes changed');
  const authorization = { path, sha256: args[3], bytes: bytes.length }, approval = JSON.parse(bytes);
  const request = JSON.parse(readExactReference(approval.input));
  const result = await validateSiteReadOnly(request, { authorization });
  console.log(JSON.stringify({ kind: result.kind, state: result.state, sourceRevision: result.artifact.sourceRevision, artifactId: result.artifact.id }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(() => { console.error('Standalone site validation failed; inspect exact private approval/evidence and session refresh markers.'); process.exitCode = 1; });
