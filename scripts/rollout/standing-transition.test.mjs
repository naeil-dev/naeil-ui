import assert from 'node:assert/strict';
import test from 'node:test';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { assertGenerationFence, atomicJSON, automationDigest, fileReference, fingerprint, generationDigest, hash, IDS, JSON_LIMITS, operationalGenerationDigest, ORIGINS, readActiveGeneration, readExactReference, readPrivateJSON, releaseIdentityDigest, routeKey, serializeJSON } from './standing-config.mjs';
import { codeManifest } from './consumer-artifact.mjs';
import { assertEvidencePath, readStandingState, standingEpochInventory, writeStandingState } from './standing-state.mjs';
import { syntheticJevArchive } from './fixtures/jev-archive.mjs';
import { syntheticSite } from './fixtures/site-continuation.mjs';
import { syntheticArchive } from './fixtures/release.mjs';
import { runtimeIndex } from './package-runtime.mjs';
import { declaration } from './fixtures/reviewed-expectations.mjs';

const automationRoot = resolve(new URL('../..', import.meta.url).pathname);
function fixture(t, parent = tmpdir()) {
  const root = realpathSync(mkdtempSync(join(parent, 'standing-transition-'))); chmodSync(root, 0o700); if(parent === tmpdir())t.after(() => rmSync(root, { recursive: true, force: true }));else t.diagnostic('Retained synthetic fixture: '+root);
  const directory = name => { const path = join(root, name); mkdirSync(path, { mode: 0o700 }); return path; };
  const controlDirectory = directory('control'), oldState = directory('old'), newState = join(root, 'epoch2'), nativeState = directory('native'), nativeMarkers = directory('native-markers'), jevState = directory('jev-state'), jevBase = directory('jev-native');
  mkdirSync(join(nativeState,'keys'),{mode:0o700}); mkdirSync(join(jevBase,'releases'),{mode:0o700});
  const stopFile = join(root, 'STOP'); writeFileSync(stopFile, 'STOP\n', { mode: 0o600 });
  const put = (name, value) => { const path = join(root, name); atomicJSON(path, value); return fileReference(path); };
  const trustedFiles = { [realpathSync(process.execPath)]: hash(readFileSync(process.execPath)) }, automationSha256 = automationDigest(automationRoot);
  const context = { automationSha256, trustedFiles, executionPath: '/usr/bin:/bin', stateSchemaVersion: 2 };
  const generation = { ...context, executionContexts: { estimate: context, jev: { ...context, executionPath: '/bin:/usr/bin' } } }, generationSha256 = operationalGenerationDigest(generation);
  const release = { schemaVersion: 1, releaseId: 'synthetic-0.7.2', version: '0.7.2', previousVersion: '0.7.1', sourceRevision: 'a'.repeat(40), siteSourceRevision: 'b'.repeat(40), archive: { sha256: 'c'.repeat(64) }, siteArchive: { sha256: 'd'.repeat(64) }, contract: { version: '1', sha256: 'e'.repeat(64) }, account: { sha256: 'f'.repeat(64) }, changes: ['dom'] };
  release.expectations = put('old/expectations.json', declaration(release));
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
    return{immutable:true,id:identity.artifactId,sourceRevision:identity.sourceRevision,ui:identity.ui,sha256,path,storageRef:'synthetic://'+sha256,packageSha256,...(id==='estimate'?{directory:store,releaseId:manifest.releaseId,manifestSha256:hash(readFileSync(manifestPath))}:{standalonePath:code,manifestPath,manifestSha256:hash(sorted),buildId:identity.artifactId})};
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
function approval(plan) { return { schemaVersion: 1, kind: 'standing-continuation-approval', action: 'continue-0.7.2-after-source-gate-failure', planSha256: plan.planSha256, previousApprovalSha256: plan.previousApprovalSha256, releaseSha256: releaseIdentityDigest(plan.release), generationSha256: plan.next.generationSha256, priorAttemptId: plan.estimate.priorAttemptId, attemptId: plan.estimate.newAttemptId, successorOf: plan.previousApprovalSha256, approvedBy: 'synthetic-owner', approvalRef: 'synthetic://exact-plan', approvedAt: '2020-01-01', expiresAt: '2099-01-01', revoked: false }; }

// These are synthetic retained bytes, not native executions or owner approvals.
function nativeHistory(f) {
  return Object.fromEntries([['estimateLedger', f.input.estimate.ledger], ['estimateBaseline', f.input.nativeEvidence.estimate.baseline], ['jevBaseline', f.input.nativeEvidence.jev.baseline]].map(([name, ref]) => {
    const path = join(f.root, 'retained-' + name + '.json'); writeFileSync(path, readFileSync(ref.path), { mode: 0o600 }); return [name, fileReference(path)];
  }));
}
function archiveCurrent(f, history) {
  const state = readStandingState(f.newState), estimate = state.releases['2'].services.estimate, jev = state.releases['2'].services.jev;
  const attempt = (id, service) => service?.request?.generationSha256 === f.config.generationSha256 ? join(f.root, id === 'estimate' ? 'native' : 'jev-state', 'attempts', service.request.attemptId) : null;
  const estimateAttempt = attempt('estimate', estimate), jevAttempt = attempt('jev', jev);
  const ledger = fileReference(f.input.estimate.ledger.path), priorLedger = estimateAttempt ? readdirSync(join(f.root, 'native/keys')).filter(name => name.startsWith(hash(f.input.estimate.idempotencyKey) + '.json.history-')).map(name => fileReference(join(f.root, 'native/keys', name)))[0] : ledger;
  return { state: fileReference(join(f.newState, 'state.json')), binding: fileReference(join(f.newState, 'generation-binding.json')), validatedRoot: fileReference(join(f.controlDirectory, 'transitions', readPrivateJSON(join(f.controlDirectory, 'transition.json')).planSha256, 'validated-root.json')), history,
    estimate: { baseline: fileReference(f.input.nativeEvidence.estimate.baseline.path), ledger, priorLedger, result: estimateAttempt ? fileReference(join(estimateAttempt, 'result.json')) : null, dispatches: estimateAttempt ? readdirSync(estimateAttempt).filter(name => name.startsWith('native-')).sort().map(name => fileReference(join(estimateAttempt, name, 'dispatch.json'))) : [] },
    jev: { baseline: fileReference(f.input.nativeEvidence.jev.baseline.path), result: jevAttempt ? fileReference(join(jevAttempt, 'result.json')) : null, transactions: [...f.input.nativeEvidence.jev.transactions, ...(f.currentJevEntry ? [f.currentJevEntry] : [])] } };
}
function archiveAuthorization(f, plan, approved, current = null, stop = fileReference(f.stopFile)) {
  const pointer = join(f.controlDirectory, 'active.json'), journal = join(f.controlDirectory, 'transition.json');
  return { schemaVersion: 1, kind: 'standing-control-lock-archive-approval', planSha256: plan.planSha256, approvalSha256: fingerprint(approved), controlLock: fileReference(join(f.controlDirectory, 'control.lock')), journal: existsSync(journal) ? fileReference(journal) : null, pointerSha256: existsSync(pointer) ? fileReference(pointer).sha256 : null, stop, current, approvedBy: 'synthetic-owner', approvalRef: 'synthetic://archive-exact-dead-owner', approvedAt: '2020-01-01', expiresAt: '2099-01-01', revoked: false };
}
function syntheticDeadLease(f, acquisition) {
  // Only the real-child case below establishes actual process death. Other
  // tests inject a raw OS inventory and never inspect/control native processes.
  const path = join(f.controlDirectory, 'control.lock');
  atomicJSON(path, { schemaVersion: 1, token: '11111111-1111-4111-8111-111111111111', pid: 99999999, startedAt: new Date().toISOString(), acquisition });
}
function activeAcquisition(f) { return { kind: 'standing-active-generation-acquisition', pointer: fileReference(join(f.controlDirectory, 'active.json')), journal: fileReference(join(f.controlDirectory, 'transition.json')) }; }
function preservedFiles(root) {
  const result = new Map();
  const walk = directory => { for (const name of readdirSync(directory, { withFileTypes: true })) { const path = join(directory, name.name); if (name.isDirectory()) walk(path); else if (name.isFile()) result.set(path, readFileSync(path)); } };
  walk(root); return result;
}
function assertArchivePreserved(before, archived, f) {
  for (const [path, bytes] of before) assert.deepEqual(readFileSync(path === join(f.controlDirectory, 'control.lock') ? archived.controlLock.path : path), bytes, path);
  const { index, quiescence, owner } = readArchiveProof(archived); assert.deepEqual(index.authorization, archived.authorization); assert.equal(index.ownerAbsent, true);
  assert(readFileSync(owner.stdout.path, 'utf8').includes('/synthetic/unrelated'));
  for (const fact of [...quiescence.facts, owner]) for (const stream of ['stdout', 'stderr']) { const ref = fact[stream], bytes = readFileSync(ref.path); assert.equal(bytes.length, ref.bytes); assert.equal(hash(bytes), ref.sha256); }
  assert(!existsSync(join(f.controlDirectory, 'control.lock'))); assert(!existsSync(join(f.controlDirectory, 'control-archive.lock')));
}

function unrelatedInventory(bytes, label, rows = 1, fill = 'x') {
  return Array.from({ length: rows }, (_, index) => {
    const prefix = (1000 + index) + ' 1 /synthetic/unrelated-' + label + ' ';
    return prefix + fill.repeat(bytes / rows - Buffer.byteLength(prefix) - 1) + '\n';
  }).join('');
}
function readArchiveProof(archived) {
  const index = JSON.parse(readExactReference(archived.proof, 262144)); assert.equal(index.schemaVersion, 2);
  return { index, acquisition: JSON.parse(readExactReference(index.acquisition, 262144)), quiescence: JSON.parse(readExactReference(index.quiescence, JSON_LIMITS.evidence)), owner: JSON.parse(readExactReference(index.ownerProcessInventory, 262144)) };
}
function archiveObservations(f, first, last) {
  const execute = f.deps.execute, observed = []; let processQueries = 0;
  f.deps.execute = async (file, args) => {
    const result = file === f.tools.ps.path ? { code: 0, stdout: ++processQueries === 1 ? first : last, stderr: '' } : await execute(file, args);
    observed.push({ file, args, result }); return result;
  };
  return observed;
}
async function assertArchiveStreams(api, archived, observed) {
  const saved = readArchiveProof(archived), facts = [...saved.quiescence.facts, saved.owner]; assert.equal(facts.length, observed.length);
  for (const [index, fact] of facts.entries()) {
    const expected = observed[index]; assert.equal(fact.path || fact.tool, expected.file); assert.deepEqual(fact.args, expected.args); assert.equal(fact.code, expected.result.code);
    for (const stream of ['stdout', 'stderr']) {
      const bytes = Buffer.from(expected.result[stream]), ref = fact[stream]; assert.equal(ref.bytes, bytes.length); assert.equal(ref.sha256, hash(bytes));
      assert.deepEqual(api.readArchivedControlStream(ref), bytes); assert.equal((await import('node:fs')).lstatSync(ref.path).mode & 0o777, 0o600);
    }
  }
  assert(Buffer.byteLength(readFileSync(archived.proof.path)) <= 262144); return saved;
}

test('IF2 bounded raw archival evidence preserves both 160000-byte inventories outside the control index in every journal phase', async t => {
  const api = await load();
  for (const phase of ['absent', 'incomplete', 'completed']) await t.test(phase, async st => {
    const f = fixture(st, process.env.STANDING_IF2_CASE_ROOT), history = nativeHistory(f), plan = api.planTransition(f.input), approved = approval(plan);
    if (phase === 'completed') await api.applyTransition(plan, approved, f.deps);
    if (phase === 'incomplete') await assert.rejects(() => api.applyTransition(plan, approved, { ...f.deps, afterBoundary: name => { if(name === 'journal-prepared')throw Error('synthetic prepared boundary'); } }), /synthetic prepared boundary/);
    syntheticDeadLease(f, phase === 'completed' ? activeAcquisition(f) : { kind: 'standing-transition-acquisition', plan, approval: approved });
    const lock = readPrivateJSON(join(f.controlDirectory, 'control.lock')), authorization = archiveAuthorization(f, plan, approved, phase === 'completed' ? archiveCurrent(f, history) : null), before = preservedFiles(f.root);
    const first = unrelatedInventory(160000, 'first', 500), last = unrelatedInventory(160000, 'last', 500), observed = archiveObservations(f, first, last);
    const archived = await api.archiveTransitionLock(plan, approved, authorization, f.deps), saved = await assertArchiveStreams(api, archived, observed);
    assert.deepEqual(saved.acquisition, lock.acquisition); assert.notEqual(saved.quiescence.facts.find(fact => fact.tool === 'ps').stdout.path, saved.owner.stdout.path);
    for (const [path, bytes] of before) assert.deepEqual(readFileSync(path === authorization.controlLock.path ? archived.controlLock.path : path), bytes);
    assert(!existsSync(authorization.controlLock.path)); assert(!existsSync(join(f.controlDirectory, 'control-archive.lock')));
  });
});

test('IF2 raw stream leaves accept the exact 1MiB byte bound despite JSON escaping and reject either over-bound inventory before rename', async t => {
  const api = await load(), limit = 1048576;
  for (const cause of ['exact', 'quiescence-over', 'owner-over']) await t.test(cause, async st => {
    const f = fixture(st, process.env.STANDING_IF2_CASE_ROOT), plan = api.planTransition(f.input), approved = approval(plan);
    syntheticDeadLease(f, { kind: 'standing-transition-acquisition', plan, approval: approved });
    const authorization = archiveAuthorization(f, plan, approved), before = preservedFiles(f.root);
    const first = unrelatedInventory(limit + (cause === 'quiescence-over' ? 1 : 0), 'first', 1, '\u0001'), last = unrelatedInventory(limit + (cause === 'owner-over' ? 1 : 0), 'last', 1, '\u0001');
    assert(Buffer.byteLength(JSON.stringify(first)) > 6 * 1024 * 1024 - 1024);
    const observed = archiveObservations(f, first, last);
    if (cause === 'exact') {
      const archived = await api.archiveTransitionLock(plan, approved, authorization, f.deps), saved = await assertArchiveStreams(api, archived, observed);
      assert.equal(saved.owner.stdout.bytes, limit); assert.equal(saved.owner.stderr.bytes, 0);
      assert.throws(() => api.readArchivedControlStream({ ...saved.owner.stdout, bytes: limit + 1 }), /Bounded/);
      assert.throws(() => api.readArchivedControlStream({ ...saved.owner.stdout, sha256: '0'.repeat(64) }), /changed/);
      assert.throws(() => api.readArchivedControlStream({ ...saved.owner.stdout, bytes: limit - 1 }), /changed/);
      for (const [path, bytes] of before) assert.deepEqual(readFileSync(path === authorization.controlLock.path ? archived.controlLock.path : path), bytes);
    } else {
      await assert.rejects(() => api.archiveTransitionLock(plan, approved, authorization, f.deps), /Bounded/); assertArchivalRefused(before, f);
    }
  });
});

test('IF2 an exact maximum control-lock acquisition remains a separate bounded leaf rather than overflowing the archival index', async t => {
  const api = await load(), f = fixture(t, process.env.STANDING_IF2_CASE_ROOT), plan = api.planTransition(f.input), approved = approval(plan), lockPath = join(f.controlDirectory, 'control.lock');
  const acquisition = { kind: 'standing-transition-acquisition', plan, approval: approved }; syntheticDeadLease(f, acquisition);
  approved.approvalRef += 'x'.repeat(262144 - fileReference(lockPath).bytes); syntheticDeadLease(f, acquisition); assert.equal(fileReference(lockPath).bytes, 262144);
  const authorization = archiveAuthorization(f, plan, approved), before = preservedFiles(f.root), observed = archiveObservations(f, unrelatedInventory(160000, 'first', 500), unrelatedInventory(160000, 'last', 500));
  const archived = await api.archiveTransitionLock(plan, approved, authorization, f.deps), saved = await assertArchiveStreams(api, archived, observed);
  assert.deepEqual(saved.acquisition, acquisition); assert(serializeJSON(acquisition, 262144).length > 200000); assert(readFileSync(archived.proof.path).length < 16384);
  for (const [path, bytes] of before) assert.deepEqual(readFileSync(path === lockPath ? archived.controlLock.path : path), bytes);
});
test('IF2 fresh exact archival authorization preserves partial prior evidence and archives in its own namespace', async t => {
  const api = await load(), { default: fs } = await import('node:fs'), { syncBuiltinESMExports } = await import('node:module');
  for (const boundary of ['owner-stream', 'final-proof']) await t.test(boundary, async st => {
  const f = fixture(st, process.env.STANDING_IF2_CASE_ROOT), plan = api.planTransition(f.input), approved = approval(plan);
  syntheticDeadLease(f, { kind: 'standing-transition-acquisition', plan, approval: approved });
  const authorization = archiveAuthorization(f, plan, approved), before = preservedFiles(f.root), directory = join(f.controlDirectory, 'transitions', plan.planSha256);
  archiveObservations(f, unrelatedInventory(320, 'prior-first'), unrelatedInventory(320, 'prior-owner'));
  const original = { openSync: fs.openSync, closeSync: fs.closeSync, fsyncSync: fs.fsyncSync }, descriptors = new Map(); let injected = false;
  fs.openSync = (path, ...args) => { const fd = original.openSync(path, ...args); descriptors.set(fd, path); return fd; };
  fs.closeSync = fd => { descriptors.delete(fd); return original.closeSync(fd); };
  fs.fsyncSync = fd => { const path = String(descriptors.get(fd)); if (!injected && (boundary === 'owner-stream' ? path.endsWith('-owner-stdout.raw') : path.includes('/lock-archive-proof-'))) { injected = true; throw Error('synthetic partial archival storage failure'); } return original.fsyncSync(fd); };
  syncBuiltinESMExports();
  try { await assert.rejects(() => api.archiveTransitionLock(plan, approved, authorization, f.deps), /synthetic partial archival storage failure/); }
  finally { Object.assign(fs, original); syncBuiltinESMExports(); }
  assert(injected); assert(existsSync(authorization.controlLock.path)); assert(!existsSync(join(f.controlDirectory, 'control-archive.lock')));
  for (const [path, bytes] of before) assert.deepEqual(readFileSync(path), bytes);
  const partial = preservedFiles(directory); assert([...partial.keys()].some(path => path.endsWith('-quiescence.json')));
  assert.equal([...partial.keys()].some(path => path.includes('/lock-archive-proof-')), boundary === 'final-proof');
  const fresh = { ...authorization, approvalRef: authorization.approvalRef + '/fresh-explicit-attempt' }; assert.notEqual(fingerprint(fresh), fingerprint(authorization));
  const observed = archiveObservations(f, unrelatedInventory(320, 'fresh-first'), unrelatedInventory(320, 'fresh-owner'));
  const archived = await api.archiveTransitionLock(plan, approved, fresh, f.deps), saved = await assertArchiveStreams(api, archived, observed);
  assert.deepEqual(readPrivateJSON(archived.authorization.path), fresh); assert.deepEqual(saved.index.authorization, archived.authorization);
  for (const [path, bytes] of partial) assert.deepEqual(readFileSync(path), bytes, 'Prior partial archival evidence was overwritten');
  for (const [path, bytes] of before) assert.deepEqual(readFileSync(path === authorization.controlLock.path ? archived.controlLock.path : path), bytes);
  });
});
function terminalProgress(f, plan, ids) {
  const state = readStandingState(f.newState), record = state.releases['2'], pointerSha256 = fileReference(join(f.controlDirectory, 'active.json')).sha256;
  for (const id of ids) {
    const adapter = readPrivateJSON(join(f.root, id + '.json')), service = Object.fromEntries(Object.entries(f.config.services[id]).filter(([key]) => key !== 'command'));
    const attemptId = id === 'estimate' ? plan.estimate.newAttemptId : 'jev-current-attempt';
    const outputDirectory = join(f.newState, 'runs/2', id, attemptId); mkdirSync(outputDirectory, { recursive: true, mode: 0o700 });
    const request = { schemaVersion: 1, mode: 'standing', release: plan.release, service, policy: f.config.policy, trustedFiles: f.config.trustedFiles, executionPath: f.config.generation.executionContexts[id].executionPath, generationSha256: f.config.generationSha256, configReferences: f.config.configReferences, configReferencesSha256: f.config.configReferencesSha256, generationFence: { controlDirectory: f.controlDirectory, pointerSha256 }, idempotencyKey: plan.release.releaseId + ':' + id, attemptId, outputDirectory, candidate: { ...readPrivateJSON(plan.sourceHandoffs[id].candidate.path), receipt: plan.sourceHandoffs[id].candidate }, sourceAdoption: adapter.handoff.sourceAdoption, ...(id === 'estimate' ? { reconciliation: { priorAttemptId: plan.estimate.priorAttemptId } } : {}) };
    const identity = { schemaVersion: 1, appId: service.appId, artifactId: id + '-successor', sourceRevision: '7'.repeat(40), ui: { version: '0.7.2', contractVersion: '1' } };
    const artifact = f.makeNativeArtifact(id, identity, id + '-successor-artifact', plan.release.archive.sha256);
    const production = { schemaVersion: 1, passed: true, releaseId: plan.release.releaseId, serviceId: id, idempotencyKey: request.idempotencyKey, attemptId, phase: 'production', identity, archiveSha256: plan.release.archive.sha256, referenceSha256: plan.release.contract.sha256, accountReferenceSha256: plan.release.account.sha256, expectationsSha256: plan.release.expectations.sha256, checkedAt: new Date().toISOString(), routes: service.routes.map(route => ({ path: route.path, routeKey: routeKey(route), passed: true })) };
    const result = { schemaVersion: 1, releaseId: plan.release.releaseId, serviceId: id, idempotencyKey: request.idempotencyKey, attemptId, state: 'production-verified', mutationAttempted: true, ...(id === 'estimate' ? { runtimeMutationAttempted: true } : {}), artifact, previousArtifact: f.nativeArtifacts[id], production, candidateReceipt: plan.sourceHandoffs[id].candidate, sourceAdoptionSha256: adapter.handoff.sourceAdoptionSha256 };
    const attempt = join(adapter.stateDirectory, 'attempts', attemptId); mkdirSync(attempt, { recursive: true, mode: 0o700 }); atomicJSON(join(attempt, 'result.json'), { ...result, checkedAt: new Date().toISOString() }); atomicJSON(join(outputDirectory, 'output.json'), result);
    atomicJSON(join(adapter.stateDirectory, 'baseline.json'), { ...(id === 'jev' ? { schemaVersion: 1, service: { id, appId: service.appId, origin: service.origin, routes: service.routes } } : {}), state: 'production-verified', artifact, release: plan.release, production, verifiedAt: new Date().toISOString() });
    if (id === 'estimate') {
      const ledger = plan.estimate.ledger.path; writeFileSync(ledger + '.history-11111111-1111-4111-8111-111111111111', readFileSync(ledger), { mode: 0o600 });
      atomicJSON(ledger, { attemptId, idempotencyKey: request.idempotencyKey, state: 'production-verified', mutationAttempted: true, runtimeMutationAttempted: true, completedAt: new Date().toISOString() });
      for (const [label, action, target] of [['inspect-before', 'inspect', f.nativeArtifacts[id]], ['deploy', 'deploy', artifact], ['activate', 'activate', artifact], ['inspect-after', 'inspect', artifact]]) {
        const directory = join(attempt, 'native-' + label); mkdirSync(directory, { mode: 0o700 });
        atomicJSON(join(directory, 'dispatch.json'), { state: 'completed', action, response: { schemaVersion: 1, releaseId: plan.release.releaseId, serviceId: id, idempotencyKey: request.idempotencyKey, attemptId, action, passed: true, nativeReleaseId: target.releaseId, artifactId: target.id, ...(action === 'inspect' ? { mutationAttempted: false } : action === 'deploy' ? { deploymentId: target.releaseId } : { activated: true, preservationVerified: true }) }, checkedAt: new Date().toISOString() });
      }
    } else {
      const directory = join(adapter.native.baseDirectory, 'releases/ui-' + attemptId); mkdirSync(directory, { mode: 0o700 });
      const nativeRequest = { ...request, artifact, previousArtifact: result.previousArtifact, transactionDirectory: directory, action: 'activate', config: { ...adapter.native, baselineArtifact: adapter.baselineArtifact } };
      const nativeRelease = { ...plan.release, archive: Object.fromEntries(Object.entries(plan.release.archive).filter(([key]) => key !== 'path')), contract: Object.fromEntries(Object.entries(plan.release.contract).filter(([key]) => key !== 'path')) };
      const transaction = { schemaVersion: 1, releaseId: plan.release.releaseId, serviceId: id, idempotencyKey: request.idempotencyKey, attemptId, phase: 'active', configSha256: hash(JSON.stringify(nativeRequest.config, (_key, value) => value && typeof value === 'object' && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).sort()) : value)), releaseFingerprint: fingerprint(nativeRelease), before: readPrivateJSON(result.previousArtifact.manifestPath), after: readPrivateJSON(artifact.manifestPath), identity, previousIdentity: f.input.predecessors.jev, artifact, previousArtifact: result.previousArtifact };
      f.currentJevEntry = { transaction: f.put('jev-native/releases/ui-' + attemptId + '/transaction.json', transaction), request: f.put('jev-current-native-input.json', nativeRequest), nativeResult: f.put('jev-current-native-output.json', { schemaVersion: 1, releaseId: plan.release.releaseId, serviceId: id, idempotencyKey: request.idempotencyKey, attemptId, action: 'activate', passed: true, activated: true, safe: true }), result: fileReference(join(attempt, 'result.json')), adapterConfig: f.config.configReferences.find(ref => ref.path === service.adapterOptions.standingConfigPath), predecessorBaseline: f.put('jev-current-predecessor.json', readPrivateJSON(join(f.root, 'retained-jevBaseline.json'))), rollbackTransaction: null };
    }
    record.services[id] = { state: result.state, request, result, completedAt: new Date().toISOString() }; f.identities[id] = identity;
  }
  if (ids.includes('jev')) { state.currentVersion = plan.release.version; record.state = 'complete'; }
  writeStandingState(f.newState, state, { ...f.config, generationFence: { controlDirectory: f.controlDirectory, pointerSha256 } });
}

