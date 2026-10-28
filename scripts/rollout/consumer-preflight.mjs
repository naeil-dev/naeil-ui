/** STOP-safe isolated preparation only. No native bridge, live policy or resume path. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, closeSync, constants, fchmodSync, fstatSync, fsyncSync, openSync, copyFileSync, cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { atomicJSON, automationDigest, fingerprint, generationDigest, hash, HEX, JSON_LIMITS, privateDirectory, readPrivateBytes, readPrivateJSON, REVISION, VERSION } from './standing-config.mjs';
import { assertDependencyDelta, dependencyTarget } from './update-consumer.mjs';
import { frozenPackageIndex, runtimeIndex } from './package-runtime.mjs';
import { copyCodeTree, codeManifest, inspectEstimateRelease, inspectJevStandalone } from './consumer-artifact.mjs';
import { fixtureManifest } from './jev-candidate.mjs';
import { validateReleaseExpectations, selectExpectationProfile } from './release-expectations.mjs';
import { createSandbox, executeSandbox, networkManifest, sanitizedEnvironment, treeDigest, treeManifest, readBoundedSource } from './preflight-sandbox.mjs';
import { verifySandbox } from './preflight-sandbox.mjs';

const AUTOMATION_ROOT=resolve(fileURLToPath(new URL('../../',import.meta.url)));
const under=(path,root)=>path===root||path.startsWith(root+sep);
const keys=(value,allowed)=>assert(value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(key=>allowed.includes(key)),'Unsupported preflight input/config field; operational config prohibited');
const reference=path=>{const bytes=readFileSync(path);return {path,sha256:hash(bytes),bytes:bytes.length};};
function checkedReference(ref,maxBytes=JSON_LIMITS.transport) {
 keys(ref,['path','sha256','bytes']);assert(HEX.test(ref.sha256)&&Number.isSafeInteger(ref.bytes)&&ref.bytes>0&&ref.bytes<=maxBytes,'Bounded exact file reference required');
 const bytes=readPrivateBytes(ref.path,maxBytes);assert.equal(bytes.length,ref.bytes,'Reference byte count mismatch');assert.equal(hash(bytes),ref.sha256,'Reference digest mismatch');return bytes;
}
export function preflightPlanDigest(input) {const plan={...input};delete plan.approval;return fingerprint(plan);}
const localPlan=input=>input.kind==='local-consumer-preflight';
/** Reuse depends on tested consumer/tool bytes, never a runner generation. */
export function preflightExecutionDigest(config) {
 return fingerprint({node:config.node,git:config.git??'/usr/bin/git',pnpm:config.pnpm,executables:config.executables,readable:config.readable??[],executionPath:config.executionPath});
}
function exclusiveIntent(path,value) {
 const bytes=Buffer.from(JSON.stringify(value));assert(bytes.length<=JSON_LIMITS.controlIndex,'Bounded preflight intent required');
 const fd=openSync(path,'wx',0o600);try{writeFileSync(fd,bytes);fsyncSync(fd);}finally{closeSync(fd);}const directory=openSync(dirname(path),'r');try{fsyncSync(directory);}finally{closeSync(directory);}
}
function configured(input) {
 assert.equal(process.platform,'darwin','Supported macOS sandbox required; no unsandboxed fallback');
 keys(input,['schemaVersion','kind','service','repository','sourceRoot','reviewedBaseSha','sourceHeadSha','isolatedRoot','release','previousVersion','archive','fixture','harnessSha256','generation','config','approval']);
 assert.equal(input.schemaVersion,1);assert(['estimate','jev'].includes(input.service),'Bounded consumer service required');
 assert.equal(input.repository,input.service==='estimate'?'naeil-dev/abestimate':'naeil-dev/jev','Exact repository binding required');
 assert(REVISION.test(input.reviewedBaseSha)&&HEX.test(input.harnessSha256),'Reviewed exact source and harness closure required');
 if(input.sourceHeadSha!==undefined)assert(REVISION.test(input.sourceHeadSha),'Exact dependency-only source HEAD required');
 if(localPlan(input)) {
  assert(!Object.hasOwn(input,'generation')&&!Object.hasOwn(input,'approval'),'Local preflight cannot carry legacy execution authority');
 }else {
  assert(input.kind===undefined,'Unknown preflight kind');
  assert(input.approval?.approvedBy?.trim()&&input.approval?.approvalRef?.trim(),'Recorded exact preflight approval required');
  assert.equal(input.approval.planSha256,preflightPlanDigest(input),'Exact preflight plan approval mismatch');
  generationDigest(input.generation);
  assert.equal(automationDigest(AUTOMATION_ROOT),input.generation.automationSha256,'Reviewed preflight automation bytes changed');
  for(const [path,digest] of Object.entries(input.generation.trustedFiles)) {assert(realpathSync(path)===path,'Canonical trusted generation path required');const stat=lstatSync(path);assert(stat.isDirectory()||stat.isFile(),'Trusted file/tree required');assert.equal(stat.isDirectory()?treeDigest(path):hash(readFileSync(path)),digest,'Trusted generation bytes changed');}
 }
 const c=input.config;keys(c,['schemaVersion','node','git','pnpm','executables','readable','executionPath','network','checks','artifactRelative','releaseIntegrity','e2e','smoke','environment','dependencyStore']);assert.equal(c.schemaVersion,1);
 if(c.git!==undefined)assert(c.executables[c.git]&&isAbsolute(c.git),'Explicit pinned isolated Git required');
 assert.equal(c.node,input.service==='estimate'?'/Users/jaymini/.local/share/estimate-runtime/node-v24.21.0-darwin-arm64/bin/node':'/Users/jaymini/.local/share/runtimes/node/v22.23.2/bin/node','Exact consumer Node runtime required');
 assert(typeof c.executionPath==='string'&&c.executionPath.split(':').every(path=>isAbsolute(path)&&resolve(path)===path),'Explicit execution PATH required');
 if(!localPlan(input))assert.equal(c.executionPath,input.generation.executionPath,'Generation PATH mismatch');
 for(const [path,digest] of Object.entries(c.executables)) {
  if(!localPlan(input))assert.equal(input.generation.trustedFiles[path],digest,'Executable absent from generation trusted closure');
  assert(HEX.test(digest)&&realpathSync(path)===path&&lstatSync(path).isFile(),'Canonical pinned executable required');assert.equal(hash(readFileSync(path)),digest,'Pinned executable changed');
 }
 if(!localPlan(input))assert.equal(input.generation.trustedFiles[c.pnpm.path],c.pnpm.sha256,'pnpm helper absent from generation trusted closure');
 assert(isAbsolute(c.pnpm.path)&&realpathSync(c.pnpm.path)===c.pnpm.path&&lstatSync(c.pnpm.path).isFile(),'Canonical pnpm helper required');assert.equal(hash(readFileSync(c.pnpm.path)),c.pnpm.sha256,'Pinned pnpm helper changed');
 for(const entry of c.readable??[]) {
  if(!localPlan(input))assert.equal(input.generation.trustedFiles[entry.path],entry.sha256,'Runtime read closure absent from generation identity');
  assert(HEX.test(entry.sha256)&&realpathSync(entry.path)===entry.path,'Canonical pinned read closure required');assert.equal(lstatSync(entry.path).isDirectory()?treeDigest(entry.path):hash(readFileSync(entry.path)),entry.sha256,'Runtime read closure changed');assert(!under(input.sourceRoot,entry.path)&&!under(entry.path,input.sourceRoot),'Runtime read closure overlaps source clone');
 }
 assert(c.executables[c.node]&&c.executables['/usr/bin/git']&&c.executables[realpathSync('/usr/bin/tar')]&&c.executables['/usr/bin/sandbox-exec'],'Pinned node/git/tar/sandbox executables required');
 assert(Array.isArray(c.checks)&&c.checks.length>=5&&new Set(c.checks.map(c=>c.name)).size===c.checks.length,'Unique named check commands required');
 assert(!c.checks.some(check=>['install','install-frozen','archive','release-integrity','e2e','smoke'].includes(check.name)),'Reserved preflight stage name');
 for(const name of ['unit','type','lint','build','package']) assert(c.checks.some(c=>c.name===name),'Pinned unit/type/lint/build/package checks required');
 assert(c.checks.findIndex(c=>c.name==='build')>Math.max(...['unit','type','lint'].map(name=>c.checks.findIndex(c=>c.name===name))),'Final build must follow unit/type/lint checks');
 assert(c.checks.at(-1).name==='package','Packaging must follow final production build');
 if(input.service==='estimate') {assert(c.releaseIntegrity,'Estimate release integrity gate required');assert(c.smoke,'Estimate standalone data/auth/recovery smoke gate required');}
 assert(c.e2e,'Actual selected-artifact E2E command required');
 for(const command of [...c.checks,c.e2e,...(c.smoke?[c.smoke]:[]),...(c.releaseIntegrity?[c.releaseIntegrity]:[])]) {if(command.name!==undefined)assert(/^[a-z][a-z0-9-]{0,63}$/.test(command.name),'Safe exact check name required');keys(command,['name','file','args','env','timeoutMs','roles']);assert(c.executables[command.file]&&command.file!=='/usr/bin/sandbox-exec','Pinned approved command required');assert(Array.isArray(command.args)&&command.args.every(a=>typeof a==='string'),'Exact command arguments required');}
 assert(typeof c.artifactRelative==='string'&&c.artifactRelative&&!isAbsolute(c.artifactRelative)&&!c.artifactRelative.split('/').some(p=>['','..','.'].includes(p)),'Exact relative package output required');
 keys(input.release,['releaseId','version','contractVersion','sourceRevision','archiveSha256','chromeSha256','accountSha256']);
 assert(VERSION.test(input.release.version)&&input.release.contractVersion==='1'&&REVISION.test(input.release.sourceRevision),'Exact supported release tuple required');
 for(const key of ['archiveSha256','chromeSha256','accountSha256'])assert(HEX.test(input.release[key]),'Exact release digest required');
 assert.equal(input.archive.sha256,input.release.archiveSha256,'Frozen archive release mismatch');checkedReference(input.archive,64*1024*1024);
 return input;
}
function git(config,root,args,{raw=false}={}) {
 if(args[0]!=='clone') {const result=handoffGit(root,args,{git:'/usr/bin/git',executionPath:config.executionPath,gitSha256:config.executables['/usr/bin/git']}).toString();return raw?result:result.trim();}
 assert.equal(hash(readFileSync('/usr/bin/git')),config.executables['/usr/bin/git'],'Pinned Git bytes changed');
 const result=execFileSync('/usr/bin/git',['-c','core.hooksPath=/dev/null','-c','core.fsmonitor=false','-c','commit.gpgsign=false',...args],{cwd:root,encoding:'utf8',env:sanitizedEnvironment({executionPath:config.executionPath,tmp:root,cache:root}),stdio:['ignore','pipe','pipe'],maxBuffer:2097152});return raw?result:result.trim();
}
async function isolatedGit(input,root,args,{raw=false,writable=false}={}) {
 const result=await executeSandbox(snapshotSandbox(input,root,[],writable),{file:input.config.git??'/usr/bin/git',args:['--git-dir='+join(root,'git'),'--work-tree='+join(root,'checkout'),'-c','core.hooksPath=/dev/null','-c','core.fsmonitor=false','-c','commit.gpgsign=false',...args],timeoutMs:120000});
 assert.equal(result.exitCode,0,'Isolated Git inspection/transport failed');return raw?result.stdout:result.stdout.trim();
}
const SOURCE_READER=`const {constants,closeSync,fstatSync,lstatSync,openSync,readSync,readdirSync,realpathSync}=require('node:fs');const {isAbsolute,resolve,sep,join}=require('node:path');const assert=require('node:assert/strict');const hash=bytes=>require('node:crypto').createHash('sha256').update(bytes).digest('hex');const readBoundedSource=${readBoundedSource.toString()};`;
async function sourceInspection(input,root,code) {
 const result=await executeSandbox(snapshotSandbox(input,root,[]),{file:input.config.node,args:['-e',SOURCE_READER+code]});assert.equal(result.exitCode,0,'Isolated bounded source inspection failed');return result.stdout;
}
async function sourceBytes(input,root,path) {
 return Buffer.from(await sourceInspection(input,root,`process.stdout.write(readBoundedSource(${JSON.stringify(join(root,'checkout',path))},${JSON.stringify(join(root,'checkout'))}).toString('base64'));`),'base64');
}
async function sourceIdentity(input,root) {
 return {candidateSourceSha:await isolatedGit(input,root,['rev-parse','HEAD']),treeSha:await isolatedGit(input,root,['rev-parse','HEAD^{tree}']),lockfileSha256:hash(await sourceBytes(input,root,'pnpm-lock.yaml'))};
}
async function assertSource(candidate,input) {
 assert.deepEqual(await sourceIdentity(input,candidate.root),Object.fromEntries(['candidateSourceSha','treeSha','lockfileSha256'].map(key=>[key,candidate[key]])),'Exact candidate source/tree/lock changed');
 assert.equal((await sourceBytes(input,candidate.root,'.git')).toString(),`gitdir: ${join(candidate.root,'git')}\n`,'Immutable Git directory pointer changed');
 assert.equal(await isolatedGit(input,candidate.root,['status','--porcelain','--untracked-files=normal']),'','Candidate checkout changed during checks');
 const harness=await sourceInspection(input,candidate.root,`const root=${JSON.stringify(candidate.checkout)},files={};function walk(directory){assert.equal(realpathSync(directory),directory,'Source directory link refused');for(const name of readdirSync(directory).sort()){const path=join(directory,name),stat=lstatSync(path);assert(!stat.isSymbolicLink(),'Source test link refused');if(stat.isDirectory())walk(path);else files[path.slice(root.length+1)]=hash(readBoundedSource(path,root));}}walk(join(root,'tests'));files['playwright.config.ts']=hash(readBoundedSource(join(root,'playwright.config.ts'),root));process.stdout.write(hash(JSON.stringify(Object.fromEntries(Object.entries(files).sort(([a],[b])=>a<b?-1:a>b?1:0)))));`);
 assert.equal(harness,candidate.harnessSha256,'Reviewed harness changed');
}
function transport(input,inputDirectory) {
 const original=JSON.parse(checkedReference(input.fixture));keys(original,['schemaVersion','kind','release','account','expectations','routingProfile']);
 assert(original.schemaVersion===2&&original.kind==='standing-ui-reference'&&Object.hasOwn(original,'routingProfile'),'Explicit schema2 fixture required');assert.deepEqual(original.release,input.release,'Fixture release tuple mismatch');
 const copied={...original};
 for(const name of ['account','expectations']) {const bytes=checkedReference(original[name]);const path=join(inputDirectory,`${name}.json`);writeFileSync(path,bytes,{mode:0o600,flag:'wx'});copied[name]=reference(path);}
 assert.equal(copied.account.sha256,input.release.accountSha256,'Account release binding mismatch');
 const account=JSON.parse(readFileSync(copied.account.path));assert(account.schemaVersion===1&&account.kind==='independent-account-render'&&Array.isArray(account.cases)&&account.cases.length>0,'Independent account render cases required');assert(account.frozen===true||(input.release.version==='0.7.1'&&copied.account.sha256==='158dd3bca9d5c4dd8068cf97d70de1c65d7b187f3057f9388409a7685b447bc5'),'Frozen account render required');assert.equal(account.sourceRevision,input.release.sourceRevision,'Account package-source binding mismatch');assert.equal(account.archiveSha256,input.release.archiveSha256,'Account package archive binding mismatch');assert.deepEqual(account.ui,{version:input.release.version,contractVersion:input.release.contractVersion},'Account UI binding mismatch');for(const entry of account.cases)assert.equal(entry.render?.uiVersion,input.release.version,'Account render version mismatch');
 const release={...input.release,archive:{sha256:input.release.archiveSha256},contract:{version:input.release.contractVersion,sha256:input.release.chromeSha256},account:{sha256:input.release.accountSha256}};
 const expectations=validateReleaseExpectations(JSON.parse(readFileSync(copied.expectations.path)),release);selectExpectationProfile(expectations,copied.routingProfile??undefined);
 const path=join(inputDirectory,'fixture.json');atomicJSON(path,copied);return reference(path);
}
function snapshotSandbox(input,root,roles,gitWritable=false) {
 const all=networkManifest(input.service,input.config.network);
 if(roles!==undefined) {assert(Array.isArray(roles)&&roles.every(role=>Object.hasOwn(all.roles,role)),'Unapproved network stage role');}
 // The canonical manifest is retained; stage profiles use its exact reviewed endpoints.
 return createSandbox({schemaVersion:1,root,writable:['checkout','output','tmp','cache',...(gitWritable?['git']:[])].map(name=>join(root,name)),readOnly:['input','artifact',...(gitWritable?[]:['git'])].map(name=>join(root,name)),runtime:input.config.node,executables:input.config.executables,executionPath:input.config.executionPath,readable:[...(input.config.readable??[]),{path:input.config.pnpm.path,sha256:input.config.pnpm.sha256}],endpoints:all,roles});
}
async function enforcement(input,root,sandbox,phase='prepare') {
 const probes=join(root,`probes-${phase}`);mkdirSync(probes,{mode:0o700});const outsideRead=join(probes,'secret'),nativeExecutable=join(probes,'native');
 writeFileSync(outsideRead,'synthetic-private-canary',{mode:0o600,flag:'wx'});writeFileSync(nativeExecutable,'#!/bin/sh\nexit 0\n',{mode:0o700,flag:'wx'});
 const immutableFile=join(root,'input',`immutable-canary-${phase}`);writeFileSync(immutableFile,'immutable-synthetic-canary',{mode:0o600,flag:'wx'});
 const proof=await verifySandbox(sandbox,{outsideRead,immutableFile,nativeExecutable});atomicJSON(join(root,'output',`isolation-${phase}.json`),proof);return proof;
}
async function stage(sandbox,command,output,name,env={},inspect) {
 for(const [key,value] of Object.entries(command.env??{}))if(Object.hasOwn(env,key))assert.equal(value,env[key],'Command cannot replace bound preflight environment');
 const result=await executeSandbox(sandbox,{...command,env:{...env,...command.env}});
 const receipt={schemaVersion:1,name,exitCode:result.exitCode,commandSha256:fingerprint(command),profileSha256:sandbox.profileSha256,stdoutSha256:result.stdoutSha256,stderrSha256:result.stderrSha256};
 const evidence=join(dirname(output),'input','receipts');privateDirectory(evidence,true);atomicJSON(join(evidence,`${name}.json`),receipt);atomicJSON(join(output,`${name}.json`),receipt);
 assert.equal(result.exitCode,0,`Isolated stage failed: ${name}`);if(inspect)inspect(result);return receipt;
}
function parity(candidate) {
 const expected=frozenPackageIndex(checkedReference(candidate.archive,64*1024*1024));
 const installed=realpathSync(join(candidate.checkout,'node_modules/@naeil/ui'));assert(under(installed,join(candidate.checkout,'node_modules')),'Installed UI escapes isolated checkout');
 const actual={};
 function walk(dir,prefix='') {for(const name of readdirSync(dir).sort()) {const path=join(dir,name),stat=lstatSync(path),key=prefix+name;assert(!stat.isSymbolicLink(),'Frozen UI package contains symlink');if(stat.isDirectory()) {if(key==='node_modules') {assert(readdirSync(path).every(n=>n==='.bin'),'Unexpected UI nested dependency');continue;}walk(path,key+'/');}else {assert(stat.isFile()&&stat.nlink===1,'Regular installed frozen file required');actual[key]={sha256:hash(readFileSync(path)),bytes:stat.size};}}}
 walk(installed);assert.deepEqual(actual,expected,'Installed frozen package file parity mismatch');return {passed:true,files:Object.keys(expected).length,sha256:fingerprint(expected)};
}

