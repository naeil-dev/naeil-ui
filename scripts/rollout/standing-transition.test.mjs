import assert from 'node:assert/strict';
import test from 'node:test';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { atomicJSON, automationDigest, fileReference, fingerprint, generationDigest, hash, IDS, operationalGenerationDigest, ORIGINS, readPrivateJSON } from './standing-config.mjs';
import { codeManifest } from './consumer-artifact.mjs';
import { readStandingState } from './standing-state.mjs';

const automationRoot = resolve(new URL('../..', import.meta.url).pathname);
function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'standing-transition-'))); chmodSync(root, 0o700); t.after(() => rmSync(root, { recursive: true, force: true }));
  const directory = name => { const path = join(root, name); mkdirSync(path, { mode: 0o700 }); return path; };
  const controlDirectory = directory('control'), oldState = directory('old'), newState = join(root, 'epoch2'), nativeState = directory('native'), nativeMarkers = directory('native-markers'), jevState = directory('jev-state'), jevBase = directory('jev-native');
  mkdirSync(join(nativeState,'keys'),{mode:0o700}); mkdirSync(join(jevBase,'releases'),{mode:0o700});
  const stopFile = join(root, 'STOP'); writeFileSync(stopFile, 'STOP\n', { mode: 0o600 });
  const put = (name, value) => { const path = join(root, name); atomicJSON(path, value); return fileReference(path); };
  const trustedFiles = { [realpathSync(process.execPath)]: hash(readFileSync(process.execPath)) }, automationSha256 = automationDigest(automationRoot);
  const context = { automationSha256, trustedFiles, executionPath: '/usr/bin:/bin', stateSchemaVersion: 2 };
  const generation = { ...context, executionContexts: { estimate: context, jev: { ...context, executionPath: '/bin:/usr/bin' } } }, generationSha256 = operationalGenerationDigest(generation);
  const release = { schemaVersion: 1, releaseId: 'synthetic-0.7.2', version: '0.7.2', previousVersion: '0.7.1', sourceRevision: 'a'.repeat(40), siteSourceRevision: 'b'.repeat(40), archive: { sha256: 'c'.repeat(64) }, siteArchive: { sha256: 'd'.repeat(64) }, contract: { version: '1', sha256: 'e'.repeat(64) }, account: { sha256: 'f'.repeat(64) }, changes: ['dom'] };
  const migration = { releaseId: release.releaseId, version: release.version, sourceRevision: release.sourceRevision, siteSourceRevision: release.siteSourceRevision, archiveSha256: release.archive.sha256, contractSha256: release.contract.sha256, changes: release.changes, services: IDS, approvedBy: 'historical-owner', approvalRef: 'synthetic://original', reason: 'original exact release', expiresAt: '2026-11-01T21:00:00Z' };
  const policy = { schemaVersion: 1, enabled: true, approvedBy: 'synthetic-owner', approvalRef: 'synthetic://current', expiresAt: '2099-01-01', services: IDS, stopFile, maxEvidenceAgeSeconds: 3600, rollbackScope: 'code-only', rollbackApproved: true, reviewedMigration: migration, patchWindow: { approvedBy: 'synthetic-owner', approvalRef: 'synthetic://window', reason: 'synthetic patch window', minVersion: '0.7.2', maxVersion: '0.7.2', contractVersion: '1', startsAt: '2020-01-01', expiresAt: '2099-01-01', services: IDS } };
  const identities = Object.fromEntries(IDS.map(id => [id, { schemaVersion: 1, appId: id === 'estimate' ? 'abestimate' : id, artifactId: id + '-current', sourceRevision: id === 'naeil' ? release.siteSourceRevision : '1'.repeat(40), ui: { version: id === 'naeil' ? '0.7.2' : '0.7.1', contractVersion: '1' } }]));
  const verificationConfig = put('verification.json', { schemaVersion: 1, synthetic: 'verification' });
  const sources = Object.fromEntries(['estimate','jev'].map(id => [id, { approval: put(id + '-approval.json', { schemaVersion: 1, synthetic: id + '-source-approval' }), adoption: put(id + '-adoption.json', { schemaVersion: 1, synthetic: id + '-source-adoption' }), candidate: put(id + '-candidate.json', { schemaVersion: 1, kind: 'isolated-consumer-candidate', passed: true, service: id, generationSha256: generationDigest(generation.executionContexts[id]) }) }]));
  const configurationPaths = ['estimate.json','jev.json','verification.json'].map(name => join(root, name)).sort();
  const adapterRefs = Object.fromEntries(['estimate','jev'].map(id => {
    const handoff = { schemaVersion: 1, generation, generationSha256, adapterConfigPath: join(root, id + '.json'), configurationPaths, sourceApproval: readPrivateJSON(sources[id].approval.path), sourceApprovalSha256: fingerprint(readPrivateJSON(sources[id].approval.path)), sourceAdoption: readPrivateJSON(sources[id].adoption.path), sourceAdoptionSha256: fingerprint(readPrivateJSON(sources[id].adoption.path)), candidateReceipt: sources[id].candidate };
    return [id, put(id + '.json', { schemaVersion: 1, handoff, stateDirectory: id === 'estimate' ? nativeState : jevState, ...(id === 'estimate' ? {activation:{stateDirectory:nativeMarkers}} : {native:{baseDirectory:jevBase}}) })];
  }));
  const configReferences = [...Object.values(adapterRefs), verificationConfig].sort((a,b) => a.path.localeCompare(b.path));
  const command = { file: realpathSync(process.execPath), args: ['synthetic'], timeoutMs: 1000 };
  const services = Object.fromEntries(IDS.map(id => [id, { id, appId: identities[id].appId, origin: ORIGINS[id], command, routes: [{ path: '/', policy: 'canonical' }], verification: { command: { ...command, args: ['synthetic', '--config', verificationConfig.path] } }, ...(id !== 'naeil' ? { adapterOptions: { standingConfigPath: adapterRefs[id].path } } : {}) }]));
  const config = { schemaVersion: 1, enabled: true, repository: 'naeil-dev/naeil-ui', trustedPublishers: ['synthetic'], automation: { root: automationRoot, sha256: automationSha256 }, stateDirectory: newState, trustedFiles, executionPath: context.executionPath, generation, generationSha256, configReferences, configReferencesSha256: fingerprint(configReferences), generationControl: { controlDirectory, generationId: 'synthetic-v2', epochId: 'synthetic-epoch' }, policy, services, baseline: { version: '0.7.1', releaseId: 'synthetic-0.7.1', sourceRevision: '1'.repeat(40), archiveSha256: '2'.repeat(64), referenceSha256: '3'.repeat(64), accountReferenceSha256: '4'.repeat(64) } };
  const oldConfig = { ...config, stateDirectory: oldState, policy: { ...policy, approvedBy: 'historical-owner' } }; delete oldConfig.generation; delete oldConfig.generationControl; delete oldConfig.generationSha256;
  const request = id => ({ schemaVersion: 1, release, service: services[id], policy: oldConfig.policy, attemptId: id + '-original', idempotencyKey: release.releaseId + ':' + id, mode: 'standing', outputDirectory: oldState });
  const naeilRequest = request('naeil'), oldNaeil = { schemaVersion: 1, releaseId: release.releaseId, serviceId: 'naeil', attemptId: naeilRequest.attemptId, idempotencyKey: naeilRequest.idempotencyKey, state: 'production-verified', artifact: { id: identities.naeil.artifactId, sourceRevision: identities.naeil.sourceRevision, ui: identities.naeil.ui, platform: { kind: 'vercel-git', deploymentId: 'synthetic-deployment' } }, production: { schemaVersion: 1, passed: true, releaseId: release.releaseId, serviceId: 'naeil', attemptId: naeilRequest.attemptId, idempotencyKey: naeilRequest.idempotencyKey, phase: 'production', identity: identities.naeil, archiveSha256: release.archive.sha256, referenceSha256: release.contract.sha256, accountReferenceSha256: release.account.sha256, checkedAt: '2026-10-20T00:00:00Z', routes: [] } };
  const estimateRequest = request('estimate'), failed = { schemaVersion: 1, releaseId: release.releaseId, serviceId: 'estimate', attemptId: estimateRequest.attemptId, idempotencyKey: estimateRequest.idempotencyKey, state: 'gate-failed', mutationAttempted: true, runtimeMutationAttempted: false };
  atomicJSON(join(oldState, 'output.json'), failed);
  const priorLedger = put('native/keys/'+hash(estimateRequest.idempotencyKey)+'.json', { attemptId: estimateRequest.attemptId, idempotencyKey: estimateRequest.idempotencyKey, state: 'gate-failed', mutationAttempted: true, runtimeMutationAttempted: false });
  const state = { schemaVersion: 1, repository: config.repository, currentVersion: '0.7.1', lastState: 'stopped', blocked: { releaseId: release.releaseId, serviceId: 'estimate', reasonCode: 'gate-failed' }, releases: { '2': { githubId: 2, releaseId: release.releaseId, version: release.version, binding: '5'.repeat(64), state: 'failed', services: { naeil: { state: 'production-verified', request: naeilRequest, result: oldNaeil }, estimate: { state: 'gate-failed', request: estimateRequest, result: failed } }, history: [] } } };
  atomicJSON(join(oldState,'state.json'),state);
  const snapshot = put('snapshot.json', state), oldConfigRef = put('old-config.json', oldConfig), newConfigRef = put('new-config.json', config);
  const tools = Object.fromEntries(['launchctl','ps','lsof'].map(name => { const path = join(root, name); writeFileSync(path, 'synthetic OS tool: ' + name, { mode: 0o700 }); return [name, { path, sha256: hash(readFileSync(path)) }]; }));
  const baselineRelease={releaseId:config.baseline.releaseId,version:'0.7.1',previousVersion:'0.7.0',sourceRevision:config.baseline.sourceRevision,archive:{sha256:config.baseline.archiveSha256},contract:{version:'1',sha256:config.baseline.referenceSha256},account:{sha256:config.baseline.accountReferenceSha256},changes:['fix']};
  const nativeArtifacts={};
  const makeNativeArtifact=(id,identity,name,packageSha256)=>{
    const store=directory(name),path=join(store,'code.tgz');writeFileSync(path,id+' synthetic historical code '+name,{mode:0o600});const sha256=hash(readFileSync(path)),code=join(store,id==='estimate'?'app':'standalone');mkdirSync(join(code,'.next'),{mode:0o700,recursive:true});writeFileSync(join(code,'server.js'),'// synthetic code',{mode:0o600});writeFileSync(join(code,'.next/BUILD_ID'),identity.artifactId,{mode:0o600});
    if(id==='jev'){mkdirSync(join(code,'public/.well-known'),{mode:0o700,recursive:true});atomicJSON(join(code,'public/.well-known/naeil-ui.json'),identity);}
    const manifest=id==='estimate'?{schemaVersion:1,releaseId:'111111111111-222222222222',node:'v24.21.0',serverPath:'app/server.js',runtimeDataIncluded:false,sourceCommit:identity.sourceRevision,buildId:identity.artifactId,uiBuildIdentity:identity,artifactFiles:codeManifest(code,{estimate:true}),packageVersions:{'@naeil/ui':'file:vendor/ui.tgz'},sourceFiles:{'vendor/ui.tgz':packageSha256,'src/server/naeil-shared-session.ts':'a'.repeat(64),'src/server/naeil-auth-client.ts':'b'.repeat(64)}}:codeManifest(code);
    if(id==='estimate'){manifest.packageVersions['@naeil/ui']='file:vendor/naeil-ui-'+identity.ui.version+'.tgz';manifest.sourceFiles['vendor/naeil-ui-'+identity.ui.version+'.tgz']=packageSha256;delete manifest.sourceFiles['vendor/ui.tgz'];}
    const manifestPath=join(store,'manifest.json');atomicJSON(manifestPath,manifest);const sorted=JSON.stringify(manifest,(_key,value)=>value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.entries(value).sort()):value);
    return{immutable:true,id:identity.artifactId,sourceRevision:identity.sourceRevision,ui:identity.ui,sha256,path,storageRef:'synthetic://'+sha256,packageSha256,...(id==='estimate'?{directory:store,manifestSha256:hash(readFileSync(manifestPath))}:{standalonePath:code,manifestPath,manifestSha256:hash(sorted),buildId:identity.artifactId})};
  };
  const nativeEvidence=Object.fromEntries(['estimate','jev'].map(id=>{
    const artifact=makeNativeArtifact(id,identities[id],id+'-artifact',baselineRelease.archive.sha256);nativeArtifacts[id]=artifact;
    const production={schemaVersion:1,passed:true,releaseId:baselineRelease.releaseId,serviceId:id,idempotencyKey:baselineRelease.releaseId+':'+id,attemptId:id+'-baseline',phase:'adopt',identity:identities[id],archiveSha256:baselineRelease.archive.sha256,referenceSha256:baselineRelease.contract.sha256,accountReferenceSha256:baselineRelease.account.sha256,checkedAt:'2026-10-20T00:00:00Z',routes:[]};
    const baseline=put((id==='estimate'?'native':'jev-state')+'/baseline.json',{schemaVersion:1,state:'production-verified',artifact,release:baselineRelease,production});return[id,{baseline,...(id==='jev'?{transactions:[]}:{})}];
  }));
  const input = { schemaVersion: 1, kind: 'standing-0.7.2-continuation', controlDirectory, stopFile, oldPointer: null, old: { generationId: 'synthetic-r5', automationSha256, config: oldConfigRef, stateDirectory: oldState, snapshot, evidenceRoot: oldState }, next: { generationId: 'synthetic-v2', generationSha256, config: newConfigRef, configReferencesSha256: config.configReferencesSha256, stateDirectory: newState, epochId: 'synthetic-epoch' }, release, previousApprovalSha256: fingerprint(migration), sourceHandoffs: sources, estimate: { priorAttemptId: estimateRequest.attemptId, newAttemptId: 'estimate-new-attempt', idempotencyKey: estimateRequest.idempotencyKey, ledger: priorLedger }, predecessors: identities, nativeEvidence, quiescence: { uid: 4242, label: 'invalid.synthetic.rollout', tools, stateRoots: [oldState, nativeState, nativeMarkers, jevState, join(jevBase,'releases')], absentPaths: [join(oldState, 'dispatcher.lock'), join(nativeState, 'running.lock'), join(nativeMarkers, 'operation.json'),join(jevState,'running.lock'),join(oldState,'pending-intent.json')] } };
  const events = [], deps = { platform: 'darwin', execute: async (file, args) => { events.push([file, args]); if (file === tools.launchctl.path) return args[0] === 'print' ? { code: 113, stdout: '', stderr: 'Could not find service "invalid.synthetic.rollout" in domain for user gui: 4242\n' } : { code: 0, stdout: 'disabled services = {\n "invalid.synthetic.rollout" => true\n}\n', stderr: '' }; if (file === tools.ps.path) return { code: 0, stdout: '42 1 /synthetic/unrelated\n', stderr: '' }; return { code: 1, stdout: '', stderr: '' }; }, fetchImpl: async url => ({ status: 200, headers: new Headers({ 'content-type': 'application/json' }), body: [Buffer.from(JSON.stringify(identities[IDS.find(id => url.startsWith(ORIGINS[id]))]))] }), validateHandoff: (_candidate, request) => { assert.equal(request.generationSha256, generationSha256); events.push(['handoff', request.service.id]); } };
  return { root, controlDirectory, newState, oldState, config, state, input, deps, events, put, tools, identities, stopFile, baselineRelease, nativeArtifacts, makeNativeArtifact };
}
const load = async () => import('./standing-transition.mjs').catch(() => ({}));
function approval(plan) { return { schemaVersion: 1, kind: 'standing-continuation-approval', action: 'continue-0.7.2-after-source-gate-failure', planSha256: plan.planSha256, previousApprovalSha256: plan.previousApprovalSha256, releaseSha256: fingerprint(plan.release), generationSha256: plan.next.generationSha256, priorAttemptId: plan.estimate.priorAttemptId, attemptId: plan.estimate.newAttemptId, successorOf: plan.previousApprovalSha256, approvedBy: 'synthetic-owner', approvalRef: 'synthetic://exact-plan', approvedAt: '2020-01-01', expiresAt: '2099-01-01', revoked: false }; }

