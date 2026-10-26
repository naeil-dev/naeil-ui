import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assertTrustedFiles, hash, invokeJSON, releaseIdentityDigest } from './standing-config.mjs';
import { invokeVerifier } from './jev-standing-adapter.mjs';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { assertConfigReferences, fingerprint } from './standing-config.mjs';
import { assertGenerationExecution, assertGenerationVerification } from './standing-config.mjs';
import { atomicJSON, fileReference, routeKey } from './standing-config.mjs';
import { resolveSiteTarget } from './site-continuation.mjs';
import { declaration } from './fixtures/reviewed-expectations.mjs';

const credentials = ['GH_TOKEN', 'GITHUB_TOKEN', 'NAEIL_STANDING_VERCEL_TOKEN'];
// Linux images may link /bin to /usr/bin; the Jev transport requires canonical PATH entries.
const executionPath = [...new Set(['/usr/bin', '/bin'].map(path => realpathSync(path)))].join(':');

test('IF1 oversized acquisition refuses before creating ownership and retained acquisition cannot be stolen', async t => {
 const {acquireControlLock,JSON_LIMITS,readPrivateJSON}=await import('./standing-config.mjs');
 const root=realpathSync(mkdtempSync(join(tmpdir(),'standing-acquisition-')));fs.chmodSync(root,0o700);t.after(()=>rmSync(root,{recursive:true,force:true}));
 assert.throws(()=>acquireControlLock(root,{kind:'synthetic-unvalidated',bytes:'x'.repeat(JSON_LIMITS.controlIndex)}),/limit/);assert.deepEqual(fs.readdirSync(root),[]);
 const acquisition={kind:'synthetic-unvalidated',planSha256:'a'.repeat(64),approvalSha256:'b'.repeat(64)},lease=acquireControlLock(root,acquisition);
 const path=join(root,'control.lock'),before=readFileSync(path);assert.deepEqual(readPrivateJSON(path).acquisition,acquisition);lease.retain();
 assert.throws(()=>acquireControlLock(root),/EEXIST/);assert.deepEqual(readFileSync(path),before);
});

test('pinned child receives credential key names only for naeil observer rollout', async t => {
 const root = realpathSync(mkdtempSync(join(tmpdir(), 'standing-env-')));
 t.after(() => rmSync(root, { recursive: true, force: true }));
 const script = join(root, 'env-keys.mjs'), node = realpathSync(process.execPath);
 // Persist key names only, even if the parent has real unrelated credentials.
 writeFileSync(script, "import { writeFileSync } from 'node:fs'; writeFileSync(process.env.NAEIL_VERIFY_OUTPUT || process.env.NAEIL_ROLLOUT_OUTPUT, JSON.stringify(Object.keys(process.env).sort()), { mode: 0o600 });");
 const pins = { [node]: hash(readFileSync(node)), [script]: hash(readFileSync(script)) };
 const previous = process.env;
 process.env = { ...previous, GH_TOKEN: 'fixture', GITHUB_TOKEN: 'fixture', NAEIL_STANDING_VERCEL_TOKEN: 'fixture', NODE_OPTIONS: '--unreviewed', PYTHONPATH: '/unreviewed' };
 t.after(() => { process.env = previous; });
 const command = { file: node, args: [script], timeoutMs: 5000 };
 for (const [name, request, kind, allowed] of [
  ['dispatcher to observer', { service: { id: 'naeil' } }, 'rollout', true],
  ['observer to verifier', { service: { id: 'naeil' } }, 'verify', false],
  ['dispatcher to Estimate', { service: { id: 'estimate' } }, 'rollout', false],
  ['dispatcher to Jev', { service: { id: 'jev' } }, 'rollout', false],
  ['Estimate to native bridge', { serviceId: 'estimate', action: 'deploy' }, 'rollout', false],
  ['Estimate to verifier', { service: { id: 'estimate' } }, 'verify', false],
  ['Jev verification envelope', { service: { id: 'jev' } }, 'verify', false],
  ['missing service', {}, 'rollout', false],
 ]) await t.test(name, async () => {
  assertTrustedFiles(pins);
  const keys = await invokeJSON(command, { ...request, executionPath }, join(root, name.replaceAll(' ', '-')), kind);
  assert.deepEqual(keys.filter(key => credentials.includes(key)), allowed ? [...credentials].sort() : []);
  assert(!keys.includes('NODE_OPTIONS')); assert(!keys.includes('PYTHONPATH'));
  assert(keys.includes('PATH')); assert(keys.includes(kind === 'verify' ? 'NAEIL_VERIFY_INPUT' : 'NAEIL_ROLLOUT_INPUT'));
 });
 await t.test('Jev existing verifier transport strips credentials independently', async () => {
  assertTrustedFiles(pins);
  const keys = await invokeVerifier({ phase: 'production' }, { verificationCommand: command, executionPath, worktree: root }, root);
  assert.deepEqual(keys.filter(key => credentials.includes(key)), []);
 });
});