function copyPreparedStore(source,destination) {
 cpSync(source,destination,{recursive:true,dereference:false,errorOnExist:true,force:false,verbatimSymlinks:true});
 // cpSync applies the parent's restrictive umask. Restore only copied regular
 // members; a descriptor must never follow a substituted link or external target.
 function modes(original,copied) {
  const stat=lstatSync(original);if(stat.isSymbolicLink())return;
  assert(realpathSync(copied)===copied,'Canonical copied dependency store member required');
  const fd=openSync(copied,constants.O_RDONLY|constants.O_NOFOLLOW);
  try {const target=fstatSync(fd);assert(stat.isDirectory()?target.isDirectory():stat.isFile()&&stat.nlink===1&&target.isFile()&&target.nlink===1,'Regular copied dependency store member required');fchmodSync(fd,stat.mode&0o777);}finally{closeSync(fd);}
  if(stat.isDirectory())for(const name of readdirSync(original))modes(join(original,name),join(copied,name));
 }
 modes(source,destination);
}

export function offlineInstallArgs(pnpm,root,unchanged) {
 const store=join(root,'cache','store');
 return [pnpm,'install',unchanged?'--frozen-lockfile':'--no-frozen-lockfile','--ignore-scripts','--offline','--store-dir',store,'--cache-dir',store,'--package-import-method=copy'];
}

