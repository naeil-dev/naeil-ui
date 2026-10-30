/** Source provenance is deliberately separate from release execution authority.
 * These functions never persist an adoption, rewrite a ledger, or call native. */
import assert from 'node:assert/strict';
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import { assertCandidate, assertCandidateSource, handoffGit } from './consumer-preflight.mjs';
import { assertConfigReferences, assertExecutionContext, assertTrustedFiles, automationDigest, fingerprint, generationDigest, hash, HEX, operationalGenerationDigest, readPrivateJSON, REVISION } from './standing-config.mjs';

const repositories = { estimate:'naeil-dev/abestimate', jev:'naeil-dev/jev' };
const fields = (value, allowed) => assert(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every(key => allowed.includes(key)), 'Unsupported source approval field');
const safePath = path => typeof path === 'string' && path && !path.startsWith('/') && !path.split('/').some(part => ['', '.', '..'].includes(part)) && !path.includes('\0');
const date = value => { const time = typeof value === 'number' ? value : Date.parse(value); assert(Number.isFinite(time), 'Exact approval time required'); return time; };
const scope = value => assert(repositories[value.service] && value.repository === repositories[value.service], 'Exact consumer service/repository required');
const AUTOMATION_ROOT = resolve(fileURLToPath(new URL('../../', import.meta.url)));

/** Read-only Git object facts. Local clone origins are transport provenance,
 * never the canonical repository identity supplied by the reviewed config. */
export function collectSourceFacts({sourceRoot, service, repository, oldReviewedBaseSha, newReviewedBaseSha, gitDirectory}) {
  scope({service,repository}); assert.equal(realpathSync(sourceRoot),sourceRoot,'Canonical reviewed source root required');
  assert(REVISION.test(oldReviewedBaseSha) && REVISION.test(newReviewedBaseSha),'Exact old/new source commits required');
  const git = args => {
    try { return handoffGit(sourceRoot,args,{gitSha256:hash(readFileSync('/usr/bin/git')),gitDirectory,maxBuffer:16777216}); }
    catch { throw new Error('Reviewed source Git facts/ancestry unavailable'); }
  };
  git(['merge-base','--is-ancestor',oldReviewedBaseSha,newReviewedBaseSha]);
  const paths = git(['diff','--no-renames','--name-only','-z',oldReviewedBaseSha,newReviewedBaseSha,'--']).toString().split('\0').filter(Boolean).sort();
  const entry = (sha,path) => {
    const tree = git(['ls-tree','-z',sha,'--',path]).toString();
    if (!tree) return {sha256:null,mode:null};
    const match = /^(100644|100755) blob ([a-f0-9]{40})\t([^\0]+)\0$/.exec(tree);
    assert(match && match[3] === path,'Source approval requires regular Git blobs');
    return {sha256:hash(git(['cat-file','blob',match[2]])),mode:match[1]};
  };
  const files = paths.map(path => {
    assert(safePath(path),'Safe exact source path required'); const old = entry(oldReviewedBaseSha,path), next = entry(newReviewedBaseSha,path);
    return {path,oldSha256:old.sha256,newSha256:next.sha256,oldMode:old.mode,newMode:next.mode};
  });
  const patch = git(['diff','--no-ext-diff','--no-textconv','--binary','--full-index',oldReviewedBaseSha,newReviewedBaseSha,'--']);
  return {schemaVersion:1,service,repository,oldReviewedBaseSha,newReviewedBaseSha,newTreeSha:git(['rev-parse',`${newReviewedBaseSha}^{tree}`]).toString().trim(),diffSha256:hash(patch),files};
}

