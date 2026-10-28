/** Transaction-bound, code-only Estimate activation for the local runner.
 * Approval/STOP checks and the machine session lock belong to that runner.
 * This self-contained helper can be retained byte-for-byte with a transaction.
 * It never parses auth/plist/environment files, restores live data, initializes
 * a database, force-stops a process, or removes a persistent application lock.
 */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { chmod, lstat, mkdir, open, readdir, readlink, realpath, rename, symlink } from 'node:fs/promises';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { isDeepStrictEqual, promisify } from 'node:util';
import { pathToFileURL } from 'node:url';

const exec=promisify(execFile),HEX=/^[a-f0-9]{64}$/,REVISION=/^[a-f0-9]{40}$/,ID=/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/,NATIVE_ID=/^[a-f0-9]{12}-[a-f0-9]{12}$/;
const activeMutations=new Set(),activeMarkers=new Set();
const hash=value=>createHash('sha256').update(value).digest('hex');
const canonical=path=>typeof path==='string'&&isAbsolute(path)&&resolve(path)===path;
const within=(path,root)=>path===root||path.startsWith(root+sep);
const forbidden=name=>/^(?:credential\.json|signing\.key|estimates\.json|\.estimate\.lock\.json|\.env(?:\..*)?|server\.env|\.git|password\.json|state\.sqlite(?:-.*)?|api-key|\._.*)$/.test(name)||/^(?:coral|fish|jellyfish|turtle|whale)\.png$/.test(name);
const fault=(reasonCode,{retryable=false,status,uncertain=false,timeout=false,stage}={})=>Object.assign(new Error(reasonCode),{reasonCode,retryable,uncertain,...(status===undefined?{}:{status}),...(timeout?{timeout:true}:{}),...(stage===undefined?{}:{stage})});
const transientStatus=status=>[403,408,429].includes(status)||status>=500&&status<=599;
function check(condition,reasonCode) {if(!condition)throw fault(reasonCode);}
function equal(a,b,reasonCode) {check(isDeepStrictEqual(a,b),reasonCode);}
function sorted(value) {return Array.isArray(value)?value.map(sorted):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,sorted(value[key])])):value;}
const digest=value=>hash(JSON.stringify(sorted(value)));
async function exists(path) {try{await lstat(path);return true;}catch(error){if(error.code==='ENOENT')return false;throw error;}}
async function directory(path,{privateOnly=false}={}) {
 check(canonical(path)&&await realpath(path)===path,'native-directory-invalid');const info=await lstat(path);
 check(info.isDirectory()&&(!privateOnly||info.uid===process.getuid()&&(info.mode&0o777)===0o700),'native-directory-invalid');
}
async function bytes(path,maximum=256*1024*1024,{privateOnly=false,singleLink=true}={}) {
 check(canonical(path)&&await realpath(path)===path,'native-file-invalid');
 const handle=await open(path,constants.O_RDONLY|constants.O_NOFOLLOW|constants.O_NONBLOCK);
 try {
  const info=await handle.stat();check(info.isFile()&&(!singleLink||info.nlink===1)&&info.size<=maximum&&(!privateOnly||info.uid===process.getuid()&&(info.mode&0o777)===0o600),'native-file-invalid');
  return await handle.readFile();
 }finally{await handle.close();}
}
async function syncDirectory(path) {const handle=await open(path,constants.O_RDONLY|constants.O_DIRECTORY);try{await handle.sync();}finally{await handle.close();}}
async function exclusive(path,value) {
 const handle=await open(path,constants.O_WRONLY|constants.O_CREAT|constants.O_EXCL|constants.O_NOFOLLOW,0o600);
 try{await handle.writeFile(Buffer.isBuffer(value)||typeof value==='string'?value:JSON.stringify(value)+'\n');await handle.sync();}finally{await handle.close();}
 await syncDirectory(dirname(path));
}
async function atomic(path,value) {const temporary=`${path}.${randomUUID()}.tmp`;await exclusive(temporary,value);await rename(temporary,path);await syncDirectory(dirname(path));}
async function record(path) {return JSON.parse(await bytes(path,2*1024*1024,{privateOnly:true}));}
async function metadata(path) {
 check(canonical(path)&&await realpath(path)===path,'native-protected-metadata-mismatch');const info=await lstat(path,{bigint:true});
 check(info.isFile()&&!info.isSymbolicLink(),'native-protected-metadata-mismatch');
 return Object.fromEntries(['dev','ino','mode','uid','gid','size','mtimeNs','ctimeNs'].map(key=>[key,String(info[key])]));
}
async function protectedMetadata(config) {
 const result={};for(const path of Object.keys(config.expectedMetadata).sort())result[path]=await metadata(path);
 equal(result,config.expectedMetadata,'native-protected-metadata-mismatch');return result;
}
function member(path) {check(typeof path==='string'&&path&&!isAbsolute(path)&&!path.includes('\\')&&path.split('/').every(part=>part&&part!=='.'&&part!=='..'&&!forbidden(part)),'native-code-member-invalid');}
async function inventory(root) {
 await directory(root);const result={};let count=0;
 async function walk(path) {
  for(const name of (await readdir(path)).sort()) {
   check(++count<=100000,'native-code-inventory-too-large');const source=join(path,name),key=relative(root,source);member(key);const info=await lstat(source);
   if(info.isDirectory())await walk(source);
   else if(info.isSymbolicLink()) {
    const target=await readlink(source);check(!isAbsolute(target)&&within(resolve(dirname(source),target),root)&&within(await realpath(source),root),'native-code-link-invalid');result[key]='symlink:'+target;
   }else {check(info.isFile()&&info.nlink===1,'native-code-member-invalid');result[key]=hash(await bytes(source));}
  }
 }
 await walk(root);return result;
}
function artifactShape(artifact) {
 check(artifact?.immutable===true&&ID.test(artifact.id)&&NATIVE_ID.test(artifact.releaseId)&&REVISION.test(artifact.sourceRevision)&&HEX.test(artifact.manifestSha256)&&HEX.test(artifact.packageSha256)&&HEX.test(artifact.sha256)&&typeof artifact.storageRef==='string'&&artifact.storageRef.includes(artifact.sha256)&&canonical(artifact.directory)&&canonical(artifact.path),'native-artifact-invalid');
 check(/^0\.7\.(0|[1-9]\d*)$/.test(artifact.ui?.version)&&artifact.ui?.contractVersion==='1'&&Object.keys(artifact.ui).sort().join(',')==='contractVersion,version','native-artifact-invalid');
}
const identity=artifact=>({schemaVersion:1,appId:'abestimate',artifactId:artifact.id,sourceRevision:artifact.sourceRevision,ui:artifact.ui});
async function verifyRelease(artifact,directoryPath=artifact.directory) {
 artifactShape(artifact);await directory(directoryPath);const raw=await bytes(join(directoryPath,'manifest.json'),2*1024*1024);
 check(hash(raw)===artifact.manifestSha256,'native-manifest-digest-mismatch');const manifest=JSON.parse(raw);
 check(manifest.schemaVersion===1&&manifest.releaseId===artifact.releaseId&&manifest.node==='v24.21.0'&&manifest.serverPath==='app/server.js'&&manifest.runtimeDataIncluded===false&&manifest.sourceCommit===artifact.sourceRevision&&manifest.buildId===artifact.id,'native-manifest-contract-mismatch');
 equal(manifest.uiBuildIdentity,identity(artifact),'native-build-identity-mismatch');
 const dependency=manifest.packageVersions?.['@naeil/ui'];check(/^file:vendor\/naeil-ui-[0-9A-Za-z.+-]+\.tgz$/.test(dependency??'')&&manifest.sourceFiles?.[dependency.slice(5)]===artifact.packageSha256,'native-package-digest-mismatch');
 for(const path of ['src/server/naeil-shared-session.ts','src/server/naeil-auth-client.ts'])check(HEX.test(manifest.sourceFiles?.[path]),'native-shared-session-source-missing');
 check(manifest.artifactFiles&&typeof manifest.artifactFiles==='object'&&!Array.isArray(manifest.artifactFiles),'native-code-inventory-missing');
 for(const name of Object.keys(manifest.artifactFiles))member(name);
 equal(await inventory(join(directoryPath,'app')),manifest.artifactFiles,'native-code-inventory-mismatch');
 check((await bytes(join(directoryPath,'app/.next/BUILD_ID'),4096)).toString('utf8').trim()===artifact.id,'native-build-id-mismatch');
 return manifest;
}
async function codeCompatibility(from,to) {
 const critical=manifest=>Object.fromEntries(Object.entries(manifest.sourceFiles??{}).filter(([name])=>name.startsWith('src/server/')||name.startsWith('src/domain/')).sort());
 const before=critical(from),after=critical(to);check(Object.keys(before).length>0&&Object.values(before).every(value=>HEX.test(value)),'native-compatibility-inventory-missing');
 equal(before,after,'native-server-domain-mismatch');
}
async function stage(config,artifact) {
 await verifyRelease(artifact);check(hash(await bytes(artifact.path,1024*1024*1024))===artifact.sha256,'native-archive-digest-mismatch');
 const destination=join(config.deploymentRoot,'releases',artifact.releaseId);
 if(await exists(destination)){await verifyRelease(artifact,destination);return;}
 const temporary=join(config.deploymentRoot,'releases',`.${artifact.releaseId}.${randomUUID()}.staging`);await mkdir(temporary,{mode:0o700});await syncDirectory(dirname(temporary));
 await exclusive(join(temporary,'manifest.json'),await bytes(join(artifact.directory,'manifest.json'),2*1024*1024));
 const root=join(artifact.directory,'app');
 async function copy(source,destinationPath) {
  const info=await lstat(source);
  if(info.isDirectory()) {
   await mkdir(destinationPath,{mode:0o700});for(const name of (await readdir(source)).sort()){member(relative(root,join(source,name)));await copy(join(source,name),join(destinationPath,name));}
   await chmod(destinationPath,info.mode&0o777);await syncDirectory(destinationPath);
  }else if(info.isSymbolicLink()) {const target=await readlink(source);check(!isAbsolute(target)&&within(resolve(dirname(source),target),root)&&within(await realpath(source),root),'native-code-link-invalid');await symlink(target,destinationPath);}
  else {check(info.isFile()&&info.nlink===1,'native-code-member-invalid');await exclusive(destinationPath,await bytes(source));await chmod(destinationPath,info.mode&0o777);const handle=await open(destinationPath,constants.O_RDONLY|constants.O_NOFOLLOW);try{await handle.sync();}finally{await handle.close();}}
 }
 await copy(root,join(temporary,'app'));await verifyRelease(artifact,temporary);await syncDirectory(temporary);await rename(temporary,destination);await syncDirectory(dirname(destination));await verifyRelease(artifact,destination);
}
function revision(value) {const parsed=JSON.parse(value);check(parsed.schemaVersion===3&&Number.isSafeInteger(parsed.revision)&&parsed.revision>=0,'native-data-schema-mismatch');return parsed.revision;}
async function snapshot(config) {
 await directory(config.dataDirectory);await directory(join(config.dataDirectory,'backups'));
 const names=(await readdir(join(config.dataDirectory,'backups'))).sort();check(names.length<=10000&&names.every(name=>/^revision-\d{16}(?:-[a-f0-9-]{36})?\.json$/.test(name)),'native-backup-entry-invalid');
 const files={'estimates.json':await bytes(join(config.dataDirectory,'estimates.json'),5*1024*1024)};revision(files['estimates.json']);
 for(const name of names)files['backups/'+name]=await bytes(join(config.dataDirectory,'backups',name),5*1024*1024);
 return {files,hashes:Object.fromEntries(Object.entries(files).map(([name,value])=>[name,hash(value)])),metadata:await protectedMetadata(config)};
}
async function sameSnapshot(config,baseline) {const now=await snapshot(config);equal(now.hashes,baseline.hashes,'native-data-preservation-mismatch');equal(now.metadata,baseline.metadata,'native-protected-metadata-mismatch');}
async function capture(config,transactionDirectory,action) {
 const baseline=await snapshot(config),captureDirectory=join(transactionDirectory,'capture-'+action),restoreDirectory=join(transactionDirectory,'restore-'+action);
 const files={...baseline.files,'metadata.json':Buffer.from(JSON.stringify({hashes:baseline.hashes,metadata:baseline.metadata})+'\n')},hashes=Object.fromEntries(Object.entries(files).map(([name,value])=>[name,hash(value)]));
 for(const destination of [captureDirectory,restoreDirectory]) {
  await mkdir(destination,{mode:0o700});await syncDirectory(transactionDirectory);await mkdir(join(destination,'backups'),{mode:0o700});
  for(const name of Object.keys(files)) {
   const value=destination===captureDirectory?files[name]:await bytes(join(captureDirectory,name),5*1024*1024);
   check(hash(value)===hashes[name],'native-captured-file-mismatch');await exclusive(join(destination,name),value);
  }
  await syncDirectory(join(destination,'backups'));await syncDirectory(destination);
  for(const name of Object.keys(files))check(hash(await bytes(join(destination,name),5*1024*1024))===hashes[name],'native-restore-proof-mismatch');
 }
 const restoredRevision=revision(await bytes(join(restoreDirectory,'estimates.json'),5*1024*1024));check(restoredRevision===revision(baseline.files['estimates.json']),'native-restore-revision-mismatch');
 await sameSnapshot(config,baseline);await exclusive(join(captureDirectory,'proof.json'),{schemaVersion:1,hashes,fileCount:Object.keys(files).length,revision:restoredRevision,checkedAt:new Date().toISOString()});
 return baseline;
}
async function currentPointer(config,artifact) {
 const current=join(config.deploymentRoot,'current'),destination=join(config.deploymentRoot,'releases',artifact.releaseId);
 check((await lstat(current)).isSymbolicLink()&&await realpath(current)===destination,'native-current-pointer-mismatch');await verifyRelease(artifact,destination);
}
async function owned(config,artifact,probe,allowStopped=false) {
 const job=probe?.job,processIdentity=probe?.process;
 if(allowStopped&&(!job||job.label===config.label&&job.pid===null)&&await stopped(config,{...probe,job:null},true))return null;
 // This persistent application lock is an ownership record, not an auth file.
 // Only its pid is used. Its opaque nonce is never required, retained or output.
 const lock=JSON.parse(await bytes(join(config.dataDirectory,'.estimate.lock.json'),4096));
 check(job&&processIdentity&&Number.isSafeInteger(job.pid)&&job.pid>0&&job.pid===processIdentity.pid&&job.pid===lock.pid&&job.label===config.label&&processIdentity.uid===config.uid&&processIdentity.executable===config.nodePath&&processIdentity.cwd===join(config.deploymentRoot,'releases',artifact.releaseId,'app')&&typeof processIdentity.start==='string'&&processIdentity.start.length>0&&Array.isArray(probe.listeners)&&probe.listeners.length===1&&probe.listeners[0]===job.pid,'native-process-ownership-mismatch');
 if(allowStopped)equal(probe.appPids,[job.pid],'native-process-ownership-mismatch');
 return job.pid;
}
async function stopped(config,probe,requireAppProcesses=false) {return !probe.job&&!probe.process&&!probe.oldProcessAlive&&Array.isArray(probe.listeners)&&probe.listeners.length===0&&(!requireAppProcesses||isDeepStrictEqual(probe.appPids,[]))&&!await exists(join(config.dataDirectory,'.estimate.lock.json'));}
async function until(config,fn,reasonCode,platform) {
 const deadline=Date.now()+config.timeoutMs;let lastError;
 do {
  try{if(await fn())return;}catch(error){if(reasonCode!=='native-readiness-timeout'||error.retryable!==true)throw error;lastError=error;}
  await platform.pause();
 }while(Date.now()<deadline);
 throw lastError??fault(reasonCode);
}
async function healthy(platform) {
 const result=await platform.health();if(result===true)return true;
 if(result?.ok===true)return true;
 const status=Number.isInteger(result?.status)?result.status:undefined;
 throw fault('native-health-unavailable',{retryable:status===undefined||transientStatus(status),status,timeout:result?.timeout===true,stage:result?.stage});
}
async function publicIdentity(platform,artifact) {equal(await platform.identity(),identity(artifact),'native-public-identity-mismatch');}
async function switchCurrent(config,artifact) {
 const temporary=join(config.deploymentRoot,`.current-${randomUUID()}.tmp`);await symlink(join(config.deploymentRoot,'releases',artifact.releaseId),temporary);await rename(temporary,join(config.deploymentRoot,'current'));await syncDirectory(config.deploymentRoot);
}
async function configuration(request) {
 check(request?.schemaVersion===1&&request.mode==='local'&&request.service?.id==='estimate'&&['inspect','inspect-transaction','deploy','rollback'].includes(request.action)&&HEX.test(request.planSha256)&&ID.test(request.attemptId)&&typeof request.idempotencyKey==='string'&&request.idempotencyKey.length>0&&request.idempotencyKey.length<=240,'native-request-invalid');
 const config=request.config;
 check(config?.schemaVersion===1&&config.enabled===true&&config.serviceId==='estimate'&&config.appId==='abestimate'&&config.label==='dev.naeil.estimate'&&config.uid===process.getuid()&&config.port===2473&&config.privateFiles==='metadata-only'&&Number.isInteger(config.timeoutMs)&&config.timeoutMs>=10&&config.timeoutMs<=120000,'native-config-invalid');
 check(!['credentialFile','signingKeyFile','environmentFile','runtimeEnvironment','current','candidate','previous','approval','policy','expiresAt'].some(key=>Object.hasOwn(config,key)),'native-config-invalid');
 const paths=[config.nodePath,config.deploymentRoot,config.stateDirectory,config.dataDirectory,config.plistFile,request.transactionDirectory];check(paths.every(canonical),'native-config-invalid');
 equal(Object.keys(config.expectedMetadata??{}).sort(),[config.nodePath,config.plistFile].sort(),'native-config-invalid');
 for(const value of Object.values(config.expectedMetadata))check(value&&Object.keys(value).sort().join(',')==='ctimeNs,dev,gid,ino,mode,mtimeNs,size,uid'&&Object.values(value).every(item=>typeof item==='string'&&/^\d+$/.test(item)),'native-config-invalid');
 check(dirname(request.transactionDirectory)===config.stateDirectory&&basename(request.transactionDirectory)!=='active-operation'&&[config.deploymentRoot,config.dataDirectory].every(path=>!within(config.stateDirectory,path)&&!within(path,config.stateDirectory))&&!within(config.dataDirectory,config.deploymentRoot)&&!within(config.deploymentRoot,config.dataDirectory),'native-config-invalid');
 for(const path of [config.deploymentRoot,join(config.deploymentRoot,'releases'),config.dataDirectory])await directory(path);
 await directory(config.stateDirectory,{privateOnly:true});return config;
}
function response(request,binding,result) {
 return {...result,schemaVersion:1,releaseId:binding?.releaseId??request.release?.releaseId,serviceId:'estimate',attemptId:request.attemptId,idempotencyKey:request.idempotencyKey,planSha256:request.planSha256,action:request.action};
}
async function transaction(request,config) {
 const path=join(request.transactionDirectory,'binding.json'),shape={schemaVersion:1,serviceId:'estimate',attemptId:request.attemptId,idempotencyKey:request.idempotencyKey,planSha256:request.planSha256,configSha256:digest(config),previousArtifact:request.previousArtifact,candidateArtifact:request.artifact};
 artifactShape(shape.previousArtifact);artifactShape(shape.candidateArtifact);
 check(shape.previousArtifact.releaseId!==shape.candidateArtifact.releaseId,'native-artifact-transition-invalid');
 if(await exists(request.transactionDirectory)) {
  await directory(request.transactionDirectory,{privateOnly:true});check(await exists(path),'native-operation-unresolved');const stored=await record(path),{releaseId,...binding}=stored;
  equal(binding,shape,'native-transaction-binding-mismatch');check(typeof releaseId==='string'&&releaseId.length>0&&releaseId.length<=160,'native-transaction-binding-mismatch');
  if(!['rollback','inspect-transaction'].includes(request.action))check(request.release?.releaseId===releaseId,'native-transaction-binding-mismatch');return stored;
 }
 check(!['rollback','inspect-transaction'].includes(request.action),'native-transaction-missing');check(typeof request.release?.releaseId==='string'&&request.release.releaseId.length>0&&request.release.releaseId.length<=160,'native-request-invalid');
 await mkdir(request.transactionDirectory,{mode:0o700});await syncDirectory(config.stateDirectory);const binding={...shape,releaseId:request.release.releaseId};await exclusive(path,binding);return binding;
}

