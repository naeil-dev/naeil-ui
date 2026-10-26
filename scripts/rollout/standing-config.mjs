import {loadReleaseExpectations, assertExpectationChrome, selectExpectationProfile} from './release-expectations.mjs';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { constants, closeSync, existsSync, fstatSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { treeDigest } from './preflight-sandbox.mjs';

export const IDS = ['naeil', 'estimate', 'jev'];
export const ORIGINS = { naeil: 'https://naeil.dev', estimate: 'https://abestimate.naeil.dev', jev: 'https://jev.naeil.dev' };
export const HEX = /^[a-f0-9]{64}$/;
export const REVISION = /^[a-f0-9]{40}$/;
export const VERSION = /^0\.7\.(0|[1-9]\d*)$/;
export const AUTOMATION_FILES = ['source-approval.mjs', 'consumer-artifact.mjs', 'consumer-preflight.mjs', 'preflight-sandbox.mjs', 'update-consumer.mjs', 'estimate-standing-adapter.mjs', 'jev-standing-adapter.mjs', 'jev-candidate.mjs', 'standing-state.mjs', 'standing-config.mjs', 'standing-github.mjs', 'standing-dispatcher.mjs', 'naeil-standing-observer.mjs', 'package-runtime.mjs', 'standing-monitor.mjs', 'rollout.mjs', 'route-contract.mjs', 'release-expectations.mjs', 'standing-verification.mjs', 'verification-session.mjs', 'expectations/0.7.1.json', 'expectations/0.7.2.json'].map(name => `scripts/rollout/${name}`).concat(['scripts/verify-ui-production.mjs','scripts/account-render.mjs']);
export const hash = value => createHash('sha256').update(value).digest('hex');
export const fingerprint = value => hash(JSON.stringify(value));
const exec = promisify(execFile);

/** Automation identity deliberately excludes config, receipts, approvals and state.
 * The active pointer separately binds the exact config and state epoch. */
export function generationDigest(identity) {
  assert.deepEqual(Object.keys(identity).sort(), ['automationSha256','executionPath','stateSchemaVersion','trustedFiles'].sort(), 'Unsupported generation identity field');
  assert(HEX.test(identity.automationSha256), 'Exact automation generation digest required');
  assert(Number.isSafeInteger(identity.stateSchemaVersion)&&identity.stateSchemaVersion>0,'Exact state schema required');
  assert(typeof identity.executionPath==='string'&&identity.executionPath.split(':').every(path=>isAbsolute(path)&&resolve(path)===path),'Exact generation execution PATH required');
  assert(identity.trustedFiles&&Object.keys(identity.trustedFiles).length>0,'Generation trusted closure required');
  const trustedFiles=Object.entries(identity.trustedFiles).sort(([a],[b])=>a.localeCompare(b));
  for(const [path,digest] of trustedFiles) assert(isAbsolute(path)&&resolve(path)===path&&HEX.test(digest),'Exact generation trusted file pin required');
  return fingerprint({schemaVersion:1,automationSha256:identity.automationSha256,trustedFiles,executionPath:identity.executionPath,stateSchemaVersion:identity.stateSchemaVersion});
}

/** One scheduler generation binds the two exact consumer execution contexts.
 * Candidate generationSha256 remains the digest of its selected context. */
export function operationalGenerationDigest(identity) {
  assert.deepEqual(Object.keys(identity).sort(), ['automationSha256','trustedFiles','executionPath','stateSchemaVersion','executionContexts'].sort(), 'Unsupported operational generation identity field');
  const { executionContexts, ...dispatcher } = identity;
  const dispatcherSha256 = generationDigest(dispatcher);
  assert.equal(identity.stateSchemaVersion, 2, 'Standing handoff requires state schema2');
  assert.deepEqual(Object.keys(executionContexts).sort(), ['estimate','jev'], 'Exact consumer execution contexts required');
  const contexts = Object.fromEntries(['estimate','jev'].map(service => {
    const context = executionContexts[service];
    assert.equal(context.automationSha256, identity.automationSha256, 'Execution context automation differs from operational generation');
    assert.equal(context.stateSchemaVersion, identity.stateSchemaVersion, 'Execution context state schema differs from operational generation');
    return [service, generationDigest(context)];
  }));
  return fingerprint({ schemaVersion: 1, kind: 'standing-operational-generation', dispatcherSha256, executionContexts: contexts });
}

/** Runtime trees belong to execution contexts, never assertTrustedFiles' regular
 * executable/helper inventory. Preserve both checks and their separate scopes. */
export function assertExecutionContext(context) {
  generationDigest(context);
  for (const [path, digest] of Object.entries(context.trustedFiles)) {
    assert.equal(realpathSync(path), path, 'Canonical execution context path required');
    const stat = lstatSync(path);
    assert(!stat.isSymbolicLink() && (stat.isFile() || stat.isDirectory()), 'Pinned execution context file/tree required');
    assert.equal(stat.isDirectory() ? treeDigest(path) : hash(readFileSync(path)), digest, 'Execution context trusted bytes changed');
  }
  return context;
}

/** Configuration records are authorization inputs, not executable generation
 * pins. The active pointer binds this manifest alongside the top-level config. */
export function assertConfigReferences(references, sha256, requiredPaths) {
  assert(Array.isArray(references) && references.length > 0, 'Exact referenced configuration inventory required');
  assert(HEX.test(sha256) && fingerprint(references) === sha256, 'Referenced configuration inventory digest mismatch');
  const paths = references.map(ref => {
    assert.deepEqual(Object.keys(ref).sort(), ['path','sha256','bytes'].sort(), 'Exact configuration reference required');
    assert(isAbsolute(ref.path) && resolve(ref.path) === ref.path && HEX.test(ref.sha256) && Number.isSafeInteger(ref.bytes) && ref.bytes > 0 && ref.bytes <= JSON_LIMITS.transport, 'Canonical bounded configuration reference required');
    return ref.path;
  });
  assert.deepEqual(paths, [...new Set(paths)].sort(), 'Sorted unique configuration references required');
  if (requiredPaths !== undefined) assert.deepEqual(paths, requiredPaths, 'Required adapter/verifier configuration inventory mismatch');
  for (const ref of references) {
    const bytes = readPrivateBytes(ref.path, JSON_LIMITS.transport);
    assert.equal(bytes.length, ref.bytes, 'Referenced configuration byte count changed');
    assert.equal(hash(bytes), ref.sha256, 'Referenced configuration bytes changed');
  }
  return references;
}

export function automationDigest(root) {
  return fingerprint(AUTOMATION_FILES.map(path => {
    const file = join(root, path), stat = lstatSync(file);
    assert(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1, 'Automation must consist of regular reviewed files');
    return { path, sha256: hash(readFileSync(file)) };
  }));
}

export function privateDirectory(path, create = false) {
  assert(isAbsolute(path) && resolve(path) === path, 'Canonical absolute private directory required');
  if (create) mkdirSync(path, { recursive: true, mode: 0o700 });
  const stat = lstatSync(path);
  assert(stat.isDirectory() && !stat.isSymbolicLink() && realpathSync(path) === path && stat.uid === process.getuid() && (stat.mode & 0o777) === 0o700, 'Owned private0700 directory required');
  return path;
}

export function readPrivateBytes(path, maxBytes = 64 * 1024 * 1024) {
  assert(isAbsolute(path) && resolve(path) === path && realpathSync(path) === path, 'Canonical absolute private file required');
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = fstatSync(fd);
    assert(stat.isFile() && stat.nlink === 1 && stat.uid === process.getuid() && (stat.mode & 0o777) === 0o600 && stat.size <= maxBytes, 'Owned bounded private0600 file required');
    const bytes = readFileSync(fd); assert(bytes.length <= maxBytes, 'Private file exceeds bound');
    return bytes;
  } finally { closeSync(fd); }
}