test('pure plan exposes exact identities and cutover preserves old binding, naeil receipt, ledger and STOP', async t => {
  const api = await load(), f = fixture(t), before = readFileSync(f.input.old.snapshot.path);
  const plan = api.planTransition(f.input); assert.equal(plan.kind, 'standing-0.7.2-continuation'); assert.equal(existsSync(f.newState), false);
  await api.applyTransition(plan, approval(plan), f.deps);
  const state = readStandingState(f.newState), record = state.releases['2'];
  assert.equal(record.binding, '5'.repeat(64)); assert.deepEqual(record.services.naeil.request, f.state.releases['2'].services.naeil.request); assert.deepEqual(record.services.naeil.result, f.state.releases['2'].services.naeil.result);
  assert.equal(record.services.naeil.continuation.requiresFreshVerification, true);
  assert.equal(record.services.estimate.reconciliation.priorAttemptId, 'estimate-original'); assert.equal(record.services.estimate.authorizedAttemptId, 'estimate-new-attempt'); assert.equal(record.services.jev, undefined);
  assert.equal(record.history.at(-1).prior.request.attemptId, 'estimate-original'); assert.equal(state.blocked, undefined);
  assert.deepEqual(readFileSync(f.input.old.snapshot.path), before); assert.equal(readPrivateJSON(f.input.estimate.ledger.path).attemptId, 'estimate-original'); assert(existsSync(f.stopFile));
  assert.equal(readPrivateJSON(join(f.controlDirectory, 'transition.json')).phase, 'completed');
});