export async function prepareCandidate(input,dependencies={}) {
 assert.deepEqual(dependencies,{},'Preflight enforcement cannot be replaced by injected command runners');configured(input);
 const config=input.config,root=input.isolatedRoot;
 assert(isAbsolute(root)&&resolve(root)===root&&!existsSync(root),'Fresh explicit isolated root required');
 assert(isAbsolute(input.sourceRoot)&&realpathSync(input.sourceRoot)===input.sourceRoot,'Canonical read-only local source required');
 const sourceHeadSha=input.sourceHeadSha??input.reviewedBaseSha;
 assert.equal(git(config,input.sourceRoot,['rev-parse','HEAD']),sourceHeadSha,'Approved source HEAD differs from checkout');
 assert.equal(git(config,input.sourceRoot,['status','--porcelain','--untracked-files=normal']),'','Reviewed source must be clean');
 assertDependencySource(input.sourceRoot,input.reviewedBaseSha,sourceHeadSha,{git:'/usr/bin/git',executionPath:config.executionPath,gitSha256:config.executables['/usr/bin/git']});
 assert.equal(fingerprint(fixtureManifest(input.sourceRoot)),input.harnessSha256,'Reviewed source harness closure mismatch');
 privateDirectory(root,true);for(const name of ['output','tmp','cache','input','artifact'])mkdirSync(join(root,name),{mode:0o700});
 const output=join(root,'output');atomicJSON(join(output,'prepare-intent.json'),{schemaVersion:1,planSha256:preflightPlanDigest(input),passed:false});
 try {
  const checkout=join(root,'checkout');git(config,root,['clone','--no-local','--no-hardlinks','--no-checkout','--separate-git-dir='+join(root,'git'),'--',input.sourceRoot,checkout]);git(config,checkout,['checkout','--detach',sourceHeadSha]);
  for(const path of ['package.json','pnpm-lock.yaml','vendor'])assert(realpathSync(join(checkout,path))===join(checkout,path),'Candidate source key path symlink refused');
  const archive=join(root,'input','ui.tgz');writeFileSync(archive,checkedReference(input.archive,64*1024*1024),{mode:0o600,flag:'wx'});
  const fixture=transport(input,join(root,'input'));atomicJSON(join(root,'input','approved-plan.json'),input);
  if(config.dependencyStore) {keys(config.dependencyStore,['path','sha256']);assert(isAbsolute(config.dependencyStore.path)&&realpathSync(config.dependencyStore.path)===config.dependencyStore.path&&!under(config.dependencyStore.path,root),'Canonical separate prepared dependency store required');assert.equal(treeDigest(config.dependencyStore.path),config.dependencyStore.sha256,'Prepared dependency store bytes changed');copyPreparedStore(config.dependencyStore.path,join(root,'cache','store'));assert.equal(treeDigest(join(root,'cache','store')),config.dependencyStore.sha256,'Prepared dependency store copy changed');}
  const sandbox=snapshotSandbox(input,root),isolation=await enforcement(input,root,sandbox);
  const installSandbox=snapshotSandbox(input,root,[]);
  const versionResult=await executeSandbox(installSandbox,{file:config.node,args:[config.pnpm.path,'--version']});assert.equal(versionResult.stdout.trim(),'10.30.3','Exact pnpm 10.30.3 runtime required');
  const before={packageJSON:await sourceBytes(input,root,'package.json'),lockfile:await sourceBytes(input,root,'pnpm-lock.yaml')},pkg=JSON.parse(before.packageJSON);
  assert.equal(pkg.packageManager,'pnpm@10.30.3','Exact pnpm consumer pin required');
  const dependency=pkg.dependencies?.['@naeil/ui'];assert(/^file:vendor\/naeil-ui-[0-9A-Za-z.+-]+\.tgz$/.test(dependency||''),'Exact vendored UI dependency required');
  const oldPath=join(checkout,dependency.slice(5));assert.equal(realpathSync(oldPath),oldPath,'Vendor archive symlink refused');
  const oldPkg=runtimeIndex(readFileSync(oldPath)).package;
  const target=dependencyTarget(before.packageJSON,{version:input.release.version,previousVersion:input.previousVersion,existingVersion:oldPkg.version,existingArchiveSha256:hash(readFileSync(oldPath)),archiveSha256:input.release.archiveSha256});
  if(!target.unchanged) {const path=join(checkout,target.vendor);if(existsSync(path))assert.equal(hash(readFileSync(path)),input.release.archiveSha256,'Existing frozen archive differs');else writeFileSync(path,readFileSync(archive),{flag:'wx'});writeFileSync(join(checkout,'package.json'),target.packageJSON);}
  // Only offline script-disabled installation is supported. A missing prepared store
  // is a failure; no consumer or production network access is added to make it pass.
  const installArgs=offlineInstallArgs(config.pnpm.path,root,target.unchanged);
  const checks=[await stage(installSandbox,{file:config.node,args:installArgs,timeoutMs:1800000},output,'install')];
  checks.push(await stage(installSandbox,{file:config.node,args:[...installArgs.filter(arg=>arg!=='--no-frozen-lockfile'&&arg!=='--frozen-lockfile'),'--frozen-lockfile'],timeoutMs:1800000},output,'install-frozen'));
  assertDependencyDelta(before,{packageJSON:await sourceBytes(input,root,'package.json'),lockfile:await sourceBytes(input,root,'pnpm-lock.yaml')});
  const integrity='sha512-'+createHash('sha512').update(readFileSync(archive)).digest('base64');assert((await sourceBytes(input,root,'pnpm-lock.yaml')).toString().includes(`integrity: ${integrity}`),'Lockfile must bind exact frozen archive');
  const changed=(await isolatedGit(input,root,['status','--porcelain','-z','--untracked-files=all'],{raw:true})).split('\0').filter(Boolean).map(line=>line.slice(3));
  assert(changed.every(path=>['package.json','pnpm-lock.yaml',target.vendor].includes(path)),'Unapproved source or executable changes during install');
  if(changed.length) {await isolatedGit(input,root,['add','--',...changed],{writable:true});await isolatedGit(input,root,['-c','user.name=Naeil preflight','-c','user.email=preflight@naeil.dev','commit','-m',`chore: prepare exact @naeil/ui ${input.release.version}`],{writable:true});}
  const identity=await sourceIdentity(input,root),bundlePath=join(root,'input','candidate.bundle'),bundleOutput=join(root,'output','candidate.bundle');await isolatedGit(input,root,['bundle','create',bundleOutput,'HEAD']);writeFileSync(bundlePath,readBoundedSource(bundleOutput,join(root,'output'),67108864),{mode:0o600,flag:'wx'});await isolatedGit(input,root,['bundle','verify',bundlePath]);
  const candidate={schemaVersion:1,kind:'isolated-consumer-candidate',passed:false,service:input.service,repository:input.repository,reviewedBaseSha:input.reviewedBaseSha,...identity,release:input.release,expectationsSha256:JSON.parse(readFileSync(fixture.path)).expectations.sha256,harnessSha256:input.harnessSha256,...(localPlan(input)?{executionSha256:preflightExecutionDigest(config)}:{generationSha256:generationDigest(input.generation)}),preflightPlanSha256:preflightPlanDigest(input),preflightConfigSha256:fingerprint(config),root,checkout,output,archive:reference(archive),fixture,bundle:reference(bundlePath),plan:reference(join(root,'input','approved-plan.json')),isolation,checks};
  if(input.sourceHeadSha!==undefined)candidate.sourceHeadSha=input.sourceHeadSha;
  candidate.packageParity=parity(candidate);await assertSource(candidate,input);atomicJSON(join(root,'input','prepared.json'),candidate);atomicJSON(join(output,'prepared.json'),candidate);return candidate;
 }catch(error) {atomicJSON(join(output,'prepare-failed.json'),{schemaVersion:1,passed:false,planSha256:preflightPlanDigest(input),reasonSha256:hash(String(error.message))});throw new Error('Isolated candidate preparation failed; retained stage evidence', {cause:error});}
}

