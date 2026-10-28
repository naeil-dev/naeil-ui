import {loadReleaseExpectations, assertExpectationChrome, selectExpectationProfile} from './release-expectations.mjs';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { constants, closeSync, existsSync, fstatSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { treeDigest } from './preflight-sandbox.mjs';
import { readStandingEvidence, readStandingState } from './standing-state.mjs';
import { assertSiteArtifact, requestSiteTarget } from './site-continuation.mjs';

export const IDS = ['naeil', 'estimate', 'jev'];
export const ORIGINS = { naeil: 'https://naeil.dev', estimate: 'https://abestimate.naeil.dev', jev: 'https://jev.naeil.dev' };
export const HEX = /^[a-f0-9]{64}$/;
export const REVISION = /^[a-f0-9]{40}$/;
export const VERSION = /^0\.7\.(0|[1-9]\d*)$/;
export const AUTOMATION_FILES = ['site-continuation.mjs', 'standing-transition.mjs', 'standing-launcher.mjs', 'source-approval.mjs', 'consumer-artifact.mjs', 'consumer-preflight.mjs', 'preflight-sandbox.mjs', 'update-consumer.mjs', 'estimate-standing-adapter.mjs', 'jev-standing-adapter.mjs', 'jev-candidate.mjs', 'standing-state.mjs', 'standing-config.mjs', 'standing-github.mjs', 'standing-dispatcher.mjs', 'naeil-standing-observer.mjs', 'package-runtime.mjs', 'standing-monitor.mjs', 'rollout.mjs', 'route-contract.mjs', 'release-expectations.mjs', 'standing-verification.mjs', 'verification-session.mjs', 'expectations/0.7.1.json', 'expectations/0.7.2.json'].map(name => `scripts/rollout/${name}`).concat(['scripts/verify-ui-production.mjs','scripts/account-render.mjs']);
export const hash = value => createHash('sha256').update(value).digest('hex');
export const fingerprint = value => hash(JSON.stringify(value));
/** Published identity is independent of the epoch that materialized assets. */
export function releaseIdentityDigest(release) {
  const identity=structuredClone(release);
  for(const key of ['archive','siteArchive','contract','account','expectations'])if(identity[key])delete identity[key].path;
  return fingerprint(identity);
}
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

export function operationalConfigurationPaths(config) {
  const paths = ['estimate','jev'].map(id => {
    const path = config.services[id].adapterOptions?.standingConfigPath;
    assert(isAbsolute(path || '') && resolve(path) === path, 'Exact native adapter configuration path required'); return path;
  });
  for (const id of IDS) {
    const args = config.services[id].verification.command.args, flags = args.flatMap((arg,index) => arg === '--config' ? [index] : []);
    assert(flags.length === 1 && isAbsolute(args[flags[0]+1] || '') && resolve(args[flags[0]+1]) === args[flags[0]+1], 'Each service needs an exact referenced verifier --config');
    paths.push(args[flags[0]+1]);
  }
  return [...new Set(paths)].sort();
}

// Per-action guards re-pin ~700 browser/runtime files; rehashing them on every
// browser action exceeded the 20-minute verification deadline. Reuse a digest
// only while dev/inode/size/mtime/ctime (ns) are unchanged: any write, rename or
// chmod moves ctime, which an unprivileged process cannot set back.
// ponytail: in-process metadata cache; full rehash if a threat model needs root-level tamper detection.
const digestCache = new Map();
export function fileDigest(path, stat = lstatSync(path, { bigint: true })) {
  const key = [stat.dev, stat.ino, stat.size, stat.mtimeNs, stat.ctimeNs].join(':'), cached = digestCache.get(path);
  if (cached?.key === key) return cached.sha256;
  const sha256 = hash(readFileSync(path)), after = lstatSync(path, { bigint: true });
  // Only cache bytes read while metadata stayed fixed.
  if ([after.dev, after.ino, after.size, after.mtimeNs, after.ctimeNs].join(':') === key) digestCache.set(path, { key, sha256 });
  return sha256;
}

export function automationDigest(root) {
  return fingerprint(AUTOMATION_FILES.map(path => {
    const file = join(root, path), stat = lstatSync(file, { bigint: true });
    assert(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1n, 'Automation must consist of regular reviewed files');
    return { path, sha256: fileDigest(file, stat) };
  }));
}

/** Entry modules supply their own import.meta.url-derived root, never a request
 * override. Checking a separate configured checkout cannot admit running code. */
export function assertExecutingAutomation(config, automationRoot) {
  assert.equal(realpathSync(automationRoot), realpathSync(config.automation.root), 'Running code differs from approved automation root');
  assert.equal(automationDigest(automationRoot), config.automation.sha256, 'Running automation bytes differ from approved generation');
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
    const stat = lstatSync(path, { bigint: true });
    // macOS sealed system command stubs are intentionally hard linked. Their
    // canonical file bytes remain pinned; private inputs/receipts stay single
    // linked so credentials and downloaded assets cannot be aliased.
    assert(stat.isFile() && !stat.isSymbolicLink(), 'Trusted code must be a regular file');
    assert.equal(fileDigest(path, stat), sha256, 'Trusted executable/helper bytes changed');
  }
}