test('quiescence rejects registration, enabled override, matching process/open file, lock, marker and uncertain ledger', async t => {
  const api = await load();
  for (const cause of ['registered','enabled','arbitrary-exit','process','open-file','lock','marker','ledger','runtime']) {
    const f = fixture(t), original = f.deps.execute;
    f.deps.execute = async (file, args) => {
      if (file === f.tools.launchctl.path && args[0] === 'print' && cause === 'registered') return { code: 0, stdout: 'registered', stderr: '' };
      if (file === f.tools.launchctl.path && args[0] === 'print' && cause === 'arbitrary-exit') return { code: 1, stdout: '', stderr: 'unknown error' };
      if (file === f.tools.launchctl.path && args[0] === 'print-disabled' && cause === 'enabled') return { code: 0, stdout: 'disabled services = {}', stderr: '' };
      if (file === f.tools.ps.path && cause === 'process') return { code: 0, stdout: '61 1 node standing-dispatcher.mjs poll old.json\n', stderr: '' };
      if (file === f.tools.lsof.path && cause === 'open-file') return { code: 0, stdout: 'p61\ncnative-child\nnopen\n', stderr: '' };
      return original(file, args);
    };
    if (cause === 'lock') atomicJSON(f.input.quiescence.absentPaths[0], {});
    if (cause === 'marker') atomicJSON(f.input.quiescence.absentPaths[2], {});
    if (['ledger','runtime'].includes(cause)) { atomicJSON(f.input.estimate.ledger.path, { ...readPrivateJSON(f.input.estimate.ledger.path), ...(cause === 'ledger' ? { state: 'invoked' } : { runtimeMutationAttempted: true }) }); f.input.estimate.ledger = fileReference(f.input.estimate.ledger.path); }
    const plan = api.planTransition(f.input); await assert.rejects(() => api.applyTransition(plan, approval(plan), f.deps));
    assert(!existsSync(join(f.controlDirectory, 'active.json'))); assert(!existsSync(f.newState));
  }
});

