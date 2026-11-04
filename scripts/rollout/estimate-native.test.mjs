import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { once } from 'node:events';
import { chmod, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm, symlink, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

const hash=value=>createHash('sha256').update(value).digest('hex');
const native=await import('./estimate-native.mjs').catch(error=>{if(error.code==='ERR_MODULE_NOT_FOUND')return {};throw error;});
async function invoke(request,platform) {
 assert.equal(typeof native.runEstimateNative,'function','Transaction-bound Estimate native bridge is implemented');
 return native.runEstimateNative(request,platform);
}
async function metadata(path) {
 const info=await lstat(path,{bigint:true});
 return Object.fromEntries(['dev','ino','mode','uid','gid','size','mtimeNs','ctimeNs'].map(key=>[key,String(info[key])]));
}
async function put(path,bytes) {await mkdir(dirname(path),{recursive:true});await writeFile(path,bytes,{mode:0o600});}
async function exists(path) {try{await lstat(path);return true;}catch(error){if(error.code==='ENOENT')return false;throw error;}}
async function fixture(t) {
 const root=await realpath(await mkdtemp(join(tmpdir(),'estimate-local-native-')));t.after(()=>rm(root,{recursive:true,force:true}));
 const data=join(root,'data'),state=join(root,'state'),deploy=join(root,'deploy'),source=join(root,'artifacts');
 for(const path of [data,join(data,'backups'),state,deploy,join(deploy,'releases'),source])await mkdir(path,{mode:0o700});
 await put(join(data,'estimates.json'),JSON.stringify({schemaVersion:3,revision:9,estimates:[{id:'keep-existing-data'}]})+'\n');
 await put(join(data,'backups/revision-0000000000000008.json'),'retained backup bytes\n');
 const nodePath=join(root,'node24'),plistFile=join(root,'dev.naeil.estimate.plist');
 await put(nodePath,'synthetic pinned node fixture\n');await put(plistFile,'opaque protected plist; never parse auth or env\n');
 async function artifact(letter,version) {
  const releaseId=`${letter.repeat(12)}-${letter.repeat(12)}`,directory=join(source,releaseId),sourceRevision=letter.repeat(40),id=`estimate-${letter.repeat(16)}`;
  const files={'server.js':`// immutable code ${letter}\n`,'.next/BUILD_ID':id+'\n','public/.well-known/naeil-ui.json':JSON.stringify({schemaVersion:1,appId:'abestimate',artifactId:id,sourceRevision,ui:{version,contractVersion:'1'}})};
  for(const [name,bytes]of Object.entries(files))await put(join(directory,'app',name),bytes);
  const packageSha256=hash(`frozen-ui-${version}`),manifest={schemaVersion:1,releaseId,node:'v24.21.0',serverPath:'app/server.js',runtimeDataIncluded:false,sourceCommit:sourceRevision,buildId:id,uiBuildIdentity:{schemaVersion:1,appId:'abestimate',artifactId:id,sourceRevision,ui:{version,contractVersion:'1'}},artifactFiles:Object.fromEntries(Object.entries(files).map(([name,bytes])=>[name,hash(bytes)])),sourceFiles:{'src/server/naeil-shared-session.ts':hash('shared-session'),'src/server/naeil-auth-client.ts':hash('auth-client'),'src/domain/estimate.ts':hash('unchanged-domain'),[`vendor/naeil-ui-${version}.tgz`]:packageSha256},packageVersions:{'@naeil/ui':`file:vendor/naeil-ui-${version}.tgz`}};
  const bytes=JSON.stringify(manifest)+'\n',path=join(source,`${releaseId}.tar`),archive=Buffer.from(`fixture code archive ${letter}\n`);await put(join(directory,'manifest.json'),bytes);await put(path,archive);
  return {id,releaseId,directory,path,sha256:hash(archive),storageRef:`sha256:${hash(archive)}`,manifestSha256:hash(bytes),immutable:true,sourceRevision,ui:{version,contractVersion:'1'},packageSha256};
 }
 const previous=await artifact('a','0.7.2'),candidate=await artifact('b','0.7.3');
 const {cp}=await import('node:fs/promises');await cp(previous.directory,join(deploy,'releases',previous.releaseId),{recursive:true});
 await symlink(join(deploy,'releases',previous.releaseId),join(deploy,'current'));
 const config={schemaVersion:1,enabled:true,serviceId:'estimate',appId:'abestimate',label:'dev.naeil.estimate',uid:process.getuid(),port:2473,nodePath,deploymentRoot:deploy,stateDirectory:state,dataDirectory:data,plistFile,privateFiles:'metadata-only',expectedMetadata:{[nodePath]:await metadata(nodePath),[plistFile]:await metadata(plistFile)},timeoutMs:50};
 const request={schemaVersion:1,mode:'local',action:'deploy',planSha256:'c'.repeat(64),release:{releaseId:'ui-0.7.3-test'},service:{id:'estimate'},attemptId:'test-transaction',idempotencyKey:'local-test-transaction',config,artifact:candidate,previousArtifact:previous,transactionDirectory:join(state,'transaction-test')};
 let pid=4001,running=true,oldPid=null;const calls=[];
 const lock=async()=>put(join(data,'.estimate.lock.json'),JSON.stringify({pid,createdAt:'2026-10-28T00:00:00Z',token:'opaque-fixture-lock-nonce'}));await lock();
 const platform={
  async probe(observedOldPid) {
   calls.push('probe');const directory=await realpath(join(deploy,'current'));
   return {job:running?{pid,label:config.label}:null,listeners:running?[pid]:[],process:running?{pid,uid:config.uid,executable:nodePath,cwd:join(directory,'app'),start:`fixture-process-${pid}`} :null,oldProcessAlive:observedOldPid?running&&observedOldPid===pid:running,appPids:running?[pid]:[]};
  },
  async bootout(){calls.push('bootout');oldPid=pid;running=false;await unlink(join(data,'.estimate.lock.json'));},
  async bootstrap(){calls.push('bootstrap');pid=(oldPid??pid)+1;running=true;await lock();},
  async health(){calls.push('health');return running;},
  async identity(){calls.push('identity');return JSON.parse(await readFile(join(deploy,'current/app/public/.well-known/naeil-ui.json'),'utf8'));},
  async pause(){await new Promise(resolve=>setTimeout(resolve,2));},
 };
 const stableData=async()=>Object.fromEntries(await Promise.all(['estimates.json','backups/revision-0000000000000008.json'].map(async name=>[name,await readFile(join(data,name),'utf8')])));
 return {root,data,state,deploy,source,nodePath,plistFile,request,previous,candidate,config,platform,calls,stableData,artifact};
}

// Removing staging, preservation checks, ownership checks, or the atomic switch
// breaks an observable native lifecycle in these real temporary directories.
test('deploy activates only the bound code and retains verified data backups and restore proof',async t=>{
 const f=await fixture(t),before=await f.stableData();const result=await invoke(f.request,f.platform);
 assert.equal(result.passed,true);assert.equal(result.activated,true);assert.equal(result.safe,true);assert.equal(result.preservationVerified,true);
 assert.equal(result.planSha256,'c'.repeat(64));assert.equal(result.attemptId,'test-transaction');assert.equal(result.artifactId,f.candidate.id);
 assert.equal(await realpath(join(f.deploy,'current')),join(f.deploy,'releases',f.candidate.releaseId));
 assert.deepEqual(await f.stableData(),before);assert.equal(f.calls.filter(call=>call==='bootout').length,1);assert.equal(f.calls.filter(call=>call==='bootstrap').length,1);
 assert.deepEqual(await metadata(f.plistFile),f.config.expectedMetadata[f.plistFile]);
 const capture=join(f.request.transactionDirectory,'capture-deploy'),proof=JSON.parse(await readFile(join(capture,'proof.json'),'utf8'));
 assert.equal(proof.revision,9);assert.equal(proof.fileCount,3);assert.equal(proof.hashes['estimates.json'],hash(before['estimates.json']));
 assert.equal(await readFile(join(capture,'backups/revision-0000000000000008.json'),'utf8'),before['backups/revision-0000000000000008.json']);
 assert.equal(await readFile(join(f.request.transactionDirectory,'restore-deploy/estimates.json'),'utf8'),before['estimates.json']);
});

test('inspect verifies current ownership without creating a transaction or reading the protected plist',async t=>{
 const f=await fixture(t);await chmod(f.plistFile,0o000);f.config.expectedMetadata[f.plistFile]=await metadata(f.plistFile);
 const result=await invoke({...f.request,action:'inspect',artifact:f.previous},f.platform);
 assert.equal(result.passed,true);assert.equal(result.mutationAttempted,false);assert.equal(result.artifactId,f.previous.id);
 assert.equal(await exists(f.request.transactionDirectory),false);assert.deepEqual(f.calls.filter(call=>['bootout','bootstrap'].includes(call)),[]);
});

test('rollback restores only the recorded predecessor without approval, STOP checks, or release archive reads',async t=>{
 const f=await fixture(t);await invoke(f.request,f.platform);
 await put(join(f.state,'STOP'),'owner stopped forward work\n');await put(join(f.state,'approval.json'),'deleted below\n');await unlink(join(f.state,'approval.json'));
 for(const artifact of [f.previous,f.candidate]){await unlink(artifact.path);await rm(artifact.directory,{recursive:true});}
 const before=await f.stableData();const result=await invoke({...f.request,action:'rollback',release:undefined},f.platform);
 assert.equal(result.passed,true);assert.equal(result.artifactId,f.previous.id);assert.equal(result.activated,true);
 assert.equal(await realpath(join(f.deploy,'current')),join(f.deploy,'releases',f.previous.releaseId));assert.deepEqual(await f.stableData(),before);
 const foreign=await f.artifact('d','0.7.2');const refused=await invoke({...f.request,action:'rollback',previousArtifact:foreign},f.platform);
 assert.equal(refused.passed,false);assert.equal(refused.reasonCode,'native-transaction-binding-mismatch');
 assert.equal(f.calls.filter(call=>call==='bootout').length,2);
});

test('a completed duplicate returns its durable receipt without a second native transition',async t=>{
 const f=await fixture(t),first=await invoke(f.request,f.platform),calls=f.calls.length;
 const second=await invoke(f.request,f.platform);assert.deepEqual(second,first);assert.equal(f.calls.length,calls);
});

for(const failure of ['health-503','identity','crashed','crashed-registered'])test(`completed rollback restores the exact predecessor with candidate ${failure} and no source, archive or approval`,async t=>{
 const f=await fixture(t);assert.equal((await invoke(f.request,f.platform)).passed,true);
 const before=await f.stableData(),journal=Object.fromEntries(await Promise.all(['binding.json','deploy.json'].map(async name=>[name,await readFile(join(f.request.transactionDirectory,name))])));
 for(const artifact of [f.previous,f.candidate]){await unlink(artifact.path);await rm(artifact.directory,{recursive:true});}
 await put(join(f.state,'STOP'),'forward work stopped');assert.equal(await exists(join(f.state,'approval.json')),false);
 if(failure.startsWith('crashed')) {
  await f.platform.bootout();let registered=failure==='crashed-registered';const probe=f.platform.probe;
  f.platform.probe=async(...args)=>{const value=await probe(...args);return registered?{...value,job:{pid:null,label:f.config.label}}:value;};
  f.platform.bootout=async()=>{f.calls.push('bootout');registered=false;};
 }else {
  wireHTTP(f,async path=>{
   if(await realpath(join(f.deploy,'current'))!==join(f.deploy,'releases',f.candidate.releaseId))return;
   if(failure==='health-503'&&path==='/api/health')return new Response('synthetic unavailable',{status:503});
   if(failure==='identity'&&path==='/.well-known/naeil-ui.json')return Response.json({artifactId:'wrong-http-identity'},{headers:{'cache-control':'no-store'}});
  });
 }
 const result=await invoke({...f.request,action:'rollback',release:undefined},f.platform);
 assert.equal(result.passed,true,JSON.stringify(result));assert.equal(result.artifactId,f.previous.id);assert.equal(result.preservationVerified,true);
 assert.equal(await realpath(join(f.deploy,'current')),join(f.deploy,'releases',f.previous.releaseId));assert.deepEqual(await f.stableData(),before);
 assert.equal((await readFile(join(f.deploy,'current/app/.next/BUILD_ID'),'utf8')).trim(),f.previous.id);
 const identity=await f.platform.identity(),health=await f.platform.health();assert.equal(identity.artifactId,f.previous.id);assert.equal(health===true||health.ok===true,true);
 for(const [name,raw]of Object.entries(journal))assert.deepEqual(await readFile(join(f.request.transactionDirectory,name)),raw);
 for(const kind of ['capture-rollback','restore-rollback'])for(const [name,value]of Object.entries(before))assert.equal(await readFile(join(f.request.transactionDirectory,kind,name),'utf8'),value);
 const proof=JSON.parse(await readFile(join(f.request.transactionDirectory,'capture-rollback/proof.json'),'utf8'));assert.equal(proof.revision,9);assert.equal(proof.hashes['estimates.json'],hash(before['estimates.json']));
});

for(const failure of ['code','mixed-build','identity-file','predecessor','foreign','extra-app-process','crashed-foreign','crashed-lock','config','metadata','journal','unknown-deploy','unknown-rollback'])test(`unhealthy rollback still refuses ${failure} without stopping or replacing code`,async t=>{
 const f=await fixture(t);assert.equal((await invoke(f.request,f.platform)).passed,true);
 const request={...f.request,action:'rollback'},candidate=join(f.deploy,'releases',f.candidate.releaseId,'app');
 if(failure==='code')await writeFile(join(candidate,'server.js'),'changed candidate code');
 if(failure==='mixed-build')await writeFile(join(candidate,'.next/BUILD_ID'),f.previous.id);
 if(failure==='identity-file')await writeFile(join(candidate,'public/.well-known/naeil-ui.json'),'{}');
 if(failure==='predecessor')await writeFile(join(f.deploy,'releases',f.previous.releaseId,'app/server.js'),'changed previous code');
 if(failure==='foreign'){const probe=f.platform.probe;f.platform.probe=async(...args)=>{const value=await probe(...args);return {...value,process:{...value.process,cwd:f.source}};};}
 if(failure==='extra-app-process'){const probe=f.platform.probe;f.platform.probe=async(...args)=>({...await probe(...args),appPids:[4002,9999]});}
 if(failure.startsWith('crashed-')) {
  await f.platform.bootout();
  if(failure==='crashed-lock')await put(join(f.data,'.estimate.lock.json'),JSON.stringify({pid:9999}));
  else {const probe=f.platform.probe;f.platform.probe=async(...args)=>({...await probe(...args),appPids:[9999]});}
 }
 if(failure==='config')request.config={...f.config,unbound:true};
 if(failure==='metadata')await writeFile(f.plistFile,'changed protected metadata');
 if(failure==='journal')request.planSha256='d'.repeat(64);
 if(failure==='unknown-deploy') {
  const path=join(f.request.transactionDirectory,'deploy.json'),marker=JSON.parse(await readFile(path,'utf8'));marker.status='unknown';await put(path,JSON.stringify(marker)+'\n');
 }
 if(failure==='unknown-rollback') {
  const bootout=f.platform.bootout;f.platform.bootout=async()=>{throw Error('synthetic lost stop transport');};
  assert.equal((await invoke(request,f.platform)).outcome,'unknown');f.platform.bootout=bootout;
 }
 f.platform.health=async()=>({ok:false,status:503});
 const before=f.calls.filter(value=>['bootout','bootstrap'].includes(value)),journal=await readFile(join(f.request.transactionDirectory,'deploy.json'));
 const result=await invoke(request,f.platform);assert.equal(result.passed,false);assert.equal(result.outcome,failure==='unknown-rollback'?'unknown':'not-started');assert.equal(result.safe,failure!=='unknown-rollback');
 assert.deepEqual(f.calls.filter(value=>['bootout','bootstrap'].includes(value)),before);assert.deepEqual(await readFile(join(f.request.transactionDirectory,'deploy.json')),journal);
 assert.equal(await realpath(join(f.deploy,'current')),join(f.deploy,'releases',f.candidate.releaseId));
 if(failure==='crashed-lock')assert.equal(await exists(join(f.data,'.estimate.lock.json')),true);
});

test('completed unhealthy rollback preserves a refused prior attempt and uses fresh captures on explicit retry',async t=>{
 const f=await fixture(t);await invoke(f.request,f.platform);const probe=f.platform.probe;
 f.platform.probe=async(...args)=>({...await probe(...args),listeners:[9999]});
 const refused=await invoke({...f.request,action:'rollback'},f.platform);assert.equal(refused.outcome,'not-started');
 const prior=await readFile(join(f.request.transactionDirectory,'rollback.json'));f.platform.probe=probe;
 wireHTTP(f,async path=>path==='/api/health'&&await realpath(join(f.deploy,'current'))===join(f.deploy,'releases',f.candidate.releaseId)?new Response('synthetic unavailable',{status:503}):undefined);
 const result=await invoke({...f.request,action:'rollback'},f.platform);assert.equal(result.passed,true,JSON.stringify(result));
 assert.deepEqual(await readFile(join(f.request.transactionDirectory,'rollback.attempt-1.json')),prior);
 assert.equal(await exists(join(f.request.transactionDirectory,'capture-rollback-2/proof.json')),true);
});

for(const failure of ['health','identity'])test(`completed rollback still requires the restored predecessor ${failure}`,async t=>{
 const f=await fixture(t);await invoke(f.request,f.platform);
 wireHTTP(f,async path=>{
  if(await realpath(join(f.deploy,'current'))!==join(f.deploy,'releases',f.previous.releaseId))return;
  if(path===endpoint(failure))return failure==='health'?new Response('synthetic unavailable',{status:503}):Response.json({artifactId:'wrong-restored-identity'},{headers:{'cache-control':'no-store'}});
 });
 const result=await invoke({...f.request,action:'rollback'},f.platform);assert.equal(result.passed,false);assert.equal(result.outcome,'unknown');assert.equal(result.safe,false);
 assert.equal(JSON.parse(await readFile(join(f.request.transactionDirectory,'rollback.json'),'utf8')).status,'unknown');
});

test('completed rollback process probe finds unlabelled app processes without reading process arguments or environment',async t=>{
 const f=await fixture(t),calls=[],platform=native.createEstimatePlatform(f.config,{execute:async(file,args)=>{
  calls.push([file,args]);
  if(file==='/bin/launchctl')return {stdout:`-\t0\t${f.config.label}\n`};
  if(args.includes('-iTCP:2473'))return {stdout:''};
  assert.deepEqual(args,['-a','-u',String(f.config.uid),'-d','cwd','-Fpn']);
  return {stdout:`p9999\nn${join(f.deploy,'releases',f.candidate.releaseId,'app')}\np9998\nn/unrelated\n`};
 }});
 const probe=await platform.probe(undefined,true);assert.deepEqual(probe.appPids,[9999]);assert.equal(probe.job.pid,null);assert.deepEqual(probe.listeners,[]);
 const before=calls.length;await platform.probe();assert.equal(calls.length-before,2);
});

test('an interrupted native transition remains unknown and cannot replay',async t=>{
 const f=await fixture(t),bootout=f.platform.bootout;
 f.platform.bootout=async()=>{await bootout();throw new Error('synthetic native transport interruption');};
 const first=await invoke(f.request,f.platform);assert.equal(first.passed,false);assert.equal(first.outcome,'unknown');assert.equal(first.safe,false);
 const second=await invoke(f.request,f.platform);assert.equal(second.outcome,'unknown');assert.equal(second.reasonCode,'native-operation-unresolved');
 assert.equal(f.calls.filter(call=>call==='bootout').length,1);assert.equal(await exists(join(f.request.transactionDirectory,'deploy.json')),true);
 assert.equal(await realpath(join(f.deploy,'current')),join(f.deploy,'releases',f.previous.releaseId));
});

test('concurrent dispatches cannot both stop the application',async t=>{
 const f=await fixture(t),bootout=f.platform.bootout;let release,entered;
 const stopped=new Promise(resolve=>{entered=resolve;}),gate=new Promise(resolve=>{release=resolve;});
 f.platform.bootout=async()=>{entered();await gate;await bootout();};
 const first=invoke(f.request,f.platform);await stopped;
 const second=await invoke(f.request,f.platform);assert.equal(second.passed,false);assert.equal(second.outcome,'unknown');
 release();assert.equal((await first).passed,true);assert.equal(f.calls.filter(call=>call==='bootout').length,1);
});

for(const failure of ['archive','source','metadata','listener','process','data','backup','pointer'])test(`deploy holds ${failure} mismatches before stopping the application`,async t=>{
 const f=await fixture(t),before=await f.stableData();
 if(failure==='archive')await writeFile(f.candidate.path,'changed archive');
 if(failure==='source'){
  const path=join(f.candidate.directory,'manifest.json'),manifest=JSON.parse(await readFile(path,'utf8'));manifest.sourceFiles['src/domain/estimate.ts']=hash('incompatible domain');const bytes=JSON.stringify(manifest)+'\n';await writeFile(path,bytes);f.candidate.manifestSha256=hash(bytes);
 }
 if(failure==='metadata')await writeFile(f.plistFile,'changed protected metadata\n');
 if(failure==='listener'){const probe=f.platform.probe;f.platform.probe=async(...args)=>({...await probe(...args),listeners:[4001,9999]});}
 if(failure==='process'){const probe=f.platform.probe;f.platform.probe=async(...args)=>{const value=await probe(...args);return {...value,process:{...value.process,cwd:f.source}};};}
 if(failure==='data')await writeFile(join(f.data,'estimates.json'),'{}');
 if(failure==='backup')await put(join(f.data,'backups/unreviewed.json'),'{}');
 if(failure==='pointer'){await unlink(join(f.deploy,'current'));await symlink(f.previous.directory,join(f.deploy,'current'));}
 const result=await invoke(f.request,f.platform);assert.equal(result.passed,false);assert.equal(result.outcome,'not-started');assert.equal(result.safe,true);
 assert.deepEqual(f.calls.filter(call=>['bootout','bootstrap'].includes(call)),[]);
 if(failure!=='data')assert.equal(await readFile(join(f.data,'estimates.json'),'utf8'),before['estimates.json']);
});

test('data drift during natural shutdown remains unknown and never switches code or restores live data',async t=>{
 const f=await fixture(t),bootout=f.platform.bootout;
 f.platform.bootout=async()=>{await bootout();await writeFile(join(f.data,'estimates.json'),JSON.stringify({schemaVersion:3,revision:10}));};
 const result=await invoke(f.request,f.platform);assert.equal(result.outcome,'unknown');assert.equal(result.safe,false);assert.equal(result.phase,'stopped');
 assert.equal(await realpath(join(f.deploy,'current')),join(f.deploy,'releases',f.previous.releaseId));
 assert.equal(JSON.parse(await readFile(join(f.data,'estimates.json'),'utf8')).revision,10);
 assert.equal(JSON.parse(await readFile(join(f.request.transactionDirectory,'capture-deploy/estimates.json'),'utf8')).revision,9);
});

test('natural shutdown waits for the old pid and persistent lock instead of deleting or killing them',async t=>{
 const f=await fixture(t),probe=f.platform.probe;let stopRequested=false;
 f.platform.bootout=async()=>{f.calls.push('bootout');stopRequested=true;};
 f.platform.probe=async oldPid=>{const value=await probe(oldPid);return stopRequested?{job:null,process:null,listeners:[],oldProcessAlive:false}:value;};
 const result=await invoke(f.request,f.platform);assert.equal(result.outcome,'unknown');assert.equal(result.reasonCode,'native-natural-stop-timeout');
 assert.equal(await exists(join(f.data,'.estimate.lock.json')),true);assert.equal(f.calls.includes('bootstrap'),false);
});

test('native config rejects runtime credential files and writes no operation state',async t=>{
 const f=await fixture(t),result=await invoke({...f.request,config:{...f.config,environmentFile:join(f.root,'.env')}},f.platform);
 assert.equal(result.passed,false);assert.equal(result.reasonCode,'native-config-invalid');assert.equal(result.outcome,'not-started');assert.equal(await exists(f.request.transactionDirectory),false);
});

test('rollback requires the retained transaction rather than accepting an arbitrary imported predecessor',async t=>{
 const f=await fixture(t),result=await invoke({...f.request,action:'rollback'},f.platform);
 assert.equal(result.passed,false);assert.equal(result.reasonCode,'native-transaction-missing');assert.deepEqual(f.calls,[]);
});

test('a retained operation marker survives completion as private evidence',async t=>{
 const f=await fixture(t);await invoke(f.request,f.platform);
 const entries=await readdir(f.request.transactionDirectory);assert(entries.includes('binding.json'));assert(entries.includes('deploy.json'));
 for(const name of ['binding.json','deploy.json'])assert.equal((await lstat(join(f.request.transactionDirectory,name))).mode&0o777,0o600);
 const marker=JSON.parse(await readFile(join(f.request.transactionDirectory,'deploy.json'),'utf8'));assert.equal(marker.phase,'verified');assert.equal(marker.status,'complete');
});

async function reconciliation(f,inspection) {
 const path=join(f.root,'rollback-proof.json'),proof={schemaVersion:1,kind:'rollback-reconciliation',planSha256:f.request.planSha256,releaseId:f.request.release.releaseId,serviceId:'estimate',transactionId:f.request.attemptId,stage:'rollback-inspect',status:'observed',artifact:f.candidate,nativeInspection:inspection};
 const bytes=JSON.stringify(proof)+'\n';await put(path,bytes);return {path,sha256:hash(bytes)};
}

test('transaction inspection proves the exact healthy candidate using only staged code and immutable journal hashes',async t=>{
 const f=await fixture(t);assert.equal((await invoke(f.request,f.platform)).passed,true);
 for(const artifact of [f.previous,f.candidate]){await unlink(artifact.path);await rm(artifact.directory,{recursive:true});}
 const before=await readFile(join(f.request.transactionDirectory,'binding.json'));
 const inspected=await invoke({...f.request,action:'inspect-transaction',release:undefined,inspectionArtifact:f.candidate},f.platform);
 assert.equal(inspected.passed,true);assert.equal(inspected.mutationAttempted,false);assert.deepEqual(inspected.artifact,f.candidate);assert.equal(inspected.journal['binding.json'],hash(before));
 assert.equal(inspected.journal['deploy.json'],hash(await readFile(join(f.request.transactionDirectory,'deploy.json'))));
 assert.deepEqual(await readFile(join(f.request.transactionDirectory,'binding.json')),before);assert.equal(f.calls.filter(call=>call==='bootout').length,1);
 const foreign={...f.candidate,id:'foreign-artifact'};
 const refused=await invoke({...f.request,action:'inspect-transaction',inspectionArtifact:foreign},f.platform);assert.equal(refused.passed,false);assert.equal(refused.reasonCode,'native-inspection-artifact-mismatch');
});

test('explicit rollback restores an unknown deployment only to its bound predecessor without replaying deployment',async t=>{
 const f=await fixture(t),bootstrap=f.platform.bootstrap;
 f.platform.bootstrap=async()=>{await bootstrap();throw Error('fixture lost completion transport');};
 const interrupted=await invoke(f.request,f.platform);assert.equal(interrupted.outcome,'unknown');
 const prior=await readFile(join(f.request.transactionDirectory,'deploy.json'));f.platform.bootstrap=bootstrap;
 const restored=await invoke({...f.request,action:'rollback',release:undefined},f.platform);
 assert.equal(restored.passed,true);assert.equal(restored.artifactId,f.previous.id);assert.deepEqual(await readFile(join(f.request.transactionDirectory,'deploy.json')),prior);
 assert.equal(await realpath(join(f.deploy,'current')),join(f.deploy,'releases',f.previous.releaseId));assert.equal(f.calls.filter(call=>call==='bootout').length,2);
});

test('explicit rollback recognizes an unchanged healthy predecessor after an unknown deployment without stopping it',async t=>{
 const f=await fixture(t),bootout=f.platform.bootout;f.platform.bootout=async()=>{throw Error('fixture lost native stop transport before stop');};
 const interrupted=await invoke(f.request,f.platform);assert.equal(interrupted.outcome,'unknown');f.platform.bootout=bootout;
 const prior=await readFile(join(f.request.transactionDirectory,'deploy.json')),before=await f.stableData();
 const restored=await invoke({...f.request,action:'rollback'},f.platform);
 assert.equal(restored.passed,true);assert.equal(restored.artifactId,f.previous.id);assert.equal(restored.mutationAttempted,false);assert.equal(f.calls.includes('bootout'),false);assert.deepEqual(await f.stableData(),before);assert.deepEqual(await readFile(join(f.request.transactionDirectory,'deploy.json')),prior);
});

test('an unknown rollback retries only with a fresh exact-candidate journal reconciliation and preserves the prior attempt',async t=>{
 const f=await fixture(t);await invoke(f.request,f.platform);const bootout=f.platform.bootout;
 f.platform.bootout=async()=>{throw Error('fixture interrupted rollback before native stop');};
 const interrupted=await invoke({...f.request,action:'rollback'},f.platform);assert.equal(interrupted.outcome,'unknown');
 const prior=await readFile(join(f.request.transactionDirectory,'rollback.json'));f.platform.bootout=bootout;
 const blocked=await invoke({...f.request,action:'rollback'},f.platform);assert.equal(blocked.outcome,'unknown');assert.deepEqual(await readFile(join(f.request.transactionDirectory,'rollback.json')),prior);
 const inspection=await invoke({...f.request,action:'inspect-transaction',inspectionArtifact:f.candidate},f.platform);assert.equal(inspection.passed,true);
 const rollbackReconciliation=await reconciliation(f,inspection),restored=await invoke({...f.request,action:'rollback',rollbackReconciliation},f.platform);
 assert.equal(restored.passed,true);assert.equal(restored.artifactId,f.previous.id);assert.equal(await realpath(join(f.deploy,'current')),join(f.deploy,'releases',f.previous.releaseId));
 const entries=await readdir(f.request.transactionDirectory);assert(entries.includes('rollback.attempt-1.json'));assert.deepEqual(await readFile(join(f.request.transactionDirectory,'rollback.attempt-1.json')),prior);
 assert(entries.includes('capture-rollback'));assert(entries.includes('capture-rollback-2'));
});

test('stale rollback journal proof cannot authorize another native transition',async t=>{
 const f=await fixture(t);await invoke(f.request,f.platform);const bootout=f.platform.bootout;
 f.platform.bootout=async()=>{throw Error('fixture interrupted rollback');};await invoke({...f.request,action:'rollback'},f.platform);f.platform.bootout=bootout;
 const inspection=await invoke({...f.request,action:'inspect-transaction',inspectionArtifact:f.candidate},f.platform),rollbackReconciliation=await reconciliation(f,inspection);
 assert.equal(inspection.passed,true);
 const path=join(f.request.transactionDirectory,'rollback.json'),marker=JSON.parse(await readFile(path,'utf8'));marker.observedLater=true;await put(path,JSON.stringify(marker)+'\n');const prior=await readFile(path);
 const refused=await invoke({...f.request,action:'rollback',rollbackReconciliation},f.platform);
 assert.equal(refused.passed,false);assert.equal(refused.outcome,'unknown');assert.deepEqual(await readFile(path),prior);assert.equal(f.calls.filter(call=>call==='bootout').length,1);
});

test('transaction inspection distinguishes an already restored healthy predecessor from mixed code',async t=>{
 const f=await fixture(t);await invoke(f.request,f.platform);const bootstrap=f.platform.bootstrap;
 f.platform.bootstrap=async()=>{await bootstrap();throw Error('fixture lost rollback completion');};await invoke({...f.request,action:'rollback'},f.platform);f.platform.bootstrap=bootstrap;
 const prior=await readFile(join(f.request.transactionDirectory,'rollback.json'));
 const inspected=await invoke({...f.request,action:'inspect-transaction',inspectionArtifact:f.previous},f.platform);assert.equal(inspected.passed,true);assert.deepEqual(inspected.artifact,f.previous);
 await writeFile(join(f.deploy,'releases',f.previous.releaseId,'app/server.js'),'mixed code bytes');
 const mixed=await invoke({...f.request,action:'inspect-transaction',inspectionArtifact:f.previous},f.platform);assert.equal(mixed.passed,false);assert.deepEqual(await readFile(join(f.request.transactionDirectory,'rollback.json')),prior);
 assert.equal(f.calls.filter(call=>call==='bootout').length,2);
});

test('a proven pre-stop transient health deferral reuses staged code without a second deployment attempt',async t=>{
 const f=await fixture(t),health=f.platform.health;f.platform.health=async()=>({ok:false,status:503});
 const deferred=await invoke(f.request,f.platform);assert.equal(deferred.outcome,'not-started');assert.equal(deferred.retryable,true);assert.equal(f.calls.includes('bootout'),false);
 f.platform.health=health;const completed=await invoke(f.request,f.platform);
 assert.equal(completed.passed,true);assert.equal(f.calls.filter(call=>call==='bootout').length,1);assert.equal(await exists(join(f.request.transactionDirectory,'deploy.attempt-1.json')),true);
});

test('deploy retries an incomplete Estimate stage in a fresh temporary directory and preserves the failed stage',async t=>{
 const f=await fixture(t),before=await f.stableData(),fs=(await import('node:fs/promises')).default,{syncBuiltinESMExports}=await import('node:module'),mkdir=fs.mkdir,stages=[];let interrupted=false;
 fs.mkdir=async(path,...args)=>{
  const result=await mkdir(path,...args);
  if(path.startsWith(join(f.deploy,'releases')+'/')&&path.endsWith('.staging'))stages.push(path);
  if(path.endsWith('.staging/app')&&!interrupted){interrupted=true;await writeFile(join(path,'partial-code'),'preserve incomplete stage');throw Object.assign(Error('synthetic copy interruption'),{code:'EIO'});}
  return result;
 };
 syncBuiltinESMExports();
 try {
  const first=await invoke(f.request,f.platform);assert.equal(first.passed,false);assert.equal(first.outcome,'not-started');assert.equal(first.safe,true);
  assert.equal(stages.length,1);assert.equal(await realpath(join(f.deploy,'current')),join(f.deploy,'releases',f.previous.releaseId));assert.equal(f.calls.includes('bootout'),false);
  const journal=await readFile(join(f.request.transactionDirectory,'deploy.json')),partial=join(stages[0],'app/partial-code'),info=await lstat(partial);
  const second=await invoke(f.request,f.platform);assert.equal(second.passed,true,JSON.stringify(second));assert.equal(stages.length,2);assert.notEqual(stages[0],stages[1]);
  assert.equal(await readFile(partial,'utf8'),'preserve incomplete stage');assert.equal((await lstat(partial)).ino,info.ino);assert.equal(await exists(stages[1]),false);
  assert.deepEqual(await readFile(join(f.request.transactionDirectory,'deploy.attempt-1.json')),journal);assert.deepEqual(await f.stableData(),before);
  assert.equal(await realpath(join(f.deploy,'current')),join(f.deploy,'releases',f.candidate.releaseId));assert.equal(f.calls.filter(call=>call==='bootout').length,1);
 }finally{fs.mkdir=mkdir;syncBuiltinESMExports();}
});

function wireHTTP(f,reply) {
 const identity=f.platform.identity;
 // Port 1 is deliberately forbidden by fetch, so a missing injection cannot
 // contact the real Estimate service while exercising a regression.
 const platform=native.createEstimatePlatform({port:1},{fetchImpl:async url=>{
  const path=new URL(url).pathname,response=await reply(path);
  return response??new Response(path==='/api/health'?'{"ok":true}':JSON.stringify(await identity()),{status:200,headers:{'cache-control':'no-store'}});
 }});
 f.platform.health=platform.health;f.platform.identity=platform.identity;
}
const endpoint=kind=>kind==='health'?'/api/health':'/.well-known/naeil-ui.json';

for(const kind of ['health','identity'])for(const status of [403,408,429,500,503])test(`${kind} HTTP ${status} defers before native mutation with its status retained`,async t=>{
 const f=await fixture(t);wireHTTP(f,path=>path===endpoint(kind)?new Response('private-response-marker',{status}):undefined);
 const result=await invoke(f.request,f.platform);
 assert.equal(result.passed,false);assert.equal(result.outcome,'not-started');assert.equal(result.safe,true);assert.equal(result.retryable,true);assert.equal(result.status,status);assert.equal(result.stage,`native-${kind}-http`);
 assert.equal(f.calls.includes('bootout'),false);assert.equal(JSON.stringify(result).includes('private-response-marker'),false);
 const marker=JSON.parse(await readFile(join(f.request.transactionDirectory,'deploy.json'),'utf8'));assert.equal(marker.result.status,status);assert.equal(marker.status,'not-started');
});

for(const kind of ['health','identity'])for(const failure of ['reset','abort'])test(`${kind} response body ${failure} remains retryable with bounded transport diagnostics`,async t=>{
 const f=await fixture(t),error=failure==='abort'?new DOMException('private-response-marker','AbortError'):Object.assign(new Error('private-response-marker'),{code:'ECONNRESET'});
 wireHTTP(f,path=>path===endpoint(kind)?new Response(new ReadableStream({start(controller){controller.error(error);}}),{status:200,headers:{'cache-control':'no-store'}}):undefined);
 const result=await invoke(f.request,f.platform);
 assert.equal(result.outcome,'not-started');assert.equal(result.safe,true);assert.equal(result.retryable,true);assert.equal(result.status,200);assert.equal(result.timeout===true,failure==='abort');assert.equal(result.stage,`native-${kind}-http`);
 assert.equal(result.reasonCode,'native-http-body-unavailable');assert.equal(f.calls.includes('bootout'),false);assert.equal(JSON.stringify(result).includes('private-response-marker'),false);
});

for(const kind of ['health','identity'])test(`${kind} request timeout is retained without its private transport error`,async t=>{
 const f=await fixture(t);wireHTTP(f,path=>{if(path===endpoint(kind))throw new DOMException('private-request-marker','TimeoutError');});
 const result=await invoke(f.request,f.platform);
 assert.equal(result.outcome,'not-started');assert.equal(result.retryable,true);assert.equal(result.timeout,true);assert.equal(result.stage,`native-${kind}-http`);assert.equal(JSON.stringify(result).includes('private-request-marker'),false);assert.equal(f.calls.includes('bootout'),false);
});

for(const kind of ['health','identity'])test(`${kind} HTTP 401 is held with its authentication status`,async t=>{
 const f=await fixture(t);wireHTTP(f,path=>path===endpoint(kind)?new Response('private-auth-marker',{status:401}):undefined);
 const result=await invoke(f.request,f.platform);
 assert.equal(result.outcome,'not-started');assert.equal(result.safe,true);assert.equal(result.retryable,false);assert.equal(result.status,401);assert.equal(f.calls.includes('bootout'),false);assert.equal(JSON.stringify(result).includes('private-auth-marker'),false);
});

for(const kind of ['health','identity'])for(const invalid of ['json','oversize'])test(`${kind} ${invalid} contract failure is held without a transient retry`,async t=>{
 const f=await fixture(t),body=invalid==='json'?'private-invalid-json-marker':' '.repeat(4097);
 wireHTTP(f,path=>path===endpoint(kind)?new Response(body,{status:200,headers:{'cache-control':'no-store'}}):undefined);
 const result=await invoke(f.request,f.platform);
 assert.equal(result.outcome,'not-started');assert.equal(result.safe,true);assert.equal(result.retryable,false);assert.equal(result.status,200);assert.equal(result.reasonCode,'native-public-response-invalid');assert.equal(f.calls.includes('bootout'),false);assert.equal(JSON.stringify(result).includes('private-invalid-json-marker'),false);
});

for(const invalid of ['health','cache','identity'])test(`${invalid} identity contract mismatch remains held`,async t=>{
 const f=await fixture(t),identity=await f.platform.identity();wireHTTP(f,path=>{
  if(invalid==='health'&&path==='/api/health')return new Response('{"ok":false}',{status:200});
  if(path==='/.well-known/naeil-ui.json'&&invalid!=='health')return new Response(JSON.stringify(invalid==='identity'?{...identity,artifactId:'wrong-artifact'}:identity),{status:200,headers:invalid==='cache'?{}:{'cache-control':'no-store'}});
 });
 const result=await invoke(f.request,f.platform);
 assert.equal(result.outcome,'not-started');assert.equal(result.safe,true);assert.equal(result.retryable,false);assert.equal(f.calls.includes('bootout'),false);
});

for(const kind of ['health','identity'])for(const failure of ['status','body'])test(`${kind} ${failure} failure after bootstrap remains unknown and cannot replay`,async t=>{
 const f=await fixture(t),bootstrap=f.platform.bootstrap;let bootstrapped=false;
 f.platform.bootstrap=async()=>{await bootstrap();bootstrapped=true;};
 wireHTTP(f,path=>{
  if(!bootstrapped||path!==endpoint(kind))return;
  return failure==='status'?new Response('private-response-marker',{status:503}):new Response(new ReadableStream({start(controller){controller.error(new DOMException('private-response-marker','AbortError'));}}),{status:200,headers:{'cache-control':'no-store'}});
 });
 const result=await invoke(f.request,f.platform);
 assert.equal(result.outcome,'unknown');assert.equal(result.safe,false);assert.equal(result.retryable,false);assert.equal(result.status,failure==='status'?503:200);assert.equal(result.timeout===true,failure==='body');assert.equal(result.stage,`native-${kind}-http`);
 const marker=JSON.parse(await readFile(join(f.request.transactionDirectory,'deploy.json'),'utf8'));assert.equal(marker.status,'unknown');assert.equal(marker.result.status,result.status);assert.equal(marker.result.timeout,result.timeout);
 const duplicate=await invoke(f.request,f.platform);assert.equal(duplicate.reasonCode,'native-operation-unresolved');assert.equal(f.calls.filter(call=>call==='bootout').length,1);assert.equal(JSON.stringify(result).includes('private-response-marker'),false);
});

for(const action of['deploy','rollback'])test(`a live ${action} journal owner prevents inspection and rollback without changing its evidence`,async t=>{
 const f=await fixture(t);
 if(action==='rollback') {
  await invoke(f.request,f.platform);const bootout=f.platform.bootout;f.platform.bootout=async()=>{throw Error('fixture unknown rollback');};await invoke({...f.request,action:'rollback'},f.platform);f.platform.bootout=bootout;
 }else{
  const bootstrap=f.platform.bootstrap;f.platform.bootstrap=async()=>{await bootstrap();throw Error('fixture unknown deploy');};await invoke(f.request,f.platform);f.platform.bootstrap=bootstrap;
 }
 const child=spawn(process.execPath,['-e',"process.stdout.write('ready\\n');setInterval(()=>{},1000)"],{stdio:['ignore','pipe','pipe']});
 t.after(()=>{if(child.exitCode===null)child.kill('SIGKILL');});await once(child.stdout,'data');
 const path=join(f.request.transactionDirectory,action+'.json'),marker=JSON.parse(await readFile(path,'utf8'));marker.ownerPid=child.pid;await put(path,JSON.stringify(marker)+'\n');const before=await readFile(path);
 const inspection=await invoke({...f.request,action:'inspect-transaction',inspectionArtifact:f.candidate},f.platform),rollback=await invoke({...f.request,action:'rollback'},f.platform);
 assert.equal(inspection.outcome,'unknown');assert.equal(rollback.outcome,'unknown');assert.deepEqual(await readFile(path),before);assert.equal(f.calls.filter(call=>call==='bootout').length,1);
 child.kill('SIGKILL');await once(child,'exit');
});

test('the core recovers a real interrupted native owner then reconciles the exact candidate before explicit rollback',async t=>{
 const f=await fixture(t),core=await import('./local-runner.mjs'),runtime=await import('./local-runtime.mjs');
 const plan={schemaVersion:1,release:{releaseId:f.request.release.releaseId,version:'0.7.3',sourceRevision:f.candidate.sourceRevision,archive:{path:f.candidate.path,sha256:f.candidate.sha256}},services:[{id:'estimate',mode:'deploy',currentArtifact:f.previous,prepared:{previousArtifact:f.previous,candidateArtifact:f.candidate,consumerInputsSha256:'6'.repeat(64)}}]};
 const config={plan,stateDirectory:join(f.root,'core-state'),lockFile:join(f.root,'machine.lock'),stopFile:join(f.root,'STOP'),approvalFile:join(f.root,'approval.json')};await put(config.approvalFile,JSON.stringify(core.approvalFor(plan)));
 const requestFor=(action,context)=>({...f.request,action,planSha256:core.planDigest(plan),attemptId:context.transaction?.id??'inspect-only',idempotencyKey:'local-'+(context.transaction?.id??'inspect-only'),transactionDirectory:join(f.state,'transaction-'+(context.transaction?.id??'inspect-only')),artifact:action==='inspect'?(context.transaction?.native?.operation==='deploy'&&context.transaction.native.status==='complete'?f.candidate:f.previous):f.candidate,inspectionArtifact:context.transaction?.inspectionArtifact,...(context.transaction?.rollbackReconciliation?{rollbackReconciliation:{path:join(context.directory,context.transaction.rollbackReconciliation.path),sha256:context.transaction.rollbackReconciliation.sha256}}:{})});
 const deps={
  validateRelease:async()=>({passed:true}),prepare:async()=>({candidateArtifact:f.candidate,consumerInputsSha256:'6'.repeat(64)}),verify:async()=>({passed:true}),
  inspect:async context=>{const action=context.transaction?.inspectionArtifact?'inspect-transaction':'inspect',receipt=await invoke(requestFor(action,context),f.platform);assert.equal(receipt.passed,true);return {artifact:context.transaction?.inspectionArtifact??requestFor(action,context).artifact,receipt};},
  deploy:async context=>{const receipt=await invoke(requestFor('deploy',context),f.platform);assert.equal(receipt.passed,true);return {outcome:'completed',artifact:f.candidate,receipt};},
  rollback:async context=>{const receipt=await invoke(requestFor('rollback',context),f.platform);assert.equal(receipt.passed,true);return {outcome:'completed',artifact:f.previous,receipt};},
 };
 const deployed=await core.runLocal(config,deps),id=deployed.services.estimate.transactionId;assert.equal(deployed.status,'production-verified');
 const nativeURL=pathToFileURL(join(import.meta.dirname,'estimate-native.mjs')).href,coreURL=pathToFileURL(join(import.meta.dirname,'local-runner.mjs')).href;
 const childRequest=requestFor('rollback',{transaction:{id}}),childScript=`import{runLocal}from${JSON.stringify(coreURL)};import{runEstimateNative}from${JSON.stringify(nativeURL)};import{readFile,realpath}from'node:fs/promises';import{join}from'node:path';const request=${JSON.stringify(childRequest)},config=${JSON.stringify(config)},platform={probe:async()=>{const pid=JSON.parse(await readFile(join(request.config.dataDirectory,'.estimate.lock.json'),'utf8')).pid;return{job:{pid,label:request.config.label},process:{pid,uid:request.config.uid,executable:request.config.nodePath,cwd:join(await realpath(join(request.config.deploymentRoot,'current')),'app'),start:'fixture-process-'+pid},listeners:[pid],oldProcessAlive:true,appPids:[pid]}},health:async()=>true,identity:async()=>JSON.parse(await readFile(join(request.config.deploymentRoot,'current/app/public/.well-known/naeil-ui.json'),'utf8')),bootout:async()=>{process.stdout.write('native-intent\\n');setInterval(()=>{},1000);await new Promise(()=>{})},bootstrap:async()=>{},pause:async()=>{}};await runLocal(config,{rollback:async()=>runEstimateNative(request,platform)},{command:'rollback',transactionId:${JSON.stringify(id)}});`;
 const child=spawn(process.execPath,['--input-type=module','-e',childScript],{stdio:['ignore','pipe','pipe']});t.after(()=>{if(child.exitCode===null)child.kill('SIGKILL');});
 await once(child.stdout,'data');child.kill('SIGKILL');await once(child,'exit');
 const lock=JSON.parse(await readFile(config.lockFile,'utf8'));runtime.recoverMachineLock(config.lockFile,{ownerId:lock.ownerId});
 await unlink(config.approvalFile);await put(config.stopFile,'owner stopped forward work');for(const artifact of[f.previous,f.candidate]){await unlink(artifact.path);await rm(artifact.directory,{recursive:true});}
 const restored=await core.runLocal(config,deps,{command:'rollback',transactionId:id});assert.equal(restored.status,'rolled-back');assert.equal(await exists(config.lockFile),false);assert.equal(await realpath(join(f.deploy,'current')),join(f.deploy,'releases',f.previous.releaseId));
 const journal=JSON.parse(await readFile(join(f.state,'transaction-'+id,'rollback.attempt-1.json'),'utf8'));assert.equal(journal.ownerPid,child.pid);assert.equal(journal.status,'intent');assert.equal(journal.phase,'stop-requested');
});