// Every writer budget uses serialized UTF-8 bytes, including indentation/newline.
// Rejection must precede even opening the replacement temporary file.
test('all JSON budgets accept exact boundary and reject limit+1 before replacement', async t => {
 const { atomicJSON, readPrivateJSON } = await import('./standing-config.mjs');
 const { JSON_LIMITS } = await import('./standing-state.mjs');
 const directory = realpathSync(mkdtempSync(join(tmpdir(), 'standing-budgets-')));
 t.after(() => rmSync(directory, { recursive: true, force: true }));
 for (const [kind, limit] of Object.entries(JSON_LIMITS)) {
  const path = join(directory, kind + '.json'), overhead = Buffer.byteLength(JSON.stringify({ value: '' }, null, 2) + '\n');
  const value = { value: 'x'.repeat(limit - overhead) }; atomicJSON(path, value, limit);
  assert.equal(readFileSync(path).length, limit); assert.deepEqual(readPrivateJSON(path, limit), value);
  const before = readFileSync(path); assert.throws(() => atomicJSON(path, { value: value.value + 'x' }, limit), /bound|limit|large/i);
  assert.deepEqual(readFileSync(path), before);
 }
});

test('unapproved configuration paths are refused before opening their bytes', t => {
 const root=realpathSync(mkdtempSync(join(tmpdir(),'standing-config-refs-')));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const approved=join(root,'approved.json'),outside=join(root,'synthetic-private-canary.json');
 writeFileSync(approved,'{}',{mode:0o600});writeFileSync(outside,'synthetic private canary',{mode:0o600});
 const refs=[{path:outside,sha256:hash(readFileSync(outside)),bytes:readFileSync(outside).length}];
 const original=fs.openSync;let reads=0;
 try {fs.openSync=(path,...args)=>{if(path===outside)reads++;return original(path,...args);};syncBuiltinESMExports();assert.throws(()=>assertConfigReferences(refs,fingerprint(refs),[approved]),/inventory/);}
 finally {fs.openSync=original;syncBuiltinESMExports();}
 assert.equal(reads,0,'An unapproved path must not become a private-file read allowance');
});

test('published release identity ignores only known runner-local asset paths and retains optional public metadata',()=>{
 const release={releaseId:'synthetic',version:'0.7.2',sourceRevision:'a'.repeat(40),archive:{path:'/epoch1/archive.tgz',sha256:'b'.repeat(64),url:'https://example.test/archive'},contract:{path:'/epoch1/contract.json',version:'1',sha256:'c'.repeat(64)},account:{path:'/epoch1/account.json',sha256:'d'.repeat(64)},siteArchive:{path:'/epoch1/site.tgz',sha256:'e'.repeat(64)},expectations:{path:'/epoch1/expectations.json',sha256:'f'.repeat(64),url:'https://example.test/expectations'},publicAssets:[{name:'optional',path:'/public/logo.png',sha256:'1'.repeat(64)}]};
 const relocated=structuredClone(release);for(const kind of ['archive','contract','account','siteArchive','expectations'])relocated[kind].path=relocated[kind].path.replace('/epoch1/','/epoch2/');
 assert.equal(releaseIdentityDigest(relocated),releaseIdentityDigest(release));
 for(const change of [value=>{value.archive.url+='changed';},value=>{value.siteArchive.sha256='0'.repeat(64);},value=>{value.expectations.sha256='0'.repeat(64);},value=>{value.publicAssets[0].path='/public/other.png';},value=>{value.publicAssets.push({name:'new'});},value=>{value.sourceRevision='0'.repeat(40);}]){const changed=structuredClone(release);change(changed);assert.notEqual(releaseIdentityDigest(changed),releaseIdentityDigest(release));}
});