test('changed snapshot, plan, predecessor, approval and exact config fail before import', async t => {
  const api = await load();
  for (const cause of ['snapshot','plan','predecessor','expired','approval','config']) {
    const f = fixture(t), plan = api.planTransition(f.input), approved = approval(plan);
    if (cause === 'snapshot') atomicJSON(f.input.old.snapshot.path, { changed: true });
    if (cause === 'plan') plan.estimate.newAttemptId = 'substituted';
    if (cause === 'predecessor') f.identities.estimate.artifactId = 'changed';
    if (cause === 'expired') approved.expiresAt = '2020-01-02';
    if (cause === 'approval') approved.previousApprovalSha256 = '0'.repeat(64);
    if (cause === 'config') atomicJSON(f.input.next.config.path, { changed: true });
    await assert.rejects(() => api.applyTransition(plan, approved, f.deps)); assert(!existsSync(f.newState));
  }
});

test('every journal/pointer boundary refuses polling until explicit exact recovery; completed import converts once', async t => {
  const api = await load();
  for (const boundary of ['journal-prepared','import-complete','import-root','journal-imported','journal-continuation-intent','continuation-state','generation-binding','journal-validated','journal-cutover-intent','active-pointer','journal-cutover']) {
    const f = fixture(t), plan = api.planTransition(f.input), approved = approval(plan);
    await assert.rejects(() => api.applyTransition(plan, approved, { ...f.deps, afterBoundary: phase => { if (phase === boundary) throw Error('synthetic crash'); } }));
    const { readActiveGeneration } = await import('./standing-launcher.mjs'); assert.throws(() => readActiveGeneration(f.controlDirectory));
    await assert.rejects(() => api.applyTransition(plan, approved, f.deps));
    const journal = fileReference(join(f.controlDirectory, 'transition.json')), phase = readPrivateJSON(journal.path).phase;
    const pointerSha256 = existsSync(join(f.controlDirectory, 'active.json')) ? fileReference(join(f.controlDirectory, 'active.json')).sha256 : null;
    const recovery = { schemaVersion: 1, kind: 'standing-transition-recovery-approval', planSha256: plan.planSha256, approvalSha256: fingerprint(approved), journal, phase, pointerSha256, approvedBy: 'synthetic-owner', approvalRef: 'synthetic://exact-recovery', approvedAt: '2020-01-01', expiresAt: '2099-01-01', revoked: false };
    const filesBefore = existsSync(join(f.newState, 'import-manifest.json')) ? readFileSync(join(f.newState, 'legacy-source.json')) : null;
    await api.recoverTransition(plan, approved, recovery, f.deps);
    assert.equal(readActiveGeneration(f.controlDirectory).pointer.generationId, 'synthetic-v2'); assert(existsSync(f.stopFile));
    if (filesBefore) assert.deepEqual(readFileSync(join(f.newState, 'legacy-source.json')), filesBefore);
    assert.equal(f.events.filter(event => event[0] === 'native').length, 0);
  }
});