test('IF1 acquisition binds exact unvalidated plan and approval before a real child dies before the first journal', async t => {
  const api = await load(), f = fixture(t), plan = api.planTransition(f.input), approved = approval(plan);
  const transfer = f.put('prejournal-child.json', { plan, approved });
  const script = `import {readPrivateJSON} from ${JSON.stringify(new URL('./standing-config.mjs', import.meta.url).href)};import {applyTransition} from ${JSON.stringify(new URL('./standing-transition.mjs', import.meta.url).href)};const f=readPrivateJSON(process.argv[1]);await applyTransition(f.plan,f.approved,{platform:'darwin',execute:async()=>{throw Error('No OS probe may run before this synthetic death');},fetchImpl:async()=>{process.kill(process.pid,'SIGKILL');},afterBoundary:name=>{if(name==='control-acquired')process.kill(process.pid,'SIGKILL');}});`;
  const child = spawn(process.execPath, ['--input-type=module', '--eval', script, transfer.path], { stdio: ['ignore', 'ignore', 'pipe'], env: { PATH: '/usr/bin:/bin', LANG: 'C', LC_ALL: 'C' } });
  let errors = ''; child.stderr.on('data', bytes => { errors += bytes; }); const [code, signal] = await once(child, 'exit'); assert.equal(signal, 'SIGKILL', errors); assert.equal(code, null);
  const lock = readPrivateJSON(join(f.controlDirectory, 'control.lock')); assert.equal(lock.pid, child.pid);
  assert.deepEqual(lock.acquisition, { kind: 'standing-transition-acquisition', plan, approval: approved }); assert.equal(lock.acquisition.phase, undefined);
  assert(!existsSync(join(f.controlDirectory, 'transition.json'))); assert(!existsSync(f.newState));
  const authorization = archiveAuthorization(f, plan, approved), before = preservedFiles(f.root);
  await assert.rejects(() => api.applyTransition(plan, approved, f.deps), /EEXIST/);
  const archived = await api.archiveTransitionLock(plan, approved, authorization, f.deps); assertArchivePreserved(before, archived, f);
  assert(!existsSync(join(f.controlDirectory, 'transition.json')), 'Archival cannot fabricate a journal');
  await api.applyTransition(plan, approved, f.deps); assert.equal(readPrivateJSON(join(f.controlDirectory, 'transition.json')).phase, 'completed');
});

