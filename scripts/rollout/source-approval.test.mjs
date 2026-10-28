import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs, { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, realpathSync, chmodSync, existsSync, utimesSync, cpSync, symlinkSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collectSourceFacts, validateSourceApproval, adoptSourceBase, validateSourceAdoption, validateCandidateHandoff } from './source-approval.mjs';
import { atomicJSON, automationDigest, fingerprint, generationDigest, hash, operationalGenerationDigest, releaseIdentityDigest, routeKey } from './standing-config.mjs';
import { assertCandidateSource, preflightPlanDigest, stageCandidate } from './consumer-preflight.mjs';
import { codeManifest } from './consumer-artifact.mjs';
import { treeDigest } from './preflight-sandbox.mjs';
import { syntheticArchive } from './fixtures/release.mjs';
import { dependencyLock } from './fixtures/dependency-lock.mjs';
import { createHash } from 'node:crypto';
import { runStanding as estimateStanding } from './estimate-standing-adapter.mjs';
import { runStanding as jevStanding } from './jev-standing-adapter.mjs';

function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'source-approval-'))); t.after(() => rmSync(root, { recursive: true, force: true }));
  const git = args => execFileSync('/usr/bin/git', ['-c','core.hooksPath=/dev/null','-c','core.fsmonitor=false',...args], { cwd:root, encoding:'utf8', env:{PATH:'/usr/bin:/bin',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null'} }).trim();
  git(['init','-q','-b','reviewed']); git(['config','user.name','Synthetic']); git(['config','user.email','synthetic@example.invalid']);
  mkdirSync(join(root,'tests')); writeFileSync(join(root,'tests/check.mjs'),'// old harness');
  writeFileSync(join(root,'package.json'),JSON.stringify({scripts:{test:'node tests/check.mjs'}}));
  git(['add','.']); git(['commit','-qm','old approved base']); const oldReviewedBaseSha=git(['rev-parse','HEAD']);
  writeFileSync(join(root,'tests/check.mjs'),'// explicitly reviewed schema2 harness'); git(['add','.']); git(['commit','-qm','review schema2 fixture']);
  const input={sourceRoot:root, service:'estimate', repository:'naeil-dev/abestimate', oldReviewedBaseSha, newReviewedBaseSha:git(['rev-parse','HEAD'])};
  const facts=collectSourceFacts(input), now='2026-10-26T00:00:00Z';
  const approval={schemaVersion:1,kind:'reviewed-source-approval',service:input.service,repository:input.repository,oldReviewedBaseSha,newReviewedBaseSha:input.newReviewedBaseSha,diffSha256:facts.diffSha256,
    files:facts.files.map(file=>({...file,purpose:'Review exact schema2 fixture execution code'})),fixtureSchemaVersion:2,contractVersion:'1',dependencyOnly:true,approvedBy:'synthetic-owner',approvalRef:'synthetic://source-review',approvedAt:'2026-10-25T00:00:00Z',adoptBefore:'2026-10-27T00:00:00Z',revoked:false};
  return {root,git,input,facts,approval,now};
}
test('adopts the exact reviewed base in time; the caller owns durable storage', t=>{
  const f=fixture(t); assert.equal(validateSourceApproval(f.approval,f.facts,f.now),f.approval);
  const before=f.git(['status','--porcelain']); const record=adoptSourceBase(f.approval,f.facts,f.now);
  assert.equal(record.reviewedBaseSha,f.input.newReviewedBaseSha); assert.equal(record.adoptedAt,f.now);
  assert.equal(validateSourceAdoption(f.approval,record,f.facts,'2026-11-10T00:00:00Z'),record);
  assert.throws(()=>validateSourceAdoption({...f.approval,revoked:true},record,f.facts,'2026-11-10T00:00:00Z'),/revok/i);
  assert.equal(f.git(['status','--porcelain']),before);
  assert.throws(()=>adoptSourceBase(f.approval,f.facts,'2026-11-10T00:00:00Z'),/expir|window/i);
  assert.throws(()=>validateSourceAdoption(f.approval,null,f.facts,f.now),/adopt/i);
});
test('foreign scope, scripts, diff/hash and unsupported fixture/contract are never approved implicitly', t=>{
  const f=fixture(t);
  for(const patch of [{service:'jev'},{repository:'foreign/repo'},{diffSha256:'0'.repeat(64)},{fixtureSchemaVersion:3},{contractVersion:'2'},{dependencyOnly:false},{revoked:true},{approvedBy:''},{files:[]},{newReviewedBaseSha:f.input.oldReviewedBaseSha}]) {
    assert.throws(()=>validateSourceApproval({...f.approval,...patch},f.facts,f.now));
  }
  const files=structuredClone(f.approval.files); files[0].newSha256=hash('another test'); assert.throws(()=>validateSourceApproval({...f.approval,files},f.facts,f.now));
  writeFileSync(join(f.root,'package.json'),JSON.stringify({scripts:{test:'unapproved-script'}})); f.git(['add','.']); f.git(['commit','-qm','unapproved scripts']);
  const changed=collectSourceFacts({...f.input,newReviewedBaseSha:f.git(['rev-parse','HEAD'])}); assert.throws(()=>validateSourceApproval(f.approval,changed,f.now));
});
test('facts require exact ancestry and preserve the complete binary diff algorithm', t=>{
  const f=fixture(t); const bytes=execFileSync('/usr/bin/git',['diff','--binary','--full-index',f.input.oldReviewedBaseSha,f.input.newReviewedBaseSha,'--'],{cwd:f.root});
  assert.equal(f.facts.diffSha256,hash(bytes)); assert.equal(f.facts.files[0].newSha256,hash(readFileSync(join(f.root,'tests/check.mjs'))));
  assert.throws(()=>collectSourceFacts({...f.input,oldReviewedBaseSha:f.input.newReviewedBaseSha,newReviewedBaseSha:f.input.oldReviewedBaseSha}),/ancestor|Git/i);
});

function handoffFixture(t, service='estimate') {
  const root=realpathSync(mkdtempSync(join(tmpdir(),'source-handoff-')));t.after(()=>rmSync(root,{recursive:true,force:true}));
  const put=(path,value)=>writeFileSync(path,Buffer.isBuffer(value)||typeof value==='string'?value:JSON.stringify(value),{mode:0o600});
  const pin=path=>({path,sha256:hash(readFileSync(path)),bytes:readFileSync(path).length});
  const isolated=join(root,'isolated'),checkout=join(isolated,'checkout');
  for(const path of [isolated,checkout,join(isolated,'input'),join(isolated,'output'),join(isolated,'artifact'),join(checkout,'tests'),join(checkout,'vendor'),join(checkout,'ops'),join(root,'bin'),join(root,'other-bin'),join(root,'state'),join(root,'artifacts'),join(root,'native-state')])mkdirSync(path,{mode:0o700});
  const git=(args,cwd=checkout,raw=false)=>{const result=execFileSync('/usr/bin/git',['-c','core.hooksPath=/dev/null','-c','core.fsmonitor=false',...args],{cwd,env:{PATH:'/usr/bin:/bin',GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_GLOBAL:'/dev/null'},maxBuffer:2097152});return raw?result:result.toString().trim();};
  git(['init','-q','--separate-git-dir',join(isolated,'git'),'-b','fixture']);git(['config','user.name','Synthetic']);git(['config','user.email','synthetic@example.invalid']);
  const archives=Object.fromEntries(['0.7.1','0.7.2','0.7.3'].map(version=>[version,syntheticArchive(version)]));
  const integrity=bytes=>'sha512-'+createHash('sha512').update(bytes).digest('base64');
  const packageFor=version=>({name:'synthetic',scripts:{test:'node tests/check.mjs'},dependencies:{'@naeil/ui':`file:vendor/naeil-ui-${version}.tgz`}});
  put(join(checkout,'package.json'),packageFor('0.7.1'));put(join(checkout,'pnpm-lock.yaml'),dependencyLock('0.7.1',integrity(archives['0.7.1'])));put(join(checkout,'vendor/naeil-ui-0.7.1.tgz'),archives['0.7.1']);put(join(checkout,'tests/check.mjs'),'// old harness');put(join(checkout,'playwright.config.ts'),'// reviewed config');put(join(checkout,'ops/code-activation.mts'),'// pinned synthetic native bridge');
  git(['add','.']);git(['commit','-qm','old approved source']);const old=git(['rev-parse','HEAD']);
  put(join(checkout,'tests/check.mjs'),'// exact schema2 reviewed harness');git(['add','.']);git(['commit','-qm','review schema2 fixture']);const base=git(['rev-parse','HEAD']);
  put(join(checkout,'package.json'),packageFor('0.7.2'));put(join(checkout,'pnpm-lock.yaml'),dependencyLock('0.7.2',integrity(archives['0.7.2'])));put(join(checkout,'vendor/naeil-ui-0.7.2.tgz'),archives['0.7.2']);git(['add','.']);git(['commit','-qm','prepare dependency exactly once']);const sha=git(['rev-parse','HEAD']);
  const worktree=join(root,'worktree');git(['clone','-q','--no-hardlinks',checkout,worktree],root);git(['checkout','-qb','rollout/standing',old],worktree);
  const executables=Object.fromEntries(['node','pnpm'].map(name=>{const path=join(root,'bin',name);put(path,'synthetic '+name);chmodSync(path,0o700);return[name,path];}));executables.git='/usr/bin/git';executables.tar=realpathSync('/usr/bin/tar');
  const loader=join(root,'loader.mjs');put(loader,'// durable loader');const helper=join(root,'helper.mjs');put(helper,'// dispatcher helper');const bridge=join(worktree,'ops/code-activation.mts');
  const trusted=Object.fromEntries([...Object.values(executables),loader,helper,bridge].map(path=>[path,hash(readFileSync(path))]));
  const automationSha256=automationDigest(new URL('../../',import.meta.url).pathname),executionPath=join(root,'bin')+':/usr/bin';
  const context={automationSha256,trustedFiles:trusted,executionPath,stateSchemaVersion:2};
  const other={...context,executionPath:join(root,'other-bin')+':/usr/bin'};
  const generation={...context,executionPath:'/usr/bin',trustedFiles:trusted,executionContexts:{estimate:service==='estimate'?context:other,jev:service==='jev'?context:other}};
  const releaseFor=version=>{
    const archive=join(root,`ui-${version}.tgz`);put(archive,archives[version]);const frame=join(root,`frame-${version}.json`),account=join(root,`account-${version}.json`);
    const reference={schemaVersion:1,kind:'independent-release-render',frozen:true,archiveSha256:hash(archives[version]),sourceRevision:'a'.repeat(40),ui:{version,contractVersion:'1'},cases:[{}]};put(frame,reference);put(account,{...reference,kind:'independent-account-render'});
    return {schemaVersion:1,releaseId:`ui-${version}`,version,previousVersion:version==='0.7.3'?'0.7.2':'0.7.1',sourceRevision:'a'.repeat(40),siteSourceRevision:'e'.repeat(40),changes:['fix'],archive:{...pin(archive),url:'https://example.test/ui.tgz'},contract:{...pin(frame),version:'1'},account:pin(account)};
  };
  const released=releaseFor('0.7.2'),flat=release=>({releaseId:release.releaseId,version:release.version,contractVersion:'1',sourceRevision:release.sourceRevision,archiveSha256:release.archive.sha256,chromeSha256:release.contract.sha256,accountSha256:release.account.sha256});
  const makeArtifact=(version,sourceRevision,name)=>{
    const directory=join(root,name);mkdirSync(directory,{mode:0o700});let manifestPath,manifestSha256,id='build-'+name,releaseId;
    const ui={version,contractVersion:'1'};
    if(service==='estimate'){
      mkdirSync(join(directory,'app/.next'),{recursive:true});put(join(directory,'app/server.js'),'// unchanged standalone');put(join(directory,'app/.next/BUILD_ID'),id);
      releaseId=sourceRevision.slice(0,12)+'-'+hash(name).slice(0,12);const manifest={schemaVersion:1,releaseId,node:'v24.21.0',serverPath:'app/server.js',runtimeDataIncluded:false,sourceCommit:sourceRevision,buildId:id,uiBuildIdentity:{schemaVersion:1,appId:'abestimate',artifactId:id,sourceRevision,ui},artifactFiles:codeManifest(join(directory,'app'),{estimate:true}),packageVersions:{'@naeil/ui':`file:vendor/naeil-ui-${version}.tgz`},sourceFiles:{[`vendor/naeil-ui-${version}.tgz`]:hash(archives[version]),'src/server/naeil-shared-session.ts':'b'.repeat(64),'src/server/naeil-auth-client.ts':'c'.repeat(64)}};
      manifestPath=join(directory,'manifest.json');put(manifestPath,manifest);manifestSha256=pin(manifestPath).sha256;
    }else{
      mkdirSync(join(directory,'public/.well-known'),{recursive:true});mkdirSync(join(directory,'.next'));put(join(directory,'server.js'),'// unchanged standalone');put(join(directory,'.next/BUILD_ID'),id);put(join(directory,'public/.well-known/naeil-ui.json'),{schemaVersion:1,appId:'jev',artifactId:id,sourceRevision,ui});
      const manifest=codeManifest(directory);manifestPath=join(root,name+'-manifest.json');put(manifestPath,manifest);manifestSha256=hash(JSON.stringify(Object.fromEntries(Object.entries(manifest).sort().map(([key,value])=>[key,Object.fromEntries(Object.entries(value).sort())]))));releaseId=`ui-${version}`;
    }
    const path=join(root,name+'.tar.gz');put(path,'exact synthetic code archive '+name);
    return {immutable:true,id,artifactId:id,sourceRevision,ui,releaseId,packageSha256:hash(archives[version]),...pin(path),storageRef:'file://'+path,directory,inventorySha256:treeDigest(directory),manifestPath,manifestSha256,buildId:id,...(service==='jev'?{standalonePath:directory}:{})};
  };
  const artifact=makeArtifact('0.7.2',sha,'candidate');artifact.storageRef+='?sha256='+artifact.sha256;
  const account=join(isolated,'input/account.json');put(account,readFileSync(released.account.path));const expectations=join(isolated,'input/expectations.json');put(expectations,{schemaVersion:1,synthetic:true});const fixturePath=join(isolated,'input/fixture.json');put(fixturePath,{schemaVersion:2,kind:'standing-ui-reference',release:flat(released),account:pin(account),expectations:pin(expectations),routingProfile:null});
  const archive=join(isolated,'input/ui.tgz');put(archive,archives['0.7.2']);const bundle=join(isolated,'input/candidate.bundle');git(['bundle','create',bundle,'HEAD']);chmodSync(bundle,0o600);
  const harnessSha256=hash(JSON.stringify({'playwright.config.ts':hash(readFileSync(join(checkout,'playwright.config.ts'))),'tests/check.mjs':hash(readFileSync(join(checkout,'tests/check.mjs')))}));
  const planValue={schemaVersion:1,service,repository:service==='estimate'?'naeil-dev/abestimate':'naeil-dev/jev',sourceRoot:checkout,reviewedBaseSha:base,isolatedRoot:isolated,release:flat(released),harnessSha256,generation:context,config:{git:'/usr/bin/git',executionPath,executables:{'/usr/bin/git':trusted['/usr/bin/git']}}};const plan=join(isolated,'input/approved-plan.json');put(plan,planValue);
  const candidate={schemaVersion:1,kind:'isolated-consumer-candidate',passed:true,service,repository:planValue.repository,reviewedBaseSha:base,candidateSourceSha:sha,treeSha:git(['rev-parse','HEAD^{tree}']),lockfileSha256:hash(readFileSync(join(checkout,'pnpm-lock.yaml'))),release:flat(released),expectationsSha256:pin(expectations).sha256,harnessSha256,generationSha256:generationDigest(context),preflightConfigSha256:fingerprint(planValue.config),preflightPlanSha256:preflightPlanDigest(planValue),root:isolated,checkout,output:join(isolated,'output'),archive:pin(archive),fixture:pin(fixturePath),bundle:pin(bundle),plan:pin(plan),artifact,isolation:{passed:true},packageParity:{before:{passed:true},after:{passed:true}},checks:['install','install-frozen','unit','type','lint','build','package','e2e',...(service==='estimate'?['release-integrity','smoke']:[])].map(name=>({name,exitCode:0}))};
  const receipt=join(isolated,'input/passed.json');put(receipt,candidate);candidate.receipt=pin(receipt);
  const facts=collectSourceFacts({sourceRoot:checkout,service,repository:candidate.repository,oldReviewedBaseSha:old,newReviewedBaseSha:base});
  const approval={schemaVersion:1,kind:'reviewed-source-approval',service,repository:candidate.repository,oldReviewedBaseSha:old,newReviewedBaseSha:base,diffSha256:facts.diffSha256,files:facts.files.map(file=>({...file,purpose:'Exact fixture review'})),fixtureSchemaVersion:2,contractVersion:'1',dependencyOnly:true,approvedBy:'synthetic-owner',approvalRef:'synthetic://review',approvedAt:'2020-01-01',adoptBefore:'2021-01-01',revoked:false};
  const adoption=adoptSourceBase(approval,facts,'2020-06-01');
  const candidateBinding=Object.fromEntries(['service','repository','reviewedBaseSha','candidateSourceSha','treeSha','lockfileSha256','release','expectationsSha256','harnessSha256','generationSha256','preflightConfigSha256','preflightPlanSha256'].map(key=>[key,candidate[key]]));
  const handoff={schemaVersion:1,generation,generationSha256:operationalGenerationDigest(generation),sourceApproval:approval,sourceApprovalSha256:fingerprint(approval),sourceAdoption:adoption,sourceAdoptionSha256:fingerprint(adoption),candidateBinding,candidateReceipt:candidate.receipt};
  const policy={schemaVersion:1,enabled:true,approvedBy:'synthetic-owner',approvalRef:'synthetic://standing',expiresAt:'2099-01-01',services:[service],stopFile:join(root,'STOP'),maxEvidenceAgeSeconds:3600,rollbackApproved:false,rollbackScope:'code-only',patchWindow:{approvedBy:'synthetic-owner',approvalRef:'synthetic://standing',reason:'Reviewed patch window',minVersion:'0.7.2',maxVersion:'0.7.99',contractVersion:'1',startsAt:'2020-01-01',expiresAt:'2099-01-01',services:[service]}};
  const input={schemaVersion:1,mode:'standing',attemptId:'candidate-1',idempotencyKey:`ui-0.7.2:${service}`,generationSha256:handoff.generationSha256,executionPath,trustedFiles:trusted,release:released,service:{id:service,appId:service==='estimate'?'abestimate':'jev',origin:service==='estimate'?'https://abestimate.naeil.dev':'https://jev.naeil.dev',routes:[{path:'/',policy:'canonical',renderState:{access:'public'}}],verification:{command:{file:executables.node,args:[],timeoutMs:1000}}},policy,candidate,sourceAdoption:adoption};
  const config={schemaVersion:1,enabled:true,serviceId:service,appId:input.service.appId,origin:input.service.origin,branch:'rollout/standing',worktree,reviewedSourceRevision:old,pnpmVersion:'10.30.3',executionPath,trustedFiles:trusted,stateDirectory:join(root,'state'),artifactDirectory:join(root,'artifacts'),handoff,
    ...(service==='estimate'?{executables,bridgePath:bridge,bridgeSha256:trusted[bridge],tsxPath:loader,activation:{schemaVersion:1,enabled:true,serviceId:service,appId:'abestimate',nodePath:executables.node,stopFile:policy.stopFile,stateDirectory:join(root,'native-state'),deploymentRoot:join(root,'deploy'),dataDirectory:join(root,'data'),runtimeEnvironmentSha256:{APP_ORIGIN:hash(input.service.origin),NAEIL_SUPABASE_URL:hash('synthetic URL'),NAEIL_SUPABASE_ANON_KEY:hash('synthetic key')}}}:{nodeExecutable:executables.node,nodeVersion:'synthetic',pnpmExecutable:executables.pnpm,pythonExecutable:'/usr/bin/python3',gitExecutable:'/usr/bin/git',native:{},verificationCommand:{file:executables.node,args:[]}})};
  const adapterConfigPath=join(root,service+'-config.json'),verificationConfigPath=join(root,'verification-config.json');
  config.handoff.adapterConfigPath=adapterConfigPath;config.handoff.configurationPaths=[adapterConfigPath,verificationConfigPath].sort();put(verificationConfigPath,{schemaVersion:1,synthetic:'verification-only'});
  const control=join(root,'control'),epoch=join(root,'epoch');mkdirSync(control,{mode:0o700});mkdirSync(epoch,{mode:0o700});put(join(epoch,'state.json'),{schemaVersion:2,epochId:'synthetic'});
  input.service.adapterOptions={standingConfigPath:adapterConfigPath};
  const bindConfig=(selectedConfig=config,selectedInput=input)=>{
    if(!selectedInput.release.expectations){const declaration=JSON.parse(readFileSync(new URL('./expectations/0.7.2.json',import.meta.url)));declaration.release=flat(selectedInput.release);const path=join(root,'current-expectations-'+selectedInput.release.version+'.json');put(path,declaration);selectedInput.release.expectations=pin(path);}
    const naeilService={id:'naeil',appId:'naeil',origin:'https://naeil.dev',routes:selectedInput.service.routes,verification:selectedInput.service.verification};
    const siteArtifact={id:'dpl_SyntheticCurrent',sourceRevision:selectedInput.release.siteSourceRevision,ui:{version:selectedInput.release.version,contractVersion:'1'},platform:{kind:'vercel-git',deploymentId:'dpl_SyntheticCurrent'}};const siteIdentity={schemaVersion:1,appId:'naeil',artifactId:siteArtifact.id,sourceRevision:siteArtifact.sourceRevision,ui:siteArtifact.ui};
    put(adapterConfigPath,selectedConfig);selectedInput.configReferences=config.handoff.configurationPaths.map(pin);selectedInput.configReferencesSha256=fingerprint(selectedInput.configReferences);
    const outer={schemaVersion:1,enabled:true,generationSha256:handoff.generationSha256,stateDirectory:epoch,configReferences:selectedInput.configReferences,configReferencesSha256:selectedInput.configReferencesSha256,generationControl:{controlDirectory:control,generationId:'synthetic',epochId:'synthetic'},policy:selectedInput.policy,trustedFiles:trusted,executionPath:selectedInput.executionPath,services:{[service]:selectedInput.service,naeil:naeilService}};
    const configPath=join(control,'config.json');put(configPath,outer);
    const next={generationId:'synthetic',generationSha256:handoff.generationSha256,config:pin(configPath),configReferencesSha256:outer.configReferencesSha256,stateDirectory:epoch,epochId:'synthetic'};
    const transition={kind:'standing-0.7.2-continuation',next,release:selectedInput.release,previousApprovalSha256:hash('historical'),estimate:{priorAttemptId:'prior-source-failure',newAttemptId:selectedInput.attemptId,idempotencyKey:selectedInput.idempotencyKey},predecessors:{naeil:siteIdentity}};transition.planSha256=fingerprint(transition);
    const continuation={schemaVersion:1,kind:'standing-continuation-approval',action:'continue-0.7.2-after-source-gate-failure',planSha256:transition.planSha256,generationSha256:handoff.generationSha256,previousApprovalSha256:transition.previousApprovalSha256,successorOf:transition.previousApprovalSha256,releaseSha256:releaseIdentityDigest(selectedInput.release),priorAttemptId:transition.estimate.priorAttemptId,attemptId:transition.estimate.newAttemptId,approvedBy:'synthetic-owner',approvalRef:'synthetic://continuation',approvedAt:'2020-01-01',expiresAt:'2099-01-01',revoked:false};
    put(join(control,'plan.json'),transition);put(join(control,'approval.json'),continuation);
    const pointer={schemaVersion:1,...next,authorizationSha256:fingerprint(continuation),transitionPlanSha256:transition.planSha256};put(join(control,'active.json'),pointer);put(join(control,'transition.json'),{schemaVersion:1,oldPointer:null,imported:null,validatedState:null,proof:null,phase:'completed',planSha256:transition.planSha256,approvalSha256:fingerprint(continuation),newPointer:pointer,plan:pin(join(control,'plan.json')),approval:pin(join(control,'approval.json'))});
    if(service==='estimate'){selectedInput.reconciliation={priorAttemptId:'prior-source-failure'};mkdirSync(join(config.stateDirectory,'keys'),{mode:0o700,recursive:true});put(join(config.stateDirectory,'keys',hash(selectedInput.idempotencyKey)+'.json'),{attemptId:'prior-source-failure',idempotencyKey:selectedInput.idempotencyKey,state:'gate-failed',mutationAttempted:true,runtimeMutationAttempted:false});}
    selectedInput.generationFence={controlDirectory:control,pointerSha256:pin(join(control,'active.json')).sha256};
    const siteRequest={schemaVersion:1,mode:'standing',phase:'production',service:naeilService,release:selectedInput.release,policy:selectedInput.policy,trustedFiles:trusted,executionPath:outer.executionPath,generationSha256:selectedInput.generationSha256,generationFence:selectedInput.generationFence,configReferences:selectedInput.configReferences,configReferencesSha256:selectedInput.configReferencesSha256,idempotencyKey:selectedInput.release.releaseId+':naeil',attemptId:'fresh-site'};
    const production={schemaVersion:1,passed:true,releaseId:selectedInput.release.releaseId,serviceId:'naeil',idempotencyKey:siteRequest.idempotencyKey,attemptId:siteRequest.attemptId,phase:'production',identity:siteIdentity,archiveSha256:selectedInput.release.archive.sha256,referenceSha256:selectedInput.release.contract.sha256,accountReferenceSha256:selectedInput.release.account.sha256,expectationsSha256:selectedInput.release.expectations.sha256,checkedAt:new Date().toISOString(),routes:naeilService.routes.map(route=>({path:route.path,routeKey:routeKey(route),passed:true}))};
    mkdirSync(join(epoch,'prerequisites'),{mode:0o700,recursive:true});const prerequisitePath=join(epoch,'prerequisites','naeil.json');put(prerequisitePath,{schemaVersion:1,kind:'standing-current-naeil-verification',generationSha256:handoff.generationSha256,pointerSha256:selectedInput.generationFence.pointerSha256,releaseSha256:continuation.releaseSha256,request:siteRequest,artifact:siteArtifact,production});selectedInput.naeilPrerequisite=pin(prerequisitePath);
  };bindConfig();
  return {root,put,pin,git,candidate,input,config,bindConfig,stage:{worktree,branch:'rollout/standing',reviewedSourceRevision:old,git:'/usr/bin/git',gitSha256:trusted['/usr/bin/git'],executionPath,beforeMutation:()=>validateCandidateHandoff(candidate,input,config)},releaseFor,makeArtifact,approval,facts,archives};
}

// Identity-preserving filters expose execution that exact source hashes miss.
function filterProbe(f, checkout, {included=false, clean=true}={}) {
  const marker=join(f.root,'filter-executions.jsonl'),helper=join(f.root,'unreviewed-filter.cjs'),attributes=join(f.root,'external-attributes');
  f.put(helper,`const fs=require('node:fs');fs.appendFileSync(${JSON.stringify(marker)},JSON.stringify(process.argv[2])+'\\n');process.stdout.write(fs.readFileSync(0));`);
  f.put(attributes,'* filter=unreviewed\n');
  const quote=value=>"'"+value.replaceAll("'","'\\''")+"'",command=quote(process.execPath)+' '+quote(helper);
  const config=`[core]\n attributesFile = ${JSON.stringify(attributes)}\n[filter "unreviewed"]\n required = true\n clean = ${JSON.stringify(clean?command+' clean':'/bin/cat')}\n smudge = ${JSON.stringify(command+' smudge')}\n`;
  if(included) {const path=join(f.root,'included-config');f.put(path,config);f.git(['config','include.path',path],checkout);}
  else f.put(join(checkout===f.candidate.checkout?join(f.candidate.root,'git'):join(checkout,'.git'),'config'),readFileSync(join(checkout===f.candidate.checkout?join(f.candidate.root,'git'):join(checkout,'.git'),'config'),'utf8')+config);
  // Force a real clean-filter check even though its output matches the index.
  utimesSync(join(checkout,'package.json'),new Date(),new Date(Date.now()+2000));
  return ()=>existsSync(marker)?readFileSync(marker,'utf8').trim().split('\n').map(line=>JSON.parse(line)):[];
}

for(const target of ['retained','execution'])for(const included of [false,true])test(`handoff Git rejects ${target} ${included?'included':'local'} clean/smudge configuration before any unpinned command`,t=>{
  const f=handoffFixture(t),checkout=target==='retained'?f.candidate.checkout:f.config.worktree,executions=filterProbe(f,checkout,{included});
  let error,callbacks=0,executionsBeforeCallback=[];
  try {
    if(target==='retained')validateCandidateHandoff(f.candidate,f.input,f.config);
    else stageCandidate(f.candidate,{...f.stage,beforeMutation:()=>{callbacks++;executionsBeforeCallback.push(...executions());f.stage.beforeMutation();}});
  } catch(caught) {error=caught;}
  t.diagnostic(JSON.stringify({rejected:!!error,executions:executions(),executionsBeforeCallback,callbacks}));
  assert.deepEqual(executions(),[],'Unpinned filter ran during handoff inspection/staging');
  assert(error,'Unreviewed repository configuration must fail closed');
  assert.equal(callbacks,0,'Unsafe execution config must be refused before source-stage authorization');
});

test('handoff Git rejects an identity-preserving smudge command before exact fast-forward',t=>{
  const f=handoffFixture(t),before=f.git(['rev-parse','HEAD'],f.config.worktree),executions=filterProbe(f,f.config.worktree,{clean:false});let error;
  assert.equal(validateCandidateHandoff(f.candidate,f.input,f.config),f.candidate);
  try {stageCandidate(f.candidate,f.stage);}catch(caught){error=caught;}
  t.diagnostic(JSON.stringify({rejected:!!error,executions:executions(),exactCandidateSha:f.git(['rev-parse','HEAD'],f.config.worktree)===f.candidate.candidateSourceSha}));
  assert.deepEqual(executions(),[],'Unpinned identity-preserving smudge command executed');assert(error,'Unsafe smudge configuration must be rejected');
  assert.equal(f.git(['rev-parse','HEAD'],f.config.worktree),before,'Rejected configuration changed execution HEAD');
});

test('handoff Git rechecks configuration after each source-stage authorization callback',t=>{
  for(const poisonAt of [1,2]) {
    const f=handoffFixture(t);let callbacks=0,error,executions=()=>[];const before=f.git(['rev-parse','HEAD'],f.config.worktree);
    try {stageCandidate(f.candidate,{...f.stage,beforeMutation:()=>{f.stage.beforeMutation();if(++callbacks===poisonAt)executions=filterProbe(f,f.config.worktree);}});}catch(caught){error=caught;}
    assert.deepEqual(executions(),[],'Changed config executed a filter after authorization');assert(error,'Changed config must be rejected at the next Git invocation');
    assert.equal(callbacks,poisonAt);assert.equal(f.git(['rev-parse','HEAD'],f.config.worktree),before);
  }
});

test('handoff Git refuses other command-producing options and conditional includes',t=>{
  const f=handoffFixture(t),config=join(f.candidate.root,'git/config'),original=readFileSync(config);
  for(const [key,value]of [['core.sshCommand','/unreviewed/ssh'],['credential.helper','!/unreviewed/credentials'],['remote.origin.uploadpack','/unreviewed/upload-pack'],['filter.arbitrary.process','/unreviewed/process'],['diff.arbitrary.textconv','/unreviewed/textconv'],['merge.arbitrary.driver','/unreviewed/merge'],['includeIf.gitdir:/.path','/unreviewed/include'],['extensions.worktreeConfig','true']]) {
    f.put(config,original);f.git(['config',key,value]);assert.throws(()=>validateCandidateHandoff(f.candidate,f.input,f.config),undefined,key+' must fail closed');
  }
});

for(const boundary of ['pointer','directory','commondir','config-link'])test(`handoff Git preserves protected metadata boundary: ${boundary}`,t=>{
  const f=handoffFixture(t),metadata=join(f.candidate.root,'git'),outside=join(f.root,'outside-metadata'),pointer=join(f.candidate.checkout,'.git');
  cpSync(metadata,outside,{recursive:true});
  if(boundary==='pointer')f.put(pointer,`gitdir: ${outside}\n`);
  if(boundary==='directory'){rmSync(pointer);cpSync(metadata,pointer,{recursive:true});}
  if(boundary==='commondir')f.put(join(metadata,'commondir'),outside+'\n');
  if(boundary==='config-link'){rmSync(join(metadata,'config'));symlinkSync(join(outside,'config'),join(metadata,'config'));}
  let outsideOpens=0,error;const original=fs.openSync;
  fs.openSync=function(path,...args){if(String(path).startsWith(outside+'/'))outsideOpens++;return original.call(this,path,...args);};syncBuiltinESMExports();
  try{validateCandidateHandoff(f.candidate,f.input,f.config);}catch(caught){error=caught;}finally{fs.openSync=original;syncBuiltinESMExports();}
  assert.equal(outsideOpens,0,'Parent opened metadata beyond the protected Git root');assert(error,'Substituted Git metadata must fail closed');
});

test('one operational generation binds exact distinct consumer contexts without receipt/config cycles',()=>{
  const common={automationSha256:'a'.repeat(64),stateSchemaVersion:2,trustedFiles:{'/runtime/node':'b'.repeat(64)},executionPath:'/runtime:/usr/bin'};
  const identity={...common,executionContexts:{estimate:common,jev:{...common,executionPath:'/other:/usr/bin'}}};
  assert.notEqual(generationDigest(identity.executionContexts.estimate),generationDigest(identity.executionContexts.jev));assert.match(operationalGenerationDigest(identity),/^[a-f0-9]{64}$/);
  for(const patch of [{automationSha256:'c'.repeat(64)},{stateSchemaVersion:3}])assert.throws(()=>operationalGenerationDigest({...identity,executionContexts:{...identity.executionContexts,jev:{...identity.executionContexts.jev,...patch}}}));
  assert.throws(()=>operationalGenerationDigest({...identity,candidateReceiptSha256:'d'.repeat(64)}));
});
for(const service of ['estimate','jev'])test(`${service}: exact approved handoff transfers retained objects and artifact; invalid records reach no native call`,async t=>{
  const f=handoffFixture(t,service), events=[], run=service==='estimate'?estimateStanding:jevStanding;
  assert.equal(validateCandidateHandoff(f.candidate,f.input,f.config),f.candidate);
  const before=f.git(['rev-parse','HEAD'],f.config.worktree);stageCandidate(f.candidate,f.stage);assert.notEqual(f.git(['rev-parse','HEAD'],f.config.worktree),before);assert.equal(f.git(['rev-parse','HEAD'],f.config.worktree),f.candidate.candidateSourceSha);assertCandidateSource(f.candidate,{...f.stage});
  const deps={native:async(action,request)=>{events.push(action);if(service==='estimate'){const ref=action==='inspect'?request.config.current:request.config.candidate;return {schemaVersion:1,releaseId:request.releaseId,serviceId:service,idempotencyKey:request.idempotencyKey,attemptId:request.attemptId,action,passed:true,nativeReleaseId:ref.releaseId,artifactId:ref.artifactId,...(action==='inspect'?{mutationAttempted:false}:action==='deploy'?{deploymentId:ref.releaseId}:{activated:true,preservationVerified:true})};}return {schemaVersion:1,releaseId:request.release.releaseId,serviceId:service,idempotencyKey:request.idempotencyKey,attemptId:request.attemptId,action,passed:true,safe:true,activated:action==='activate'};},verify:async request=>({schemaVersion:1,releaseId:request.release.releaseId,serviceId:service,idempotencyKey:request.idempotencyKey,attemptId:request.attemptId,phase:request.phase,passed:true,identity:request.expectedIdentity,archiveSha256:request.release.archive.sha256,referenceSha256:request.release.contract.sha256,accountReferenceSha256:request.release.account.sha256,checkedAt:new Date().toISOString(),routes:request.service.routes.map(route=>({path:route.path,routeKey:routeKey(route),passed:true}))}),command:async()=>{throw new Error('Handoff must never run updater/build commands');},update:async()=>{throw new Error('Handoff must never rerun updater');},onError:error=>{deps.error=error;}};
  // Baseline adoption is separate. Seed only this synthetic root through the
  // unchanged adoption path; preserve that predecessor for candidate activation.
  const baseline=f.makeArtifact('0.7.1','d'.repeat(40),'baseline');baseline.storageRef+='?sha256='+baseline.sha256;
  const priorRelease=f.releaseFor('0.7.1');const adoptInput={...f.input,mode:'adopt',release:priorRelease,idempotencyKey:`ui-0.7.1:${service}`,attemptId:'adopt'};for(const key of ['candidate','sourceAdoption','generationSha256','generationFence','configReferences','configReferencesSha256'])delete adoptInput[key];
  const adoptConfig={...f.config};delete adoptConfig.handoff;
  if(service==='estimate'){adoptConfig.currentBaseline=baseline;adoptConfig.baselineRelease={releaseId:priorRelease.releaseId,version:'0.7.1',sourceRevision:priorRelease.sourceRevision,archiveSha256:priorRelease.archive.sha256,referenceSha256:priorRelease.contract.sha256,accountReferenceSha256:priorRelease.account.sha256};}else adoptConfig.baselineArtifact=baseline;
  assert.equal((await run(adoptInput,adoptConfig,deps)).state,'production-verified',deps.error?.stack);
  const baselineBytes=readFileSync(join(f.config.stateDirectory,'baseline.json'));
  const invalid=[i=>{i.candidate={...i.candidate,candidateSourceSha:'f'.repeat(40)};},i=>{i.sourceAdoption={...i.sourceAdoption,reviewedBaseSha:'f'.repeat(40)};},i=>{i.generationSha256='f'.repeat(64);},i=>{i.policy={...i.policy,expiresAt:'2000-01-01'};},i=>{i.policy={...i.policy,revoked:true};},i=>{i.policy={...i.policy,patchWindow:{...i.policy.patchWindow,maxVersion:'0.7.1'}};},i=>{i.configReferencesSha256='f'.repeat(64);},i=>{i.configReferences=i.configReferences.slice(1);i.configReferencesSha256=fingerprint(i.configReferences);}];
  for(const [index,mutate]of invalid.entries()){events.length=0;const input=structuredClone(f.input);input.attemptId='invalid-'+index;f.bindConfig(f.config,input);mutate(input);assert.equal((await run(input,f.config,deps)).state,'gate-failed');assert.deepEqual(events,[]);assert.deepEqual(readFileSync(join(f.config.stateDirectory,'baseline.json')),baselineBytes);}
  for(const path of [join(f.candidate.checkout,'pnpm-lock.yaml'),join(f.candidate.checkout,'tests/check.mjs'),f.candidate.artifact.path,JSON.parse(readFileSync(f.candidate.fixture.path)).expectations.path,...f.config.handoff.configurationPaths,join(f.config.worktree,'tests/check.mjs')]) {
    const input={...f.input,attemptId:'changed-'+hash(path).slice(0,8)};f.bindConfig(f.config,input);const original=readFileSync(path);f.put(path,Buffer.concat([original,Buffer.from('changed')]));events.length=0;
    assert.equal((await run(input,f.config,deps)).state,'gate-failed');assert.deepEqual(events,[]);f.put(path,original);
  }
  // A different commit with the exact same tree cannot replace the tested SHA.
  const sameTree=f.git(['commit-tree',f.candidate.treeSha,'-p',f.candidate.candidateSourceSha,'-m','synthetic same-tree substitution']);
  f.git(['update-ref','refs/heads/fixture',sameTree]);events.length=0;
  const sameTreeInput={...f.input,attemptId:'same-tree'};f.bindConfig(f.config,sameTreeInput);assert.equal((await run(sameTreeInput,f.config,deps)).state,'gate-failed');assert.deepEqual(events,[]);f.git(['update-ref','refs/heads/fixture',f.candidate.candidateSourceSha]);
  f.bindConfig();f.put(join(f.config.stateDirectory,'running.lock'),'synthetic unresolved native attempt');events.length=0;
  if(service==='estimate')assert.equal((await run({...f.input,attemptId:'uncertain-retry'},f.config,deps)).state,'gate-failed');
  assert.equal((await run(f.input,f.config,deps)).state,'deferred');assert.deepEqual(events,[]);rmSync(join(f.config.stateDirectory,'running.lock'));
  if(service==='estimate') {
    const missingPrior={...f.input};delete missingPrior.reconciliation;assert.equal((await run(missingPrior,f.config,deps)).state,'gate-failed');assert.deepEqual(events,[]);
  }
  events.length=0;const result=await run(f.input,f.config,deps);assert.equal(result.state,'production-verified',deps.error?.stack??result.reason);assert.equal(result.artifact.path,f.candidate.artifact.path);assert(events.includes(service==='estimate'?'deploy':'stage'));assert(events.includes('activate'));
});

test('an adopted exact base supports a later dependency-only release; unadopted or changed source never does', t=>{
  const f=handoffFixture(t),old=f.candidate,version='0.7.3';
  f.put(join(old.checkout,'package.json'),{name:'synthetic',scripts:{test:'node tests/check.mjs'},dependencies:{'@naeil/ui':`file:vendor/naeil-ui-${version}.tgz`}});
  f.put(join(old.checkout,'pnpm-lock.yaml'),dependencyLock(version,'sha512-'+createHash('sha512').update(f.archives[version]).digest('base64')));f.put(join(old.checkout,`vendor/naeil-ui-${version}.tgz`),f.archives[version]);f.git(['add','.']);f.git(['commit','-qm','later dependency-only patch']);
  const root=join(f.root,'later');mkdirSync(root,{mode:0o700});mkdirSync(join(root,'input'),{mode:0o700});
  const release=f.releaseFor(version),flat={releaseId:release.releaseId,version,contractVersion:'1',sourceRevision:release.sourceRevision,archiveSha256:release.archive.sha256,chromeSha256:release.contract.sha256,accountSha256:release.account.sha256};
  const fixture=join(root,'input/fixture.json');f.put(fixture,{...JSON.parse(readFileSync(old.fixture.path)),release:flat,account:release.account});
  const archive=join(root,'input/ui.tgz');f.put(archive,f.archives[version]);const bundle=join(root,'input/candidate.bundle');f.git(['bundle','create',bundle,'HEAD']);chmodSync(bundle,0o600);
  const source=f.git(['rev-parse','HEAD']),checkout=join(root,'checkout');f.git(['clone','-q','--no-hardlinks','--separate-git-dir='+join(root,'git'),old.checkout,checkout],root);
  const planValue={...JSON.parse(readFileSync(old.plan.path)),release:flat,isolatedRoot:root},plan=join(root,'input/approved-plan.json');f.put(plan,planValue);
  const candidate={...old,root,checkout,release:flat,candidateSourceSha:source,treeSha:f.git(['rev-parse','HEAD^{tree}']),lockfileSha256:hash(readFileSync(join(old.checkout,'pnpm-lock.yaml'))),fixture:f.pin(fixture),archive:f.pin(archive),bundle:f.pin(bundle),plan:f.pin(plan),preflightPlanSha256:preflightPlanDigest(planValue),artifact:f.makeArtifact(version,source,'later-artifact')};delete candidate.receipt;
  candidate.artifact.storageRef+='?sha256='+candidate.artifact.sha256;const path=join(root,'input/passed.json');f.put(path,candidate);candidate.receipt=f.pin(path);
  const config=structuredClone(f.config);config.handoff.candidateReceipt=candidate.receipt;for(const key of Object.keys(config.handoff.candidateBinding))config.handoff.candidateBinding[key]=candidate[key];
  const request={...f.input,release,candidate};f.bindConfig(config,request);assert.equal(validateCandidateHandoff(candidate,request,config),candidate);
  const invalid=structuredClone(config);invalid.handoff.sourceAdoption=null;invalid.handoff.sourceAdoptionSha256=fingerprint(null);assert.throws(()=>validateCandidateHandoff(candidate,request,invalid));
  // Even explicitly rebinding the receipt cannot turn application/script edits
  // into a dependency-only descendant of the adopted base.
  f.put(join(old.checkout,'tests/check.mjs'),'// new unapproved test code');f.git(['add','.']);f.git(['commit','-qm','unapproved test source']);assert.throws(()=>assertCandidateSource({...candidate,root:old.root,checkout:old.checkout,candidateSourceSha:f.git(['rev-parse','HEAD']),treeSha:f.git(['rev-parse','HEAD^{tree}'])}),/scope|dependency|harness/i);
});

for(const service of ['estimate','jev'])for(const drift of ['config','pointer','stop',...(service==='estimate'?['recover-config','recover-pointer']:[])])test(`${service}: ${drift} drift before failure recovery cannot dispatch rollback`,async t=>{
  const f=handoffFixture(t,service),run=service==='estimate'?estimateStanding:jevStanding,events=[];
  const baseline=f.makeArtifact('0.7.1','d'.repeat(40),'baseline');baseline.storageRef+='?sha256='+baseline.sha256;
  const priorRelease=f.releaseFor('0.7.1');const adoptInput={...f.input,mode:'adopt',release:priorRelease,idempotencyKey:`ui-0.7.1:${service}`,attemptId:'adopt'};for(const key of ['candidate','sourceAdoption','generationSha256','generationFence','configReferences','configReferencesSha256'])delete adoptInput[key];
  const adoptConfig={...f.config};delete adoptConfig.handoff;
  if(service==='estimate'){adoptConfig.currentBaseline=baseline;adoptConfig.baselineRelease={releaseId:priorRelease.releaseId,version:'0.7.1',sourceRevision:priorRelease.sourceRevision,archiveSha256:priorRelease.archive.sha256,referenceSha256:priorRelease.contract.sha256,accountReferenceSha256:priorRelease.account.sha256};}else adoptConfig.baselineArtifact=baseline;
  const deps={native:async(action,request)=>{
    events.push(action);
    if(action==='activate'&&drift==='stop')f.put(f.input.policy.stopFile,'STOP\n');
    if(service==='estimate'&&action==='activate'&&drift.startsWith('recover-')){
      const deployment=f.config.activation.deploymentRoot;mkdirSync(join(deployment,'releases',baseline.releaseId),{mode:0o700,recursive:true});symlinkSync(join(deployment,'releases',baseline.releaseId),join(deployment,'current'));
      f.put(join(f.config.activation.stateDirectory,'operation.json'),{operationId:'standing-'+hash(f.input.idempotencyKey+':'+f.input.attemptId+':activate'),action:'activate',from:baseline.releaseId,to:f.candidate.artifact.releaseId,phase:'switched'});
      if(drift==='recover-config')f.put(f.config.handoff.configurationPaths.find(path=>path!==f.config.handoff.adapterConfigPath),{changed:true});else f.put(join(f.input.generationFence.controlDirectory,'active.json'),{changed:true});
      throw Error('synthetic interrupted activation');
    }
    if(service==='estimate'){const ref=action==='inspect'?request.config.current:action==='rollback'?request.config.previous:request.config.candidate;return {schemaVersion:1,releaseId:request.releaseId,serviceId:service,idempotencyKey:request.idempotencyKey,attemptId:request.attemptId,action,passed:true,nativeReleaseId:ref.releaseId,artifactId:ref.artifactId,...(action==='inspect'?{mutationAttempted:false}:action==='deploy'?{deploymentId:ref.releaseId}:{activated:true,preservationVerified:true})};}
    return {schemaVersion:1,releaseId:request.release.releaseId,serviceId:service,idempotencyKey:request.idempotencyKey,attemptId:request.attemptId,action,passed:true,safe:true,activated:['activate','rollback'].includes(action)};
  },verify:async request=>{
    if(request.phase==='production') {if(drift==='config')f.put(f.config.handoff.configurationPaths.find(path=>path!==f.config.handoff.adapterConfigPath),{changed:true});else f.put(join(f.input.generationFence.controlDirectory,'active.json'),{changed:true});throw Error('synthetic production failure');}
    return {schemaVersion:1,releaseId:request.release.releaseId,serviceId:service,idempotencyKey:request.idempotencyKey,attemptId:request.attemptId,phase:request.phase,passed:true,identity:request.expectedIdentity,archiveSha256:request.release.archive.sha256,referenceSha256:request.release.contract.sha256,accountReferenceSha256:request.release.account.sha256,checkedAt:new Date().toISOString(),routes:request.service.routes.map(route=>({path:route.path,routeKey:routeKey(route),passed:true}))};
  }};
  assert.equal((await run(adoptInput,adoptConfig,deps)).state,'production-verified');events.length=0;
  const before=readFileSync(join(f.config.stateDirectory,'baseline.json'));f.input.policy.rollbackApproved=true;f.bindConfig();
  const result=await run(f.input,f.config,deps);
  assert.equal(result.state,'activation-pending');assert(!events.includes('rollback'));assert(!events.includes('recover'));if(drift==='stop'&&service==='estimate')assert.equal(JSON.parse(readFileSync(join(f.config.stateDirectory,'attempts',f.input.attemptId,'native-activate/dispatch.json'))).state,'completed');assert(existsSync(join(f.config.stateDirectory,'running.lock')));assert.deepEqual(readFileSync(join(f.config.stateDirectory,'baseline.json')),before);
});

for(const service of ['estimate','jev'])test(`${service}: current-generation fresh naeil evidence is independently required before adapter writes or native dispatch`,async t=>{
 for(const cause of ['missing','expired','tampered','prior-generation']) {
  const f=handoffFixture(t,service),run=service==='estimate'?estimateStanding:jevStanding;let calls=0;
  if(cause==='missing')delete f.input.naeilPrerequisite;
  else {const proof=JSON.parse(readFileSync(f.input.naeilPrerequisite.path));if(cause==='expired')proof.production.checkedAt='2000-01-01';if(cause==='tampered')proof.production.identity.artifactId='substituted';if(cause==='prior-generation')proof.request.generationSha256='b'.repeat(64);f.put(f.input.naeilPrerequisite.path,proof);if(cause!=='tampered')f.input.naeilPrerequisite=f.pin(f.input.naeilPrerequisite.path);}
  const result=await run(f.input,f.config,{native:async()=>{calls++;throw Error('unexpected native');}});
  assert.equal(result.state,'gate-failed');assert.equal(calls,0);assert(!existsSync(join(f.config.stateDirectory,'running.lock')));assert(!existsSync(join(f.config.stateDirectory,'attempts')));
 }
});
