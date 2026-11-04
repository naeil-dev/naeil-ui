import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { syntheticJevArchive } from './fixtures/jev-archive.mjs';
import { appendReceipt } from './local-runtime.mjs';

const consumer = await import('./local-consumers.mjs').catch(() => ({}));
const hash = value => createHash('sha256').update(value).digest('hex');
const manifestSha = manifest => hash(JSON.stringify(Object.fromEntries(Object.entries(manifest).sort().map(([key, value]) => [key, Object.fromEntries(Object.entries(value).sort())]))));
function fixture(t) {
 const directory=realpathSync(mkdtempSync(join(tmpdir(),'local-consumers-')));t.after(()=>rmSync(directory,{recursive:true,force:true}));
 return directory;
}
function artifact(directory,id,version) {
 const identity={schemaVersion:1,appId:'jev',artifactId:id,sourceRevision:(id==='before'?'a':'b').repeat(40),ui:{version,contractVersion:'1'}};
 const {bytes,manifest}=syntheticJevArchive(identity),path=join(directory,hash(bytes)+'.tar.gz'),manifestPath=join(directory,id+'.json');
 writeFileSync(path,bytes,{mode:0o600});writeFileSync(manifestPath,JSON.stringify(manifest),{mode:0o600});
 return {immutable:true,id,sourceRevision:identity.sourceRevision,ui:identity.ui,sha256:hash(bytes),path,storageRef:pathToFileURL(path).href,manifestPath,manifestSha256:manifestSha(manifest),buildId:'synthetic-build',packageSha256:'c'.repeat(64)};
}
test('verification-only services reuse their imported identity without entering native deployment',async t=>{
 const directory=fixture(t),artifact={id:'already-deployed',sourceRevision:'a'.repeat(40)};let calls=0;
 assert.equal(typeof consumer.createLocalConsumers,'function');
 const adapters=consumer.createLocalConsumers({native(){calls++;throw Error('Unexpected native invocation');}});
 for(const id of ['naeil','estimate']) {
  const service={id,mode:'verify-only',artifact},ctx={plan:{release:{releaseId:'ui-0.7.2'}},service,directory};
  assert.deepEqual(await adapters.inspect(ctx),{artifact});
  await assert.rejects(()=>adapters.prepare(ctx),error=>error.reasonCode==='verification-only-service');
  await assert.rejects(()=>adapters.deploy(ctx),error=>error.reasonCode==='verification-only-service');
 }
 assert.equal(calls,0);
});
test('Jev artifact inspection binds the retained archive, file manifest and public identity',t=>{
 const directory=fixture(t),before=artifact(directory,'before','0.7.1');
 assert.equal(typeof consumer.assertLocalArtifact,'function');consumer.assertLocalArtifact('jev',before);
 const wrong={...before,buildId:'wrong-build'};assert.throws(()=>consumer.assertLocalArtifact('jev',wrong));
 writeFileSync(before.path,'changed archive');assert.throws(()=>consumer.assertLocalArtifact('jev',before));
});
test('rollback uses only the recorded predecessor and retained native inputs with STOP and no release archive',async t=>{
 const directory=fixture(t),before=artifact(directory,'before','0.7.1'),after=artifact(directory,'after','0.7.2');
 const helperPath=fileURLToPath(new URL('./jev-native.py',import.meta.url)),python=realpathSync(process.execPath);
 const native={pythonExecutable:python,pythonSha256:hash(readFileSync(python)),helper:{path:helperPath,sha256:hash(readFileSync(helperPath))},executionPath:'/usr/bin:/bin',config:{baseDirectory:directory,privateFiles:'metadata-only'}};
 const release={releaseId:'ui-0.7.2',version:'0.7.2',contract:{version:'1'},archive:{path:join(directory,'missing-release.tgz'),sha256:'c'.repeat(64)}};
 const transaction={id:'rollback-1',serviceId:'jev',previousArtifact:before,candidateArtifact:after,prepared:{native,release,planSha256:'d'.repeat(64),service:{id:'jev'}},native:{operation:'rollback',status:'intent'}};
 writeFileSync(join(directory,'STOP'),'stopped',{mode:0o600});unlinkSync(after.path);let request;
 assert.equal(typeof consumer.createLocalConsumers,'function');
 const adapters=consumer.createLocalConsumers({native(action,input){assert.equal(action,'rollback');request=input;return {...Object.fromEntries(['schemaVersion','attemptId','idempotencyKey','planSha256','action'].map(key=>[key,input[key]])),releaseId:release.releaseId,serviceId:'jev',passed:true,safe:true,activated:true};}});
 const result=await adapters.rollback({plan:{},service:{id:'jev',mode:'deploy',consumer:{native:{foreign:true}}},transaction,directory});
 assert.equal(result.outcome,'completed');assert.deepEqual(result.artifact,before);assert.deepEqual(request.previousArtifact,before);assert.deepEqual(request.config,native.config);
 assert(!Object.hasOwn(request,'policy'));assert(!Object.hasOwn(request,'approval'));
});
test('native receipts reject every missing or foreign action binding before accepting inspect or rollback',async t=>{
 const directory=fixture(t),before=artifact(directory,'before','0.7.1'),after=artifact(directory,'after','0.7.2');
 const helper=fileURLToPath(new URL('./jev-native.py',import.meta.url)),python=realpathSync(process.execPath);
 const native={pythonExecutable:python,pythonSha256:hash(readFileSync(python)),helper:{path:helper,sha256:hash(readFileSync(helper))},executionPath:'/usr/bin:/bin',config:{baseDirectory:directory,privateFiles:'metadata-only'}};
 const service={id:'jev',mode:'deploy',currentArtifact:before,consumer:{native}},release={releaseId:'ui-0.7.2'},plan={schemaVersion:1,release,services:[service]};
 const transaction={id:'binding-rollback',serviceId:'jev',previousArtifact:before,candidateArtifact:after,prepared:{native,release,planSha256:'d'.repeat(64),service:{id:'jev'}},native:{operation:'rollback',status:'intent'}};
 const fields=['schemaVersion','releaseId','serviceId','attemptId','idempotencyKey','planSha256','action'];let calls=0;
 for(const action of ['inspect','rollback'])for(const field of fields)for(const mutation of ['missing','foreign']) {
  const adapters=consumer.createLocalConsumers({native(received,input){
   calls++;assert.equal(received,action);
   const response={...Object.fromEntries(['schemaVersion','attemptId','idempotencyKey','planSha256','action'].map(key=>[key,input[key]])),releaseId:input.release.releaseId,serviceId:input.service.id,passed:true,safe:true,activated:true};
   if(mutation==='missing')delete response[field];else response[field]='foreign';return response;
  }});
  const context={plan,service,directory,...(action==='rollback'?{transaction}:{})};
  await assert.rejects(()=>adapters[action](context),error=>error.reasonCode==='native-response-binding-mismatch'&&error.outcome===(action==='inspect'?'not-started':'unknown'));
 }
 assert.equal(calls,2*fields.length*2);
});
test('private native transport registers its process group and inherits only the native environment allowlist',async t=>{
 const directory=fixture(t),before=artifact(directory,'before','0.7.1'),python=realpathSync('/usr/bin/python3'),helper=join(directory,'synthetic-native.py');
 writeFileSync(helper,"import json,os\nassert 'SYNTHETIC_PRIVATE_CANARY' not in os.environ\nr=json.load(open(os.environ['NAEIL_ROLLOUT_INPUT']))\nb={k:r[k] for k in ['schemaVersion','attemptId','idempotencyKey','planSha256','action']}\nb.update(releaseId=r['release']['releaseId'],serviceId=r['service']['id'],passed=True,safe=True)\nf=open(os.environ['NAEIL_ROLLOUT_OUTPUT'],'x');os.chmod(os.environ['NAEIL_ROLLOUT_OUTPUT'],0o600);json.dump(b,f);f.close()\n",{mode:0o600});
 const native={pythonExecutable:python,pythonSha256:hash(readFileSync(python)),helper:{path:helper,sha256:hash(readFileSync(helper))},executionPath:'/usr/bin:/bin',config:{baseDirectory:directory,privateFiles:'metadata-only'}};
 const service={id:'jev',mode:'deploy',currentArtifact:before,consumer:{native}},plan={schemaVersion:1,release:{releaseId:'ui-0.7.2'},services:[service]};let registered=0;
 const previous=process.env.SYNTHETIC_PRIVATE_CANARY;process.env.SYNTHETIC_PRIVATE_CANARY='synthetic-private-value';
 try {
  const result=await consumer.createLocalConsumers().inspect({plan,service,directory,registerChild(child,options){assert(Number.isInteger(child.pid));assert.deepEqual(options,{processGroup:true});registered++;}});
  assert.deepEqual(result,{artifact:before});assert.equal(registered,1);
 }finally{if(previous===undefined)delete process.env.SYNTHETIC_PRIVATE_CANARY;else process.env.SYNTHETIC_PRIVATE_CANARY=previous;}
});