export function readPrivateJSON(path, maxBytes = 2 * 1024 * 1024) {
  return JSON.parse(readPrivateBytes(path, maxBytes).toString('utf8'));
}

export const JSON_LIMITS = Object.freeze({ controlIndex: 262144, evidence: 2097152, transport: 2097152, summary: 262144, monitor: 262144, operatorStatus: 262144, offlineLegacy: 16777216 });

export function serializeJSON(value, maxBytes = JSON_LIMITS.evidence) {
  assert(Number.isSafeInteger(maxBytes) && maxBytes > 0, 'Positive JSON bound required');
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  assert(bytes.length <= maxBytes, 'Serialized JSON exceeds byte limit');
  return bytes;
}

export function atomicJSON(path, value, maxBytes = JSON_LIMITS.evidence) {
  const bytes = serializeJSON(value, maxBytes);
  privateDirectory(dirname(path));
  let destinationStat; try { destinationStat = lstatSync(path); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (destinationStat) assert(destinationStat.isFile() && !destinationStat.isSymbolicLink() && destinationStat.nlink === 1 && destinationStat.uid === process.getuid() && (destinationStat.mode & 0o777) === 0o600, 'Unsafe receipt destination');
  const temporary = `${path}.${randomUUID()}.tmp`, fd = openSync(temporary, 'wx', 0o600);
  try { writeFileSync(fd, bytes); fsyncSync(fd); } catch (error) { try { unlinkSync(temporary); } catch {} throw error; } finally { closeSync(fd); }
  renameSync(temporary, path);
  const directory = openSync(dirname(path), 'r'); try { fsyncSync(directory); } finally { closeSync(directory); }
}

export function commandConfig(command) {
  assert(command && isAbsolute(command.file || '') && Array.isArray(command.args) && command.args.every(arg => typeof arg === 'string'), 'Explicit absolute executable and argv required');
  assert(!/^(sh|bash|zsh|fish|cmd|powershell|pwsh)(\.exe)?$/.test(basename(command.file)), 'Shell commands prohibited');
  if (command.cwd !== undefined) assert(isAbsolute(command.cwd), 'Absolute command cwd required');
  assert(Number.isSafeInteger(command.timeoutMs) && command.timeoutMs > 0 && command.timeoutMs <= 3 * 60 * 60 * 1000, 'Bounded command timeout required');
  return command;
}

export function assertTrustedFiles(files) {
  assert(files && !Array.isArray(files) && Object.keys(files).length > 0, 'Explicit trusted executable/helper closure required');
  for (const [path, sha256] of Object.entries(files)) {
    assert(isAbsolute(path) && realpathSync(path) === path && HEX.test(sha256), 'Canonical pinned trusted file required');
    const stat = lstatSync(path);
    // macOS sealed system command stubs are intentionally hard linked. Their
    // canonical file bytes remain pinned; private inputs/receipts stay single
    // linked so credentials and downloaded assets cannot be aliased.
    assert(stat.isFile() && !stat.isSymbolicLink(), 'Trusted code must be a regular file');
    assert.equal(hash(readFileSync(path)), sha256, 'Trusted executable/helper bytes changed');
  }
}

export async function invokeJSON(command, request, directory, kind = 'rollout', { acceptNonzeroResult = false } = {}) {
  commandConfig(command); privateDirectory(directory, true);
  const input = join(directory, 'input.json'), output = join(directory, 'output.json');
  assert(!existsSync(input) && !existsSync(output), 'Invocation files already exist; reconciliation required');
  atomicJSON(input, request);
  const env = {};
  // A fixed transport does not need the interactive shell's runtime options,
  // loader hooks, package-manager settings or arbitrary application secrets.
  const keys = ['HOME', 'USER', 'LOGNAME', 'LANG', 'LC_ALL', 'LC_CTYPE', 'TZ', 'TMPDIR', 'SYSTEMROOT', 'SSH_AUTH_SOCK', 'PLAYWRIGHT_BROWSERS_PATH'];
  // Only the website observer reads GitHub/Vercel metadata. Its verifier and
  // all native adapters/bridges receive the same credential-free transport.
  if (request.service?.id === 'naeil' && kind === 'rollout') keys.push('GH_TOKEN', 'GITHUB_TOKEN', 'NAEIL_STANDING_VERCEL_TOKEN');
  for (const key of keys) if (process.env[key] !== undefined) env[key] = process.env[key];
  env.PATH = request.executionPath || '/usr/bin:/bin:/usr/sbin:/sbin';
  Object.assign(env, kind === 'verify' ? { NAEIL_VERIFY_INPUT: input, NAEIL_VERIFY_OUTPUT: output } : { NAEIL_ROLLOUT_INPUT: input, NAEIL_ROLLOUT_OUTPUT: output, NAEIL_ROLLOUT_STEP: 'standing' });
  let exitCode;
  try {
    await exec(command.file, command.args, { cwd: command.cwd, env, shell: false, timeout: command.timeoutMs, maxBuffer: 1024 * 1024, encoding: 'utf8' });
  } catch (error) {
    if (acceptNonzeroResult && Number.isInteger(error.code) && error.code > 0 && !error.killed && !error.signal) exitCode = error.code;
    else {
      // Child output/errors can include private configuration. Never copy them to
      // an aggregate or shell error; a dispatched failure is reconciled by owner.
      throw new Error('Configured command failed or timed out; dispatched outcome requires reconciliation');
    }
  }
  const result = readPrivateJSON(output);
  if (exitCode !== undefined) {
    assert(result && typeof result === 'object' && !Array.isArray(result), 'Object result required');
    return { ...result, transportExitCode: exitCode };
  }
  return result;
}

export function routeKey(route) {
  return fingerprint({ path: route.path, expectedPath: route.expectedPath || route.path, locale: route.locale || null, state: route.state || null, renderState: route.renderState || null, chrome: route.chrome || null });
}

export function assertProduction(production, request, artifact, { allowExpired = false } = {}) {
  const expectations=loadReleaseExpectations(request.release);
  assert.equal(production?.expectationsSha256,expectations.sha256,'Production expectationsSha256 mismatch; fresh verification required');
  for(const route of request.service.routes) {assertExpectationChrome(route.chrome);selectExpectationProfile(expectations,route.chrome?.projectProfile);}
  assert(production?.schemaVersion === 1 && production.passed === true, 'Production verification did not pass');
  for (const [key, expected] of Object.entries({ releaseId: request.release.releaseId, serviceId: request.service.id, idempotencyKey: request.idempotencyKey, attemptId: request.attemptId, phase: request.mode === 'adopt' ? 'adopt' : 'production' })) assert.equal(production[key], expected, `Verification ${key} mismatch`);
  const expected = { schemaVersion: 1, appId: request.service.appId, artifactId: artifact.id, sourceRevision: artifact.sourceRevision, ui: artifact.ui };
  assert.deepEqual(production.identity, expected, 'Verified public identity mismatch');
  assert.match(artifact.sourceRevision, REVISION);
  assert.deepEqual(artifact.ui, { version: request.release.version, contractVersion: '1' });
  for (const [key, value] of Object.entries({ archiveSha256: request.release.archive.sha256, referenceSha256: request.release.contract.sha256, accountReferenceSha256: request.release.account.sha256 })) assert.equal(production[key], value, `Production ${key} mismatch`);
  const date = Date.parse(production.checkedAt), age = request.policy.maxEvidenceAgeSeconds * 1000;
  assert(Number.isFinite(date) && date <= Date.now() + 5000 && (allowExpired || Date.now() - date <= age), 'Stale production verification');
  assert(Array.isArray(production.routes), 'Route receipts required');
  for (const route of request.service.routes.filter(route => route.policy !== 'non-ui')) assert(production.routes.some(result => result.path === route.path && result.routeKey === routeKey(route) && (result.passed === true || result.status === 'production-verified')), 'Missing exact route/state verification');
}

export function inactiveState(config) {
  if (config.enabled !== true || config.policy.enabled !== true) return 'disabled';
  if (!(Date.parse(config.policy.expiresAt) > Date.now())) return 'authorization-expired';
  try { lstatSync(config.policy.stopFile); return 'stopped'; }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  return null;
}

export function assertActive(config) {
  const policy = config.policy;
  assert(config.enabled === true && policy.enabled === true, 'Standing dispatcher disabled');
  assert(typeof policy.approvedBy === 'string' && policy.approvedBy.trim() && typeof policy.approvalRef === 'string' && policy.approvalRef.trim(), 'Recorded authorization required');
  assert(Date.parse(policy.expiresAt) > Date.now(), 'Standing authorization expired');
  let stopped = false;
  try { lstatSync(policy.stopFile); stopped = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
  assert(!stopped, 'Standing STOP switch active');
}

export function validateConfig(config, { automationRoot } = {}) {
  assert.equal(config.schemaVersion, 1);
  assert.equal(config.repository, 'naeil-dev/naeil-ui', 'Only trusted UI repository supported');
  assert(Array.isArray(config.trustedPublishers) && config.trustedPublishers.length && config.trustedPublishers.every(name => /^[A-Za-z0-9[\]_-]+$/.test(name)), 'Explicit trusted release publishers required');
  assert(isAbsolute(config.automation?.root || '') && HEX.test(config.automation.sha256), 'Pinned automation root/digest required');
  if (automationRoot) assert.equal(realpathSync(config.automation.root), realpathSync(automationRoot), 'Running code differs from approved automation root');
  assert.equal(automationDigest(config.automation.root), config.automation.sha256, 'Reviewed automation bytes changed');
  privateDirectory(config.stateDirectory);
  assert(typeof config.executionPath === 'string' && config.executionPath.split(':').every(value => isAbsolute(value) && resolve(value) === value), 'Reviewed explicit execution PATH required');
  assertTrustedFiles(config.trustedFiles);
  if (config.generation !== undefined) {
    assert.equal(config.generationSha256, operationalGenerationDigest(config.generation), 'Operational generation binding mismatch');
    assert.equal(config.generation.automationSha256, config.automation.sha256, 'Operational automation identity mismatch');
    assert.equal(config.generation.executionPath, config.executionPath, 'Operational dispatcher PATH mismatch');
    assert.deepEqual(config.generation.trustedFiles, config.trustedFiles, 'Operational dispatcher trusted closure mismatch');
    assertConfigReferences(config.configReferences, config.configReferencesSha256);
    for (const ref of config.configReferences) for (const closure of [config.generation.trustedFiles, ...Object.values(config.generation.executionContexts).map(context => context.trustedFiles)]) assert(Object.keys(closure).every(path => ref.path !== path && !ref.path.startsWith(path + '/')), 'Configuration pins cannot enter executable generation closure');
    for (const context of Object.values(config.generation.executionContexts)) assertExecutionContext(context);
  } else assert(config.generationSha256 === undefined, 'Unbound operational generation digest');
  assert.deepEqual(Object.keys(config.services).sort(), [...IDS].sort(), 'Scope must be exactly naeil, estimate and jev');
  for (const id of IDS) {
    const service = config.services[id];
    assert.equal(service.id, id); assert.equal(service.origin, ORIGINS[id]);
    assert.equal(service.appId, id === 'estimate' ? 'abestimate' : id);
    commandConfig(service.command);
    assert(service.routes?.length && service.routes.some(route => route.policy !== 'non-ui'), 'Nonempty canonical route inventory required');
    for (const route of service.routes) {assert(typeof route.path === 'string' && route.path.startsWith('/') && !route.path.startsWith('//') && !/[\[\]*]/.test(route.path), 'Concrete local route specimen required');assertExpectationChrome(route.chrome);}
    commandConfig(service.verification?.command);
    for (const command of [service.command, service.verification.command]) for (const path of [command.file, ...command.args.filter(arg => isAbsolute(arg) && /\.(?:[cm]?js|[cm]?ts|py)$/.test(arg))]) assert(config.trustedFiles[path], 'Configured executable/script missing from trusted file closure');
  }
  const p = config.policy;
  assert.equal(p.schemaVersion, 1, 'Shared native policy schema1 required');
  assert.deepEqual(p.services, IDS, 'Ordered three-service policy scope required');
  assert(isAbsolute(p.stopFile || '') && Number.isSafeInteger(p.maxEvidenceAgeSeconds) && p.maxEvidenceAgeSeconds > 0 && p.maxEvidenceAgeSeconds <= 21600, 'Stop file and bounded evidence lifetime required');
  assert(p.rollbackScope === 'code-only', 'Only code-only rollback scope supported');
  assert(VERSION.test(p.patchWindow?.minVersion) && VERSION.test(p.patchWindow?.maxVersion) && Number(p.patchWindow.minVersion.split('.')[2]) <= Number(p.patchWindow.maxVersion.split('.')[2]) && p.patchWindow.contractVersion === '1', 'Bounded contract1 patch window required');
  const window = p.patchWindow;
  for (const key of ['approvedBy', 'approvalRef', 'reason']) assert(typeof window[key] === 'string' && window[key].trim(), 'Recorded native patch-window authorization required');
  assert(Number.isFinite(Date.parse(window.startsAt)) && Number.isFinite(Date.parse(window.expiresAt)) && Date.parse(window.startsAt) < Date.parse(window.expiresAt), 'Bounded native patch-window dates required');
  assert.deepEqual(window.services, IDS, 'Shared native patch-window scope required');
  const b = config.baseline;
  assert(b && b.version === '0.7.1' && typeof b.releaseId === 'string' && REVISION.test(b.sourceRevision), 'Explicit0.7.1 baseline required');
  for (const key of ['archiveSha256', 'referenceSha256', 'accountReferenceSha256']) assert.match(b[key], HEX, `Pinned baseline ${key} required`);
  return config;
}

export function loadConfig(path, automationRoot) {
  privateDirectory(dirname(resolve(path)));
  return validateConfig(readPrivateJSON(resolve(path)), { automationRoot });
}

export function acquireLock(directory) {
  const path = join(directory, 'dispatcher.lock'), fd = openSync(path, 'wx', 0o600);
  const token = randomUUID(); writeFileSync(fd, JSON.stringify({ pid: process.pid, token, startedAt: new Date().toISOString() })); fsyncSync(fd);
  return () => { try { assert.equal(readPrivateJSON(path).token, token, 'Dispatcher lock ownership changed'); unlinkSync(path); } finally { closeSync(fd); } };
}