function ownerAbsent(marker,path) {
 if(!['intent','unknown'].includes(marker.status))return;
 check(Number.isSafeInteger(marker.ownerPid)&&marker.ownerPid>0&&!activeMarkers.has(path),'native-operation-unresolved');
 if(marker.ownerPid===process.pid)return;
 try{process.kill(marker.ownerPid,0);throw fault('native-operation-unresolved');}catch(error){if(error.code!=='ESRCH')throw fault('native-operation-unresolved');}
}
async function transactionJournal(request,binding) {
 const names=(await readdir(request.transactionDirectory)).filter(name=>name==='binding.json'||/^(?:deploy|rollback)(?:\.attempt-[1-9]\d*)?\.json$/.test(name)).sort(),journal={};
 check(names.includes('binding.json')&&names.includes('deploy.json')&&names.length<=200,'native-transaction-journal-missing');
 for(const name of names) {
  const path=join(request.transactionDirectory,name),raw=await bytes(path,2*1024*1024,{privateOnly:true});journal[name]=hash(raw);
  if(name!=='binding.json'){const marker=JSON.parse(raw);check(marker.bindingSha256===digest(binding),'native-transaction-binding-mismatch');ownerAbsent(marker,path);}
 }
 return journal;
}
async function inspectArtifact(request,config,binding,artifact,platform) {
 check([binding.previousArtifact,binding.candidateArtifact].some(value=>isDeepStrictEqual(value,artifact)),'native-inspection-artifact-mismatch');
 const journal=await transactionJournal(request,binding);await currentPointer(config,artifact);await protectedMetadata(config);
 const first=await platform.probe();await owned(config,artifact,first);await healthy(platform);await publicIdentity(platform,artifact);
 await currentPointer(config,artifact);await protectedMetadata(config);const second=await platform.probe();await owned(config,artifact,second);equal(second.process,first.process,'native-process-identity-drift');
 equal(await transactionJournal(request,binding),journal,'native-transaction-journal-drift');
 return response({...request,action:'inspect-transaction'},binding,{passed:true,safe:true,mutationAttempted:false,artifact,artifactId:artifact.id,nativeReleaseId:artifact.releaseId,journal});
}
async function reconciliationProof(request,config,binding,platform) {
 try {
  const ref=request.rollbackReconciliation;check(ref&&Object.keys(ref).sort().join(',')==='path,sha256'&&canonical(ref.path)&&HEX.test(ref.sha256),'native-rollback-reconciliation-mismatch');
  const raw=await bytes(ref.path,2*1024*1024,{privateOnly:true});check(hash(raw)===ref.sha256,'native-rollback-reconciliation-mismatch');const proof=JSON.parse(raw);
  for(const [key,value]of Object.entries({schemaVersion:1,kind:'rollback-reconciliation',stage:'rollback-inspect',status:'observed',planSha256:request.planSha256,releaseId:binding.releaseId,serviceId:'estimate',transactionId:request.attemptId}))check(proof[key]===value,'native-rollback-reconciliation-mismatch');
  equal(proof.artifact,binding.candidateArtifact,'native-rollback-reconciliation-mismatch');
  equal(proof.nativeInspection,await inspectArtifact(request,config,binding,binding.candidateArtifact,platform),'native-rollback-reconciliation-mismatch');
 }catch{throw fault('native-rollback-reconciliation-mismatch',{uncertain:true});}
}