test('competing cutovers and a retained crash lock cannot steal ownership or replay conversion', async t => {
  const api = await load(), f = fixture(t), plan = api.planTransition(f.input), approved = approval(plan);
  let entered, release; const waiting = new Promise(resolve => { entered = resolve; }), barrier = new Promise(resolve => { release = resolve; });
  const first = api.applyTransition(plan, approved, { ...f.deps, afterBoundary: async phase => { if (phase === 'journal-prepared') { entered(); await barrier; } } });
  await waiting; await assert.rejects(() => api.applyTransition(plan, approved, f.deps)); release(); await first;
  const g = fixture(t), other = api.planTransition(g.input); atomicJSON(join(g.controlDirectory, 'control.lock'), { pid: 99999, token: 'retained-crash-lock' });
  await assert.rejects(() => api.applyTransition(other, approval(other), g.deps)); assert.equal(readPrivateJSON(join(g.controlDirectory, 'control.lock')).token, 'retained-crash-lock');
});

test('a frozen file cannot substitute for changed live legacy state and a caller cannot omit native fence paths', async t => {
  const api = await load();
  for (const cause of ['live-snapshot','native-inventory']) {
    const f = fixture(t);
    if (cause === 'live-snapshot') atomicJSON(join(f.oldState,'state.json'), { changedAfterSnapshot: true });
    if (cause === 'native-inventory') { f.input.quiescence.stateRoots = [f.oldState]; f.input.quiescence.absentPaths = [join(f.oldState,'dispatcher.lock')]; }
    const plan = api.planTransition(f.input);
    await assert.rejects(() => api.applyTransition(plan,approval(plan),f.deps));
    assert(!existsSync(f.newState));
  }
});