export async function invokeJSON(command, request, directory, kind = 'rollout', { acceptNonzeroResult = false } = {}) {
  const admit = () => kind === 'verify' ? assertGenerationVerification(request) : assertGenerationExecution(request);
  admit(); commandConfig(command); privateDirectory(directory, true);
  const input = join(directory, 'input.json'), output = join(directory, 'output.json');
  assert(!existsSync(input) && !existsSync(output), 'Invocation files already exist; reconciliation required');
  assertGenerationFence(request); atomicJSON(input, request);
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
  admit();
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
  for (const [key, expected] of Object.entries({ releaseId: request.release.releaseId, serviceId: request.service.id, idempotencyKey: request.idempotencyKey, attemptId: request.attemptId, phase: request.kind === 'standing-site-read-only' ? 'site-read-only' : request.mode === 'adopt' ? 'adopt' : 'production' })) assert.equal(production[key], expected, `Verification ${key} mismatch`);
  if (request.service.id === 'naeil') {
    assertSiteArtifact(request, artifact);
    if (request.siteTarget !== undefined) assert.equal(production.siteTargetSha256, fingerprint(requestSiteTarget(request)), 'Production site target changed; fresh verification required');
  }
  const expected = { schemaVersion: 1, appId: request.service.appId, artifactId: artifact.id, sourceRevision: artifact.sourceRevision, ui: artifact.ui };
  assert.deepEqual(production.identity, expected, 'Verified public identity mismatch');
  assert.match(artifact.sourceRevision, REVISION);
  assert.deepEqual(artifact.ui, { version: request.release.version, contractVersion: '1' });
  for (const [key, value] of Object.entries({ archiveSha256: request.release.archive.sha256, referenceSha256: request.release.contract.sha256, accountReferenceSha256: request.release.account.sha256 })) assert.equal(production[key], value, `Production ${key} mismatch`);
  const date = Date.parse(production.checkedAt), age = (request.kind === 'standing-site-read-only' ? request.maxEvidenceAgeSeconds : request.policy.maxEvidenceAgeSeconds) * 1000;
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

function assertStandingPolicyActive(config) {
  const policy = config.policy;
  assert(config.enabled === true && policy.enabled === true, 'Standing dispatcher disabled');
  assert(typeof policy.approvedBy === 'string' && policy.approvedBy.trim() && typeof policy.approvalRef === 'string' && policy.approvalRef.trim(), 'Recorded authorization required');
  assert(Date.parse(policy.expiresAt) > Date.now(), 'Standing authorization expired');
  let stopped = false;
  try { lstatSync(policy.stopFile); stopped = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
  assert(!stopped, 'Standing STOP switch active');
}

export function assertActive(config) {
  assertGenerationExecution(config);
  assertStandingPolicyActive(config);
}

export function validateConfig(config, { automationRoot } = {}) {
  assert.equal(config.schemaVersion, 1);
  assert.equal(config.repository, 'naeil-dev/naeil-ui', 'Only trusted UI repository supported');
  assert(Array.isArray(config.trustedPublishers) && config.trustedPublishers.length && config.trustedPublishers.every(name => /^[A-Za-z0-9[\]_-]+$/.test(name)), 'Explicit trusted release publishers required');
  assert(isAbsolute(config.automation?.root || '') && HEX.test(config.automation.sha256), 'Pinned automation root/digest required');
  if (automationRoot) assertExecutingAutomation(config, automationRoot);
  assert.equal(automationDigest(config.automation.root), config.automation.sha256, 'Reviewed automation bytes changed');
  privateDirectory(config.stateDirectory);
  assert(typeof config.executionPath === 'string' && config.executionPath.split(':').every(value => isAbsolute(value) && resolve(value) === value), 'Reviewed explicit execution PATH required');
  assertTrustedFiles(config.trustedFiles);
  if (config.generation !== undefined) {
    assert.equal(config.generationSha256, operationalGenerationDigest(config.generation), 'Operational generation binding mismatch');
    assert.equal(config.generation.automationSha256, config.automation.sha256, 'Operational automation identity mismatch');
    assert.equal(config.generation.executionPath, config.executionPath, 'Operational dispatcher PATH mismatch');
    assert.deepEqual(config.generation.trustedFiles, config.trustedFiles, 'Operational dispatcher trusted closure mismatch');
    assertConfigReferences(config.configReferences, config.configReferencesSha256, config.generationControl ? operationalConfigurationPaths(config) : undefined);
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

const exactFields = (value, keys, reason) => assert(value && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(','), reason);
export const pathExists = path => { try { lstatSync(path); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } };
export function syncDirectory(directory) {
  const fd = openSync(directory, 'r'); try { fsyncSync(fd); } finally { closeSync(fd); }
}
export function fileReference(path, maxBytes = JSON_LIMITS.transport) {
  const bytes = readPrivateBytes(path, maxBytes); return { path, sha256: hash(bytes), bytes: bytes.length };
}
export function readExactReference(ref, maxBytes = JSON_LIMITS.transport) {
  exactFields(ref, ['path','sha256','bytes'], 'Exact immutable reference required');
  assert(HEX.test(ref.sha256) && Number.isSafeInteger(ref.bytes) && ref.bytes > 0 && ref.bytes <= maxBytes, 'Bounded immutable reference required');
  const bytes = readPrivateBytes(ref.path, maxBytes);
  assert.equal(bytes.length, ref.bytes, 'Referenced byte count changed'); assert.equal(hash(bytes), ref.sha256, 'Referenced bytes changed'); return bytes;
}

/** One shared lease, outside all state epochs. Never steals/removes stale locks. */
export function acquireControlLock(directory, acquisition) {
  privateDirectory(directory);
  assert(!pathExists(join(directory,'control-archive.lock')), 'Explicit lock archival is in progress or incomplete');
  const path = join(directory, 'control.lock'), token = randomUUID();
  // The acquisition is part of the first durable write, not a later admission
  // phase. A crash before the first journal must still have an exact purpose.
  const bytes = serializeJSON({ schemaVersion: 1, token, pid: process.pid, startedAt: new Date().toISOString(), ...(acquisition ? { acquisition } : {}) }, JSON_LIMITS.controlIndex);
  const fd = openSync(path, 'wx', 0o600);
  try {
    writeFileSync(fd, bytes); fsyncSync(fd); syncDirectory(directory);
    if(acquisition?.kind==='standing-active-generation-acquisition') {
      readExactReference(acquisition.pointer,JSON_LIMITS.controlIndex);readExactReference(acquisition.journal,JSON_LIMITS.controlIndex);
    }
  }
  catch (error) { closeSync(fd); throw error; }
  if(pathExists(join(directory,'control-archive.lock'))) {
    try { assert.equal(readPrivateJSON(path).token,token); unlinkSync(path);syncDirectory(directory); } finally { closeSync(fd); }
    throw Error('Explicit lock archival is in progress or incomplete');
  }
  const release = () => { assert.equal(readPrivateJSON(path, JSON_LIMITS.controlIndex).token, token, 'Control lock ownership changed'); unlinkSync(path); syncDirectory(directory); closeSync(fd); };
  // Fail-closed transition authority loss retains ownership bytes for explicit
  // archival, while closing this process's descriptor without stealing a lock.
  return { token, release, retain: () => closeSync(fd) };
}

export function activeControlAcquisition(directory) {
  return { kind: 'standing-active-generation-acquisition', pointer: fileReference(join(directory, 'active.json'), JSON_LIMITS.controlIndex), journal: fileReference(join(directory, 'transition.json'), JSON_LIMITS.controlIndex) };
}

/** Historical chains validate retained bytes, without re-executing old code or
 * requiring historical approvals to remain within their execution window. */
export function readGenerationTransition(controlDirectory, pointer, journal, seen = new Set()) {
  assert(!seen.has(pointer.transitionPlanSha256) && seen.size < 64, 'Cyclic or overlong generation predecessor chain');
  seen.add(pointer.transitionPlanSha256);
  exactFields(journal,['schemaVersion','planSha256','approvalSha256','plan','approval','oldPointer','newPointer','phase','imported','validatedState','proof'],'Unsupported transition journal');
  assert.equal(journal.schemaVersion,1,'Unsupported transition journal schema');
  assert.equal(journal.phase,'completed','Incomplete transition prohibits polling');
  assert.equal(journal.planSha256,pointer.transitionPlanSha256,'Active pointer/transition journal disagree');
  assert.deepEqual(journal.newPointer,pointer,'Active pointer/transition journal disagree');
  const plan=JSON.parse(readExactReference(journal.plan,JSON_LIMITS.controlIndex)), approval=JSON.parse(readExactReference(journal.approval,JSON_LIMITS.controlIndex));
  const {planSha256,...body}=plan, rebind=plan.kind==='standing-generation-rebind';
  assert((rebind||plan.kind==='standing-0.7.2-continuation')&&plan.release.version==='0.7.2','Only exact continuation or generation rebind may run');
  assert.equal(planSha256,fingerprint(body),'Retained transition plan digest changed');
  assert.equal(planSha256,pointer.transitionPlanSha256,'Retained transition plan differs from active pointer');
  assert.equal(fingerprint(approval),pointer.authorizationSha256,'Active continuation approval changed');
  assert.equal(journal.approvalSha256,pointer.authorizationSha256,'Active continuation approval/journal mismatch');
  assert(approval.schemaVersion===1&&approval.revoked===false&&approval.approvedBy?.trim()&&approval.approvalRef?.trim(),'Recorded unrevoked generation approval required');
  assert.equal(approval.planSha256,planSha256);assert.equal(approval.generationSha256,pointer.generationSha256);
  assert.equal(approval.releaseSha256,releaseIdentityDigest(plan.release));
  assert.deepEqual(plan.next,{generationId:pointer.generationId,generationSha256:pointer.generationSha256,config:pointer.config,configReferencesSha256:pointer.configReferencesSha256,stateDirectory:pointer.stateDirectory,epochId:pointer.epochId},'Active pointer differs from exact approved plan');
  if(rebind) {
    assert.equal(approval.kind,'standing-generation-rebind-approval','Exact rebind approval required');
    assert.deepEqual(journal.oldPointer,plan.oldPointer,'Rebind journal predecessor pointer changed');
    const previous=readRebindPredecessor(plan,true,seen);
    assert.equal(approval.previousPointerSha256,plan.predecessor.pointer.sha256,'Rebind predecessor pointer digest changed');
    assert.equal(releaseIdentityDigest(previous.plan.release),releaseIdentityDigest(plan.release),'Rebind published release changed');
  } else {
    assert(approval.kind==='standing-continuation-approval'&&approval.action==='continue-0.7.2-after-source-gate-failure','Recorded continuation approval required');
    assert.equal(approval.previousApprovalSha256,plan.previousApprovalSha256);assert.equal(approval.successorOf,plan.previousApprovalSha256);assert.equal(approval.priorAttemptId,plan.estimate.priorAttemptId);assert.equal(approval.attemptId,plan.estimate.newAttemptId);
  }
  return {plan,approval};
}

/** After journal replacement the pointer/journal use byte-exact retained copies.
 * Chain validation still reads original predecessor plan/approval paths and
 * generation config files; keep those transition directories/files in place. */
export function readRebindPredecessor(plan, retained = false, seen = new Set()) {
  exactFields(plan.predecessor,['pointer','journal','plan','approval'],'Exact predecessor references required');
  const directory=join(plan.controlDirectory,'transitions',plan.planSha256);
  const bytes=Object.fromEntries(Object.entries(plan.predecessor).map(([name,ref])=>[name,readExactReference(retained?{...ref,path:join(directory,'predecessor-'+name+'.json')}:ref,JSON_LIMITS.controlIndex)]));
  const pointer=JSON.parse(bytes.pointer),journal=JSON.parse(bytes.journal);
  assert.deepEqual(pointer,plan.oldPointer,'Predecessor pointer changed');
  assert.deepEqual(journal.plan,plan.predecessor.plan,'Predecessor journal/plan reference changed');
  assert.deepEqual(journal.approval,plan.predecessor.approval,'Predecessor journal/approval reference changed');
  const previous=readGenerationTransition(plan.controlDirectory,pointer,journal,seen);
  assert.deepEqual(JSON.parse(bytes.plan),previous.plan,'Retained predecessor plan changed');
  assert.deepEqual(JSON.parse(bytes.approval),previous.approval,'Retained predecessor approval changed');
  assert.deepEqual({generationId:plan.old.generationId,automationSha256:plan.old.automationSha256,config:plan.old.config,stateDirectory:plan.old.stateDirectory},{generationId:pointer.generationId,automationSha256:JSON.parse(readExactReference(pointer.config)).automation.sha256,config:pointer.config,stateDirectory:pointer.stateDirectory},'Rebind old generation differs from predecessor');
  assert.equal(plan.old.evidenceRoot,pointer.stateDirectory,'Rebind evidence root differs from predecessor epoch');
  assert.equal(releaseIdentityDigest(previous.plan.release),releaseIdentityDigest(plan.release),'Rebind published release changed');
  return {...previous,pointer,journal};
}

/** The pointer is authority for exact config bytes; request manifests alone are not. */
export function readActiveGeneration(controlDirectory) {
  privateDirectory(controlDirectory);
  const pointerPath = join(controlDirectory, 'active.json'), pointerBytes = readPrivateBytes(pointerPath, JSON_LIMITS.controlIndex), pointer = JSON.parse(pointerBytes);
  exactFields(pointer, ['schemaVersion','generationId','generationSha256','config','configReferencesSha256','stateDirectory','epochId','authorizationSha256','transitionPlanSha256'], 'Unsupported active generation pointer');
  assert(pointer.schemaVersion === 1 && /^[A-Za-z0-9_-]{1,100}$/.test(pointer.generationId) && /^[A-Za-z0-9_-]{1,100}$/.test(pointer.epochId), 'Invalid active generation/epoch');
  for (const key of ['generationSha256','configReferencesSha256','authorizationSha256','transitionPlanSha256']) assert(HEX.test(pointer[key]), 'Exact active pointer identity required');
  const journalPath = join(controlDirectory, 'transition.json');
  assert(pathExists(journalPath), 'Completed approved transition journal required');
  const journal = readPrivateJSON(journalPath, JSON_LIMITS.controlIndex);
  const {plan,approval}=readGenerationTransition(controlDirectory,pointer,journal);
  const config = JSON.parse(readExactReference(pointer.config));
  assert.equal(config.generationSha256, pointer.generationSha256, 'Active generation/config mismatch');
  assert.equal(config.stateDirectory, pointer.stateDirectory, 'Active state root mismatch');
  assert.equal(config.configReferencesSha256, pointer.configReferencesSha256, 'Active configuration manifest mismatch');
  assert.deepEqual(config.generationControl, { controlDirectory, generationId: pointer.generationId, epochId: pointer.epochId }, 'Active generation control binding mismatch');
  assertConfigReferences(config.configReferences, pointer.configReferencesSha256);
  privateDirectory(pointer.stateDirectory);
  const state = readPrivateJSON(join(pointer.stateDirectory, 'state.json'), JSON_LIMITS.controlIndex);
  assert(state.schemaVersion === 2 && state.epochId === pointer.epochId, 'Active state epoch mismatch');
  assert(!pathExists(join(pointer.stateDirectory, 'import-incomplete.json')), 'Incomplete import prohibits polling');
  if(config.automation)assert.equal(automationDigest(config.automation.root),config.automation.sha256,'Active automation bytes changed');
  if(config.trustedFiles)assertTrustedFiles(config.trustedFiles);
  return { pointer, pointerSha256: hash(pointerBytes), config, approval, plan };
}

/** Call before each applicable write/dispatch, including native failure paths.
 * STOP is intentionally separate: an already dispatched child may finish its
 * bounded native transaction, but can never change generation/config authority. */
export function assertGenerationFence(value, adapterConfig) {
  if (value.generationSha256 === undefined && value.generationFence === undefined && value.generationControl === undefined) return null;
  const fence = value.generationFence;
  exactFields(fence, ['controlDirectory','pointerSha256'], 'Current generation fence required');
  const active = readActiveGeneration(fence.controlDirectory);
  assert.equal(active.pointerSha256, fence.pointerSha256, 'Worker active pointer changed');
  assert.equal(active.pointer.generationSha256, value.generationSha256, 'Worker generation changed');
  assert.equal(active.pointer.configReferencesSha256, value.configReferencesSha256, 'Worker configuration manifest changed');
  assert.deepEqual(active.config.configReferences, value.configReferences, 'Worker configuration inventory changed');
  if(value.policy) assert.deepEqual(value.policy,active.config.policy,'Worker authorization policy differs from active config');
  if(value.service) {
    const {command,...service}=active.config.services[value.service.id]; assert.deepEqual(value.service,service,'Worker service differs from active config');
    if(active.config.trustedFiles)assert.deepEqual(value.trustedFiles,active.config.trustedFiles,'Worker executable closure differs from active config');
    if(active.config.executionPath)assert.equal(value.executionPath,active.config.generation?.executionContexts[value.service.id]?.executionPath||active.config.executionPath,'Worker execution PATH differs from active generation');
    if(releaseIdentityDigest(value.release)!==active.approval.releaseSha256) {
      assert(['adopt','rollback'].includes(value.phase)&&['estimate','jev'].includes(value.service.id),'Release outside exact continuation authorization');
      const baseline=active.config.baseline;assert.equal(value.release.version,baseline.version);assert.equal(value.release.releaseId,baseline.releaseId);assert.equal(value.release.sourceRevision,baseline.sourceRevision);
      for(const [kind,key]of [['archive','archiveSha256'],['contract','referenceSha256'],['account','accountReferenceSha256']])assert.equal(value.release[kind]?.sha256,baseline[key],'Predecessor verification release mismatch');
    }
  }
  if (value.services) assert.equal(fingerprint(active.config), fingerprint(Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'generationFence'))), 'Running dispatcher config differs from active pointer');
  if (adapterConfig) {
    const path = value.service?.adapterOptions?.standingConfigPath;
    const ref = active.config.configReferences.find(ref => ref.path === path);
    assert(ref, 'Adapter config absent from active manifest');
    assert.equal(fingerprint(JSON.parse(readExactReference(ref))), fingerprint(adapterConfig), 'Running adapter config differs from active manifest');
  }
  return active;
}

function assertEstimateSuccessor(value, active) {
  assert.equal(value.attemptId,active.plan.estimate.newAttemptId,'Estimate attempt outside exact successor authorization');
  assert.equal(value.idempotencyKey,active.plan.estimate.idempotencyKey,'Estimate successor idempotency key changed');
  assert.equal(value.reconciliation?.priorAttemptId,active.plan.estimate.priorAttemptId,'Estimate successor must name the exact retained source-only failure');
}

function assertReverification(value, active) {
  const lineage=value.reverification;
  exactFields(lineage,['schemaVersion','kind','epochId','successfulAttempt'],'Exact read-only reverification lineage required');
  assert(lineage.schemaVersion===1&&lineage.kind==='standing-read-only-reverification'&&lineage.epochId===active.pointer.epochId,'Read-only reverification epoch changed');
  assert(['estimate','jev'].includes(value.service.id)&&value.mode==='standing'&&value.phase==='production','Only current native success may be reverified read-only');
  const state=readStandingState(active.pointer.stateDirectory), records=Object.values(state.releases).filter(record=>record.releaseId===value.release.releaseId);
  assert.equal(records.length,1,'Exact current release required for reverification');
  const prior=records[0].services[value.service.id],intent=prior?.verificationIntent;
  assert(prior?.state==='production-verified'&&intent?.state==='invoking','Durable invoking verification intent required; replay is prohibited');
  assert.equal(fingerprint(intent.request),fingerprint(value),'Read-only verification input differs from durable intent');
  assert(state.storageIntents?.intents.some(intent=>intent.kind==='verify'&&intent.releaseId===value.release.releaseId&&intent.serviceId===value.service.id&&intent.attemptId===value.attemptId&&intent.requestSha256===hash(serializeJSON(value))),'Durable bound verification barrier required');
  assert(!prior.reverificationAttempts?.some(attempt=>attempt.request.attemptId===value.attemptId),'Completed verification attempt cannot replay');
  const success=readStandingEvidence(active.pointer.stateDirectory,lineage.successfulAttempt);
  exactFields(success,['schemaVersion','kind','generationSha256','epochId','request','result'],'Exact successful native attempt evidence required');
  assert(success.schemaVersion===1&&success.kind==='standing-successful-native-attempt'&&success.generationSha256===active.pointer.generationSha256&&success.epochId===active.pointer.epochId,'Successful attempt generation/epoch changed');
  const original=success.request,result=success.result;
  assert(!Object.hasOwn(original,'reverification')&&original.phase===undefined,'Read-only proof cannot establish native success');
  assert.equal(fingerprint(original),fingerprint(prior.request),'Reverification substituted the successful native request');
  assert.equal(fingerprint(result),fingerprint(prior.result),'Reverification substituted the successful native result');
  assertGenerationFence(original);
  for(const [key,expected]of Object.entries({schemaVersion:1,state:'production-verified',releaseId:value.release.releaseId,serviceId:value.service.id,attemptId:original.attemptId,idempotencyKey:original.idempotencyKey}))assert.equal(result[key],expected,'Successful native result binding changed');
  if(value.service.id==='estimate')assertEstimateSuccessor(original,active);
  assertProduction(result.production,original,result.artifact,{allowExpired:true});
  assert.notEqual(value.attemptId,original.attemptId,'Reverification requires a fresh verification attempt');
  assert.equal(value.idempotencyKey,original.idempotencyKey,'Reverification service key changed');
  assert.equal(releaseIdentityDigest(value.release),releaseIdentityDigest(original.release),'Reverification release changed');
  assert.deepEqual(value.artifact,result.artifact,'Reverification artifact differs from successful native attempt');
  for(const key of ['candidate','sourceAdoption','reconciliation'])assert.deepEqual(value[key],original[key],'Reverification source/attempt lineage changed: '+key);
}

/** Native admission never accepts a verifier envelope, including legacy input. */
export function assertGenerationExecution(value,adapterConfig) {
  assert(value.kind !== 'standing-site-read-only', 'Standalone site validation cannot authorize operational execution');
  assert(!Object.hasOwn(value,'reverification'),'Read-only reverification cannot authorize native execution');
  if(['estimate','jev'].includes(value.service?.id))assert(value.phase===undefined,'Verification input cannot authorize native execution');
  return assertGenerationAdmission(value,adapterConfig,false);
}

/** Separate verifier admission; its read-only lineage is authority only while
 * the exact current-epoch verification intent and fsynced barrier remain. */
export function assertGenerationVerification(value) {
  assert(value.kind !== 'standing-site-read-only', 'Standalone site validation cannot authorize operational verification');
  return assertGenerationAdmission(value,undefined,true);
}

function assertGenerationAdmission(value,adapterConfig,verification) {
  const active=assertGenerationFence(value,adapterConfig);
  if(Object.hasOwn(value,'reverification'))assert(active&&verification,'Current-generation read-only verification authority required');
  if(active) {
    assertStandingPolicyActive(active.config);
    assert(Date.parse(active.approval.approvedAt)<=Date.now()&&Date.parse(active.approval.expiresAt)>Date.now(),'Continuation execution authorization expired or not active');
    const migration=active.config.policy?.reviewedMigration;
    if(migration)assert(Date.parse(migration.expiresAt)>Date.now(),'Original reviewedMigration expired; continuation cannot extend native authorization');
    if(Object.hasOwn(value,'reverification'))assertReverification(value,active);
    else if(value.service?.id==='estimate')assertEstimateSuccessor(value,active);
    if(['estimate','jev'].includes(value.service?.id)) {
      const ref=value.naeilPrerequisite;
      assert(ref?.path?.startsWith(join(active.pointer.stateDirectory,'prerequisites')+'/'),'Current-epoch fresh naeil prerequisite required');
      const proof=JSON.parse(readExactReference(ref));
      exactFields(proof,['schemaVersion','kind','generationSha256','pointerSha256','releaseSha256','request','artifact','production'],'Exact current naeil verification evidence required');
      assert(proof.schemaVersion===1&&proof.kind==='standing-current-naeil-verification'&&proof.generationSha256===active.pointer.generationSha256&&proof.pointerSha256===active.pointerSha256&&proof.releaseSha256===active.approval.releaseSha256,'Naeil verification generation/release changed');
      const nested=proof.request;
      assert(nested.schemaVersion===1&&nested.kind===undefined&&nested.mode==='standing'&&(nested.phase===undefined||nested.phase==='production')&&!Object.hasOwn(nested,'reverification'),'Operational current-generation naeil prerequisite required; standalone evidence is not authority');
      for(const key of ['generationSha256','generationFence','configReferences','configReferencesSha256','policy','trustedFiles','executionPath'])assert(Object.hasOwn(nested,key)&&nested[key]!==undefined,'Complete current-generation naeil request authority required');
      assert.equal(nested.service.id,'naeil');assert.equal(releaseIdentityDigest(nested.release),active.approval.releaseSha256);
      assert.deepEqual(nested.generationFence,value.generationFence,'Naeil prerequisite belongs to another current pointer/control');
      const nestedActive=assertGenerationFence(nested);
      assert(nestedActive&&nestedActive.pointerSha256===active.pointerSha256,'Naeil prerequisite requires the exact active native generation');
      assert.deepEqual(nestedActive.pointer,active.pointer,'Naeil prerequisite active generation changed');
      const {command,...siteService}=active.config.services.naeil;
      assert.deepEqual(nested.service,siteService,'Naeil prerequisite service differs from exact active configuration');
      assert.deepEqual(nested.policy,active.config.policy,'Naeil prerequisite policy differs from exact active configuration');
      assert.deepEqual(nested.trustedFiles,active.config.trustedFiles,'Naeil prerequisite executable closure differs from active configuration');
      assert.equal(nested.executionPath,active.config.generation?.executionContexts.naeil?.executionPath||active.config.executionPath,'Naeil prerequisite execution PATH differs from active configuration');
      const target=requestSiteTarget({...nested,service:siteService});
      assert.deepEqual(requestSiteTarget(nested),target,'Naeil prerequisite target differs from exact active configuration');
      assertProduction(proof.production,nested,proof.artifact);
      if (target.approvalSha256) {
        assert.equal(proof.request.service.siteContinuationApproval.oldSourceRevision, active.plan.predecessors.naeil.sourceRevision, 'Site continuation lost its exact historical predecessor');
        assert.equal(proof.production.identity.sourceRevision, target.sourceRevision, 'Naeil production differs from approved current site');
        assert.equal(proof.production.identity.artifactId, target.deploymentId, 'Naeil production differs from approved current deployment');
      } else assert.deepEqual(proof.production.identity,active.plan.predecessors.naeil,'Naeil production differs from exact reviewed continuation predecessor');
    }
  }
  return active;
}
