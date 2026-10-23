import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync, lstatSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { acquireLock, assertActive, assertProduction, assertTrustedFiles, atomicJSON, automationDigest, fingerprint, hash, HEX, IDS, inactiveState, invokeJSON, loadConfig, privateDirectory, readPrivateJSON, validateConfig } from './standing-config.mjs';
import { publicIdentity } from './naeil-standing-observer.mjs';
import { assertPolicyRelease, GitHub, GitHubUnavailable, materializeRelease, releaseMetadata } from './standing-github.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const patch = value => Number(value.split('.')[2]);

export function assertServiceResult(result, request, options = {}) {
  for (const [key, expected] of Object.entries({ schemaVersion: 1, releaseId: request.release.releaseId, serviceId: request.service.id, idempotencyKey: request.idempotencyKey, attemptId: request.attemptId })) assert.equal(result?.[key], expected, `Adapter ${key} mismatch`);
  assert(['production-verified', 'deferred', 'gate-failed', 'activation-pending', 'not-deployed', 'review-required'].includes(result.state), 'Unknown native result state');
  if (result.state === 'deferred') assert.equal(result.mutationAttempted, false, 'Only proven pre-mutation deferral may retry');
  if (result.state !== 'production-verified') return;
  assert(result.artifact && typeof result.artifact.id === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(result.artifact.id), 'Exact app artifact required');
  if (request.service.id === 'naeil') {
    assert.equal(result.artifact.sourceRevision, request.release.siteSourceRevision, 'Site observer used package tag instead of reviewed app source');
    assert.equal(result.artifact.platform?.kind, 'vercel-git', 'Existing Git/Vercel provenance required');
    assert(typeof result.artifact.platform.deploymentId === 'string' && result.artifact.platform.deploymentId, 'Exact platform deployment required');
  } else assert.match(result.artifact.sha256, HEX, 'Native immutable artifact digest required');
  assertProduction(result.production, request, result.artifact, options);
}

const summaryState = state => ['stopped', 'authorization-expired', 'disabled'].includes(state.lastState) ? state.lastState : state.blocked ? 'blocked' : state.lastState || 'waiting-release';

function publicSummary(state) {
  return { schemaVersion: 1, scope: 'selected-services', services: IDS, allDiscoveredServicesComplete: false, observedAt: state.observedAt, currentVersion: state.currentVersion, state: summaryState(state), ...(state.since ? { since: state.since } : {}), ...(state.lastReasonCode ? { reasonCode: state.lastReasonCode } : {}), ...(state.blocked ? { blockedRelease: state.blocked.releaseId, blockedService: state.blocked.serviceId || null, reasonCode: state.blocked.reasonCode } : {}), releases: Object.values(state.releases).map(record => ({ version: record.version, releaseId: record.releaseId || null, state: record.state, services: IDS.map(id => ({ id, state: record.services?.[id]?.state || 'not-started', ...(record.services?.[id]?.result?.artifact ? { artifactId: record.services[id].result.artifact.id, sourceRevision: record.services[id].result.artifact.sourceRevision } : {}) })) })) };
}

