import assert from 'node:assert/strict';
import { chmodSync, existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';
import test from 'node:test';
import { assertServiceResult, inspect, poll, reconcile } from './standing-dispatcher.mjs';
import { assertGenerationExecution, atomicJSON, automationDigest, fileReference, fingerprint, hash, IDS, invokeJSON, operationalGenerationDigest, ORIGINS, readPrivateJSON, routeKey, validateConfig } from './standing-config.mjs';
import { GitHub, GitHubUnavailable } from './standing-github.mjs';
import { readStandingEvidence, readStandingState, writeStandingEvidence, writeStandingState } from './standing-state.mjs';
import {declaration} from './fixtures/reviewed-expectations.mjs';
import { runtimeIndex } from './package-runtime.mjs';
import { validateVerificationRequest } from './standing-verification.mjs';
import { resolveSiteTarget } from './site-continuation.mjs';
import { syntheticSite } from './fixtures/site-continuation.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
function archive(version) {
  const chunks = [];
  for (const [name, value] of Object.entries({ 'package/package.json': JSON.stringify({ name: '@naeil/ui', version, type: 'module', exports: { '.': './dist/index.js' } }), 'package/dist/index.js': `export const version=${JSON.stringify(version)};` })) {
    const bytes = Buffer.from(value), header = Buffer.alloc(512);
    header.write(name); header.write('0000644\0', 100); header.write('0000000\0', 108); header.write('0000000\0', 116);
    header.write(`${bytes.length.toString(8).padStart(11, '0')}\0`, 124); header.write('00000000000\0', 136);
    header.fill(32, 148, 156); header.write('0', 156); header.write('ustar\0', 257); header.write('00', 263);
    header.write(`${[...header].reduce((a, b) => a + b).toString(8).padStart(6, '0')}\0 `, 148);
    chunks.push(header, bytes, Buffer.alloc((512 - bytes.length % 512) % 512));
  }
  return gzipSync(Buffer.concat([...chunks, Buffer.alloc(1024)]));
}

function fixture(t, patches = [1], { siteContinuation = false } = {}) {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'standing-rollout-'))); chmodSync(directory, 0o700);
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const stateDirectory = join(directory, 'state'); mkdirSync(stateDirectory, { mode: 0o700 });
  const data = new Map(), releases = [];
  const continuedSite = siteContinuation ? syntheticSite(directory, { siteSourceRevision: 'a'.repeat(40) }, archive('0.7.2')) : null;
  for (const n of patches) {
    const version = `0.7.${n}`, source = String(n).repeat(40), site = continuedSite?.approval.oldSourceRevision || 'a'.repeat(40);
    const tar = archive(version), archiveSha256 = hash(tar), ui = { version, contractVersion: '1' };
    const reference = Buffer.from(JSON.stringify({ schemaVersion: 1, kind: 'independent-release-render', frozen: true, sourceRevision: source, archiveSha256, ui, cases: [{}] }));
    const account = Buffer.from(JSON.stringify({ schemaVersion: 1, kind: 'independent-account-render', sourceRevision: source, archiveSha256, ui, cases: [{}] }));
    const url = name => `https://github.com/naeil-dev/naeil-ui/releases/download/v${version}/${name}`;
    const manifest = { schemaVersion: 1, releaseId: `ui-${version}`, version, previousVersion: `0.7.${n - 1}`, sourceRevision: source, siteSourceRevision: site, siteRuntimeSha256: hash(JSON.stringify(runtimeIndex(tar))), archive: { url: url('package.tgz'), sha256: archiveSha256 }, siteArchive: { url: url('site.tgz'), sha256: archiveSha256 }, contract: { version: '1', url: url('chrome.json'), sha256: hash(reference) }, account: { url: url('account.json'), sha256: hash(account) }, changes: n === 1 ? ['api', 'dom', 'fix'] : ['fix'] };
    const expectations=Buffer.from(JSON.stringify(declaration(manifest)));
    manifest.expectations={url:url('expectations.json'),sha256:hash(expectations)};
    const files = { 'expectations.json':expectations, 'package.tgz': tar, 'site.tgz': tar, 'chrome.json': reference, 'account.json': account, 'rollout-manifest.json': Buffer.from(JSON.stringify(manifest)) };
    const assets = Object.entries(files).map(([name, bytes], i) => { data.set(url(name), bytes); return { id: n * 10 + i, name, size: bytes.length, digest: `sha256:${hash(bytes)}`, browser_download_url: url(name) }; });
    releases.push({ id: n, tag_name: `v${version}`, draft: false, prerelease: false, author: { login: 'owner' }, published_at: new Date().toISOString(), assets });
  }
  const config = { schemaVersion: 1, enabled: true, repository: 'naeil-dev/naeil-ui', trustedPublishers: ['owner'], automation: { root, sha256: automationDigest(root) }, stateDirectory, policy: { enabled: true, approvedBy: 'owner', approvalRef: 'fixture-approval', expiresAt: new Date(Date.now() + 86400000).toISOString(), stopFile: join(directory, 'STOP'), services: IDS, maxEvidenceAgeSeconds: 10800, rollbackApproved: true, rollbackScope: 'code-only', patchWindow: { minVersion: '0.7.2', maxVersion: '0.7.99', contractVersion: '1' } }, services: Object.fromEntries(IDS.map(id => [id, { id, appId: id === 'estimate' ? 'abestimate' : id, origin: ORIGINS[id], command: { file: process.execPath, args: ['fixture'], timeoutMs: 1000 }, ...(id === 'naeil' ? { observer: { workflowPath: '.github/workflows/verify.yml', environment: 'Production', deploymentCreator: 'vercel[bot]', correlation: 'immutable-url' } } : {}), verification: { command: { file: process.execPath, args: ['fixture'], timeoutMs: 1000 } }, adapterOptions: { standingConfigPath: join(directory, `${id}-private.json`) }, routes: [{ path: '/', policy: 'canonical', renderState: { access: 'public' } }] }])) };
  config.trustedFiles = { [process.execPath]: hash(readFileSync(process.execPath)) }; config.executionPath = '/usr/bin:/bin:/usr/sbin:/sbin';
  config.policy.schemaVersion = 1;
  Object.assign(config.policy.patchWindow, { approvedBy: config.policy.approvedBy, approvalRef: config.policy.approvalRef, reason: 'Owner-authorized compatible shared UI fixes', startsAt: new Date(Date.now() - 86400000).toISOString(), expiresAt: config.policy.expiresAt, services: IDS });
  const initial = JSON.parse(data.get(releases.find(value => value.id === 1)?.assets.find(value => value.name === 'rollout-manifest.json').browser_download_url) || '{}');
  // Some tests deliberately begin with only a future release; their configured
  // baseline remains pinned independently of that incomplete event history.
  const baseTar = archive('0.7.1'), baseHash = hash(baseTar), baseUI = { version: '0.7.1', contractVersion: '1' };
  config.baseline = { version: '0.7.1', releaseId: 'ui-0.7.1', sourceRevision: '1'.repeat(40), archiveSha256: baseHash, referenceSha256: initial.contract?.sha256 || hash(Buffer.from(JSON.stringify({ schemaVersion: 1, kind: 'independent-release-render', frozen: true, sourceRevision: '1'.repeat(40), archiveSha256: baseHash, ui: baseUI, cases: [{}] }))), accountReferenceSha256: initial.account?.sha256 || hash(Buffer.from(JSON.stringify({ schemaVersion: 1, kind: 'independent-account-render', sourceRevision: '1'.repeat(40), archiveSha256: baseHash, ui: baseUI, cases: [{}] }))) };
  const github = { releases: async () => releases, asset: async value => data.get(value.browser_download_url), tagRevision: async tag => tag.slice(5).repeat(40), mainAncestor: async () => {}, workflow: async () => ({ state: 'success', id: 10 }), pages: async path => path.includes('deployments?') ? [{ id: 11, sha: new URL('https://synthetic.test' + path).searchParams.get('sha'), environment: 'Production', creator: { login: 'vercel[bot]' } }] : [{ id: 12, state: 'success', created_at: new Date().toISOString(), creator: { login: 'vercel[bot]' }, environment_url: 'https://synthetic.vercel.app' }] };
  const calls = [];
  const invoke = async (command, request) => { calls.push(request); return success(request); };
  const changeManifest = (n, change) => {
    const item = releases.find(item => item.id === n), asset = item.assets.find(asset => asset.name === 'rollout-manifest.json');
    const value = JSON.parse(data.get(asset.browser_download_url)); change(value);
    const bytes = Buffer.from(JSON.stringify(value)); data.set(asset.browser_download_url, bytes); asset.size = bytes.length; asset.digest = `sha256:${hash(bytes)}`;
  };
  const fetchImpl = async () => {
    const records = Object.values(readStandingState(stateDirectory).releases), prior = records.reverse().find(record => record.services?.naeil?.result?.artifact)?.services.naeil;
    assert(prior, 'Synthetic live identity requires a retained site result');
    const request = { ...prior.request, service: config.services.naeil };
    if (request.service.siteContinuationApproval) request.siteTarget = resolveSiteTarget(request.release, request.service.siteContinuationApproval);
    return Response.json(success(request).production.identity);
  };
  return { directory, config, github, invoke, calls, releases, data, changeManifest, fetchImpl, continuedSite, state: () => JSON.parse(JSON.stringify(readStandingState(stateDirectory))) };
}

