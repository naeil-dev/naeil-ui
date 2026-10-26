import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { closeSync, fsyncSync, lstatSync, openSync, readFileSync, readdirSync, realpathSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { acquireControlLock, assertConfigReferences, assertGenerationFence, assertTrustedFiles, atomicJSON, fileReference, fingerprint, generationDigest, hash, HEX, IDS, JSON_LIMITS, operationalGenerationDigest, pathExists, privateDirectory, readActiveGeneration, readExactReference, readPrivateBytes, readPrivateJSON, releaseIdentityDigest, serializeJSON, syncDirectory, validateConfig } from './standing-config.mjs';
import { importLegacyState, parseStandingJSON, readStandingEvidence, readStandingState, validateCompletedImport, writeStandingState } from './standing-state.mjs';
import { assertServiceResult } from './standing-dispatcher.mjs';
import { checkSiteProvenance, publicIdentity } from './naeil-standing-observer.mjs';
import { resolveSiteTarget } from './site-continuation.mjs';
import { validateCandidateHandoff } from './source-approval.mjs';
import { reviewedMigration } from './rollout.mjs';
import { inspectEstimateRelease, inspectJevArchive, inspectJevStandalone } from './consumer-artifact.mjs';

const exact = (value, keys) => assert(value && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(','), 'Unsupported transition fields');
const canonical = path => typeof path === 'string' && isAbsolute(path) && resolve(path) === path;
const exec = promisify(execFile);
const PHASES = ['prepared','imported','continuation-intent','validated','cutover-intent','cutover','completed'];
const snapshotJSON = ref => parseStandingJSON(readExactReference(ref, JSON_LIMITS.offlineLegacy));
function validateInput(input) {
  exact(input, ['schemaVersion','kind','controlDirectory','stopFile','oldPointer','old','next','release','previousApprovalSha256','sourceHandoffs','estimate','predecessors','nativeEvidence','quiescence']);
  assert(input.schemaVersion === 1 && input.kind === 'standing-0.7.2-continuation', 'Only explicit0.7.2 continuation is supported');
  assert(input.release.version === '0.7.2' && input.release.previousVersion === '0.7.1' && input.release.contract.version === '1', 'Exact published0.7.2 contract1 release required');
  for (const path of [input.controlDirectory,input.stopFile,input.old.stateDirectory,input.old.evidenceRoot,input.next.stateDirectory]) assert(canonical(path), 'Canonical transition path required');
  assert(input.controlDirectory !== input.old.stateDirectory && input.controlDirectory !== input.next.stateDirectory && !input.controlDirectory.startsWith(input.old.stateDirectory + '/') && !input.controlDirectory.startsWith(input.next.stateDirectory + '/'), 'Control directory must be outside both epochs');
  assert(input.next.stateDirectory !== input.old.stateDirectory && !input.next.stateDirectory.startsWith(input.old.stateDirectory + '/') && !input.old.stateDirectory.startsWith(input.next.stateDirectory + '/'), 'Fresh separate state epoch required');
  exact(input.old, ['generationId','automationSha256','config','stateDirectory','snapshot','evidenceRoot']);
  exact(input.next, ['generationId','generationSha256','config','configReferencesSha256','stateDirectory','epochId']);
  for (const value of [input.previousApprovalSha256,input.old.automationSha256,input.next.generationSha256,input.next.configReferencesSha256]) assert(HEX.test(value), 'Exact transition identities required');
  assert(input.old.generationId !== input.next.generationId && /^[A-Za-z0-9_-]{1,100}$/.test(input.next.generationId) && /^[A-Za-z0-9_-]{1,100}$/.test(input.next.epochId), 'New exact generation/epoch required');
  exact(input.estimate, ['priorAttemptId','newAttemptId','idempotencyKey','ledger']);
  assert(typeof input.estimate.priorAttemptId === 'string' && /^[A-Za-z0-9._-]{1,100}$/.test(input.estimate.newAttemptId) && input.estimate.newAttemptId !== input.estimate.priorAttemptId && input.estimate.idempotencyKey === input.release.releaseId + ':estimate', 'Same Estimate key and distinct bound successor attempt required');
  assert.deepEqual(Object.keys(input.predecessors).sort(), [...IDS].sort()); assert.deepEqual(Object.keys(input.sourceHandoffs).sort(), ['estimate','jev']);
  exact(input.nativeEvidence, ['estimate','jev']);
  exact(input.nativeEvidence.estimate, ['baseline']); exact(input.nativeEvidence.jev, ['baseline','transactions']);
  assert(Array.isArray(input.nativeEvidence.jev.transactions), 'Exact retained Jev transaction inventory required');
  exact(input.quiescence, ['uid','label','tools','stateRoots','absentPaths']);
  assert(Number.isSafeInteger(input.quiescence.uid) && input.quiescence.uid >= 0 && /^[A-Za-z0-9._-]+$/.test(input.quiescence.label), 'Exact OS scheduler target required');
  assert.deepEqual(Object.keys(input.quiescence.tools).sort(), ['launchctl','lsof','ps']);
  for (const list of [input.quiescence.stateRoots,input.quiescence.absentPaths]) assert(Array.isArray(list) && list.length && new Set(list).size === list.length && list.every(canonical), 'Exact native process/marker inventory required');
  assert(input.quiescence.stateRoots.includes(input.old.stateDirectory) && input.quiescence.absentPaths.includes(join(input.old.stateDirectory,'dispatcher.lock')), 'Legacy dispatcher root/lock must be observed');
}

/** Pure: no file/network/process access and no mutation of the input. */
export function planTransition(input) {
  validateInput(input);
  const value = structuredClone(input);
  const changes = { oldGeneration: value.old.generationId, newGeneration: value.next.generationId, oldAutomationSha256: value.old.automationSha256, newGenerationSha256: value.next.generationSha256, oldConfig: value.old.config, newConfig: value.next.config, importedSnapshot: value.old.snapshot, sourceHandoffs: value.sourceHandoffs, priorEstimateAttemptId: value.estimate.priorAttemptId, newEstimateAttemptId: value.estimate.newAttemptId, preserveBinding: true, preserveHistoricalNaeil: true, freshNaeilRequired: true, jevUnstarted: true, nativeLedgerWrites: false, stopRemains: true };
  const plan = { ...value, changes }; return { ...plan, planSha256: fingerprint(plan) };
}

function assertPlan(plan) {
  const { planSha256, changes, ...input } = plan;
  assert.deepEqual(planTransition(input), plan, 'Exact transition plan/digest changed'); assert(HEX.test(planSha256)); return input;
}
function assertApproval(plan, approval) {
  exact(approval, ['schemaVersion','kind','action','planSha256','previousApprovalSha256','releaseSha256','generationSha256','priorAttemptId','attemptId','successorOf','approvedBy','approvalRef','approvedAt','expiresAt','revoked']);
  assert(approval.schemaVersion === 1 && approval.kind === 'standing-continuation-approval' && approval.action === 'continue-0.7.2-after-source-gate-failure' && approval.revoked === false, 'Recorded exact continuation authorization required');
  for (const [key,value] of Object.entries({ planSha256: plan.planSha256, previousApprovalSha256: plan.previousApprovalSha256, successorOf: plan.previousApprovalSha256, releaseSha256: releaseIdentityDigest(plan.release), generationSha256: plan.next.generationSha256, priorAttemptId: plan.estimate.priorAttemptId, attemptId: plan.estimate.newAttemptId })) assert.equal(approval[key], value, 'Continuation authorization identity mismatch: ' + key);
  assert(approval.approvedBy?.trim() && approval.approvalRef?.trim() && Date.parse(approval.approvedAt) <= Date.now() && Date.parse(approval.expiresAt) > Date.now() && Date.parse(approval.approvedAt) < Date.parse(approval.expiresAt), 'Current bounded unrevoked continuation approval required');
}
function assertRecoveryApproval(plan, approval, recovery) {
  exact(recovery,['schemaVersion','kind','planSha256','approvalSha256','journal','phase','pointerSha256','approvedBy','approvalRef','approvedAt','expiresAt','revoked']);
  assert(recovery.schemaVersion===1&&recovery.kind==='standing-transition-recovery-approval'&&recovery.revoked===false&&recovery.approvedBy?.trim()&&recovery.approvalRef?.trim()&&Date.parse(recovery.approvedAt)<=Date.now()&&Date.parse(recovery.expiresAt)>Date.now()&&Date.parse(recovery.approvedAt)<Date.parse(recovery.expiresAt),'Explicit current recovery approval required');
  assert.equal(recovery.planSha256,plan.planSha256); assert.equal(recovery.approvalSha256,fingerprint(approval));
}
async function execute(file,args) {
  try { const result = await exec(file,args,{ env:{PATH:'/usr/bin:/bin:/usr/sbin:/sbin',LANG:'C',LC_ALL:'C'}, timeout:15000,maxBuffer:1024*1024,encoding:'utf8',shell:false }); return { code:0,stdout:result.stdout,stderr:result.stderr }; }
  catch(error) { if (Number.isInteger(error.code) && !error.killed && !error.signal) return {code:error.code,stdout:error.stdout || '',stderr:error.stderr || ''}; throw Error('Pinned OS quiescence probe failed'); }
}

function assertAbsentProcesses(plan,stdout,ownerPid=null) {
  const needles=['standing-launcher.mjs','standing-dispatcher.mjs','standing-monitor.mjs','naeil-standing-observer.mjs','estimate-standing-adapter.mjs','jev-standing-adapter.mjs','jev-native.py','code-activation.mts','standing-verification.mjs',...plan.quiescence.stateRoots];
  for(const line of stdout.split('\n').filter(Boolean)) {
    const match=line.match(/^\s*(\d+)\s+(\d+)\s+\S/);assert(match,'Unrecognized process inventory');
    assert(Number.isSafeInteger(Number(match[1]))&&Number(match[1])>0&&Number.isSafeInteger(Number(match[2])),'Unrecognized process identity');
    assert(!needles.some(needle=>line.includes(needle)),'Matching dispatcher/adapter/child process remains');
    if(ownerPid!==null)assert(Number(match[1])!==ownerPid&&Number(match[2])!==ownerPid,'Control lock owner/child remains alive or PID was reused');
  }
}
/** Probe raw OS results; caller booleans never establish re-entry fencing. */
export async function probeQuiescence(plan, dependencies = {}, assertAuthority = () => {}, retainRaw = false) {
  assert.equal(dependencies.platform || process.platform, 'darwin', 'Production quiescence requires macOS');
  const q = plan.quiescence, run = dependencies.execute || execute, facts = [];
  if (!dependencies.execute) {
    for (const [name,path] of Object.entries({launchctl:'/bin/launchctl',ps:'/bin/ps',lsof:'/usr/sbin/lsof'})) assert.equal(q.tools[name].path, realpathSync(path), 'Pinned OS tool path required');
    assert.equal(q.uid, process.getuid(), 'Current user scheduler domain required');
  }
  const invoke = async (name,args) => {
    assertAuthority();
    exact(q.tools[name], ['path','sha256']); assertTrustedFiles({[q.tools[name].path]:q.tools[name].sha256});
    const result = await run(q.tools[name].path,args);
    assertAuthority();
    assert(Number.isInteger(result.code) && typeof result.stdout === 'string' && typeof result.stderr === 'string' && Buffer.byteLength(result.stdout)+Buffer.byteLength(result.stderr)<=1024*1024, 'Bounded exact OS probe result required');
    facts.push({tool:name,path:q.tools[name].path,sha256:q.tools[name].sha256,args,code:result.code,...(retainRaw?{stdout:result.stdout,stderr:result.stderr}:{}),stdoutSha256:hash(result.stdout),stderrSha256:hash(result.stderr)}); return result;
  };
  const target = `gui/${q.uid}/${q.label}`, printed = await invoke('launchctl',['print',target]);
  const diagnostic = `Could not find service "${q.label}" in domain for user gui: ${q.uid}`;
  assert(printed.code === 113 && printed.stdout.trim() === '' && printed.stderr.trim() === diagnostic, 'Old scheduler remains registered or absence is unproven');
  const disabled = await invoke('launchctl',['print-disabled',`gui/${q.uid}`]);
  const escaped = q.label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'), matches = [...disabled.stdout.matchAll(new RegExp(`"${escaped}"\\s*=>\\s*(true|false)`, 'g'))];
  assert(disabled.code === 0 && disabled.stderr === '' && matches.length === 1 && matches[0][1] === 'true', 'Old launcher disabled override must remain explicit');
  const processes = await invoke('ps',['-axo','pid=,ppid=,command=']); assert(processes.code === 0 && processes.stderr === '', 'Process inventory unavailable');
  assertAbsentProcesses(plan,processes.stdout);
  for (const root of q.stateRoots) {
    privateDirectory(root); const files = await invoke('lsof',['-nP','-Fpcn','+D',root]);
    assert(files.code === 1 && files.stdout === '' && files.stderr === '', 'Open state/native handle or unproven OS inventory');
  }
  for (const path of q.absentPaths) assert(!pathExists(path), 'Dispatcher/native lock or marker remains');
  return { schemaVersion:1, checkedAt:new Date().toISOString(), facts };
}

function immutable(path, bytes) {
  if (pathExists(path)) { assert.deepEqual(readPrivateBytes(path, Math.max(JSON_LIMITS.evidence,bytes.length)), bytes, 'Immutable transition evidence conflicts'); return fileReference(path, Math.max(JSON_LIMITS.evidence,bytes.length)); }
  const fd = openSync(path,'wx',0o600); try { writeFileSync(fd,bytes); fsyncSync(fd); } finally { closeSync(fd); } syncDirectory(resolve(path,'..')); return fileReference(path,Math.max(JSON_LIMITS.evidence,bytes.length));
}
const immutableJSON = (path,value) => immutable(path,serializeJSON(value,JSON_LIMITS.controlIndex));
const pointerNow = directory => pathExists(join(directory,'active.json')) ? readPrivateJSON(join(directory,'active.json'),JSON_LIMITS.controlIndex) : null;
function assertHistoricalNaeil(service,release) {
  const {request,result} = service || {};
  // Narrow provenance validation, deliberately separate from current-production
  // authority. Historical receipts are never rewritten with new expectation IDs.
  assert(service?.state === 'production-verified' && request?.service.id === 'naeil' && result?.state === 'production-verified', 'Retained historical naeil verification required');
  for (const [key,value] of Object.entries({schemaVersion:1,releaseId:release.releaseId,serviceId:'naeil',attemptId:request.attemptId,idempotencyKey:request.idempotencyKey})) assert.equal(result[key],value,'Historical naeil result binding mismatch');
  assert.deepEqual(request.release,release,'Historical published release tuple changed');
  const production=result.production, artifact=result.artifact;
  assert(artifact?.sourceRevision === release.siteSourceRevision && artifact?.platform.kind === 'vercel-git' && artifact.platform.deploymentId, 'Historical site provenance mismatch');
  for (const [key,value] of Object.entries({schemaVersion:1,passed:true,releaseId:release.releaseId,serviceId:'naeil',attemptId:request.attemptId,idempotencyKey:request.idempotencyKey,archiveSha256:release.archive.sha256,referenceSha256:release.contract.sha256,accountReferenceSha256:release.account.sha256})) assert.equal(production?.[key],value,'Historical naeil verification binding mismatch');
  assert.deepEqual(production.identity,{schemaVersion:1,appId:request.service.appId,artifactId:artifact.id,sourceRevision:artifact.sourceRevision,ui:artifact.ui},'Historical naeil identity mismatch');
}
function originalState(plan, ledgerRef = plan.estimate.ledger) {
  assert.equal(hash(readPrivateBytes(join(plan.old.stateDirectory,'state.json'),JSON_LIMITS.offlineLegacy)),plan.old.snapshot.sha256,'Live legacy state differs from pinned snapshot');
  const state = snapshotJSON(plan.old.snapshot), record = Object.values(state.releases || {}).find(record=>record.releaseId === plan.release.releaseId);
  assert(state.schemaVersion === 1 && state.repository === 'naeil-dev/naeil-ui' && state.currentVersion === '0.7.1' && record?.version === '0.7.2' && HEX.test(record.binding), 'Exact blocked0.7.2 legacy snapshot required');
  assert(state.blocked?.releaseId === plan.release.releaseId && state.blocked?.serviceId === 'estimate', 'Original Estimate failure must remain blocked');
  const prior=record.services?.estimate; assert(prior?.state === 'gate-failed' && prior.request?.attemptId === plan.estimate.priorAttemptId && prior.request.idempotencyKey === plan.estimate.idempotencyKey, 'Original Estimate attempt/key mismatch');
  assertServiceResult(prior.result,prior.request,{allowExpired:true});
  assert(prior.result.state === 'gate-failed' && prior.result.mutationAttempted === true && prior.result.runtimeMutationAttempted === false && !prior.result.rollback, 'Only proved source-only Estimate failure may continue');
  assert.deepEqual(prior.request.release,plan.release,'Original published tuple changed');
  const retained=readPrivateJSON(join(prior.request.outputDirectory,'output.json'));
  assert(!Object.hasOwn(retained,'transportExitCode'),'Native Estimate output cannot contain transport metadata');
  assertServiceResult(retained,prior.request,{allowExpired:true});
  const {transportExitCode,...nativeResult}=prior.result;
  // Estimate's gate-failed CLI exits1. The transport retains native output bytes
  // and decorates only the stored result; neither original record is rewritten.
  if(Object.hasOwn(prior.result,'transportExitCode'))assert.equal(transportExitCode,1,'Unsupported Estimate transport exit code');
  assert.deepEqual(retained,nativeResult,'Retained original Estimate output conflicts');
  assert(!record.services.jev, 'Jev must remain unstarted'); assertHistoricalNaeil(record.services.naeil,plan.release);
  for(const release of Object.values(state.releases))for(const service of Object.values(release.services || {}))assert(!['invoking','uncertain','activation-pending'].includes(service.state)&&!service.verificationIntent,'Uncertain/nonterminal legacy work prohibits transition');
  const ledger=JSON.parse(readExactReference(ledgerRef));
  assert(ledger.attemptId === plan.estimate.priorAttemptId && ledger.idempotencyKey === plan.estimate.idempotencyKey && ledger.state === 'gate-failed' && ledger.mutationAttempted === true && ledger.runtimeMutationAttempted === false,'Uncertain/native-mutated/unbound Estimate ledger prohibits continuation');
  return {state,record};
}
const sortedJSON = value => JSON.stringify(value, (_key, entry) => entry && typeof entry === 'object' && !Array.isArray(entry) ? Object.fromEntries(Object.keys(entry).sort().map(key => [key,entry[key]])) : entry);
const nativeIdentity = (service, artifact) => ({schemaVersion:1,appId:service.appId,artifactId:artifact.id,sourceRevision:artifact.sourceRevision,ui:artifact.ui});
function historicalArtifact(artifact, service) {
  assert(artifact?.immutable === true && HEX.test(artifact.sha256) && HEX.test(artifact.packageSha256) && /^[a-f0-9]{40}$/.test(artifact.sourceRevision), 'Exact immutable historical artifact required');
  assert(canonical(artifact.path) && realpathSync(artifact.path) === artifact.path, 'Canonical historical artifact required');
  const stat=lstatSync(artifact.path);assert(stat.isFile() && stat.nlink===1 && stat.uid===process.getuid() && !(stat.mode & 0o022) && stat.size<=1073741824, 'Owned regular historical artifact required');
  assert.equal(hash(readFileSync(artifact.path)),artifact.sha256,'Historical artifact archive changed');
  assert(artifact.storageRef?.includes(artifact.sha256), 'Historical artifact storage binding required');
  const manifestPath=service==='jev'?artifact.manifestPath:join(artifact.directory || '', 'manifest.json');
  assert(canonical(manifestPath) && realpathSync(manifestPath)===manifestPath,'Canonical historical artifact manifest required');
  const manifestStat=lstatSync(manifestPath);assert(manifestStat.isFile()&&manifestStat.nlink===1&&manifestStat.uid===process.getuid()&&!(manifestStat.mode&0o022)&&manifestStat.size<=JSON_LIMITS.evidence,'Owned bounded historical manifest required');
  const manifestBytes=readFileSync(manifestPath),manifest=JSON.parse(manifestBytes);
  assert.equal(service==='jev'?hash(sortedJSON(manifest)):hash(manifestBytes),artifact.manifestSha256,'Historical artifact manifest changed');
  const release={version:artifact.ui.version,contractVersion:artifact.ui.contractVersion,archiveSha256:artifact.packageSha256};
  const inspected=service==='estimate'?inspectEstimateRelease(artifact.directory,artifact.sourceRevision,release):artifact.standalonePath?inspectJevStandalone(artifact.standalonePath,artifact.sourceRevision,release):inspectJevArchive(readFileSync(artifact.path),manifest,artifact.sourceRevision,release);
  if(service==='jev')assert.equal(inspected.buildId,artifact.buildId,'Historical Jev BUILD_ID changed');
  assert.equal(inspected.identity.artifactId,artifact.id);assert.deepEqual(inspected.manifest,manifest,'Historical native code inventory changed');
  return manifest;
}
function historicalProduction(production, request, artifact, phase) {
  for(const [key,value]of Object.entries({schemaVersion:1,passed:true,releaseId:request.release.releaseId,serviceId:request.service.id,attemptId:request.attemptId,idempotencyKey:request.idempotencyKey,phase,archiveSha256:request.release.archive.sha256,referenceSha256:request.release.contract.sha256,accountReferenceSha256:request.release.account.sha256}))assert.equal(production?.[key],value,'Historical native verification binding mismatch');
  assert.deepEqual(production.identity,nativeIdentity(request.service,artifact),'Historical native public identity mismatch');
  assert.deepEqual(artifact.ui,{version:request.release.version,contractVersion:request.release.contract.version});assert.equal(artifact.packageSha256,request.release.archive.sha256);
  assert(Number.isFinite(Date.parse(production.checkedAt)),'Historical verification timestamp required');
}
function validateNativeEvidence(plan,config,adapters,original,history=null,currentJev=null) {
  assert.deepEqual(plan.predecessors.naeil,original.record.services.naeil.result.production.identity,'Naeil predecessor is not the retained historical verified identity');
  for(const id of ['estimate','jev']) {
    const ref=plan.nativeEvidence[id].baseline;assert.equal(ref.path,join(adapters[id].stateDirectory,'baseline.json'),'Exact retained native baseline path required');
    const baseline=JSON.parse(readExactReference(history ? history[id+'Baseline'] : ref));assert.equal(baseline.state,'production-verified');historicalArtifact(baseline.artifact,id);
    for(const [key,value]of Object.entries({version:config.baseline.version,releaseId:config.baseline.releaseId,sourceRevision:config.baseline.sourceRevision}))assert.equal(baseline.release[key],value,'Native baseline release tuple changed');
    for(const [key,field]of [['archive','archiveSha256'],['contract','referenceSha256'],['account','accountReferenceSha256']])assert.equal(baseline.release[key]?.sha256,config.baseline[field],'Native baseline release assets changed');
    assert.deepEqual(baseline.production.identity,nativeIdentity(config.services[id],baseline.artifact));assert.equal(baseline.production.passed,true);assert.equal(baseline.production.releaseId,baseline.release.releaseId);assert.equal(baseline.production.serviceId,id);
    historicalProduction(baseline.production,{release:baseline.release,service:config.services[id],attemptId:baseline.production.attemptId,idempotencyKey:baseline.production.idempotencyKey},baseline.artifact,baseline.production.phase);assert(['adopt','production'].includes(baseline.production.phase),'Historical baseline verification phase required');
    assert.deepEqual(plan.predecessors[id],baseline.production.identity,'Native predecessor is not the retained production-verified baseline');
  }
  const entries=currentJev?.transactions || plan.nativeEvidence.jev.transactions,root=join(adapters.jev.native.baseDirectory,'releases'),seen=new Set();
  for(const historical of plan.nativeEvidence.jev.transactions)assert(entries.some(entry=>fingerprint(entry)===fingerprint(historical)),'Historical Jev transaction binding changed');
  for(const entry of entries) {
    exact(entry,['transaction','request','nativeResult','result','adapterConfig','predecessorBaseline','rollbackTransaction']);
    const record=JSON.parse(readExactReference(entry.transaction)),request=JSON.parse(readExactReference(entry.request)),nativeResult=JSON.parse(readExactReference(entry.nativeResult)),predecessor=JSON.parse(readExactReference(entry.predecessorBaseline)),result=JSON.parse(readExactReference(entry.result)),adapter=JSON.parse(readExactReference(entry.adapterConfig));
    const directory=join(root,'ui-'+record.attemptId);assert.equal(entry.transaction.path,join(directory,'transaction.json'),'Historical transaction path/attempt mismatch');assert(!seen.has(directory),'Duplicate historical transaction');seen.add(directory);
    assert(['active','recovered','rolled-back'].includes(record.phase),'Uncertain/nonterminal/unknown Jev transaction prohibits transition');
    assert(record.schemaVersion===1&&record.serviceId==='jev'&&request.service?.id==='jev'&&request.schemaVersion===1&&request.mode==='standing','Exact historical Jev request required');
    assert.equal(request.transactionDirectory,directory);assert(['activate','rollback'].includes(request.action),'Historical native action mismatch');
    for(const [key,value]of Object.entries({releaseId:request.release.releaseId,serviceId:'jev',idempotencyKey:request.idempotencyKey,attemptId:request.attemptId})) {assert.equal(record[key],value);assert.equal(result[key],value,'Historical adapter result mismatch');}
    assert.equal(result.schemaVersion,1);assert.equal(nativeResult.schemaVersion,1);assert.equal(nativeResult.action,request.action);assert.equal(nativeResult.safe,true,'Historical native safety unproved');for(const key of ['releaseId','serviceId','idempotencyKey','attemptId'])assert.equal(nativeResult[key],record[key]);
    if(request.release.releaseId===plan.release.releaseId) {
      assert(currentJev?.service?.state==='production-verified'&&record.phase==='active','Unbound/nonterminal Jev successor requires explicit reconciliation');
      const current=currentJev.service;
      assert.equal(entry.transaction.path,join(root,'ui-'+current.request.attemptId,'transaction.json'),'Unrelated Jev successor');
      assert.deepEqual(request,JSON.parse(JSON.stringify({...current.request,artifact:current.result.artifact,previousArtifact:current.result.previousArtifact,transactionDirectory:directory,action:'activate',config:{...adapters.jev.native,baselineArtifact:adapters.jev.baselineArtifact}})),'Jev native request differs from current generation');
      const {checkedAt,...saved}=result;assert(Number.isFinite(Date.parse(checkedAt)));assert.deepEqual(saved,current.result,'Jev native result differs from current state');
      assert.deepEqual(entry.result,currentJev.result);assert.deepEqual(entry.adapterConfig,config.configReferences.find(ref=>ref.path===config.services.jev.adapterOptions.standingConfigPath));
      assert.equal(entry.predecessorBaseline.sha256,history.jevBaseline.sha256);assert.equal(entry.predecessorBaseline.bytes,history.jevBaseline.bytes);
    } else assert(plan.nativeEvidence.jev.transactions.some(historical=>fingerprint(historical)===fingerprint(entry)),'Unrelated native transaction requires explicit reconciliation');
    assert.equal(predecessor.state,'production-verified');assert.deepEqual(predecessor.artifact,record.previousArtifact);assert.equal(predecessor.release.version,request.release.previousVersion);historicalArtifact(predecessor.artifact,'jev');assert.equal(predecessor.production.passed,true);assert.deepEqual(predecessor.production.identity,record.previousIdentity);assert.equal(predecessor.production.releaseId,predecessor.release.releaseId);assert.equal(predecessor.production.serviceId,'jev');historicalProduction(predecessor.production,{release:predecessor.release,service:request.service,attemptId:predecessor.production.attemptId,idempotencyKey:predecessor.production.idempotencyKey},predecessor.artifact,predecessor.production.phase);assert(['adopt','production'].includes(predecessor.production.phase));
    assert.deepEqual(request.config,JSON.parse(JSON.stringify({...adapter.native,baselineArtifact:adapter.baselineArtifact})),'Historical native configuration mismatch');assert.equal(record.configSha256,hash(sortedJSON(request.config)),'Historical native config digest mismatch');
    const nativeRelease={...request.release,archive:Object.fromEntries(Object.entries(request.release.archive).filter(([key])=>key!=='path')),contract:Object.fromEntries(Object.entries(request.release.contract).filter(([key])=>key!=='path'))};assert.equal(record.releaseFingerprint,fingerprint(nativeRelease),'Historical native release digest mismatch');
    assert.deepEqual(record.artifact,request.artifact);assert.deepEqual(record.previousArtifact,request.previousArtifact);
    const after=historicalArtifact(record.artifact,'jev'),before=historicalArtifact(record.previousArtifact,'jev');assert.deepEqual(record.after,after);assert.deepEqual(record.before,before);assert.deepEqual(record.identity,nativeIdentity(request.service,record.artifact));assert.deepEqual(record.previousIdentity,nativeIdentity(request.service,record.previousArtifact));
    assert.deepEqual(result.artifact,record.artifact);assert.deepEqual(result.previousArtifact,record.previousArtifact);
    if(record.phase==='active') {assert.equal(nativeResult.passed,true);assert.equal(nativeResult.activated,true);assert.equal(result.state,'production-verified');historicalProduction(result.production,request,record.artifact,'production');}
    else if(record.phase==='recovered') {assert.equal(nativeResult.passed,false);assert.equal(nativeResult.reason,'native-operation-refused');assert.equal(result.state,'gate-failed');assert(!result.rollback,'Recovered native failure must not claim a new adapter rollback');historicalProduction(result.predecessorProduction,{...request,release:predecessor.release},record.previousArtifact,'adopt');}
    else {assert.equal(nativeResult.passed,true);assert.equal(nativeResult.activated,true);assert.equal(request.action,'rollback');assert.equal(result.state,'gate-failed');assert.equal(result.rollback?.state,'production-verified','Rolled-back history requires verified adapter rollback');assert.deepEqual(result.rollback.artifact,record.previousArtifact);historicalProduction(result.rollback.production,{...request,release:predecessor.release},record.previousArtifact,'rollback');}
    if(record.phase==='rolled-back') {assert(entry.rollbackTransaction,'Exact nested rollback transaction required');assert.equal(entry.rollbackTransaction.path,join(directory,'rollback','transaction.json'));const rollback=JSON.parse(readExactReference(entry.rollbackTransaction));assert.deepEqual(rollback,{phase:'active',before:record.after,after:record.before,identity:record.previousIdentity,previousIdentity:record.identity});}
    else assert.equal(entry.rollbackTransaction,null,'Unexpected nested rollback history');
    assert(!pathExists(join(directory,'transaction.next.json'))&&!pathExists(join(directory,'rollback','transaction.next.json')),'Incomplete native transaction write remains');
  }
  // Both native producers reserve releases/ui-${attemptId}. Other retained
  // backups/manual artifacts are not transaction evidence and are never read.
  // Inspect every prefix candidate, including malformed names/files/symlinks.
  const actual=readdirSync(root).filter(name=>name.startsWith('ui-')).map(name=>{assert(/^ui-[A-Za-z0-9._-]+$/.test(name),'Unknown native transaction path');const directory=join(root,name);privateDirectory(directory);return directory;}).sort();
  assert.deepEqual([...seen].sort(),actual,'Unknown/unbound Jev transaction history prohibits transition');
}
function transitionContext(plan, approval, dependencies) {
  assertPlan(plan); assertApproval(plan,approval); privateDirectory(plan.controlDirectory); readPrivateBytes(plan.stopFile,JSON_LIMITS.controlIndex);
  assert.equal(lstatSync(plan.stopFile).mode & 0o777,0o600,'STOP must remain0600');
  if(!dependencies.execute)assert.equal(plan.stopFile,join(homedir(),'.local/share/naeil-ui-rollout/STOP'),'Canonical operational STOP required');
  const oldConfig=JSON.parse(readExactReference(plan.old.config)), config=JSON.parse(readExactReference(plan.next.config));
  assert.equal(oldConfig.stateDirectory,plan.old.stateDirectory); assert.equal(oldConfig.policy.stopFile,plan.stopFile); assert.equal(config.policy.stopFile,plan.stopFile);
  assert.deepEqual(config.policy.reviewedMigration,oldConfig.policy.reviewedMigration,'Original reviewedMigration/expiration must not change');
  assert.equal(fingerprint(oldConfig.policy.reviewedMigration),plan.previousApprovalSha256,'Previous approval changed');
  assert(config.enabled===true&&config.policy.enabled===true&&Date.parse(config.policy.expiresAt)>Date.now(),'Current standing execution authorization required');
  for(const id of IDS)assert(reviewedMigration(plan.release,{id},config.policy),'Original exact reviewedMigration expired or changed; continuation cannot extend authorization');
  const window=config.policy.patchWindow;assert(Date.parse(window.startsAt)<=Date.now()&&Date.parse(window.expiresAt)>Date.now()&&Number(window.minVersion.split('.')[2])<=2&&Number(window.maxVersion.split('.')[2])>=2,'Current exact patch window required');
  assert.equal(oldConfig.automation.sha256,plan.old.automationSha256,'Old automation identity changed'); assertTrustedFiles(oldConfig.trustedFiles);
  assert.equal(config.generationSha256,plan.next.generationSha256); assert.equal(operationalGenerationDigest(config.generation),plan.next.generationSha256);
  assert.equal(config.stateDirectory,plan.next.stateDirectory); assert.deepEqual(config.generationControl,{controlDirectory:plan.controlDirectory,generationId:plan.next.generationId,epochId:plan.next.epochId});
  assert.equal(config.configReferencesSha256,plan.next.configReferencesSha256); assertConfigReferences(config.configReferences,plan.next.configReferencesSha256);
  if(config.services.naeil.siteContinuationApproval)resolveSiteTarget(plan.release,config.services.naeil.siteContinuationApproval);
  const adapters={};
  for(const id of ['estimate','jev']) {
    const refs=plan.sourceHandoffs[id]; exact(refs,['approval','adoption','candidate']);
    const candidate={...JSON.parse(readExactReference(refs.candidate)),receipt:refs.candidate}, adapterPath=config.services[id].adapterOptions?.standingConfigPath;
    const adapterRef=config.configReferences.find(ref=>ref.path===adapterPath); assert(adapterRef,'Bound adapter config required'); const adapter=JSON.parse(readExactReference(adapterRef));adapters[id]=adapter;
    assert.deepEqual(adapter.handoff?.candidateReceipt,refs.candidate,'Staged candidate reference mismatch');
    assert.deepEqual(adapter.handoff?.sourceApproval,JSON.parse(readExactReference(refs.approval)),'Source approval reference mismatch'); assert.deepEqual(adapter.handoff?.sourceAdoption,JSON.parse(readExactReference(refs.adoption)),'Source adoption reference mismatch');
    (dependencies.validateHandoff || validateCandidateHandoff)(candidate,{schemaVersion:1,mode:'standing',release:plan.release,service:config.services[id],policy:config.policy,trustedFiles:config.trustedFiles,executionPath:config.generation.executionContexts[id].executionPath,generationSha256:config.generationSha256,configReferences:config.configReferences,configReferencesSha256:config.configReferencesSha256},adapter);
    assert.equal(candidate.generationSha256,generationDigest(config.generation.executionContexts[id]),'Candidate execution context mismatch');
  }
  const estimate=adapters.estimate,jev=adapters.jev;
  const requiredRoots=[plan.old.stateDirectory,estimate.stateDirectory,estimate.activation?.stateDirectory,jev.stateDirectory,join(jev.native?.baseDirectory || '', 'releases')];
  assert(requiredRoots.every(path=>canonical(path)&&plan.quiescence.stateRoots.includes(path)),'Native/dispatcher state roots cannot be omitted from OS proof');
  const absent=[join(plan.old.stateDirectory,'dispatcher.lock'),join(plan.old.stateDirectory,'pending-intent.json'),join(estimate.stateDirectory,'running.lock'),join(estimate.activation.stateDirectory,'operation.json'),join(jev.stateDirectory,'running.lock')];
  assert(absent.every(path=>plan.quiescence.absentPaths.includes(path)),'Native lock/marker fence inventory cannot be omitted');
  assert.equal(plan.estimate.ledger.path,join(estimate.stateDirectory,'keys',hash(plan.estimate.idempotencyKey)+'.json'),'Exact native Estimate ledger path required');
  return {config,adapters};
}
async function observeIdentities(plan,config,identities,dependencies,assertAuthority) {
  for(const id of IDS) {
    assertAuthority();
    const service=config.services[id];
    if(id==='naeil'&&service.siteContinuationApproval) {
      const siteTarget=resolveSiteTarget(plan.release,service.siteContinuationApproval);
      assert.equal(service.siteContinuationApproval.oldSourceRevision,plan.predecessors.naeil.sourceRevision,'Approved current site lost its historical predecessor');
      const observed=await checkSiteProvenance({release:plan.release,service,siteTarget},{github:dependencies.github,fetchImpl:dependencies.fetchImpl,beforeAction:assertAuthority});assertAuthority();
      assert.equal(observed.state,'observed','Approved current site provenance is not ready');
      assert.deepEqual(nativeIdentity(service,observed.artifact),{...plan.predecessors.naeil,artifactId:siteTarget.deploymentId,sourceRevision:siteTarget.sourceRevision},'Current site differs from exact approved target');
    } else {
      const identity=await publicIdentity(service.origin,dependencies.fetchImpl);assertAuthority();assert.deepEqual(identity,identities[id],'Public predecessor changed');
    }
  }
}
async function prerequisites(plan, approval, dependencies, assertAuthority = () => {}, retainRaw = false) {
  assertAuthority();
  const {config,adapters}=transitionContext(plan,approval,dependencies),original=originalState(plan);
  validateNativeEvidence(plan,config,adapters,original);
  await observeIdentities(plan,config,plan.predecessors,dependencies,assertAuthority);assertAuthority();
  const proof=await probeQuiescence(plan,dependencies,assertAuthority,retainRaw);assertAuthority();
  return {config,...original,proof};
}

function sameRetainedBytes(ref, original) {
  assert.equal(ref.sha256,original.sha256,'Historical evidence digest changed');
  assert.equal(ref.bytes,original.bytes,'Historical evidence length changed');
  return JSON.parse(readExactReference(ref));
}
function savedNativeResult(ref, expectedPath, service) {
  assert.equal(ref.path,expectedPath,'Exact current native attempt result required');
  const {checkedAt,...saved}=JSON.parse(readExactReference(ref));
  assert(Number.isFinite(Date.parse(checkedAt)),'Terminal native result timestamp required');
  const {transportExitCode,...expected}=service.result;
  assert.equal(transportExitCode,undefined,'Nonzero native outcome requires explicit reconciliation');
  assert.deepEqual(saved,expected,'Current native result differs from retained dispatcher result');
}
function validateEstimateDispatches(plan,adapter,current,service,previous) {
  const directory=join(adapter.stateDirectory,'attempts',service.request.attemptId);privateDirectory(directory);
  const labels=['activate','deploy','inspect-after','inspect-before'];
  const paths=labels.map(label=>join(directory,'native-'+label,'dispatch.json')).sort();
  assert.deepEqual(current.dispatches.map(ref=>ref.path).sort(),paths,'Complete bound Estimate native dispatch inventory required');
  assert.deepEqual(readdirSync(directory).filter(name=>name.startsWith('native-')).sort(),labels.map(label=>'native-'+label).sort(),'Unrelated Estimate native dispatch requires reconciliation');
  for(const ref of current.dispatches) {
    const label=ref.path.split('/').at(-2).slice('native-'.length),action=label.startsWith('inspect-')?'inspect':label;
    const dispatch=JSON.parse(readExactReference(ref)),response=dispatch.response,target=label==='inspect-before'?previous.artifact:service.result.artifact;
    assert(dispatch.state==='completed'&&dispatch.action===action&&Number.isFinite(Date.parse(dispatch.checkedAt)),'Nonterminal Estimate native dispatch requires reconciliation');
    for(const [key,value]of Object.entries({schemaVersion:1,releaseId:plan.release.releaseId,serviceId:'estimate',idempotencyKey:plan.estimate.idempotencyKey,attemptId:plan.estimate.newAttemptId,action,passed:true,nativeReleaseId:target.releaseId,artifactId:target.id}))assert.equal(response?.[key],value,'Estimate native response binding changed: '+key);
    if(action==='inspect')assert.equal(response.mutationAttempted,false);
    else if(action==='deploy')assert.equal(response.deploymentId,target.releaseId);
    else {assert.equal(response.activated,true);assert.equal(response.preservationVerified,true);}
  }
}
function validateEstimateInventory(plan,adapter,original,baseline,current,service) {
  const known=new Map(),results=new Map();
  const remember=prior=>{if(prior?.request){known.set(prior.request.attemptId,prior.request.idempotencyKey);if(prior.result)results.set(prior.request.attemptId,prior.result);}};
  for(const release of Object.values(original.state.releases)) {
    remember(release.services?.estimate);
    for(const entry of release.history||[])if(entry.serviceId==='estimate')remember(entry.prior);
  }
  known.set(baseline.production.attemptId,baseline.production.idempotencyKey);remember(service);
  const keys=join(adapter.stateDirectory,'keys');privateDirectory(keys);
  for(const name of readdirSync(keys)) {
    assert(/^[a-f0-9]{64}\.json(?:\.history-[a-f0-9-]{36})?$/.test(name),'Unknown Estimate native ledger entry');
    const path=join(keys,name),ledger=readPrivateJSON(path);
    assert.equal(name.slice(0,64),hash(ledger.idempotencyKey),'Estimate ledger filename/key mismatch');
    assert.equal(known.get(ledger.attemptId),ledger.idempotencyKey,'Unrelated Estimate native ledger requires reconciliation');
    assert(['production-verified','gate-failed','deferred','review-required','not-deployed'].includes(ledger.state),'Nonterminal/uncertain Estimate ledger requires reconciliation');
    if(ledger.attemptId===plan.estimate.newAttemptId) {
      assert.equal(path,current.ledger.path,'Unknown successor ledger history');assert.equal(ledger.state,service.state);
    } else if(ledger.attemptId===plan.estimate.priorAttemptId) sameRetainedBytes(fileReference(path),plan.estimate.ledger);
  }
  const attempts=join(adapter.stateDirectory,'attempts');
  if(pathExists(attempts))for(const name of readdirSync(attempts)) {
    assert(known.has(name),'Unrelated Estimate native attempt requires reconciliation');privateDirectory(join(attempts,name));
    const result=readPrivateJSON(join(attempts,name,'result.json'));
    assert.equal(result.attemptId,name);assert.equal(result.idempotencyKey,known.get(name));
    assert(['production-verified','gate-failed','deferred','review-required','not-deployed'].includes(result.state),'Nonterminal/uncertain Estimate attempt requires reconciliation');
    if(results.has(name)){const {checkedAt,...saved}=result,{transportExitCode,...expected}=results.get(name);assert(Number.isFinite(Date.parse(checkedAt)),'Historical Estimate result timestamp required');assert(transportExitCode===undefined||transportExitCode===1);assert.deepEqual(saved,expected,'Historical Estimate attempt differs from retained result');}
    else {assert.equal(name,baseline.production.attemptId);assert.equal(result.state,'production-verified');assert.deepEqual(result.artifact,baseline.artifact);assert.deepEqual(result.production,baseline.production);}
    if(name!==plan.estimate.newAttemptId)for(const label of readdirSync(join(attempts,name)).filter(entry=>entry.startsWith('native-'))) {
      const dispatch=readPrivateJSON(join(attempts,name,label,'dispatch.json'));
      assert(dispatch.state==='completed'&&dispatch.action==='inspect'&&dispatch.response?.passed===true&&dispatch.response.mutationAttempted===false,'Unknown/nonterminal historical Estimate native work requires reconciliation');
      assert.equal(dispatch.response.attemptId,name);assert.equal(dispatch.response.idempotencyKey,known.get(name));assert.equal(dispatch.response.artifactId,baseline.artifact.id);
    }
  }
}

// Completed-generation archival is an observation of exact terminal evidence.
// It cannot run transition phases, replay a child, or repair a native record.
function completedArchiveState(plan,approval,journal,current,config,adapters) {
  exact(current,['state','binding','validatedRoot','history','estimate','jev']);
  exact(current.history,['estimateLedger','estimateBaseline','jevBaseline']);
  exact(current.estimate,['baseline','ledger','priorLedger','result','dispatches']);
  exact(current.jev,['baseline','result','transactions']);
  const historical={estimateLedger:plan.estimate.ledger,estimateBaseline:plan.nativeEvidence.estimate.baseline,jevBaseline:plan.nativeEvidence.jev.baseline};
  for(const [key,ref]of Object.entries(historical))sameRetainedBytes(current.history[key],ref);
  const original=originalState(plan,current.history.estimateLedger),active=readActiveGeneration(plan.controlDirectory);
  assert.deepEqual(active.plan,plan);assert.deepEqual(active.approval,approval);
  assert.deepEqual(journal.oldPointer,plan.oldPointer);assert.deepEqual(journal.newPointer,active.pointer);
  const directory=join(plan.controlDirectory,'transitions',plan.planSha256);
  assert.equal(journal.plan.path,join(directory,'plan.json'));assert.equal(journal.approval.path,join(directory,'approval.json'));
  assert(journal.proof?.path?.startsWith(directory+'/proof-'),'Bound terminal transition proof required');readExactReference(journal.proof,JSON_LIMITS.controlIndex);
  assert.equal(current.validatedRoot.path,join(directory,'validated-root.json'));sameRetainedBytes(current.validatedRoot,journal.validatedState);
  assert.equal(journal.imported?.root?.path,join(plan.next.stateDirectory,'imported-root.json'));assert.equal(journal.imported?.manifest?.path,join(plan.next.stateDirectory,'import-manifest.json'));
  readExactReference(journal.imported.root,JSON_LIMITS.controlIndex);readExactReference(journal.imported.manifest);
  validateCompletedImport({sourcePath:plan.old.snapshot.path,expectedSha256:plan.old.snapshot.sha256,destination:plan.next.stateDirectory,epochId:plan.next.epochId,evidenceRoot:plan.old.evidenceRoot},{importedRootPath:journal.imported.root.path});
  assert.equal(current.state.path,join(plan.next.stateDirectory,'state.json'));readExactReference(current.state,JSON_LIMITS.controlIndex);
  assert.equal(current.binding.path,join(plan.next.stateDirectory,'generation-binding.json'));
  assert.deepEqual(JSON.parse(readExactReference(current.binding,JSON_LIMITS.controlIndex)),{schemaVersion:1,controlDirectory:plan.controlDirectory,generationSha256:plan.next.generationSha256,epochId:plan.next.epochId});
  const state=readStandingState(plan.next.stateDirectory),records=Object.values(state.releases).filter(record=>record.releaseId===plan.release.releaseId);
  assert.equal(state.repository,config.repository);assert.equal(records.length,1,'Exact current-generation release required');
  assert(!state.storageIntents&&!pathExists(join(plan.next.stateDirectory,'pending-intent.json')),'Pending current-generation native work requires reconciliation');
  assert.deepEqual(Object.keys(state.releases).sort(),Object.keys(original.state.releases).sort(),'Unrelated current release requires reconciliation');
  for(const record of Object.values(state.releases))for(const service of Object.values(record.services||{}))assert(!['invoking','uncertain','activation-pending'].includes(service.state)&&!service.verificationIntent&&!service.reverificationAttempts?.some(attempt=>attempt.state==='invoking'),'Nonterminal/uncertain current work requires reconciliation');
  const record=records[0],continuation=record.generationContinuation;
  assert(continuation?.planSha256===plan.planSha256&&continuation.authorizationSha256===fingerprint(approval)&&continuation.generationSha256===plan.next.generationSha256&&continuation.releaseSha256===releaseIdentityDigest(plan.release)&&continuation.originalBinding===original.record.binding&&record.binding===original.record.binding,'Current continuation binding changed');
  assert.deepEqual(record.services.naeil.request,original.record.services.naeil.request);assert.deepEqual(record.services.naeil.result,original.record.services.naeil.result);
  assert(record.history.some(entry=>entry.resolution==='generation-continuation-source-only'&&fingerprint(entry.prior)===fingerprint(original.record.services.estimate)),'Original Estimate failure history changed');
  const identities={...plan.predecessors};
  for(const id of ['estimate','jev']) {
    const evidence=current[id],service=record.services[id],previous=JSON.parse(readExactReference(current.history[id+'Baseline']));
    assert.equal(evidence.baseline.path,plan.nativeEvidence[id].baseline.path,'Exact current native baseline path required');
    if(!service||service.state==='deferred'&&!service.request) {
      if(id==='estimate')assert(service?.authorizedAttemptId===plan.estimate.newAttemptId&&service.reconciliation?.priorAttemptId===plan.estimate.priorAttemptId,'Unstarted Estimate successor binding changed');
      assert.equal(evidence.result,null,'Unstarted native service has a result');sameRetainedBytes(evidence.baseline,plan.nativeEvidence[id].baseline);continue;
    }
    assert(service.state==='production-verified'&&service.result?.state==='production-verified','Native outcome requires explicit reconciliation');
    const {request,result}=service;assert(request.mode==='standing'&&!request.kind&&!request.phase&&!request.reverification,'Native success requires its original execution request');
    assert.equal(releaseIdentityDigest(request.release),releaseIdentityDigest(plan.release));assert.equal(request.generationSha256,plan.next.generationSha256);assertGenerationFence(request,adapters[id]);
    assert(/^[A-Za-z0-9._-]{1,100}$/.test(request.attemptId),'Exact current native attempt required');
    assert.equal(request.idempotencyKey,plan.release.releaseId+':'+id);
    if(id==='estimate'){assert.equal(request.attemptId,plan.estimate.newAttemptId);assert.equal(request.reconciliation?.priorAttemptId,plan.estimate.priorAttemptId);assert.equal(result.runtimeMutationAttempted,true);}
    for(const [key,value]of Object.entries({schemaVersion:1,releaseId:plan.release.releaseId,serviceId:id,idempotencyKey:request.idempotencyKey,attemptId:request.attemptId,mutationAttempted:true}))assert.equal(result[key],value,'Current native result binding changed');
    assertServiceResult(result,request,{allowExpired:true});
    assert.deepEqual(result.previousArtifact,previous.artifact);historicalArtifact(result.artifact,id);historicalProduction(result.production,request,result.artifact,'production');
    assert.deepEqual(result.candidateReceipt,plan.sourceHandoffs[id].candidate);assert.equal(result.sourceAdoptionSha256,adapters[id].handoff.sourceAdoptionSha256);
    assert.deepEqual(request.candidate,{...JSON.parse(readExactReference(plan.sourceHandoffs[id].candidate)),receipt:plan.sourceHandoffs[id].candidate});assert.deepEqual(request.sourceAdoption,adapters[id].handoff.sourceAdoption);
    if(request.candidate.artifact)assert.deepEqual(result.artifact,request.candidate.artifact,'Current result differs from exact prepared artifact');
    assert(canonical(request.outputDirectory)&&request.outputDirectory.startsWith(join(plan.next.stateDirectory,'runs')+'/'),'Current native transport evidence escaped epoch');
    const {transportExitCode,...expected}=result;assert.equal(transportExitCode,undefined);assert.deepEqual(readPrivateJSON(join(request.outputDirectory,'output.json')),expected,'Current transport output differs from retained result');
    savedNativeResult(evidence.result,join(adapters[id].stateDirectory,'attempts',request.attemptId,'result.json'),service);
    const baseline=JSON.parse(readExactReference(evidence.baseline));assert.equal(baseline.state,'production-verified');assert.deepEqual(baseline.artifact,result.artifact);assert.equal(releaseIdentityDigest(baseline.release),releaseIdentityDigest(plan.release));assert.deepEqual(baseline.production,result.production);
    identities[id]=result.production.identity;
    if(id==='estimate')validateEstimateDispatches(plan,adapters.estimate,evidence,service,previous);
  }
  assert(['0.7.1','0.7.2'].includes(state.currentVersion));
  if(record.services.jev?.request)assert.equal(record.services.estimate.state,'production-verified','Jev progress lacks terminal Estimate predecessor');
  if(state.currentVersion==='0.7.2')assert(['estimate','jev'].every(id=>record.services[id]?.state==='production-verified'),'Completed version lacks terminal service evidence');
  assert.equal(current.estimate.ledger.path,plan.estimate.ledger.path);const ledger=JSON.parse(readExactReference(current.estimate.ledger));
  if(record.services.estimate.state==='production-verified') {
    assert.equal(ledger.attemptId,plan.estimate.newAttemptId);assert.equal(ledger.idempotencyKey,plan.estimate.idempotencyKey);assert.equal(ledger.state,'production-verified');assert.equal(ledger.mutationAttempted,true);assert.equal(ledger.runtimeMutationAttempted,true);assert(Number.isFinite(Date.parse(ledger.completedAt)));
    assert(current.estimate.priorLedger.path.startsWith(plan.estimate.ledger.path+'.history-'),'Exact retained prior Estimate ledger history required');sameRetainedBytes(current.estimate.priorLedger,plan.estimate.ledger);
  } else {sameRetainedBytes(current.estimate.ledger,plan.estimate.ledger);assert.deepEqual(current.estimate.priorLedger,current.estimate.ledger);assert.deepEqual(current.estimate.dispatches,[]);}
  validateEstimateInventory(plan,adapters.estimate,original,JSON.parse(readExactReference(current.history.estimateBaseline)),current.estimate,record.services.estimate);
  validateNativeEvidence(plan,config,adapters,original,current.history,{...current.jev,service:record.services.jev});
  const jevAttempts=join(adapters.jev.stateDirectory,'attempts'),jevBaseline=JSON.parse(readExactReference(current.history.jevBaseline)),knownJev=new Map([[jevBaseline.production.attemptId,null]]);
  for(const release of Object.values(original.state.releases))for(const prior of [release.services?.jev,...(release.history||[]).filter(entry=>entry.serviceId==='jev').map(entry=>entry.prior)])if(prior?.request&&prior.result)knownJev.set(prior.request.attemptId,prior.result);
  for(const entry of current.jev.transactions)knownJev.set(JSON.parse(readExactReference(entry.transaction)).attemptId,JSON.parse(readExactReference(entry.result)));
  if(pathExists(jevAttempts))for(const name of readdirSync(jevAttempts)) {
    assert(knownJev.has(name),'Unrelated Jev attempt requires reconciliation');privateDirectory(join(jevAttempts,name));const result=readPrivateJSON(join(jevAttempts,name,'result.json'));
    assert(['production-verified','gate-failed','deferred'].includes(result.state),'Nonterminal Jev attempt requires reconciliation');assert.equal(result.attemptId,name);
    const {checkedAt,...saved}=result,expected=knownJev.get(name);assert(Number.isFinite(Date.parse(checkedAt)),'Historical/current Jev result timestamp required');
    if(expected){const {transportExitCode,...native}=expected;delete native.checkedAt;assert(transportExitCode===undefined||transportExitCode===1);assert.deepEqual(saved,native,'Historical/current Jev attempt differs from retained result');}
    else {assert.equal(result.state,'production-verified');assert.deepEqual(result.artifact,jevBaseline.artifact);assert.deepEqual(result.production,jevBaseline.production);}
  }
  return identities;
}

/** Explicit evidence-preserving prerequisite after real process death. This
 * never runs implicitly in apply/recover/launcher and never guesses stale age. */
export async function archiveTransitionLock(plan,approval,authorization,dependencies={}) {
  assertPlan(plan);assertApproval(plan,approval);privateDirectory(plan.controlDirectory);
  exact(authorization,['schemaVersion','kind','planSha256','approvalSha256','controlLock','journal','pointerSha256','stop','current','approvedBy','approvalRef','approvedAt','expiresAt','revoked']);
  const admitted={plan:fingerprint(plan),approval:fingerprint(approval),authorization:fingerprint(authorization)};
  const journalPath=join(plan.controlDirectory,'transition.json'),pointerPath=join(plan.controlDirectory,'active.json');
  let archiveFence,context,identities,journal,lock,lockRenamed=false,archiveComplete=false;
  const guard=()=>{
    assert.equal(fingerprint(plan),admitted.plan,'Admitted transition plan changed');assert.equal(fingerprint(approval),admitted.approval,'Admitted continuation approval changed');assert.equal(fingerprint(authorization),admitted.authorization,'Admitted archival authorization changed');
    assertApproval(plan,approval);
    assert(authorization.schemaVersion===1&&authorization.kind==='standing-control-lock-archive-approval'&&authorization.revoked===false&&authorization.approvedBy?.trim()&&authorization.approvalRef?.trim()&&Date.parse(authorization.approvedAt)<=Date.now()&&Date.parse(authorization.expiresAt)>Date.now()&&Date.parse(authorization.approvedAt)<Date.parse(authorization.expiresAt),'Exact current owner lock archival authorization required');
    assert.equal(authorization.planSha256,plan.planSha256);assert.equal(authorization.approvalSha256,fingerprint(approval));
    assert.equal(authorization.controlLock.path,join(plan.controlDirectory,'control.lock'));lock=parseStandingJSON(readExactReference(authorization.controlLock,JSON_LIMITS.controlIndex));
    exact(lock,['schemaVersion','token','pid','startedAt','acquisition']);
    assert(lock.schemaVersion===1&&Number.isSafeInteger(lock.pid)&&lock.pid>0&&lock.pid!==process.pid&&typeof lock.token==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(lock.token)&&Number.isFinite(Date.parse(lock.startedAt)),'Proven exact different control lock owner required');
    if(authorization.journal===null) {
      assert(!pathExists(journalPath),'Absent transition journal changed');journal=null;
      assert.equal(authorization.current,null,'Prejournal acquisition cannot claim active-generation evidence');
      assert.deepEqual(pointerNow(plan.controlDirectory),plan.oldPointer,'Prejournal old pointer changed');
      assert(!pathExists(plan.next.stateDirectory)||privateDirectory(plan.next.stateDirectory)&&readdirSync(plan.next.stateDirectory).length===0,'Conflicting successor epoch requires reconciliation');
    } else {
      assert.equal(authorization.journal.path,journalPath);journal=parseStandingJSON(readExactReference(authorization.journal,JSON_LIMITS.controlIndex));
      exact(journal,['schemaVersion','planSha256','approvalSha256','plan','approval','oldPointer','newPointer','phase','imported','validatedState','proof']);
      assert(journal.schemaVersion===1&&journal.planSha256===plan.planSha256&&journal.approvalSha256===fingerprint(approval)&&PHASES.includes(journal.phase),'Exact transition journal required');
      const directory=join(plan.controlDirectory,'transitions',plan.planSha256);
      assert.equal(journal.plan.path,join(directory,'plan.json'));assert.equal(journal.approval.path,join(directory,'approval.json'));
      assert.deepEqual(JSON.parse(readExactReference(journal.plan,JSON_LIMITS.controlIndex)),plan);assert.deepEqual(JSON.parse(readExactReference(journal.approval,JSON_LIMITS.controlIndex)),approval);
      assert.deepEqual(journal.oldPointer,plan.oldPointer);assert.deepEqual(journal.newPointer,{schemaVersion:1,generationId:plan.next.generationId,generationSha256:plan.next.generationSha256,config:plan.next.config,configReferencesSha256:plan.next.configReferencesSha256,stateDirectory:plan.next.stateDirectory,epochId:plan.next.epochId,authorizationSha256:fingerprint(approval),transitionPlanSha256:plan.planSha256});
      const pointer=pointerNow(plan.controlDirectory);
      assert((fingerprint(pointer)===fingerprint(plan.oldPointer)&&journal.phase!=='completed')||(['cutover-intent','cutover','completed'].includes(journal.phase)&&fingerprint(pointer)===fingerprint(journal.newPointer)),'Journal/pointer phase mismatch');
      assert(journal.proof?.path?.startsWith(directory+'/proof-'),'Bound retained transition proof required');readExactReference(journal.proof,JSON_LIMITS.controlIndex);
      if(journal.phase!=='completed')assert.equal(authorization.current,null,'Incomplete transition cannot claim active terminal state');
    }
    if(lock.acquisition.kind==='standing-transition-acquisition') {
      exact(lock.acquisition,['kind','plan','approval']);assert.deepEqual(lock.acquisition,{kind:'standing-transition-acquisition',plan,approval},'Control acquisition plan/approval changed');
    } else {
      exact(lock.acquisition,['kind','pointer','journal']);assert(lock.acquisition.kind==='standing-active-generation-acquisition'&&journal?.phase==='completed','Legacy/unbound acquisition requires explicit reconciliation');
      assert.deepEqual(lock.acquisition.journal,authorization.journal,'Active acquisition journal changed');readExactReference(lock.acquisition.journal,JSON_LIMITS.controlIndex);
      assert.equal(lock.acquisition.pointer.path,pointerPath);readExactReference(lock.acquisition.pointer,JSON_LIMITS.controlIndex);
    }
    assert.equal(pathExists(pointerPath)?fileReference(pointerPath,JSON_LIMITS.controlIndex).sha256:null,authorization.pointerSha256,'Lock archival pointer changed');
    assert.equal(authorization.stop.path,plan.stopFile);readExactReference(authorization.stop,JSON_LIMITS.controlIndex);
    context=transitionContext(plan,approval,dependencies);
    if(journal?.phase==='completed')identities=completedArchiveState(plan,approval,journal,authorization.current,context.config,context.adapters);
    else {const original=originalState(plan);validateNativeEvidence(plan,context.config,context.adapters,original);}
    const absent=[...plan.quiescence.absentPaths,...(journal?.phase==='completed'?[join(plan.next.stateDirectory,'dispatcher.lock'),join(plan.next.stateDirectory,'pending-intent.json')]:[])];
    for(const path of absent)assert(!pathExists(path),'Dispatcher/native lock or marker remains');
    if(archiveFence)readExactReference(archiveFence,JSON_LIMITS.controlIndex);
  };
  guard();
  const path=join(plan.controlDirectory,'control-archive.lock'),token=randomUUID(),fd=openSync(path,'wx',0o600);
  try {
    writeFileSync(fd,serializeJSON({schemaVersion:1,token,pid:process.pid,startedAt:new Date().toISOString()},JSON_LIMITS.controlIndex));fsyncSync(fd);syncDirectory(plan.controlDirectory);archiveFence=fileReference(path,JSON_LIMITS.controlIndex);guard();
    let proof,probePlan=plan;
    if(journal?.phase==='completed') {
      await observeIdentities(plan,context.config,identities,dependencies,guard);guard();
      const q=plan.quiescence;probePlan={...plan,quiescence:{...q,stateRoots:[...new Set([...q.stateRoots,plan.next.stateDirectory])],absentPaths:[...new Set([...q.absentPaths,join(plan.next.stateDirectory,'dispatcher.lock'),join(plan.next.stateDirectory,'pending-intent.json')])]}};
      proof=await probeQuiescence(probePlan,dependencies,guard,true);guard();
    } else {const checked=await prerequisites(plan,approval,dependencies,guard,true);guard();proof=checked.proof;}
    guard();const tool=plan.quiescence.tools.ps;assertTrustedFiles({[tool.path]:tool.sha256});
    const processes=await (dependencies.execute||execute)(tool.path,['-axo','pid=,ppid=,command=']);guard();
    assert(processes.code===0&&processes.stderr===''&&typeof processes.stdout==='string'&&Buffer.byteLength(processes.stdout)<=1024*1024,'Bounded owner process proof required');
    assertAbsentProcesses(probePlan,processes.stdout,lock.pid);
    guard();const transitions=privateDirectory(join(plan.controlDirectory,'transitions'),true),directory=privateDirectory(join(transitions,plan.planSha256),true);syncDirectory(plan.controlDirectory);syncDirectory(transitions);
    guard();const authorizationRef=immutableJSON(join(directory,'lock-archive-approval-'+fingerprint(authorization)+'.json'),authorization);
    guard();const proofRef=immutableJSON(join(directory,'lock-archive-proof-'+authorization.controlLock.sha256+'.json'),{schemaVersion:1,authorization:authorizationRef,controlLock:authorization.controlLock,journal:authorization.journal,acquisition:lock.acquisition,quiescence:proof,ownerPid:lock.pid,ownerProcessInventory:{tool:tool.path,sha256:tool.sha256,args:['-axo','pid=,ppid=,command='],code:processes.code,stdout:processes.stdout,stderr:processes.stderr},ownerProcessInventorySha256:hash(processes.stdout),ownerAbsent:true});
    guard();readExactReference(authorizationRef,JSON_LIMITS.controlIndex);readExactReference(proofRef,JSON_LIMITS.controlIndex);
    const destination=join(directory,'archived-control-lock-'+authorization.controlLock.sha256+'.json');assert(!pathExists(destination),'Control lock already archived');
    renameSync(authorization.controlLock.path,destination);lockRenamed=true;syncDirectory(directory);syncDirectory(plan.controlDirectory);
    const result={schemaVersion:1,controlLock:fileReference(destination,JSON_LIMITS.controlIndex),authorization:authorizationRef,proof:proofRef};archiveComplete=true;return result;
  } catch(error) {
    // A rejecting IO promise must not bypass the admitted-byte/authority fence.
    if(!lockRenamed)guard();throw error;
  } finally {
    try {
      if(!lockRenamed||archiveComplete){if(archiveFence)readExactReference(archiveFence,JSON_LIMITS.controlIndex);assert.equal(readPrivateJSON(path,JSON_LIMITS.controlIndex).token,token,'Lock archival ownership changed');unlinkSync(path);syncDirectory(plan.controlDirectory);}
    } finally {closeSync(fd);}
  }
}

export async function applyTransition(plan,approval,dependencies={}) { return apply(plan,approval,null,dependencies); }
export async function recoverTransition(plan,approval,recovery,dependencies={}) { return apply(plan,approval,recovery,dependencies); }

async function apply(plan,approval,recovery,dependencies) {
  assertPlan(plan); assertApproval(plan,approval); privateDirectory(plan.controlDirectory);
  const acquisition={kind:'standing-transition-acquisition',plan:structuredClone(plan),approval:structuredClone(approval)};
  const lease=acquireControlLock(plan.controlDirectory,acquisition),leaseRef=fileReference(join(plan.controlDirectory,'control.lock'),JSON_LIMITS.controlIndex),journalPath=join(plan.controlDirectory,'transition.json');
  let preserveLease=false, recheckAuthority;
  try {
    let journal=pathExists(journalPath)?readPrivateJSON(journalPath,JSON_LIMITS.controlIndex):null;
    const recoveryAuthority=recovery?structuredClone(recovery):null;
    if(recovery) {
      assertRecoveryApproval(plan,approval,recoveryAuthority);
      assert.equal(recovery.journal.path,journalPath); readExactReference(recovery.journal,JSON_LIMITS.controlIndex);
      assert(journal&&journal.phase===recovery.phase&&journal.phase!=='completed','Exact incomplete recovery phase required');
      assert.equal(pathExists(join(plan.controlDirectory,'active.json'))?fileReference(join(plan.controlDirectory,'active.json')).sha256:null,recovery.pointerSha256,'Recovery pointer changed');
    } else assert(!journal,'Existing transition requires explicit exact recovery; no automatic replay');
    if(journal) { assert.equal(journal.planSha256,plan.planSha256); assert.equal(journal.approvalSha256,fingerprint(approval)); assert(PHASES.includes(journal.phase)); }
    const current=pointerNow(plan.controlDirectory), newPointer={schemaVersion:1,generationId:plan.next.generationId,generationSha256:plan.next.generationSha256,config:plan.next.config,configReferencesSha256:plan.next.configReferencesSha256,stateDirectory:plan.next.stateDirectory,epochId:plan.next.epochId,authorizationSha256:fingerprint(approval),transitionPlanSha256:plan.planSha256};
    assert(fingerprint(current)===fingerprint(plan.oldPointer)||journal&&['cutover-intent','cutover'].includes(journal.phase)&&fingerprint(current)===fingerprint(newPointer),'Active pointer changed outside approved transition');
    if(journal) {
      exact(journal,['schemaVersion','planSha256','approvalSha256','plan','approval','oldPointer','newPointer','phase','imported','validatedState','proof']);assert.equal(journal.schemaVersion,1);assert.deepEqual(journal.oldPointer,plan.oldPointer);assert.deepEqual(journal.newPointer,newPointer);
      const directory=join(plan.controlDirectory,'transitions',plan.planSha256);assert.equal(journal.plan.path,join(directory,'plan.json'));assert.equal(journal.approval.path,join(directory,'approval.json'));assert.deepEqual(JSON.parse(readExactReference(journal.plan,JSON_LIMITS.controlIndex)),plan);assert.deepEqual(JSON.parse(readExactReference(journal.approval,JSON_LIMITS.controlIndex)),approval);
      assert(journal.proof?.path?.startsWith(directory+'/proof-'),'Bound retained quiescence proof required');readExactReference(journal.proof,JSON_LIMITS.controlIndex);
      if(journal.imported){exact(journal.imported,['manifest','root']);assert.equal(journal.imported.manifest.path,join(plan.next.stateDirectory,'import-manifest.json'));assert.equal(journal.imported.root.path,join(plan.next.stateDirectory,'imported-root.json'));}
      if(journal.validatedState)assert.equal(journal.validatedState.path,join(plan.next.stateDirectory,'state.json'),'Validated root must be the exact successor state');
    }
    // Recovery pins the admission journal/pointer once. Our own subsequent
    // durable progression gets a new exact reference, never renewed authority.
    let journalRef=journal?fileReference(journalPath,JSON_LIMITS.controlIndex):null;
    const pointerPath=join(plan.controlDirectory,'active.json');
    let pointerRef=pathExists(pointerPath)?fileReference(pointerPath,JSON_LIMITS.controlIndex):null, recoveryRef;
    const authorityConfig=JSON.parse(readExactReference(plan.next.config));
    const guard=()=>{
      try {
        assertPlan(plan); assertApproval(plan,approval);readExactReference(leaseRef,JSON_LIMITS.controlIndex);
        assert.deepEqual(acquisition,{kind:'standing-transition-acquisition',plan,approval},'Admitted acquisition changed');
        if(recoveryAuthority) {
          assertRecoveryApproval(plan,approval,recoveryAuthority);
          assert.equal(fingerprint(recovery),fingerprint(recoveryAuthority),'Immutable recovery authorization changed');
          if(recoveryRef)readExactReference(recoveryRef,JSON_LIMITS.controlIndex);
        }
        readExactReference(plan.next.config); readPrivateBytes(plan.stopFile,JSON_LIMITS.controlIndex);
        if(authorityConfig.services.naeil.siteContinuationApproval)resolveSiteTarget(plan.release,authorityConfig.services.naeil.siteContinuationApproval);
        assert.equal(lstatSync(plan.stopFile).mode&0o777,0o600,'STOP must remain0600');
        assert(authorityConfig.enabled===true&&authorityConfig.policy.enabled===true&&Date.parse(authorityConfig.policy.expiresAt)>Date.now(),'Current standing execution authorization required');
        for(const id of IDS)assert(reviewedMigration(plan.release,{id},authorityConfig.policy),'Original exact reviewedMigration expired or changed; continuation cannot extend authorization');
        const window=authorityConfig.policy.patchWindow;assert(Date.parse(window.startsAt)<=Date.now()&&Date.parse(window.expiresAt)>Date.now(),'Current exact patch window required');
        if(journalRef)readExactReference(journalRef,JSON_LIMITS.controlIndex);else assert(!pathExists(journalPath),'Transition journal changed outside authorized progression');
        if(pointerRef)readExactReference(pointerRef,JSON_LIMITS.controlIndex);else assert(!pathExists(pointerPath),'Active pointer changed outside authorized progression');
      } catch(error) { preserveLease=true; throw error; }
    };
    recheckAuthority=guard;
    const boundary=async name=>{await dependencies.afterBoundary?.(name);guard();};
    guard();await boundary('control-acquired');
    const checked=await prerequisites(plan,approval,dependencies,guard);guard();
    const transitions=privateDirectory(join(plan.controlDirectory,'transitions'),true), directory=privateDirectory(join(transitions,plan.planSha256),true); syncDirectory(plan.controlDirectory); syncDirectory(transitions);
    const planRef=immutableJSON(join(directory,'plan.json'),plan), approvalRef=immutableJSON(join(directory,'approval.json'),approval); immutableJSON(join(directory,'old-pointer.json'),plan.oldPointer);
    if(recoveryAuthority) { guard(); recoveryRef=immutableJSON(join(directory,'recovery-'+fingerprint(recoveryAuthority)+'.json'),recoveryAuthority); }
    for(const [name,ref]of [['estimate-ledger',plan.estimate.ledger],['estimate-baseline',plan.nativeEvidence.estimate.baseline],['jev-baseline',plan.nativeEvidence.jev.baseline]]) {guard();immutable(join(directory,'historical-'+name+'.json'),readExactReference(ref));}
    const phase=async name=>{
      guard(); assertConfigReferences(checked.config.configReferences,plan.next.configReferencesSha256);
      originalState(plan); readExactReference(plan.old.config);
      const proof=await probeQuiescence(plan,dependencies,guard);guard();
      journal={schemaVersion:1,planSha256:plan.planSha256,approvalSha256:fingerprint(approval),plan:planRef,approval:approvalRef,oldPointer:plan.oldPointer,newPointer,phase:name,imported:journal?.imported||null,validatedState:journal?.validatedState||null,proof:immutableJSON(join(directory,'proof-'+name+'-'+fingerprint(proof)+'.json'),proof)};
      guard();immutableJSON(join(directory,'phase-'+name+'-'+fingerprint(journal)+'.json'),journal); guard();atomicJSON(journalPath,journal,JSON_LIMITS.controlIndex);journalRef=fileReference(journalPath,JSON_LIMITS.controlIndex);await boundary('journal-'+name);
    };
    if(!journal)await phase('prepared');
    const importInput={sourcePath:plan.old.snapshot.path,expectedSha256:plan.old.snapshot.sha256,destination:plan.next.stateDirectory,epochId:plan.next.epochId,evidenceRoot:plan.old.evidenceRoot}, importedRootPath=join(plan.next.stateDirectory,'imported-root.json');
    if(journal.phase==='prepared') {
      await prerequisites(plan,approval,dependencies,guard);guard();
      if(pathExists(plan.next.stateDirectory)&&readdirSync(plan.next.stateDirectory).length)validateCompletedImport(importInput,{importedRootPath:pathExists(importedRootPath)?importedRootPath:join(plan.next.stateDirectory,'state.json')});
      else importLegacyState(importInput);
      await boundary('import-complete');
      immutable(importedRootPath,readPrivateBytes(join(plan.next.stateDirectory,'state.json'),JSON_LIMITS.controlIndex)); await boundary('import-root');
      journal.imported={manifest:fileReference(join(plan.next.stateDirectory,'import-manifest.json')),root:fileReference(importedRootPath)};await phase('imported');
    }
    assert(journal.imported,'Completed exact imported epoch required');readExactReference(journal.imported.root,JSON_LIMITS.controlIndex);readExactReference(journal.imported.manifest,JSON_LIMITS.controlIndex);validateCompletedImport(importInput,{importedRootPath});
    if(['imported','continuation-intent'].includes(journal.phase)) {
      if(journal.phase==='imported')await phase('continuation-intent');
      await prerequisites(plan,approval,dependencies,guard);guard();
      const imported=readPrivateJSON(importedRootPath),state=readStandingEvidence(plan.next.stateDirectory,imported.state),record=Object.values(state.releases).find(record=>record.releaseId===plan.release.releaseId),prior=record.services.estimate;
      const provenance={schemaVersion:1,planSha256:plan.planSha256,authorizationSha256:fingerprint(approval),generationSha256:plan.next.generationSha256,historicalRequestSha256:fingerprint(record.services.naeil.request),historicalResultSha256:fingerprint(record.services.naeil.result),requiresFreshVerification:true};
      record.services.naeil.continuation=provenance;
      (record.history||=[]).push({serviceId:'estimate',prior:structuredClone(prior),resolution:'generation-continuation-source-only',planSha256:plan.planSha256,authorizationSha256:fingerprint(approval)});
      record.services.estimate={state:'deferred',reconciliation:{priorAttemptId:plan.estimate.priorAttemptId},authorizedAttemptId:plan.estimate.newAttemptId};
      record.generationContinuation={schemaVersion:1,planSha256:plan.planSha256,authorizationSha256:fingerprint(approval),generationSha256:plan.next.generationSha256,originalBinding:record.binding,releaseSha256:releaseIdentityDigest(plan.release)}; record.state='deferred'; delete state.blocked; state.lastState='deferred';
      const currentState=readStandingState(plan.next.stateDirectory);
      if(fingerprint(currentState)!==fingerprint(state)) { assert.equal(fingerprint(currentState),fingerprint(readStandingEvidence(plan.next.stateDirectory,imported.state)),'Partially continued epoch conflicts; retained for review'); guard();writeStandingState(plan.next.stateDirectory,state); }
      await boundary('continuation-state');
      validateConfig(checked.config); journal.validatedState=fileReference(join(plan.next.stateDirectory,'state.json'));
      guard();immutable(join(directory,'validated-root.json'),readExactReference(journal.validatedState,JSON_LIMITS.controlIndex));
      immutableJSON(join(plan.next.stateDirectory,'generation-binding.json'),{schemaVersion:1,controlDirectory:plan.controlDirectory,generationSha256:plan.next.generationSha256,epochId:plan.next.epochId});await boundary('generation-binding');await phase('validated');
    }
    if(['validated','cutover-intent','cutover'].includes(journal.phase)) {
      readExactReference(journal.validatedState,JSON_LIMITS.controlIndex); validateConfig(checked.config);
      if(journal.phase==='validated')await phase('cutover-intent');
      if(journal.phase==='cutover-intent') {
        await prerequisites(plan,approval,dependencies,guard);guard();
        const now=pointerNow(plan.controlDirectory);assert(fingerprint(now)===fingerprint(plan.oldPointer)||fingerprint(now)===fingerprint(newPointer),'Cutover pointer conflicts');
        if(fingerprint(now)!==fingerprint(newPointer)){guard();atomicJSON(pointerPath,newPointer,JSON_LIMITS.controlIndex);pointerRef=fileReference(pointerPath,JSON_LIMITS.controlIndex);}
        await boundary('active-pointer');await phase('cutover');
      }
      assert.deepEqual(pointerNow(plan.controlDirectory),newPointer);await phase('completed');
    }
    return {schemaVersion:1,planSha256:plan.planSha256,phase:journal.phase,newPointer,stopActive:true};
  } catch(error) {
    // A rejected await must not skip the authority check and release a lock
    // after its approval expired while the failing operation was in flight.
    recheckAuthority?.(); throw error;
  } finally { if(preserveLease)lease.retain();else lease.release(); }
}
