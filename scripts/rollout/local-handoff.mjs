/** One-time 0.7.2 acceptance fence. It creates only a new compatible control
 * lock and local immutable import receipt; every original legacy byte is read
 * only. The retained fence deliberately outlives success, failure and owner
 * retirement approval. No old policy, generation or approval is inherited. */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { acquireControlLock } from './rollout-io.mjs';
import { readStandingState } from './standing-state.mjs';
import { approvalFor, assertFinalPlan, planDigest } from './local-runner.mjs';
import { appendReceipt, digest, entryExists, hash, LocalRolloutError, privateDirectory, readBytes, readJSON } from './local-runtime.mjs';

const exec = promisify(execFile), HEX = /^[a-f0-9]{64}$/, active = new Set();
const fail = reason => { throw new LocalRolloutError(reason, { stage: 'legacy-handoff', retryable: false }); };
const equal = (a, b) => digest(a) === digest(b);
const canonicalPath = path => typeof path === 'string' && isAbsolute(path) && resolve(path) === path;
function checkDestination(path) {
  let ancestor = path;
  while (!entryExists(ancestor)) ancestor = dirname(ancestor);
  // Check before recursive mkdir so a symlinked ancestor cannot cause even a
  // newly created directory to appear inside the original operational tree.
  assert(realpathSync(ancestor) === ancestor, 'Separate real local import directory required');
}
function exactReference(ref) {
  assert(ref && Object.keys(ref).sort().join(',') === 'bytes,path,sha256' && canonicalPath(ref.path) && HEX.test(ref.sha256) && Number.isSafeInteger(ref.bytes) && ref.bytes > 0 && ref.bytes <= 8 * 1024 * 1024, 'Bounded immutable legacy reference required');
  return ref;
}
function checkReference(ref) {
  exactReference(ref); let bytes;
  try { bytes = readBytes(ref.path, 8 * 1024 * 1024); } catch { fail('legacy-reference-mismatch'); }
  if (bytes.length !== ref.bytes || hash(bytes) !== ref.sha256) fail('legacy-reference-mismatch');
}
function checkSTOP(handoff) {
  if (!entryExists(handoff.stop.path)) fail('legacy-stop-required'); checkReference(handoff.stop);
}
function validateHandoff(plan) {
  assertFinalPlan(plan); const handoff = plan.handoff;
  assert(plan.release.version === '0.7.2' && handoff?.schemaVersion === 1 && handoff.kind === 'local-rollout-handoff', 'Exact 0.7.2 acceptance handoff required');
  assert(canonicalPath(handoff.controlDirectory) && canonicalPath(handoff.epochDirectory) && handoff.controlDirectory !== handoff.epochDirectory, 'Separate canonical legacy control and epoch required');
  exactReference(handoff.stop);
  assert(Array.isArray(handoff.references) && handoff.references.length >= 2 && handoff.references.length <= 16, 'Stable pointer/journal/config references required');
  const paths = handoff.references.map(ref => exactReference(ref).path);
  assert(new Set(paths).size === paths.length && paths.includes(join(handoff.controlDirectory, 'active.json')) && paths.includes(join(handoff.controlDirectory, 'transition.json')), 'Exact old pointer and journal references required');
  assert(paths.every(path => !path.startsWith(handoff.epochDirectory + '/') && !/(?:^|\/)\.?env(?:\.|$)|(?:^|\/)[^/]*(?:session|token)[^/]*$/i.test(path)), 'Mutable epoch or private session inputs cannot bind handoff approval');
  assert(Array.isArray(handoff.workerDirectories) && handoff.workerDirectories.length > 0 && handoff.workerDirectories.length <= 16 && handoff.workerDirectories.every(canonicalPath), 'Exact known legacy worker directories required');
  privateDirectory(handoff.controlDirectory); privateDirectory(handoff.epochDirectory);
  return handoff;
}
function checkApproval(plan, path) {
  if (!canonicalPath(path) || !entryExists(path)) fail('handoff-approval-required');
  let approval; try { approval = readJSON(path, 65536); } catch { fail('handoff-approval-mismatch'); }
  if (!equal(approval, approvalFor(plan))) fail('handoff-approval-mismatch');
}
const isRuntime = command => /^(?:node(?:js)?|python(?:\d+(?:\.\d+)*)?|bun|tsx|pnpm)$/.test(basename(command));
const isNamedWorker = command => /(?:^|\/)(?:standing-(?:launcher|dispatcher)|(?:estimate|jev)-standing-adapter|jev-native)(?:\.(?:mjs|py))?$/.test(command);
/** Read process executable/cwd metadata only: argv and environment can contain
 * credentials and are deliberately never requested, returned or persisted. */