function success(request) {
  const { service, release } = request;
  const artifact = { id: service.id === 'naeil' ? request.siteTarget?.deploymentId || 'dpl_Fixture' + release.version.split('.')[2] : `${service.id}-${release.version}`, sourceRevision: service.id === 'naeil' ? request.siteTarget?.sourceRevision || release.siteSourceRevision : 'b'.repeat(40), ui: { version: release.version, contractVersion: '1' }, ...(service.id === 'naeil' ? { platform: { kind: 'vercel-git', deploymentId: request.siteTarget?.deploymentId || 'dpl_Fixture' + release.version.split('.')[2] } } : { sha256: 'c'.repeat(64) }) };
  const production = { schemaVersion: 1, releaseId: release.releaseId, serviceId: service.id, idempotencyKey: request.idempotencyKey, attemptId: request.attemptId, phase: request.mode === 'adopt' ? 'adopt' : 'production', passed: true, identity: { schemaVersion: 1, appId: service.appId, artifactId: artifact.id, sourceRevision: artifact.sourceRevision, ui: artifact.ui }, archiveSha256: release.archive.sha256, referenceSha256: release.contract.sha256, accountReferenceSha256: release.account.sha256, expectationsSha256:release.expectations.sha256, ...(request.siteTarget ? {siteTargetSha256:fingerprint(request.siteTarget)} : {}), checkedAt: new Date().toISOString(), routes: service.routes.map(route => ({ path: route.path, routeKey: routeKey(route), status: 'production-verified' })) };
  return { schemaVersion: 1, releaseId: release.releaseId, serviceId: service.id, idempotencyKey: request.idempotencyKey, attemptId: request.attemptId, state: 'production-verified', artifact, production };
}

test('I2: a separately imported dispatcher cannot poll an intact approved root from another executing root', async t => {
  const f = fixture(t), staleDirectory = join(f.directory, 'stale', 'scripts', 'rollout');
  mkdirSync(staleDirectory, { recursive: true, mode: 0o700 });
  // Synthetic copy uses reviewed helpers while retaining its own module root.
  const source = readFileSync(new URL('./standing-dispatcher.mjs', import.meta.url), 'utf8').replace(/from '\.\/([^']+)'/g, (_match, name) => 'from ' + JSON.stringify(new URL('./' + name, import.meta.url).href));
  const path = join(staleDirectory, 'standing-dispatcher.mjs'); writeFileSync(path, source);
  const stale = await import(pathToFileURL(path).href); let entered = false;
  await assert.rejects(() => stale.poll(f.config, { ...f, automationRoot: root, github: { releases: async () => { entered = true; return []; } } }), /Running code differs from approved automation root/);
  assert.equal(entered, false); assert.equal(f.calls.length, 0);
  assert(!existsSync(join(f.config.stateDirectory, 'dispatcher.lock')));
  assert(!existsSync(join(f.config.stateDirectory, 'state.json')));
  assert.equal(automationDigest(root), f.config.automation.sha256);
});

function activateGeneration(f, release) {
  const controlDirectory=join(f.directory,'control');mkdirSync(controlDirectory,{mode:0o700});
  const pin=fileReference,verifier=join(f.directory,'verifier.json');atomicJSON(verifier,{schemaVersion:1,synthetic:'verifier'});
  for(const id of ['estimate','jev']) {const candidate=join(f.directory,id+'-candidate.json');atomicJSON(candidate,{service:id,passed:true});atomicJSON(f.config.services[id].adapterOptions.standingConfigPath,{handoff:{candidateReceipt:pin(candidate),sourceAdoption:{synthetic:id}}});}
  for(const id of IDS)f.config.services[id].verification.command.args=['fixture','--config',verifier];
  atomicJSON(verifier,{schemaVersion:1,services:f.config.services});
  f.config.configReferences=[verifier,...['estimate','jev'].map(id=>f.config.services[id].adapterOptions.standingConfigPath)].sort().map(path=>pin(path));f.config.configReferencesSha256=fingerprint(f.config.configReferences);
  const context={automationSha256:f.config.automation.sha256,trustedFiles:f.config.trustedFiles,executionPath:f.config.executionPath,stateSchemaVersion:2};
  f.config.generation={...context,executionContexts:{estimate:context,jev:{...context,executionPath:'/bin:/usr/bin'}}};f.config.generationSha256=operationalGenerationDigest(f.config.generation);
  f.config.generationControl={controlDirectory,generationId:'synthetic-v2',epochId:'initial'};
  const configPath=join(f.directory,'active-config.json');atomicJSON(configPath,f.config);
  const next={generationId:'synthetic-v2',generationSha256:f.config.generationSha256,config:pin(configPath),configReferencesSha256:f.config.configReferencesSha256,stateDirectory:f.config.stateDirectory,epochId:'initial'};
  const releaseBody=structuredClone(release);for(const key of ['archive','siteArchive','contract','account','expectations'])if(releaseBody[key])delete releaseBody[key].path;
  const priorAttemptId=Object.values(f.state().releases).find(record=>record.version===release.version).services.estimate.request.attemptId;
  const releaseSha256=fingerprint(releaseBody),plan={kind:'standing-0.7.2-continuation',next,previousApprovalSha256:'b'.repeat(64),release:releaseBody,predecessors:{naeil:Object.values(f.state().releases).find(record=>record.version===release.version).services.naeil.result.production.identity},estimate:{priorAttemptId,newAttemptId:'estimate-new-attempt',idempotencyKey:release.releaseId+':estimate'}};plan.planSha256=fingerprint(plan);
  const approval={schemaVersion:1,kind:'standing-continuation-approval',action:'continue-0.7.2-after-source-gate-failure',planSha256:plan.planSha256,generationSha256:f.config.generationSha256,previousApprovalSha256:plan.previousApprovalSha256,successorOf:plan.previousApprovalSha256,releaseSha256,priorAttemptId,attemptId:'estimate-new-attempt',approvedBy:'synthetic-owner',approvalRef:'synthetic://continuation',approvedAt:'2020-01-01',expiresAt:'2099-01-01',revoked:false};
  const planPath=join(controlDirectory,'plan.json'),approvalPath=join(controlDirectory,'approval.json');atomicJSON(planPath,plan);atomicJSON(approvalPath,approval);
  const pointer={schemaVersion:1,...next,authorizationSha256:fingerprint(approval),transitionPlanSha256:plan.planSha256};
  atomicJSON(join(controlDirectory,'active.json'),pointer);atomicJSON(join(controlDirectory,'transition.json'),{schemaVersion:1,oldPointer:null,imported:null,validatedState:null,proof:null,phase:'completed',newPointer:pointer,planSha256:plan.planSha256,approvalSha256:fingerprint(approval),plan:pin(planPath),approval:pin(approvalPath)});
  f.config.generationFence={controlDirectory,pointerSha256:pin(join(controlDirectory,'active.json')).sha256};
  return {plan,approval,releaseSha256};
}

test('historical naeil continuation re-verifies in the new generation before exact Estimate retry and preserves original binding',async t=>{
  const f=fixture(t,[1,2]),invoke=f.invoke;
  f.invoke=async (command,request)=>request.release.version==='0.7.2'&&request.service.id==='estimate'?{...success(request),state:'gate-failed',mutationAttempted:true,runtimeMutationAttempted:false}:invoke(command,request);
  await poll(f.config,f);const state=f.state(),record=state.releases['2'],binding=record.binding,naeil=structuredClone(record.services.naeil),prior=record.services.estimate;
  delete naeil.result.production.expectationsSha256;record.services.naeil=naeil;
  const {plan,approval,releaseSha256}=activateGeneration(f,naeil.request.release);
  record.generationContinuation={schemaVersion:1,planSha256:plan.planSha256,authorizationSha256:fingerprint(approval),generationSha256:f.config.generationSha256,originalBinding:binding,releaseSha256};
  naeil.continuation={schemaVersion:1,planSha256:plan.planSha256,authorizationSha256:fingerprint(approval),generationSha256:f.config.generationSha256,historicalRequestSha256:fingerprint(naeil.request),historicalResultSha256:fingerprint(naeil.result),requiresFreshVerification:true};
  record.history||=[];record.history.push({serviceId:'estimate',prior});record.services.estimate={state:'deferred',reconciliation:{priorAttemptId:prior.request.attemptId},authorizedAttemptId:'estimate-new-attempt'};delete state.blocked;writeStandingState(f.config.stateDirectory,state);f.calls.length=0;
  const events=[];f.invoke=async(command,request)=>{assertGenerationExecution(request);events.push(request.service.id);assert.equal(request.generationSha256,f.config.generationSha256);assert.deepEqual(request.generationFence,f.config.generationFence);const control=f.config.generationFence.controlDirectory;assert.deepEqual(readPrivateJSON(join(control,'control.lock')).acquisition,{kind:'standing-active-generation-acquisition',pointer:fileReference(join(control,'active.json')),journal:fileReference(join(control,'transition.json'))});if(request.service.id==='estimate'){assert.equal(request.attemptId,'estimate-new-attempt');assert.equal(request.idempotencyKey,prior.request.idempotencyKey);assert.equal(request.reconciliation.priorAttemptId,prior.request.attemptId);}return invoke(command,request);};
  const verify=async(command,request)=>{events.push('fresh-naeil');assert.equal(request.service.id,'naeil');assert.notEqual(request.attemptId,naeil.request.attemptId);assert.equal(request.generationSha256,f.config.generationSha256);return success(request).production;};
  assert.equal((await poll(f.config,{...f,verify})).currentVersion,'0.7.2');assert.deepEqual(events,['fresh-naeil','estimate','jev']);
  const after=f.state().releases['2'];assert.equal(after.binding,binding);assert.deepEqual(after.services.naeil.request,naeil.request);assert.deepEqual(after.services.naeil.result,naeil.result);
});