test('IF1 retained authority loss before the first journal is archival evidence, never a completed phase or renewed approval', async t => {
  const api = await load(), f = fixture(t), plan = api.planTransition(f.input), approved = approval(plan), stopBytes = readFileSync(f.stopFile);
  const transfer = f.put('authority-loss-child.json', { plan, approved });
  const script = `import {unlinkSync} from 'node:fs';import {readPrivateJSON} from ${JSON.stringify(new URL('./standing-config.mjs', import.meta.url).href)};import {applyTransition} from ${JSON.stringify(new URL('./standing-transition.mjs', import.meta.url).href)};const f=readPrivateJSON(process.argv[1]);try{await applyTransition(f.plan,f.approved,{afterBoundary:name=>{if(name==='control-acquired')unlinkSync(f.plan.stopFile);}});process.exitCode=2;}catch{process.exitCode=0;}`;
  const child = spawn(process.execPath, ['--input-type=module', '--eval', script, transfer.path], { stdio: ['ignore', 'ignore', 'pipe'], env: { PATH: '/usr/bin:/bin', LANG: 'C', LC_ALL: 'C' } });
  let errors = ''; child.stderr.on('data', bytes => { errors += bytes; }); const [code, signal] = await once(child, 'exit'); assert.equal(code, 0, errors); assert.equal(signal, null);
  const path = join(f.controlDirectory, 'control.lock'), bytes = readFileSync(path); assert.equal(readPrivateJSON(path).pid, child.pid); assert(!existsSync(join(f.controlDirectory, 'transition.json')));
  const authorization = archiveAuthorization(f, plan, approved, null, { path: f.stopFile, bytes: stopBytes.length, sha256: hash(stopBytes) });
  await assert.rejects(() => api.archiveTransitionLock(plan, approved, authorization, f.deps)); assert.deepEqual(readFileSync(path), bytes);
  writeFileSync(f.stopFile, stopBytes, { mode: 0o600 }); const before = preservedFiles(f.root);
  const archived = await api.archiveTransitionLock(plan, approved, authorization, f.deps); assertArchivePreserved(before, archived, f);
  assert(!existsSync(f.newState)); assert(!existsSync(join(f.controlDirectory, 'transition.json'))); assert.deepEqual(approved, approval(plan));
});

test('IF1 completed-generation archival accepts unchanged state, Estimate terminal progress and both terminal services', async t => {
  const api = await load();
  for (const ids of [[], ['estimate'], ['estimate', 'jev']]) await t.test(ids.join('+') || 'before-consumer-progress', async () => {
    const f = fixture(t), history = nativeHistory(f), plan = api.planTransition(f.input), approved = approval(plan);
    await api.applyTransition(plan, approved, f.deps); if (ids.length) terminalProgress(f, plan, ids);
    syntheticDeadLease(f, activeAcquisition(f));
    const authorization = archiveAuthorization(f, plan, approved, archiveCurrent(f, history)), before = preservedFiles(f.root);
    const archived = await api.archiveTransitionLock(plan, approved, authorization, f.deps); assertArchivePreserved(before, archived, f);
    assert.equal(readPrivateJSON(join(f.controlDirectory, 'transition.json')).phase, 'completed');
    assert.deepEqual(readPrivateJSON(archived.authorization.path), authorization);
  });
});

test('IF1 archival fsyncs exact authorization and raw proof before rename and retains its fence on post-rename storage failure', async t => {
  const api = await load(), { default: fs } = await import('node:fs'), { syncBuiltinESMExports } = await import('node:module');
  for (const storageFailure of [false, true]) await t.test(storageFailure ? 'post-rename-storage-failure' : 'durable-before-rename', async () => {
    const f = fixture(t), history = nativeHistory(f), plan = api.planTransition(f.input), approved = approval(plan);
    await api.applyTransition(plan, approved, f.deps); syntheticDeadLease(f, activeAcquisition(f));
    const authorization = archiveAuthorization(f, plan, approved, archiveCurrent(f, history)), before = preservedFiles(f.root), lockPath = authorization.controlLock.path;
    const directory = join(f.controlDirectory, 'transitions', plan.planSha256), authorizationPath = join(directory, 'lock-archive-approval-' + fingerprint(authorization) + '.json'), proofPath = join(directory, 'lock-archive-proof-' + fingerprint(authorization) + '.json');
    const original = { openSync: fs.openSync, closeSync: fs.closeSync, fsyncSync: fs.fsyncSync, renameSync: fs.renameSync }, descriptors = new Map(), synced = []; let renamed = false, archived;
    fs.openSync = (path, ...args) => { const fd = original.openSync(path, ...args); descriptors.set(fd, path); return fd; };
    fs.closeSync = fd => { descriptors.delete(fd); return original.closeSync(fd); };
    fs.fsyncSync = fd => { if (storageFailure && renamed && descriptors.get(fd) === directory) throw Error('synthetic post-rename storage failure'); synced.push(descriptors.get(fd)); return original.fsyncSync(fd); };
    fs.renameSync = (source, destination) => {
      if (source === lockPath) {
        assert.deepEqual(readPrivateJSON(authorizationPath), authorization);
        const { index, acquisition, quiescence, owner } = readArchiveProof({ proof: fileReference(proofPath) }); assert.equal(index.ownerAbsent, true); assert.deepEqual(acquisition, readPrivateJSON(source).acquisition);
        const refs = [index.authorization, index.acquisition, index.quiescence, index.ownerProcessInventory];
        for (const fact of [...quiescence.facts, owner]) for (const stream of ['stdout', 'stderr']) { const ref = fact[stream]; api.readArchivedControlStream(ref); refs.push(ref); }
        assert(synced.includes(proofPath));
        for (const ref of refs) assert(synced.includes(ref.path) && synced.lastIndexOf(ref.path) < synced.lastIndexOf(proofPath), 'Every referenced leaf must be durable before the index');
        assert(synced.lastIndexOf(directory) > synced.lastIndexOf(proofPath), 'The proof directory must be durable before moving ownership');
        original.renameSync(source, destination); renamed = true; return;
      }
      return original.renameSync(source, destination);
    };
    syncBuiltinESMExports();
    try {
      if (storageFailure) await assert.rejects(() => api.archiveTransitionLock(plan, approved, authorization, f.deps), /post-rename storage failure/);
      else archived = await api.archiveTransitionLock(plan, approved, authorization, f.deps);
    } finally { Object.assign(fs, original); syncBuiltinESMExports(); }
    assert(renamed);
    if (storageFailure) {
      assert(existsSync(join(f.controlDirectory, 'control-archive.lock')));
      const { acquireControlLock } = await import('./standing-config.mjs'); assert.throws(() => acquireControlLock(f.controlDirectory), /archival/);
      for (const [path, bytes] of before) assert.deepEqual(readFileSync(path === lockPath ? join(directory, 'archived-control-lock-' + authorization.controlLock.sha256 + '.json') : path), bytes);
    } else assertArchivePreserved(before, archived, f);
  });
});

function assertArchivalRefused(before, f, drift = new Set()) {
  for (const [path, bytes] of before) if (!drift.has(path)) assert.deepEqual(readFileSync(path), bytes, path);
  assert(existsSync(join(f.controlDirectory, 'control.lock')));
  const path = join(f.controlDirectory, 'transitions');
  if (existsSync(path)) for (const directory of readdirSync(path)) assert(readdirSync(join(path, directory)).every(name => !name.startsWith('lock-archive-') && !name.startsWith('archived-control-lock-')), 'Refused archival wrote authority/proof or moved a lock');
}
test('IF1 absent-journal archival refuses ambiguous admission and rechecks exact authority/evidence across awaits', async t => {
  const api = await load();
  for (const cause of ['unbound', 'malformed', 'live-owner', 'reused-pid', 'owner-child', 'journal', 'pointer', 'old-snapshot', 'missing-stop', 'changed-approval', 'epoch', 'archive-fence', 'native-marker', 'uncertain-ledger', 'approval-await', 'authorization-await', 'snapshot-await', 'pointer-await', 'journal-await', 'lock-await', 'stop-await', 'archive-fence-await', 'expiry-await', 'rejected-await']) await t.test(cause, async () => {
    const f = fixture(t), plan = api.planTransition(f.input), approved = approval(plan), lockPath = join(f.controlDirectory, 'control.lock');
    syntheticDeadLease(f, { kind: 'standing-transition-acquisition', plan, approval: approved });
    const authorization = archiveAuthorization(f, plan, approved), drift = new Set();
    const overwrite = (path, value) => { atomicJSON(path, value); drift.add(path); };
    if (cause === 'unbound') { const lock = readPrivateJSON(lockPath); delete lock.acquisition; atomicJSON(lockPath, lock); authorization.controlLock = fileReference(lockPath); }
    if (cause === 'malformed') { atomicJSON(lockPath, { pid: 99999999 }); authorization.controlLock = fileReference(lockPath); }
    if (cause === 'live-owner') { atomicJSON(lockPath, { ...readPrivateJSON(lockPath), pid: process.pid }); authorization.controlLock = fileReference(lockPath); }
    if (cause === 'journal') atomicJSON(join(f.controlDirectory, 'transition.json'), { phase: 'prepared' });
    if (cause === 'pointer') atomicJSON(join(f.controlDirectory, 'active.json'), { foreign: true });
    if (cause === 'old-snapshot') atomicJSON(join(f.oldState, 'state.json'), { foreign: true });
    if (cause === 'missing-stop') rmSync(f.stopFile);
    if (cause === 'changed-approval') approved.approvalRef += '-changed';
    if (cause === 'epoch') { mkdirSync(f.newState, { mode: 0o700 }); atomicJSON(join(f.newState, 'unexpected.json'), { foreign: true }); }
    if (cause === 'archive-fence') atomicJSON(join(f.controlDirectory, 'control-archive.lock'), { incomplete: true });
    if (cause === 'native-marker') atomicJSON(join(f.root, 'native-markers/operation.json'), { unresolved: true });
    if (cause === 'uncertain-ledger') atomicJSON(f.input.estimate.ledger.path, { state: 'invoked' });
    let mutated = false; const execute = f.deps.execute, fetchImpl = f.deps.fetchImpl, now = Date.now(); let clock = now;
    if (cause === 'expiry-await') { t.mock.method(Date, 'now', () => clock); authorization.expiresAt = new Date(now + 1000).toISOString(); }
    f.deps.execute = async (file, args) => {
      if (file === f.tools.ps.path && ['reused-pid', 'owner-child'].includes(cause)) return { code: 0, stdout: cause === 'reused-pid' ? '99999999 1 /synthetic/reused-pid\n' : '99999998 99999999 /synthetic/child\n', stderr: '' };
      return execute(file, args);
    };
    f.deps.fetchImpl = async url => {
      if (!mutated && cause.endsWith('-await')) {
        mutated = true;
        if (cause === 'approval-await') approved.revoked = true;
        if (cause === 'authorization-await') authorization.approvalRef += '-substitution';
        if (cause === 'snapshot-await') overwrite(join(f.oldState, 'state.json'), { foreign: true });
        if (cause === 'pointer-await') overwrite(join(f.controlDirectory, 'active.json'), { foreign: true });
        if (cause === 'journal-await') overwrite(join(f.controlDirectory, 'transition.json'), { phase: 'prepared' });
        if (cause === 'lock-await') overwrite(lockPath, { ...readPrivateJSON(lockPath), token: '22222222-2222-4222-8222-222222222222' });
        if (cause === 'stop-await') { rmSync(f.stopFile); drift.add(f.stopFile); }
        if (cause === 'archive-fence-await') overwrite(join(f.controlDirectory, 'control-archive.lock'), { incomplete: true });
        if (cause === 'expiry-await') clock = now + 1001;
        if (cause === 'rejected-await') { approved.revoked = true; throw Error('synthetic rejected identity await'); }
      }
      return fetchImpl(url);
    };
    const before = preservedFiles(f.root);
    await assert.rejects(() => api.archiveTransitionLock(plan, approved, authorization, f.deps));
    if (cause.endsWith('-await')) assert(mutated, 'The intended awaited boundary was not reached');
    assertArchivalRefused(before, f, drift); t.mock.restoreAll();
    assert(!existsSync(f.newState) || cause === 'epoch');
  });
});

