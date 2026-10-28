import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { isAbsolute, join, resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { acquireMachineLock, appendReceipt, atomicJSON, digest, entryExists, hash, immutableJSON, LocalRolloutError, privateDirectory, readBytes, readJSON, readReceipt } from './local-runtime.mjs';

export { LocalRolloutError };
export const planDigest = plan => digest(plan);
const IDS = ['naeil', 'estimate', 'jev'];
const HEX = /^[a-f0-9]{64}$/;
const now = () => new Date().toISOString();
const same = (a, b) => digest(a) === digest(b);
const fail = (reasonCode, fields) => { throw new LocalRolloutError(reasonCode, fields); };

export function validatePlan(plan) {
  assert(plan?.schemaVersion === 1 && plan.release && Array.isArray(plan.services) && plan.services.length > 0, 'Immutable release plan required');
  assert(/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(plan.release.releaseId) && /^0\.7\.(0|[1-9]\d*)$/.test(plan.release.version), 'Exact 0.7.x release required');
  assert(/^[a-f0-9]{40}$/.test(plan.release.sourceRevision) && HEX.test(plan.release.archive?.sha256), 'Exact release source and archive digest required');
  let previous = -1;
  for (const service of plan.services) {
    const index = IDS.indexOf(service.id);
    assert(index > previous && ['deploy', 'verify-only'].includes(service.mode), 'Unique ordered naeil/Estimate/Jev services required'); previous = index;
  }
  planDigest(plan); return plan;
}
export function approvalFor(plan) {
  assertFinalPlan(plan);
  return { schemaVersion: 1, kind: 'local-rollout-approval', planSha256: planDigest(plan), releaseId: plan.release.releaseId, archiveSha256: plan.release.archive.sha256, services: plan.services.filter(service => service.mode === 'deploy').map(service => service.id) };
}
function assertPreparedBinding(binding) {
  assert(binding && Object.keys(binding).sort().join(',') === ['candidateArtifact', 'consumerInputsSha256', 'previousArtifact'].sort().join(','), 'Final prepared artifact/input binding required');
  assertArtifact(binding.previousArtifact); assertArtifact(binding.candidateArtifact);
  assert(HEX.test(binding.previousArtifact.sha256) && HEX.test(binding.candidateArtifact.sha256) && HEX.test(binding.consumerInputsSha256), 'Exact prepared artifact and consumer input digests required');
}
export function assertFinalPlan(plan) {
  validatePlan(plan);
  for (const service of plan.services.filter(service => service.mode === 'deploy')) {
    assertPreparedBinding(service.prepared);
    assert(same(service.currentArtifact, service.prepared.previousArtifact), 'Final prepared predecessor differs from current artifact');
  }
  return plan;
}
/** Finalize a draft before any approval or execution directory is created.
 * No mutable state/rebind path can change the approved release plan. */
export function finalizePlan(plan, bindings) {
  validatePlan(plan); const result = structuredClone(plan);
  assert(bindings && typeof bindings === 'object', 'Prepared input bindings required');
  for (const service of result.services.filter(service => service.mode === 'deploy')) {
    const binding = bindings[service.id]; assertPreparedBinding(binding);
    if (service.currentArtifact) assert(same(service.currentArtifact, binding.previousArtifact), 'Prepared previous artifact changed');
    service.currentArtifact = structuredClone(binding.previousArtifact); service.prepared = structuredClone(binding);
  }
  assertFinalPlan(result); return result;
}
export function createLocalState(plan) {
  validatePlan(plan);
  return { schemaVersion: 1, kind: 'local-rollout-state', planSha256: planDigest(plan), releaseId: plan.release.releaseId, status: 'ready', failure: null, updatedAt: now(), services: Object.fromEntries(plan.services.map(service => [service.id, { status: 'not-started', stage: null, failure: null, transactionId: null }])), transactions: {} };
}
export function readLocalState(directory, plan) {
  privateDirectory(directory);
  const state = readJSON(join(directory, 'state.json'));
  assert(state.schemaVersion === 1 && state.kind === 'local-rollout-state' && HEX.test(state.planSha256) && state.services && state.transactions, 'Local state schema required');
  const stored = readJSON(join(directory, 'plan.json'));
  if (planDigest(stored) !== state.planSha256 || (plan && planDigest(plan) !== state.planSha256)) fail('plan-digest-mismatch');
  return state;
}
export function writeLocalState(directory, state) { state.updatedAt = now(); atomicJSON(join(directory, 'state.json'), state); }
function initialize(config) {
  privateDirectory(config.stateDirectory, true);
  const planPath = join(config.stateDirectory, 'plan.json');
  if (!entryExists(planPath)) immutableJSON(planPath, config.plan);
  if (!same(readJSON(planPath), config.plan)) fail('plan-digest-mismatch');
  if (!entryExists(join(config.stateDirectory, 'state.json'))) writeLocalState(config.stateDirectory, createLocalState(config.plan));
  return readLocalState(config.stateDirectory, config.plan);
}
function assertArtifact(artifact) { assert(artifact && typeof artifact.id === 'string' && artifact.id.length > 0 && artifact.id.length <= 300, 'Exact artifact identity required'); digest(artifact); return artifact; }
function validateAssets(release) {
  for (const key of ['archive', 'siteArchive', 'contract', 'account', 'expectations']) {
    const reference = release[key]; if (!reference) continue;
    if (!isAbsolute(reference.path || '') || !HEX.test(reference.sha256 || '')) fail(`${key}-reference-invalid`);
    let bytes; try { bytes = readBytes(reference.path, key.includes('Archive') || key === 'archive' ? 64 * 1024 * 1024 : 8 * 1024 * 1024); } catch { fail(`${key}-unavailable`); }
    if (hash(bytes) !== reference.sha256) fail(`${key}-digest-mismatch`);
  }
}
export function classifyFailure(error, stage) {
  if (/^[a-z][a-z0-9-]{0,99}$/.test(error?.stage || '')) stage = error.stage;
  let reasonCode = /^[a-z][a-z0-9-]{0,99}$/.test(error?.reasonCode || '') ? error.reasonCode : 'operation-failed';
  const status = Number.isInteger(error?.status) && error.status >= 100 && error.status <= 599 ? error.status : null;
  const timeout = error?.timeout === true || ['ETIMEDOUT', 'ESOCKETTIMEDOUT'].includes(error?.code);
  const auth = status === 401 || /^(?:auth-required|auth-expired|authentication-expired|session-expired)$/.test(reasonCode);
  const manual = error?.manualRecovery === true || ['session-rotation-uncertain', 'ambiguous-session-rotation', 'native-outcome-unknown'].includes(reasonCode);
  const stopped = ['stop-requested', 'approval-revoked'].includes(reasonCode);
  const transient = !auth && !manual && !stopped && error?.retryable !== false && (error?.retryable === true || timeout || [403, 408, 429].includes(status) || status >= 500 || ['ECONNRESET', 'ECONNREFUSED', 'EHOSTUNREACH', 'ENETUNREACH', 'EAI_AGAIN'].includes(error?.code));
  if (reasonCode === 'operation-failed' && transient) reasonCode = status ? `http-${status}` : timeout ? 'operation-timeout' : 'network-unavailable';
  return { category: stopped ? 'stopped' : manual ? 'manual-recovery' : auth ? 'auth-required' : transient ? 'retryable' : 'held', failure: { stage, reasonCode, status, timeout, retryable: transient } };
}
function optionsFor(options) {
  const keys = new Set(['command', 'serviceId', 'transactionId', 'retryHeld', 'recoverVerification']);
  assert(Object.keys(options).every(key => keys.has(key)), 'Unsupported command option/artifact');
  const command = options.command || 'run'; assert(['prepare', 'status', 'run', 'verify', 'rollback'].includes(command), 'Unsupported local command');
  assert(command !== 'run' || options.serviceId === undefined, 'Sequential native run cannot select one service');
  if (options.serviceId !== undefined) assert(IDS.includes(options.serviceId), 'Unknown service');
  if (options.retryHeld !== undefined) assert(typeof options.retryHeld === 'boolean', 'Explicit retry flag required');
  if (options.recoverVerification !== undefined) assert(typeof options.recoverVerification === 'boolean', 'Explicit verification recovery flag required');
  assert(!options.recoverVerification || (command === 'verify' && options.serviceId !== undefined && !options.retryHeld), 'Verification recovery requires verify with an explicit service and no retry flag');
  if (command === 'rollback') assert(typeof options.transactionId === 'string' && options.transactionId.length > 0, 'Exact transaction required for rollback');
  return { ...options, command };
}
function validatePaths(config) {
  const paths = ['stateDirectory', 'lockFile', 'stopFile', 'approvalFile'].map(key => config[key]);
  assert(paths.every(path => typeof path === 'string' && isAbsolute(path) && resolve(path) === path) && new Set(paths).size === paths.length, 'Separate canonical local paths required');
  assert(!paths.slice(1).some(path => path.startsWith(config.stateDirectory + '/')), 'Control files must live outside release state');
}
class Halt extends Error {}
function frozen(value) { const result = structuredClone(value); const freeze = item => { if (item && typeof item === 'object') { Object.values(item).forEach(freeze); Object.freeze(item); } }; freeze(result); return result; }

/** All native side effects are delegated only after the matching immutable
 * transaction and intent have been fsynced. Callbacks must return safe JSON,
 * never process/DOM/session output. A rejected native call is unknown by default. */
export async function runLocal(config, dependencies = {}, rawOptions = {}) {
  const options = optionsFor(rawOptions); validatePaths(config);
  // Status never takes the machine lock or writes; state.json is replaced atomically.
  if (options.command === 'status') return readLocalState(config.stateDirectory);
  const lease = acquireMachineLock(config.lockFile);
  let state, plan;
  try {
    if (options.command === 'rollback') {
      state = readLocalState(config.stateDirectory); plan = readJSON(join(config.stateDirectory, 'plan.json'));
    } else { plan = frozen(validatePlan(config.plan)); state = initialize({ ...config, plan }); }
    const save = () => writeLocalState(config.stateDirectory, state);
    const receipt = value => appendReceipt(config.stateDirectory, { planSha256: state.planSha256, releaseId: state.releaseId, ...value });
    const markFailure = (error, stage, service) => {
      const classified = classifyFailure(error, stage);
      state.status = classified.category; state.failure = classified.failure;
      if (service) Object.assign(state.services[service.id], { status: state.status, stage: state.failure.stage, failure: state.failure });
      state.lastReceipt = receipt({ stage, serviceId: service?.id || null, status: 'failed', failure: state.failure, category: state.status }); save(); return classified;
    };
    const boundary = stage => {
      if (options.command === 'rollback') return;
      if (entryExists(config.stopFile)) fail('stop-requested', { stage });
      if (options.command === 'run') {
        if (!entryExists(config.approvalFile)) fail('approval-revoked', { stage });
        let approval; try { approval = readJSON(config.approvalFile, 65536); } catch { fail('approval-mismatch', { stage }); }
        if (!same(approval, approvalFor(plan))) fail('approval-mismatch', { stage });
      }
    };
    const context = (service, transaction) => Object.freeze({ ...frozen({ plan, service: service || null, transaction: transaction || null, directory: config.stateDirectory }), registerChild: (child, options) => lease.registerChild(child, options) });
    const retry = config.retry || {};
    const maxAttempts = retry.maxAttempts ?? 3, baseDelayMs = retry.baseDelayMs ?? 250, maxDelayMs = retry.maxDelayMs ?? 2000;
    assert(Number.isSafeInteger(maxAttempts) && maxAttempts > 0 && maxAttempts <= 10 && Number.isSafeInteger(baseDelayMs) && baseDelayMs >= 0 && baseDelayMs <= 10000 && Number.isSafeInteger(maxDelayMs) && maxDelayMs >= 0 && maxDelayMs <= 60000, 'Bounded local retry required');
    const safeStage = async (stage, service, transaction, operation) => {
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          boundary(stage); state.stage = stage;
          if (service) state.services[service.id].stage = stage;
          const started = receipt({ stage, serviceId: service?.id || null, transactionId: transaction?.id || null, status: 'started', attempt });
          state.lastReceipt = started; save();
          const value = await operation(context(service, transaction));
          if (lease.hasRunningChildren()) fail('child-recovery-required', { manualRecovery: true });
          if (value?.passed === false || value?.ok === false) throw new LocalRolloutError(value.reasonCode || 'check-failed', value);
          state.lastReceipt = receipt({ stage, serviceId: service?.id || null, transactionId: transaction?.id || null, status: 'succeeded', attempt }); save(); return value;
        } catch (error) {
          if (lease.hasRunningChildren()) { lease.retain(); markFailure(new LocalRolloutError('child-recovery-required', { manualRecovery: true }), stage, service); throw new Halt(); }
          const result = markFailure(error, stage, service);
          if (!result.failure.retryable || attempt === maxAttempts) throw new Halt();
          await (dependencies.sleep || delay)(Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1)));
        }
      }
    };
    const required = name => { assert(typeof dependencies[name] === 'function', `Missing local dependency: ${name}`); return dependencies[name]; };
    const boundTransaction = transaction => {
      const bound = readReceipt(config.stateDirectory, transaction.binding);
      if (bound.kind !== 'transaction' || bound.transactionId !== transaction.id || bound.planSha256 !== state.planSha256 || bound.serviceId !== transaction.serviceId || !same(bound.previousArtifact, transaction.previousArtifact) || !same(bound.candidateArtifact, transaction.candidateArtifact) || !same(bound.prepared, transaction.prepared)) fail('transaction-binding-mismatch');
      return bound;
    };
    const native = async (operation, service, transaction, callbackFields = {}) => {
      boundary(operation); boundTransaction(transaction);
      const target = operation === 'deploy' ? transaction.candidateArtifact : transaction.previousArtifact;
      if (transaction.native) { transaction.nativeHistory ||= []; transaction.nativeHistory.push(structuredClone(transaction.native)); }
      transaction.native = { operation, status: 'intent', startedAt: now(), targetArtifact: target };
      transaction.native.intentReceipt = receipt({ kind: 'native-intent', stage: operation, status: 'intent', serviceId: service.id, transactionId: transaction.id, previousArtifact: transaction.previousArtifact, candidateArtifact: transaction.candidateArtifact, targetArtifact: target, transactionBinding: transaction.binding });
      state.services[service.id].status = 'running'; state.status = 'running'; save(); lease.retain();
      let result;
      try { result = await required(operation)(context(service, { ...transaction, ...callbackFields })); }
      catch (error) {
        // Only a proven pre-launch rejection can be repeated automatically.
        if (error?.outcome === 'not-started' && !lease.hasRunningChildren()) result = { outcome: 'not-started', reasonCode: error.reasonCode, stage: error.stage, status: error.status, timeout: error.timeout, retryable: error.retryable };
        else if (error?.outcome === 'failed' && error.recovered === true) result = { outcome: 'failed', recovered: true, reasonCode: error.reasonCode, stage: error.stage, status: error.status, timeout: error.timeout, retryable: error.retryable, artifact: error.artifact, receipt: error.receipt };
        else { markFailure(new LocalRolloutError('native-outcome-unknown'), operation, service); return false; }
      }
      if (lease.hasRunningChildren()) { markFailure(new LocalRolloutError('native-outcome-unknown'), operation, service); return false; }
      const recoveredArtifact = operation === 'deploy' ? transaction.previousArtifact : transaction.candidateArtifact;
      if (result?.outcome === 'failed' && result.recovered === true && result.artifact && same(result.artifact, recoveredArtifact)) {
        const proof = result.receipt;
        const expected = { schemaVersion: 1, releaseId: state.releaseId, serviceId: service.id, attemptId: transaction.id, planSha256: state.planSha256, action: operation, safe: true, passed: false, outcome: 'failed', phase: 'recovered' };
        if (proof && Object.entries(expected).every(([key, value]) => proof[key] === value)) {
          const failure = classifyFailure(new LocalRolloutError(result.reasonCode || `native-${operation}-recovered`, { stage: result.stage, status: result.status, timeout: result.timeout, retryable: result.retryable }), operation).failure;
          transaction.native.status = 'failed'; transaction.native.recovered = true; transaction.native.artifact = result.artifact;
          transaction.native.resultReceipt = receipt({ kind: 'native-result', stage: operation, status: 'recovered', serviceId: service.id, transactionId: transaction.id, artifact: result.artifact, recovery: expected, failure, intentReceipt: transaction.native.intentReceipt });
          const status = operation === 'deploy' ? 'rolled-back' : 'held';
          Object.assign(state.services[service.id], { status, stage: failure.stage, failure }); state.status = status; state.failure = failure; save(); lease.allowRelease(); return false;
        }
      }
      if (result?.outcome === 'not-started') {
        transaction.native.status = 'not-started';
        transaction.native.resultReceipt = receipt({ kind: 'native-result', stage: operation, status: 'not-started', serviceId: service.id, transactionId: transaction.id });
        markFailure(new LocalRolloutError(result.reasonCode || 'native-not-started', { stage: result.stage, status: result.status, timeout: result.timeout, retryable: result.retryable }), operation, service); lease.allowRelease(); return false;
      }
      if (result?.outcome !== 'completed' || !result.artifact || !same(result.artifact, target)) {
        markFailure(new LocalRolloutError('native-outcome-unknown'), operation, service); return false;
      }
      transaction.native.status = 'complete'; transaction.native.completedAt = now(); transaction.native.artifact = result.artifact;
      transaction.native.resultReceipt = receipt({ kind: 'native-result', stage: operation, status: 'complete', serviceId: service.id, transactionId: transaction.id, artifact: result.artifact, intentReceipt: transaction.native.intentReceipt });
      state.services[service.id].status = operation === 'deploy' ? 'deployed' : 'rolled-back'; state.services[service.id].failure = null;
      state.status = operation === 'deploy' ? 'deployed' : 'rolled-back'; state.failure = null; save(); lease.allowRelease(); return true;
    };
    if (options.command === 'rollback') {
      const transaction = state.transactions[options.transactionId];
      assert(transaction && transaction.id === options.transactionId, 'Unknown transaction');
      const service = plan.services.find(item => item.id === transaction.serviceId); assert(service?.mode === 'deploy', 'Rollback requires deployment transaction');
      let rollbackReconciliation;
      if (transaction.native?.operation === 'rollback' && transaction.native.status === 'complete') return state;
      if (transaction.native?.operation === 'deploy' && transaction.native.recovered === true) { state.services[service.id].status = 'rolled-back'; state.status = 'rolled-back'; save(); return state; }
      if (transaction.native?.status === 'intent') {
        boundTransaction(transaction);
        let observed = null, nativeInspection = null;
        for (const artifact of [transaction.previousArtifact, transaction.candidateArtifact]) {
          try {
            const result = await required('inspect')(context(service, { ...transaction, inspectionArtifact: artifact }));
            if (lease.hasRunningChildren()) break;
            if (result?.artifact && same(result.artifact, artifact)) { observed = result.artifact; nativeInspection = result.receipt || null; break; }
          } catch { if (lease.hasRunningChildren()) break; }
        }
        if (!observed || lease.hasRunningChildren()) { lease.retain(); markFailure(new LocalRolloutError('native-outcome-unknown'), 'rollback-inspect', service); return state; }
        const proof = receipt({ kind: 'rollback-reconciliation', stage: 'rollback-inspect', status: 'observed', serviceId: service.id, transactionId: transaction.id, artifact: observed, nativeInspection, intentReceipt: transaction.native.intentReceipt });
        if (same(observed, transaction.previousArtifact)) {
          if (transaction.native.operation === 'deploy') transaction.native.recovered = true;
          transaction.native.status = 'complete'; transaction.native.completedAt = now(); transaction.native.artifact = observed; transaction.native.reconciliationReceipt = proof;
          state.services[service.id].status = 'rolled-back'; state.services[service.id].failure = null; state.status = 'rolled-back'; state.failure = null; save(); return state;
        }
        transaction.native.reconciliationReceipt = proof; rollbackReconciliation = proof; save();
        // This command explicitly requests rollback. Exact candidate inspection
        // permits a new rollback intent, never a deployment invocation.
      }
      // An explicit rollback after operator lock recovery can restore a deploy
      // whose receipt was lost; it never repeats that unresolved deployment.
      const deployment = transaction.native?.operation === 'deploy' ? transaction.native : transaction.nativeHistory?.findLast(item => item.operation === 'deploy');
      assert(deployment && ['complete', 'intent'].includes(deployment.status), 'Recorded deployment intent required for rollback');
      try { await native('rollback', service, transaction, rollbackReconciliation ? { rollbackReconciliation } : {}); } catch (error) { markFailure(error, 'rollback', service); }
      return state;
    }
    const unresolved = Object.values(state.transactions).find(transaction => transaction.native?.status === 'intent');
    if (unresolved) { markFailure(new LocalRolloutError('native-outcome-unknown'), unresolved.native.operation, plan.services.find(service => service.id === unresolved.serviceId)); return state; }
    if (options.recoverVerification) {
      const record = state.services[options.serviceId], failure = record?.failure;
      const reasons = ['session-refresh-locked', 'session-refresh-uncertain', 'session-rotation-uncertain', 'ambiguous-session-rotation', 'session-persistence-uncertain', 'session-response-invalid', 'session-refresh-rejected'];
      assert(state.status === 'manual-recovery' && record?.status === 'manual-recovery' && Object.values(state.services).filter(service => service.status === 'manual-recovery').length === 1 && same(state.failure, failure), 'Verification recovery requires the sole matching manual service failure');
      assert(['verify', 'production-verify', 'session-refresh'].includes(failure.stage) && (reasons.includes(failure.reasonCode) || (failure.stage === 'session-refresh' && failure.reasonCode === 'auth-required')), 'Verification recovery requires a session/verification failure');
    } else if (state.status === 'manual-recovery') return state;
    if (['held', 'auth-required'].includes(state.status) && options.command === 'run' && !options.retryHeld) return state;
    if (options.serviceId) assert(plan.services.some(service => service.id === options.serviceId), 'Service outside release plan');
    let currentService = null;
    try {
      if (options.recoverVerification) {
        state.lastReceipt = receipt({ kind: 'verification-recovery', serviceId: options.serviceId, priorFailure: classifyFailure(state.services[options.serviceId].failure, 'verify').failure, priorReceipt: state.lastReceipt || null }); save();
      }
      await safeStage('release-integrity', null, null, async ctx => { validateAssets(plan.release); const value = await required('validateRelease')(ctx); assert(value?.passed === true, 'Release integrity result required'); return value; });
      for (const service of plan.services) {
        if (options.serviceId && options.serviceId !== service.id) continue;
        currentService = service;
        const record = state.services[service.id]; assert(record, 'Service state missing');
        if (['held', 'auth-required'].includes(record.status) && !options.retryHeld && options.command !== 'verify') {
          if (options.command === 'run') { state.status = record.status; state.failure = record.failure; save(); return state; }
          continue;
        }
        if (options.command === 'run' && record.status === 'production-verified') continue;
        let transaction = record.transactionId ? state.transactions[record.transactionId] : null;
        if (service.mode === 'deploy' && (record.status === 'rolled-back' || (transaction?.native?.operation === 'deploy' && transaction.native.recovered === true))) { markFailure(new LocalRolloutError('transaction-rolled-back'), 'prepare', service); return state; }
        if (service.mode === 'deploy' && options.command !== 'verify') {
          if (!transaction) {
            const inspected = await safeStage('inspect', service, null, required('inspect'));
            assertArtifact(inspected?.artifact);
            if (service.currentArtifact && !same(service.currentArtifact, inspected.artifact)) fail('previous-artifact-mismatch', { stage: 'inspect' });
            transaction = { id: randomUUID(), serviceId: service.id, previousArtifact: inspected.artifact, candidateArtifact: null, prepared: null, native: null, createdAt: now() };
            state.transactions[transaction.id] = transaction; record.transactionId = transaction.id; save();
          }
          if (!transaction.prepared) {
            const prepared = await safeStage('prepare', service, transaction, required('prepare'));
            assertArtifact(prepared?.candidateArtifact);
            const binding = service.prepared;
            if (!binding || !same(transaction.previousArtifact, binding.previousArtifact) || !same(prepared.candidateArtifact, binding.candidateArtifact) || prepared.consumerInputsSha256 !== binding.consumerInputsSha256) fail('prepared-input-mismatch', { stage: 'prepare' });
            transaction.prepared = prepared; transaction.candidateArtifact = prepared.candidateArtifact;
            transaction.binding = receipt({ kind: 'transaction', stage: 'prepare', status: 'prepared', transactionId: transaction.id, serviceId: service.id, previousArtifact: transaction.previousArtifact, candidateArtifact: transaction.candidateArtifact, prepared });
            record.status = 'prepared'; record.failure = null; save();
          }
          if (options.command === 'prepare') continue;
          if (transaction.native?.operation === 'rollback') fail('transaction-rolled-back', { stage: 'deploy' });
          if (transaction.native?.status !== 'complete') {
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
              const current = await safeStage('inspect', service, transaction, required('inspect'));
              if (!same(current?.artifact, transaction.previousArtifact)) fail('previous-artifact-mismatch', { stage: 'inspect' });
              if (await native('deploy', service, transaction)) break;
              // Only an explicit pre-launch proof permits a bounded forward
              // retry. Unknown outcomes and every rollback stay explicit.
              if (transaction.native?.status !== 'not-started' || state.failure?.retryable !== true || attempt === maxAttempts) return state;
              await (dependencies.sleep || delay)(Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1)));
            }
          }
        }
        if (options.command === 'prepare') continue;
        if (service.mode === 'deploy' && (transaction?.native?.operation !== 'deploy' || transaction.native.status !== 'complete')) {
          // Read-only verify reports the absent deployment without latching the release.
          if (options.command === 'verify') { receipt({ stage: 'verify', serviceId: service.id, status: 'skipped', reasonCode: 'no-deployment-to-verify' }); continue; }
          fail('deployment-not-complete', { stage: 'verify' });
        }
        const inspected = await safeStage('inspect', service, transaction, required('inspect'));
        assertArtifact(inspected?.artifact);
        const expected = service.mode === 'deploy' ? transaction.candidateArtifact : service.artifact || service.currentArtifact;
        if (expected && !same(inspected.artifact, expected)) fail('identity-mismatch', { stage: 'verify' });
        record.artifact = inspected.artifact;
        const verification = await safeStage('verify', service, transaction, async ctx => { const result = await required('verify')(ctx); assert(result?.passed === true, 'Production verification result required'); if (result.artifact && !same(result.artifact, inspected.artifact)) fail('identity-mismatch'); return result; });
        record.status = 'production-verified'; record.verifiedAt = now(); record.verification = verification; record.failure = null; save();
      }
      currentService = null;
      boundary(options.command);
      const held = Object.values(state.services).find(service => ['held', 'auth-required', 'manual-recovery'].includes(service.status));
      state.failure = held?.failure || null;
      state.status = held?.status || (Object.values(state.services).every(service => service.status === 'production-verified') ? 'production-verified' : options.command === 'prepare' ? 'prepared' : 'ready'); save();
    } catch (error) { if (!(error instanceof Halt)) markFailure(error, error.stage || state.stage || options.command, currentService); }
    return state;
  } finally { lease.release(); }
}