export async function runPreflight(candidate,config,dependencies={}) {
 assert.deepEqual(dependencies,{},'Preflight enforcement cannot be replaced');assert.equal(candidate.passed,false,'Only prepared candidate accepted');
 privateDirectory(candidate.root);
 for(const [key,suffix] of [['checkout','checkout'],['output','output']])assert.equal(candidate[key],join(candidate.root,suffix),'Exact isolated candidate path required');
 for(const [key,name] of [['plan','approved-plan.json'],['archive','ui.tgz'],['fixture','fixture.json'],['bundle','candidate.bundle']])assert.equal(candidate[key]?.path,join(candidate.root,'input',name),'Exact immutable candidate input path required');
 assert.deepEqual(candidate,readPrivateJSON(join(candidate.root,'input','prepared.json')),'Retained exact candidate binding changed');
 const input=readPrivateJSON(candidate.plan.path);assert.equal(hash(readPrivateBytes(candidate.plan.path)),candidate.plan.sha256,'Approved plan bytes changed');configured(input);assert.equal(candidate.root,input.isolatedRoot,'Candidate isolated root mismatch');
 assert.equal(fingerprint(config),candidate.preflightConfigSha256,'Exact approved build/test config changed');assert.deepEqual(config,input.config,'Candidate configuration mismatch');
 checkedReference(candidate.bundle,64*1024*1024);checkedReference(candidate.fixture);
 const intent=join(candidate.root,'input','preflight-intent.json');assert(!existsSync(intent),'Single preflight attempt only; replay/rebuild requires a fresh candidate root');exclusiveIntent(intent,{schemaVersion:1,candidateSourceSha:candidate.candidateSourceSha,preflightPlanSha256:candidate.preflightPlanSha256});
 const checks=[...candidate.checks];
 try {
  await assertSource(candidate,input);
  const sandbox=snapshotSandbox(input,candidate.root);assert.equal(sandbox.profileSha256,candidate.isolation.profileSha256,'Isolation profile changed');
  assert.equal(candidate.isolation.passed,true,'Actual enforcement proof required');
  const isolation=await enforcement(input,candidate.root,sandbox,'checks');
  const before=parity(candidate);const env={...config.environment,NAEIL_SOURCE_REVISION:candidate.candidateSourceSha,NAEIL_UI_STANDING_MODE:'schema2',NAEIL_UI_STANDING_FIXTURE:candidate.fixture.path,NAEIL_PREFLIGHT_MODE:'isolated-v1',NAEIL_PREFLIGHT_NETWORK:join(candidate.root,'input','network.json')};
  const network=networkManifest(input.service,config.network);atomicJSON(env.NAEIL_PREFLIGHT_NETWORK,network);env.NAEIL_PREFLIGHT_NETWORK_SHA256=hash(readFileSync(env.NAEIL_PREFLIGHT_NETWORK));
  const temporary=join(candidate.root,'tmp');
  if(input.service==='jev') {
    const key=join(temporary,'synthetic-unit-key');writeFileSync(key,'synthetic-unit-fixture-key',{mode:0o600,flag:'wx'});env.JEV_DATA_DB=join(temporary,'synthetic-unit.sqlite');env.JEV_KEY_FILE=key;env.LUNA_KEY_FILE=key;
  }else {
    env.DATA_DIR=join(temporary,'synthetic-data');
    env.E2E_REPORT_PATH=join(candidate.output,'e2e-report.json');
    for(const name of ['SHARED_HEADER','SHELL','NAVIGATION','COMPANY_LAYOUT','LAYOUT']) {const path=join(candidate.output,name.toLowerCase());mkdirSync(path,{mode:0o700});env[name+'_EVIDENCE_DIR']=path;}
  }

  let packageOutput;
  for(const command of config.checks) {checks.push(await stage(snapshotSandbox(input,candidate.root,command.roles??(command.name==='unit'?(input.service==='estimate'?['estimateAuth','estimateHttp']:['jevIdentity']):[])),command,candidate.output,command.name,env,command.name==='package'?result=>{packageOutput=result.stdout;}:undefined));await assertSource(candidate,input);assert.deepEqual(parity(candidate),before,'Package bytes changed during checks');}
  let artifactRelative=config.artifactRelative;
  if(artifactRelative==='estimate-package-output') {
    assert.equal(input.service,'estimate');const matches=[...packageOutput.matchAll(/^Standalone prepared: (release\/[a-f0-9]{12}-[a-f0-9]{12})\s*$/gm)];assert.equal(matches.length,1,'One exact packaged Estimate output required');artifactRelative=matches[0][1];
  }
  const source=join(candidate.checkout,artifactRelative);assert(under(realpathSync(source),candidate.checkout),'Package output escapes checkout');treeManifest(source);
  const selected=join(candidate.root,'artifact','selected');mkdirSync(selected,{mode:0o700});
  let directory,metadata,manifestPath,archiveMembers;
  if(input.service==='estimate') {
    metadata=inspectEstimateRelease(source,candidate.candidateSourceSha,candidate.release);
    const packagedSha256=treeDigest(source);
    checks.push(await stage(snapshotSandbox(input,candidate.root,[]),{...config.releaseIntegrity,args:[...config.releaseIntegrity.args,artifactRelative]},candidate.output,'release-integrity',{...env,RELEASE_INTEGRITY_EVIDENCE_PATH:join(candidate.output,'release-integrity-evidence.json')}));
    assert.equal(treeDigest(source),packagedSha256,'Packaged release changed during integrity check');await assertSource(candidate,input);assert.deepEqual(parity(candidate),before);
    directory=join(selected,'release');mkdirSync(directory,{mode:0o700});
    copyCodeTree(join(source,'app'),join(directory,'app'));copyFileSync(join(source,'manifest.json'),join(directory,'manifest.json'));
    inspectEstimateRelease(directory,candidate.candidateSourceSha,candidate.release);manifestPath=join(directory,'manifest.json');archiveMembers=['app','manifest.json'];
  }else {
    metadata=inspectJevStandalone(source,candidate.candidateSourceSha,candidate.release);directory=join(selected,'standalone');copyCodeTree(source,directory,{normalizeLinks:true});
    assert.deepEqual(codeManifest(directory),metadata.manifest,'Jev artifact copy changed relative links/bytes');manifestPath=join(selected,'file-manifest.json');atomicJSON(manifestPath,metadata.manifest);archiveMembers=['standalone'];
  }
  const inventorySha256=treeDigest(directory),archiveOutput=join(candidate.output,'code.tar.gz');
  checks.push(await stage(snapshotSandbox(input,candidate.root,[]),{file:realpathSync('/usr/bin/tar'),args:['-czf',archiveOutput,'-C',input.service==='estimate'?directory:selected,...archiveMembers]},candidate.output,'archive'));
  const archiveSha256=hash(readFileSync(archiveOutput)),archivePath=join(selected,`${archiveSha256}.tar.gz`);copyFileSync(archiveOutput,archivePath);chmodSync(archivePath,0o600);
  const artifact={immutable:true,id:metadata.identity.artifactId,sourceRevision:candidate.candidateSourceSha,ui:metadata.identity.ui,releaseId:input.service==='estimate'?metadata.manifest.releaseId:candidate.release.releaseId,packageSha256:candidate.release.archiveSha256,sha256:archiveSha256,path:archivePath,storageRef:pathToFileURL(archivePath).href,directory,inventorySha256,manifestPath,manifestSha256:input.service==='estimate'?metadata.manifestSha256:hash(JSON.stringify(Object.fromEntries(Object.entries(metadata.manifest).sort().map(([key,entry])=>[key,Object.fromEntries(Object.entries(entry).sort())])))),buildId:input.service==='estimate'?metadata.manifest.buildId:metadata.buildId,...(input.service==='jev'?{standalonePath:directory}:{})};
  const selection={...metadata.identity,...artifact};
  atomicJSON(join(selected,'receipt.json'),selection);
  const selectionPath=join(candidate.root,'input','selected-artifact.json');atomicJSON(selectionPath,selection);
  const artifactEnv={...env,NAEIL_PREFLIGHT_ARTIFACT:directory,NAEIL_PREFLIGHT_ARTIFACT_RECEIPT:selectionPath};if(input.service==='estimate')artifactEnv.ESTIMATE_TEST_RELEASE=directory;else artifactEnv.JEV_TEST_STANDALONE=directory;
  if(config.smoke)checks.push(await stage(snapshotSandbox(input,candidate.root,input.service==='estimate'?['estimateSmoke','estimateAuth','estimateContender']:[]),config.smoke,candidate.output,'smoke',artifactEnv));
  assert.equal(treeDigest(directory),inventorySha256,'Packaged artifact changed during smoke');
  checks.push(await stage(snapshotSandbox(input,candidate.root,input.service==='estimate'?['estimateE2E','estimateAuth']:['jevE2E']),config.e2e,candidate.output,'e2e',artifactEnv));
  assert.equal(treeDigest(directory),inventorySha256,'Packaged artifact changed during E2E');await assertSource(candidate,input);assert.deepEqual(parity(candidate),before);checkedReference(candidate.fixture);const fixture=JSON.parse(readFileSync(candidate.fixture.path));checkedReference(fixture.account);checkedReference(fixture.expectations);
  const result={...candidate,passed:true,artifact,isolation,checks,packageParity:{before,after:parity(candidate)},completedAt:new Date().toISOString()};
  const receiptPath=join(candidate.root,'input','passed.json');atomicJSON(receiptPath,result);const returned={...result,receipt:reference(receiptPath)};atomicJSON(join(candidate.output,'passed.json'),returned);return returned;
 }catch(error) {atomicJSON(join(candidate.output,'failed.json'),{schemaVersion:1,passed:false,service:candidate.service,candidateSourceSha:candidate.candidateSourceSha,planSha256:candidate.preflightPlanSha256,checks,reasonSha256:hash(String(error.message))});throw new Error('Isolated consumer preflight failed; retained stage evidence',{cause:error});}
}