test('IF1 completed archival refuses conflicting current state, evidence, identities, children and nonterminal native work', async t => {
  const api = await load();
  for (const cause of ['state', 'epoch', 'generation-binding', 'baseline', 'ledger', 'prior-ledger', 'result', 'transport-output', 'native-invoking', 'unrelated-dispatch', 'unrelated-ledger', 'unrelated-attempt', 'jev-unrelated', 'jev-nonterminal', 'jev-next', 'jev-result', 'identity', 'running-child', 'reused-pid', 'running-lock', 'marker', 'pending-intent', 'uncertain-state', 'unbound-request', 'migration-expiry', 'approval-expiry', 'archive-expiry', 'state-await', 'baseline-await', 'output-await', 'identity-await', 'approval-await', 'expiry-await', 'owner-proof-await', 'owner-proof-marker-await', 'owner-proof-process-await']) await t.test(cause, async () => {
    const f = fixture(t), history = nativeHistory(f), plan = api.planTransition(f.input), approved = approval(plan);
    await api.applyTransition(plan, approved, f.deps); terminalProgress(f, plan, ['estimate', 'jev']);
    const statePath = join(f.newState, 'state.json'), current = archiveCurrent(f, history), drift = new Set(), beforeState = readStandingState(f.newState);
    const overwrite = (path, value) => { atomicJSON(path, value); drift.add(path); };
    const changeState = change => { const state = readStandingState(f.newState); change(state); writeStandingState(f.newState, state, { ...f.config, generationFence: { controlDirectory: f.controlDirectory, pointerSha256: fileReference(join(f.controlDirectory, 'active.json')).sha256 } }); };
    const estimateAttempt = join(f.root, 'native/attempts', plan.estimate.newAttemptId), jevTransaction = f.currentJevEntry.transaction.path;
    if (cause === 'state') atomicJSON(statePath, { ...readPrivateJSON(statePath), foreign: true });
    if (cause === 'epoch') atomicJSON(statePath, { ...readPrivateJSON(statePath), epochId: 'foreign' });
    if (cause === 'generation-binding') atomicJSON(current.binding.path, { foreign: true });
    if (cause === 'baseline') { atomicJSON(current.estimate.baseline.path, { ...readPrivateJSON(current.estimate.baseline.path), artifact: f.nativeArtifacts.estimate }); current.estimate.baseline = fileReference(current.estimate.baseline.path); }
    if (cause === 'ledger') { atomicJSON(current.estimate.ledger.path, { ...readPrivateJSON(current.estimate.ledger.path), attemptId: 'foreign' }); current.estimate.ledger = fileReference(current.estimate.ledger.path); }
    if (cause === 'prior-ledger') { atomicJSON(current.estimate.priorLedger.path, { foreign: true }); current.estimate.priorLedger = fileReference(current.estimate.priorLedger.path); }
    if (cause === 'result') { atomicJSON(current.estimate.result.path, { ...readPrivateJSON(current.estimate.result.path), runtimeMutationAttempted: false }); current.estimate.result = fileReference(current.estimate.result.path); }
    if (cause === 'transport-output') atomicJSON(join(beforeState.releases['2'].services.estimate.request.outputDirectory, 'output.json'), { foreign: true });
    if (cause === 'native-invoking') { const path = join(estimateAttempt, 'native-activate/dispatch.json'); atomicJSON(path, { ...readPrivateJSON(path), state: 'invoked' }); current.estimate.dispatches = current.estimate.dispatches.map(ref => ref.path === path ? fileReference(path) : ref); }
    if (cause === 'unrelated-dispatch') { mkdirSync(join(estimateAttempt, 'native-foreign'), { mode: 0o700 }); atomicJSON(join(estimateAttempt, 'native-foreign/dispatch.json'), { state: 'completed' }); }
    if (cause === 'unrelated-ledger') atomicJSON(join(f.root, 'native/keys', hash('foreign') + '.json'), { attemptId: 'foreign', idempotencyKey: 'foreign', state: 'production-verified' });
    if (cause === 'unrelated-attempt') { mkdirSync(join(f.root, 'native/attempts/foreign'), { mode: 0o700 }); atomicJSON(join(f.root, 'native/attempts/foreign/result.json'), { state: 'production-verified' }); }
    if (cause === 'jev-unrelated') mkdirSync(join(f.root, 'jev-native/releases/ui-foreign'), { mode: 0o700 });
    if (cause === 'jev-nonterminal') { atomicJSON(jevTransaction, { ...readPrivateJSON(jevTransaction), phase: 'preparing' }); f.currentJevEntry.transaction = fileReference(jevTransaction); }
    if (cause === 'jev-next') atomicJSON(join(f.root, 'jev-native/releases/ui-jev-current-attempt/transaction.next.json'), { incomplete: true });
    if (cause === 'jev-result') { atomicJSON(current.jev.result.path, { ...readPrivateJSON(current.jev.result.path), previousArtifact: f.nativeArtifacts.estimate }); current.jev.result = fileReference(current.jev.result.path); f.currentJevEntry.result = current.jev.result; }
    if (cause === 'identity') f.identities.estimate = { ...f.identities.estimate, artifactId: 'foreign' };
    if (cause === 'running-lock') atomicJSON(join(f.root, 'jev-state/running.lock'), { unresolved: true });
    if (cause === 'marker') atomicJSON(join(f.root, 'native-markers/operation.json'), { unresolved: true });
    if (cause === 'pending-intent') atomicJSON(join(f.newState, 'pending-intent.json'), { schemaVersion: 1, intents: [] });
    if (cause === 'uncertain-state') changeState(state => { state.releases['2'].services.jev.state = 'uncertain'; });
    if (cause === 'unbound-request') changeState(state => { state.releases['2'].services.estimate.request.generationSha256 = '0'.repeat(64); });
    if (['uncertain-state', 'unbound-request'].includes(cause)) current.state = fileReference(statePath);
    syntheticDeadLease(f, activeAcquisition(f)); const authorization = archiveAuthorization(f, plan, approved, current), now = Date.now(); let clock = now, mutated = false;
    if (cause === 'migration-expiry') t.mock.method(Date, 'now', () => Date.parse('2026-11-02T00:00:00Z'));
    if (cause === 'approval-expiry') approved.expiresAt = '2001-01-01';
    if (cause === 'archive-expiry') authorization.expiresAt = '2001-01-01';
    if (cause === 'expiry-await') { t.mock.method(Date, 'now', () => clock); authorization.expiresAt = new Date(now + 1000).toISOString(); }
    const execute = f.deps.execute, fetchImpl = f.deps.fetchImpl; let ownerProcessProbes = 0;
    f.deps.execute = async (file, args) => {
      if (file === f.tools.ps.path && ['running-child', 'reused-pid'].includes(cause)) return { code: 0, stdout: cause === 'running-child' ? '66 1 node jev-native.py\n' : '99999999 1 /synthetic/reused-pid\n', stderr: '' };
      if (file === f.tools.ps.path) ownerProcessProbes++;
      if (cause.startsWith('owner-proof-') && ownerProcessProbes === 2 && !mutated) { mutated = true; if(cause==='owner-proof-await')overwrite(current.estimate.baseline.path, { foreign: true }); if(cause==='owner-proof-marker-await')overwrite(join(f.root,'native-markers/operation.json'),{unresolved:true}); if(cause==='owner-proof-process-await')return {code:0,stdout:'66 1 node code-activation.mts\n',stderr:''}; }
      return execute(file, args);
    };
    f.deps.fetchImpl = async url => {
      if (!mutated && cause.endsWith('-await') && !cause.startsWith('owner-proof-')) {
        mutated = true;
        if (cause === 'state-await') overwrite(statePath, { ...readPrivateJSON(statePath), foreign: true });
        if (cause === 'baseline-await') overwrite(current.estimate.baseline.path, { foreign: true });
        if (cause === 'output-await') overwrite(join(beforeState.releases['2'].services.estimate.request.outputDirectory, 'output.json'), { foreign: true });
        if (cause === 'identity-await') f.identities.jev = { ...f.identities.jev, artifactId: 'foreign' };
        if (cause === 'approval-await') approved.revoked = true;
        if (cause === 'expiry-await') clock = now + 1001;
      }
      return fetchImpl(url);
    };
    const before = preservedFiles(f.root);
    await assert.rejects(() => api.archiveTransitionLock(plan, approved, authorization, f.deps));
    if (cause.endsWith('-await')) assert(mutated, 'The intended awaited boundary was not reached');
    assertArchivalRefused(before, f, drift); t.mock.restoreAll();
  });
});

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
  for (const [name, ref] of [['estimate-ledger', f.input.estimate.ledger], ['estimate-baseline', f.input.nativeEvidence.estimate.baseline], ['jev-baseline', f.input.nativeEvidence.jev.baseline]]) assert.deepEqual(readFileSync(join(f.controlDirectory, 'transitions', plan.planSha256, 'historical-' + name + '.json')), readFileSync(ref.path));
});

test('I1: the exact nonzero Estimate transport envelope preserves both original records', async t => {
  const api = await load(), f = fixture(t), nativePath = join(f.oldState, 'output.json');
  const nativeBytes = readFileSync(nativePath);
  f.state.releases['2'].services.estimate.result.transportExitCode = 1;
  atomicJSON(join(f.oldState, 'state.json'), f.state);
  f.input.old.snapshot = f.put('snapshot.json', f.state);
  const snapshotBytes = readFileSync(f.input.old.snapshot.path), plan = api.planTransition(f.input);
  await api.applyTransition(plan, approval(plan), f.deps);
  const retained = readStandingState(f.newState).releases['2'].history.at(-1).prior.result;
  assert.equal(retained.transportExitCode, 1);
  assert.deepEqual(readFileSync(nativePath), nativeBytes);
  assert.deepEqual(readFileSync(f.input.old.snapshot.path), snapshotBytes);
  assert.deepEqual(readPrivateJSON(nativePath), Object.fromEntries(Object.entries(retained).filter(([key]) => key !== 'transportExitCode')));
});

test('I1: unsupported transport metadata and any altered native output refuse continuation', async t => {
  const api = await load();
  for (const cause of ['zero','negative','string','unsupported-exit','extra-metadata','native-payload','native-envelope']) {
    const f = fixture(t), stored = f.state.releases['2'].services.estimate.result;
    stored.transportExitCode = { zero: 0, negative: -1, string: '1', 'unsupported-exit': 2 }[cause] ?? 1;
    if (cause === 'extra-metadata') stored.transportSignal = 'SIGTERM';
    if (cause === 'native-payload') atomicJSON(join(f.oldState, 'output.json'), { ...stored, transportExitCode: undefined, detail: 'substituted' });
    if (cause === 'native-envelope') atomicJSON(join(f.oldState, 'output.json'), stored);
    atomicJSON(join(f.oldState, 'state.json'), f.state); f.input.old.snapshot = f.put('snapshot.json', f.state);
    const plan = api.planTransition(f.input);
    await assert.rejects(() => api.applyTransition(plan, approval(plan), f.deps), /transport|output/i);
    assert(!existsSync(f.newState)); assert(existsSync(f.stopFile));
  }
});

// Only the OS command boundary is synthetic: the exported production probe
// still checks pinned files, private roots, process/handle results and markers.
function quiescenceFixture(t, printed, disabled) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'standing-quiescence-')));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const state = join(root, 'state'); mkdirSync(state, { mode: 0o700 });
  const tools = Object.fromEntries(['launchctl', 'ps', 'lsof'].map(name => {
    const path = join(root, name); writeFileSync(path, 'synthetic pinned ' + name, { mode: 0o700 });
    return [name, { path, sha256: hash(readFileSync(path)) }];
  }));
  const plan = { quiescence: { uid: 4242, label: 'invalid.synthetic.rollout', tools, stateRoots: [state], absentPaths: [join(state, 'dispatcher.lock'), join(state, 'operation.json')] } };
  const dependencies = { platform: 'darwin', execute: async (file, args) => {
    if (file === tools.launchctl.path) {
      if (args[0] === 'print') { assert.deepEqual(args, ['print', 'gui/4242/invalid.synthetic.rollout']); return printed; }
      assert.deepEqual(args, ['print-disabled', 'gui/4242']); return disabled;
    }
    if (file === tools.ps.path) { assert.deepEqual(args, ['-axo', 'pid=,ppid=,command=']); return { code: 0, stdout: '42 1 /synthetic/unrelated\n', stderr: '' }; }
    assert.equal(file, tools.lsof.path); assert.deepEqual(args, ['-nP', '-Fpcn', '+D', state]);
    return { code: 1, stdout: '', stderr: '' };
  } };
  return { root, state, tools, plan, dependencies };
}
const missingScheduler = { code: 113, stdout: '', stderr: 'Could not find service "invalid.synthetic.rollout" in domain for user gui: 4242\n' };
const disabledScheduler = { code: 0, stdout: 'disabled services = {\n "invalid.synthetic.rollout" => true\n}\n', stderr: '' };

test('quiescence accepts exact macOS missing-service and disabled override forms', async t => {
  const { probeQuiescence } = await load();
  for (const [name, printed, disabled] of [
    ['bare/true', missingScheduler, disabledScheduler],
    ['existing inline/true', missingScheduler, { code: 0, stdout: 'disabled services = { "invalid.synthetic.rollout" => true }', stderr: '' }],
    ['inline/disabled', missingScheduler, { code: 0, stdout: 'disabled services = { "invalid.synthetic.rollout" => disabled }\n', stderr: '' }],
    ['bare/disabled', missingScheduler, { code: 0, stdout: 'disabled services = {\n\t"invalid.synthetic.rollout" => disabled\n}\n', stderr: '' }],
    ['prefixed/true', { code: 113, stdout: '', stderr: 'Bad request.\nCould not find service "invalid.synthetic.rollout" in domain for user gui: 4242\n' }, disabledScheduler],
    ['prefixed/disabled pinned shape', { code: 113, stdout: '', stderr: 'Bad request.\nCould not find service "invalid.synthetic.rollout" in domain for user gui: 4242\n' }, { code: 0, stdout: 'disabled services = {\n\t"unrelated.service" => enabled\n\t"invalid.synthetic.rollout" => disabled\n}\n', stderr: '' }],
    ['whitespace stdout and outer diagnostic trim', { code: 113, stdout: ' \t\n', stderr: '\n  Bad request.\nCould not find service "invalid.synthetic.rollout" in domain for user gui: 4242\n\t' }, disabledScheduler],
    ['unrelated service values need no interpretation', missingScheduler, { code: 0, stdout: 'disabled services = {\n "invalid.synthetic.rollout.helper" => unknown\n "other.service" => future-value\n "invalid.synthetic.rollout" => true\n}\n', stderr: '' }],
    ['unrelated quoted names remain opaque', missingScheduler, { code: 0, stdout: 'disabled services = {\n "helper/invalid.synthetic.rollout" => unknown\n "invalid.synthetic.rollout?other" => future-value\n "invalid.synthetic.rollout" => true\n}\n', stderr: '' }],
    ['multiple unrelated quoted names remain opaque on one line', missingScheduler, { code: 0, stdout: 'disabled services = {\n "other.service" => enabled "helper/invalid.synthetic.rollout" => unknown\n "invalid.synthetic.rollout" => true\n}\n', stderr: '' }],
  ]) await t.test(name, async st => {
    const f = quiescenceFixture(st, printed, disabled);
    const proof = await probeQuiescence(f.plan, f.dependencies);
    assert.equal(proof.schemaVersion, 1); assert.deepEqual(proof.facts.map(fact => fact.tool), ['launchctl', 'launchctl', 'ps', 'lsof']);
  });
});

test('quiescence refuses uncertain or wrong-identity missing-service diagnostics', async t => {
  const { probeQuiescence } = await load();
  for (const [name, response] of [
    ['registered', { code: 0, stdout: 'registered', stderr: '' }],
    ['arbitrary exit', { ...missingScheduler, code: 1 }],
    ['other missing exit', { ...missingScheduler, code: 114 }],
    ['missing diagnostic', { ...missingScheduler, stderr: '' }],
    ['arbitrary diagnostic', { ...missingScheduler, stderr: 'unknown error\n' }],
    ['wrong uid', { ...missingScheduler, stderr: 'Bad request.\nCould not find service "invalid.synthetic.rollout" in domain for user gui: 4243\n' }],
    ['wrong label', { ...missingScheduler, stderr: 'Bad request.\nCould not find service "other.synthetic.rollout" in domain for user gui: 4242\n' }],
    ['partial label', { ...missingScheduler, stderr: 'Could not find service "invalid.synthetic.rollout.helper" in domain for user gui: 4242\n' }],
    ['nonempty stdout', { ...missingScheduler, stdout: 'registered\n' }],
    ['unknown prefix', { ...missingScheduler, stderr: 'Warning.\nCould not find service "invalid.synthetic.rollout" in domain for user gui: 4242\n' }],
    ['repeated prefix', { ...missingScheduler, stderr: 'Bad request.\nBad request.\nCould not find service "invalid.synthetic.rollout" in domain for user gui: 4242\n' }],
    ['same-line prefix', { ...missingScheduler, stderr: 'Bad request. Could not find service "invalid.synthetic.rollout" in domain for user gui: 4242\n' }],
    ['blank line in prefix', { ...missingScheduler, stderr: 'Bad request.\n\nCould not find service "invalid.synthetic.rollout" in domain for user gui: 4242\n' }],
    ['diagnostic suffix', { ...missingScheduler, stderr: 'Could not find service "invalid.synthetic.rollout" in domain for user gui: 4242\nextra\n' }],
  ]) await t.test(name, async st => {
    const f = quiescenceFixture(st, response, disabledScheduler);
    await assert.rejects(() => probeQuiescence(f.plan, f.dependencies), /absence is unproven/);
  });
});