function nativeFixture(t,source=fileURLToPath(new URL('./jev-native.py',import.meta.url))) {
 const directory=fixture(t),before=artifact(directory,'before','0.7.1'),after=artifact(directory,'after','0.7.2'),python=realpathSync('/usr/bin/python3'),helper=join(directory,'fixture-native.py'),planSha256='d'.repeat(64);
 const moduleSource=`import importlib.util,json,os,sys,sqlite3\nfrom pathlib import Path\nfrom types import SimpleNamespace\nsys.dont_write_bytecode=True\nspec=importlib.util.spec_from_file_location('actual_native',${JSON.stringify(source)})\nn=importlib.util.module_from_spec(spec);spec.loader.exec_module(n)\nroot=Path(__file__).parent\nif len(sys.argv)>1:\n r=json.load(open(sys.argv[1]));base=root/'runtime';base.mkdir(mode=0o700);(base/'releases').mkdir(mode=0o700)\n n.extract_code(Path(r['previousArtifact']['path']),base/'app',n.artifact_manifest(r['previousArtifact']))\n env=base/'server.env';env.write_text('opaque fixture; never read');env.chmod(0o600)\n password=base/'password.json';password.write_text('opaque fixture; never read');password.chmod(0o600)\n db=base/'state.sqlite';c=sqlite3.connect(db);c.execute('CREATE TABLE leases(id TEXT)');c.commit();c.close();db.chmod(0o600)\n retained=base/'releases/original';(retained/'previous-app').mkdir(parents=True)\n identity=lambda p:[p.stat().st_dev,p.stat().st_ino,p.stat().st_mode&0o777,p.stat().st_uid]\n cfg={'baseDirectory':str(base),'plistPath':str(root/'jev.plist'),'nodeExecutable':'/synthetic/node','nodeVersion':'v22.23.2','label':'dev.naeil.jev','port':2466,'appOrigin':'https://jev.naeil.dev','databasePath':str(db),'envPath':str(env),'passwordPath':str(password),'envKeys':['NAEIL_SUPABASE_URL','NAEIL_SUPABASE_ANON_KEY','APP_ORIGIN','JEV_DATA_DB'],'envMetadata':n.file_metadata(env),'passwordMetadata':n.file_metadata(password),'preserveDirectories':[str(retained),str(retained/'previous-app')],'databaseIdentity':identity(db),'preserveDirectoryIdentities':{str(p):identity(p) for p in [retained,retained/'previous-app']},'privateFiles':'metadata-only'}\n import plistlib\n plist=Path(cfg['plistPath']);plist.write_bytes(plistlib.dumps({'Label':cfg['label'],'ProgramArguments':[cfg['nodeExecutable'],'--env-file='+str(env),str(base/'app/server.js')],'WorkingDirectory':str(base/'app'),'KeepAlive':True}));cfg['plistSha256']=n.sha(plist.read_bytes())\n n.write_private(root/'config.json',cfg);sys.exit(0)\nclass Platform(n.Native):\n def command(self,args):return SimpleNamespace(returncode=0,stdout=self.config['nodeVersion'])\n def ownership(self):return 123\n def idle(self):\n  if (root/'BUSY').exists():raise n.Deferred('fixture-busy')\n def preflight(self):self.static()\n def stop(self,**kwargs):\n  with open(root/'events','a') as f:f.write('stop\\n')\n def start(self):\n  self.static()\n  with open(root/'events','a') as f:f.write('start\\n')\n def health(self,identity):n.require(not (root/'UNHEALTHY').exists() or (root/'UNHEALTHY').read_text()!=identity['artifactId'],'fixture-unhealthy');n.require(json.loads((self.app/'public/.well-known/naeil-ui.json').read_text())==identity,'fixture-identity')\n def ensure_running(self,identity):self.health(identity)\nn.Native=Platform\nn.main()\n`;
 writeFileSync(helper,moduleSource,{mode:0o600});const init=join(directory,'init.json');writeFileSync(init,JSON.stringify({previousArtifact:before}),{mode:0o600});
 execFileSync(python,['-B',helper,init],{env:{PATH:'/usr/bin:/bin',PYTHONDONTWRITEBYTECODE:'1'},timeout:10000});
 const config=JSON.parse(readFileSync(join(directory,'config.json'))),native={pythonExecutable:python,pythonSha256:hash(readFileSync(python)),helper:{path:helper,sha256:hash(readFileSync(helper))},executionPath:'/usr/bin:/bin',config};
 const archive=join(directory,'ui.tgz'),chrome=join(directory,'chrome.json');writeFileSync(archive,'frozen ui',{mode:0o600});writeFileSync(chrome,'chrome',{mode:0o600});after.packageSha256=hash(readFileSync(archive));
 const release={releaseId:'ui-0.7.2',version:'0.7.2',previousVersion:'0.7.1',archive:{path:archive,sha256:after.packageSha256},contract:{version:'1',path:chrome,sha256:hash(readFileSync(chrome))}},transaction={id:'native-integration',serviceId:'jev',previousArtifact:before,candidateArtifact:after,prepared:{native,release,planSha256,service:{id:'jev'}},native:{operation:'rollback',status:'intent'}};
 const request={schemaVersion:1,mode:'local',action:'deploy',planSha256,release,service:{id:'jev'},attemptId:transaction.id,idempotencyKey:`local-${planSha256}-jev-${transaction.id}`,config,artifact:after,previousArtifact:before,transactionDirectory:join(config.baseDirectory,'releases','ui-'+transaction.id)};
 const initialInput=join(directory,'deploy.json'),initialOutput=join(directory,'deploy-output.json');writeFileSync(initialInput,JSON.stringify(request),{mode:0o600});
 execFileSync(python,['-B',helper],{env:{PATH:'/usr/bin:/bin',PYTHONDONTWRITEBYTECODE:'1',NAEIL_ROLLOUT_INPUT:initialInput,NAEIL_ROLLOUT_OUTPUT:initialOutput},timeout:10000});assert.equal(JSON.parse(readFileSync(initialOutput)).passed,true);
 return {directory,before,after,request,transaction,adapters:consumer.createLocalConsumers(),context:{plan:{},service:{id:'jev',mode:'deploy'},transaction,directory},events:()=>readFileSync(join(directory,'events'),'utf8').trim().split('\n')};
}
test('real native rollback retries a busy attempt with fresh backups',async t=>{
 const f=nativeFixture(t);writeFileSync(join(f.directory,'BUSY'),'busy',{mode:0o600});
 await assert.rejects(()=>f.adapters.rollback(f.context),error=>error.outcome==='not-started'&&error.reasonCode==='native-busy');
 const old=readFileSync(join(f.request.transactionDirectory,'rollback/transaction.json'));
 unlinkSync(join(f.directory,'BUSY'));const result=await f.adapters.rollback(f.context);assert.equal(result.outcome,'completed');assert.deepEqual(result.artifact,f.before);
 assert.deepEqual(readFileSync(join(f.request.transactionDirectory,'rollback/transaction.json')),old);assert.deepEqual(f.events(),['stop','start','stop','start']);
});
test('real native recovery inspection and explicit unknown rollback use only bound transaction evidence',async t=>{
 const f=nativeFixture(t);writeFileSync(join(f.directory,'BUSY'),'busy',{mode:0o600});await assert.rejects(()=>f.adapters.rollback(f.context));unlinkSync(join(f.directory,'BUSY'));
 const journal=join(f.request.transactionDirectory,'rollback/transaction.json'),unknown={...JSON.parse(readFileSync(journal)),phase:'uncertain'};writeFileSync(journal,JSON.stringify(unknown),{mode:0o600});const original=readFileSync(journal);
 for(const artifact of [f.before,f.after]){unlinkSync(artifact.path);unlinkSync(artifact.manifestPath);}
 unlinkSync(f.request.release.archive.path);unlinkSync(f.request.release.contract.path);writeFileSync(join(f.directory,'STOP'),'stopped',{mode:0o600});
 const ctx={...f.context,transaction:{...f.transaction,inspectionArtifact:f.after}},inspected=await f.adapters.inspect(ctx);assert.deepEqual(inspected.artifact,f.after);assert.equal(inspected.receipt.action,'inspect-transaction');
 const receipt=appendReceipt(f.directory,{kind:'rollback-reconciliation',stage:'rollback-inspect',status:'observed',planSha256:f.transaction.prepared.planSha256,releaseId:'ui-0.7.2',serviceId:'jev',transactionId:f.transaction.id,artifact:f.after,nativeInspection:inspected.receipt});
 const result=await f.adapters.rollback({...f.context,transaction:{...f.transaction,rollbackReconciliation:receipt}});assert.equal(result.outcome,'completed');assert.deepEqual(result.artifact,f.before);assert.deepEqual(readFileSync(journal),original);assert.deepEqual(f.events(),['stop','start','stop','start']);
 const restored=await f.adapters.inspect({...ctx,transaction:{...f.transaction,inspectionArtifact:f.before}});assert.deepEqual(restored.artifact,f.before);
 await assert.rejects(()=>f.adapters.inspect({...ctx,transaction:{...f.transaction,inspectionArtifact:{...f.after,id:'foreign'}}}),error=>error.reasonCode==='recovery-inspection-artifact-mismatch');
});

