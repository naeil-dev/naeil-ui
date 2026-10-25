import { assertRouteConfig, routeKey } from './route-contract.mjs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

const execFileAsync = promisify(execFile);
const HEX = /^[0-9a-f]{64}$/;
const REVISION = /^[0-9a-f]{40}$/;
const ID = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$/;
const VERSION = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const publicAppId = service => service.identity?.appId ?? service.id;
export const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const json = path => JSON.parse(readFileSync(path, 'utf8'));
const fingerprint = value => digest(JSON.stringify(value));
// Runner-local download paths are transport details, not release identity.
const releaseIdentity = release => ({ ...release, archive: { ...release.archive, path: undefined }, contract: { ...release.contract, path: undefined } });
export const releaseFingerprint = release => fingerprint(releaseIdentity(release));
const fresh = (date, age, now = Date.now()) => Number.isFinite(Date.parse(date)) && Date.parse(date) <= now + 5000 && now - Date.parse(date) <= age * 1000;
const approval = item => item && typeof item.approvedBy === 'string' && item.approvedBy.trim() && typeof item.approvalRef === 'string' && item.approvalRef.trim() && typeof item.reason === 'string' && item.reason.trim() && Date.parse(item.expiresAt) > Date.now();

// An unexpired owner approval bound to this exact release and service. It names
// published identity fields, not runner-local paths, so every stage (including
// jev-native.py) checks the same values. Callers keep every other gate.
export const reviewedMigration = (release, service, policy) => {
  const migration = policy?.reviewedMigration;
  return Boolean(approval(migration) && migration.releaseId === release.releaseId && migration.version === release.version && migration.sourceRevision === release.sourceRevision
    && migration.archiveSha256 === release.archive?.sha256 && Array.isArray(migration.changes) && migration.changes.join() === release.changes.join() && migration.services?.includes(service.id));
};