export function assertCandidate(candidate,binding) {
 assert.equal(candidate?.schemaVersion,1);assert.equal(candidate.passed,true,'Passed preflight candidate required');
 assert.equal(candidate.kind,'isolated-consumer-candidate','Supported exact candidate kind required');
 assert.equal(candidate.checkout,join(candidate.root,'checkout'),'Exact retained candidate checkout required');
 assert.equal(candidate.receipt?.path,join(candidate.root,'input','passed.json'),'Retained immutable passed receipt required');const {receipt,...payload}=candidate;assert.deepEqual(JSON.parse(checkedReference(receipt)),payload,'Immutable passed candidate receipt mismatch');
 const executionKey=Object.hasOwn(candidate,'executionSha256')?'executionSha256':'generationSha256';
 for(const key of ['service','repository','reviewedBaseSha','candidateSourceSha','treeSha','lockfileSha256','release','expectationsSha256','harnessSha256',executionKey,'preflightConfigSha256','preflightPlanSha256'])assert(Object.hasOwn(binding,key),'Complete independently approved candidate binding required');
 for(const [key,value] of Object.entries(binding))assert.deepEqual(candidate[key],value,`Exact candidate ${key} mismatch`);
 assert(REVISION.test(candidate.candidateSourceSha)&&REVISION.test(candidate.treeSha)&&HEX.test(candidate.lockfileSha256)&&HEX.test(candidate[executionKey]),'Exact candidate source/execution inputs required');
 assert(candidate.isolation?.passed===true&&candidate.packageParity?.before?.passed===true&&candidate.packageParity?.after?.passed===true,'Verified isolation and package parity required');
 assert(candidate.checks.every(check=>check.exitCode===0),'Failed check cannot yield reusable candidate');
 for(const name of ['install','install-frozen','unit','type','lint','build','package','e2e',...(candidate.service==='estimate'?['release-integrity','smoke']:[])])assert(candidate.checks.some(c=>c.name===name),'Missing completed candidate check');
 checkedReference(candidate.archive,64*1024*1024);checkedReference(candidate.bundle,64*1024*1024);checkedReference(candidate.fixture);
 const plan=JSON.parse(checkedReference(candidate.plan));assert.equal(candidate.preflightPlanSha256,preflightPlanDigest(plan),'Candidate preflight plan identity mismatch');assert.equal(candidate.preflightConfigSha256,fingerprint(plan.config),'Candidate preflight config identity mismatch');
 if(localPlan(plan)) {assert(!Object.hasOwn(candidate,'generationSha256'),'Local candidate cannot depend on a runner generation');assert.equal(candidate.executionSha256,preflightExecutionDigest(plan.config),'Candidate execution inputs changed');}
 else {assert(!Object.hasOwn(candidate,'executionSha256'),'Legacy candidate execution identity mismatch');assert.equal(candidate.generationSha256,generationDigest(plan.generation),'Candidate generation identity mismatch');}
 for(const key of ['service','repository','reviewedBaseSha','release','harnessSha256'])assert.deepEqual(candidate[key],plan[key],`Candidate approved plan ${key} mismatch`);
 assert.equal(candidate.root,plan.isolatedRoot,'Candidate plan isolated root mismatch');
 assert.equal(candidate.sourceHeadSha??candidate.reviewedBaseSha,plan.sourceHeadSha??plan.reviewedBaseSha,'Candidate source HEAD provenance changed');
 if(plan.sourceHeadSha!==undefined)assert.equal(binding.sourceHeadSha,candidate.sourceHeadSha,'Independently approved candidate source HEAD required');
 const fixture=JSON.parse(checkedReference(candidate.fixture));checkedReference(fixture.account);checkedReference(fixture.expectations);
 assert.equal(fixture.schemaVersion,2,'Unsupported candidate fixture schema');assert.equal(fixture.kind,'standing-ui-reference');assert.deepEqual(fixture.release,candidate.release,'Fixture release tuple changed');assert.equal(fixture.account.sha256,candidate.release.accountSha256,'Candidate account reference changed');assert.equal(fixture.expectations.sha256,candidate.expectationsSha256,'Candidate expectations reference changed');
 assert.equal(candidate.artifact.sourceRevision,candidate.candidateSourceSha,'Artifact source mismatch');assert.equal(treeDigest(candidate.artifact.directory),candidate.artifact.inventorySha256,'Artifact manifest/digest changed');assert.equal(hash(readPrivateBytes(candidate.artifact.path,1073741824)),candidate.artifact.sha256,'Artifact archive digest changed');
 const metadata=candidate.service==='estimate'?inspectEstimateRelease(candidate.artifact.directory,candidate.candidateSourceSha,candidate.release):inspectJevStandalone(candidate.artifact.directory,candidate.candidateSourceSha,candidate.release);
 assert.equal(candidate.artifact.id,metadata.identity.artifactId,'Candidate artifact identity changed');assert.deepEqual(candidate.artifact.ui,metadata.identity.ui,'Candidate artifact UI changed');assert.equal(candidate.artifact.packageSha256,candidate.release.archiveSha256,'Candidate artifact frozen archive changed');
 if(candidate.service==='estimate')assert.equal(candidate.artifact.manifestSha256,metadata.manifestSha256,'Candidate native manifest changed');
 else assert.deepEqual(readPrivateJSON(candidate.artifact.manifestPath),metadata.manifest,'Candidate native manifest changed');
 return candidate;
}