test('interrupted deployment with a running candidate reconciles into exact predecessor rollback without archives',async t=>{
 const f=nativeFixture(t),journal=join(f.request.transactionDirectory,'transaction.json');
 writeFileSync(journal,JSON.stringify({...JSON.parse(readFileSync(journal)),phase:'starting'}),{mode:0o600});
 const original=readFileSync(journal),beforeEvents=f.events();
 for(const artifact of [f.before,f.after]){unlinkSync(artifact.path);unlinkSync(artifact.manifestPath);}
 unlinkSync(f.request.release.archive.path);unlinkSync(f.request.release.contract.path);writeFileSync(join(f.directory,'STOP'),'stopped',{mode:0o600});
 await assert.rejects(()=>f.adapters.rollback(f.context),error=>error.outcome==='unknown');assert.deepEqual(f.events(),beforeEvents);
 const tx={...f.transaction,native:{operation:'deploy',status:'intent'}};
 await assert.rejects(()=>f.adapters.inspect({...f.context,transaction:{...tx,inspectionArtifact:f.before}}));
 const inspected=await f.adapters.inspect({...f.context,transaction:{...tx,inspectionArtifact:f.after}});
 const receipt=appendReceipt(f.directory,{kind:'rollback-reconciliation',stage:'rollback-inspect',status:'observed',planSha256:tx.prepared.planSha256,releaseId:'ui-0.7.2',serviceId:'jev',transactionId:tx.id,artifact:f.after,nativeInspection:inspected.receipt});
 const result=await f.adapters.rollback({...f.context,transaction:{...f.transaction,rollbackReconciliation:receipt}});
 assert.equal(result.outcome,'completed');assert.deepEqual(result.artifact,f.before);
 assert.deepEqual(readFileSync(join(f.request.transactionDirectory,`deploy-uncertain-${hash(original)}.json`)),original);
 assert.deepEqual(f.events(),['stop','start','stop','start']);
});