async function continuationFixture(t, continued = false) {
  const f=fixture(t,[1,2], { siteContinuation: continued }),invoke=f.invoke;
  f.invoke=async(command,request)=>request.release.version==='0.7.2'&&request.service.id==='estimate'?{...success(request),state:'gate-failed',mutationAttempted:true,runtimeMutationAttempted:false}:invoke(command,request);
  await poll(f.config,f);const state=f.state(),record=state.releases['2'],naeil=record.services.naeil,prior=record.services.estimate;delete naeil.result.production.expectationsSha256;
  if (continued) { const site = f.continuedSite.approval; site.releaseSha256 = (await import('./standing-config.mjs')).releaseIdentityDigest(naeil.request.release); site.expiresAt = new Date(Date.now() + 10 * 60_000).toISOString(); f.config.services.naeil.siteContinuationApproval = site; }
  const {plan,approval,releaseSha256}=activateGeneration(f,naeil.request.release);
  record.generationContinuation={schemaVersion:1,planSha256:plan.planSha256,authorizationSha256:fingerprint(approval),generationSha256:f.config.generationSha256,originalBinding:record.binding,releaseSha256};
  naeil.continuation={schemaVersion:1,planSha256:plan.planSha256,authorizationSha256:fingerprint(approval),generationSha256:f.config.generationSha256,historicalRequestSha256:fingerprint(naeil.request),historicalResultSha256:fingerprint(naeil.result),requiresFreshVerification:true};
  record.services.estimate={state:'deferred',reconciliation:{priorAttemptId:prior.request.attemptId},authorizedAttemptId:'estimate-new-attempt'};delete state.blocked;writeStandingState(f.config.stateDirectory,state);f.calls.length=0;
  return {...f,invoke:invoke,verify:async(_command,request)=>success(request).production};
}

test('T7 approved changed site appends fresh head and current-epoch prerequisite without changing historical/native tuples', async t => {
  const f = await continuationFixture(t, true), original = structuredClone(f.state().releases['2'].services.naeil), events = [];
  const verify = async (_command, request) => {
    events.push('fresh-site'); assert.notEqual(request.attemptId, original.request.attemptId);
    assert.equal(request.siteTarget.sourceRevision, f.continuedSite.approval.sourceRevision);
    assert.deepEqual(request.release, original.request.release);
    return success(request).production;
  };
  const invoke = async (_command, request) => {
    assertGenerationExecution(request); events.push(request.service.id);
    assert.deepEqual(request.release, original.request.release); assert.equal(request.siteTarget, undefined);
    return success(request);
  };
  const result = await poll(f.config, { ...f, verify, invoke });
  assert.equal(result.currentVersion, '0.7.2'); assert.deepEqual(events, ['fresh-site', 'estimate', 'jev']);
  const current = f.state().releases['2'].services.naeil;
  assert.deepEqual(current.request, original.request); assert.deepEqual(current.result, original.result);
  assert.equal(current.siteHead.artifact.sourceRevision, f.continuedSite.approval.sourceRevision);
  assert.equal(current.reverifications.at(-1).production.siteTargetSha256, fingerprint(current.siteHead.request.siteTarget));
});
test('T7 provenance is freshly checked immediately before each native dispatch and drift blocks the later consumer', async t => {
  const f = await continuationFixture(t), fetchImpl = f.fetchImpl, invoked = [];
  const invoke = async (_command, request) => {
    assertGenerationExecution(request); invoked.push(request.service.id);
    if (request.service.id === 'estimate') f.fetchImpl = async () => Response.json({ ...success(f.state().releases['2'].services.naeil.request).production.identity, sourceRevision: 'f'.repeat(40) });
    return success(request);
  };
  const result = await poll(f.config, { ...f, invoke, fetchImpl: (...args) => f.fetchImpl(...args) });
  assert.equal(result.state, 'blocked'); assert.deepEqual(invoked, ['estimate']);
  assert.equal(result.reasonCode, 'site-revision-not-approved');
  assert.equal(f.state().releases['2'].services.jev, undefined); assert.notEqual(f.fetchImpl, fetchImpl);
});

test('T7 independent native admission rejects old or forged site prerequisites despite equal package runtime', async t => {
  const f = await continuationFixture(t, true); let checks = 0;
  const invoke = async (_command, request) => {
    assertGenerationExecution(request);
    if (request.service.id === 'estimate') {
      for (const cause of ['old-site', 'missing-target', 'deployment', 'expectations', 'expired-production']) {
        const input = structuredClone(request), proof = readPrivateJSON(input.naeilPrerequisite.path);
        if (cause === 'old-site') { const original = f.state().releases['2'].services.naeil.result; proof.artifact = original.artifact; proof.production.identity = original.production.identity; }
        if (cause === 'missing-target') delete proof.request.siteTarget;
        if (cause === 'deployment') proof.artifact.id = 'dpl_Other';
        if (cause === 'expectations') delete proof.production.expectationsSha256;
        if (cause === 'expired-production') proof.production.checkedAt = '2001-01-01';
        const path = join(f.config.stateDirectory, 'prerequisites', 'forged-' + cause + '.json'); atomicJSON(path, proof); input.naeilPrerequisite = fileReference(path);
        assert.throws(() => assertGenerationExecution(input), /site|target|deployment|expectations|Stale/i); checks++;
      }
      const now = Date.now(); t.mock.method(Date, 'now', () => now + 11 * 60_000);
      assert.throws(() => assertGenerationExecution(request), /Site approval expired/); t.mock.restoreAll(); checks++;
    }
    return success(request);
  };
  const result = await poll(f.config, { ...f, invoke }); assert.equal(result.currentVersion, '0.7.2'); assert.equal(checks, 6);
});

test('I3: expired Estimate evidence refreshes with durable fresh verification without repeating its native attempt', async t => {
  const f = await continuationFixture(t), nativeRequests = [], verificationRequests = [];
  const invoke = async (_command, request) => {
    assertGenerationExecution(request); nativeRequests.push(request);
    return request.service.id === 'jev' ? { ...success(request), state: 'deferred', mutationAttempted: false } : success(request);
  };
  const verify = async (_command, request) => {
    const verifierPath = request.service.verification.command.args.at(-1);
    const verifierConfig = readPrivateJSON(verifierPath);
    validateVerificationRequest(request, verifierConfig);
    const saved = f.state().releases['2'].services[request.service.id];
    assert.equal(fingerprint(saved.verificationIntent.request), fingerprint(request), 'Intent must be durable before verification');
    if (request.service.id === 'estimate') {
      assert(request.reverification, 'A request flag cannot replace durable lineage');
      // Real credential-free transport and a synthetic read-only child each
      // enforce admission from the same durable intent. No native work runs.
      const script = `import {assertGenerationVerification,atomicJSON,readPrivateJSON} from ${JSON.stringify(new URL('./standing-config.mjs', import.meta.url).href)}; Date.now=()=>${Date.now()}; const input=readPrivateJSON(process.env.NAEIL_VERIFY_INPUT); assertGenerationVerification(input); atomicJSON(process.env.NAEIL_VERIFY_OUTPUT,{accepted:input.attemptId});`;
      const transported = await invokeJSON({ file: realpathSync(process.execPath), args: ['--input-type=module', '-e', script], timeoutMs: 10000 }, request, join(request.outputDirectory, 'synthetic-transport'), 'verify');
      assert.equal(transported.accepted, request.attemptId);
      const baseline = f.state();
      for (const [cause, expected] of [
        ['missing-lineage', /exact successor/], ['changed-input', /differs from durable intent/],
        ['missing-intent', /Durable invoking/], ['missing-barrier', /verification barrier/],
        ['epoch', /epoch changed/], ['artifact', /artifact differs/], ['source', /source\/attempt lineage/],
        ['success-reference', /Unsafe evidence reference/], ['substituted-native', /exact successor/],
        ['used-verifier-id', /cannot replay/], ['expired-site', /Stale production/],
      ]) {
        const current = structuredClone(baseline), input = structuredClone(request), prior = current.releases['2'].services.estimate;
        if (cause === 'missing-lineage') delete input.reverification;
        if (cause === 'changed-input') input.referencePath += '.substituted';
        if (cause === 'epoch') input.reverification.epochId = 'foreign';
        if (cause === 'artifact') input.artifact.id = 'substituted';
        if (cause === 'source') input.candidate.service = 'foreign';
        if (cause === 'success-reference') input.reverification.successfulAttempt.sha256 = 'f'.repeat(64);
        if (cause === 'substituted-native') {
          const success = readStandingEvidence(f.config.stateDirectory, input.reverification.successfulAttempt);
          success.request.attemptId = 'substituted-native'; success.result.attemptId = 'substituted-native';
          prior.request = success.request; prior.result = success.result;
          input.reverification.successfulAttempt = writeStandingEvidence(f.config.stateDirectory, success, f.config);
        }
        if (cause === 'used-verifier-id') (prior.reverificationAttempts ||= []).push({ request: input, state: 'production-verified' });
        if (cause === 'expired-site') {
          const proof = readPrivateJSON(input.naeilPrerequisite.path); proof.production.checkedAt = '2000-01-01';
          const path = join(f.config.stateDirectory, 'prerequisites', 'expired-synthetic-site.json'); atomicJSON(path, proof); input.naeilPrerequisite = fileReference(path);
        }
        if (cause !== 'changed-input') prior.verificationIntent.request = input;
        if (cause === 'missing-intent') delete prior.verificationIntent;
        writeStandingState(f.config.stateDirectory, current, f.config);
        if (cause === 'missing-barrier') rmSync(join(f.config.stateDirectory, 'pending-intent.json'));
        try { assert.throws(() => validateVerificationRequest(input, verifierConfig), expected, cause); }
        catch (error) { t.diagnostic(cause + ': ' + (error.actual?.message || error.message)); throw error; }
        finally { writeStandingState(f.config.stateDirectory, baseline, f.config); }
      }
      assert.throws(() => assertGenerationExecution(request), /cannot authorize native/);
    }
    verificationRequests.push(request); return success(request).production;
  };
  assert.equal((await poll(f.config, { ...f, invoke, verify })).state, 'deferred');
  const original = f.state().releases['2'].services.estimate;
  t.mock.timers.enable({ apis: ['Date'], now: Date.now() + (f.config.policy.maxEvidenceAgeSeconds + 1) * 1000 });
  assert.equal((await poll(f.config, { ...f, invoke, verify })).state, 'deferred');
  assert.equal(nativeRequests.filter(request => request.service.id === 'estimate').length, 1);
  const fresh = verificationRequests.find(request => request.service.id === 'estimate');
  assert(fresh); assert.notEqual(fresh.attemptId, original.request.attemptId);
  assert.deepEqual(fresh.artifact, original.result.artifact);
  const after = f.state().releases['2'].services.estimate;
  assert.deepEqual(after.request, original.request); assert.deepEqual(after.result, original.result);
  assert.equal(after.reverifications.at(-1).request.attemptId, fresh.attemptId);
  assert.equal(after.verificationIntent, undefined); assert.equal(f.state().blocked, undefined);
  const verifierConfig = readPrivateJSON(fresh.service.verification.command.args.at(-1));
  assert.throws(() => validateVerificationRequest(fresh, verifierConfig), /Durable invoking/);
  const replayDirectory = join(fresh.outputDirectory, 'replayed-transport');
  await assert.rejects(() => invokeJSON(fresh.service.verification.command, fresh, replayDirectory, 'verify'), /Durable invoking/);
  assert(!existsSync(replayDirectory), 'Replayed verification must fail before transport writes');
  await assert.rejects(() => invokeJSON(fresh.service.verification.command, fresh, replayDirectory, 'rollout'), /cannot authorize native/);
  assert(!existsSync(replayDirectory));
});