// Only inert clone identity/ref metadata may enter host Git. Parse bounded bytes
// from stdin outside any repository with includes disabled BEFORE status, fetch,
// checkout, or even repository discovery can consult local executable settings.
const HANDOFF_CONFIG = new Map([
 ['core.repositoryformatversion',value=>value==='0'],['core.bare',value=>value==='false'],
 ...['filemode','logallrefupdates','ignorecase','precomposeunicode'].map(key=>['core.'+key,value=>/^(true|false)$/.test(value)]),
 ...['user.name','user.email','remote.origin.url','remote.origin.fetch','remote.origin.pushurl'].map(key=>[key,()=>true])
]);
function handoffMetadata(root,expected) {
 const pointer=join(root,'.git'),stat=lstatSync(pointer),directory=expected??(stat.isDirectory()?pointer:join(dirname(root),'git'));
 if(directory===pointer)assert(stat.isDirectory()&&!stat.isSymbolicLink(),'Dedicated Git metadata directory required');
 else {
  assert.equal(directory,join(dirname(root),'git'),'Protected sibling Git metadata required');
  assert.equal(readBoundedSource(pointer,root,4096).toString(),`gitdir: ${directory}\n`,'Immutable Git directory pointer changed');
 }
 assert(realpathSync(directory)===directory&&lstatSync(directory).isDirectory(),'Canonical Git metadata required');
 for(const name of ['commondir','config.worktree'])assert(!lstatSync(join(directory,name),{throwIfNoEntry:false}),'Alternate Git metadata/configuration refused');
 const info=join(directory,'info');
 if(lstatSync(info,{throwIfNoEntry:false})) {
  assert(realpathSync(info)===info&&lstatSync(info).isDirectory(),'Canonical Git info directory required');
  assert(!lstatSync(join(info,'attributes'),{throwIfNoEntry:false}),'Unreviewed local Git attributes refused');
 }
 return directory;
}

