import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepareCandidate, runPreflight, assertCandidate, preflightPlanDigest } from './consumer-preflight.mjs';
import { automationDigest, generationDigest, hash } from './standing-config.mjs';
import { syntheticArchive } from './fixtures/release.mjs';
import { declaration } from './fixtures/reviewed-expectations.mjs';
import { dependencyLock } from './fixtures/dependency-lock.mjs';
const node='/Users/jaymini/.local/share/estimate-runtime/node-v24.21.0-darwin-arm64/bin/node';
function setup(t,{update=false,badBuild=false,service='estimate'}={}) {
 const node=service==='estimate'?'/Users/jaymini/.local/share/estimate-runtime/node-v24.21.0-darwin-arm64/bin/node':'/Users/jaymini/.local/share/runtimes/node/v22.23.2/bin/node';
 const root=realpathSync(mkdtempSync(join(tmpdir(),'consumer-preflight-')));t.after(()=>rmSync(root,{recursive:true,force:true}));
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
 const executables=Object.fromEntries([node,'/usr/bin/git',realpathSync('/usr/bin/tar'),'/usr/bin/sandbox-exec'].map(p=>[p,hash(readFileSync(p))]));
 const config={schemaVersion:1,node,pnpm:pin(pnpm),executables,readable:[],executionPath:node.slice(0,node.lastIndexOf('/'))+':/usr/bin',network:{},checks:[{name:'unit',file:node,args:['-e','0']},{name:'type',file:node,args:['-e','0']},{name:'lint',file:node,args:['-e','0']},{name:'build',file:node,args:['scripts/build.mjs']},{name:'package',file:node,args:['-e','0']}],artifactRelative:service==='estimate'?'release':'.next/standalone',e2e:{file:node,args:['scripts/e2e.mjs']},smoke:{file:node,args:['-e','0']},...(service==='estimate'?{releaseIntegrity:{file:node,args:['-e',"const assert=require('node:assert/strict'),fs=require('node:fs');assert.equal(process.argv[1],'release');assert.equal(JSON.parse(fs.readFileSync(process.argv[1]+'/manifest.json')).sourceCommit,process.env.NAEIL_SOURCE_REVISION);"]}}:{})};
 const input={schemaVersion:1,service,repository:service==='estimate'?'naeil-dev/abestimate':'naeil-dev/jev',sourceRoot:source,reviewedBaseSha:git(['rev-parse','HEAD']),isolatedRoot:join(root,'isolated'),release,previousVersion:'0.7.41',archive:pin(archivePath),fixture:pin(fixture),harnessSha256:null,generation:{automationSha256:automationDigest(new URL('../../',import.meta.url).pathname),trustedFiles:{...executables,[pnpm]:hash(readFileSync(pnpm))},executionPath:config.executionPath,stateSchemaVersion:2},config};
 // Harness closure is explicitly approved before preparation; never inferred after checks.
 input.harnessSha256=hash(JSON.stringify({'playwright.config.ts':hash(readFileSync(join(source,'playwright.config.ts'))),'tests/check.mjs':hash(readFileSync(join(source,'tests/check.mjs')))}));
 input.approval={approvedBy:'synthetic',approvalRef:'synthetic-only',planSha256:preflightPlanDigest(input)};
 writeFileSync(join(root,'STOP'),'standing remains stopped',{mode:0o600});
 return {root,input,config,git};
}
import {createHash} from 'node:crypto';
function awaitHash512(bytes){return createHash('sha512').update(bytes).digest('base64');}
const candidateBinding=c=>Object.fromEntries(['service','repository','reviewedBaseSha','candidateSourceSha','treeSha','lockfileSha256','release','expectationsSha256','harnessSha256','generationSha256','preflightConfigSha256','preflightPlanSha256'].map(key=>[key,c[key]]));
test('generation is separate from config/authorization/candidate receipts and rejects extra identities',()=>{
 const value={automationSha256:'a'.repeat(64),trustedFiles:{'/runtime/node':'b'.repeat(64)},executionPath:'/runtime:/usr/bin',stateSchemaVersion:2};
 assert.match(generationDigest(value),/^[a-f0-9]{64}$/);
 assert.throws(()=>generationDigest({...value,configSha256:'c'.repeat(64)}),/generation|identity|field/);
 assert.notEqual(generationDigest(value),generationDigest({...value,stateSchemaVersion:3}));
});
test('STOP-safe synthetic candidate E2E uses retained artifact, package bytes, same source commit and one transferable bundle',{skip:process.platform!=='darwin'?'actual macOS sandbox required; unsupported OS is fail-closed':false},async t=>{
 const f=setup(t);const base=f.input.reviewedBaseSha;const prepared=await prepareCandidate(f.input);
 assert.equal(prepared.candidateSourceSha,base);assert.equal(prepared.passed,false);assert(existsSync(prepared.bundle.path));
 const passed=await runPreflight(prepared,f.config);assert.equal(passed.passed,true);assert.equal(passed.candidateSourceSha,base);
 assert(passed.checks.some(check=>check.name==='release-integrity'&&check.exitCode===0));
 assertCandidate(passed,{...candidateBinding(passed),service:'estimate',repository:f.input.repository,reviewedBaseSha:base,candidateSourceSha:base,generationSha256:generationDigest(f.input.generation),release:f.input.release});
 await assert.rejects(()=>runPreflight(prepared,f.config),/already|single|replay/);
 assert.equal(f.git(['rev-parse','HEAD']),base);assert.equal(readFileSync(join(f.root,'STOP'),'utf8'),'standing remains stopped');
 const checkout=join(f.input.isolatedRoot,'checkout');assert.equal(execFileSync('/usr/bin/git',['rev-parse','HEAD'],{cwd:checkout,encoding:'utf8'}).trim(),base);
 writeFileSync(join(passed.artifact.directory,'app/identity.json'),'rebuilt');assert.throws(()=>assertCandidate(passed,candidateBinding(passed)),/artifact|digest|manifest/i);
});
test('dependency-only candidate is committed once; validation never creates another commit',{skip:process.platform!=='darwin'?'actual macOS sandbox required; unsupported OS is fail-closed':false},async t=>{
 const f=setup(t,{update:true});const c=await prepareCandidate(f.input);assert.notEqual(c.candidateSourceSha,c.reviewedBaseSha);
 const result=await runPreflight(c,f.config);assert.equal(result.candidateSourceSha,c.candidateSourceSha);
 const changed=execFileSync('/usr/bin/git',['diff-tree','--no-commit-id','--name-only','-r',c.candidateSourceSha],{cwd:c.checkout,encoding:'utf8'}).trim().split('\n').sort();
 assert.deepEqual(changed,['package.json','pnpm-lock.yaml','vendor/naeil-ui-0.7.42.tgz']);
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
 const f=setup(t,{service:'jev'});const candidate=await prepareCandidate(f.input);const result=await runPreflight(candidate,f.config);
 assertCandidate(result,{...candidateBinding(result),service:'jev',repository:'naeil-dev/jev',candidateSourceSha:candidate.candidateSourceSha,generationSha256:candidate.generationSha256});
 assert.equal(result.artifact.standalonePath,result.artifact.directory);assert.match(result.artifact.sha256,/^[a-f0-9]{64}$/);
 const manifest=JSON.parse(readFileSync(result.artifact.manifestPath));const expected=hash(JSON.stringify(Object.fromEntries(Object.entries(manifest).sort().map(([key,value])=>[key,Object.fromEntries(Object.entries(value).sort())]))));
 assert.equal(result.artifact.manifestSha256,expected);
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
 const f=setup(t);f.config.releaseIntegrity.args=['-e','process.exit(1)'];f.input.approval.planSha256=preflightPlanDigest(f.input);
 const candidate=await prepareCandidate(f.input);await assert.rejects(()=>runPreflight(candidate,f.config),/preflight failed/i);
 const check=JSON.parse(readFileSync(join(candidate.root,'input/receipts/release-integrity.json')));assert.equal(check.exitCode,1);
 assert(!existsSync(join(candidate.root,'artifact/selected/receipt.json')));assert(!existsSync(join(candidate.root,'input/passed.json')));
});