/** Run one native invocation. Unknown markers are deliberately never replayed.
 * Rollback reads only this transaction and the two already staged code trees.
 */
export async function runEstimateNative(request,injectedPlatform) {
 let config,binding,marker,markerPath,markerOwned=false,mutationReserved=false,mutating=false;
 try {
  config=await configuration(request);
  if(request.action==='inspect') {
   artifactShape(request.artifact);await currentPointer(config,request.artifact);await protectedMetadata(config);
   const platform=injectedPlatform??actualPlatform(config),first=await platform.probe();await owned(config,request.artifact,first);await healthy(platform);await publicIdentity(platform,request.artifact);
   await currentPointer(config,request.artifact);await protectedMetadata(config);const second=await platform.probe();await owned(config,request.artifact,second);equal(second.process,first.process,'native-process-identity-drift');
   return response(request,null,{passed:true,safe:true,mutationAttempted:false,artifactId:request.artifact.id,nativeReleaseId:request.artifact.releaseId});
  }
  if(request.action!=='inspect-transaction'){check(!activeMutations.has(request.transactionDirectory),'native-operation-unresolved');activeMutations.add(request.transactionDirectory);mutationReserved=true;}
  binding=await transaction(request,config);const platform=injectedPlatform??actualPlatform(config);
  if(request.action==='inspect-transaction')return await inspectArtifact(request,config,binding,request.inspectionArtifact,platform);
  markerPath=join(request.transactionDirectory,request.action+'.json');let attempt=1,alreadyRestored=null;
  const prior=await exists(markerPath)?await record(markerPath):null;
  if(prior){check(prior.bindingSha256===digest(binding)&&prior.action===request.action,'native-operation-unresolved');if(prior.status==='complete')return prior.result;}
  if(request.action==='rollback') {
   await transactionJournal(request,binding);
   try{alreadyRestored=await inspectArtifact(request,config,binding,binding.previousArtifact,platform);}catch(error){if(error.reasonCode==='native-operation-unresolved')throw error;}
  }
  if(prior) {
   ownerAbsent(prior,markerPath);
   if(prior.status!=='not-started') {
    check(request.action==='rollback'&&(alreadyRestored||request.rollbackReconciliation),'native-operation-unresolved');if(!alreadyRestored)await reconciliationProof(request,config,binding,platform);
   }
   attempt=(prior.attempt??1)+1;check(Number.isSafeInteger(attempt)&&attempt<=100,'native-attempt-limit');
   const archived=join(request.transactionDirectory,`${request.action}.attempt-${attempt-1}.json`);check(!await exists(archived),'native-operation-unresolved');await rename(markerPath,archived);await syncDirectory(request.transactionDirectory);
  }
  // The runner's single machine lease serializes transactions. The exclusive
  // per-transaction journal prevents duplicate native invocation; no separate
  // global/action claim survives and blocks a transaction-bound rollback.
  marker={schemaVersion:1,bindingSha256:digest(binding),action:request.action,attempt,ownerPid:process.pid,status:'intent',phase:'validated'};
  try{await exclusive(markerPath,marker);markerOwned=true;activeMarkers.add(markerPath);}catch(error){if(error.code==='EEXIST')throw fault('native-operation-unresolved');throw error;}
  const phase=async value=>{marker.phase=value;await atomic(markerPath,marker);};
  if(alreadyRestored) {
   const target=binding.previousArtifact,result=response(request,binding,{passed:true,safe:true,activated:true,mutationAttempted:false,preservationVerified:true,artifactId:target.id,nativeReleaseId:target.releaseId,phase:'verified'});
   marker={...marker,status:'complete',phase:'verified',reconciliation:alreadyRestored,result};await atomic(markerPath,marker);return result;
  }
  const before=request.action==='deploy'?binding.previousArtifact:binding.candidateArtifact,target=request.action==='deploy'?binding.candidateArtifact:binding.previousArtifact;
  // A completed deploy permits rollback from bound disk/process evidence even
  // when HTTP is broken. Unresolved attempts still require healthy inspection.
  const completedRollback=request.action==='rollback'&&(!prior||prior.status==='not-started')&&(await record(join(request.transactionDirectory,'deploy.json'))).status==='complete';
  await currentPointer(config,before);const from=await verifyRelease(before,join(config.deploymentRoot,'releases',before.releaseId));
  if(request.action==='deploy')await stage(config,target);
  const to=await verifyRelease(target,join(config.deploymentRoot,'releases',target.releaseId));await codeCompatibility(from,to);await phase('staged');
  const first=await platform.probe(undefined,completedRollback),oldPid=await owned(config,before,first,completedRollback);
  if(!completedRollback){await healthy(platform);await publicIdentity(platform,before);}
  marker.oldPid=oldPid;const baseline=await capture(config,request.transactionDirectory,request.action+(attempt===1?'':'-'+attempt));await phase('captured');
  await currentPointer(config,before);await verifyRelease(target,join(config.deploymentRoot,'releases',target.releaseId));
  const second=await platform.probe(oldPid,completedRollback);await owned(config,before,second,completedRollback);equal(second.process,first.process,'native-process-identity-drift');await sameSnapshot(config,baseline);
  mutating=true;await phase('stop-requested');if(second.job)await platform.bootout();await until(config,async()=>stopped(config,await platform.probe(oldPid,completedRollback),completedRollback),'native-natural-stop-timeout',platform);
  await phase('stopped');await sameSnapshot(config,baseline);await currentPointer(config,before);
  await phase('switch-requested');await switchCurrent(config,target);await phase('switched');await sameSnapshot(config,baseline);
  await phase('bootstrap-requested');await platform.bootstrap();await until(config,async()=>healthy(platform),'native-readiness-timeout',platform);
  await owned(config,target,await platform.probe());await currentPointer(config,target);await sameSnapshot(config,baseline);await publicIdentity(platform,target);
  const result=response(request,binding,{passed:true,safe:true,activated:true,mutationAttempted:true,preservationVerified:true,artifactId:target.id,nativeReleaseId:target.releaseId,phase:'verified'});
  marker={...marker,status:'complete',phase:'verified',result};await atomic(markerPath,marker);
  return result;
 }catch(error) {
  const unresolved=mutating||error.uncertain===true||error.reasonCode==='native-operation-unresolved',result=response(request??{},binding,{passed:false,safe:!unresolved,outcome:unresolved?'unknown':'not-started',reasonCode:error.reasonCode??(mutating?'native-transition-uncertain':'native-validation-failed'),retryable:!unresolved&&error.retryable===true,phase:marker?.phase??'validation',stage:/^native-[a-z0-9-]{1,90}$/.test(error.stage??'')?error.stage:'native-'+(request?.action??'unknown'),...(Number.isInteger(error.status)&&error.status>=100&&error.status<=599?{status:error.status}:{}),...(error.timeout===true?{timeout:true}:{})});
  if(markerOwned) {
   try{marker={...marker,status:unresolved?'unknown':'not-started',result};await atomic(markerPath,marker);}catch{return {...result,safe:false,outcome:'unknown',reasonCode:'native-record-uncertain',retryable:false};}
  }
  return result;
 }finally{if(markerOwned)activeMarkers.delete(markerPath);if(mutationReserved)activeMutations.delete(request.transactionDirectory);}
}