function addJevHistory(f, phase='active',suffix='historical') {
  const attemptId='jev-'+suffix,directory=join(f.root,'jev-native/releases/ui-'+attemptId);mkdirSync(directory,{mode:0o700});
  const artifact=f.nativeArtifacts.jev,previous=f.makeNativeArtifact('jev',{schemaVersion:1,appId:'jev',artifactId:'jev-older-'+suffix,sourceRevision:'2'.repeat(40),ui:{version:'0.7.0',contractVersion:'1'}},'jev-older-'+suffix,'9'.repeat(64));
  const service={id:'jev',appId:'jev',origin:ORIGINS.jev,routes:[]},adapter=readPrivateJSON(join(f.root,'jev.json'));
  const release=f.baselineRelease,request={schemaVersion:1,mode:'standing',release,service,idempotencyKey:release.releaseId+':jev',attemptId,artifact,previousArtifact:previous,transactionDirectory:directory,action:phase==='rolled-back'?'rollback':'activate',config:{...adapter.native,baselineArtifact:adapter.baselineArtifact}};
  const nativeRelease={...release,archive:{...release.archive},contract:{...release.contract}};
  const identity=a=>({schemaVersion:1,appId:'jev',artifactId:a.id,sourceRevision:a.sourceRevision,ui:a.ui});
  const record={schemaVersion:1,releaseId:release.releaseId,serviceId:'jev',idempotencyKey:request.idempotencyKey,attemptId:request.attemptId,configSha256:hash(JSON.stringify(request.config,(_key,value)=>value&&typeof value==='object'&&!Array.isArray(value)?Object.fromEntries(Object.entries(value).sort()):value)),releaseFingerprint:fingerprint(nativeRelease),phase,before:readPrivateJSON(previous.manifestPath),after:readPrivateJSON(artifact.manifestPath),identity:identity(artifact),previousIdentity:identity(previous),artifact,previousArtifact:previous};
  const result={schemaVersion:1,releaseId:release.releaseId,serviceId:'jev',idempotencyKey:request.idempotencyKey,attemptId:request.attemptId,state:'production-verified',artifact,previousArtifact:previous,production:{...readPrivateJSON(f.input.nativeEvidence.jev.baseline.path).production,idempotencyKey:request.idempotencyKey,attemptId:request.attemptId,phase:'production'}};
  const predecessorRelease={...release,releaseId:'synthetic-0.7.0',version:'0.7.0',archive:{sha256:previous.packageSha256}},predecessorProduction={...result.production,releaseId:'synthetic-0.7.0',phase:'adopt',identity:record.previousIdentity,archiveSha256:previous.packageSha256};
  const nativeResult={schemaVersion:1,releaseId:release.releaseId,serviceId:'jev',idempotencyKey:request.idempotencyKey,attemptId,action:request.action,passed:phase!=='recovered',safe:true,...(phase==='recovered'?{reason:'native-operation-refused'}:{activated:true})};
  if(phase!=='active'){result.state='gate-failed';delete result.production;if(phase==='recovered')result.predecessorProduction=predecessorProduction;else result.rollback={state:'production-verified',artifact:previous,production:{...predecessorProduction,phase:'rollback'}};}
  let rollbackTransaction=null;if(phase==='rolled-back'){mkdirSync(join(directory,'rollback'),{mode:0o700});rollbackTransaction=f.put('jev-native/releases/ui-'+attemptId+'/rollback/transaction.json',{phase:'active',before:record.after,after:record.before,identity:record.previousIdentity,previousIdentity:record.identity});}
  const transaction=f.put('jev-native/releases/ui-'+attemptId+'/transaction.json',record),entry={transaction,request:f.put('jev-'+suffix+'-input.json',request),nativeResult:f.put('jev-'+suffix+'-native-result.json',nativeResult),result:f.put('jev-'+suffix+'-result.json',result),adapterConfig:f.config.configReferences.find(ref=>ref.path.endsWith('/jev.json')),predecessorBaseline:f.put('jev-'+suffix+'-predecessor.json',{state:'production-verified',artifact:previous,release:predecessorRelease,production:predecessorProduction}),rollbackTransaction};
  f.input.nativeEvidence.jev.transactions.push(entry);return {record,result,request,entry};
}