test('T7 standalone kind grants no operational or native transport authority even with a fabricated active policy', async t => {
 const root=realpathSync(mkdtempSync(join(tmpdir(),'standalone-admission-')));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const input={kind:'standing-site-read-only',service:{id:'naeil'},policy:{enabled:true,expiresAt:'2099-01-01'},executionPath};
 assert.throws(()=>assertGenerationExecution(input),/Standalone/);assert.throws(()=>assertGenerationVerification(input),/Standalone/);
 await assert.rejects(()=>invokeJSON({file:process.execPath,args:['never-run'],timeoutMs:1000},input,join(root,'native')),/Standalone/);
 await assert.rejects(()=>invokeJSON({file:process.execPath,args:['never-run'],timeoutMs:1000},input,join(root,'verify'),'verify'),/Standalone/);
 assert.deepEqual(fs.readdirSync(root),[]);
});

function prerequisiteFixture(t) {
 const root=realpathSync(mkdtempSync(join(tmpdir(),'native-prerequisite-'))),state=join(root,'state');
 t.after(()=>rmSync(root,{recursive:true,force:true}));
 for(const path of [state,join(state,'prerequisites')])mkdirSync(path,{mode:0o700});
 const put=(path,value)=>{atomicJSON(path,value);return fileReference(path);};
 const release={releaseId:'synthetic-ui-0.7.2',version:'0.7.2',sourceRevision:'b'.repeat(40),siteSourceRevision:'c'.repeat(40),siteRuntimeSha256:'d'.repeat(64),archive:{sha256:'e'.repeat(64)},siteArchive:{sha256:'f'.repeat(64)},contract:{version:'1',sha256:'1'.repeat(64)},account:{sha256:'2'.repeat(64)}};
 release.expectations=put(join(root,'expectations.json'),declaration(release));
 const routes=[{path:'/en',locale:'en',policy:'shared',renderState:{access:'public'}},{path:'/en/account',locale:'en',policy:'shared',renderState:{access:'protected',visible:'[data-synthetic]'}}];
 const naeil={id:'naeil',appId:'naeil',origin:'https://naeil.dev',routes},estimate={id:'estimate',appId:'abestimate',origin:'https://abestimate.naeil.dev',routes};
 const node=realpathSync(process.execPath),generationSha256='a'.repeat(64),configReferences=[put(join(root,'verifier.json'),{synthetic:true})],configReferencesSha256=fingerprint(configReferences);
 const policy={enabled:true,approvedBy:'synthetic',approvalRef:'synthetic://prerequisite',expiresAt:'2099-01-01',stopFile:join(root,'STOP'),maxEvidenceAgeSeconds:300};
 const artifact={id:'dpl_Synthetic',sourceRevision:release.siteSourceRevision,ui:{version:'0.7.2',contractVersion:'1'},platform:{kind:'vercel-git',deploymentId:'dpl_Synthetic'}};
 const identity={schemaVersion:1,appId:'naeil',artifactId:artifact.id,sourceRevision:artifact.sourceRevision,ui:artifact.ui},releaseSha256=releaseIdentityDigest(release);
 put(join(state,'state.json'),{schemaVersion:2,epochId:'synthetic'});
 function activate(name) {
  const controlDirectory=join(root,name);mkdirSync(controlDirectory,{mode:0o700});
  const config={enabled:true,policy,generationSha256,configReferences,configReferencesSha256,stateDirectory:state,generationControl:{controlDirectory,generationId:'synthetic-v2',epochId:'synthetic'},services:{naeil,estimate},trustedFiles:{[node]:hash(readFileSync(node))},executionPath};
  const next={generationId:'synthetic-v2',generationSha256,config:put(join(controlDirectory,'config.json'),config),configReferencesSha256,stateDirectory:state,epochId:'synthetic'};
  const plan={kind:'standing-0.7.2-continuation',release,next,previousApprovalSha256:'3'.repeat(64),predecessors:{naeil:identity},estimate:{priorAttemptId:'old-estimate',newAttemptId:'new-estimate',idempotencyKey:release.releaseId+':estimate'}};plan.planSha256=fingerprint(plan);
  const approval={schemaVersion:1,kind:'standing-continuation-approval',action:'continue-0.7.2-after-source-gate-failure',planSha256:plan.planSha256,generationSha256,previousApprovalSha256:plan.previousApprovalSha256,successorOf:plan.previousApprovalSha256,releaseSha256,priorAttemptId:'old-estimate',attemptId:'new-estimate',approvedBy:'synthetic',approvalRef:'synthetic://prerequisite',approvedAt:'2020-01-01',expiresAt:'2099-01-01',revoked:false};
  const planRef=put(join(controlDirectory,'plan.json'),plan),approvalRef=put(join(controlDirectory,'approval.json'),approval),pointer={schemaVersion:1,...next,authorizationSha256:fingerprint(approval),transitionPlanSha256:plan.planSha256};
  const pointerRef=put(join(controlDirectory,'active.json'),pointer);
  put(join(controlDirectory,'transition.json'),{schemaVersion:1,planSha256:plan.planSha256,approvalSha256:fingerprint(approval),plan:planRef,approval:approvalRef,oldPointer:null,newPointer:pointer,phase:'completed',imported:null,validatedState:null,proof:null});
  return {generationSha256,generationFence:{controlDirectory,pointerSha256:pointerRef.sha256},configReferences,configReferencesSha256,trustedFiles:config.trustedFiles,executionPath,policy};
 }
 const fields=activate('control'),request={schemaVersion:1,mode:'standing',phase:'production',release,service:naeil,...fields,idempotencyKey:release.releaseId+':naeil',attemptId:'fresh-naeil'};
 const production={schemaVersion:1,passed:true,releaseId:release.releaseId,serviceId:'naeil',idempotencyKey:request.idempotencyKey,attemptId:request.attemptId,phase:'production',identity,archiveSha256:release.archive.sha256,referenceSha256:release.contract.sha256,accountReferenceSha256:release.account.sha256,expectationsSha256:release.expectations.sha256,checkedAt:new Date().toISOString(),routes:routes.map(route=>({path:route.path,routeKey:routeKey(route),passed:true}))};
 const proof={schemaVersion:1,kind:'standing-current-naeil-verification',generationSha256,pointerSha256:fields.generationFence.pointerSha256,releaseSha256,request,artifact,production};
 const native={schemaVersion:1,mode:'standing',release,service:estimate,...fields,idempotencyKey:release.releaseId+':estimate',attemptId:'new-estimate',reconciliation:{priorAttemptId:'old-estimate'}};
 const bind=value=>({...native,naeilPrerequisite:put(join(state,'prerequisites/site.json'),value)});
 return {proof,bind,activate};
}