test('generation or manifest drift after admitted child completion prevents all later writes and dispatches',async t=>{
  for(const cause of ['manifest','pointer']) {
    const f=await continuationFixture(t),invoke=f.invoke;let before,calls=0;
    f.invoke=async(command,request)=>{calls++;assert.equal(request.service.id,'estimate');before=readFileSync(join(f.config.stateDirectory,'state.json'));const result=await invoke(command,request);atomicJSON(cause==='manifest'?f.config.configReferences[0].path:join(f.config.generationFence.controlDirectory,'active.json'),{changed:true});return result;};
    await assert.rejects(()=>poll(f.config,f));assert.equal(calls,1);assert.deepEqual(readFileSync(join(f.config.stateDirectory,'state.json')),before);assert.equal(f.state().releases['2'].services.estimate.state,'invoking');assert(existsSync(join(f.config.stateDirectory,'dispatcher.lock')));
  }
});

test('failed fresh historical naeil verification blocks Estimate and all later consumers',async t=>{
 const f=await continuationFixture(t);let calls=0;const result=await poll(f.config,{...f,invoke:async()=>{calls++;assert.fail('failed naeil proof dispatched native');},verify:async()=>{throw Error('synthetic fresh naeil failure');}});
 assert.equal(result.state,'blocked');assert.equal(calls,0);assert.equal(f.state().blocked.reasonCode,'cached-evidence-reverification-failed');assert.equal(f.state().releases['2'].services.naeil.result.production.expectationsSha256,undefined);
});

test('scoped baseline adoption, queued consecutive patches and idempotent later polling', async t => {
  const f = fixture(t, [1, 2, 3]);
  const result = await poll(f.config, f);
  assert.equal(result.currentVersion, '0.7.3'); assert.equal(result.allDiscoveredServicesComplete, false);
  assert.deepEqual(f.calls.map(value => value.service.id), [...IDS, ...IDS, ...IDS]);
  assert.deepEqual(f.calls.map(value => value.mode), ['adopt', 'adopt', 'adopt', ...Array(6).fill('standing')]);
  assert.equal(f.calls[1].adapterOptions.standingConfigPath, f.config.services.estimate.adapterOptions.standingConfigPath);
  assert.equal((await poll(f.config, f)).currentVersion, '0.7.3'); assert.equal(f.calls.length, 9);
});

test('missing predecessor and pending CI defer before app work, drafts/prereleases do not run', async t => {
  const future = fixture(t, [2]); assert.equal((await poll(future.config, future)).state, 'waiting-predecessor'); assert.equal(future.calls.length, 0);
  const pending = fixture(t, [1, 2]); pending.github.workflow = async sha => sha === '2'.repeat(40) ? { state: 'pending' } : { state: 'success', id: 10 };
  const result = await poll(pending.config, pending); assert.equal(result.currentVersion, '0.7.1'); assert.equal(result.state, 'waiting-package-ci'); assert.equal(pending.calls.length, 3);
  const drafts = fixture(t); drafts.releases[0].draft = true; assert.equal((await poll(drafts.config, drafts)).state, 'waiting-release'); assert.equal(drafts.calls.length, 0);
});

test('untrusted publisher, wrong tag, invalid archive and classified migrations block before dependent work', async t => {
  for (const mutate of [f => { f.releases[0].author.login = 'outsider'; }, f => { f.github.tagRevision = async () => 'f'.repeat(40); }, f => f.changeManifest(1, value => { value.archive.sha256 = 'f'.repeat(64); }), f => f.changeManifest(1, value => { value.siteSourceRevision = undefined; })]) {
    const f = fixture(t); mutate(f); assert.equal((await poll(f.config, f)).state, 'blocked'); assert.equal(f.calls.length, 0);
  }
  const migration = fixture(t, [1, 2]); migration.changeManifest(2, value => { value.changes = ['fix', 'dom']; });
  assert.equal((await poll(migration.config, migration)).currentVersion, '0.7.1'); assert.equal(migration.calls.length, 3);
});

test('an owner-approved migration of the exact release runs through every selected service; partial or mismatched approval blocks', async t => {
  const approve = (f, services, tweak = value => value) => {
    let manifest; f.changeManifest(2, value => { value.changes = ['dom']; manifest = value; });
    f.config.policy.reviewedMigration = tweak({ releaseId: manifest.releaseId, version: manifest.version, sourceRevision: manifest.sourceRevision, siteSourceRevision: manifest.siteSourceRevision, archiveSha256: manifest.archive.sha256, contractSha256: manifest.contract.sha256, changes: ['dom'], services, approvedBy: 'owner', approvalRef: 'migration-approval', reason: 'Reviewed header catalog change', expiresAt: new Date(Date.now() + 86400000).toISOString() });
  };
  const approved = fixture(t, [1, 2]); approve(approved, [...approved.config.policy.services]);
  assert.equal((await poll(approved.config, approved)).currentVersion, '0.7.2'); assert.equal(approved.calls.length, 6);
  const partial = fixture(t, [1, 2]); approve(partial, partial.config.policy.services.slice(1));
  assert.equal((await poll(partial.config, partial)).currentVersion, '0.7.1'); assert.equal(partial.calls.length, 3);
  const otherBytes = fixture(t, [1, 2]); approve(otherBytes, [...otherBytes.config.policy.services], value => ({ ...value, archiveSha256: 'f'.repeat(64) }));
  assert.equal((await poll(otherBytes.config, otherBytes)).currentVersion, '0.7.1'); assert.equal(otherBytes.calls.length, 3);
  const otherReference = fixture(t, [1, 2]); approve(otherReference, [...otherReference.config.policy.services], value => ({ ...value, contractSha256: 'f'.repeat(64) }));
  assert.equal((await poll(otherReference.config, otherReference)).currentVersion, '0.7.1'); assert.equal(otherReference.calls.length, 3);
});

test('changed published asset or moved tag remains blocked even after completed baseline', async t => {
  const f = fixture(t); await poll(f.config, f); f.releases[0].assets[0].id++;
  assert.equal((await poll(f.config, f)).reasonCode, 'published-release-changed'); assert.equal(f.calls.length, 3);
  const tag = fixture(t); await poll(tag.config, tag); tag.github.tagRevision = async () => 'f'.repeat(40);
  assert.equal((await poll(tag.config, tag)).state, 'blocked'); assert.equal(tag.calls.length, 3);
});