export function validateSourceApproval(approval, facts, now = Date.now()) {
  fields(approval,['schemaVersion','kind','service','repository','oldReviewedBaseSha','newReviewedBaseSha','diffSha256','files','fixtureSchemaVersion','contractVersion','dependencyOnly','approvedBy','approvalRef','approvedAt','adoptBefore','revoked']);
  assert(approval.schemaVersion === 1 && approval.kind === 'reviewed-source-approval','Reviewed source approval schema1 required'); scope(approval); scope(facts);
  assert.equal(facts.schemaVersion,1); assert(REVISION.test(facts.newTreeSha),'Exact reviewed source tree required');
  for (const key of ['service','repository','oldReviewedBaseSha','newReviewedBaseSha','diffSha256']) assert.equal(approval[key],facts[key],`Reviewed source ${key} mismatch`);
  assert(REVISION.test(approval.oldReviewedBaseSha) && REVISION.test(approval.newReviewedBaseSha) && HEX.test(approval.diffSha256),'Exact source/diff identity required');
  assert.equal(approval.fixtureSchemaVersion,2,'Only reviewed fixture schema2 supported'); assert.equal(approval.contractVersion,'1','Only reviewed contract1 supported'); assert.equal(approval.dependencyOnly,true,'Only dependency-only follow-up scope supported');
  assert.equal(approval.revoked,false,'Source approval revoked or revocation state absent');
  for(const key of ['approvedBy','approvalRef']) assert(typeof approval[key] === 'string' && approval[key].trim(),'Recorded source review required');
  const time = date(now), start = date(approval.approvedAt), end = date(approval.adoptBefore);
  assert(start < end && start <= time && time < end,'Source adoption approval expired or outside adoption window');
  assert(Array.isArray(approval.files) && approval.files.length > 0 && approval.files.length === facts.files.length,'Complete reviewed source file inventory required');
  const files = approval.files.map(file => {
    fields(file,['path','oldSha256','newSha256','oldMode','newMode','purpose']);
    assert(safePath(file.path) && typeof file.purpose === 'string' && file.purpose.trim(),'Exact reviewed file and purpose required');
    for(const key of ['oldSha256','newSha256']) assert(file[key] === null || HEX.test(file[key]),'Exact reviewed file hash required');
    for(const key of ['oldMode','newMode']) assert(file[key] === null || ['100644','100755'].includes(file[key]),'Exact reviewed file mode required');
    const {purpose,...identity} = file; return identity;
  });
  assert.deepEqual(files,facts.files,'Reviewed file scripts/diff/hash changed');
  return approval;
}

export function adoptSourceBase(approval, facts, now = Date.now()) {
  validateSourceApproval(approval,facts,now);
  return {schemaVersion:1,kind:'adopted-source-base',service:approval.service,repository:approval.repository,oldReviewedBaseSha:approval.oldReviewedBaseSha,reviewedBaseSha:approval.newReviewedBaseSha,approvalSha256:fingerprint(approval),factsSha256:fingerprint(facts),fixtureSchemaVersion:approval.fixtureSchemaVersion,contractVersion:approval.contractVersion,adoptedAt:typeof now === 'string' ? now : new Date(now).toISOString()};
}

export function validateSourceAdoption(approval, record, facts, now = Date.now()) {
  assert(record?.schemaVersion === 1 && record.kind === 'adopted-source-base','Previously adopted exact source record required');
  assert(date(record.adoptedAt) <= date(now),'Future source adoption record refused');
  // Adoption expiration is checked at adoption time. Revocation still applies.
  const expected = adoptSourceBase(approval,facts,record.adoptedAt);
  assert.deepEqual(record,expected,'Exact adopted source provenance mismatch'); return record;
}

const flatRelease = release => ({releaseId:release.releaseId,version:release.version,contractVersion:release.contract.version,sourceRevision:release.sourceRevision,archiveSha256:release.archive.sha256,chromeSha256:release.contract.sha256,accountSha256:release.account?.sha256});

/** Optional request records carry bytes. Only reviewed configuration grants their
 * use; the active pointer separately binds that entire operational config. */