test('Estimate rollback uses retained Node helper and transaction directory without source or archive access',async t=>{
 const directory=fixture(t),node=realpathSync(process.execPath),helper=join(directory,'estimate-fixture.mjs'),stateDirectory=join(directory,'native-state');mkdirSync(stateDirectory,{mode:0o700});
 writeFileSync(helper,`import assert from 'node:assert/strict';import fs from 'node:fs';import {join} from 'node:path';const r=JSON.parse(fs.readFileSync(process.env.NAEIL_ROLLOUT_INPUT));assert.equal(r.service.id,'estimate');assert.equal(r.action,'rollback');assert.equal(r.transactionDirectory,join(r.config.stateDirectory,r.attemptId));assert.equal(process.cwd(),r.config.deploymentRoot);assert.equal(process.env.NODE_OPTIONS,'');assert.equal(process.env.SYNTHETIC_PRIVATE_CANARY,undefined);for(const key of ['approval','policy'])assert.equal(r[key],undefined);fs.writeFileSync(process.env.NAEIL_ROLLOUT_OUTPUT,JSON.stringify({schemaVersion:1,releaseId:r.release.releaseId,serviceId:r.service.id,attemptId:r.attemptId,idempotencyKey:r.idempotencyKey,planSha256:r.planSha256,action:r.action,passed:true,safe:true,activated:true}),{mode:0o600,flag:'wx'});`,{mode:0o600});
 const before={immutable:true,id:'estimate-before',sourceRevision:'a'.repeat(40),sha256:'b'.repeat(64),packageSha256:'c'.repeat(64)},after={...before,id:'estimate-after'};
 const native={nodeExecutable:node,nodeSha256:hash(readFileSync(node)),helper:{path:helper,sha256:hash(readFileSync(helper))},executionPath:'/usr/bin:/bin',config:{deploymentRoot:directory,stateDirectory,privateFiles:'metadata-only'}};
 const transaction={id:'estimate-transaction',serviceId:'estimate',previousArtifact:before,candidateArtifact:after,prepared:{native,release:{releaseId:'ui-0.7.3'},planSha256:'d'.repeat(64),service:{id:'estimate'}},native:{operation:'rollback',status:'intent'}};
 let registered=0;const result=await consumer.createLocalConsumers().rollback({plan:{},service:{id:'estimate',mode:'deploy'},transaction,directory,registerChild(child,options){assert(child.pid>0);assert.deepEqual(options,{processGroup:true});registered++;}});
 assert.equal(registered,1);assert.equal(result.outcome,'completed');assert.deepEqual(result.artifact,before);
});