test('native failure stops next service and release; uncertain command never replays', async t => {
  for (const uncertain of [false, true]) {
    const f = fixture(t, [1, 2]); const original = f.invoke;
    f.invoke = async (command, request) => { if (request.service.id !== 'estimate') return original(command, request); f.calls.push(request); if (uncertain) throw Error('private child output'); return { ...success(request), state: 'gate-failed' }; };
    const result = await poll(f.config, f); assert.equal(result.state, 'blocked'); assert.equal(result.blockedService, 'estimate'); assert.equal(f.calls.length, 2);
    await poll(f.config, f); assert.equal(f.calls.length, 2); assert(!JSON.stringify(result).includes('private child'));
  }
});

test('crash marker and existing dispatcher lock never cause automatic replay or lock stealing', async t => {
  const f = fixture(t);
  writeStandingState(f.config.stateDirectory, { schemaVersion: 1, repository: f.config.repository, currentVersion: null, releases: { '1': { releaseId: 'ui-0.7.1', services: { estimate: { state: 'invoking', request: { attemptId: 'interrupted-fixture' } } } } } });
  assert.equal((await poll(f.config, f)).reasonCode, 'interrupted-invocation'); assert.equal(f.calls.length, 0);
  const lock = fixture(t), lockPath = join(lock.config.stateDirectory, 'dispatcher.lock'); writeFileSync(lockPath, '{}', { mode: 0o600 });
  await assert.rejects(poll(lock.config, lock)); assert(existsSync(lockPath)); assert.equal(lock.calls.length, 0);
});

test('only explicit no-mutation deferral retries, preserving previously passed services', async t => {
  const f = fixture(t); const original = f.invoke; let deferred = false;
  f.invoke = async (command, request) => { if (request.service.id === 'estimate' && !deferred) { deferred = true; f.calls.push(request); return { ...success(request), state: 'deferred', mutationAttempted: false }; } return original(command, request); };
  assert.equal((await poll(f.config, f)).state, 'deferred'); assert.equal((await poll(f.config, f)).currentVersion, '0.7.1');
  assert.deepEqual(f.calls.map(value => value.service.id), ['naeil', 'estimate', 'estimate', 'jev']); assert.notEqual(f.calls[1].attemptId, f.calls[2].attemptId);
  const unsafe = fixture(t); unsafe.invoke = async (command, request) => ({ ...success(request), state: 'deferred' });
  assert.equal((await poll(unsafe.config, unsafe)).state, 'blocked');
});

test('STOP and expired policy prevent dispatch; wrong attempt, account, route or app source cannot verify', async t => {
  const stopped = fixture(t); writeFileSync(stopped.config.policy.stopFile, 'stop'); assert.equal((await poll(stopped.config, stopped)).state, 'stopped'); assert.equal(stopped.calls.length, 0);
  const broken = fixture(t); symlinkSync(join(broken.directory, 'missing-stop-target'), broken.config.policy.stopFile); assert.equal((await poll(broken.config, broken)).state, 'stopped'); assert.equal(broken.calls.length, 0);
  const expired = fixture(t); expired.config.policy.expiresAt = '2000-01-01'; assert.equal((await poll(expired.config, expired)).state, 'authorization-expired');
  const f = fixture(t); await poll(f.config, f); const request = f.calls[0];
  for (const change of [value => { value.attemptId = 'foreign'; }, value => { value.production.accountReferenceSha256 = 'f'.repeat(64); }, value => { value.production.routes[0].routeKey = 'foreign'; }, value => { value.artifact.sourceRevision = request.release.sourceRevision; }]) { const result = success(request); change(result); assert.throws(() => assertServiceResult(result, request)); }
});

test('private config scope, source digest, symlink and permissions are enforced', t => {
  const f = fixture(t); validateConfig(f.config);
  const changed = structuredClone(f.config); changed.services.home = changed.services.naeil; assert.throws(() => validateConfig(changed));
  const digest = structuredClone(f.config); digest.automation.sha256 = 'f'.repeat(64); assert.throws(() => validateConfig(digest));
  const file = join(f.directory, 'config.json'); atomicJSON(file, f.config); assert.deepEqual(readPrivateJSON(file), f.config);
  chmodSync(file, 0o644); assert.throws(() => readPrivateJSON(file)); chmodSync(file, 0o600);
  const link = join(f.directory, 'link.json'); symlinkSync(file, link); assert.throws(() => readPrivateJSON(link));
});

test('real child uses shell:false private JSON transport and suppresses child failure output', async t => {
  const f = fixture(t), script = join(f.directory, 'child.mjs');
  writeFileSync(script, "import{readFileSync,writeFileSync}from'node:fs'; const value=JSON.parse(readFileSync(process.env.NAEIL_ROLLOUT_INPUT));writeFileSync(process.env.NAEIL_ROLLOUT_OUTPUT,JSON.stringify({literal:value.literal}),{mode:0o600});");
  const result = await invokeJSON({ file: process.execPath, args: [script], timeoutMs: 1000 }, { literal: '$(never-execute); `never`' }, join(f.directory, 'invoke'));
  assert.equal(result.literal, '$(never-execute); `never`');
  await assert.rejects(invokeJSON({ file: process.execPath, args: ['-e', 'console.error("PRIVATE_SENTINEL");process.exit(1)'], timeoutMs: 1000 }, {}, join(f.directory, 'fail')), error => !error.message.includes('PRIVATE_SENTINEL'));
});

test('GitHub polling paginates rather than trusting latest and blocks foreign redirects', async () => {
  const calls = [];
  const github = new GitHub({ token: 'fixture', fetchImpl: async (url, options) => { calls.push({ url, options }); return new Response(JSON.stringify(new URL(url).searchParams.get('page') === '1' ? Array.from({ length: 100 }, (_, id) => ({ id })) : [{ id: 100 }]), { status: 200 }); } });
  assert.equal((await github.releases()).length, 101); assert.equal(calls.length, 2); assert(calls.every(value => value.options.redirect === 'error'));
  const redirect = new GitHub({ fetchImpl: async () => new Response('', { status: 302, headers: { location: 'https://attacker.example/archive' } }) });
  await assert.rejects(redirect.asset({ browser_download_url: 'https://github.com/naeil-dev/naeil-ui/releases/download/v0.7.2/package.tgz', size: 0 }));
});

test('transient release metadata or asset failures retry before dispatch without skipping a patch', async t => {
  const f = fixture(t), original = f.github.asset; let unavailable = true;
  f.github.asset = async asset => { if (unavailable) throw new GitHubUnavailable(); return original(asset); };
  assert.equal((await poll(f.config, f)).state, 'release-unavailable'); assert.equal(f.calls.length, 0); assert(!f.state().blocked);
  unavailable = false; assert.equal((await poll(f.config, f)).currentVersion, '0.7.1'); assert.equal(f.calls.length, 3);
  const timeout = new GitHub({ fetchImpl: async () => { throw Error('private failure details'); } });
  await assert.rejects(timeout.releases(), GitHubUnavailable);
  const limited = new GitHub({ fetchImpl: async () => new Response('', { status: 429 }) }); await assert.rejects(limited.releases(), GitHubUnavailable);
});

test('cached frozen references or archives cannot be replaced with linked, public or changed bytes', async t => {
  for (const type of ['symlink', 'hardlink', 'permission', 'bytes']) {
    const f = fixture(t), original = f.invoke;
    f.invoke = async (command, request) => request.service.id === 'estimate' ? { ...success(request), state: 'deferred', mutationAttempted: false } : original(command, request);
    assert.equal((await poll(f.config, f)).state, 'deferred');
    const path = join(f.config.stateDirectory, 'releases', '1', type === 'bytes' ? 'account.json' : 'archive.tgz');
    if (['symlink', 'hardlink'].includes(type)) {
      const copied = join(f.directory, 'copied'); writeFileSync(copied, readFileSync(path), { mode: 0o600 }); unlinkSync(path);
      if (type === 'symlink') symlinkSync(copied, path); else linkSync(copied, path);
    } else if (type === 'permission') chmodSync(path, 0o644);
    else writeFileSync(path, '{}');
    assert.equal((await poll(f.config, f)).state, 'blocked'); assert.equal(f.calls.length, 1);
  }
});

test('external trusted helper bytes and executable closure are mandatory and rechecked between apps', async t => {
  const f = fixture(t), helper = join(f.directory, 'helper.mjs'); writeFileSync(helper, 'reviewed');
  f.config.trustedFiles[helper] = hash(readFileSync(helper)); validateConfig(f.config);
  const missing = structuredClone(f.config); delete missing.trustedFiles[process.execPath]; assert.throws(() => validateConfig(missing));
  const invalidPath = structuredClone(f.config); invalidPath.executionPath = '.:/usr/bin'; assert.throws(() => validateConfig(invalidPath));
  const original = f.invoke; f.invoke = async (...args) => { const value = await original(...args); writeFileSync(helper, 'changed'); return value; };
  assert.equal((await poll(f.config, f)).state, 'blocked'); assert.deepEqual(f.calls.map(value => value.service.id), ['naeil']);
});