/** One bounded poll; launchd supplies cadence. Never installs or starts a job. */
export async function poll(config, { github = new GitHub({ repository: config.repository }), invoke = invokeJSON, verify = invokeJSON } = {}) {
  validateConfig(config);
  const unlock = acquireLock(config.stateDirectory);
  const path = join(config.stateDirectory, 'state.json');
  let state;
  const save = () => atomicJSON(path, state);
  const finish = () => { state.observedAt = new Date().toISOString(); const status = summaryState(state); if (state.statusState !== status || !state.since) state.since = state.observedAt; state.statusState = status; if (status === 'complete') delete state.since; save(); const summary = publicSummary(state); atomicJSON(join(config.stateDirectory, 'summary.json'), summary); return summary; };
  try {
    state = existsSync(path) ? readPrivateJSON(path) : { schemaVersion: 1, repository: config.repository, currentVersion: null, releases: {}, createdAt: new Date().toISOString() };
    assert(state.schemaVersion === 1 && state.repository === config.repository, 'Durable state repository/schema mismatch');
    // A process can die after an app accepted work but before output/receipt.
    // That invocation is never retried just because a new poll starts.
    for (const record of Object.values(state.releases)) for (const [id, service] of Object.entries(record.services || {})) if (service.state === 'invoking') { service.state = 'uncertain'; record.state = 'uncertain'; state.blocked = { releaseId: record.releaseId, serviceId: id, reasonCode: 'interrupted-invocation' }; }
    delete state.lastReasonCode;
    const stop = record => { const status = inactiveState(config); if (!status) return false; state.lastState = status; delete state.lastReasonCode; if (record) record.state = 'stopped'; return true; };
    if (stop()) return finish();
    if (state.blocked) { state.lastState = 'blocked'; return finish(); }
    let published;
    try { published = await github.releases(); } catch { state.lastState = 'poll-unavailable'; return finish(); }
    const stable = published.filter(item => !item.draft && !item.prerelease && /^v0\.7\.(0|[1-9]\d*)$/.test(item.tag_name) && patch(item.tag_name.slice(1)) >= 1).sort((a, b) => patch(a.tag_name.slice(1)) - patch(b.tag_name.slice(1)));
    // Audit first-seen identity even for completed releases, before selecting a
    // next patch. Replacing an asset/tag cannot silently change past authority.
    for (const record of Object.values(state.releases)) {
      const item = stable.find(value => value.id === record.githubId);
      if (!item || fingerprint(releaseMetadata(item)) !== record.metadataHash || (record.tagSha && await github.tagRevision(item.tag_name) !== record.tagSha)) {
        state.blocked = { releaseId: record.releaseId || record.version, reasonCode: 'published-release-changed' }; record.state = 'blocked'; return finish();
      }
    }
    for (const item of stable) {
      const version = item.tag_name.slice(1);
      if (state.currentVersion && patch(version) <= patch(state.currentVersion)) continue;
      if (patch(version) !== (state.currentVersion ? patch(state.currentVersion) + 1 : 1)) { state.lastState = 'waiting-predecessor'; return finish(); }
      if (stop(state.releases[String(item.id)])) return finish();
      assertActive(config);
      const key = String(item.id);
      let record = state.releases[key];
      if (!record) { record = { githubId: item.id, version, metadataHash: fingerprint(releaseMetadata(item)), state: 'observed', services: {} }; state.releases[key] = record; save(); }
      try {
        const snapshot = await materializeRelease(item, config, github, record);
        const release = snapshot.release, mode = assertPolicyRelease(release, config, state.currentVersion);
        assert(!Object.values(state.releases).some(other => other !== record && (other.releaseId === release.releaseId || other.version === release.version)), 'Duplicate release/version identity');
        record.releaseId = release.releaseId; record.tagSha = snapshot.tagSha;
        const binding = fingerprint({ release, manifestHash: snapshot.manifestHash, automation: config.automation, trustedFiles: config.trustedFiles, executionPath: config.executionPath, policy: config.policy, services: config.services, mode });
        if (record.binding) assert.equal(record.binding, binding, 'Run configuration changed; reconciliation required');
        record.binding = binding; record.mode = mode; save();
        if (mode === 'standing') {
          const checks = await github.workflow(release.sourceRevision, '.github/workflows/verify.yml');
          if (['pending', 'cancelled'].includes(checks.state)) { record.state = 'waiting-package-ci'; state.lastState = record.state; state.lastReasonCode = checks.state; return finish(); }
          assert.equal(checks.state, 'success', 'Exact package source CI did not pass');
        }
        for (const id of IDS) {
          if (stop(record)) return finish();
          assertActive(config); assertTrustedFiles(config.trustedFiles);
          const prior = record.services[id];
          if (prior?.state === 'production-verified') {
            // Revalidate all cached evidence before allowing a later consumer.
            try {
              assertServiceResult(prior.result, prior.request, { allowExpired: true });
              for (const receipt of prior.reverifications || []) assertProduction(receipt.production, receipt.request, prior.result.artifact, { allowExpired: true });
              const latest = prior.reverifications?.at(-1) || { production: prior.result.production, request: prior.request };
              const expired = Date.now() - Date.parse(latest.production.checkedAt) > config.policy.maxEvidenceAgeSeconds * 1000;
              if (expired) {
                state.lastState = 'cached-evidence-expired'; state.lastReasonCode = 'cached-evidence-expired'; record.state = 'cached-evidence-expired'; finish();
                if (stop(record)) return finish();
                assertActive(config); assertTrustedFiles(config.trustedFiles);
                const attemptId = randomUUID(), artifact = prior.result.artifact;
                const outputDirectory = join(config.stateDirectory, 'runs', key, id, 'reverify-' + attemptId); privateDirectory(outputDirectory, true);
                const request = { ...prior.request, attemptId, phase: mode === 'adopt' ? 'adopt' : 'production', artifact, expectedIdentity: artifactIdentity(config.services[id], artifact), origin: config.services[id].origin, referencePath: release.contract.path, outputDirectory, options: config.services[id].verification.options || {} };
                const attempt = { state: 'invoking', request, startedAt: new Date().toISOString() };
                (prior.reverificationAttempts ||= []).push(attempt); save();
                const production = await verify(config.services[id].verification.command, request, join(outputDirectory, 'invocation'), 'verify');
                assertProduction(production, request, artifact);
                Object.assign(attempt, { state: 'production-verified', completedAt: new Date().toISOString() });
                (prior.reverifications ||= []).push({ request, production }); save();
              } else assertProduction(latest.production, latest.request, prior.result.artifact);
            } catch {
              if (stop(record)) return finish();
              record.state = 'blocked'; state.blocked = { releaseId: release.releaseId, serviceId: id, reasonCode: 'cached-evidence-reverification-failed' }; return finish();
            }
            continue;
          }
          assert(!prior || prior.state === 'deferred', 'A dispatched failed/uncertain app cannot replay');
          const attemptId = randomUUID();
          const configured = config.services[id], { command, ...service } = configured;
          const directory = join(config.stateDirectory, 'runs', key, id, attemptId); privateDirectory(directory, true);
          const request = { schemaVersion: 1, release, service, policy: config.policy, adapterOptions: service.adapterOptions || {}, trustedFiles: config.trustedFiles, executionPath: config.executionPath, idempotencyKey: `${release.releaseId}:${id}`, attemptId, mode, outputDirectory: directory, ...(prior?.reconciliation ? { reconciliation: prior.reconciliation } : {}) };
          if (prior) (record.history ||= []).push({ serviceId: id, prior: structuredClone(prior), resolution: 'retry-deferred', at: new Date().toISOString() });
          record.services[id] = { state: 'invoking', attemptId, request, startedAt: new Date().toISOString() };
          record.state = 'running'; save(); // Must precede every child launch.
          let result;
          try { result = await invoke(command, request, directory, 'rollout', { acceptNonzeroResult: true }); assertServiceResult(result, request);
            if (result.transportExitCode !== undefined) assert(Number.isInteger(result.transportExitCode) && result.transportExitCode > 0 && ['gate-failed', 'activation-pending', 'review-required', 'not-deployed'].includes(result.state), 'Nonzero exit did not prove a terminal failure'); }
          catch {
            record.services[id].state = 'uncertain'; record.state = 'uncertain';
            state.blocked = { releaseId: release.releaseId, serviceId: id, reasonCode: 'command-or-result-uncertain' }; return finish();
          }
          Object.assign(record.services[id], { state: result.state, result, completedAt: new Date().toISOString() });
          if (result.state === 'deferred') { record.state = 'deferred'; state.lastState = 'deferred'; state.lastReasonCode = result.reasonCode; return finish(); }
          if (result.state !== 'production-verified') { record.state = 'failed'; state.blocked = { releaseId: release.releaseId, serviceId: id, reasonCode: result.state }; return finish(); }
          save();
        }
        // Completion receipt precedes the global cursor. Interrupted finalizing
        // can consume existing verified receipts, without invoking an app again.
        record.state = 'complete'; record.completedAt = new Date().toISOString();
        atomicJSON(join(config.stateDirectory, 'runs', key, 'receipt.json'), { schemaVersion: 1, scope: 'selected-services', complete: true, allDiscoveredServicesComplete: false, release, binding, mode, services: record.services, completedAt: record.completedAt });
        state.currentVersion = release.version; state.lastState = 'complete'; save();
      } catch (error) {
        if (stop(record)) return finish();
        if (error instanceof GitHubUnavailable) { record.state = 'release-unavailable'; state.lastState = record.state; return finish(); }
        record.state = 'blocked'; state.blocked = { releaseId: record.releaseId || version, reasonCode: 'release-or-config-validation-failed' }; return finish();
      }
    }
    delete state.lastReasonCode;
    state.lastState = state.currentVersion ? 'complete' : 'waiting-release'; return finish();
  } finally { unlock(); }
}