/** Internal exact object reader/transfer; source facts share the same boundary. */
export function handoffGit(root, args, {git='/usr/bin/git', executionPath='/usr/bin:/bin', gitSha256, gitDirectory, maxBuffer=2097152} = {}) {
 assert.equal(realpathSync(root),root,'Canonical handoff checkout required');assert.equal(realpathSync(git),git,'Canonical handoff Git required');
 assert(HEX.test(gitSha256)&&hash(readFileSync(git))===gitSha256,'Pinned handoff Git bytes changed');
 const directory=handoffMetadata(root,gitDirectory),config=readBoundedSource(join(directory,'config'),directory,JSON_LIMITS.controlIndex);
 const env={PATH:executionPath,GIT_CONFIG_NOSYSTEM:'1',GIT_CONFIG_SYSTEM:'/dev/null',GIT_CONFIG_GLOBAL:'/dev/null',GIT_ATTR_NOSYSTEM:'1',GIT_NO_REPLACE_OBJECTS:'1',GIT_OPTIONAL_LOCKS:'0'};
 try {
  const entries=execFileSync(git,['config','--no-includes','--file','-','--null','--list'],{cwd:'/',env,input:config,maxBuffer:2097152,stdio:['pipe','pipe','pipe']}).toString().split('\0');
  assert.equal(entries.pop(),'','Complete Git config records required');
  for(const entry of entries) {
   const newline=entry.indexOf('\n'),key=newline<0?entry:entry.slice(0,newline),value=newline<0?'':entry.slice(newline+1);
   assert(HANDOFF_CONFIG.get(key)?.(value)||/^branch\.[a-zA-Z0-9_./-]+\.(remote|merge)$/.test(key),'Unreviewed local/included Git configuration refused');
  }
  return execFileSync(git,['--git-dir='+directory,'--work-tree='+root,'-c','core.hooksPath=/dev/null','-c','core.fsmonitor=false','-c','core.attributesFile=/dev/null','-c','commit.gpgsign=false','-c','diff.external=','-c','maintenance.auto=false','-c','gc.auto=0','-c','fetch.writeCommitGraph=false','-c','submodule.recurse=false','-c','protocol.allow=never','-c','protocol.file.allow=always',...args],{cwd:root,env,maxBuffer,stdio:['ignore','pipe','pipe']});
 }
 catch {throw new Error('Exact candidate Git transfer/inspection refused');}
}

/** An adopted base can accumulate exact dependency-only descendants. Previously
 * frozen archives cannot change; retained added archives must be real UI packages.
 * Package scripts/lifecycle/build/harness edits always require a new base review. */