test('STOP and stale cached production prevent later app dispatch without replaying earlier apps', async t => {
  const stopped = fixture(t), original = stopped.invoke;
  stopped.invoke = async (...args) => { const value = await original(...args); writeFileSync(stopped.config.policy.stopFile, 'STOP'); return value; };
  assert.equal((await poll(stopped.config, stopped)).state, 'stopped'); assert.equal(stopped.calls.length, 1);
  assert(!stopped.state().blocked); assert.equal(stopped.state().releases['1'].state, 'stopped');
  unlinkSync(stopped.config.policy.stopFile); stopped.invoke = original; assert.equal((await poll(stopped.config, stopped)).state, 'complete'); assert.equal(stopped.calls.length, 3);
  const stale = fixture(t), invoke = stale.invoke; let deferred = true;
  stale.invoke = async (command, request) => request.service.id === 'estimate' && deferred ? { ...success(request), state: 'deferred', mutationAttempted: false } : invoke(command, request);
  await poll(stale.config, stale);
  const state = stale.state(); state.releases['1'].services.naeil.result.production.checkedAt = '2000-01-01T00:00:00Z'; writeStandingState(stale.config.stateDirectory, state);
  deferred = false; stale.verify = async (_command, request) => success(request).production;
  assert.equal((await poll(stale.config, stale)).state, 'complete'); assert.equal(stale.calls.length, 3);
});

test('child command uses configured PATH and removes inherited runtime injection options', async t => {
  const f = fixture(t), script = join(f.directory, 'environment.mjs');
  writeFileSync(script, "import{writeFileSync}from'node:fs';writeFileSync(process.env.NAEIL_ROLLOUT_OUTPUT,JSON.stringify(Object.fromEntries(['PATH','NODE_OPTIONS','NODE_PATH','PYTHONPATH','LD_PRELOAD'].map(k=>[k,process.env[k]??null]))),{mode:0o600});");
  const changed = { PATH: '/UNTRUSTED', NODE_OPTIONS: '--require=/UNTRUSTED', NODE_PATH: '/UNTRUSTED', PYTHONPATH: '/UNTRUSTED', LD_PRELOAD: '/UNTRUSTED' };
  const previous = Object.fromEntries(Object.keys(changed).map(key => [key, process.env[key]]));
  Object.assign(process.env, changed);
  try {
    const result = await invokeJSON({ file: process.execPath, args: [script], timeoutMs: 1000 }, { executionPath: '/usr/bin:/bin' }, join(f.directory, 'environment'));
    assert.deepEqual(result, { PATH: '/usr/bin:/bin', NODE_OPTIONS: null, NODE_PATH: null, PYTHONPATH: null, LD_PRELOAD: null });
  } finally { for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; } }
});

test('F3 regression: stale cached evidence is reverified without replaying the adapter', async t => {
  const f = fixture(t);
  const original = f.invoke;
  f.invoke = async (command, request, directory) => request.service.id === 'estimate' ? { ...success(request), state: 'deferred', mutationAttempted: false } : original(command, request, directory);
  assert.equal((await poll(f.config, f)).state, 'deferred');
  const state = f.state();
  state.releases['1'].services.naeil.result.production.checkedAt = new Date(Date.now() - (f.config.policy.maxEvidenceAgeSeconds + 60) * 1000).toISOString();
  writeStandingState(f.config.stateDirectory, state);
  const prior = structuredClone(state.releases['1'].services.naeil.result);
  f.verify = async (_command, request) => success(request).production;
  const result = await poll(f.config, f);
  assert.equal(result.state, 'deferred');
  const saved = f.state().releases['1'].services.naeil;
  assert.deepEqual(saved.result, prior);
  assert.equal(saved.reverifications.length, 1);
  assert.equal(f.calls.filter(r => r.service.id === 'naeil').length, 1);
});

test('F4 regression: bound nonzero gate-failed result is retained and classified', async t => {
  const f = fixture(t);
  const script = join(f.directory, 'adapter.mjs');
  writeFileSync(script, "import{readFileSync,writeFileSync}from'node:fs';const r=JSON.parse(readFileSync(process.env.NAEIL_ROLLOUT_INPUT));writeFileSync(process.env.NAEIL_ROLLOUT_OUTPUT,JSON.stringify({schemaVersion:1,releaseId:r.release.releaseId,serviceId:r.service.id,idempotencyKey:r.idempotencyKey,attemptId:r.attemptId,state:'gate-failed',mutationAttempted:false}),{mode:0o600});process.exitCode=1;", {mode:0o600});
  f.config.services.estimate.command = {file:process.execPath,args:[script],timeoutMs:3000};
  f.config.trustedFiles[script] = hash(readFileSync(script));
  const original = f.invoke;
  let outputPath;
  f.invoke = async (command, request, directory, kind, options) => {
    if(request.service.id!=='estimate') return original(command,request,directory);
    outputPath=join(directory,'output.json');return invokeJSON(command,request,directory,kind,options);
  };
  const result = await poll(f.config, f);
  assert.equal(result.state, 'blocked'); assert.equal(result.reasonCode, 'gate-failed');
  const output = readPrivateJSON(outputPath);
  assert.equal(output.state,'gate-failed');assert.equal(output.mutationAttempted,false);
  assert.equal(f.state().releases['1'].services.estimate.state,'gate-failed');
  assert.equal(f.state().releases['1'].services.estimate.result.transportExitCode, 1);
});