test('real-shaped terminal Jev history is retained and bound to exact native request, result, config and artifacts',async t=>{
  const api=await load(),f=fixture(t);addJevHistory(f);const plan=api.planTransition(f.input),before=readFileSync(f.input.nativeEvidence.jev.transactions[0].transaction.path);
  await api.applyTransition(plan,approval(plan),f.deps);assert.deepEqual(readFileSync(f.input.nativeEvidence.jev.transactions[0].transaction.path),before);
});

test('Jev history refuses nonterminal, unknown, unbound, changed-artifact and forged terminal records',async t=>{
  const api=await load();
  for(const cause of ['staged','uncertain','unknown','unbound','forged-result','changed-artifact','forged-config']) {
    const f=fixture(t),h=addJevHistory(f);
    if(['staged','uncertain','unknown'].includes(cause)){h.record.phase=cause;atomicJSON(h.entry.transaction.path,h.record);h.entry.transaction=fileReference(h.entry.transaction.path);}
    if(cause==='unbound')f.input.nativeEvidence.jev.transactions=[];
    if(cause==='forged-result'){h.result.production.identity.artifactId='unbound';atomicJSON(h.entry.result.path,h.result);h.entry.result=fileReference(h.entry.result.path);}
    if(cause==='changed-artifact')writeFileSync(f.nativeArtifacts.jev.path,'changed');
    if(cause==='forged-config'){h.record.configSha256='f'.repeat(64);atomicJSON(h.entry.transaction.path,h.record);h.entry.transaction=fileReference(h.entry.transaction.path);}
    const plan=api.planTransition(f.input);await assert.rejects(()=>api.applyTransition(plan,approval(plan),f.deps));assert(!existsSync(f.newState));
  }
});