test('quiescence requires one complete exact target override and refuses ambiguous output', async t => {
  const { probeQuiescence } = await load();
  for (const [name, stdout] of [
    ['false', 'disabled services = {\n "invalid.synthetic.rollout" => false\n}\n'],
    ['enabled', 'disabled services = {\n "invalid.synthetic.rollout" => enabled\n}\n'],
    ['absent', 'disabled services = {\n "other.service" => true\n}\n'],
    ['partial label', 'disabled services = {\n "invalid.synthetic.rollout.helper" => true\n}\n'],
    ['wrong label', 'disabled services = {\n "other.synthetic.rollout" => disabled\n}\n'],
    ['true suffix', 'disabled services = {\n "invalid.synthetic.rollout" => trueish\n}\n'],
    ['disabled suffix', 'disabled services = {\n "invalid.synthetic.rollout" => disabledish\n}\n'],
    ['value suffix', 'disabled services = {\n "invalid.synthetic.rollout" => true extra\n}\n'],
    ['value comment', 'disabled services = {\n "invalid.synthetic.rollout" => true # disabled\n}\n'],
    ['quoted true', 'disabled services = {\n "invalid.synthetic.rollout" => "true"\n}\n'],
    ['quoted disabled', 'disabled services = {\n "invalid.synthetic.rollout" => "disabled"\n}\n'],
    ['duplicate true', 'disabled services = {\n "invalid.synthetic.rollout" => true\n "invalid.synthetic.rollout" => true\n}\n'],
    ['duplicate disabled', 'disabled services = {\n "invalid.synthetic.rollout" => true\n "invalid.synthetic.rollout" => disabled\n}\n'],
    ['duplicate unknown', 'disabled services = {\n "invalid.synthetic.rollout" => true\n "invalid.synthetic.rollout" => unknown\n}\n'],
    ['duplicate missing value', 'disabled services = {\n "invalid.synthetic.rollout" => true\n "invalid.synthetic.rollout" =>\n}\n'],
    ['duplicate malformed arrow', 'disabled services = {\n "invalid.synthetic.rollout" => true\n "invalid.synthetic.rollout" = disabled\n}\n'],
    ['duplicate unquoted key', 'disabled services = {\n "invalid.synthetic.rollout" => true\n invalid.synthetic.rollout => disabled\n}\n'],
    ['duplicate unterminated key', 'disabled services = {\n "invalid.synthetic.rollout" => true\n "invalid.synthetic.rollout => disabled\n}\n'],
    ['duplicate same line', 'disabled services = {\n "invalid.synthetic.rollout" => true "invalid.synthetic.rollout" => disabled\n}\n'],
    ['unrelated first key hides duplicate unknown', 'disabled services = {\n "invalid.synthetic.rollout" => true\n "other.service" => enabled "invalid.synthetic.rollout" => unknown\n}\n'],
    ['unrelated first key hides duplicate missing value', 'disabled services = {\n "invalid.synthetic.rollout" => true\n "other.service" => enabled "invalid.synthetic.rollout" =>\n}\n'],
    ['unrelated first key hides duplicate malformed arrow', 'disabled services = {\n "invalid.synthetic.rollout" => true\n "other.service" => enabled "invalid.synthetic.rollout" = disabled\n}\n'],
    ['unrelated first key hides duplicate unquoted key', 'disabled services = {\n "invalid.synthetic.rollout" => true\n "other.service" => enabled invalid.synthetic.rollout => unknown\n}\n'],
    ['unrelated first key hides duplicate unterminated key', 'disabled services = {\n "invalid.synthetic.rollout" => true\n "other.service" => enabled "invalid.synthetic.rollout => unknown\n}\n'],
    ['unrelated first key hides unterminated target before quoted value', 'disabled services = {\n "invalid.synthetic.rollout" => true\n "other.service" => enabled "invalid.synthetic.rollout => "unknown"\n}\n'],
    ['prefix hides unterminated target before quoted value', 'disabled services = {\n "invalid.synthetic.rollout" => true\n prefix "invalid.synthetic.rollout => "unknown"\n}\n'],
    ['unrelated opaque first key hides duplicate unknown', 'disabled services = {\n "invalid.synthetic.rollout" => true\n "helper/invalid.synthetic.rollout" => enabled "invalid.synthetic.rollout" => unknown\n}\n'],
    ['inline false', 'disabled services = { "invalid.synthetic.rollout" => false }'],
    ['inline enabled', 'disabled services = { "invalid.synthetic.rollout" => enabled }'],
    ['inline value suffix', 'disabled services = { "invalid.synthetic.rollout" => true extra }'],
    ['inline quoted value', 'disabled services = { "invalid.synthetic.rollout" => "true" }'],
    ['inline duplicate unknown', 'disabled services = { "invalid.synthetic.rollout" => true "invalid.synthetic.rollout" => unknown }'],
    ['inline duplicate missing value', 'disabled services = { "invalid.synthetic.rollout" => true "invalid.synthetic.rollout" => }'],
    ['inline duplicate malformed arrow', 'disabled services = { "invalid.synthetic.rollout" => true "invalid.synthetic.rollout" = disabled }'],
    ['inline output prefix', 'untrusted disabled services = { "invalid.synthetic.rollout" => true }'],
    ['inline output suffix', 'disabled services = { "invalid.synthetic.rollout" => true } untrusted'],
    ['unquoted key', 'disabled services = {\n invalid.synthetic.rollout => true\n}\n'],
    ['line prefix', 'disabled services = {\n prefix "invalid.synthetic.rollout" => true\n}\n'],
    ['output prefix', 'untrusted\ndisabled services = {\n "invalid.synthetic.rollout" => true\n}\n'],
    ['output suffix', 'disabled services = {\n "invalid.synthetic.rollout" => true\n}\nuntrusted\n'],
    ['missing envelope', ' "invalid.synthetic.rollout" => true\n'],
    ['missing closing brace', 'disabled services = {\n "invalid.synthetic.rollout" => true\n'],
  ]) await t.test(name, async st => {
    const f = quiescenceFixture(st, missingScheduler, { code: 0, stdout, stderr: '' });
    await assert.rejects(() => probeQuiescence(f.plan, f.dependencies), /disabled override/);
  });
  for (const [name, response] of [
    ['disabled command failure', { ...disabledScheduler, code: 1 }],
    ['disabled stderr whitespace', { ...disabledScheduler, stderr: '\n' }],
    ['disabled stderr diagnostic', { ...disabledScheduler, stderr: 'warning' }],
  ]) await t.test(name, async st => {
    const f = quiescenceFixture(st, missingScheduler, response);
    await assert.rejects(() => probeQuiescence(f.plan, f.dependencies), /disabled override/);
  });
});