for (const status of ['disabled', 'authorization-expired', 'stopped']) test('F8 entry ' + status + ' writes resumable summary and persists since', async t => {
  const f = fixture(t); let network = 0; f.github.releases = async () => { network++; return f.releases; };
  if (status === 'disabled') f.config.enabled = false;
  if (status === 'authorization-expired') f.config.policy.expiresAt = '2000-01-01';
  if (status === 'stopped') writeFileSync(f.config.policy.stopFile, 'STOP');
  const first = await poll(f.config, f); assert.equal(first.state, status); assert(first.since); assert(!f.state().blocked);
  const saved = f.state(); saved.observedAt = '2000-01-01'; writeStandingState(f.config.stateDirectory, saved);
  const second = await poll(f.config, f); assert.equal(second.since, first.since); assert.notEqual(f.state().observedAt, saved.observedAt);
  assert.deepEqual(readPrivateJSON(join(f.config.stateDirectory, 'summary.json')), second);
  assert.equal(network, 0); assert.equal(f.calls.length, 0);
});
for (const status of ['disabled', 'authorization-expired']) test('F8 mid-loop ' + status + ' leaves release stopped without a durable block', async t => {
  const f = fixture(t), original = f.invoke;
  f.invoke = async (...args) => { const result = await original(...args); if (status === 'disabled') f.config.enabled = false; else f.config.policy.expiresAt = '2000-01-01'; return result; };
  assert.equal((await poll(f.config, f)).state, status); assert.equal(f.state().releases['1'].state, 'stopped'); assert(!f.state().blocked); assert.equal(f.calls.length, 1);
});
test('F15 cancelled exact package CI waits and resumes after the rerun succeeds', async t => {
  const f = fixture(t, [1, 2]); f.github.workflow = async sha => sha === '2'.repeat(40) ? { state: 'cancelled' } : { state: 'success', id: 10 };
  const waiting = await poll(f.config, f); assert.equal(waiting.state, 'waiting-package-ci'); assert.equal(waiting.reasonCode, 'cancelled'); assert(waiting.since); assert(!f.state().blocked); assert.equal(f.calls.length, 3);
  const again = await poll(f.config, f); assert.equal(again.since, waiting.since);
  f.github.workflow = async () => ({ state: 'success', id: 10 }); assert.equal((await poll(f.config, f)).state, 'complete'); assert.equal(f.calls.length, 6);
});
test('F3 fresh identity or binding failure during re-verification blocks without replay', async t => {
  for (const failure of ['identity', 'route', 'stale', 'command', 'cached-binding']) {
    const f = fixture(t), original = f.invoke;
    f.invoke = async (command, request) => request.service.id === 'estimate' ? { ...success(request), state: 'deferred', mutationAttempted: false } : original(command, request);
    await poll(f.config, f);
    const saved = f.state(), prior = saved.releases['1'].services.naeil;
    prior.result.production.checkedAt = '2000-01-01';
    if (failure === 'cached-binding') prior.result.production.accountReferenceSha256 = 'f'.repeat(64);
    writeStandingState(f.config.stateDirectory, saved);
    let checks = 0;
    f.verify = async (_command, request) => {
      checks++; assert.equal(readPrivateJSON(join(f.config.stateDirectory, 'summary.json')).state, 'cached-evidence-expired');
      if (failure === 'command') throw new Error('synthetic verifier refusal');
      const value = success(request).production;
      if (failure === 'identity') value.identity.artifactId = 'foreign';
      if (failure === 'route') value.routes = [];
      if (failure === 'stale') value.checkedAt = '2000-01-01';
      return value;
    };
    const blocked = await poll(f.config, f); assert.equal(blocked.reasonCode, 'cached-evidence-reverification-failed');
    assert.equal(checks, failure === 'cached-binding' ? 0 : 1); assert.equal(f.calls.length, 1);
    await poll(f.config, f); assert.equal(f.calls.length, 1);
  }
});
test('F3 successive read-only refreshes append receipts and use new private attempt directories', async t => {
  const f = fixture(t), original = f.invoke, checks = [];
  f.invoke = async (command, request) => request.service.id === 'estimate' ? { ...success(request), state: 'deferred', mutationAttempted: false } : original(command, request);
  f.verify = async (_command, request, directory, kind) => { checks.push(request); assert.equal(kind, 'verify'); assert(directory.startsWith(request.outputDirectory)); return success(request).production; };
  await poll(f.config, f);
  const path = join(f.config.stateDirectory, 'state.json');
  for (let index = 0; index < 2; index++) {
    const saved = f.state(), prior = saved.releases['1'].services.naeil;
    (index ? prior.reverifications.at(-1).production : prior.result.production).checkedAt = '2000-01-01';
    if (index) prior.siteHead.production.checkedAt = '2000-01-01'; // Age the current head as well as its retained appended receipt.
    writeStandingState(f.config.stateDirectory, saved);
    assert.equal((await poll(f.config, f)).state, 'deferred');
  }
  const prior = f.state().releases['1'].services.naeil;
  assert.equal(prior.reverifications.length, 2); assert.equal(prior.result.production.checkedAt, '2000-01-01');
  assert.notEqual(checks[0].attemptId, checks[1].attemptId); assert.notEqual(checks[0].outputDirectory, checks[1].outputDirectory);
  assert(checks.every(value => value.outputDirectory.includes('/naeil/reverify-') && value.phase === 'adopt'));
  assert.equal(f.calls.filter(value => value.service.id === 'naeil').length, 1);
});
for (const outcome of ['activation-pending', 'review-required', 'not-deployed', 'production-verified', 'deferred', 'unbound', 'invalid', 'missing', 'timeout', 'signal', 'maxBuffer']) test('F4 transport classifies nonzero ' + outcome + ' conservatively', async t => {
  const f = fixture(t), script = join(f.directory, 'nonzero.mjs'), original = f.invoke;
  let code = "import{readFileSync,writeFileSync}from'node:fs';const r=JSON.parse(readFileSync(process.env.NAEIL_ROLLOUT_INPUT));";
  if (outcome !== 'missing') code += outcome === 'invalid' ? "writeFileSync(process.env.NAEIL_ROLLOUT_OUTPUT,'invalid',{mode:0o600});" : "writeFileSync(process.env.NAEIL_ROLLOUT_OUTPUT,JSON.stringify(r.syntheticResult),{mode:0o600});";
  code += outcome === 'timeout' ? 'setInterval(()=>{},1000);' : outcome === 'signal' ? "process.kill(process.pid,'SIGTERM');" : outcome === 'maxBuffer' ? "process.stdout.write('x'.repeat(2*1024*1024));process.exitCode=1;" : 'process.exitCode=1;';
  writeFileSync(script, code, { mode: 0o600 });
  f.config.services.estimate.command = { file: process.execPath, args: [script], timeoutMs: outcome === 'timeout' ? 150 : 3000 }; f.config.trustedFiles[script] = hash(readFileSync(script));
  f.invoke = async (command, request, directory, kind, options) => {
    if (request.service.id !== 'estimate') return original(command, request);
    const result = { ...success(request), state: ['unbound', 'invalid', 'missing', 'timeout', 'signal', 'maxBuffer'].includes(outcome) ? 'gate-failed' : outcome, mutationAttempted: false };
    if (outcome === 'unbound') result.attemptId = 'foreign';
    return invokeJSON(command, { ...request, syntheticResult: result }, directory, kind, options);
  };
  const result = await poll(f.config, f), accepted = ['activation-pending', 'review-required', 'not-deployed'].includes(outcome);
  assert.equal(result.reasonCode, accepted ? outcome : 'command-or-result-uncertain');
  assert.equal(f.state().releases['1'].services.estimate.state, accepted ? outcome : 'uncertain');
  const count = f.calls.length; await poll(f.config, f); assert.equal(f.calls.length, count);
});
function nativeInspectionFixture(f) {
  const stateDirectory = join(f.directory, 'estimate-state'), nativeState = join(f.directory, 'estimate-native');
  mkdirSync(stateDirectory, { mode: 0o700 }); mkdirSync(nativeState, { mode: 0o700 }); mkdirSync(join(stateDirectory, 'keys'), { mode: 0o700 });
  atomicJSON(f.config.services.estimate.adapterOptions.standingConfigPath, { stateDirectory, activation: { stateDirectory: nativeState } });
  return { stateDirectory, nativeState };
}
const ownerResolution = { approvedBy: 'synthetic-owner', reason: 'Bound evidence proves this retry is before native dispatch' };
test('F4 inspect exposes bounded operational facts and validates retained output without writing', async t => {
  const f = fixture(t), native = nativeInspectionFixture(f), original = f.invoke;
  f.invoke = async (command, request, directory) => {
    if (request.service.id !== 'estimate') return original(command, request);
    atomicJSON(join(directory, 'output.json'), { ...success(request), state: 'gate-failed', mutationAttempted: true, runtimeMutationAttempted: false }); throw new Error('synthetic transport loss');
  };
  await poll(f.config, f);
  const prior = f.state().releases['1'].services.estimate;
  atomicJSON(join(native.nativeState, 'operation.json'), { phase: 'stopped', secret: 'PRIVATE_SENTINEL' });
  atomicJSON(join(native.stateDirectory, 'running.lock'), { secret: 'PRIVATE_SENTINEL' });
  atomicJSON(join(native.stateDirectory, 'keys', hash(prior.request.idempotencyKey) + '.json'), { state: 'gate-failed', mutationAttempted: true, runtimeMutationAttempted: false, secret: 'PRIVATE_SENTINEL' });
  const before = readFileSync(join(f.config.stateDirectory, 'state.json'));
  const result = await inspect(f.config, { fetchImpl: async url => { const id = IDS.find(id => ORIGINS[id] === new URL(url).origin); const request = { ...f.calls[0], service: f.config.services[id] }; return Response.json(success(request).production.identity); } });
  assert(!JSON.stringify(result).includes('PRIVATE_SENTINEL')); assert.deepEqual(readFileSync(join(f.config.stateDirectory, 'state.json')), before); assert(!existsSync(join(f.config.stateDirectory, 'dispatcher.lock')));
  const estimate = result.releases[0].services[1];
  assert.deepEqual(estimate.retainedOutput, { exists: true, validates: true }); assert.equal(estimate.native.phase, 'stopped'); assert(estimate.native.runningLock); assert(estimate.native.operationMarker); assert.equal(estimate.native.ledger.state, 'gate-failed');
  assert.equal(estimate.mutationAttempted, true); assert.equal(estimate.runtimeMutationAttempted, false); assert.equal(result.liveIdentity.estimate.appId, 'abestimate');
});
test('F4 explicit pre-mutation reconciliation uses retained bound proof and preserves prior record', async t => {
  const f = fixture(t); f.invoke = async (_command, request, directory) => { atomicJSON(join(directory, 'output.json'), { ...success(request), state: 'gate-failed', mutationAttempted: false, runtimeMutationAttempted: false }); throw new Error('synthetic lost transport'); };
  await poll(f.config, f); const prior = f.state().releases['1'].services.naeil;
  await assert.rejects(reconcile(f.config, 'ui-0.7.1', 'naeil', 'retry-pre-mutation', { reason: 'missing owner' }), /approver/);
  await reconcile(f.config, 'ui-0.7.1', 'naeil', 'retry-pre-mutation', ownerResolution);
  const saved = f.state(), record = saved.releases['1']; assert(!saved.blocked); assert.deepEqual(record.history[0].prior, prior); assert.equal(record.history[0].approvedBy, ownerResolution.approvedBy);
  f.invoke = async (_command, request) => { f.calls.push(request); return success(request); };
  assert.equal((await poll(f.config, f)).state, 'complete'); assert.equal(f.calls[0].reconciliation.priorAttemptId, prior.attemptId);
});
test('F2 gate-failure reconciliation requires absent native state and live predecessor identity', async t => {
  const f = fixture(t, [1, 2]), native = nativeInspectionFixture(f), original = f.invoke;
  f.invoke = async (command, request) => request.release.version === '0.7.2' && request.service.id === 'estimate' ? { ...success(request), state: 'gate-failed', mutationAttempted: true, runtimeMutationAttempted: false } : original(command, request);
  await poll(f.config, f);
  const path = join(f.config.stateDirectory, 'state.json'), before = readFileSync(path), prior = f.state().releases['2'].services.estimate;
  const options = { ...ownerResolution, fetchImpl: async () => Response.json(f.state().releases['1'].services.estimate.result.production.identity) };
  for (const nativePath of [join(native.stateDirectory, 'running.lock'), join(native.nativeState, 'operation.json')]) {
    atomicJSON(nativePath, {}); await assert.rejects(reconcile(f.config, 'ui-0.7.2', 'estimate', 'retry-after-gate-failure', options), /lock or native marker/); assert.deepEqual(readFileSync(path), before); unlinkSync(nativePath);
  }
  await assert.rejects(reconcile(f.config, 'ui-0.7.2', 'estimate', 'retry-after-gate-failure', { ...options, fetchImpl: async () => Response.json(success(prior.request).production.identity) }), /Live public identity/);
  await reconcile(f.config, 'ui-0.7.2', 'estimate', 'retry-after-gate-failure', options);
  f.invoke = async (command, request) => { if (request.service.id === 'estimate' && request.release.version === '0.7.2') assert.equal(request.reconciliation.priorAttemptId, prior.attemptId); return original(command, request); };
  assert.equal((await poll(f.config, f)).currentVersion, '0.7.2');
});
for (const [name, fields] of [
  ['pending', { state: 'activation-pending', mutationAttempted: true, runtimeMutationAttempted: false }],
  ['runtime mutation', { state: 'gate-failed', mutationAttempted: true, runtimeMutationAttempted: true }],
  ['pending rollback', { state: 'gate-failed', mutationAttempted: false, runtimeMutationAttempted: false, rollback: { state: 'activation-pending' } }],
  ['missing mutation proof', { state: 'gate-failed' }],
  ['foreign attempt', { state: 'gate-failed', mutationAttempted: false, attemptId: 'foreign' }],
]) test('F4 reconciliation refuses ' + name + ' without changing durable evidence', async t => {
  const f = fixture(t); f.invoke = async (_command, request) => ({ ...success(request), ...fields }); await poll(f.config, f);
  const path = join(f.config.stateDirectory, 'state.json'), before = readFileSync(path);
  await assert.rejects(reconcile(f.config, 'ui-0.7.1', 'naeil', 'retry-pre-mutation', ownerResolution)); assert.deepEqual(readFileSync(path), before);
});