export function validateCandidateHandoff(candidate, request, config) {
  const h = config.handoff;
  assert(h?.schemaVersion === 1,'Configured reviewed candidate handoff required');
  fields(h,['schemaVersion','generation','generationSha256','sourceApproval','sourceApprovalSha256','sourceAdoption','sourceAdoptionSha256','candidateBinding','candidateReceipt','adapterConfigPath','configurationPaths']);
  assert(h.configurationPaths?.includes(h.adapterConfigPath),'Configured adapter configuration reference required');
  assertConfigReferences(request.configReferences,request.configReferencesSha256,h.configurationPaths);
  assert.equal(fingerprint(readPrivateJSON(h.adapterConfigPath)),fingerprint(config),'Adapter configuration differs from bound current file');
  const closures=[h.generation.trustedFiles,...Object.values(h.generation.executionContexts).map(context=>context.trustedFiles)];
  for(const ref of request.configReferences)for(const closure of closures)assert(Object.keys(closure).every(path=>ref.path!==path&&!ref.path.startsWith(path+'/')),'Configuration pins cannot enter executable generation closure');
  for(const closure of closures)for(const path of Object.keys(closure))assert(path!==candidate?.root&&!path.startsWith(candidate?.root+'/')&&!candidate?.root?.startsWith(path+'/'),'Candidate receipts/state cannot enter executable generation closure');
  assert.equal(h.generationSha256,operationalGenerationDigest(h.generation),'Operational generation mismatch');
  assert.equal(request.generationSha256,h.generationSha256,'Request operational generation mismatch');
  assert.equal(automationDigest(AUTOMATION_ROOT),h.generation.automationSha256,'Current handoff automation bytes changed');
  assert.deepEqual(request.trustedFiles,h.generation.trustedFiles,'Request dispatcher trusted closure differs from operational generation');
  assertTrustedFiles(h.generation.trustedFiles);
  const service = request.service.id, context = h.generation.executionContexts[service]; scope({service,repository:candidate?.repository});
  for(const selected of Object.values(h.generation.executionContexts))assertExecutionContext(selected);
  assert.equal(context.trustedFiles['/usr/bin/git'],hash(readFileSync('/usr/bin/git')),'Source facts Git missing from execution context');
  assert.equal(config.executionPath,context.executionPath,'Native execution PATH differs from approved service context');
  assert.equal(request.executionPath,context.executionPath,'Request execution PATH differs from approved service context');
  for(const [path,digest] of Object.entries({...request.trustedFiles,...config.trustedFiles})) assert.equal(context.trustedFiles[path],digest,'Native executable/helper missing from service execution context');
  assert.equal(fingerprint(h.sourceApproval),h.sourceApprovalSha256,'Configured source approval digest mismatch');
  assert.equal(fingerprint(h.sourceAdoption),h.sourceAdoptionSha256,'Configured source adoption digest mismatch');
  if(request.sourceAdoption !== undefined) assert.deepEqual(request.sourceAdoption,h.sourceAdoption,'Request cannot substitute source adoption');
  assert.deepEqual(candidate?.receipt,h.candidateReceipt,'Configured exact candidate receipt required');
  assertCandidate(candidate,h.candidateBinding);
  assert.equal(candidate.service,service,'Foreign service candidate');
  assert.equal(candidate.generationSha256,generationDigest(context),'Candidate belongs to another execution context/generation');
  assert.deepEqual(candidate.release,flatRelease(request.release),'Candidate release tuple mismatch');
  assert(h.sourceAdoption?.kind === 'adopted-source-base','Configured adopted source record required');
  assert.equal(candidate.reviewedBaseSha,h.sourceAdoption.reviewedBaseSha,'Unapproved candidate source base');
  assert.equal(config.reviewedSourceRevision,h.sourceApproval.oldReviewedBaseSha,'Source approval does not extend the existing reviewed base');
  const facts = collectSourceFacts({sourceRoot:candidate.checkout,service,repository:candidate.repository,oldReviewedBaseSha:h.sourceApproval.oldReviewedBaseSha,newReviewedBaseSha:candidate.reviewedBaseSha,gitDirectory:join(candidate.root,'git')});
  validateSourceAdoption(h.sourceApproval,h.sourceAdoption,facts);
  assertCandidateSource(candidate);
  const policy = request.policy, window = policy?.patchWindow, now = Date.now(), patch = version => /^0\.7\.(0|[1-9]\d*)$/.test(version || '') ? Number(version.split('.')[2]) : NaN;
  assert(policy?.enabled === true && policy.revoked !== true && policy.approvedBy?.trim() && policy.approvalRef?.trim() && Date.parse(policy.expiresAt)>now && policy.services?.includes(service),'Current unrevoked execution authorization required');
  assert(window?.contractVersion === '1' && window.services?.includes(service) && Date.parse(window.startsAt)<=now && Date.parse(window.expiresAt)>now && patch(window.minVersion)<=patch(request.release.version) && patch(request.release.version)<=patch(window.maxVersion),'Release outside current execution patch window');
  return candidate;
}