test('R1 native admission keeps the valid current-generation operational site prerequisite',t=>{
 const f=prerequisiteFixture(t);assert(assertGenerationExecution(f.bind(f.proof)));
 delete f.proof.request.phase;assert(assertGenerationExecution(f.bind(f.proof)),'The operational observer request has no verifier phase');
});
for(const cause of ['standalone','standalone-phase','unfenced','foreign-control','policy','generationSha256','generationFence','configReferences','configReferencesSha256','trustedFiles','executionPath','service','active-service','target'])test('R1 native admission refuses nested site authority: '+cause,t=>{
 const f=prerequisiteFixture(t),proof=structuredClone(f.proof),nested=proof.request;
 if(['standalone','unfenced','service'].includes(cause))for(const key of ['generationSha256','generationFence','configReferences','configReferencesSha256','trustedFiles','executionPath'])delete nested[key];
 if(cause==='standalone'){nested.kind='standing-site-read-only';delete nested.mode;nested.maxEvidenceAgeSeconds=300;proof.production.phase='site-read-only';nested.siteTarget=resolveSiteTarget(nested.release);proof.production.siteTargetSha256=fingerprint(nested.siteTarget);}
 else if(cause==='standalone-phase'){nested.phase='site-read-only';}
 else if(cause==='foreign-control')nested.generationFence=f.activate('foreign-control').generationFence;
 else if(cause==='service'||cause==='active-service')nested.service.verification={command:{file:'/unapproved/renderer',args:[]}};
 else if(cause==='target')nested.siteTarget={...resolveSiteTarget(nested.release),sourceRevision:'f'.repeat(40)};
 else if(!['standalone','unfenced'].includes(cause))delete nested[cause];
 assert.throws(()=>assertGenerationExecution(f.bind(proof)));
});