export async function listHandoffProcesses() {
  assert(process.platform === 'darwin', 'Local handoff process inspection targets the owner Mac');
  let processText, cwdText;
  try {
    const processes = await exec('/bin/ps', ['-axo', 'uid=,pid=,ppid=,comm='], { timeout: 10000, maxBuffer: 4 * 1024 * 1024, encoding: 'utf8' });
    const directories = await exec('/usr/sbin/lsof', ['-nP', '-a', '-d', 'cwd', '-u', String(process.getuid()), '-Fpn'], { timeout: 10000, maxBuffer: 4 * 1024 * 1024, encoding: 'utf8' });
    processText = processes.stdout; cwdText = directories.stdout;
  } catch { fail('legacy-process-inspection-unavailable'); }
  const cwd = new Map(); let pid;
  for (const line of cwdText.split('\n')) { if (/^p\d+$/.test(line)) pid = Number(line.slice(1)); else if (line.startsWith('n') && pid) cwd.set(pid, line.slice(1)); }
  const result = [];
  for (const line of processText.split('\n')) {
    const match = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.+)$/); if (!match || Number(match[1]) !== process.getuid()) continue;
    const item = { pid: Number(match[2]), parentPid: Number(match[3]), command: match[4], cwd: cwd.get(Number(match[2])) || null };
    if (item.pid !== process.pid && isRuntime(item.command) && !item.cwd) {
      try { process.kill(item.pid, 0); fail('legacy-process-inspection-incomplete'); } catch (error) { if (error.reasonCode || error.code !== 'ESRCH') throw error; }
    }
    result.push(item);
  }
  return result;
}
export function legacyWorkerPids(processes, handoff) {
  assert(Array.isArray(processes), 'Complete legacy process metadata required');
  const workers = new Set();
  for (const item of processes) {
    assert(Number.isSafeInteger(item.pid) && item.pid > 0 && Number.isSafeInteger(item.parentPid) && item.parentPid >= 0 && typeof item.command === 'string', 'Valid process metadata required');
    if (item.pid !== process.pid && (isNamedWorker(item.command) || handoff.workerDirectories.includes(item.cwd))) workers.add(item.pid);
  }
  let changed = true;
  while (changed) { changed = false; for (const item of processes) if (!workers.has(item.pid) && workers.has(item.parentPid)) { workers.add(item.pid); changed = true; } }
  return [...workers].sort((a, b) => a - b);
}
function latestArtifact(service) { const latest = service?.siteHead || service?.reverifications?.at(-1); return latest?.artifact || service?.result?.artifact; }
/** Pure semantic selection ignores stopped-poll timestamps. Existing successful
 * receipts establish prior facts only; production must be freshly verified. */
export function selectLegacy072(state, plan) {
  assertFinalPlan(plan); assert(state?.schemaVersion === 1 && state.releases && plan.release.version === '0.7.2', 'Decoded legacy 0.7.2 state required');
  const selected = Object.values(state.releases).filter(record => record.version === '0.7.2' || record.releaseId === plan.release.releaseId);
  if (selected.length !== 1 || selected[0].version !== '0.7.2' || selected[0].releaseId !== plan.release.releaseId) fail('legacy-release-mismatch');
  const record = selected[0], jev = record.services?.jev;
  if (jev && (jev.state !== 'not-started' || jev.request || jev.result || jev.verificationIntent)) fail('legacy-jev-already-started');
  if (state.storageIntents?.intents?.length) fail('legacy-pending-intent');
  const services = {};
  for (const id of ['naeil', 'estimate']) {
    const service = plan.services.find(item => item.id === id), prior = record.services?.[id];
    if (service?.mode !== 'verify-only' || prior?.state !== 'production-verified') fail('legacy-completed-service-not-verify-only');
    const artifact = latestArtifact(prior);
    if (!artifact || !equal(artifact, service.artifact || service.currentArtifact) || artifact.ui?.version !== '0.7.2') fail('legacy-artifact-mismatch');
    if (prior.request?.release && (prior.request.release.releaseId !== plan.release.releaseId || prior.request.release.archive?.sha256 !== plan.release.archive.sha256)) fail('legacy-release-mismatch');
    if (prior.verificationIntent || prior.reverificationAttempts?.at(-1)?.state === 'invoking') fail('legacy-pending-intent');
    services[id] = { mode: 'verify-only', status: 'verification-pending', artifact: structuredClone(artifact) };
  }
  const service = plan.services.find(item => item.id === 'jev'), predecessors = Object.values(state.releases).filter(item => item.version === '0.7.1' && item.services?.jev?.state === 'production-verified');
  if (service?.mode !== 'deploy' || service.currentArtifact?.ui?.version !== '0.7.1' || predecessors.length !== 1 || !equal(latestArtifact(predecessors[0].services.jev), service.currentArtifact)) fail('legacy-previous-artifact-mismatch');
  services.jev = { mode: 'deploy', status: 'not-started', currentArtifact: structuredClone(service.currentArtifact) };
  return { releaseId: plan.release.releaseId, version: '0.7.2', archiveSha256: plan.release.archive.sha256, services };
}
function ownerAlive(pid) { try { process.kill(pid, 0); return true; } catch (error) { return error.code !== 'ESRCH'; } }