test('actual SIGKILL retains control ownership and exact owner-authorized lock archival is required before recovery',async t=>{
  const api=await load();for(const killBoundary of ['journal-imported','active-pointer','journal-completed']) {const f=fixture(t),plan=api.planTransition(f.input),approved=approval(plan);
  const transfer=f.put('synthetic-child.json',{plan,approved,identities:f.identities,tools:f.tools});
  const script=`import {readPrivateJSON} from ${JSON.stringify(new URL('./standing-config.mjs',import.meta.url).href)};import {applyTransition} from ${JSON.stringify(new URL('./standing-transition.mjs',import.meta.url).href)};const f=readPrivateJSON(process.argv[1]);const ids=['naeil','estimate','jev'];const origins={naeil:'https://naeil.dev',estimate:'https://abestimate.naeil.dev',jev:'https://jev.naeil.dev'};await applyTransition(f.plan,f.approved,{platform:'darwin',execute:async(file,args)=>file===f.tools.launchctl.path?(args[0]==='print'?{code:113,stdout:'',stderr:'Could not find service "invalid.synthetic.rollout" in domain for user gui: 4242\\n'}:{code:0,stdout:'disabled services = { "invalid.synthetic.rollout" => true }',stderr:''}):file===f.tools.ps.path?{code:0,stdout:'42 1 /synthetic/unrelated\\n',stderr:''}:{code:1,stdout:'',stderr:''},fetchImpl:async url=>({status:200,headers:new Headers({'content-type':'application/json'}),body:[Buffer.from(JSON.stringify(f.identities[ids.find(id=>url.startsWith(origins[id]))]))]}),validateHandoff:()=>{},afterBoundary:name=>{if(name===process.argv[2])process.kill(process.pid,'SIGKILL');}});`;
  const child=spawn(process.execPath,['--input-type=module','--eval',script,transfer.path,killBoundary],{stdio:['ignore','ignore','pipe'],env:{PATH:'/usr/bin:/bin'}});let errors='';child.stderr.on('data',bytes=>{errors+=bytes;});const [code,signal]=await once(child,'exit');assert.equal(signal,'SIGKILL',errors);assert.equal(code,null);
  const lock=fileReference(join(f.controlDirectory,'control.lock')),lockBytes=readFileSync(lock.path),journal=fileReference(join(f.controlDirectory,'transition.json'));
  const recovery={schemaVersion:1,kind:'standing-transition-recovery-approval',planSha256:plan.planSha256,approvalSha256:fingerprint(approved),journal,phase:readPrivateJSON(journal.path).phase,pointerSha256:existsSync(join(f.controlDirectory,'active.json'))?fileReference(join(f.controlDirectory,'active.json')).sha256:null,approvedBy:'synthetic-owner',approvalRef:'synthetic://recover-killed-process',approvedAt:'2020-01-01',expiresAt:'2099-01-01',revoked:false};
  await assert.rejects(()=>api.recoverTransition(plan,approved,recovery,f.deps));assert.deepEqual(readFileSync(lock.path),lockBytes);
  const archival={schemaVersion:1,kind:'standing-control-lock-archive-approval',planSha256:plan.planSha256,approvalSha256:fingerprint(approved),controlLock:lock,journal,pointerSha256:recovery.pointerSha256,approvedBy:'synthetic-owner',approvalRef:'synthetic://archive-exact-dead-owner',approvedAt:'2020-01-01',expiresAt:'2099-01-01',revoked:false};
  const alive={...f.deps,execute:async(file,args)=>file===f.tools.ps.path?{code:0,stdout:readPrivateJSON(lock.path).pid+' 1 /synthetic/reused-pid\n',stderr:''}:f.deps.execute(file,args)};
  await assert.rejects(()=>api.archiveTransitionLock(plan,approved,archival,alive));assert.deepEqual(readFileSync(lock.path),lockBytes);
  const archived=await api.archiveTransitionLock(plan,approved,archival,f.deps);assert(!existsSync(lock.path));assert.deepEqual(readFileSync(archived.controlLock.path),lockBytes);
  const sourceBefore=readFileSync(join(f.newState,'legacy-source.json'));if(recovery.phase==='completed'){const {runActiveGeneration}=await import('./standing-launcher.mjs');await runActiveGeneration(f.controlDirectory,{poll:async()=>({state:'stopped'})});}else await api.recoverTransition(plan,approved,recovery,f.deps);assert.deepEqual(readFileSync(join(f.newState,'legacy-source.json')),sourceBefore);assert(existsSync(f.stopFile));
  }
});

test('the unchanged original migration expiry bounds continuation and old-r5 re-entry blocks cutover',async t=>{
 const api=await load();
 {
  const f=fixture(t),plan=api.planTransition(f.input);t.mock.method(Date,'now',()=>Date.parse('2026-11-02T00:00:00Z'));
  await assert.rejects(()=>api.applyTransition(plan,approval(plan),f.deps),/expired|Migration/i);assert(!existsSync(f.newState));t.mock.restoreAll();
 }
 for(const child of ['standing-dispatcher.mjs','naeil-standing-observer.mjs','standing-monitor.mjs','jev-native.py','code-activation.mts']) {
  const f=fixture(t),plan=api.planTransition(f.input);let awake=false;const execute=f.deps.execute;
  await assert.rejects(()=>api.applyTransition(plan,approval(plan),{...f.deps,afterBoundary:name=>{if(name==='journal-continuation-intent')awake=true;},execute:async(file,args)=>awake&&file===f.tools.ps.path?{code:0,stdout:'61 1 node '+child+' old.json\n',stderr:''}:execute(file,args)}),/process remains/i);
  assert(!existsSync(join(f.controlDirectory,'active.json')));assert(existsSync(f.stopFile));
 }
});

test('historical recovered and rolled-back Jev transactions need exact safe native output and verified predecessor evidence',async t=>{
 const api=await load();for(const phase of ['recovered','rolled-back']){const f=fixture(t);addJevHistory(f,phase);const plan=api.planTransition(f.input);await api.applyTransition(plan,approval(plan),f.deps);assert.equal(readPrivateJSON(f.input.nativeEvidence.jev.transactions[0].transaction.path).phase,phase);}
});
