/** Local consumer callbacks. Release approval and the machine lock belong to the
 * runner. Consumer inputs hold a passed isolated candidate plus independently
 * pinned source/tool bindings; native input contains paths/metadata, no secrets.
 *
 * service.consumer = {candidate, candidateBinding, native: {
 *   pythonExecutable/pythonSha256 (Jev) or nodeExecutable/nodeSha256 (Estimate),
 *   helper:{path,sha256}, executionPath, config:{privateFiles:'metadata-only',...}, timeoutMs?
 * }}. candidate may instead be a private JSON {path,sha256} reference.
 */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { constants, closeSync, existsSync, fstatSync, fsyncSync, lstatSync, mkdtempSync, openSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual, promisify } from 'node:util';
import { assertCandidate, assertCandidateSource } from './consumer-preflight.mjs';
import { inspectEstimateRelease, inspectJevArchive } from './consumer-artifact.mjs';
import { treeDigest } from './preflight-sandbox.mjs';
import { digest as planDigest, GATE, readReceipt, startRegistered } from './local-runtime.mjs';

const exec=promisify(execFile),HEX=/^[a-f0-9]{64}$/,REVISION=/^[a-f0-9]{40}$/,ID=/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/;
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const manifestSha=value=>hash(JSON.stringify(Object.fromEntries(Object.entries(value).sort().map(([key,entry])=>[key,Object.fromEntries(Object.entries(entry).sort())]))));
const fail=(reasonCode,outcome='not-started',extra={})=>Object.assign(new Error(reasonCode),{reasonCode,outcome,retryable:false,...extra});
const canonical=path=>typeof path==='string'&&isAbsolute(path)&&resolve(path)===path&&realpathSync(path)===path;
function privateBytes(path,maxBytes=8*1024*1024) {
 assert(canonical(path),'Canonical private input required');
 const fd=openSync(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
 try {const info=fstatSync(fd);assert(info.isFile()&&info.nlink===1&&info.uid===process.getuid()&&!(info.mode&0o077)&&info.size<=maxBytes,'Owned bounded private input required');return readFileSync(fd);}
 finally {closeSync(fd);}
}
function publicBytes(path,maxBytes=1024*1024*1024) {
 assert(canonical(path),'Canonical artifact file required');const info=lstatSync(path);
 assert(info.isFile()&&info.nlink===1&&info.size<=maxBytes,'Bounded regular single-link artifact required');return readFileSync(path);
}
function executableBytes(path,maxBytes=256*1024*1024) {
 assert(canonical(path),'Canonical pinned executable required');const info=lstatSync(path);
 // System executable aliases can be hardlinks. Their reviewed bytes are pinned;
 // artifacts, receipts and mutable output retain the single-link requirement.
 assert(info.isFile()&&[0,process.getuid()].includes(info.uid)&&info.size<=maxBytes,'Bounded owned/system executable required');return readFileSync(path);
}
function writeExclusive(path,value) {
 const fd=openSync(path,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
 try {writeFileSync(fd,typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value));fsyncSync(fd);}finally{closeSync(fd);}
 const parent=openSync(dirname(path),constants.O_RDONLY);try{fsyncSync(parent);}finally{closeSync(parent);}
}
export function assertLocalArtifact(service,artifact) {
 assert(['estimate','jev'].includes(service),'Supported native consumer required');
 assert(artifact?.immutable===true&&ID.test(artifact.id)&&REVISION.test(artifact.sourceRevision)&&HEX.test(artifact.packageSha256),'Immutable source/package-bound artifact required');
 assert(HEX.test(artifact.sha256)&&hash(publicBytes(artifact.path))===artifact.sha256,'Artifact archive digest mismatch');
 assert(typeof artifact.storageRef==='string'&&artifact.storageRef.includes(artifact.sha256),'Digest-addressed artifact reference required');
 const release={version:artifact.ui?.version,contractVersion:artifact.ui?.contractVersion,archiveSha256:artifact.packageSha256};
 assert(/^0\.7\.(0|[1-9]\d*)$/.test(release.version)&&release.contractVersion==='1','Supported exact artifact UI required');
 if(service==='jev') {
  const manifest=JSON.parse(publicBytes(artifact.manifestPath,8*1024*1024));assert.equal(manifestSha(manifest),artifact.manifestSha256,'Artifact manifest digest mismatch');
  const inspected=inspectJevArchive(publicBytes(artifact.path),manifest,artifact.sourceRevision,release);
  assert.equal(inspected.identity.artifactId,artifact.id,'Archived artifact identity mismatch');assert.equal(inspected.buildId,artifact.buildId,'Archived BUILD_ID mismatch');
 }else {
  const inspected=inspectEstimateRelease(artifact.directory,artifact.sourceRevision,release);
  assert.equal(inspected.identity.artifactId,artifact.id,'Native artifact identity mismatch');assert.equal(inspected.manifestSha256,artifact.manifestSha256,'Native manifest digest mismatch');
 }
 return artifact;
}
function deployService(service) {
 if(service?.mode!=='deploy')throw fail('verification-only-service');
 if(!['estimate','jev'].includes(service.id))throw fail('unsupported-native-service');
}
const candidateKeys=['service','repository','reviewedBaseSha','candidateSourceSha','treeSha','lockfileSha256','release','expectationsSha256','harnessSha256','preflightConfigSha256'];
/** Read-only import of either retained candidate format. Historical generation
 * data remains in its original receipt; no current generation grants validity.
 * The one release approval binds this returned input proof and exact artifacts.
 */
export function readLocalCandidate(value) {
 if(!value?.path||!HEX.test(value.sha256))return value;
 const bytes=privateBytes(value.path);assert.equal(hash(bytes),value.sha256,'Candidate JSON reference mismatch');
 if(value.bytes!==undefined)assert.equal(bytes.length,value.bytes,'Candidate JSON byte count mismatch');
 const candidate=JSON.parse(bytes);return candidate.receipt?candidate:{...candidate,receipt:{path:value.path,sha256:value.sha256,bytes:bytes.length}};
}
export function localCandidateProof(value) {
 const candidate=readLocalCandidate(value);
 const binding=Object.fromEntries(candidateKeys.map(key=>[key,candidate?.[key]]));
 if(candidate?.sourceHeadSha!==undefined)binding.sourceHeadSha=candidate.sourceHeadSha;
 const historical={...binding,preflightPlanSha256:candidate?.preflightPlanSha256,...(candidate?.executionSha256?{executionSha256:candidate.executionSha256}:{generationSha256:candidate?.generationSha256})};
 assertCandidate(candidate,historical);assertCandidateSource(candidate);assertLocalArtifact(candidate.service,candidate.artifact);
 const input=JSON.parse(publicBytes(candidate.plan.path,8*1024*1024));
 for(const [path,digest] of Object.entries(input.config.executables))assert.equal(hash(executableBytes(path)),digest,'Consumer executable changed');
 assert.equal(hash(executableBytes(input.config.pnpm.path)),input.config.pnpm.sha256,'Consumer package manager changed');
 for(const ref of input.config.readable??[])assert.equal(lstatSync(ref.path).isDirectory()?treeDigest(ref.path):hash(publicBytes(ref.path)),ref.sha256,'Consumer runtime input changed');
 const proof={...binding,sourceHeadSha:candidate.sourceHeadSha??candidate.reviewedBaseSha,executionInputs:{node:input.config.node,git:input.config.git??'/usr/bin/git',pnpm:input.config.pnpm,executables:input.config.executables,readable:input.config.readable??[],executionPath:input.config.executionPath},artifact:candidate.artifact};
 return {candidateBinding:binding,consumerInputsSha256:planDigest(proof)};
}
export function candidateFor(plan,service) {
 const candidate=readLocalCandidate(service.consumer?.candidate);
 assert(candidate,'Passed isolated consumer candidate required');
 const proof=localCandidateProof(candidate);assert.deepEqual(proof.candidateBinding,service.consumer?.candidateBinding,'Exact independently approved consumer inputs changed');
 assert.equal(candidate.service,service.id,'Foreign consumer candidate');
 assert.deepEqual(candidate.release,{releaseId:plan.release.releaseId,version:plan.release.version,contractVersion:plan.release.contract.version,sourceRevision:plan.release.sourceRevision,archiveSha256:plan.release.archive.sha256,chromeSha256:plan.release.contract.sha256,accountSha256:plan.release.account?.sha256},'Candidate release tuple mismatch');
 return {candidate,proof};
}
function nativeConfig(service) {
 const native=structuredClone(service.consumer?.native);
 assert(['jev','estimate'].includes(service.id)&&native,'Configured local native integration required');
 const interpreter=service.id==='jev'?native.pythonExecutable:native.nodeExecutable,interpreterSha=service.id==='jev'?native.pythonSha256:native.nodeSha256;
 assert(canonical(interpreter)&&HEX.test(interpreterSha)&&hash(executableBytes(interpreter))===interpreterSha,'Pinned native interpreter changed');
 assert(canonical(native.helper?.path)&&HEX.test(native.helper.sha256)&&hash(publicBytes(native.helper.path,1024*1024))===native.helper.sha256,'Pinned native helper changed');
 assert(typeof native.executionPath==='string'&&native.executionPath.split(':').every(path=>isAbsolute(path)&&resolve(path)===path),'Exact native PATH required');
 assert(canonical(service.id==='jev'?native.config?.baseDirectory:native.config?.deploymentRoot)&&native.config.privateFiles==='metadata-only','Local native protected metadata contract required');
 if(service.id==='estimate')assert(canonical(native.config.stateDirectory),'Exact Estimate native state directory required');
 return native;
}
function nativeRequest({plan,service,transaction,directory},native,action,artifact) {
 const retained=['rollback','inspect-transaction'].includes(action),prepared=transaction?.prepared,release=retained?prepared.release:plan.release;
 const digest=retained?prepared.planSha256:planDigest(plan),attemptId=transaction?.id??`inspect-${digest.slice(0,32)}`;
 assert(ID.test(attemptId),'Bounded native transaction ID required');
 const request={schemaVersion:1,mode:'local',action,planSha256:digest,release,service:{id:service.id},attemptId,idempotencyKey:`local-${digest}-${service.id}-${attemptId}`,config:native.config,artifact,previousArtifact:transaction?.previousArtifact,transactionDirectory:service.id==='jev'?join(native.config.baseDirectory,'releases',`ui-${attemptId}`):join(native.config.stateDirectory,attemptId)};
 if(action==='inspect-transaction')request.inspectionArtifact=transaction.inspectionArtifact;
 if(action==='rollback'&&transaction.rollbackReconciliation) {
  const reference=transaction.rollbackReconciliation,proof=readReceipt(directory,reference);
  for(const [key,value]of Object.entries({kind:'rollback-reconciliation',stage:'rollback-inspect',status:'observed',planSha256:digest,releaseId:release.releaseId,serviceId:service.id,transactionId:attemptId}))assert.equal(proof[key],value,'Rollback reconciliation proof binding mismatch');
  assert.deepEqual(proof.artifact,transaction.candidateArtifact,'Rollback reconciliation must observe the exact candidate');
  assert.equal(proof.nativeInspection?.action,'inspect-transaction','Native transaction inspection proof required');
  assert.deepEqual(proof.nativeInspection.artifact,transaction.candidateArtifact,'Native transaction inspection candidate mismatch');
  request.rollbackReconciliation={path:join(directory,reference.path),sha256:reference.sha256};
 }
 return request;
}
function nativeEnvironment(native) {
 const env={PATH:native.executionPath,NODE_PATH:'',NODE_OPTIONS:'',PYTHONDONTWRITEBYTECODE:'1'};
 for(const key of ['HOME','TMPDIR','LANG','LC_ALL'])if(process.env[key])env[key]=process.env[key];return env;
}
/** Transactions retained by the adfc995 Jev helper (0.7.2 acceptance) recover
 * with this exact reviewed helper after the retained bytes are verified. The
 * pair is fixed in code; no config, plan or state can name another helper. */
export const RECOVERY_HELPERS={'5eab8ff610b28705113d7e6ebcf9cea6c498510302e459077ceb9dd43f85a843':{path:fileURLToPath(new URL('./jev-native.py',import.meta.url)),sha256:'984e1cefb1eeacb2348f3aa484e0f91d0b8514868de1cebaccb47a9887c7229a'}};
async function transport(action,request,native,context) {
 const {directory}=context;
 const root=mkdtempSync(join(directory,`native-${action}-`)),input=join(root,'input.json'),output=join(root,'output.json');
 writeExclusive(input,request);
 const timeout=native.timeoutMs??180000;assert(Number.isSafeInteger(timeout)&&timeout>0&&timeout<=30*60*1000,'Bounded native timeout required');
 try {
  const jev=request.service.id==='jev';
  const pending=exec('/bin/sh',[...GATE,jev?native.pythonExecutable:native.nodeExecutable,...(jev?['-B',native.helper.path]:[native.helper.path])],{cwd:jev?native.config.baseDirectory:native.config.deploymentRoot,env:{...nativeEnvironment(native),NAEIL_ROLLOUT_INPUT:input,NAEIL_ROLLOUT_OUTPUT:output},shell:false,detached:true,encoding:'utf8',timeout,maxBuffer:1024*1024});
  startRegistered(pending,context.registerChild);
  await pending;
  return JSON.parse(privateBytes(output,4*1024*1024));
 }catch(error){throw fail('native-transport-uncertain',['inspect','inspect-transaction'].includes(action)?'not-started':'unknown',{timeout:error.killed===true||error.code==='ETIMEDOUT'});}
}
async function invoke(action,context,native,artifact,dependencies) {
 let request;
 // Retained native inputs are independently checked for rollback, even when
 // the current plan, source checkout or release archive is unavailable.
 try {
  request=nativeRequest(context,native,action,artifact);
  assert.equal(hash(executableBytes(context.service.id==='jev'?native.pythonExecutable:native.nodeExecutable)),context.service.id==='jev'?native.pythonSha256:native.nodeSha256,'Retained native interpreter changed');
  assert.equal(hash(publicBytes(native.helper.path,1024*1024)),native.helper.sha256,'Retained native helper changed');
  const recovery=['rollback','inspect-transaction'].includes(action)&&context.service.id==='jev'&&(dependencies.recoveryHelpers??RECOVERY_HELPERS)[native.helper.sha256];
  if(recovery) {
   assert.equal(hash(publicBytes(recovery.path,1024*1024)),recovery.sha256,'Reviewed recovery helper changed');
   request.recoveryHelper={retainedSha256:native.helper.sha256,sha256:recovery.sha256};native={...native,helper:recovery};
  }
 }catch{throw fail('native-input-mismatch');}
 let response;
 try {response=await (dependencies.native?dependencies.native(action,request):transport(action,request,native,context));}
 catch(error){if(['not-started','failed','unknown'].includes(error.outcome))throw error;throw fail('native-result-unknown',['inspect','inspect-transaction'].includes(action)?'not-started':'unknown');}
 const inspecting=['inspect','inspect-transaction'].includes(action);
 for(const [key,expected] of Object.entries({schemaVersion:1,releaseId:request.release.releaseId,serviceId:context.service.id,attemptId:request.attemptId,idempotencyKey:request.idempotencyKey,planSha256:request.planSha256,action}))if(response?.[key]!==expected)throw fail('native-response-binding-mismatch',inspecting?'not-started':'unknown');
 if(response.passed===false&&response.outcome==='failed'&&response.safe===true&&response.recovered===true) {
  const before=action==='deploy'?context.transaction.previousArtifact:action==='rollback'?context.transaction.candidateArtifact:null;
  if(before&&planDigest(response.artifact)===planDigest(before))return response;
  throw fail('native-recovery-proof-mismatch','unknown');
 }
 if(response.passed!==true)throw fail(response.deferred?'native-busy':response.reasonCode??'native-operation-refused',response.outcome??(response.safe===true?'not-started':'unknown'),{retryable:response.deferred===true||response.safe===true&&response.outcome==='not-started'&&response.retryable===true,...(Number.isInteger(response.status)&&response.status>=100&&response.status<=599?{status:response.status}:{}),timeout:response.timeout===true,...(/^[a-z][a-z0-9-]{0,99}$/.test(response.stage??'')?{stage:response.stage}:{})});
 if(response.safe!==true||(!inspecting&&response.activated!==true))throw fail('native-result-unknown',inspecting?'not-started':'unknown');
 return response;
}
export function createLocalConsumers(dependencies={}) {
 return {
  async inspect(context) {
   const {service,transaction}=context;
   if(transaction?.inspectionArtifact) {
    const target=transaction.inspectionArtifact;
    if(service.mode!=='deploy'||transaction.serviceId!==service.id||!['deploy','rollback'].includes(transaction.native?.operation)||transaction.native.status!=='intent'||transaction.prepared?.service?.id!==service.id||![transaction.previousArtifact,transaction.candidateArtifact].some(artifact=>isDeepStrictEqual(artifact,target)))throw fail('recovery-inspection-artifact-mismatch');
    const receipt=await invoke('inspect-transaction',context,transaction.prepared.native,transaction.candidateArtifact,dependencies);
    if(!isDeepStrictEqual(receipt.artifact,target))throw fail('native-recovery-inspection-mismatch');
    return {artifact:target,receipt};
   }
   const artifact=service.mode==='verify-only'?service.artifact:transaction?.native?.status==='complete'&&transaction.native.operation==='deploy'?transaction.candidateArtifact:transaction?.previousArtifact??service.currentArtifact;
   assert(artifact&&typeof artifact.id==='string','Exact imported/current artifact required');
   if(service.mode==='verify-only')return {artifact};
   deployService(service);assertLocalArtifact(service.id,artifact);
   await invoke('inspect',context,transaction?.prepared?.native??nativeConfig(service),artifact,dependencies);return {artifact};
  },
  async prepare(context) {
   const {plan,service,transaction,directory}=context;deployService(service);
   const {candidate,proof}=candidateFor(plan,service),native=nativeConfig(service);
   assert.deepEqual(transaction.previousArtifact,service.currentArtifact,'Transaction predecessor differs from imported current artifact');
   assertLocalArtifact(service.id,transaction.previousArtifact);
   assert.equal(transaction.previousArtifact.ui.version,plan.release.previousVersion,'Transaction predecessor UI version mismatch');
   const retained=join(directory,`native-helper-${service.id}-${transaction.id}.${service.id==='jev'?'py':'mjs'}`),bytes=publicBytes(native.helper.path,1024*1024);
   if(!existsSync(retained))writeExclusive(retained,bytes);assert.equal(hash(privateBytes(retained,1024*1024)),native.helper.sha256,'Retained transaction helper mismatch');native.helper={...native.helper,path:retained};
   return {candidateArtifact:candidate.artifact,candidateReceipt:candidate.receipt,consumerInputsSha256:proof.consumerInputsSha256,native,release:structuredClone(plan.release),planSha256:planDigest(plan),service:{id:service.id}};
  },
  async deploy(context) {
   const {plan,service,transaction}=context;deployService(service);
   if(transaction?.native?.operation!=='deploy'||transaction.native.status!=='intent')throw fail('native-intent-required');
   let candidate;
   try {
    const checked=candidateFor(plan,service);candidate=checked.candidate;
    assert.equal(checked.proof.consumerInputsSha256,transaction.prepared.consumerInputsSha256,'Durable consumer input proof changed');
    assert.deepEqual(candidate.artifact,transaction.candidateArtifact,'Durable candidate changed');assert.deepEqual(transaction.previousArtifact,service.currentArtifact,'Durable predecessor changed');
   }catch{throw fail('consumer-input-mismatch');}
   const receipt=await invoke('deploy',context,transaction.prepared.native,candidate.artifact,dependencies);
   if(receipt.outcome==='failed')return {outcome:'failed',artifact:receipt.artifact,recovered:true,reasonCode:receipt.reasonCode??'native-deployment-recovered',receipt};
   return {outcome:'completed',artifact:transaction.candidateArtifact,receipt};
  },
  async rollback(context) {
   const {transaction,service}=context;
   if(!transaction||transaction.serviceId!==service.id||transaction.native?.operation!=='rollback'||transaction.native.status!=='intent')throw fail('rollback-transaction-intent-required');
   if(transaction.prepared?.service?.id!==service.id)throw fail('rollback-service-mismatch');
   // Archives and source checkouts can be unavailable during rollback. The
   // runner's immutable transaction binds these identities; native verifies its
   // retained transaction code, manifests and protected runtime independently.
   const artifact=transaction.previousArtifact;
   if(artifact?.immutable!==true||!ID.test(artifact.id)||!REVISION.test(artifact.sourceRevision)||!HEX.test(artifact.sha256)||!HEX.test(artifact.packageSha256))throw fail('rollback-artifact-mismatch');
   const receipt=await invoke('rollback',context,transaction.prepared.native,transaction.candidateArtifact,dependencies);
   if(receipt.outcome==='failed')return {outcome:'failed',artifact:receipt.artifact,recovered:true,reasonCode:receipt.reasonCode??'native-rollback-recovered',receipt};
   return {outcome:'completed',artifact:transaction.previousArtifact,receipt};
  },
 };
}