test('F2 reconciliation refuses uncertain, runtime-mutated or conflicting Estimate ledgers', async t => {
  const f = fixture(t), native = nativeInspectionFixture(f);
  f.invoke = async (_command, request) => request.service.id === 'estimate' ? { ...success(request), state: 'gate-failed', mutationAttempted: false, runtimeMutationAttempted: false } : success(request);
  await poll(f.config, f); const prior = f.state().releases['1'].services.estimate;
  const path = join(f.config.stateDirectory, 'state.json'), before = readFileSync(path), ledger = join(native.stateDirectory, 'keys', hash(prior.request.idempotencyKey) + '.json');
  const bound = { attemptId: prior.attemptId, idempotencyKey: prior.request.idempotencyKey, state: 'gate-failed', mutationAttempted: false, runtimeMutationAttempted: false };
  for (const fields of [{ state: 'invoked' }, { runtimeMutationAttempted: true }, { attemptId: 'foreign' }, { mutationAttempted: true }]) {
    atomicJSON(ledger, { ...bound, ...fields });
    await assert.rejects(reconcile(f.config, 'ui-0.7.1', 'estimate', 'retry-pre-mutation', ownerResolution), /Estimate ledger/); assert.deepEqual(readFileSync(path), before);
  }
  atomicJSON(ledger, bound); await reconcile(f.config, 'ui-0.7.1', 'estimate', 'retry-pre-mutation', ownerResolution); assert(!f.state().blocked);
});

test('STOP intent and malformed/oversize/healthy legacy state errors remain separate without adapter or network calls', async t => {
  for (const content of ['{broken', ' '.repeat(2097153), JSON.stringify({ schemaVersion: 1, repository: 'naeil-dev/naeil-ui', releases: {} })]) {
    const f = fixture(t); let network = 0; f.github.releases = async () => { network++; return []; };
    writeFileSync(f.config.policy.stopFile, 'STOP', { mode: 0o600 });
    const path = join(f.config.stateDirectory, 'state.json'); writeFileSync(path, content, { mode: 0o600 });
    const before = readFileSync(path); await assert.rejects(poll(f.config, f), /storage/i);
    const observation = await inspect(f.config, { fetchImpl: () => { throw Error('No fetch for unreadable state'); } });
    assert.equal(observation.operatorStatus.intent, 'stopped'); assert(observation.operatorStatus.stateError);
    const status = readPrivateJSON(join(f.config.stateDirectory, 'operator-status.json'));
    assert.equal(status.intent, 'stopped'); assert.equal(status.stateError, content.length > 262144 ? 'state-too-large' : 'state-unreadable');
    assert.deepEqual(readFileSync(path), before); assert.equal(f.calls.length, 0); assert.equal(network, 0);
  }
});

test('storage failures before durable intent prevent all adapter calls', async t => {
  for (const fail of ['evidence-directory', 'root-limit', 'transport-limit']) {
    const f = fixture(t);
    if (fail === 'evidence-directory') writeFileSync(join(f.config.stateDirectory, 'evidence'), 'not a directory', { mode: 0o600 });
    if (fail === 'root-limit') assert.throws(() => writeStandingState(f.config.stateDirectory, { schemaVersion: 1, repository: f.config.repository, releases: {}, blocked: { reasonCode: 'x'.repeat(262144) } }));
    if (fail === 'transport-limit') { f.config.services.naeil.adapterOptions.padding = 'x'.repeat(2097152); }
    if (fail !== 'root-limit') await assert.rejects(poll(f.config, f));
    assert.equal(f.calls.length, 0);
  }
});

test('interrupted durable verification intent never replays verifier or any adapter', async t => {
  const f = fixture(t), original = f.invoke;
  f.invoke = async (command, request) => request.service.id === 'estimate' ? { ...success(request), state: 'deferred', mutationAttempted: false } : original(command, request);
  await poll(f.config, f);
  const saved = f.state(), prior = saved.releases['1'].services.naeil;
  prior.verificationIntent = { state: 'invoking', request: { ...prior.request, attemptId: 'interrupted-verify' } };
  writeStandingState(f.config.stateDirectory, saved);
  let verifies = 0; f.verify = async () => { verifies++; throw Error('Must not run'); };
  assert.equal((await poll(f.config, f)).reasonCode, 'interrupted-verification');
  assert.equal((await poll(f.config, f)).reasonCode, 'interrupted-verification');
  assert.equal(verifies, 0); assert.equal(f.calls.length, 1);
});

test('crash before root replacement retains bound orphan intent and blocks a later poll', async t => {
  const f = fixture(t); await poll(f.config, { ...f, github: { ...f.github, releases: async () => [] } });
  const saved = f.state(); saved.releases['1'] = { releaseId: 'ui-0.7.1', services: { naeil: { state: 'invoking', request: { attemptId: 'orphan', value: 'exact request' } } } };
  // Force evidence failure after the separately fsynced intent marker.
  const evidence = join(f.config.stateDirectory, 'evidence'); rmSync(evidence, { recursive: true }); writeFileSync(evidence, 'obstruction', { mode: 0o600 });
  assert.throws(() => writeStandingState(f.config.stateDirectory, saved), /storage/i);
  const marker = readPrivateJSON(join(f.config.stateDirectory, 'pending-intent.json'));
  assert.equal(marker.intents[0].attemptId, 'orphan'); assert.equal(marker.intents[0].requestSha256, hash(Buffer.from(JSON.stringify(saved.releases['1'].services.naeil.request, null, 2) + '\n')));
  await assert.rejects(poll(f.config, f)); assert.equal(f.calls.length, 0);
});

test('legacy active reverificationAttempt is never replayed after a restart', async t => {
  const f = fixture(t);
  writeStandingState(f.config.stateDirectory, { schemaVersion: 1, repository: f.config.repository, releases: { '1': { releaseId: 'ui-0.7.1', services: { naeil: { state: 'production-verified', reverificationAttempts: [{ state: 'invoking', request: { attemptId: 'old-pending-verify' } }] } } } } });
  let checks = 0; f.verify = async () => { checks++; };
  assert.equal((await poll(f.config, f)).reasonCode, 'interrupted-verification'); assert.equal(f.calls.length, 0); assert.equal(checks, 0);
});

test('malformed pending intent blocks all dispatch even with a readable root', async t => {
  const f = fixture(t); writeStandingState(f.config.stateDirectory, { schemaVersion: 1, repository: f.config.repository, releases: {} });
  atomicJSON(join(f.config.stateDirectory, 'pending-intent.json'), { schemaVersion: 99, ignored: true });
  await assert.rejects(poll(f.config, f), /storage/i); assert.equal(f.calls.length, 0);
});

test('schema2 completion receipt survives a crash before cursor persistence without replacing bytes or invoking services', async t => {
  const f = fixture(t); await poll(f.config, f);
  const path = join(f.config.stateDirectory, 'runs', '1', 'receipt.json'), before = readFileSync(path), receipt = readPrivateJSON(path);
  assert.equal(receipt.schemaVersion, 2); assert(receipt.evidence.path.startsWith('evidence/')); assert.equal(receipt.evidence.sha256, hash(readFileSync(join(f.config.stateDirectory, receipt.evidence.path))));
  const state = f.state(), completedAt = state.releases['1'].completedAt; state.currentVersion = null; state.lastState = 'running'; writeStandingState(f.config.stateDirectory, state);
  const result = await poll(f.config, f); assert.equal(result.currentVersion, '0.7.1'); assert.equal(f.calls.length, 3);
  assert.equal(f.state().releases['1'].completedAt, completedAt); assert.deepEqual(readFileSync(path), before);
});

test('a retained completion receipt with different binding/evidence blocks finalization without replacement or calls', async t => {
  for (const field of ['binding', 'evidence']) {
    const f = fixture(t); await poll(f.config, f);
    const path = join(f.config.stateDirectory, 'runs', '1', 'receipt.json'), receipt = readPrivateJSON(path);
    if (field === 'binding') receipt.binding = 'foreign-binding'; else receipt.evidence = { path: `evidence/${'f'.repeat(64)}.json`, sha256: 'f'.repeat(64), bytes: 10 };
    atomicJSON(path, receipt); const before = readFileSync(path);
    const state = f.state(); state.currentVersion = null; writeStandingState(f.config.stateDirectory, state);
    assert.equal((await poll(f.config, f)).state, 'blocked'); assert.equal(f.calls.length, 3); assert.deepEqual(readFileSync(path), before);
  }
});