function actualPlatform(config) {check(process.platform==='darwin'&&process.version==='v24.21.0','native-platform-runtime-mismatch');return createEstimatePlatform(config);}
/** Only PID/status/label and process ownership metadata leave these commands.
 * `launchctl list` avoids the private environment included by `print`.
 */
export function createEstimatePlatform(config,{execute=exec,fetchImpl=fetch}={}) {
 const domain=`gui/${config.uid}`;
 async function command(file,args,{absent=false}={}) {
  try{return (await execute(file,args,{encoding:'utf8',timeout:10000,maxBuffer:1024*1024,shell:false,env:{PATH:'/usr/bin:/bin:/usr/sbin:/sbin',NODE_ENV:'production',NODE_OPTIONS:'',NODE_PATH:''}})).stdout;}
  catch(error){if(absent&&error.code===1&&!(error.stdout??'').trim())return '';throw fault('native-platform-command-failed');}
 }
 const alive=pid=>{try{process.kill(pid,0);return true;}catch(error){if(error.code==='ESRCH')return false;throw fault('native-process-probe-unavailable');}};
 const timedOut=error=>['AbortError','TimeoutError'].includes(error?.name)||['ABORT_ERR','ETIMEDOUT','UND_ERR_CONNECT_TIMEOUT','UND_ERR_HEADERS_TIMEOUT','UND_ERR_BODY_TIMEOUT'].includes(error?.code??error?.cause?.code);
 async function http(path,stage) {
  let response;
  try{response=await fetchImpl(`http://127.0.0.1:${config.port}${path}`,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(2000)});}catch(error){throw fault('native-http-unavailable',{retryable:true,timeout:timedOut(error),stage});}
  if(response.status!==200)throw fault('native-http-status',{retryable:transientStatus(response.status),status:response.status,stage});
  return response;
 }
 async function json(response,stage) {
  let raw;
  try{raw=await response.text();}catch(error){throw fault('native-http-body-unavailable',{retryable:true,status:response.status,timeout:timedOut(error),stage});}
  if(Buffer.byteLength(raw)>4096)throw fault('native-public-response-invalid',{status:response.status,stage});
  try{return JSON.parse(raw);}catch{throw fault('native-public-response-invalid',{status:response.status,stage});}
 }
 return {
  async probe(oldPid,includeAppProcesses=false) {
   const rows=(await command('/bin/launchctl',['list'])).trim().split('\n').map(line=>line.trim().split(/\s+/)).filter(row=>row[2]===config.label);
   check(rows.length<=1&&rows.every(row=>row.length===3&&/^(?:-|[1-9]\d*)$/.test(row[0])&&/^-?\d+$/.test(row[1])),'native-launchd-job-mismatch');
   const listenersText=await command('/usr/sbin/lsof',['-nP',`-iTCP:${config.port}`,'-sTCP:LISTEN','-t'],{absent:true});
   const listenerValues=listenersText.trim().split(/\s+/).filter(Boolean);check(listenerValues.every(value=>/^[1-9]\d*$/.test(value)),'native-listener-probe-invalid');const listeners=[...new Set(listenerValues.map(Number))].sort((a,b)=>a-b);
   let job=null,processIdentity=null;
   if(rows.length) {
    const pid=rows[0][0]==='-'?null:Number(rows[0][0]);job={pid,label:config.label};
    if(pid) {
     const uid=Number((await command('/bin/ps',['-p',String(pid),'-o','uid='])).trim());
     const cwdOutput=await command('/usr/sbin/lsof',['-a','-p',String(pid),'-d','cwd','-Fn']),cwd=cwdOutput.split('\n').filter(line=>line.startsWith('n')).map(line=>line.slice(1));
     const executable=(await command('/usr/sbin/lsof',['-a','-p',String(pid),'-d','txt','-Fn'])).split('\n').filter(line=>line.startsWith('n')).map(line=>line.slice(1));
     check(cwd.length===1&&executable.includes(config.nodePath),'native-process-ownership-mismatch');
     const start=(await command('/bin/ps',['-p',String(pid),'-o','lstart='])).trim();processIdentity={pid,uid,executable:config.nodePath,cwd:cwd[0],start};
    }
   }
   let appPids;
   if(includeAppProcesses) {
    const cwdText=await command('/usr/sbin/lsof',['-a','-u',String(config.uid),'-d','cwd','-Fpn'],{absent:true});let pid=null;const pids=[];
    for(const row of cwdText.split('\n')) {
     if(row.startsWith('p')){check(/^[1-9]\d*$/.test(row.slice(1)),'native-process-ownership-mismatch');pid=Number(row.slice(1));}
     else if(row.startsWith('n')&&within(row.slice(1),join(config.deploymentRoot,'releases'))){check(pid!==null,'native-process-ownership-mismatch');pids.push(pid);}
    }
    appPids=[...new Set(pids)].sort((a,b)=>a-b);
   }
   return {job,process:processIdentity,listeners,oldProcessAlive:oldPid?alive(oldPid):Boolean(processIdentity),...(includeAppProcesses?{appPids}:{})};
  },
  async bootout(){await command('/bin/launchctl',['bootout',domain,config.plistFile]);},
  async bootstrap(){await command('/bin/launchctl',['bootstrap',domain,config.plistFile]);},
  async health(){const stage='native-health-http',response=await http('/api/health',stage);if((await json(response,stage))?.ok!==true)throw fault('native-health-response-mismatch',{status:response.status,stage});return {ok:true,status:response.status};},
  async identity(){const stage='native-identity-http',response=await http('/.well-known/naeil-ui.json',stage);if(!response.headers.get('cache-control')?.split(',').some(value=>value.trim().toLowerCase()==='no-store'))throw fault('native-public-identity-unavailable',{status:response.status,stage});return json(response,stage);},
  async pause(){await delay(100);},
 };
}

async function cli() {
 try {
  const input=process.env.NAEIL_ROLLOUT_INPUT,output=process.env.NAEIL_ROLLOUT_OUTPUT;assert(canonical(input)&&canonical(output)&&input!==output);
  const request=JSON.parse(await bytes(input,2*1024*1024,{privateOnly:true}));await directory(dirname(output),{privateOnly:true});await exclusive(output,await runEstimateNative(request));
 }catch{process.stderr.write('Estimate native operation refused; inspect retained private state.\n');process.exitCode=1;}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await cli();