/** Call only after the single owner release approval. A created fence is always
 * retained; retirement/archival is a separate explicit owner action. */
export async function withLocalHandoff(config, operation, dependencies = {}) {
  const plan = structuredClone(config.plan), handoff = validateHandoff(plan);
  const overlaps = path => config.stateDirectory === path || config.stateDirectory.startsWith(path + '/') || path.startsWith(config.stateDirectory + '/');
  assert(typeof operation === 'function' && canonicalPath(config.stateDirectory) && ![handoff.controlDirectory, handoff.epochDirectory].some(overlaps), 'Separate new local import directory required');
  assert(canonicalPath(config.stopFile) && config.stopFile !== handoff.stop.path, 'Separate new runner STOP required');
  checkDestination(config.stateDirectory);
  const boundary = () => { if (entryExists(config.stopFile)) fail('stop-requested'); checkApproval(plan, config.approvalFile); checkSTOP(handoff); handoff.references.forEach(checkReference); };
  boundary();
  const controlLock = join(handoff.controlDirectory, 'control.lock'), acquisition = { kind: 'local-rollout-handoff', planSha256: planDigest(plan), releaseId: plan.release.releaseId, archiveSha256: plan.release.archive.sha256 };
  if (active.has(controlLock)) fail('legacy-control-busy');
  const absent = async () => {
    if (entryExists(join(handoff.epochDirectory, 'dispatcher.lock'))) fail('legacy-workers-running');
    const workers = legacyWorkerPids(await (dependencies.listProcesses || listHandoffProcesses)(), handoff);
    if (workers.length) fail('legacy-workers-running');
  };
  // Reserve synchronously: a second same-process caller must not enter while
  // the first caller is awaiting the metadata-only worker scan.
  active.add(controlLock);
  try {
    await absent(); boundary();
    if (entryExists(controlLock)) {
      let lock; try { lock = readJSON(controlLock, 65536); } catch { fail('legacy-control-busy'); }
      if (!equal(lock.acquisition || null, acquisition) || !Number.isSafeInteger(lock.pid) || lock.pid <= 0 || (lock.pid !== process.pid && ownerAlive(lock.pid))) fail('legacy-control-busy');
    } else {
      // The final authority check and exclusive creation have no async gap.
      try { const lease = acquireControlLock(handoff.controlDirectory, acquisition); lease.retain(); } catch { fail('legacy-control-busy'); }
    }
    const fenceBytes = readBytes(controlLock, 65536);
    await absent(); boundary();
    if (entryExists(join(handoff.epochDirectory, 'pending-intent.json'))) fail('legacy-pending-intent');
    const sourcePath = join(handoff.epochDirectory, 'state.json'), sourceBytes = readBytes(sourcePath), sourceState = { path: sourcePath, sha256: hash(sourceBytes), bytes: sourceBytes.length };
    const legacy = (dependencies.readLegacyState || readStandingState)(handoff.epochDirectory, { allowLegacy: true });
    const selection = selectLegacy072(legacy, plan); checkReference(sourceState);
    privateDirectory(config.stateDirectory, true);
    const importReceipt = appendReceipt(config.stateDirectory, { kind: 'legacy-rollout-import', stage: 'legacy-import', status: 'selected', planSha256: planDigest(plan), sourceState, selection, controlFenceSha256: hash(fenceBytes) });
    try { return await operation({ plan, selection, importReceipt, sourceState }); }
    finally {
      checkSTOP(handoff); handoff.references.forEach(checkReference); checkReference(sourceState);
      if (entryExists(join(handoff.epochDirectory, 'pending-intent.json'))) fail('legacy-pending-intent');
      if (hash(readBytes(controlLock, 65536)) !== hash(fenceBytes)) fail('legacy-control-fence-changed');
    }
  } finally { active.delete(controlLock); }
}