test('native transient and authentication diagnostics reach runner classification without losing the safe boundary',async t=>{
 const directory=fixture(t),before=artifact(directory,'before','0.7.1'),python=realpathSync(process.execPath),helper=fileURLToPath(new URL('./jev-native.py',import.meta.url));
 const native={pythonExecutable:python,pythonSha256:hash(readFileSync(python)),helper:{path:helper,sha256:hash(readFileSync(helper))},executionPath:'/usr/bin:/bin',config:{baseDirectory:directory,privateFiles:'metadata-only'}};
 const service={id:'jev',mode:'deploy',currentArtifact:before,consumer:{native}},plan={schemaVersion:1,release:{releaseId:'ui-0.7.2'},services:[service]};
 const {classifyFailure}=await import('./local-runner.mjs');
 for(const [fields,category]of [[{status:503,retryable:true},'retryable'],[{timeout:true,retryable:true},'retryable'],[{status:401,retryable:false},'auth-required'],[{status:200,retryable:false},'held']]) {
  const adapters=consumer.createLocalConsumers({native(action,input){return {...Object.fromEntries(['schemaVersion','attemptId','idempotencyKey','planSha256','action'].map(key=>[key,input[key]])),releaseId:'ui-0.7.2',serviceId:'jev',passed:false,safe:true,outcome:'not-started',reasonCode:'native-public-identity-unavailable',stage:'native-inspect',...fields};}});
  await assert.rejects(()=>adapters.inspect({plan,service,directory}),error=>{
   const result=classifyFailure(error,'inspect');assert.equal(error.outcome,'not-started');assert.equal(result.category,category);assert.equal(result.failure.stage,'native-inspect');assert.equal(result.failure.status,fields.status??null);assert.equal(result.failure.timeout,fields.timeout===true);return true;
  });
 }
});