export function validateRelease(release) {
  assert.equal(release.schemaVersion, 1, 'Unsupported release schema');
  assert.match(release.releaseId, ID, 'Invalid release id');
  assert.match(release.version, VERSION, 'Release requires an exact stable version');
  assert.match(release.previousVersion, VERSION, 'Previous version must be exact');
  assert.match(release.sourceRevision, REVISION, 'Full source revision required');
  assert.match(release.archive?.sha256, HEX, 'Frozen archive digest required');
  assert.match(release.contract?.sha256, HEX, 'Frozen reference digest required');
  assert.equal(new URL(release.archive.url).protocol, 'https:', 'Archive URL must use HTTPS');
  assert(!/(?:^|[\/@])latest(?:[/.?#]|$)/i.test(release.archive.url), 'Floating archive URL prohibited');
  assert(typeof release.contract.version === 'string' && release.contract.version, 'Contract version required');
  assert(Array.isArray(release.changes) && release.changes.every(value => ['internal', 'fix', 'docs', 'frame', 'dom', 'guard', 'contract', 'api'].includes(value)), 'Explicit classified change list required');
  return release;
}

export function validateReleaseEvent(release, event) {
  validateRelease(release);
  assert.equal(event.tag, `v${release.version}`, 'Published release tag differs from frozen UI version');
  assert.equal(event.sourceRevision, release.sourceRevision, 'Published release source differs from frozen UI source');
}

export function policyGate(release, service, policy) {
  validateRelease(release);
  const no = reason => ({ state: 'review-required', reason });
  if (policy?.schemaVersion !== 1) return no('Unknown standing policy schema');
  if (!policy?.enabled) return no('Standing rollout policy is disabled');
  if (!policy.approvedBy || !policy.approvalRef || Date.parse(policy.expiresAt) <= Date.now() || !Number.isFinite(Date.parse(policy.expiresAt))) return no('Recorded unexpired standing approval required');
  if (!policy.services?.includes(service.id)) return no('Service outside approved scope');
  if (!isAbsolute(policy.stopFile || '') || !Number.isFinite(policy.maxEvidenceAgeSeconds) || policy.maxEvidenceAgeSeconds <= 0) return no('Stop switch and evidence lifetime must be configured');
  if (reviewedMigration(release, service, policy)) return { state: 'eligible', mode: 'reviewed-migration', approvalRef: policy.reviewedMigration.approvalRef };
  const before = release.previousVersion.split('.').map(Number); const after = release.version.split('.').map(Number);
  if (before[0] !== after[0] || before[1] !== after[1] || after[2] !== before[2] + 1) return no('Only consecutive patch releases are proposed for unattended rollout; minor/major requires review');
  if (release.changes.some(change => ['frame', 'dom', 'guard', 'contract', 'api'].includes(change))) return no('Frame/DOM/guard/contract/API change requires explicit reviewed migration');
  const window = policy.patchWindow;
  if (!approval(window) || !Number.isFinite(Date.parse(window.startsAt)) || Date.parse(window.startsAt) > Date.now()) return no('Recorded active bounded patch-window approval required');
  if (!VERSION.test(window.minVersion || '') || !VERSION.test(window.maxVersion || '')) return no('Exact inclusive patch-window version bounds required');
  const low = window.minVersion.split('.').map(Number), high = window.maxVersion.split('.').map(Number);
  if (low[0] !== high[0] || low[1] !== high[1] || low[2] > high[2] || after[0] !== low[0] || after[1] !== low[1] || after[2] < low[2] || after[2] > high[2]) return no('Release outside approved same-minor patch range');
  if (window.contractVersion !== release.contract.version || !window.services?.includes(service.id)) return no('Contract/service outside approved patch window');
  return { state: 'eligible', mode: 'standing-patch-window', approvalRef: window.approvalRef };
}

export function assertReference(release, referenceBytes) {
  validateRelease(release);
  assert.equal(digest(referenceBytes), release.contract.sha256, 'Reference byte digest mismatch');
  const reference = JSON.parse(referenceBytes.toString('utf8'));
  assert.equal(reference.schemaVersion, 1, 'Reference schema mismatch');
  assert.equal(reference.kind, 'independent-release-render', 'Reference provenance kind mismatch');
  assert.equal(reference.frozen, true, 'Reference must be frozen from clean reviewed source');
  assert.equal(reference.archiveSha256, release.archive.sha256, 'Reference archive digest differs from release');
  assert.equal(reference.sourceRevision, release.sourceRevision, 'Reference source revision differs from release');
  assert.equal(reference.ui?.version, release.version, 'Reference UI version differs from release');
  assert.equal(reference.ui?.contractVersion, release.contract.version, 'Reference contractVersion differs from release');
  if (reference.contract) assert.equal(reference.contract.contractVersion, release.contract.version, 'Reference geometry contractVersion differs from release');
  return reference;
}

export function assertFrozen(release) {
  validateRelease(release);
  for (const [name, entry] of [['archive', release.archive], ['reference', release.contract]]) {
    assert(isAbsolute(entry.path || ''), `Absolute frozen ${name} path required`);
    assert.equal(digest(readFileSync(entry.path)), entry.sha256, `${name} digest mismatch`);
  }
  assertReference(release, readFileSync(release.contract.path));
}

function assertArtifact(artifact, expectedUI, requireFile = false) {
  assert(artifact && artifact.immutable === true, 'Immutable artifact required');
  assert.match(artifact.id, ID, 'Artifact id required'); assert.match(artifact.sha256, HEX, 'Artifact digest required');
  assert.match(artifact.sourceRevision, REVISION, 'Artifact source revision required');
  assert.equal(artifact.ui?.version, expectedUI.version, 'Artifact UI version mismatch');
  assert.equal(artifact.ui?.contractVersion, expectedUI.contractVersion, 'Artifact contract mismatch');
  assert(typeof artifact.storageRef === 'string' && artifact.storageRef.includes(artifact.sha256), 'Artifact storage reference must contain full immutable digest');
  if (requireFile) { assert(isAbsolute(artifact.path || ''), 'Local packaged artifact path required'); assert.equal(digest(readFileSync(artifact.path)), artifact.sha256, 'Packaged artifact digest mismatch'); }
}

function assertIdentity(actual, expected) {
  assert.deepEqual(Object.keys(actual || {}).sort(), ['appId', 'artifactId', 'schemaVersion', 'sourceRevision', 'ui'], 'Public identity contains missing or extra fields');
  assert.deepEqual(Object.keys(actual.ui || {}).sort(), ['contractVersion', 'version'], 'Public UI identity contains missing or extra fields');
  assert.equal(actual?.schemaVersion, 1, 'Identity schema mismatch');
  assert.match(actual.appId, ID, 'Production appId is invalid'); assert.match(actual.artifactId, ID, 'Production artifactId is invalid');
  assert.match(actual.sourceRevision, REVISION, 'Production sourceRevision must be a full reviewed source hash');
  assert.match(actual.ui.version, VERSION, 'Production UI version must be exact');
  assert.match(actual.ui.contractVersion, /^[1-9]\d*$/, 'Production contractVersion must be explicit');
  for (const key of ['appId', 'artifactId', 'sourceRevision']) assert.equal(actual[key], key === 'artifactId' ? expected.artifactId ?? expected.id : expected[key], `Production ${key} mismatch`);
  for (const key of ['version', 'contractVersion']) assert.equal(actual.ui?.[key], expected.ui?.[key], `Production ui.${key} mismatch`);
}

export async function verifyIdentity(origin, expected) {
  const url = new URL('/.well-known/naeil-ui.json', origin);
  assert(['https:', 'http:'].includes(url.protocol), 'HTTP origin required');
  assert(!url.username && !url.password, 'Public identity origin must not embed credentials');
  if (url.protocol === 'http:') assert(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname), 'Production identity requires HTTPS');
  const response = await fetch(url, { redirect: 'error', cache: 'no-store', signal: AbortSignal.timeout(15000), headers: { 'cache-control': 'no-cache' } });
  assert.equal(response.status, 200, 'Production identity HTTP status mismatch');
  assert.match(response.headers.get('content-type') || '', /application\/json/, 'Production identity is not JSON');
  const body = await response.text(); assert(body.length <= 4096, 'Production identity exceeds public identity size limit');
  const actual = JSON.parse(body); assertIdentity(actual, expected); return actual;
}

function assertCommands(adapter) {
  assert(isAbsolute(adapter.cwd || ''), 'Adapter cwd must be explicit and absolute');
  for (const step of ['update', 'test', 'build', 'package', 'deploy', 'activate', 'rollback']) {
    const command = adapter.commands?.[step];
    assert(command && isAbsolute(command.file || '') && Array.isArray(command.args) && command.args.every(arg => typeof arg === 'string'), `Explicit allowlisted argv required for ${step}`);
    assert(!/(?:^|\/)(?:sh|bash|zsh|fish|cmd|powershell|pwsh)(?:\.exe)?$/.test(command.file), 'Shell adapters prohibited');
    assert(Number.isFinite(command.timeoutMs ?? 120000) && (command.timeoutMs ?? 120000) > 0, 'Positive adapter timeout required');
  }
}

// Only trusted, reviewed adapter configuration selects executable/argv. Release,
// service and artifact input crosses the boundary as a JSON file, never shell code.
export async function executeAdapter(step, command, context, adapter, directory) {
  const inputPath = join(directory, `${step}.input.json`); const outputPath = join(directory, `${step}.output.json`);
  writeFileSync(inputPath, JSON.stringify(context, null, 2), { mode: 0o600 });
  if (existsSync(outputPath)) unlinkSync(outputPath);
  const { stdout, stderr } = await execFileAsync(command.file, command.args, { cwd: adapter.cwd, shell: false, timeout: command.timeoutMs ?? 120000, maxBuffer: 1024 * 1024, env: { ...process.env, NAEIL_ROLLOUT_INPUT: inputPath, NAEIL_ROLLOUT_OUTPUT: outputPath, NAEIL_ROLLOUT_STEP: step } });
  writeFileSync(join(directory, `${step}.log`), `${stdout}\n${stderr}`, { mode: 0o600 });
  assert(existsSync(outputPath), `${step} must write its structured result to NAEIL_ROLLOUT_OUTPUT`);
  const result = json(outputPath);
  assert.equal(result.releaseId, context.release.releaseId, `${step} receipt release mismatch`);
  assert.equal(result.serviceId, context.service.id, `${step} receipt service mismatch`);
  assert.equal(result.idempotencyKey, context.idempotencyKey, `${step} receipt idempotency mismatch`);
  return result;
}

async function productionCheck(context, directory) {
  assertFrozen(context.release);
  const expected = { appId: publicAppId(context.service), ...context.artifact };
  await verifyIdentity(context.service.origin, expected);
  const { verifyProduction } = await import('../verify-ui-production.mjs');
  const result = await verifyProduction({ release: context.release, origin: context.service.origin, identity: { schemaVersion: 1, appId: publicAppId(context.service), artifactId: context.artifact.id, sourceRevision: context.artifact.sourceRevision, ui: context.artifact.ui }, routes: canonicalRoutes(context.service, context.release, context.policy), referencePath: context.release.contract.path, outputDir: join(directory, 'browser') });
  assert.equal(result.referenceSha256, context.release.contract.sha256, 'Browser used a different frozen reference');
  const identity = await verifyIdentity(context.service.origin, expected);
  return { ...result, passed: true, identity, checkedAt: new Date().toISOString() };
}

const routeApproval = (route, service, release, policy) => policy?.exceptions?.find(item => item.releaseId === release.releaseId && item.serviceId === service.id && item.path === route.path && item.routeKey === routeKey(route) && approval(item));
function canonicalRoutes(service, release, policy) {
  const canonical = [];
  for (const route of service.routes || []) {
    if (routeApproval(route, service, release, policy)) continue;
    if (['canonical', 'shared'].includes(route.policy)) { assertRouteConfig(route); canonical.push(route); continue; }
    if (route.policy === 'non-ui') continue;
    assert.fail(`Unresolved route policy requires recorded approval: ${route.path} (${route.policy})`);
  }
  assert(canonical.length > 0, 'No inventoried canonical UI routes; service cannot count as production verified');
  return canonical;
}

function productionValid(production, service, artifact, age, release, policy) {
  assert(production?.passed === true && fresh(production.checkedAt, age), 'Missing or stale production verification');
  assert.equal(production.referenceSha256, release.contract.sha256, 'Production browser reference digest mismatch');
  assertIdentity(production.identity, { appId: publicAppId(service), ...artifact });
  assert(service.routes?.length > 0, 'Service route inventory is empty');
  for (const route of canonicalRoutes(service, release, policy)) {
    assert(production.routes?.some(result => result.path === route.path && result.routeKey === routeKey(route) && (result.passed === true || result.status === 'production-verified')), `Missing browser route verification: ${route.path}`);
  }
}

export async function runService({ release, service, adapter, policy, stateDir, execute, verifyProduction, verifyRollback }) {
  assertFrozen(release); assert.match(service.id, ID, 'Invalid service id');
  mkdirSync(stateDir, { recursive: true });
  const directory = join(resolve(stateDir), release.releaseId, service.id); mkdirSync(directory, { recursive: true });
  const receiptPath = join(directory, 'receipt.json'); const lockPath = join(directory, 'running.lock');
  const inputHash = fingerprint({ release: releaseIdentity(release), service, adapter: adapter ?? null, policy });
  if (existsSync(receiptPath)) {
    const prior = json(receiptPath);
    assert.equal(prior.inputHash, inputHash, 'stale receipt: release, routes, adapter or approval changed');
    assert(fresh(prior.completedAt, policy.maxEvidenceAgeSeconds), 'stale or interrupted receipt: inspect state before a separately approved retry');
    if (prior.state === 'production-verified') productionValid(prior.production, service, prior.artifact, policy.maxEvidenceAgeSeconds, release, policy);
    return prior;
  }
  const lock = openSync(lockPath, 'wx');
  const receipt = { schemaVersion: 1, releaseId: release.releaseId, releaseHash: fingerprint(releaseIdentity(release)), serviceId: service.id, serviceHash: fingerprint(service), inputHash, state: 'unresolved', startedAt: new Date().toISOString(), steps: [] };
  const save = () => { const temporary = `${receiptPath}.tmp`; writeFileSync(temporary, JSON.stringify(receipt, null, 2), { mode: 0o600 }); renameSync(temporary, receiptPath); };
  const finish = state => { receipt.state = state; receipt.completedAt = new Date().toISOString(); save(); return receipt; };
  let step;
  let context = { schemaVersion: 1, release, service, policy, adapterOptions: adapter?.options || {}, idempotencyKey: `${release.releaseId}:${service.id}`, rollbackScope: 'code-only' };
  const invoke = async name => {
    step = name;
    assert(!existsSync(policy.stopFile), 'Stop switch is active'); assertFrozen(release);
    assert.equal(policyGate(release, service, policy).state, 'eligible', 'Standing approval expired or no longer permits dependent work');
    if (context.artifact && ['deploy', 'activate'].includes(name)) assertArtifact(context.artifact, { version: release.version, contractVersion: release.contract.version }, true);
    // Persist BEFORE invoking; an interrupted mutation cannot silently replay.
    receipt.steps.push({ step: name, state: 'running', startedAt: new Date().toISOString() }); save();
    const result = await (execute ? execute(name, adapter.commands[name], context) : executeAdapter(name, adapter.commands[name], context, adapter, directory));
    Object.assign(receipt.steps.at(-1), { state: 'passed', finishedAt: new Date().toISOString(), result }); save(); return result;
  };
  try {
    const gate = policyGate(release, service, policy);
    if (gate.state !== 'eligible') { receipt.blocker = gate.reason; return finish('review-required'); }
    if (!adapter) { receipt.blocker = 'No reviewed app-owned runner adapter'; return finish(service.ui?.adoption === 'not-adopted' ? 'not-adopted' : 'unresolved'); }
    if (adapter.enabled === false) { receipt.blocker = 'App-owned adapter is prepared but not enabled/configured'; return finish('unresolved'); }
    assert(service.origin && service.routes?.length, 'Origin and nonempty route inventory required');
    assert(service.routes.every(route => typeof route.path === 'string' && route.path.startsWith('/') && !route.path.startsWith('//')), 'Valid inventoried route paths required');
    canonicalRoutes(service, release, policy);
    receipt.routePolicies = service.routes.filter(route => route.policy === 'non-ui' || routeApproval(route, service, release, policy)).map(route => ({ path: route.path, policy: route.policy, state: route.policy === 'non-ui' ? 'excluded-non-ui' : 'approved-exception', ...(route.policy === 'non-ui' ? {} : { approval: routeApproval(route, service, release, policy) }) }));
    assertCommands(adapter);
    const update = await invoke('update');
    if (update.pending === true) { receipt.pullRequest = update.pullRequest; return finish('pr-pending'); }
    assert.equal(update.uiVersion, release.version, 'Update did not adopt exact UI version'); assert.equal(update.archiveSha256, release.archive.sha256, 'Update archive digest mismatch');
    assert.equal(update.dependencyExact, true, 'Exact dependency and lockfile reconciliation required'); assert.match(update.sourceRevision, REVISION, 'Updated app revision required');
    context = { ...context, sourceRevision: update.sourceRevision };
    for (const name of ['test', 'build']) assert.equal((await invoke(name)).passed, true, `${name} did not pass`);
    const packaged = await invoke('package');
    assertArtifact(packaged.artifact, { version: release.version, contractVersion: release.contract.version }, true);
    assert.equal(packaged.artifact.sourceRevision, update.sourceRevision, 'Packaged source revision mismatch');
    assertArtifact(packaged.previousArtifact, { version: release.previousVersion, contractVersion: release.contract.version });
    assert.notEqual(packaged.previousArtifact.id, packaged.artifact.id, 'Rollback must target the previous artifact');
    assert.notEqual(packaged.previousArtifact.sha256, packaged.artifact.sha256, 'Previous artifact must have different immutable bytes');
    receipt.artifact = packaged.artifact; receipt.previousArtifact = packaged.previousArtifact;
    context = { ...context, artifact: packaged.artifact, previousArtifact: packaged.previousArtifact };
    const deployed = await invoke('deploy');
    assert(typeof deployed.deploymentId === 'string' && deployed.deploymentId, 'Platform deployment id required');
    for (const [key, value] of [['artifactId', context.artifact.id], ['artifactSha256', context.artifact.sha256]]) assert.equal(deployed[key], value, `Deployment ${key} mismatch`);
    receipt.deployment = deployed;
    const activated = await invoke('activate');
    if (activated.pending === true) return finish('activation-pending');
    assert.equal(activated.activated, true, 'Activation did not complete');
    assert.equal(activated.artifactId, context.artifact.id, 'Activation artifact mismatch'); assert.equal(activated.artifactSha256, context.artifact.sha256, 'Activation digest mismatch');
    step = 'production'; assert(!existsSync(policy.stopFile), 'Stop switch is active');
    receipt.production = await (verifyProduction ? verifyProduction(context) : productionCheck(context, directory));
    productionValid(receipt.production, service, context.artifact, policy.maxEvidenceAgeSeconds, release, policy);
    return finish('production-verified');
  } catch (error) {
    receipt.failure = { step: step || 'preflight', message: error.message, at: new Date().toISOString() };
    const running = receipt.steps.findLast(entry => entry.state === 'running'); if (running) Object.assign(running, { state: 'failed', message: error.message });
    const failureState = step === 'deploy' ? 'not-deployed' : step === 'activate' ? 'activation-pending' : 'gate-failed';
    if (['activate', 'production'].includes(step) && context.previousArtifact) {
      receipt.rollback = { state: 'approval-required', artifactId: context.previousArtifact.id, scope: 'code-only' };
      if (policy.rollbackApproved === true && policy.rollbackScope === 'code-only' && !existsSync(policy.stopFile)) {
        try {
          const restored = await invoke('rollback');
          assert.equal(restored.activated, true, 'Rollback activation incomplete');
          assert.equal(restored.artifactId, context.previousArtifact.id, 'Rollback artifact mismatch'); assert.equal(restored.artifactSha256, context.previousArtifact.sha256, 'Rollback digest mismatch');
          const identity = await (verifyRollback ? verifyRollback(context) : verifyIdentity(service.origin, { appId: publicAppId(service), ...context.previousArtifact }));
          assertIdentity(identity, { appId: publicAppId(service), ...context.previousArtifact });
          receipt.rollback = { ...receipt.rollback, state: 'previous-identity-verified', result: restored, identity, checkedAt: new Date().toISOString(), browserStatus: 'unverified' };
        } catch (rollbackError) { receipt.rollback = { ...receipt.rollback, state: 'failed', message: rollbackError.message }; }
      }
    }
    return finish(failureState);
  } finally { closeSync(lock); unlinkSync(lockPath); }
}

export function aggregate(release, registry, receipts, policy) {
  validateRelease(release);
  assert.equal(registry.schemaVersion, 1, 'Unknown inventory schema');
  const results = registry.services.map(service => {
    const exception = policy.exceptions?.find(item => item.serviceId === service.id && item.releaseId === release.releaseId && item.path === undefined && item.routeKey === undefined && item.scope === undefined && approval(item));
    if (exception) return { serviceId: service.id, state: 'approved-exception', approval: exception };
    const matches = receipts.filter(receipt => receipt.serviceId === service.id && receipt.releaseId === release.releaseId);
    if (matches.length !== 1) return { serviceId: service.id, state: service.ui?.adoption === 'not-adopted' ? 'not-adopted' : 'unresolved', reason: 'Exactly one current release receipt required' };
    const receipt = matches[0];
    try {
      assert.equal(receipt.releaseHash, fingerprint(releaseIdentity(release)), 'Release changed after receipt'); assert.equal(receipt.serviceHash, fingerprint(service), 'Service/routes changed after receipt');
      assert(fresh(receipt.completedAt, policy.maxEvidenceAgeSeconds), 'Stale receipt');
      if (receipt.state !== 'production-verified') return { serviceId: service.id, state: receipt.state, reason: receipt.failure?.message || receipt.blocker };
      assertArtifact(receipt.artifact, { version: release.version, contractVersion: release.contract.version });
      productionValid(receipt.production, service, receipt.artifact, policy.maxEvidenceAgeSeconds, release, policy);
      return { serviceId: service.id, state: 'production-verified', routes: receipt.production.routes, routePolicies: receipt.routePolicies || [] };
    } catch (error) { return { serviceId: service.id, state: 'unresolved', reason: error.message }; }
  });
  const dnsException = policy.exceptions?.find(item => item.scope === 'dns-inventory' && item.releaseId === release.releaseId && approval(item));
  const scopeComplete = registry.scope?.dnsComplete === true || !!dnsException;
  return { schemaVersion: 1, releaseId: release.releaseId, observedAt: new Date().toISOString(), complete: scopeComplete && results.length > 0 && results.every(result => ['production-verified', 'approved-exception'].includes(result.state)), dnsInventory: registry.scope?.dnsComplete === true ? 'complete' : dnsException ? 'approved-exception' : 'unresolved', ...(dnsException ? { dnsException } : {}), services: results };
}

export function loadInputs(directory) {
  const root = resolve(directory);
  const release = json(join(root, 'release.json'));
  for (const entry of [release.archive, release.contract]) if (entry?.path) entry.path = resolve(root, entry.path);
  const adapters = json(join(root, 'adapters.json'));
  const repo = resolve(fileURLToPath(new URL('../..', import.meta.url)));
  const expand = value => value === '@node' ? process.execPath : value === '@repo' ? repo : typeof value === 'string' && value.startsWith('@repo/') ? resolve(repo, value.slice(6)) : value;
  for (const adapter of Object.values(adapters.adapters)) {
    adapter.cwd = expand(adapter.cwd);
    for (const command of Object.values(adapter.commands || {})) { command.file = expand(command.file); command.args = command.args.map(expand); }
  }
  return { release, registry: json(join(root, 'services.json')), policy: json(join(root, 'policy.json')), adapters };
}

export async function main(args = process.argv.slice(2)) {
  const [action, configDirectory, stateDirectory, serviceId] = args;
  assert(['plan', 'run-service', 'aggregate'].includes(action) && configDirectory && stateDirectory, 'Usage: node scripts/rollout/rollout.mjs plan|run-service|aggregate CONFIG_DIR STATE_DIR [SERVICE_ID]');
  const { release, registry, policy, adapters } = loadInputs(configDirectory); validateRelease(release);
  assert.equal(adapters.schemaVersion, 1, 'Unknown adapters schema');
  mkdirSync(stateDirectory, { recursive: true });
  if (action === 'plan') {
    const plan = { releaseId: release.releaseId, liveActionsEnabled: policy.enabled === true, services: registry.services.map(service => ({ serviceId: service.id, adapterId: service.deployment?.adapterId ?? null, runner: adapters.adapters[service.deployment?.adapterId]?.runner ?? null, gate: policyGate(release, service, policy) })) };
    console.log(JSON.stringify(plan, null, 2)); return;
  }
  if (action === 'run-service') {
    const service = registry.services.find(item => item.id === serviceId); assert(service, 'Unknown service id');
    const receipt = await runService({ release, service, policy, adapter: adapters.adapters[service.deployment?.adapterId], stateDir: stateDirectory });
    console.log(JSON.stringify(receipt, null, 2)); if (receipt.state !== 'production-verified') process.exitCode = 1; return;
  }
  const receipts = registry.services.flatMap(service => { const path = join(stateDirectory, release.releaseId, service.id, 'receipt.json'); return existsSync(path) ? [json(path)] : []; });
  const result = aggregate(release, registry, receipts, policy); writeFileSync(join(stateDirectory, 'aggregate.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2)); if (!result.complete) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
