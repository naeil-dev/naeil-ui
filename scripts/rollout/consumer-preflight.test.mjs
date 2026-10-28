import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { prepareCandidate, runPreflight, assertCandidate, preflightPlanDigest, offlineInstallArgs } from './consumer-preflight.mjs';
import { treeDigest, treeManifest } from './preflight-sandbox.mjs';
import { automationDigest, generationDigest, hash } from './standing-config.mjs';
import { assertDependencyDelta } from './update-consumer.mjs';
import { syntheticArchive } from './fixtures/release.mjs';
import { declaration } from './fixtures/reviewed-expectations.mjs';
import { dependencyLock } from './fixtures/dependency-lock.mjs';
import { createLocalConsumers, localCandidateProof, readLocalCandidate } from './local-consumers.mjs';
import { runLocal, approvalFor, finalizePlan } from './local-runner.mjs';
import { syntheticJevArchive } from './fixtures/jev-archive.mjs';
const node='/Users/jaymini/.local/share/estimate-runtime/node-v24.21.0-darwin-arm64/bin/node';
function setup(t,{update=false,badBuild=false,service='estimate'}={}) {
 const node=service==='estimate'?'/Users/jaymini/.local/share/estimate-runtime/node-v24.21.0-darwin-arm64/bin/node':'/Users/jaymini/.local/share/runtimes/node/v22.23.2/bin/node';
 const root=realpathSync(mkdtempSync(join(tmpdir(),'consumer-preflight-')));let retain=false;t.after(()=>{if(retain)t.diagnostic('Retained unexpected synthetic preflight failure: '+root);else rmSync(root,{recursive:true,force:true});});
 const retainFailure=error=>{retain=true;for(let current=error;current;current=current.cause)t.diagnostic(current.stack||String(current));};
 const source=join(root,'source');mkdirSync(source,{mode:0o700});
 const git=args=>execFileSync('/usr/bin/git',args,{cwd:source,encoding:'utf8',env:{PATH:'/usr/bin:/bin',HOME:process.env.HOME,GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null'}}).trim();
 git(['init','-q','-b','fixture']);git(['config','user.name','Synthetic']);git(['config','user.email','synthetic@example.invalid']);
 mkdirSync(join(source,'vendor'));mkdirSync(join(source,'tests'));mkdirSync(join(source,'scripts'));
 const archive=syntheticArchive('0.7.42','export const synthetic = true;','exact frozen docs');const archivePath=join(root,'frozen.tgz');writeFileSync(archivePath,archive,{mode:0o600});
 const oldVersion=update?'0.7.41':'0.7.42';writeFileSync(join(source,`vendor/naeil-ui-${oldVersion}.tgz`),update?syntheticArchive(oldVersion):archive);
 writeFileSync(join(source,'package.json'),JSON.stringify({name:'synthetic',type:'module',packageManager:'pnpm@10.30.3',dependencies:{'@naeil/ui':`file:vendor/naeil-ui-${oldVersion}.tgz`}}));
 const integrity='sha512-'+(awaitHash512(archive));writeFileSync(join(source,'pnpm-lock.yaml'),dependencyLock(oldVersion,integrity));
 writeFileSync(join(source,'.gitignore'),'node_modules/\nrelease/\n.next/\n');
 writeFileSync(join(source,'playwright.config.ts'),'// synthetic exact harness\n');writeFileSync(join(source,'tests/check.mjs'),'// exact independent test source\n');
 const build=service==='estimate'?`import fs from 'node:fs';import{createHash}from'node:crypto';${badBuild?"fs.writeFileSync('tests/check.mjs','unauthorized');":""}const hash=b=>createHash('sha256').update(b).digest('hex');const sha=process.env.NAEIL_SOURCE_REVISION;const pkg=JSON.parse(fs.readFileSync('package.json'));const identity={schemaVersion:1,appId:'abestimate',artifactId:'synthetic-build',sourceRevision:sha,ui:{version:'0.7.42',contractVersion:'1'}};fs.mkdirSync('release/app/.next',{recursive:true});fs.writeFileSync('release/app/server.js',"import fs from 'node:fs'; if(fs.readFileSync(new URL('identity.json',import.meta.url),'utf8')!==process.env.NAEIL_SOURCE_REVISION)process.exit(2);");fs.writeFileSync('release/app/identity.json',sha);fs.writeFileSync('release/app/.next/BUILD_ID','synthetic-build');const artifacts=Object.fromEntries(['.next/BUILD_ID','identity.json','server.js'].map(path=>[path,hash(fs.readFileSync('release/app/'+path))]));fs.writeFileSync('release/manifest.json',JSON.stringify({schemaVersion:1,releaseId:sha.slice(0,12)+'-'+'1'.repeat(12),node:'v24.21.0',serverPath:'app/server.js',runtimeDataIncluded:false,sourceCommit:sha,buildId:'synthetic-build',uiBuildIdentity:identity,artifactFiles:artifacts,packageVersions:{'@naeil/ui':pkg.dependencies['@naeil/ui']},sourceFiles:{[pkg.dependencies['@naeil/ui'].slice(5)]:hash(fs.readFileSync(pkg.dependencies['@naeil/ui'].slice(5))),'src/server/naeil-shared-session.ts':'a'.repeat(64),'src/server/naeil-auth-client.ts':'b'.repeat(64)}}));`:`import fs from 'node:fs';const dir='.next/standalone';fs.mkdirSync(dir+'/public/.well-known',{recursive:true});fs.mkdirSync(dir+'/.next',{recursive:true});const source=process.env.NAEIL_SOURCE_REVISION;fs.writeFileSync(dir+'/public/.well-known/naeil-ui.json',JSON.stringify({schemaVersion:1,appId:'jev',artifactId:'synthetic-jev',sourceRevision:source,ui:{version:'0.7.42',contractVersion:'1'}}));fs.writeFileSync(dir+'/.next/BUILD_ID','synthetic-build');fs.writeFileSync(dir+'/server.js',"import fs from 'node:fs';if(JSON.parse(fs.readFileSync(new URL('public/.well-known/naeil-ui.json',import.meta.url))).sourceRevision!==process.env.NAEIL_SOURCE_REVISION)process.exit(2)");`;
 writeFileSync(join(source,'scripts/build.mjs'),build);
 writeFileSync(join(source,'scripts/e2e.mjs'),service==='estimate'?`import fs from 'node:fs';import assert from 'node:assert/strict';import {spawnSync} from 'node:child_process';const artifact=process.env.NAEIL_PREFLIGHT_ARTIFACT;assert.equal(fs.readFileSync(artifact+'/app/identity.json','utf8'),process.env.NAEIL_SOURCE_REVISION);assert.throws(()=>fs.writeFileSync(artifact+'/app/identity.json','rebuilt'));const child=spawnSync(process.execPath,[artifact+'/app/server.js'],{env:process.env});assert.equal(child.status,0);`:`import fs from 'node:fs';import assert from 'node:assert/strict';import {dirname}from'node:path';import{spawnSync}from'node:child_process';const artifact=process.env.JEV_TEST_STANDALONE;const receipt=JSON.parse(fs.readFileSync(dirname(artifact)+'/receipt.json'));assert.equal(receipt.sourceRevision,process.env.NAEIL_SOURCE_REVISION);assert.throws(()=>fs.writeFileSync(artifact+'/server.js','rebuilt'));assert.equal(spawnSync(process.execPath,[artifact+'/server.js'],{env:process.env}).status,0);`);
 git(['add','.']);git(['commit','-qm','synthetic reviewed base']);
 const pnpm=join(root,'pnpm.cjs');writeFileSync(pnpm,`const fs=require('fs'),cp=require('child_process');if(process.argv.includes('--version')){console.log('10.30.3');process.exit(0)}if(!process.argv.includes('--ignore-scripts')||!process.argv.includes('--offline'))process.exit(3);const pkg=JSON.parse(fs.readFileSync('package.json'));const version=pkg.dependencies['@naeil/ui'].match(/naeil-ui-(.+)\\.tgz/)[1];fs.writeFileSync('pnpm-lock.yaml',${JSON.stringify(dependencyLock('VERSION',integrity))}.replaceAll('VERSION',version));fs.mkdirSync('node_modules/@naeil/ui/dist',{recursive:true});fs.writeFileSync('node_modules/@naeil/ui/package.json',JSON.stringify({name:'@naeil/ui',version,exports:{'.':'./dist/index.js'}}));fs.writeFileSync('node_modules/@naeil/ui/dist/index.js','export const synthetic = true;');fs.writeFileSync('node_modules/@naeil/ui/README.md','exact frozen docs');`,{mode:0o600});
 const pin=path=>({path,sha256:hash(readFileSync(path)),bytes:readFileSync(path).length});
 const account=join(root,'account.json'),expectations=join(root,'expectations.json');writeFileSync(account,JSON.stringify({schemaVersion:1,kind:'independent-account-render',frozen:true,sourceRevision:'b'.repeat(40),archiveSha256:hash(archive),ui:{version:'0.7.42',contractVersion:'1'},cases:[{render:{uiVersion:'0.7.42'}}]}),{mode:0o600});
 const release={releaseId:'naeil-ui-0.7.42',version:'0.7.42',contractVersion:'1',sourceRevision:'b'.repeat(40),archiveSha256:hash(archive),chromeSha256:'c'.repeat(64),accountSha256:hash(readFileSync(account))};
 writeFileSync(expectations,JSON.stringify(declaration({...release,archive:{sha256:release.archiveSha256},contract:{version:'1',sha256:release.chromeSha256},account:{sha256:release.accountSha256}})),{mode:0o600});
 const fixture=join(root,'fixture.json');writeFileSync(fixture,JSON.stringify({schemaVersion:2,kind:'standing-ui-reference',release,account:pin(account),expectations:pin(expectations),routingProfile:null}),{mode:0o600});
 const executables=Object.fromEntries([node,'/usr/bin/git','/Library/Developer/CommandLineTools/usr/bin/git',realpathSync('/usr/bin/tar'),'/usr/bin/sandbox-exec'].map(p=>[p,hash(readFileSync(p))]));
 const config={schemaVersion:1,node,git:'/Library/Developer/CommandLineTools/usr/bin/git',pnpm:pin(pnpm),executables,readable:[],executionPath:node.slice(0,node.lastIndexOf('/'))+':/usr/bin',network:{},checks:[{name:'unit',file:node,args:['-e','0']},{name:'type',file:node,args:['-e','0']},{name:'lint',file:node,args:['-e','0']},{name:'build',file:node,args:['scripts/build.mjs']},{name:'package',file:node,args:['-e','0']}],artifactRelative:service==='estimate'?'release':'.next/standalone',e2e:{file:node,args:['scripts/e2e.mjs']},smoke:{file:node,args:['-e','0']},...(service==='estimate'?{releaseIntegrity:{file:node,args:['-e',"const assert=require('node:assert/strict'),fs=require('node:fs');assert.equal(process.argv[1],'release');assert.equal(JSON.parse(fs.readFileSync(process.argv[1]+'/manifest.json')).sourceCommit,process.env.NAEIL_SOURCE_REVISION);"]}}:{})};
 const input={schemaVersion:1,service,repository:service==='estimate'?'naeil-dev/abestimate':'naeil-dev/jev',sourceRoot:source,reviewedBaseSha:git(['rev-parse','HEAD']),isolatedRoot:join(root,'isolated'),release,previousVersion:'0.7.41',archive:pin(archivePath),fixture:pin(fixture),harnessSha256:null,generation:{automationSha256:automationDigest(new URL('../../',import.meta.url).pathname),trustedFiles:{...executables,[pnpm]:hash(readFileSync(pnpm))},executionPath:config.executionPath,stateSchemaVersion:2},config};
 // Harness closure is explicitly approved before preparation; never inferred after checks.
 input.harnessSha256=hash(JSON.stringify({'playwright.config.ts':hash(readFileSync(join(source,'playwright.config.ts'))),'tests/check.mjs':hash(readFileSync(join(source,'tests/check.mjs')))}));
 input.approval={approvedBy:'synthetic',approvalRef:'synthetic-only',planSha256:preflightPlanDigest(input)};
 writeFileSync(join(root,'STOP'),'standing remains stopped',{mode:0o600});
 return {root,input,config,git,retainFailure};
}
import {createHash} from 'node:crypto';
function awaitHash512(bytes){return createHash('sha512').update(bytes).digest('base64');}
const candidateBinding=c=>Object.fromEntries(['service','repository','reviewedBaseSha','candidateSourceSha','treeSha','lockfileSha256','release','expectationsSha256','harnessSha256','generationSha256','preflightConfigSha256','preflightPlanSha256'].map(key=>[key,c[key]]));
for(const service of ['estimate','jev'])test(`local ${service} preflight reuses exact source/tool inputs without generation or staged approvals`,{skip:process.platform!=='darwin'?'actual macOS sandbox required':false},async t=>{
 const f=setup(t,{service,update:true});f.input.kind='local-consumer-preflight';delete f.input.generation;delete f.input.approval;
 try {
  const prepared=await prepareCandidate(f.input),candidate=await runPreflight(prepared,f.config);
  const binding=candidateBinding(candidate);delete binding.generationSha256;binding.executionSha256=candidate.executionSha256;
  assert.equal(candidate.passed,true);assert.match(candidate.executionSha256,/^[a-f0-9]{64}$/);assert(!Object.hasOwn(candidate,'generationSha256'));
  assertCandidate(candidate,binding);assert.equal(f.git(['status','--porcelain']),'');assert.equal(readFileSync(join(f.root,'STOP'),'utf8'),'standing remains stopped');
  const proof=localCandidateProof(candidate.receipt);assert.deepEqual(readLocalCandidate(candidate.receipt),candidate);
  assert(!JSON.stringify(proof).includes('generation'));assert.equal(proof.consumerInputsSha256,localCandidateProof(candidate).consumerInputsSha256);
  const changed={...binding,executionSha256:'a'.repeat(64)};assert.throws(()=>assertCandidate(candidate,changed),/executionSha256 mismatch/);
 }catch(error){f.retainFailure(error);throw error;}
});
test('retained Jev candidate enters the new runner once and rolls back independently of STOP/approval/release discovery',{skip:process.platform!=='darwin'?'actual macOS sandbox required':false},async t=>{
 const f=setup(t,{service:'jev',update:true}),chrome=join(f.root,'chrome.json');writeFileSync(chrome,'synthetic chrome reference',{mode:0o600});f.input.release.chromeSha256=hash(readFileSync(chrome));
 const fixture=JSON.parse(readFileSync(f.input.fixture.path));fixture.release=f.input.release;
 const expectations=fixture.expectations.path;writeFileSync(expectations,JSON.stringify(declaration({...f.input.release,archive:{sha256:f.input.release.archiveSha256},contract:{version:'1',sha256:f.input.release.chromeSha256},account:{sha256:f.input.release.accountSha256}})));
 fixture.expectations.sha256=hash(readFileSync(expectations));fixture.expectations.bytes=readFileSync(expectations).length;
 writeFileSync(f.input.fixture.path,JSON.stringify(fixture));f.input.fixture.sha256=hash(readFileSync(f.input.fixture.path));f.input.fixture.bytes=readFileSync(f.input.fixture.path).length;f.input.approval.planSha256=preflightPlanDigest(f.input);
 const candidate=await runPreflight(await prepareCandidate(f.input),f.config),proof=localCandidateProof(candidate.receipt);
 assert(!Object.hasOwn(proof.candidateBinding,'generationSha256'));
 const source='d'.repeat(40),identity={schemaVersion:1,appId:'jev',artifactId:'synthetic-previous',sourceRevision:source,ui:{version:'0.7.41',contractVersion:'1'}};
 const previous=syntheticJevArchive(identity),previousPath=join(f.root,hash(previous.bytes)+'.tar.gz'),manifestPath=join(f.root,'previous-manifest.json');writeFileSync(previousPath,previous.bytes,{mode:0o600});writeFileSync(manifestPath,JSON.stringify(previous.manifest),{mode:0o600});
 const before={immutable:true,id:identity.artifactId,sourceRevision:source,ui:identity.ui,packageSha256:'d'.repeat(64),sha256:hash(previous.bytes),path:previousPath,storageRef:'file://'+previousPath,manifestPath,manifestSha256:hash(JSON.stringify(Object.fromEntries(Object.entries(previous.manifest).sort().map(([key,value])=>[key,Object.fromEntries(Object.entries(value).sort())])))),buildId:'synthetic-build'};
 const nativeHelper=fileURLToPath(new URL('./jev-native.py',import.meta.url)),python=realpathSync(process.execPath);
 const native={pythonExecutable:python,pythonSha256:hash(readFileSync(python)),helper:{path:nativeHelper,sha256:hash(readFileSync(nativeHelper))},executionPath:'/usr/bin:/bin',config:{baseDirectory:f.root,privateFiles:'metadata-only'}};
 const release={releaseId:f.input.release.releaseId,version:f.input.release.version,previousVersion:'0.7.41',sourceRevision:f.input.release.sourceRevision,archive:f.input.archive,contract:{version:'1',path:chrome,sha256:f.input.release.chromeSha256},account:fixture.account};
 const draft={schemaVersion:1,release,services:[{id:'jev',mode:'deploy',currentArtifact:before,consumer:{candidate:candidate.receipt,candidateBinding:proof.candidateBinding,native}}]};
 const plan=finalizePlan(draft,{jev:{previousArtifact:before,candidateArtifact:candidate.artifact,consumerInputsSha256:proof.consumerInputsSha256}}),config={plan,stateDirectory:join(f.root,'new-state'),lockFile:join(f.root,'machine.lock'),stopFile:join(f.root,'new-STOP'),approvalFile:join(f.root,'new-approval.json')};
 const failedConfig={...config,stateDirectory:join(f.root,'recovered-state'),lockFile:join(f.root,'recovered.lock'),stopFile:join(f.root,'recovered-STOP'),approvalFile:join(f.root,'recovered-approval.json')};writeFileSync(failedConfig.approvalFile,JSON.stringify(approvalFor(plan)),{mode:0o600});
 const recovered=createLocalConsumers({native(action,request){
  const binding={schemaVersion:1,releaseId:release.releaseId,serviceId:'jev',attemptId:request.attemptId,idempotencyKey:request.idempotencyKey,planSha256:request.planSha256,action};
  return action==='deploy'?{...binding,passed:false,safe:true,outcome:'failed',phase:'recovered',recovered:true,artifact:before}:{...binding,passed:true,safe:true};
 }});
 const recoveredState=await runLocal(failedConfig,{...recovered,validateRelease:async()=>({passed:true}),verify:async()=>{throw Error('Recovered deploy must not enter verification');}});
 assert.equal(recoveredState.status,'rolled-back');assert.equal(recoveredState.transactions[recoveredState.services.jev.transactionId].native.status,'failed');assert(!existsSync(failedConfig.lockFile));
 writeFileSync(config.approvalFile,JSON.stringify(approvalFor(plan)),{mode:0o600});let live=before,deployments=0,rollbacks=0;
 const adapters=createLocalConsumers({native(action,request){
  if(action==='inspect')assert.deepEqual(request.artifact,live);
  else if(action==='deploy'){deployments++;live=request.artifact;writeFileSync(config.stopFile,'stop',{mode:0o600});}
  else {rollbacks++;assert.deepEqual(request.previousArtifact,before);live=request.previousArtifact;}
  return {schemaVersion:1,releaseId:release.releaseId,serviceId:'jev',attemptId:request.attemptId,idempotencyKey:request.idempotencyKey,planSha256:request.planSha256,action,passed:true,safe:true,activated:action!=='inspect'};
 }}),deps={...adapters,validateRelease:async()=>({passed:true}),verify:async()=>({passed:true})};
 const state=await runLocal(config,deps);assert.equal(state.status,'stopped');assert.equal(deployments,1);assert.equal(live.id,candidate.artifact.id);
 const tx=state.transactions[state.services.jev.transactionId];assert.equal(tx.native.status,'complete');assert.notEqual(tx.prepared.native.helper.path,nativeHelper);
 fs.unlinkSync(config.approvalFile);fs.unlinkSync(candidate.artifact.path);fs.unlinkSync(release.archive.path);fs.unlinkSync(chrome);
 const rolledBack=await runLocal(config,deps,{command:'rollback',transactionId:tx.id});assert.equal(rolledBack.services.jev.status,'rolled-back');assert.equal(rollbacks,1);assert.deepEqual(live,before);
 assert.equal(f.git(['status','--porcelain']),'');
});
function offlineArchive(name,version,dependencies={}) {
 const chunks=[];
 for(const [path,value] of Object.entries({'package.json':JSON.stringify({name,version,dependencies,exports:{'.':'./dist/index.js'}}),'dist/index.js':'export const synthetic = true;','README.md':'exact frozen docs'})) {
  const bytes=Buffer.from(value),header=Buffer.alloc(512);header.write(`package/${path}`);header.write('0000644\0',100);header.write(`${bytes.length.toString(8).padStart(11,'0')}\0`,124);header.fill(32,148,156);header.write('0',156);header.write(`${[...header].reduce((sum,byte)=>sum+byte).toString(8).padStart(6,'0')}\0 `,148);chunks.push(header,bytes,Buffer.alloc((512-bytes.length%512)%512));
 }
 return gzipSync(Buffer.concat([...chunks,Buffer.alloc(1024)]));
}
function offlineFixture(t,pnpm) {
 const f=setup(t,{update:true,service:'jev'}),source=f.input.sourceRoot,store=join(f.root,'prepared-bundle');mkdirSync(store,{mode:0o700});
 assert.equal(hash(readFileSync(pnpm)),'e7499b13968f344210a03c50efa23139eba1207ee8a3ec0e3e44e0d35a4fb2ea');
 const pin=path=>({path,sha256:hash(readFileSync(path)),bytes:readFileSync(path).length});f.config.pnpm=pin(pnpm);f.input.generation.trustedFiles[pnpm]=f.config.pnpm.sha256;
 const registryArchive=join(f.root,'offline-fixture-1.0.0.tgz');writeFileSync(registryArchive,offlineArchive('offline-fixture','1.0.0'),{mode:0o600});
 const env={PATH:`${join(f.config.node,'..') }:/usr/bin:/bin`,HOME:f.root,XDG_CACHE_HOME:join(f.root,'setup-cache'),npm_config_userconfig:'/dev/null',npm_config_globalconfig:'/dev/null',CI:'1'};
 execFileSync(f.config.node,[pnpm,'store','add',registryArchive,'--store-dir',store],{cwd:source,env});
 for(const name of fs.readdirSync(join(store,'v10')))if(name.startsWith('file+'))rmSync(join(store,'v10',name),{recursive:true});
 const integrity='sha512-'+awaitHash512(readFileSync(registryArchive));const hex=createHash('sha512').update(readFileSync(registryArchive)).digest('hex');const indexDir=join(store,'v10/index',hex.slice(0,2));const localIndex=fs.readdirSync(indexDir).find(name=>name.startsWith(hex.slice(2,64)+'-')&&name.endsWith('.json'));assert(localIndex,'Pinned pnpm did not seed synthetic content index');
 fs.copyFileSync(join(indexDir,localIndex),join(indexDir,`${hex.slice(2,64)}-offline-fixture@1.0.0.json`));
 const metadataDir=join(store,'metadata-v1.3/registry.npmjs.org');mkdirSync(metadataDir,{recursive:true,mode:0o700});const metadata=join(metadataDir,'offline-fixture.json');writeFileSync(metadata,JSON.stringify({name:'offline-fixture',versions:{'1.0.0':{name:'offline-fixture',version:'1.0.0',dist:{tarball:'https://registry.npmjs.org/offline-fixture/-/offline-fixture-1.0.0.tgz',integrity}}},'dist-tags':{latest:'1.0.0'}}));
 const pkg=JSON.parse(readFileSync(join(source,'package.json')));pkg.dependencies['offline-fixture']='^1.0.0';writeFileSync(join(source,'package.json'),JSON.stringify(pkg));
 execFileSync(f.config.node,[pnpm,'install','--no-frozen-lockfile','--ignore-scripts','--offline','--store-dir',store,'--cache-dir',store,'--package-import-method=copy'],{cwd:source,env});
 for(const name of fs.readdirSync(join(store,'v10')))if(name.startsWith('file+')||name==='projects')rmSync(join(store,'v10',name),{recursive:true});
 f.git(['add','package.json','pnpm-lock.yaml']);f.git(['commit','--amend','--no-edit']);f.input.reviewedBaseSha=f.git(['rev-parse','HEAD']);
 const archive=offlineArchive('@naeil/ui','0.7.42',{'offline-fixture':'^1.0.0'});writeFileSync(f.input.archive.path,archive);f.input.archive=pin(f.input.archive.path);f.input.release.archiveSha256=f.input.archive.sha256;
 const accountPath=join(f.root,'account.json'),account=JSON.parse(readFileSync(accountPath));account.archiveSha256=f.input.archive.sha256;writeFileSync(accountPath,JSON.stringify(account));f.input.release.accountSha256=hash(readFileSync(accountPath));
 const expectationsPath=join(f.root,'expectations.json');writeFileSync(expectationsPath,JSON.stringify(declaration({...f.input.release,archive:{sha256:f.input.archive.sha256},contract:{version:'1',sha256:f.input.release.chromeSha256},account:{sha256:f.input.release.accountSha256}})));
 const fixture=JSON.parse(readFileSync(f.input.fixture.path));fixture.release=f.input.release;fixture.account=pin(accountPath);fixture.expectations=pin(expectationsPath);writeFileSync(f.input.fixture.path,JSON.stringify(fixture));f.input.fixture=pin(f.input.fixture.path);
 f.config.dependencyStore={path:store,sha256:treeDigest(store)};f.input.generation.trustedFiles[store]=f.config.dependencyStore.sha256;f.input.approval.planSha256=preflightPlanDigest(f.input);
 return {...f,store,metadata,env};
}
test('pinned pnpm resolves an existing registry package only from the approved offline bundle cache',{skip:process.platform!=='darwin'?'actual macOS sandbox required':!process.env.NAEIL_TEST_PNPM_10_30_3?'set NAEIL_TEST_PNPM_10_30_3 to exact pinned pnpm.cjs':false},async t=>{
 const f=offlineFixture(t,process.env.NAEIL_TEST_PNPM_10_30_3),sourceHead=f.input.reviewedBaseSha;
 const makeRoot=(name,metadata)=>{
  const root=join(f.root,name),checkout=join(root,'checkout'),store=join(root,'cache/store');mkdirSync(join(checkout,'vendor'),{recursive:true});fs.cpSync(f.store,store,{recursive:true});if(!metadata)fs.rmSync(join(store,'metadata-v1.3'),{recursive:true});
  const pkg=JSON.parse(readFileSync(join(f.input.sourceRoot,'package.json')));pkg.dependencies['@naeil/ui']='file:vendor/naeil-ui-0.7.42.tgz';writeFileSync(join(checkout,'package.json'),JSON.stringify(pkg));
  fs.copyFileSync(join(f.input.sourceRoot,'pnpm-lock.yaml'),join(checkout,'pnpm-lock.yaml'));fs.copyFileSync(f.input.archive.path,join(checkout,'vendor/naeil-ui-0.7.42.tgz'));
  return {root,checkout};
 };
 const env={...f.env,XDG_CACHE_HOME:join(f.root,'unrelated-empty-cache')},missingRoot=makeRoot('content-only',false);
 const run=(root,checkout,unchanged)=>spawnSync(f.config.node,offlineInstallArgs(f.config.pnpm.path,root,unchanged),{cwd:checkout,env,encoding:'utf8'});
 const missing=run(missingRoot.root,missingRoot.checkout,false);assert.equal(missing.status,1);assert.match(missing.stdout+missing.stderr,/ERR_PNPM_NO_OFFLINE_META/);
 const approved=makeRoot('metadata-bundle',true),before={packageJSON:readFileSync(join(f.input.sourceRoot,'package.json')),lockfile:readFileSync(join(f.input.sourceRoot,'pnpm-lock.yaml'))};
 const updated=run(approved.root,approved.checkout,false);assert.equal(updated.status,0,updated.stdout+updated.stderr);
 const frozen=run(approved.root,approved.checkout,true);assert.equal(frozen.status,0,frozen.stdout+frozen.stderr);
 assertDependencyDelta(before,{packageJSON:readFileSync(join(approved.checkout,'package.json')),lockfile:readFileSync(join(approved.checkout,'pnpm-lock.yaml'))});
 assert.equal(JSON.parse(readFileSync(join(approved.checkout,'node_modules/@naeil/ui/package.json'))).version,'0.7.42');
 assert.equal(JSON.parse(readFileSync(join(approved.checkout,'node_modules/offline-fixture/package.json'))).version,'1.0.0');
 assert.equal(treeDigest(f.store),f.config.dependencyStore.sha256);assert.equal(f.git(['rev-parse','HEAD']),sourceHead);assert.equal(f.git(['status','--porcelain']),'');
 t.diagnostic(JSON.stringify({contentOnlyExit:missing.status,contentOnlyStdoutSha256:hash(missing.stdout),updateExit:updated.status,updateStdoutSha256:hash(updated.stdout),frozenExit:frozen.status,frozenStdoutSha256:hash(frozen.stdout),bundleSha256:treeDigest(f.store)}));
});
test('prepared dependency store preserves exact modes and internal links under umask 077',{skip:process.platform!=='darwin'?'actual macOS sandbox required':false},async t=>{
 if(process.umask()!==0o077) {
  const env={PATH:'/usr/bin:/bin',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null',COPYFILE_DISABLE:'1'};
  for(const key of ['HOME','TMPDIR'])if(process.env[key])env[key]=process.env[key];
  try{t.diagnostic(execFileSync('/bin/sh',['-c','umask 077\nexec "$@"','synthetic-store-copy',process.execPath,'--test','--test-concurrency=1','--test-name-pattern=^prepared dependency store preserves exact modes and internal links under umask 077$',fileURLToPath(import.meta.url)],{env,encoding:'utf8'}));}catch(error){t.diagnostic(String(error.stdout));t.diagnostic(String(error.stderr));throw error;}return;
 }
 const f=setup(t),store=join(f.root,'prepared-store'),mode=path=>fs.lstatSync(path).mode&0o777;
 mkdirSync(store,{mode:0o700});mkdirSync(join(store,'objects'));mkdirSync(join(store,'bin'));
 writeFileSync(join(store,'objects/data'),Buffer.from('synthetic\0store\n'));writeFileSync(join(store,'bin/tool'),'#!/bin/sh\nexit 0\n');
 for(const [path,value] of [['',0o755],['objects',0o750],['bin',0o755],['objects/data',0o644],['bin/tool',0o755]])fs.chmodSync(join(store,path),value);
 fs.symlinkSync('objects/data',join(store,'data-link'));fs.symlinkSync('bin',join(store,'bin-link'));
 const before=treeManifest(store),digest=treeDigest(store),rootMode=mode(store);
 f.config.dependencyStore={path:store,sha256:digest};f.input.generation.trustedFiles[store]=digest;f.input.approval.planSha256=preflightPlanDigest(f.input);
 t.diagnostic(JSON.stringify({syntheticRoot:f.root,umask:process.umask().toString(8),approvedStoreSha256:digest,sourceManifest:before}));
 try {
  const c=await prepareCandidate(f.input),copied=join(c.root,'cache/store'),retained=JSON.parse(readFileSync(join(c.root,'input/approved-plan.json')));
  assert.equal(c.passed,false);assert.equal(c.candidateSourceSha,f.input.reviewedBaseSha);assert.equal(c.packageParity.passed,true);
  assert.deepEqual(treeManifest(copied),before);assert.equal(treeDigest(copied),retained.config.dependencyStore.sha256);assert.equal(retained.config.dependencyStore.sha256,digest);
  assert.equal(mode(copied),rootMode);assert.equal(mode(join(copied,'objects/data')),0o644);assert.equal(mode(join(copied,'bin/tool')),0o755);
  assert.equal(fs.readlinkSync(join(copied,'data-link')),'objects/data');assert.equal(fs.readlinkSync(join(copied,'bin-link')),'bin');
  assert.equal(realpathSync(join(copied,'data-link')),join(copied,'objects/data'));assert.equal(realpathSync(join(copied,'bin-link')),join(copied,'bin'));
  assert.deepEqual(treeManifest(store),before);assert.equal(mode(store),rootMode);assert.equal(f.git(['status','--porcelain']),'');assert.equal(readFileSync(join(f.root,'STOP'),'utf8'),'standing remains stopped');
  for(const path of ['', 'cache','input','output','tmp','artifact'])assert.equal(mode(join(c.root,path)),0o700,'Private preparation parent mode changed');
  t.diagnostic(JSON.stringify({preparedRoot:c.root,retainedStoreSha256:retained.config.dependencyStore.sha256,copiedStoreSha256:treeDigest(copied),sourceStoreSha256:treeDigest(store),copiedManifest:treeManifest(copied)}));
 }catch(error){t.diagnostic(JSON.stringify({sourceStoreSha256:treeDigest(store),copiedManifest:existsSync(join(f.input.isolatedRoot,'cache/store'))?treeManifest(join(f.input.isolatedRoot,'cache/store')):null}));f.retainFailure(error);throw error;}
});

test('dependency store copy refuses unexpected destination links without chmod of outside targets',{skip:process.platform!=='darwin'?'actual macOS sandbox required':false},async t=>{
 for(const directory of [false,true])await t.test(directory?'directory link':'file link',async t=>{
  const f=setup(t),store=join(f.root,'prepared-store'),outside=join(f.root,'outside-copy-target');mkdirSync(store,{mode:0o700});
  if(directory){mkdirSync(join(store,'member'));mkdirSync(outside,{mode:0o700});}else{writeFileSync(join(store,'member'),'synthetic source',{mode:0o600});writeFileSync(outside,'synthetic outside',{mode:0o600});}
  fs.chmodSync(join(store,'member'),directory?0o755:0o644);const before=treeManifest(store),outsideStat=fs.lstatSync(outside),outsideBytes=directory?null:readFileSync(outside);
  f.config.dependencyStore={path:store,sha256:treeDigest(store)};f.input.approval.planSha256=preflightPlanDigest(f.input);
  const original=fs.cpSync;let swapped=false;
  fs.cpSync=(source,destination,options)=>{const result=original(source,destination,options);if(source===store){const member=join(destination,'member');rmSync(member,{recursive:true});fs.symlinkSync(outside,member);swapped=true;}return result;};syncBuiltinESMExports();
  try{await assert.rejects(()=>prepareCandidate(f.input));assert(swapped,'Synthetic copy boundary was not reached');assert.equal(fs.lstatSync(outside).mode,outsideStat.mode);if(directory)assert.deepEqual(fs.readdirSync(outside),[]);else assert.deepEqual(readFileSync(outside),outsideBytes);assert.deepEqual(treeManifest(store),before);assert(!existsSync(join(f.input.isolatedRoot,'input/prepared.json')));assert.equal(JSON.parse(readFileSync(join(f.input.isolatedRoot,'output/prepare-failed.json'))).passed,false);}catch(error){f.retainFailure(error);throw error;}finally{fs.cpSync=original;syncBuiltinESMExports();}
 });
});

for(const included of [false,true])test(`preparation rejects ${included?'included':'local'} source filters before its first host inspection`,{skip:process.platform!=='darwin'?'actual macOS sandbox required':false},async t=>{
 const f=setup(t),source=f.input.sourceRoot,marker=join(f.root,'source-filter-marker'),helper=join(f.root,'source-filter.cjs'),attributes=join(f.root,'source-attributes');
 writeFileSync(helper,`const fs=require('node:fs');fs.appendFileSync(${JSON.stringify(marker)},'clean\\n');process.stdout.write(fs.readFileSync(0));`);
 writeFileSync(attributes,'* filter=sourceprobe\n');const quote=value=>"'"+value.replaceAll("'","'\\''")+"'";
 const config=`[core]\n attributesFile = ${JSON.stringify(attributes)}\n[filter "sourceprobe"]\n clean = ${JSON.stringify(quote(process.execPath)+' '+quote(helper))}\n required = true\n`;
 if(included){const path=join(f.root,'source-include');writeFileSync(path,config);f.git(['config','include.path',path]);}
 else fs.appendFileSync(join(source,'.git/config'),config);
 fs.utimesSync(join(source,'package.json'),new Date(),new Date(Date.now()+2000));
 let error;try{await prepareCandidate(f.input);}catch(caught){error=caught;}
 const executions=existsSync(marker)?readFileSync(marker,'utf8').trim().split('\n'):[];t.diagnostic(JSON.stringify({rejected:!!error,executions}));
 assert.deepEqual(executions,[],'Initial preparation status launched an unpinned source filter');assert(error,'Unreviewed source config must fail before checkout');assert(!existsSync(f.input.isolatedRoot));
 assert.equal(f.git(['rev-parse','HEAD']),f.input.reviewedBaseSha);
});
test('generation is separate from config/authorization/candidate receipts and rejects extra identities',()=>{
 const value={automationSha256:'a'.repeat(64),trustedFiles:{'/runtime/node':'b'.repeat(64)},executionPath:'/runtime:/usr/bin',stateSchemaVersion:2};
 assert.match(generationDigest(value),/^[a-f0-9]{64}$/);
 assert.throws(()=>generationDigest({...value,configSha256:'c'.repeat(64)}),/generation|identity|field/);
 assert.notEqual(generationDigest(value),generationDigest({...value,stateSchemaVersion:3}));
});
test('STOP-safe synthetic candidate E2E uses retained artifact, package bytes, same source commit and one transferable bundle',{skip:process.platform!=='darwin'?'actual macOS sandbox required; unsupported OS is fail-closed':false},async t=>{
 const f=setup(t);try {const base=f.input.reviewedBaseSha;const prepared=await prepareCandidate(f.input);
 assert.equal(prepared.candidateSourceSha,base);assert.equal(prepared.passed,false);assert(existsSync(prepared.bundle.path));
 const passed=await runPreflight(prepared,f.config);assert.equal(passed.passed,true);assert.equal(passed.candidateSourceSha,base);
 assert(passed.checks.some(check=>check.name==='release-integrity'&&check.exitCode===0));
 assertCandidate(passed,{...candidateBinding(passed),service:'estimate',repository:f.input.repository,reviewedBaseSha:base,candidateSourceSha:base,generationSha256:generationDigest(f.input.generation),release:f.input.release});
 await assert.rejects(()=>runPreflight(prepared,f.config),/already|single|replay/);
 assert.equal(f.git(['rev-parse','HEAD']),base);assert.equal(readFileSync(join(f.root,'STOP'),'utf8'),'standing remains stopped');
 const checkout=join(f.input.isolatedRoot,'checkout');assert.equal(execFileSync('/usr/bin/git',['rev-parse','HEAD'],{cwd:checkout,encoding:'utf8'}).trim(),base);
 writeFileSync(join(passed.artifact.directory,'app/identity.json'),'rebuilt');assert.throws(()=>assertCandidate(passed,candidateBinding(passed)),/artifact|digest|manifest/i);
 }catch(error){f.retainFailure(error);throw error;}
});
test('dependency-only candidate is committed once; validation never creates another commit',{skip:process.platform!=='darwin'?'actual macOS sandbox required; unsupported OS is fail-closed':false},async t=>{
 const f=setup(t,{update:true});try {const c=await prepareCandidate(f.input);assert.notEqual(c.candidateSourceSha,c.reviewedBaseSha);
 const result=await runPreflight(c,f.config);assert.equal(result.candidateSourceSha,c.candidateSourceSha);
 const changed=execFileSync('/usr/bin/git',['diff-tree','--no-commit-id','--name-only','-r',c.candidateSourceSha],{cwd:c.checkout,encoding:'utf8'}).trim().split('\n').sort();
 assert.deepEqual(changed,['package.json','pnpm-lock.yaml','vendor/naeil-ui-0.7.42.tgz']);
 }catch(error){f.retainFailure(error);throw error;}
});

test('an exact approved dependency-only source HEAD can reuse its adopted base in a fresh isolated preparation',{skip:process.platform!=='darwin'?'actual macOS sandbox required':false},async t=>{
 const f=setup(t,{update:true}),first=await prepareCandidate(f.input);
 const next={...f.input,sourceRoot:first.checkout,sourceHeadSha:first.candidateSourceSha,isolatedRoot:join(f.root,'next-isolated')};
 next.approval={approvedBy:'synthetic',approvalRef:'synthetic-later-preparation',planSha256:preflightPlanDigest(next)};
 const second=await prepareCandidate(next);
 assert.equal(second.reviewedBaseSha,f.input.reviewedBaseSha);assert.equal(second.sourceHeadSha,first.candidateSourceSha);assert.equal(second.candidateSourceSha,first.candidateSourceSha,'Exact already-prepared dependency bytes retain the existing SHA');
 assert.notEqual(second.root,first.root);assert.equal(f.git(['rev-parse','HEAD']),f.input.reviewedBaseSha);
 // Fresh exact plan approval does not permit other source edits above that base.
 execFileSync('/usr/bin/git',['-c','user.name=Synthetic','-c','user.email=synthetic@example.invalid','commit','--allow-empty','-qm','synthetic harmless descendant'],{cwd:first.checkout});
 writeFileSync(join(first.checkout,'scripts/unapproved.mjs'),'// unapproved executable source');execFileSync('/usr/bin/git',['add','.'],{cwd:first.checkout});execFileSync('/usr/bin/git',['-c','user.name=Synthetic','-c','user.email=synthetic@example.invalid','commit','-qm','unapproved source'],{cwd:first.checkout});
 const bad={...next,sourceHeadSha:execFileSync('/usr/bin/git',['rev-parse','HEAD'],{cwd:first.checkout,encoding:'utf8'}).trim(),isolatedRoot:join(f.root,'unapproved-isolated')};bad.approval={...next.approval,planSha256:preflightPlanDigest(bad)};
 await assert.rejects(()=>prepareCandidate(bad),/dependency-only scope/);assert(!existsSync(bad.isolatedRoot));
});
test('invalid policy/native config or stale exact plan fails before checkout; failed build retains evidence without passed receipt',{skip:process.platform!=='darwin'?'actual macOS sandbox required; unsupported OS is fail-closed':false},async t=>{
 const f=setup(t);await assert.rejects(()=>prepareCandidate({...f.input,policy:{stopFile:'/fake'}}),/field|operational|input/);assert(!existsSync(f.input.isolatedRoot));
 await assert.rejects(()=>prepareCandidate({...f.input,reviewedBaseSha:'0'.repeat(40)}),/approval|plan/);assert(!existsSync(f.input.isolatedRoot));
 const bad=setup(t,{badBuild:true});const c=await prepareCandidate(bad.input);await assert.rejects(()=>runPreflight(c,bad.config),/preflight failed/i);
 const failed=JSON.parse(readFileSync(join(c.output,'failed.json')));assert.equal(failed.passed,false);assert(!existsSync(join(c.output,'passed.json')));assert.throws(()=>assertCandidate(failed,{}),/passed/i);
});

test('candidate cannot redirect retained output outside isolated root or substitute its bindings',{skip:process.platform!=='darwin'?'actual macOS sandbox required':false},async t=>{
 const f=setup(t);const candidate=await prepareCandidate(f.input);const outside=join(f.root,'outside-output');mkdirSync(outside,{mode:0o700});
 await assert.rejects(()=>runPreflight({...candidate,output:outside},f.config),/candidate|isolated|path/i);assert.deepEqual((await import('node:fs')).readdirSync(outside),[]);
 await assert.rejects(()=>runPreflight({...candidate,generationSha256:'e'.repeat(64)},f.config),/generation|binding|candidate/i);
});

test('synthetic Jev selected standalone keeps exact native manifest/archive/receipt and immutable E2E bytes',{skip:process.platform!=='darwin'?'actual macOS sandbox required':false},async t=>{
 const f=setup(t,{service:'jev'});try {const candidate=await prepareCandidate(f.input);const result=await runPreflight(candidate,f.config);
 assertCandidate(result,{...candidateBinding(result),service:'jev',repository:'naeil-dev/jev',candidateSourceSha:candidate.candidateSourceSha,generationSha256:candidate.generationSha256});
 assert.equal(result.artifact.standalonePath,result.artifact.directory);assert.match(result.artifact.sha256,/^[a-f0-9]{64}$/);
 const manifest=JSON.parse(readFileSync(result.artifact.manifestPath));const expected=hash(JSON.stringify(Object.fromEntries(Object.entries(manifest).sort().map(([key,value])=>[key,Object.fromEntries(Object.entries(value).sort())]))));
 assert.equal(result.artifact.manifestSha256,expected);
 }catch(error){f.retainFailure(error);throw error;}
});

test('unsupported OS CLI refuses before creating its isolated root or launching consumer code',t=>{
 const root=realpathSync(mkdtempSync(join(tmpdir(),'preflight-unsupported-')));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const input=join(root,'input.json'),isolatedRoot=join(root,'isolated');writeFileSync(input,JSON.stringify({schemaVersion:1,isolatedRoot}),{mode:0o600});
 const script=new URL('./consumer-preflight.mjs',import.meta.url).pathname;
 const code=`Object.defineProperty(process,'platform',{value:'linux'});process.argv=[process.execPath,${JSON.stringify(script)},'prepare',${JSON.stringify(input)},${JSON.stringify(join(isolatedRoot,'output','result.json'))}];await import(${JSON.stringify(new URL('./consumer-preflight.mjs',import.meta.url).href)});`;
 let exit;try{execFileSync(process.execPath,['--input-type=module','-e',code],{stdio:'pipe'});exit=0;}catch(error){exit=error.status;}
 assert.equal(exit,1);assert(!existsSync(isolatedRoot));
});

test('unsafe stage names fail before checkout even in a newly approved isolated plan',{skip:process.platform!=='darwin'?'actual macOS sandbox required':false},async t=>{
 const f=setup(t);f.config.checks.splice(1,0,{name:'../outside',file:node,args:['-e','0']});f.input.approval.planSha256=preflightPlanDigest(f.input);
 await assert.rejects(()=>prepareCandidate(f.input),/check name/);assert(!existsSync(f.input.isolatedRoot));
});

test('newly approved preflight with stale automation bytes still fails before checkout',{skip:process.platform!=='darwin'?'actual macOS sandbox required':false},async t=>{
 const f=setup(t);f.input.generation.automationSha256='0'.repeat(64);f.input.approval.planSha256=preflightPlanDigest(f.input);
 await assert.rejects(()=>prepareCandidate(f.input),/automation.*changed|automation.*mismatch/i);assert(!existsSync(f.input.isolatedRoot));
});

test('Estimate requires its release integrity gate before creating a candidate checkout',{skip:process.platform!=='darwin'?'actual macOS sandbox required':false},async t=>{
 const f=setup(t);delete f.config.releaseIntegrity;f.input.approval.planSha256=preflightPlanDigest(f.input);
 await assert.rejects(()=>prepareCandidate(f.input),/release integrity gate/i);assert(!existsSync(f.input.isolatedRoot));
});

test('failed Estimate release integrity cannot select an artifact or issue a passed receipt',{skip:process.platform!=='darwin'?'actual macOS sandbox required':false},async t=>{
 const f=setup(t);try {f.config.releaseIntegrity.args=['-e','process.exit(1)'];f.input.approval.planSha256=preflightPlanDigest(f.input);
 const candidate=await prepareCandidate(f.input);await assert.rejects(()=>runPreflight(candidate,f.config),error=>{if(!error.cause?.message.startsWith('Isolated stage failed: release-integrity'))throw error;return /preflight failed/i.test(error.message);});
 const check=JSON.parse(readFileSync(join(candidate.root,'input/receipts/release-integrity.json')));assert.equal(check.exitCode,1);
 assert(!existsSync(join(candidate.root,'artifact/selected/receipt.json')));assert(!existsSync(join(candidate.root,'input/passed.json')));
 }catch(error){f.retainFailure(error);throw error;}
});

test('post-consumer Git filter cannot launch an outside synthetic marker',{skip:process.platform!=='darwin'?'actual macOS sandbox required':false},async t=>{
 const f=setup(t);try {const candidate=await prepareCandidate(f.input),marker=join(f.root,'outside-filter-marker');
 const gitDirectory=execFileSync('/usr/bin/git',['rev-parse','--absolute-git-dir'],{cwd:candidate.checkout,encoding:'utf8'}).trim();
 // Parent fixture corruption proves post-consumer Git remains sandboxed even if metadata is tampered.
 const helper=join(f.root,'outside-filter.cjs');writeFileSync(helper,`require('node:fs').writeFileSync(${JSON.stringify(marker)},'synthetic');`);
 const clean=JSON.stringify(node)+' '+JSON.stringify(helper);
 execFileSync('/usr/bin/git',['config','filter.canary.clean',clean],{cwd:candidate.checkout});execFileSync('/usr/bin/git',['config','filter.canary.required','true'],{cwd:candidate.checkout});
 assert.equal(execFileSync('/usr/bin/git',['config','--get','filter.canary.clean'],{cwd:candidate.checkout,encoding:'utf8'}).trim(),clean);
 writeFileSync(join(gitDirectory,'info/attributes'),'package.json filter=canary\n');const pkg=join(candidate.checkout,'package.json');writeFileSync(pkg,readFileSync(pkg,'utf8').replace('synthetic','mutated00'));fs.utimesSync(pkg,new Date(),new Date(Date.now()+2000));
 await assert.rejects(()=>runPreflight(candidate,f.config));assert(!existsSync(marker),'Git launched an outside filter marker');
 }catch(error){f.retainFailure(error);throw error;}
});

test('consumer cannot write real Git metadata and redirecting .git cannot select host filters',{skip:process.platform!=='darwin'?'actual macOS sandbox required':false},async t=>{
 const f=setup(t);try {f.config.checks[0].args=['-e',"const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');const pointer=fs.readFileSync('.git','utf8').trim();assert(pointer.startsWith('gitdir: '));const dir=path.resolve(pointer.slice(8));for(const file of ['config','info/attributes'])assert.throws(()=>fs.appendFileSync(path.join(dir,file),'bad'),e=>['EPERM','EACCES'].includes(e.code));fs.writeFileSync('.git','gitdir: ../outside-git');"];f.input.approval.planSha256=preflightPlanDigest(f.input);
 const c=await prepareCandidate(f.input);await assert.rejects(()=>runPreflight(c,f.config),error=>{if(!error.cause?.message.startsWith('Immutable Git directory pointer changed'))throw error;return /preflight failed/i.test(error.message);});
 const unit=JSON.parse(readFileSync(join(c.root,'input/receipts/unit.json')));assert.equal(unit.exitCode,0);
 }catch(error){f.retainFailure(error);throw error;}
});

test('source lock symlink is rejected without any parent read of its synthetic outside target',{skip:process.platform!=='darwin'?'actual macOS sandbox required':false},async t=>{
 const f=setup(t),canary=join(f.root,'outside-source-canary');writeFileSync(canary,'synthetic-outside-bytes',{mode:0o600});
 f.config.checks[0].args=['-e',`const fs=require('node:fs');fs.unlinkSync('pnpm-lock.yaml');fs.symlinkSync(${JSON.stringify(canary)},'pnpm-lock.yaml');`];f.input.approval.planSha256=preflightPlanDigest(f.input);
 const c=await prepareCandidate(f.input),original=fs.readFileSync;let outsideReads=0;
 fs.readFileSync=(path,...args)=>{if(typeof path==='string'&&path===join(c.checkout,'pnpm-lock.yaml')&&fs.lstatSync(path).isSymbolicLink())outsideReads++;return original(path,...args);};syncBuiltinESMExports();
 try{await assert.rejects(()=>runPreflight(c,f.config));assert.equal(outsideReads,0,'Parent followed consumer-controlled source symlink');}finally{fs.readFileSync=original;syncBuiltinESMExports();}
});

test('post-install package symlink cannot trigger a parent reread outside the checkout',{skip:process.platform!=='darwin'?'actual macOS sandbox required':false},async t=>{
 const f=setup(t,{update:true}),canary=join(f.root,'outside-package-canary');writeFileSync(canary,'synthetic-outside-bytes',{mode:0o600});
 const pnpm=f.config.pnpm.path;fs.appendFileSync(pnpm,`if(process.argv.includes('--frozen-lockfile')){fs.unlinkSync('package.json');fs.symlinkSync(${JSON.stringify(canary)},'package.json');}`);
 f.config.pnpm.sha256=hash(readFileSync(pnpm));f.config.pnpm.bytes=readFileSync(pnpm).length;f.input.generation.trustedFiles[pnpm]=f.config.pnpm.sha256;f.input.approval.planSha256=preflightPlanDigest(f.input);
 const original=fs.readFileSync;let outsideReads=0;
 fs.readFileSync=(path,...args)=>{if(typeof path==='string'&&path===join(f.input.isolatedRoot,'checkout/package.json')&&fs.lstatSync(path).isSymbolicLink())outsideReads++;return original(path,...args);};syncBuiltinESMExports();
 try{await assert.rejects(()=>prepareCandidate(f.input));assert.equal(outsideReads,0,'Parent followed post-install package symlink');}finally{fs.readFileSync=original;syncBuiltinESMExports();}
});

test('release integrity writes only its runner-bound output evidence without dirtying source',{skip:process.platform!=='darwin'?'actual macOS sandbox required':false},async t=>{
 const f=setup(t);f.config.releaseIntegrity.args=['-e',"const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');const output=process.env.RELEASE_INTEGRITY_EVIDENCE_PATH;assert.equal(output,path.resolve('..','output','release-integrity-evidence.json'));fs.writeFileSync(output,JSON.stringify({ok:true}));"];f.input.approval.planSha256=preflightPlanDigest(f.input);
 const c=await prepareCandidate(f.input),passed=await runPreflight(c,f.config);assert.equal(passed.passed,true);assert.deepEqual(JSON.parse(readFileSync(join(c.output,'release-integrity-evidence.json'))),{ok:true});
});