test('0.7.2 legacy Jev transactions recover an unhealthy completed candidate only through the pinned reviewed helper',async t=>{
 const legacy=fileURLToPath(new URL('./fixtures/jev-native-adfc995.py',import.meta.url)),current=fileURLToPath(new URL('./jev-native.py',import.meta.url)),legacySha='5eab8ff610b28705113d7e6ebcf9cea6c498510302e459077ceb9dd43f85a843';
 assert.equal(hash(readFileSync(legacy)),legacySha);
 assert.deepEqual(consumer.RECOVERY_HELPERS,{[legacySha]:{path:current,sha256:hash(readFileSync(current))}});
 // The fixture wraps each helper with the same fake platform; the retained wrapper runs the exact legacy bytes.
 const f=nativeFixture(t,legacy),retained=f.transaction.prepared.native.helper;writeFileSync(join(f.directory,'UNHEALTHY'),f.after.id,{mode:0o600});
 const replacement=join(f.directory,'recovery-native.py');writeFileSync(replacement,readFileSync(retained.path,'utf8').replace(JSON.stringify(legacy),JSON.stringify(current)),{mode:0o600});
 const recoveryHelpers={[retained.sha256]:{path:replacement,sha256:hash(readFileSync(replacement))}};
 // A source-only fix does not reach a transaction whose retained legacy helper still runs.
 await assert.rejects(()=>f.adapters.rollback(f.context),error=>error.outcome==='not-started'&&error.reasonCode==='fixture-unhealthy');
 for(const helpers of [{[retained.sha256]:{...recoveryHelpers[retained.sha256],sha256:'0'.repeat(64)}},{['0'.repeat(64)]:recoveryHelpers[retained.sha256]}]) {
  const refused=consumer.createLocalConsumers({recoveryHelpers:helpers});
  await assert.rejects(()=>refused.rollback(f.context),error=>error.outcome==='not-started'&&['native-input-mismatch','fixture-unhealthy'].includes(error.reasonCode));
 }
 const tampered={...f.transaction,previousArtifact:{...f.before,id:'foreign'}};
 await assert.rejects(()=>consumer.createLocalConsumers({recoveryHelpers}).rollback({...f.context,transaction:tampered}),error=>error.outcome!=='completed');
 const result=await consumer.createLocalConsumers({recoveryHelpers}).rollback(f.context);
 assert.equal(result.outcome,'completed');assert.deepEqual(result.artifact,f.before);assert.deepEqual(f.events(),['stop','start','stop','start']);
 const completed=readdirSync(f.directory).filter(name=>name.startsWith('native-rollback-')&&JSON.parse(readFileSync(join(f.directory,name,'output.json'))).passed===true);assert.equal(completed.length,1);
 const input=JSON.parse(readFileSync(join(f.directory,completed[0],'input.json')));
 assert.deepEqual(input.recoveryHelper,{retainedSha256:retained.sha256,sha256:recoveryHelpers[retained.sha256].sha256});
 // Recovery inspection of the restored predecessor also runs through the pinned helper.
 const inspected=await consumer.createLocalConsumers({recoveryHelpers}).inspect({...f.context,transaction:{...f.transaction,inspectionArtifact:f.before}});
 assert.deepEqual(inspected.artifact,f.before);
 const inspection=readdirSync(f.directory).filter(name=>name.startsWith('native-inspect-transaction-'));assert.equal(inspection.length,1);
 assert.deepEqual(JSON.parse(readFileSync(join(f.directory,inspection[0],'input.json'))).recoveryHelper,input.recoveryHelper);
 // Retained helper bytes are never rewritten; the native journal records the rollback.
 assert.equal(hash(readFileSync(retained.path)),retained.sha256);assert.equal(JSON.parse(readFileSync(join(f.request.transactionDirectory,'transaction.json'))).phase,'rolled-back');
});