test('quiescence compatibility preserves worker, open-handle, marker, private-mode and trust refusal', async t => {
  const { probeQuiescence } = await load();
  for (const [cause, error] of [['worker', /process remains/], ['open-handle', /Open state\/native handle/], ['lock', /lock or marker/], ['marker', /lock or marker/], ['mode', /0700/], ['tool', /Trusted executable/], ['authority', /synthetic authority revoked/]]) await t.test(cause, async st => {
    const f = quiescenceFixture(st, { code: 113, stdout: '', stderr: 'Bad request.\nCould not find service "invalid.synthetic.rollout" in domain for user gui: 4242\n' }, { code: 0, stdout: 'disabled services = {\n "invalid.synthetic.rollout" => disabled\n}\n', stderr: '' });
    const original = f.dependencies.execute;
    f.dependencies.execute = async (file, args) => {
      if (cause === 'worker' && file === f.tools.ps.path) return { code: 0, stdout: '61 1 node standing-dispatcher.mjs poll synthetic.json\n', stderr: '' };
      if (cause === 'open-handle' && file === f.tools.lsof.path) return { code: 0, stdout: 'p61\ncnative-child\nnopen\n', stderr: '' };
      return original(file, args);
    };
    if (cause === 'lock' || cause === 'marker') writeFileSync(f.plan.quiescence.absentPaths[cause === 'lock' ? 0 : 1], '{}', { mode: 0o600 });
    if (cause === 'mode') { const path = join(f.root, 'public-state'); mkdirSync(path, { mode: 0o755 }); f.plan.quiescence.stateRoots = [path]; }
    if (cause === 'tool') writeFileSync(f.tools.launchctl.path, 'changed pinned bytes');
    await assert.rejects(() => probeQuiescence(f.plan, f.dependencies, () => { if (cause === 'authority') throw Error('synthetic authority revoked'); }), error);
  });
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

test('I4: recovery authority lost across awaited boundaries preserves the exact journal, pointer, STOP and lock', async t => {
  const api = await load(), realNow = Date.now.bind(Date); let clock = realNow();
  t.mock.method(Date, 'now', () => clock);
  for (const boundary of ['initial-prerequisites','phase-probe','cutover-prerequisites','after-pointer','completed-probe']) {
    clock = realNow();
    const f = fixture(t), plan = api.planTransition(f.input), approved = approval(plan);
    const initial = boundary === 'phase-probe' ? 'journal-imported' : boundary === 'completed-probe' ? 'journal-cutover' : 'journal-cutover-intent';
    await assert.rejects(() => api.applyTransition(plan, approved, { ...f.deps, afterBoundary: name => { if (name === initial) throw Error('synthetic interruption'); } }));
    const journalPath = join(f.controlDirectory, 'transition.json'), pointerPath = join(f.controlDirectory, 'active.json'), lockPath = join(f.controlDirectory, 'control.lock');
    const recovery = { schemaVersion: 1, kind: 'standing-transition-recovery-approval', planSha256: plan.planSha256, approvalSha256: fingerprint(approved), journal: fileReference(journalPath), phase: readPrivateJSON(journalPath).phase, pointerSha256: existsSync(pointerPath) ? fileReference(pointerPath).sha256 : null, approvedBy: 'synthetic-owner', approvalRef: 'synthetic://short-recovery', approvedAt: new Date(clock - 1000).toISOString(), expiresAt: new Date(clock + 60000).toISOString(), revoked: false };
    let fetches = 0, schedulerProbes = 0, armed = false, retained;
    const expire = () => {
      retained ||= { journal: readFileSync(journalPath), pointer: existsSync(pointerPath) ? readFileSync(pointerPath) : null, state: readFileSync(join(f.newState, 'state.json')), lock: readFileSync(lockPath) };
      clock = Date.parse(recovery.expiresAt) + 1;
    };
    const deps = { ...f.deps,
      fetchImpl: async (...args) => { fetches++; const response = await f.deps.fetchImpl(...args); if (boundary === 'initial-prerequisites' && fetches === 1 || boundary === 'cutover-prerequisites' && fetches === 4) expire(); return response; },
      execute: async (file, args) => { const response = await f.deps.execute(file, args); if (file === f.tools.launchctl.path && args[0] === 'print') { schedulerProbes++; if (armed || boundary === 'completed-probe' && schedulerProbes === 2) { armed = false; expire(); } } return response; },
      afterBoundary: name => { if (boundary === 'phase-probe' && name === 'generation-binding') armed = true; if (boundary === 'after-pointer' && name === 'active-pointer') expire(); },
    };
    await assert.rejects(() => api.recoverTransition(plan, approved, recovery, deps), /recovery.*approval|recovery.*author/i);
    assert(retained, boundary + ' did not exercise awaited authority loss');
    assert.deepEqual(readFileSync(journalPath), retained.journal, boundary);
    assert.deepEqual(existsSync(pointerPath) ? readFileSync(pointerPath) : null, retained.pointer, boundary);
    assert.deepEqual(readFileSync(join(f.newState, 'state.json')), retained.state, boundary);
    assert.deepEqual(readFileSync(lockPath), retained.lock, boundary);
    assert.equal(readFileSync(f.stopFile, 'utf8'), 'STOP\n');
  }
});

test('I4: recovery cannot extend immutable recovery, continuation or original migration authority after an await', async t => {
  const api = await load(), realNow = Date.now.bind(Date); let clock = realNow();
  t.mock.method(Date, 'now', () => clock);
  for (const authority of ['recovery-mutation','continuation','migration']) {
    clock = realNow(); const f = fixture(t), plan = api.planTransition(f.input), approved = approval(plan);
    if (authority === 'continuation') approved.expiresAt = new Date(clock + 60000).toISOString();
    await assert.rejects(() => api.applyTransition(plan, approved, { ...f.deps, afterBoundary: name => { if (name === 'journal-cutover-intent') throw Error('synthetic interruption'); } }));
    const path = join(f.controlDirectory, 'transition.json'), journal = fileReference(path), before = readFileSync(path);
    const recovery = { schemaVersion: 1, kind: 'standing-transition-recovery-approval', planSha256: plan.planSha256, approvalSha256: fingerprint(approved), journal, phase: 'cutover-intent', pointerSha256: null, approvedBy: 'synthetic-owner', approvalRef: 'synthetic://immutable-recovery', approvedAt: new Date(clock - 1000).toISOString(), expiresAt: new Date(clock + 60000).toISOString(), revoked: false };
    if (authority !== 'recovery-mutation') recovery.expiresAt = '2099-01-01';
    let fetches = 0;
    await assert.rejects(() => api.recoverTransition(plan, approved, recovery, { ...f.deps, fetchImpl: async (...args) => {
      const response = await f.deps.fetchImpl(...args);
      if (++fetches === 4) {
        if (authority === 'recovery-mutation') recovery.expiresAt = '2099-01-01';
        else clock = Date.parse(authority === 'continuation' ? approved.expiresAt : f.config.policy.reviewedMigration.expiresAt) + 1;
      }
      return response;
    } }), authority === 'recovery-mutation' ? /Immutable recovery authorization changed/ : authority === 'continuation' ? /continuation approval/ : /reviewedMigration expired/);
    assert.equal(fetches, 4, 'Refusal must occur immediately after the affected await');
    assert.deepEqual(readFileSync(path), before); assert(!existsSync(join(f.controlDirectory, 'active.json')));
    assert(existsSync(join(f.controlDirectory, 'control.lock'))); assert(existsSync(f.stopFile));
  }
});

test('I4: expiry during a rejected await still retains the recovery lock and completed boundaries', async t => {
  const api = await load(), f = fixture(t), plan = api.planTransition(f.input), approved = approval(plan);
  await assert.rejects(() => api.applyTransition(plan, approved, { ...f.deps, afterBoundary: name => { if (name === 'journal-cutover-intent') throw Error('synthetic interruption'); } }));
  const path = join(f.controlDirectory, 'transition.json'), before = readFileSync(path), now = Date.now(); let clock = now;
  t.mock.method(Date, 'now', () => clock);
  const recovery = { schemaVersion: 1, kind: 'standing-transition-recovery-approval', planSha256: plan.planSha256, approvalSha256: fingerprint(approved), journal: fileReference(path), phase: 'cutover-intent', pointerSha256: null, approvedBy: 'synthetic-owner', approvalRef: 'synthetic://rejected-await', approvedAt: new Date(now - 1000).toISOString(), expiresAt: new Date(now + 60000).toISOString(), revoked: false };
  await assert.rejects(() => api.recoverTransition(plan, approved, recovery, { ...f.deps, fetchImpl: async () => { clock = now + 60001; throw Error('synthetic unavailable identity'); } }));
  assert.deepEqual(readFileSync(path), before); assert(!existsSync(join(f.controlDirectory, 'active.json')));
  assert(existsSync(join(f.controlDirectory, 'control.lock')), 'Lost recovery authority must retain ownership even when the await rejects');
  assert(existsSync(f.stopFile));
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
  const api=await load();for(const killBoundary of ['journal-imported','active-pointer','journal-completed']) {const f=fixture(t),history=nativeHistory(f),plan=api.planTransition(f.input),approved=approval(plan);
  const transfer=f.put('synthetic-child.json',{plan,approved,identities:f.identities,tools:f.tools});
  const script=`import {readPrivateJSON} from ${JSON.stringify(new URL('./standing-config.mjs',import.meta.url).href)};import {applyTransition} from ${JSON.stringify(new URL('./standing-transition.mjs',import.meta.url).href)};const f=readPrivateJSON(process.argv[1]);const ids=['naeil','estimate','jev'];const origins={naeil:'https://naeil.dev',estimate:'https://abestimate.naeil.dev',jev:'https://jev.naeil.dev'};await applyTransition(f.plan,f.approved,{platform:'darwin',execute:async(file,args)=>file===f.tools.launchctl.path?(args[0]==='print'?{code:113,stdout:'',stderr:'Could not find service "invalid.synthetic.rollout" in domain for user gui: 4242\\n'}:{code:0,stdout:'disabled services = { \"invalid.synthetic.rollout\" => true }',stderr:''}):file===f.tools.ps.path?{code:0,stdout:'42 1 /synthetic/unrelated\\n',stderr:''}:{code:1,stdout:'',stderr:''},fetchImpl:async url=>({status:200,headers:new Headers({'content-type':'application/json'}),body:[Buffer.from(JSON.stringify(f.identities[ids.find(id=>url.startsWith(origins[id]))]))]}),validateHandoff:()=>{},afterBoundary:name=>{if(name===process.argv[2])process.kill(process.pid,'SIGKILL');}});`;
  const child=spawn(process.execPath,['--input-type=module','--eval',script,transfer.path,killBoundary],{stdio:['ignore','ignore','pipe'],env:{PATH:'/usr/bin:/bin'}});let errors='';child.stderr.on('data',bytes=>{errors+=bytes;});const [code,signal]=await once(child,'exit');assert.equal(signal,'SIGKILL',errors);assert.equal(code,null);
  const lock=fileReference(join(f.controlDirectory,'control.lock')),lockBytes=readFileSync(lock.path),journal=fileReference(join(f.controlDirectory,'transition.json'));
  const recovery={schemaVersion:1,kind:'standing-transition-recovery-approval',planSha256:plan.planSha256,approvalSha256:fingerprint(approved),journal,phase:readPrivateJSON(journal.path).phase,pointerSha256:existsSync(join(f.controlDirectory,'active.json'))?fileReference(join(f.controlDirectory,'active.json')).sha256:null,approvedBy:'synthetic-owner',approvalRef:'synthetic://recover-killed-process',approvedAt:'2020-01-01',expiresAt:'2099-01-01',revoked:false};
  await assert.rejects(()=>api.recoverTransition(plan,approved,recovery,f.deps));assert.deepEqual(readFileSync(lock.path),lockBytes);
  const archival=archiveAuthorization(f,plan,approved,recovery.phase==='completed'?archiveCurrent(f,history):null);
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

function retainedJevMaterial(f) {
  const root = join(f.root, 'jev-native/releases'), paths = [];
  for (const [name, mode] of [['backup-one.env', 0o600], ['backup-two.txt', 0o600], ['manual-script.sh', 0o644], ['manual-script.old', 0o644]]) {
    const path = join(root, name); writeFileSync(path, 'synthetic retained bytes ' + name, { mode }); paths.push(path);
  }
  const directory = join(root, '20261017-shared-session'); mkdirSync(directory, { mode: 0o700 });
  const path = join(directory, 'manual-artifact.txt'); writeFileSync(path, 'synthetic manual shared-session artifact', { mode: 0o600 }); paths.push(path);
  return paths.map(path => ({ path, bytes: readFileSync(path) }));
}
test('T7 Jev producer namespace preserves unrelated retained files and manual artifacts with empty or terminal native history', async t => {
  const api = await load();
  for (const history of [false, true]) {
    const f = fixture(t), retained = retainedJevMaterial(f);
    if (history) addJevHistory(f);
    const plan = api.planTransition(f.input);
    await api.applyTransition(plan, approval(plan), f.deps);
    for (const { path, bytes } of retained) assert.deepEqual(readFileSync(path), bytes);
    assert.equal(readPrivateJSON(join(f.controlDirectory, 'transition.json')).phase, 'completed');
    assert(f.events.every(event => ['handoff', f.tools.launchctl.path, f.tools.ps.path, f.tools.lsof.path].includes(event[0])));
  }
});
test('T7 every unbound malformed symlink or regular file in the native ui- namespace still blocks', async t => {
  const api = await load();
  for (const cause of ['unbound', 'malformed', 'file', 'symlink', 'uncertain']) {
    const f = fixture(t), retained = retainedJevMaterial(f), root = join(f.root, 'jev-native/releases');
    if (cause === 'unbound') mkdirSync(join(root, 'ui-unbound'), { mode: 0o700 });
    if (cause === 'malformed') mkdirSync(join(root, 'ui-'), { mode: 0o700 });
    if (cause === 'file') writeFileSync(join(root, 'ui-file'), '{}', { mode: 0o600 });
    if (cause === 'symlink') symlinkSync(join(root, '20261017-shared-session'), join(root, 'ui-link'));
    if (cause === 'uncertain') addJevHistory(f, 'uncertain');
    const plan = api.planTransition(f.input);
    await assert.rejects(() => api.applyTransition(plan, approval(plan), f.deps)); assert(!existsSync(f.newState));
    for (const { path, bytes } of retained) assert.deepEqual(readFileSync(path), bytes);
  }
});

test('T7 original Jev archive-and-manifest baseline needs no extracted standalone tree and remains byte exact', async t => {
  const api = await load(), f = fixture(t), ref = f.input.nativeEvidence.jev.baseline, baseline = readPrivateJSON(ref.path), artifact = baseline.artifact;
  const archived = syntheticJevArchive(baseline.production.identity);
  writeFileSync(artifact.path, archived.bytes, { mode: 0o600 }); atomicJSON(artifact.manifestPath, archived.manifest);
  artifact.sha256 = hash(archived.bytes); artifact.storageRef = 'synthetic://' + artifact.sha256;
  artifact.manifestSha256 = hash(JSON.stringify(archived.manifest, (_key, value) => value && typeof value === 'object' && !Array.isArray(value) ? Object.fromEntries(Object.entries(value).sort()) : value));
  artifact.buildId = 'synthetic-build'; rmSync(artifact.standalonePath, { recursive: true }); delete artifact.standalonePath;
  atomicJSON(ref.path, baseline); f.input.nativeEvidence.jev.baseline = fileReference(ref.path);
  const before = [ref.path, artifact.path, artifact.manifestPath].map(path => ({ path, bytes: readFileSync(path) }));
  const plan = api.planTransition(f.input); await api.applyTransition(plan, approval(plan), f.deps);
  for (const { path, bytes } of before) assert.deepEqual(readFileSync(path), bytes);
  assert(!Object.hasOwn(readPrivateJSON(ref.path).artifact, 'standalonePath'));
});

function approveCurrentSite(f) {
  const release = f.input.release, bytes = syntheticArchive('0.7.2');
  const path = join(f.oldState, 'published-site-package.tgz'); writeFileSync(path, bytes, { mode: 0o600 });
  release.archive = { path, sha256: hash(bytes) }; release.siteArchive = { ...release.archive }; release.siteRuntimeSha256 = hash(JSON.stringify(runtimeIndex(bytes)));
  const { approval: site } = syntheticSite(f.root, release, bytes);
  f.identities.naeil.sourceRevision = release.siteSourceRevision;
  const prior = f.state.releases['2'].services.naeil;
  prior.result.artifact.sourceRevision = release.siteSourceRevision; prior.result.production.archiveSha256 = release.archive.sha256;
  f.config.policy.reviewedMigration.siteSourceRevision = release.siteSourceRevision; f.config.policy.reviewedMigration.archiveSha256 = release.archive.sha256;
  atomicJSON(join(f.oldState, 'state.json'), f.state); f.input.old.snapshot = f.put('snapshot.json', f.state);
  const old = readPrivateJSON(f.input.old.config.path); old.policy.reviewedMigration = f.config.policy.reviewedMigration; f.input.old.config = f.put('old-config.json', old); f.input.previousApprovalSha256 = fingerprint(old.policy.reviewedMigration);
  f.config.services.naeil.siteContinuationApproval = site;
  f.config.services.naeil.observer = { workflowPath: '.github/workflows/verify.yml', environment: 'Production', deploymentCreator: 'vercel[bot]', correlation: 'immutable-url' };
  const identity = { ...f.identities.naeil, sourceRevision: site.sourceRevision, artifactId: site.deploymentId };
  const nativeFetch = f.deps.fetchImpl;
  f.deps.fetchImpl = async url => new URL(url).origin === ORIGINS.naeil || url.startsWith('https://synthetic.vercel.app') ? Response.json(identity) : nativeFetch(url);
  f.deps.github = { mainAncestor: async () => {}, workflow: async () => ({ state: 'success', id: 10 }), pages: async path => path.endsWith('/statuses') ? [{ id: 12, state: 'success', created_at: new Date().toISOString(), creator: { login: 'vercel[bot]' }, environment_url: 'https://synthetic.vercel.app' }] : [{ id: 11, sha: site.sourceRevision, environment: 'Production', creator: { login: 'vercel[bot]' } }] };
  f.input.next.config = f.put('new-config.json', f.config);
  return { site, identity };
}
test('T7 transition current-site observation accepts only the original identity or the separately approved exact target', async t => {
  const api = await load();
  for (const cause of ['original', 'approved', 'missing', 'changed', 'expired', 'target', 'native-mismatch']) await t.test(cause, async () => {
    const f = fixture(t), current = cause === 'original' ? null : approveCurrentSite(f);
    if (cause === 'missing') delete f.config.services.naeil.siteContinuationApproval;
    if (cause === 'changed') current.site.diffSha256 = 'f'.repeat(64);
    if (cause === 'expired') current.site.expiresAt = '2001-01-01';
    if (cause === 'target') current.identity.artifactId = 'dpl_Unapproved';
    if (cause === 'native-mismatch') f.identities.estimate = { ...f.identities.estimate, artifactId: 'wrong-native' };
    f.input.next.config = f.put('new-config.json', f.config);
    const plan = api.planTransition(f.input), before = readFileSync(f.input.old.snapshot.path);
    if (['original', 'approved'].includes(cause)) {
      await api.applyTransition(plan, approval(plan), f.deps);
      assert.deepEqual(readStandingState(f.newState).releases['2'].services.naeil.result, f.state.releases['2'].services.naeil.result);
      assert.deepEqual(plan.predecessors.naeil, f.state.releases['2'].services.naeil.result.production.identity);
    } else { await assert.rejects(() => api.applyTransition(plan, approval(plan), f.deps)); assert(!existsSync(f.newState)); }
    assert.deepEqual(readFileSync(f.input.old.snapshot.path), before); assert(existsSync(f.stopFile));
  });
});

async function rebindFixture(t, changeState = () => {}) {
  const api=await load(),f=fixture(t),first=api.planTransition(f.input),firstApproval=approval(first);
  await api.applyTransition(first,firstApproval,f.deps);
  const previous=readActiveGeneration(f.controlDirectory),oldState=f.newState,newState=join(f.root,'epoch3'),state=readStandingState(oldState),record=state.releases['2'];
  const outputDirectory=join(oldState,'runs/2/naeil/reverify-interrupted');mkdirSync(outputDirectory,{recursive:true,mode:0o700});
  const service={...f.config.services.naeil};delete service.command;
  const request={...record.services.naeil.request,service,policy:f.config.policy,trustedFiles:f.config.trustedFiles,executionPath:f.config.executionPath,generationSha256:f.config.generationSha256,configReferences:f.config.configReferences,configReferencesSha256:f.config.configReferencesSha256,generationFence:{controlDirectory:f.controlDirectory,pointerSha256:previous.pointerSha256},attemptId:'interrupted-read-only',phase:'production',outputDirectory};
  atomicJSON(join(outputDirectory,'input.json'),request);
  record.services.naeil.verificationIntent={state:'invoking',request,startedAt:'2026-10-27T21:13:23Z'};
  state.blocked={releaseId:f.input.release.releaseId,serviceId:'naeil',reasonCode:'interrupted-verification'};record.state='uncertain';state.lastState='stopped';
  changeState(state,record,{...f,oldState,previous});
  writeStandingState(oldState,state,{...f.config,generationFence:{controlDirectory:f.controlDirectory,pointerSha256:previous.pointerSha256}});
  const snapshot=join(f.root,'rebind-snapshot.json');writeFileSync(snapshot,readFileSync(join(oldState,'state.json')),{mode:0o600});
  const config=structuredClone(f.config);config.stateDirectory=newState;config.generationControl={controlDirectory:f.controlDirectory,generationId:'synthetic-rebind',epochId:'synthetic-rebound-epoch'};
  config.executionPath='/bin:/usr/bin';config.generation.executionPath=config.executionPath;config.generationSha256=operationalGenerationDigest(config.generation);
  config.services.naeil.verification.command.timeoutMs=2400000;
  const journal=readPrivateJSON(join(f.controlDirectory,'transition.json'));
  const input={...f.input,kind:'standing-generation-rebind',oldPointer:previous.pointer,predecessor:{pointer:fileReference(join(f.controlDirectory,'active.json')),journal:fileReference(join(f.controlDirectory,'transition.json')),plan:journal.plan,approval:journal.approval},old:{generationId:previous.pointer.generationId,automationSha256:f.config.automation.sha256,config:previous.pointer.config,stateDirectory:oldState,snapshot:fileReference(snapshot),evidenceRoot:oldState,inventory:f.put('schema2-inventory.json',standingEpochInventory(oldState)),pendingIntent:existsSync(join(oldState,'pending-intent.json'))?fileReference(join(oldState,'pending-intent.json')):null},next:{generationId:config.generationControl.generationId,generationSha256:config.generationSha256,config:f.put('rebind-config.json',config),configReferencesSha256:config.configReferencesSha256,stateDirectory:newState,epochId:config.generationControl.epochId},estimate:{...f.input.estimate,newAttemptId:'estimate-rebound-attempt'},quiescence:{...f.input.quiescence,stateRoots:[oldState,...f.input.quiescence.stateRoots.filter(path=>path!==f.oldState)],absentPaths:[join(oldState,'dispatcher.lock'),...f.input.quiescence.absentPaths.filter(path=>!path.startsWith(f.oldState+'/')),join(newState,'dispatcher.lock'),join(newState,'pending-intent.json')]}};
  return {...f,api,input,config,newState,oldState,previous,request,deps:{...f.deps,validateHandoff:(_candidate,request)=>{assert.equal(request.generationSha256,config.generationSha256);}}};
}
function rebindApproval(plan) {
  return {schemaVersion:1,kind:'standing-generation-rebind-approval',previousPointerSha256:plan.predecessor.pointer.sha256,planSha256:plan.planSha256,releaseSha256:releaseIdentityDigest(plan.release),generationSha256:plan.next.generationSha256,approvedBy:'synthetic-owner',approvalRef:'synthetic://rebind',approvedAt:'2020-01-01',expiresAt:'2099-01-01',revoked:false};
}
function exactRecovery(f,plan,approved) {
  const journal=fileReference(join(f.controlDirectory,'transition.json'));
  return {schemaVersion:1,kind:'standing-transition-recovery-approval',planSha256:plan.planSha256,approvalSha256:fingerprint(approved),journal,phase:readPrivateJSON(journal.path).phase,pointerSha256:fileReference(join(f.controlDirectory,'active.json')).sha256,approvedBy:'synthetic-owner',approvalRef:'synthetic://rebind-recovery',approvedAt:'2020-01-01',expiresAt:'2099-01-01',revoked:false};
}

test('B rebind rejects reuse of the predecessor epoch ID during planning and admission',async t=>{
  const f=await rebindFixture(t),plan=f.api.planTransition(f.input);
  f.input.next.epochId=f.previous.pointer.epochId;
  assert.throws(()=>f.api.planTransition(f.input),/distinct.*epoch/i);
  plan.next.epochId=f.previous.pointer.epochId;
  const body={...plan};delete body.planSha256;plan.planSha256=fingerprint(body);
  await assert.rejects(()=>f.api.applyTransition(plan,rebindApproval(plan),f.deps),/distinct.*epoch/i);
  assert(!existsSync(f.newState));assert.deepEqual(readActiveGeneration(f.controlDirectory).pointer,f.previous.pointer);
});

test('B rebind repairs retained epoch metadata after a crash between the two state writes',async t=>{
  const {default:fs}=await import('node:fs'),{syncBuiltinESMExports}=await import('node:module');
  for(const metadata of ['predecessor-epoch','missing-inventory','wrong-inventory'])await t.test(metadata,async st=>{
    const f=await rebindFixture(st),plan=f.api.planTransition(f.input),approved=rebindApproval(plan),old=preservedFiles(f.oldState),rename=fs.renameSync;
    let interrupted=false;
    fs.renameSync=(from,to)=>{
      rename(from,to);
      if(to===join(f.newState,'state.json')&&!interrupted&&readPrivateJSON(to).observation.lastState==='deferred') {
        interrupted=true;throw Error('synthetic crash between state writes');
      }
    };
    syncBuiltinESMExports();
    try {await assert.rejects(()=>f.api.applyTransition(plan,approved,f.deps),error=>error.cause?.message==='synthetic crash between state writes');}
    finally {fs.renameSync=rename;syncBuiltinESMExports();}
    assert(interrupted);
    const path=join(f.newState,'state.json'),root=readPrivateJSON(path);
    assert.equal(root.epochId,f.previous.pointer.epochId);assert.equal(root.epochs,undefined);
    if(metadata!=='predecessor-epoch') {
      root.epochId=plan.next.epochId;
      if(metadata==='wrong-inventory')root.epochs=[{evidenceRoot:f.oldState,sourceSha256:plan.old.snapshot.sha256,inventory:root.state}];
      atomicJSON(path,root);
    }
    await f.api.recoverTransition(plan,approved,exactRecovery(f,plan,approved),f.deps);
    assert.equal(readActiveGeneration(f.controlDirectory).pointer.epochId,plan.next.epochId);
    assert.doesNotThrow(()=>assertEvidencePath(f.config,join(f.request.outputDirectory,'input.json')));
    const state=readStandingState(f.newState);assert.equal(state.releases['2'].history.filter(entry=>entry.resolution==='generation-rebind-verify-only').length,1);
    for(const [path,bytes]of old)assert.deepEqual(readFileSync(path),bytes);
    assert(!existsSync(join(f.newState,'pending-intent.json')));
  });
});

test('B rebind imports exact schema2 bytes and retains predecessor chain, verify intent, native ledgers and STOP',async t=>{
  for(const reasonCode of ['interrupted-verification','cached-evidence-reverification-failed'])await t.test(reasonCode,async st=>{
    const f=await rebindFixture(st,(state,record)=>{state.blocked.reasonCode=reasonCode;record.state=reasonCode==='interrupted-verification'?'uncertain':'blocked';});
    const plan=f.api.planTransition(f.input),approved=rebindApproval(plan),old=preservedFiles(f.oldState),native=preservedFiles(join(f.root,'native')),stop=readFileSync(f.stopFile),predecessorBytes=Object.fromEntries(Object.entries(plan.predecessor).map(([name,ref])=>[name,readFileSync(ref.path)]));
    const result=await f.api.applyTransition(plan,approved,f.deps);assert.equal(result.phase,'completed');
    const active=readActiveGeneration(f.controlDirectory),state=readStandingState(f.newState),record=state.releases['2'],directory=join(f.controlDirectory,'transitions',plan.planSha256);
    assert.equal(active.pointer.generationId,'synthetic-rebind');assert.equal(active.approval.kind,approved.kind);assert(!state.blocked);assert.equal(record.state,'deferred');assert(!existsSync(join(f.newState,'pending-intent.json')));
    assert(!record.services.naeil.verificationIntent);assert(record.services.naeil.continuation.requiresFreshVerification);assert.equal(record.services.naeil.continuation.planSha256,plan.planSha256);assert.equal(record.services.naeil.continuation.authorizationSha256,fingerprint(approved));
    assert.equal(record.services.estimate.authorizedAttemptId,plan.estimate.newAttemptId);assert.equal(record.generationContinuation.releaseSha256,releaseIdentityDigest(plan.release));
    const history=record.history.find(entry=>entry.resolution==='generation-rebind-verify-only');assert.deepEqual(history.prior.verificationIntent.request,f.request);assert.deepEqual(history.pendingIntent,plan.old.pendingIntent);
    for(const [name,bytes]of Object.entries(predecessorBytes))assert.deepEqual(readFileSync(join(directory,'predecessor-'+name+'.json')),bytes);
    assert.deepEqual(readFileSync(join(directory,'historical-pending-intent.json')),readFileSync(plan.old.pendingIntent.path));
    assert.deepEqual(readFileSync(join(f.newState,'imported-root.json')),readFileSync(plan.old.snapshot.path));
    for(const [path,bytes]of old)assert.deepEqual(readFileSync(path),bytes);
    for(const [path,bytes]of native)assert.deepEqual(readFileSync(path),bytes);
    assert.deepEqual(readFileSync(f.stopFile),stop);assert.equal((await import('node:fs')).lstatSync(f.stopFile).mode&0o777,0o600);
    assert.doesNotThrow(()=>assertGenerationFence({...f.config,generationFence:{controlDirectory:f.controlDirectory,pointerSha256:active.pointerSha256}}));
    assert.doesNotThrow(()=>assertEvidencePath(f.config,join(f.request.outputDirectory,'input.json')));
    const copied=readPrivateJSON(plan.old.inventory.path);for(const ref of copied.evidence)assert.deepEqual(readFileSync(join(f.newState,'evidence',ref.path.split('/').at(-1))),readFileSync(ref.path));
    const {runActiveGeneration}=await import('./standing-launcher.mjs');
    const stopped=await runActiveGeneration(f.controlDirectory,{dispatcher:{github:{releases:async()=>assert.fail('STOP must prevent release IO')},invoke:async()=>assert.fail('STOP dispatched native work'),verify:async()=>assert.fail('STOP dispatched a verifier')}});
    assert.equal(stopped.state,'stopped');assert(!readStandingState(f.newState).blocked);assert(!existsSync(join(f.newState,'pending-intent.json')));
    assert(f.events.filter(([file])=>file===f.tools.launchctl.path).every(([,args])=>['print','print-disabled'].includes(args[0])));
    await assert.rejects(()=>f.api.applyTransition(plan,approved,f.deps));
  });
});

test('B rebind retains a deferred Estimate request/result with an exact dispatcher prerequisite receipt',async t=>{
  for(const change of ['none','path','digest','length'])await t.test(change,async st=>{
    let prerequisite,request,result;
    const create=()=>rebindFixture(st,(_state,record,f)=>{
      const siteRequest={...record.services.naeil.verificationIntent.request,attemptId:'fresh-before-deferral'};
      const production={...record.services.naeil.result.production,attemptId:siteRequest.attemptId,checkedAt:'2026-10-27T20:00:00Z'},artifact=record.services.naeil.result.artifact;
      const proof={schemaVersion:1,kind:'standing-current-naeil-verification',generationSha256:f.config.generationSha256,pointerSha256:f.previous.pointerSha256,releaseSha256:releaseIdentityDigest(f.input.release),request:siteRequest,artifact,production};
      mkdirSync(join(f.oldState,'prerequisites'),{mode:0o700});
      prerequisite=f.put('epoch2/prerequisites/naeil-'+fingerprint(proof)+'.json',proof);
      const ref={...prerequisite};
      if(change==='path')ref.path=f.put('epoch2/prerequisites/unowned.json',proof).path;
      if(change==='digest')ref.sha256='0'.repeat(64);if(change==='length')ref.bytes++;
      const service={...f.config.services.estimate};delete service.command;
      const attemptId=record.services.estimate.authorizedAttemptId,outputDirectory=join(f.oldState,'runs/2/estimate',attemptId),adapter=readPrivateJSON(service.adapterOptions.standingConfigPath);
      mkdirSync(outputDirectory,{recursive:true,mode:0o700});
      request={schemaVersion:1,release:f.input.release,service,policy:f.config.policy,adapterOptions:service.adapterOptions,trustedFiles:f.config.trustedFiles,executionPath:f.config.generation.executionContexts.estimate.executionPath,generationSha256:f.config.generationSha256,generationFence:siteRequest.generationFence,configReferences:f.config.configReferences,configReferencesSha256:f.config.configReferencesSha256,naeilPrerequisite:ref,candidate:{...readPrivateJSON(adapter.handoff.candidateReceipt.path),receipt:adapter.handoff.candidateReceipt},sourceAdoption:adapter.handoff.sourceAdoption,idempotencyKey:f.input.estimate.idempotencyKey,attemptId,mode:'standing',outputDirectory,reconciliation:record.services.estimate.reconciliation};
      result={schemaVersion:1,releaseId:request.release.releaseId,serviceId:'estimate',idempotencyKey:request.idempotencyKey,attemptId,state:'deferred',mutationAttempted:false,runtimeMutationAttempted:false};
      atomicJSON(join(outputDirectory,'input.json'),request);atomicJSON(join(outputDirectory,'output.json'),result);
      record.services.estimate={state:'deferred',attemptId,request,result};
      const ledger=f.input.estimate.ledger.path;
      writeFileSync(ledger+'.history-11111111-1111-4111-8111-111111111111',readFileSync(ledger),{mode:0o600});
      atomicJSON(ledger,{attemptId,idempotencyKey:request.idempotencyKey,state:'deferred',mutationAttempted:false,runtimeMutationAttempted:false});
      f.input.estimate.priorAttemptId=attemptId;f.input.estimate.ledger=fileReference(ledger);
    });
    if(change!=='none'){await assert.rejects(create,/Epoch receipt|Epoch prerequisite/);return;}
    const f=await create(),plan=f.api.planTransition(f.input),old=preservedFiles(f.oldState);
    await f.api.applyTransition(plan,rebindApproval(plan),f.deps);
    const retained=readStandingState(f.newState).releases['2'].history.find(entry=>entry.resolution==='generation-rebind-deferred');
    assert.deepEqual(retained.prior.request,request);assert.deepEqual(retained.prior.result,result);
    assert.deepEqual(readPrivateJSON(plan.old.inventory.path).receipts.find(ref=>ref.path===prerequisite.path),prerequisite);
    assert.equal(assertEvidencePath(f.config,prerequisite.path),prerequisite.path);
    for(const [path,bytes]of old)assert.deepEqual(readFileSync(path),bytes);
    const bytes=readFileSync(prerequisite.path);
    writeFileSync(prerequisite.path,Buffer.concat([bytes,Buffer.from(' ')]));assert.throws(()=>assertEvidencePath(f.config,prerequisite.path),/size changed/);
    const changed=Buffer.from(bytes);changed[0]=32;writeFileSync(prerequisite.path,changed);assert.throws(()=>assertEvidencePath(f.config,prerequisite.path),/digest changed/);
  });
});

test('B rebind refuses every unrelated blocked, uncertain, invoking and runtime-mutated state before import',async t=>{
  const cases={
    'blocked-other-service':state=>{state.blocked.serviceId='estimate';},
    'blocked-other-reason':state=>{state.blocked.reasonCode='site-revision-not-approved';},
    'uncertain-non-verify':(_state,record)=>{record.services.naeil.state='uncertain';},
    'naeil-runtime-mutation':(_state,record)=>{record.services.naeil.runtimeMutationAttempted=true;},
    'other-release-uncertain':state=>{state.releases.other={releaseId:'unrelated',state:'uncertain',services:{}};},
    'native-runtime-history':(_state,record)=>{record.history.push({serviceId:'estimate',prior:{state:'gate-failed',result:{runtimeMutationAttempted:true}}});},
    'estimate-invoking':(_state,record)=>{record.services.estimate.state='invoking';record.services.estimate.request={attemptId:'unexpected-native'};},
    'estimate-uncertain':(_state,record)=>{record.services.estimate.state='uncertain';},
    'estimate-runtime-mutated':(_state,record)=>{record.services.estimate.result={runtimeMutationAttempted:true};},
    'estimate-direct-runtime-mutation':(_state,record)=>{record.services.estimate.runtimeMutationAttempted=true;},
    'estimate-source-mutated':(_state,record)=>{record.services.estimate.result={mutationAttempted:true,runtimeMutationAttempted:false};},
    'jev-invoking':(_state,record)=>{record.services.jev={state:'invoking',request:{attemptId:'unexpected-jev'}};},
    'jev-runtime-mutated':(_state,record)=>{record.services.jev={state:'not-started',result:{runtimeMutationAttempted:true}};},
    'jev-direct-runtime-mutation':(_state,record)=>{record.services.jev={state:'not-started',runtimeMutationAttempted:true};},
    'missing-verify-intent':(_state,record)=>{delete record.services.naeil.verificationIntent;},
    'other-verify':(_state,record)=>{record.services.estimate.verificationIntent={state:'invoking',request:{attemptId:'unexpected-native'}};},
    'changed-verify-service':(_state,record)=>{record.services.naeil.verificationIntent.request.service.verification={command:{file:'/unapproved/native',args:[],timeoutMs:1000}};},
    'unbound-invoking-history':(_state,record)=>{record.services.naeil.reverificationAttempts=[{state:'invoking',request:{attemptId:'other-verify'}}];}
  };
  for(const [name,change]of Object.entries(cases))await t.test(name,async st=>{
    const f=await rebindFixture(st,change),plan=f.api.planTransition(f.input),old=readFileSync(join(f.controlDirectory,'active.json')),journal=readFileSync(join(f.controlDirectory,'transition.json'));
    await assert.rejects(()=>f.api.applyTransition(plan,rebindApproval(plan),f.deps));assert(!existsSync(f.newState));assert.deepEqual(readFileSync(join(f.controlDirectory,'active.json')),old);assert.deepEqual(readFileSync(join(f.controlDirectory,'transition.json')),journal);
  });
});

test('B rebind refuses non-completed/mismatched predecessors, lost STOP, changed bytes and invalid approval bindings',async t=>{
  for(const cause of ['non-completed','pointer-journal','old-pointer-digest','plan-digest','release-digest','generation-digest','expired','revoked','STOP-missing','STOP-mode','predecessor-plan','predecessor-approval','predecessor-journal','snapshot','inventory','pending-intent','new-lock','new-intent','unknown-native-ledger','unknown-native-attempt'])await t.test(cause,async st=>{
    const f=await rebindFixture(st),plan=f.api.planTransition(f.input),approved=rebindApproval(plan);
    if(cause==='non-completed')atomicJSON(plan.predecessor.journal.path,{...readPrivateJSON(plan.predecessor.journal.path),phase:'prepared'});
    if(cause==='pointer-journal')atomicJSON(plan.predecessor.pointer.path,{...plan.oldPointer,epochId:'foreign'});
    if(cause==='old-pointer-digest')approved.previousPointerSha256='0'.repeat(64);
    if(cause==='plan-digest')approved.planSha256='0'.repeat(64);
    if(cause==='release-digest')approved.releaseSha256='0'.repeat(64);
    if(cause==='generation-digest')approved.generationSha256='0'.repeat(64);
    if(cause==='expired')approved.expiresAt='2001-01-01';if(cause==='revoked')approved.revoked=true;
    if(cause==='STOP-missing')rmSync(f.stopFile);if(cause==='STOP-mode')chmodSync(f.stopFile,0o644);
    if(cause.startsWith('predecessor-'))writeFileSync(plan.predecessor[cause.slice('predecessor-'.length)].path,'changed\n');
    if(cause==='snapshot')writeFileSync(plan.old.snapshot.path,'changed\n');
    if(cause==='inventory')writeFileSync(plan.old.inventory.path,'changed\n');
    if(cause==='pending-intent')atomicJSON(plan.old.pendingIntent.path,{schemaVersion:1,intents:[{...readPrivateJSON(plan.old.pendingIntent.path).intents[0],kind:'rollout'}]});
    if(cause==='new-lock'||cause==='new-intent'){mkdirSync(f.newState,{mode:0o700});atomicJSON(join(f.newState,cause==='new-lock'?'dispatcher.lock':'pending-intent.json'),{foreign:true});}
    if(cause==='unknown-native-ledger')atomicJSON(join(f.root,'native/keys',hash('foreign-native-key')+'.json'),{state:'invoked',idempotencyKey:'foreign-native-key',attemptId:'foreign'});
    if(cause==='unknown-native-attempt'){const path=join(f.root,'native/attempts/foreign');mkdirSync(path,{recursive:true,mode:0o700});atomicJSON(join(path,'result.json'),{state:'activation-pending'});}
    const pointer=readFileSync(join(f.controlDirectory,'active.json')),journal=readFileSync(join(f.controlDirectory,'transition.json'));
    await assert.rejects(()=>f.api.applyTransition(plan,approved,f.deps));assert.deepEqual(readFileSync(join(f.controlDirectory,'active.json')),pointer);assert.deepEqual(readFileSync(join(f.controlDirectory,'transition.json')),journal);
  });
});

test('B every predecessor/import/journal/pointer boundary recovers the exact rebind without replay or predecessor writes',async t=>{
  for(const boundary of ['control-acquired','predecessor-pointer','predecessor-journal','predecessor-plan','predecessor-approval','predecessor-retained','journal-prepared','import-complete','import-root','journal-imported','journal-continuation-intent','continuation-state','generation-binding','journal-validated','journal-cutover-intent','active-pointer','journal-cutover'])await t.test(boundary,async st=>{
    const f=await rebindFixture(st),plan=f.api.planTransition(f.input),approved=rebindApproval(plan),old=preservedFiles(f.oldState);
    await assert.rejects(()=>f.api.applyTransition(plan,approved,{...f.deps,afterBoundary:name=>{if(name===boundary)throw Error('synthetic rebind crash');}}),/synthetic rebind crash/);
    const imported=existsSync(join(f.newState,'imported-root.json'))?readFileSync(join(f.newState,'imported-root.json')):null;
    if(!boundary.startsWith('predecessor-')&&boundary!=='control-acquired')assert.throws(()=>readActiveGeneration(f.controlDirectory));
    await f.api.recoverTransition(plan,approved,exactRecovery(f,plan,approved),f.deps);
    assert.equal(readActiveGeneration(f.controlDirectory).pointer.generationId,'synthetic-rebind');
    if(imported)assert.deepEqual(readFileSync(join(f.newState,'imported-root.json')),imported);
    const state=readStandingState(f.newState);assert.equal(state.releases['2'].history.filter(entry=>entry.resolution==='generation-rebind-verify-only').length,1);
    for(const [path,bytes]of old)assert.deepEqual(readFileSync(path),bytes);assert(!existsSync(join(f.newState,'pending-intent.json')));assert(existsSync(f.stopFile));
  });
});

test('B active reader and generation fences reject each tampered immutable predecessor copy',async t=>{
  for(const name of ['pointer','journal','plan','approval'])await t.test(name,async st=>{
    const f=await rebindFixture(st),plan=f.api.planTransition(f.input);await f.api.applyTransition(plan,rebindApproval(plan),f.deps);
    const active=readActiveGeneration(f.controlDirectory),path=join(f.controlDirectory,'transitions',plan.planSha256,'predecessor-'+name+'.json');writeFileSync(path,'changed\n');
    assert.throws(()=>readActiveGeneration(f.controlDirectory),/changed/);assert.throws(()=>assertGenerationFence({...f.config,generationFence:{controlDirectory:f.controlDirectory,pointerSha256:active.pointerSha256}}),/changed/);
  });
});

test('B lock archival supports prejournal, incomplete and completed rebind without replaying a phase',async t=>{
  for(const boundary of ['control-acquired','journal-imported','active-pointer','journal-completed'])await t.test(boundary,async st=>{
    const f=await rebindFixture(st),plan=f.api.planTransition(f.input),approved=rebindApproval(plan);
    await assert.rejects(()=>f.api.applyTransition(plan,approved,{...f.deps,afterBoundary:name=>{if(name===boundary)throw Error('synthetic rebind owner exit');}}),/synthetic rebind owner exit/);
    syntheticDeadLease(f,{kind:'standing-transition-acquisition',plan,approval:approved});
    const current=boundary==='journal-completed'?{state:fileReference(join(f.newState,'state.json')),binding:fileReference(join(f.newState,'generation-binding.json')),validatedRoot:fileReference(join(f.controlDirectory,'transitions',plan.planSha256,'validated-root.json'))}:null;
    const authorization=archiveAuthorization(f,plan,approved,current),before=preservedFiles(f.root);
    const archived=await f.api.archiveTransitionLock(plan,approved,authorization,f.deps);assertArchivePreserved(before,archived,f);
    if(boundary!=='journal-completed')await f.api.recoverTransition(plan,approved,exactRecovery(f,plan,approved),f.deps);
    assert.equal(readActiveGeneration(f.controlDirectory).pointer.generationId,'synthetic-rebind');
  });
});

test('B reader verifies two rebinds back to continuation and retains both epochs receipt inventories',async t=>{
  const f=await rebindFixture(t),first=f.api.planTransition(f.input);await f.api.applyTransition(first,rebindApproval(first),f.deps);
  const previous=readActiveGeneration(f.controlDirectory),state=readStandingState(f.newState),record=state.releases['2'],outputDirectory=join(f.newState,'runs/2/naeil/reverify-second');mkdirSync(outputDirectory,{recursive:true,mode:0o700});
  const service={...f.config.services.naeil};delete service.command;
  const request={...f.request,service,executionPath:f.config.executionPath,attemptId:'second-interrupted-verify',generationSha256:f.config.generationSha256,generationFence:{controlDirectory:f.controlDirectory,pointerSha256:previous.pointerSha256},outputDirectory};
  atomicJSON(join(outputDirectory,'input.json'),request);record.services.naeil.verificationIntent={state:'invoking',request};record.state='uncertain';state.blocked={releaseId:first.release.releaseId,serviceId:'naeil',reasonCode:'interrupted-verification'};
  writeStandingState(f.newState,state,{...f.config,generationFence:request.generationFence});
  const snapshot=join(f.root,'second-snapshot.json');writeFileSync(snapshot,readFileSync(join(f.newState,'state.json')),{mode:0o600});
  const config=structuredClone(f.config),newState=join(f.root,'epoch4');config.stateDirectory=newState;config.generationControl={controlDirectory:f.controlDirectory,generationId:'synthetic-rebind-second',epochId:'rebound-second'};
  const journal=readPrivateJSON(join(f.controlDirectory,'transition.json'));
  const input={...f.input,oldPointer:previous.pointer,predecessor:{pointer:fileReference(join(f.controlDirectory,'active.json')),journal:fileReference(join(f.controlDirectory,'transition.json')),plan:journal.plan,approval:journal.approval},old:{...f.input.old,generationId:previous.pointer.generationId,config:previous.pointer.config,stateDirectory:f.newState,evidenceRoot:f.newState,snapshot:fileReference(snapshot),inventory:f.put('second-inventory.json',standingEpochInventory(f.newState)),pendingIntent:fileReference(join(f.newState,'pending-intent.json'))},next:{...f.input.next,generationId:config.generationControl.generationId,epochId:config.generationControl.epochId,stateDirectory:newState,config:f.put('second-rebind-config.json',config)},estimate:{...f.input.estimate,newAttemptId:'estimate-second-rebound'},quiescence:{...f.input.quiescence,stateRoots:[f.newState,...f.input.quiescence.stateRoots.filter(path=>path!==f.oldState)],absentPaths:[join(f.newState,'dispatcher.lock'),...f.input.quiescence.absentPaths.filter(path=>!path.startsWith(f.oldState+'/')&&!path.startsWith(f.newState+'/')),join(newState,'dispatcher.lock'),join(newState,'pending-intent.json')]}};
  const plan=f.api.planTransition(input);await f.api.applyTransition(plan,rebindApproval(plan),f.deps);
  assert.equal(readActiveGeneration(f.controlDirectory).pointer.generationId,'synthetic-rebind-second');
  assert.doesNotThrow(()=>assertEvidencePath(config,join(f.request.outputDirectory,'input.json')));assert.doesNotThrow(()=>assertEvidencePath(config,join(outputDirectory,'input.json')));
  writeFileSync(join(f.controlDirectory,'transitions',first.planSha256,'predecessor-plan.json'),'tampered original continuation copy\n');
  assert.throws(()=>readActiveGeneration(f.controlDirectory),/changed/);
});

test('B rebind authority loss across a probe retains the control lease and last completed boundary',async t=>{
 for(const cause of ['approval','schema2-source','native-ledger'])await t.test(cause,async st=>{
  const f=await rebindFixture(st),plan=f.api.planTransition(f.input),approved=rebindApproval(plan),execute=f.deps.execute;let retained;
  await assert.rejects(()=>f.api.applyTransition(plan,approved,{...f.deps,execute:async(file,args)=>{
    const result=await execute(file,args);
    if(!retained&&existsSync(join(f.controlDirectory,'transition.json'))&&readPrivateJSON(join(f.controlDirectory,'transition.json')).planSha256===plan.planSha256) {
      retained={pointer:readFileSync(join(f.controlDirectory,'active.json')),journal:readFileSync(join(f.controlDirectory,'transition.json'))};
      if(cause==='approval')approved.revoked=true;
      if(cause==='schema2-source')atomicJSON(join(f.oldState,'state.json'),{changed:true});
      if(cause==='native-ledger')atomicJSON(plan.estimate.ledger.path,{state:'invoked'});
    }
    return result;
  }}),cause==='approval'?/rebind authorization/:/changed|differs/);
  assert(retained);assert(existsSync(join(f.controlDirectory,'control.lock')));assert.deepEqual(readFileSync(join(f.controlDirectory,'active.json')),retained.pointer);assert.deepEqual(readFileSync(join(f.controlDirectory,'transition.json')),retained.journal);assert(existsSync(f.stopFile));
 });
});