const artifactIdentity = (service, artifact) => ({ schemaVersion: 1, appId: service.appId, artifactId: artifact.id, sourceRevision: artifact.sourceRevision, ui: artifact.ui });
function entryExists(path) {
  try { lstatSync(path); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}
async function liveIdentity(service, fetchImpl) {
  const value = await publicIdentity(service.origin, fetchImpl);
  const identity = { schemaVersion: value.schemaVersion, appId: value.appId, artifactId: value.artifactId, sourceRevision: value.sourceRevision, ui: { version: value.ui?.version, contractVersion: value.ui?.contractVersion } };
  assert(value.schemaVersion === 1 && value.appId === service.appId && /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(value.artifactId) && /^[a-f0-9]{40}$/.test(value.sourceRevision) && /^0\.7\.(0|[1-9]\d*)$/.test(value.ui?.version) && value.ui.contractVersion === '1', 'Invalid public identity');
  assert.deepEqual(value, identity, 'Unexpected public identity fields');
  return identity;
}
function retainedOutput(config, prior) {
  const directory = prior.request?.outputDirectory, runs = join(config.stateDirectory, 'runs') + '/';
  if (typeof directory !== 'string' || resolve(directory) !== directory || !directory.startsWith(runs)) return { exists: false, validates: false };
  const path = join(directory, 'output.json'), exists = entryExists(path);
  try { const result = readPrivateJSON(path); assertServiceResult(result, prior.request, { allowExpired: true }); return { exists, validates: true, result }; }
  catch { return { exists, validates: false }; }
}
function estimateFacts(config, prior) {
  const path = config.services.estimate.adapterOptions?.standingConfigPath;
  if (!path) return { available: false };
  try {
    const native = readPrivateJSON(path), runningLock = entryExists(join(native.stateDirectory, 'running.lock')), markerPath = join(native.activation.stateDirectory, 'operation.json'), operationMarker = entryExists(markerPath);
    let phase = null;
    if (operationMarker) {
      try { const value = readPrivateJSON(markerPath).phase; phase = ['validated', 'captured', 'stop-requested', 'stopped', 'switch-requested', 'switched', 'bootstrap-requested', 'started', 'healthy', 'completed'].includes(value) ? value : 'unrecognized'; }
      catch { phase = 'unreadable'; }
    }
    let ledger = { exists: false };
    if (typeof prior.request?.idempotencyKey === 'string') {
      const path = join(native.stateDirectory, 'keys', hash(prior.request.idempotencyKey) + '.json'); ledger = { exists: entryExists(path) };
      if (ledger.exists) {
        try { const value = readPrivateJSON(path); ledger = { exists: true, bindingMatches: value.attemptId === prior.request.attemptId && value.idempotencyKey === prior.request.idempotencyKey, state: ['invoked', 'deferred', 'gate-failed', 'activation-pending', 'production-verified', 'review-required', 'not-deployed'].includes(value.state) ? value.state : 'unrecognized', mutationAttempted: value.mutationAttempted === true ? true : value.mutationAttempted === false ? false : null, runtimeMutationAttempted: value.runtimeMutationAttempted === true ? true : value.runtimeMutationAttempted === false ? false : null }; }
        catch { ledger.state = 'unreadable'; }
      }
    }
    return { available: true, runningLock, operationMarker, phase, ledger };
  } catch { return { available: false }; }
}

/** Read-only operational evidence, with no private config or native payloads. */
export async function inspect(config, { fetchImpl = fetch } = {}) {
  validateConfig(config);
  const path = join(config.stateDirectory, 'state.json'), state = existsSync(path) ? readPrivateJSON(path) : { releases: {} };
  const live = Object.fromEntries(await Promise.all(IDS.map(async id => { try { return [id, await liveIdentity(config.services[id], fetchImpl)]; } catch { return [id, { available: false }]; } })));
  return { schemaVersion: 1, observedAt: new Date().toISOString(), blocked: state.blocked || null, releases: Object.values(state.releases).map(record => ({ releaseId: record.releaseId || null, version: record.version, state: record.state, services: IDS.map(id => {
    const prior = record.services?.[id] || {}, retained = retainedOutput(config, prior);
    const result = retained.validates ? retained.result : prior.result;
    return { id, state: prior.state || 'not-started', mutationAttempted: result?.mutationAttempted ?? null, runtimeMutationAttempted: result?.runtimeMutationAttempted ?? null, rollbackState: result?.rollback?.state || null, retainedOutput: { exists: retained.exists, validates: retained.validates }, ...(id === 'estimate' ? { native: estimateFacts(config, prior) } : {}) };
  }) })), liveIdentity: live };
}

class ReconciliationRefused extends Error {}
const requireReconciliation = (condition, reason) => { if (!condition) throw new ReconciliationRefused(reason); };
export async function reconcile(config, releaseId, serviceId, resolution, { approvedBy, reason, fetchImpl = fetch } = {}) {
  validateConfig(config);
  requireReconciliation(IDS.includes(serviceId) && ['retry-pre-mutation', 'retry-after-gate-failure'].includes(resolution), 'Unsupported service or resolution');
  requireReconciliation(typeof approvedBy === 'string' && approvedBy.trim().length > 0 && approvedBy.length <= 200 && typeof reason === 'string' && reason.trim().length > 0 && reason.length <= 2000, 'Recorded approver and reason required');
  const unlock = acquireLock(config.stateDirectory);
  try {
    const path = join(config.stateDirectory, 'state.json'), state = readPrivateJSON(path), record = Object.values(state.releases).find(record => record.releaseId === releaseId), prior = record?.services?.[serviceId];
    requireReconciliation(state.blocked?.releaseId === releaseId && state.blocked?.serviceId === serviceId && prior?.request && ['uncertain', 'gate-failed', 'review-required', 'not-deployed', 'activation-pending'].includes(prior.state), 'Resolution must name the currently blocked service invocation');
    const retained = retainedOutput(config, prior);
    let stored;
    try { assertServiceResult(prior.result, prior.request, { allowExpired: true }); stored = prior.result; } catch { /* A retained bound output may explain a transport failure. */ }
    requireReconciliation(stored || retained.validates, 'No bound result proves a safe retry');
    if (stored && retained.validates) requireReconciliation(['state', 'mutationAttempted', 'runtimeMutationAttempted'].every(key => stored[key] === retained.result[key]), 'Stored and retained outcomes conflict');
    const result = retained.validates ? retained.result : stored;
    requireReconciliation(result.state !== 'activation-pending' && result.state !== 'production-verified' && result.runtimeMutationAttempted !== true && (!result.rollback || result.rollback.state === 'production-verified'), 'Uncertain native work or rollback cannot be reconciled by this command');
    if (serviceId === 'estimate') {
      const native = estimateFacts(config, prior);
      requireReconciliation(native.available && !native.runningLock && !native.operationMarker, 'Estimate running lock or native marker is present, or private evidence is unavailable');
      requireReconciliation(!native.ledger.exists || native.ledger.bindingMatches && ['deferred', 'gate-failed', 'review-required', 'not-deployed'].includes(native.ledger.state) && native.ledger.runtimeMutationAttempted === false && native.ledger.mutationAttempted === result.mutationAttempted, 'Estimate ledger is unbound, nonterminal, runtime-mutated or conflicts with the bound result');
    }
    if (resolution === 'retry-pre-mutation') requireReconciliation(result.mutationAttempted === false, 'Bound result does not prove mutationAttempted=false');
    else {
      requireReconciliation(result.state === 'gate-failed' && result.runtimeMutationAttempted === false, 'Gate failure must prove runtimeMutationAttempted=false');
      const previous = Object.values(state.releases).filter(other => patch(other.version) < patch(record.version) && other.services?.[serviceId]?.state === 'production-verified').sort((a, b) => patch(b.version) - patch(a.version))[0]?.services[serviceId];
      requireReconciliation(previous, 'No previously verified artifact identity is recorded');
      try { assertServiceResult(previous.result, previous.request, { allowExpired: true }); assert.deepEqual(await liveIdentity(config.services[serviceId], fetchImpl), artifactIdentity(config.services[serviceId], previous.result.artifact)); }
      catch { throw new ReconciliationRefused('Live public identity differs from the previously verified artifact or is unavailable'); }
    }
    const at = new Date().toISOString();
    (record.history ||= []).push({ serviceId, prior: structuredClone(prior), result: structuredClone(result), resolution, approvedBy, reason, at });
    record.services[serviceId] = { state: 'deferred', reconciliation: { priorAttemptId: prior.request.attemptId }, reconciledAt: at };
    record.state = 'deferred'; delete state.blocked; state.lastState = 'deferred'; delete state.lastReasonCode; state.since = at; state.statusState = 'deferred'; state.observedAt = at;
    atomicJSON(path, state); const summary = publicSummary(state); atomicJSON(join(config.stateDirectory, 'summary.json'), summary); return summary;
  } finally { unlock(); }
}

export async function main(args = process.argv.slice(2)) {
  const [action, path] = args;
  if (action === 'digest') { console.log(automationDigest(path ? resolve(path) : root)); return; }
  assert(['plan', 'poll', 'inspect', 'reconcile'].includes(action) && path, 'Usage: standing-dispatcher.mjs digest [ROOT] | plan|poll|inspect CONFIG | reconcile CONFIG RELEASE_ID SERVICE_ID RESOLUTION --approved-by NAME --reason TEXT');
  const config = loadConfig(resolve(path), root);
  if (action === 'plan') { console.log(JSON.stringify({ schemaVersion: 1, enabled: config.enabled && config.policy.enabled, repository: config.repository, services: IDS, automationSha256: config.automation.sha256, baselineVersion: config.baseline.version, patchWindow: config.policy.patchWindow, scheduled: false })); return; }
  if (action === 'inspect') { console.log(JSON.stringify(await inspect(config))); return; }
  if (action === 'reconcile') {
    const [, , releaseId, serviceId, resolution, ...flags] = args;
    assert(flags.length === 4 && flags[0] === '--approved-by' && flags[2] === '--reason', 'Explicit --approved-by NAME --reason TEXT required');
    console.log(JSON.stringify(await reconcile(config, releaseId, serviceId, resolution, { approvedBy: flags[1], reason: flags[3] }))); return;
  }
  const result = await poll(config); console.log(JSON.stringify(result));
  if (result.state === 'blocked') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { console.error(error instanceof ReconciliationRefused ? 'Reconciliation refused: ' + error.message : 'Standing dispatcher stopped; inspect private configuration/state and reconcile before retry.'); process.exitCode = 1; });