test('recovered native diagnostics reach the runner through the adapter',async t=>{
 const directory=fixture(t),before=artifact(directory,'before','0.7.1'),after=artifact(directory,'after','0.7.2'),python=realpathSync(process.execPath),helper=fileURLToPath(new URL('./jev-native.py',import.meta.url));
 const native={pythonExecutable:python,pythonSha256:hash(readFileSync(python)),helper:{path:helper,sha256:hash(readFileSync(helper))},executionPath:'/usr/bin:/bin',config:{baseDirectory:directory,privateFiles:'metadata-only'}};
 const transaction={id:'recovered-1',serviceId:'jev',previousArtifact:before,candidateArtifact:after,prepared:{native,release:{releaseId:'ui-0.7.2'},planSha256:'d'.repeat(64),service:{id:'jev'}},native:{operation:'rollback',status:'intent'}};
 const adapters=consumer.createLocalConsumers({recoveryHelpers:{},native(action,input){return {...Object.fromEntries(['schemaVersion','attemptId','idempotencyKey','planSha256','action'].map(key=>[key,input[key]])),releaseId:'ui-0.7.2',serviceId:'jev',passed:false,safe:true,outcome:'failed',recovered:true,artifact:after,phase:'recovered',reasonCode:'native-rollback-recovered',stage:'native-identity-http',status:503,timeout:true,retryable:true};}});
 const result=await adapters.rollback({plan:{},service:{id:'jev',mode:'deploy'},transaction,directory});
 assert.deepEqual([result.outcome,result.stage,result.status,result.timeout,result.retryable],['failed','native-identity-http',503,true,true]);
});