export function assertDependencySource(root, reviewedBaseSha, sourceSha, settings) {
 assert(REVISION.test(reviewedBaseSha)&&REVISION.test(sourceSha),'Exact dependency source commits required');
 const git=args=>handoffGit(root,args,settings),blob=(sha,path)=>git(['show',`${sha}:${path}`]);
 git(['merge-base','--is-ancestor',reviewedBaseSha,sourceSha]);
 const changed=git(['diff','--no-renames','--name-only','-z',reviewedBaseSha,sourceSha,'--']).toString().split('\0').filter(Boolean);
 assert(changed.every(path=>['package.json','pnpm-lock.yaml'].includes(path)||/^vendor\/naeil-ui-0\.7\.(0|[1-9]\d*)\.tgz$/.test(path)),'Candidate source changed outside dependency-only scope');
 assertDependencyDelta({packageJSON:blob(reviewedBaseSha,'package.json'),lockfile:blob(reviewedBaseSha,'pnpm-lock.yaml')},{packageJSON:blob(sourceSha,'package.json'),lockfile:blob(sourceSha,'pnpm-lock.yaml')});
 for(const path of changed.filter(path=>path.startsWith('vendor/'))) {
  assert.equal(git(['ls-tree',reviewedBaseSha,'--',path]).length,0,'Previously frozen vendor archive changed');
  assert(/^100644 blob [a-f0-9]{40}\t/.test(git(['ls-tree',sourceSha,'--',path]).toString()),'Regular retained UI archive required');
  const metadata=runtimeIndex(blob(sourceSha,path)).package;assert.equal(metadata.name,'@naeil/ui');assert.equal(path,`vendor/naeil-ui-${metadata.version}.tgz`,'Vendor archive filename/identity mismatch');
 }
 return sourceSha;
}

/** Inspect source without importing consumer helpers or rerunning an updater.
 * The preflight protected Git metadata is retained read-only to tested code. */
export function assertCandidateSource(candidate, options = {}) {
 const plan=JSON.parse(checkedReference(candidate.plan));
 const gitPath=options.git??plan.config.git??'/usr/bin/git', executionPath=options.executionPath??plan.config.executionPath;
 const checkout=options.worktree??candidate.checkout;
 const settings={git:gitPath,executionPath,gitSha256:options.gitSha256??plan.config.executables[gitPath],gitDirectory:options.worktree?join(checkout,'.git'):join(candidate.root,'git')};
 const git=args=>handoffGit(checkout,args,settings).toString().trim();
 assert.equal(git(['status','--porcelain','--untracked-files=normal']),'','Dirty candidate checkout refused');
 assert.equal(git(['rev-parse','HEAD']),candidate.candidateSourceSha,'Exact candidate commit changed; same-tree substitution prohibited');
 assert.equal(git(['rev-parse','HEAD^{tree}']),candidate.treeSha,'Candidate tree changed');
 const sourceHeadSha=candidate.sourceHeadSha??candidate.reviewedBaseSha;
 assertDependencySource(checkout,candidate.reviewedBaseSha,sourceHeadSha,settings);
 assertDependencySource(checkout,sourceHeadSha,candidate.candidateSourceSha,settings);
 const vendor=`vendor/naeil-ui-${candidate.release.version}.tgz`;
 const blob=(sha,path)=>handoffGit(checkout,['show',`${sha}:${path}`],settings);
 const before={packageJSON:blob(candidate.reviewedBaseSha,'package.json'),lockfile:blob(candidate.reviewedBaseSha,'pnpm-lock.yaml')};
 const after={packageJSON:readBoundedSource(join(checkout,'package.json'),checkout),lockfile:readBoundedSource(join(checkout,'pnpm-lock.yaml'),checkout)};
 assertDependencyDelta(before,after);assert.equal(hash(after.lockfile),candidate.lockfileSha256,'Exact candidate lockfile changed');
 assert.equal(JSON.parse(after.packageJSON).dependencies['@naeil/ui'],`file:${vendor}`,'Exact vendored UI target required');
 const archive=readBoundedSource(join(checkout,vendor),checkout,67108864);assert.equal(hash(archive),candidate.release.archiveSha256,'Candidate vendor archive changed');
 const metadata=runtimeIndex(archive).package;assert.equal(metadata.name,'@naeil/ui');assert.equal(metadata.version,candidate.release.version);
 assert(after.lockfile.toString().includes(`integrity: sha512-${createHash('sha512').update(archive).digest('base64')}`),'Candidate lock lacks exact archive integrity');
 const files={};
 function walk(directory) {assert.equal(realpathSync(directory),directory,'Harness directory link refused');for(const name of readdirSync(directory).sort()){const path=join(directory,name),stat=lstatSync(path);assert(!stat.isSymbolicLink(),'Harness link refused');if(stat.isDirectory())walk(path);else files[path.slice(checkout.length+1)]=hash(readBoundedSource(path,checkout));}}
 walk(join(checkout,'tests'));files['playwright.config.ts']=hash(readBoundedSource(join(checkout,'playwright.config.ts'),checkout));
 assert.equal(hash(JSON.stringify(Object.fromEntries(Object.entries(files).sort(([a],[b])=>a<b?-1:a>b?1:0)))),candidate.harnessSha256,'Exact candidate harness changed');
 return candidate;
}

/** Copy retained Git objects by local bundle and fast-forward the dedicated clean
 * checkout. Never reset a divergent checkout, install, rebuild, or recreate SHA. */
export function stageCandidate(candidate, {worktree,branch,reviewedSourceRevision,git='/usr/bin/git',executionPath,gitSha256,beforeMutation}) {
 assert.equal(typeof beforeMutation,'function','Caller authorization/STOP/trust boundary required before source mutation');
 checkedReference(candidate.bundle,67108864);assertCandidateSource(candidate);
 const settings={git,executionPath,gitSha256,gitDirectory:join(worktree,'.git')}, run=args=>handoffGit(worktree,args,settings).toString().trim();
 assert.equal(run(['status','--porcelain','--untracked-files=normal']),'','Dirty execution checkout refused');
 assert.equal(run(['branch','--show-current']),branch,'Dedicated standing branch required');
 run(['merge-base','--is-ancestor',reviewedSourceRevision,'HEAD']);
 beforeMutation();run(['fetch','--no-tags','--no-write-fetch-head',candidate.bundle.path,'HEAD']);
 run(['merge-base','--is-ancestor','HEAD',candidate.candidateSourceSha]);
 if(run(['rev-parse','HEAD'])!==candidate.candidateSourceSha){beforeMutation();run(['merge','--ff-only','--no-edit',candidate.candidateSourceSha]);}
 assertCandidateSource(candidate,{worktree,...settings});return candidate;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href) {
 try {
  assert.equal(process.argv.length,5,'Usage: consumer-preflight.mjs prepare|run INPUT.json OUTPUT.json');
  const [, ,action,inputPath,outputPath]=process.argv,request=readPrivateJSON(inputPath);
  const root=action==='prepare'?request.isolatedRoot:request.candidate?.root;
  assert(isAbsolute(outputPath)&&resolve(outputPath)===outputPath&&under(outputPath,join(root,'output')),'CLI output must be under isolated output root');
  const result=action==='prepare'?await prepareCandidate(request):action==='run'?await runPreflight(request.candidate,request.config):assert.fail('Unknown preflight action');atomicJSON(outputPath,result);
 }catch {console.error('Isolated preflight failed; no passed receipt issued');process.exitCode=1;}
}
