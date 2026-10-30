import {copyCodeTree as copyCode} from './consumer-artifact.mjs';
import { validateCandidateHandoff } from './source-approval.mjs';
import { assertCandidateSource, stageCandidate } from './consumer-preflight.mjs';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { execFile, execFileSync } from 'node:child_process';
import { constants, closeSync, copyFileSync, existsSync, fsyncSync, lstatSync, mkdirSync, mkdtempSync, openSync, readFileSync, readdirSync, readlinkSync, realpathSync, renameSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { promisify } from 'node:util';
import { pathToFileURL } from 'node:url';
import { assertFrozen, policyGate, reviewedMigration } from './rollout.mjs';
import { updateConsumer } from './update-consumer.mjs';
import { atomicJSON, assertGenerationExecution, assertGenerationFence, assertTrustedFiles, commandConfig, invokeJSON, privateDirectory, readPrivateBytes, readPrivateJSON, routeKey } from './standing-config.mjs';

const HEX = /^[a-f0-9]{64}$/, REVISION = /^[a-f0-9]{40}$/, VERSION = /^0\.7\.(0|[1-9]\d*)$/, ID = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/;
const hash = value => createHash('sha256').update(value).digest('hex');
const exec = promisify(execFile);
const within = (path, root) => { const rest = relative(root, path); return rest === '' || !isAbsolute(rest) && rest !== '..' && !rest.startsWith('..' + sep); };
const canonical = path => typeof path === 'string' && isAbsolute(path) && resolve(path) === path;
const forbidden = name => /^(?:credential\.json|signing\.key|estimates\.json|\.estimate\.lock\.json|\.env(?:\..*)?|server\.env|\.git|\._.*)$/.test(name);
const identity = artifact => ({ schemaVersion: 1, appId: 'abestimate', artifactId: artifact.id, sourceRevision: artifact.sourceRevision, ui: artifact.ui });
const reference = artifact => ({ directory: artifact.directory, releaseId: artifact.releaseId, manifestSha256: artifact.manifestSha256, artifactId: artifact.id, sourceRevision: artifact.sourceRevision, ui: artifact.ui });
function durableDirectory(path) {
  privateDirectory(path, true);
  const fd = openSync(dirname(path), 'r'); try { fsyncSync(fd); } finally { closeSync(fd); }
  return path;
}
function pathExecutable(name, path) {
  for (const directory of path.split(':')) {
    const file = join(directory, name);
    if (existsSync(file) && (lstatSync(realpathSync(file)).mode & 0o111)) return realpathSync(file);
  }
  throw new Error('Reviewed PATH does not resolve the required executable');
}
function packageSha256(manifest) {
  const dependency = manifest.packageVersions?.['@naeil/ui'];
  assert(typeof dependency === 'string' && /^file:vendor\/naeil-ui-[0-9A-Za-z.+-]+\.tgz$/.test(dependency), 'Exact native vendored UI dependency required');
  const sha256 = manifest.sourceFiles?.[dependency.slice(5)];
  assert(HEX.test(sha256), 'Native vendored UI inventory hash required');
  return sha256;
}
function nativeUi(artifact, release) {
  const manifest = verifyReference(reference(artifact));
  assert.deepEqual(artifact.ui, { version: release.version, contractVersion: release.contract.version });
  assert.equal(packageSha256(manifest), release.archive.sha256, 'Native build must contain the exact frozen UI archive');
}

function read(path, maximum = 2 * 1024 * 1024) {
  assert(canonical(path), 'Canonical regular JSON path required');
  const info = lstatSync(path);
  assert(info.isFile() && !info.isSymbolicLink() && info.nlink === 1 && info.size <= maximum && realpathSync(path) === path, 'Bounded regular JSON required');
  return JSON.parse(readFileSync(path, 'utf8'));
}
function inventory(root) {
  assert(canonical(root) && realpathSync(root) === root && lstatSync(root).isDirectory(), 'Canonical artifact directory required');
  const files = {};
  function walk(directory) {
    for (const name of readdirSync(directory).sort()) {
      assert(!forbidden(name), 'Forbidden private artifact member');
      const path = join(directory, name), key = relative(root, path), stat = lstatSync(path);
      if (stat.isSymbolicLink()) {
        const target = readlinkSync(path);
        assert(!isAbsolute(target) && within(resolve(dirname(path), target), root) && within(realpathSync(path), root), 'Artifact link escapes immutable code');
        files[key] = 'symlink:' + target;
      } else if (stat.isDirectory()) walk(path);
      else { assert(stat.isFile(), 'Unsupported artifact member'); files[key] = hash(readFileSync(path)); }
    }
  }
  walk(root); return Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b, 'en')));
}
function verifyReference(ref) {
  assert(ref && canonical(ref.directory) && /^[a-f0-9]{12}-[a-f0-9]{12}$/.test(ref.releaseId) && HEX.test(ref.manifestSha256) && REVISION.test(ref.sourceRevision), 'Immutable native release reference required');
  const manifestPath = join(ref.directory, 'manifest.json');
  assert.equal(hash(readFileSync(manifestPath)), ref.manifestSha256, 'Native manifest hash mismatch');
  const manifest = read(manifestPath);
  assert(manifest.schemaVersion === 1 && manifest.releaseId === ref.releaseId && manifest.node === 'v24.21.0' && manifest.serverPath === 'app/server.js' && manifest.runtimeDataIncluded === false, 'Native code-only release contract mismatch');
  assert.equal(manifest.sourceCommit, ref.sourceRevision); assert.equal(manifest.buildId, ref.artifactId);
  assert.deepEqual(manifest.uiBuildIdentity, { schemaVersion: 1, appId: 'abestimate', artifactId: ref.artifactId, sourceRevision: ref.sourceRevision, ui: ref.ui });
  assert(VERSION.test(ref.ui?.version) && ref.ui.contractVersion === '1', 'Shared-session UI contract1 required');
  for (const path of ['src/server/naeil-shared-session.ts', 'src/server/naeil-auth-client.ts']) assert(HEX.test(manifest.sourceFiles?.[path]), 'Shared-session-compatible native source required');
  assert.deepEqual(inventory(join(ref.directory, 'app')), manifest.artifactFiles, 'Native artifact inventory/hash mismatch');
  assert.equal(readFileSync(join(ref.directory, 'app/.next/BUILD_ID'), 'utf8').trim(), ref.artifactId, 'Native BUILD_ID mismatch');
  return manifest;
}
function assertArtifact(artifact) {
  assert(artifact?.immutable === true && HEX.test(artifact.sha256) && typeof artifact.storageRef === 'string' && artifact.storageRef.includes(artifact.sha256), 'Content-addressed immutable artifact required');
  assert(canonical(artifact.path) && lstatSync(artifact.path).isFile() && !lstatSync(artifact.path).isSymbolicLink(), 'Regular artifact archive required');
  assert.equal(hash(readFileSync(artifact.path)), artifact.sha256, 'Code archive digest mismatch');
  const manifest = verifyReference(reference(artifact));
  assert.equal(artifact.packageSha256, packageSha256(manifest), 'Archive UI provenance mismatch');
}
function assertFrozenInputs(release) {
  assertFrozen(release); assert(VERSION.test(release.version) && release.contract.version === '1', 'Only UI0.7.x contract1 is authorized');
  assert(canonical(release.account?.path) && HEX.test(release.account.sha256), 'Frozen account reference required');
  assert.equal(hash(readFileSync(release.account.path)), release.account.sha256, 'Account reference digest mismatch');
  const account = read(release.account.path);
  assert(account.schemaVersion === 1 && account.kind === 'independent-account-render' && account.cases?.length, 'Independent account render required');
  assert.equal(account.archiveSha256, release.archive.sha256); assert.equal(account.sourceRevision, release.sourceRevision);
  assert.deepEqual(account.ui, { version: release.version, contractVersion: release.contract.version });
}
function configuration(input, config) {
  assert(input?.schemaVersion === 1 && input.service?.id === 'estimate' && input.service.appId === 'abestimate' && input.service.origin === 'https://abestimate.naeil.dev' && ['adopt', 'standing'].includes(input.mode), 'Estimate standing envelope required');
  assert(ID.test(input.attemptId) && typeof input.idempotencyKey === 'string' && input.idempotencyKey.length > 0 && input.idempotencyKey.length <= 240, 'Bounded attempt and idempotency binding required');
  assert(config?.schemaVersion === 1 && config.enabled === true && config.serviceId === 'estimate' && config.appId === 'abestimate' && config.origin === input.service.origin && config.branch === 'rollout/standing', 'Enabled isolated Estimate configuration required');
  assert(canonical(config.worktree) && realpathSync(config.worktree) === config.worktree, 'Canonical isolated checkout required');
  assert(config.pnpmVersion === '10.30.3', 'Reviewed pnpm10.30.3 pin required');
  assert(typeof config.executionPath === 'string' && config.executionPath.split(':').every(canonical), 'Absolute reviewed execution PATH required');
  for (const path of [...Object.values(config.executables ?? {}), config.bridgePath, config.tsxPath]) assert(canonical(path) && config.trustedFiles?.[path], 'Pinned absolute executable/helper required');
  for (const name of ['node', 'pnpm', 'git', 'tar']) assert(canonical(config.executables[name]), 'Complete executable inventory required');
  assert.equal(config.executables.tar, realpathSync('/usr/bin/tar'), 'App package helpers require the reviewed system tar target');
  assert(!within(config.tsxPath, config.worktree), 'Native loader must live outside mutable consumer dependencies');
  for (const name of ['node', 'pnpm', 'git', 'tar']) assert.equal(pathExecutable(name, config.executionPath), config.executables[name], 'Reviewed PATH executable mismatch: ' + name);
  assert(REVISION.test(config.reviewedSourceRevision), 'Exact reviewed consumer source commit required');
  assert.equal(config.bridgePath, join(config.worktree, 'ops/code-activation.mts'), 'Use the owned modern native bridge');
  assertTrustedFiles(config.trustedFiles);
  assertTrustedFiles(input.trustedFiles);
  assert.equal(hash(readFileSync(config.bridgePath)), config.bridgeSha256, 'Reviewed native bridge bytes changed');
  const activation = config.activation;
  assert(activation?.enabled === true && activation.serviceId === 'estimate' && activation.appId === 'abestimate' && activation.nodePath === config.executables.node && activation.stopFile === input.policy.stopFile, 'Bound native service policy required');
  assert.deepEqual(Object.keys(activation.runtimeEnvironmentSha256 ?? {}).sort(), ['APP_ORIGIN', 'NAEIL_SUPABASE_ANON_KEY', 'NAEIL_SUPABASE_URL']);
  for (const value of Object.values(activation.runtimeEnvironmentSha256)) assert(HEX.test(value), 'Runtime values must be SHA256 bindings');
  assert(!['credentialFile', 'signingKeyFile', 'environmentFile'].some(key => Object.hasOwn(activation, key)), 'Historical password configuration cannot enter standing activation');
  for (const path of [config.stateDirectory, config.artifactDirectory, activation.stateDirectory]) privateDirectory(path);
  assert(!within(config.stateDirectory, activation.dataDirectory) && !within(config.artifactDirectory, activation.dataDirectory), 'Evidence must remain outside business data');
  commandConfig(input.service.verification?.command);
  assert(Array.isArray(input.service.routes) && input.service.routes.some(route => route.policy !== 'non-ui'), 'Concrete verification route inventory required');
  for (const route of input.service.routes) assert(typeof route.path === 'string' && route.path.startsWith('/') && !route.path.startsWith('//') && !/[\[\]*]/.test(route.path), 'Concrete local route required');
}
function stopActive(path) {
  if (typeof path !== 'string') return false;
  try { lstatSync(path); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}
function active(input) {
  const policy = input.policy;
  assert(policy?.schemaVersion === 1 && policy.enabled === true && policy.approvedBy?.trim() && policy.approvalRef?.trim() && Date.parse(policy.expiresAt) > Date.now() && policy.services?.includes('estimate'), 'Active recorded standing authorization required');
  assert(canonical(policy.stopFile) && Number.isSafeInteger(policy.maxEvidenceAgeSeconds) && policy.maxEvidenceAgeSeconds > 0 && policy.maxEvidenceAgeSeconds <= 21600, 'Stop file and bounded evidence lifetime required');
  assert(policy.rollbackScope === 'code-only', 'Only code-only rollback is supported');
  if (stopActive(policy.stopFile)) { const error = new Error('STOP switch active'); error.deferred = true; throw error; }
}
function releaseGate(input, config, baseline) {
  assertFrozenInputs(input.release);
  if (input.mode === 'adopt') {
    const pin = config.baselineRelease;
    assert(pin?.version === '0.7.1' && input.release.version === pin.version, 'Adopt the actual UI0.7.1 baseline first');
    for (const key of ['releaseId', 'sourceRevision']) assert.equal(input.release[key], pin[key], 'Pinned baseline provenance mismatch');
    for (const [entry, key] of [['archive', 'archiveSha256'], ['contract', 'referenceSha256'], ['account', 'accountReferenceSha256']]) assert.equal(input.release[entry].sha256, pin[key], 'Pinned baseline frozen bytes mismatch');
  } else {
    assert(baseline?.state === 'production-verified', 'Verify actual current production before standing updates');
    const version = baseline.artifact.ui.version, patch = value => Number(value.split('.')[2]);
    assert.equal(input.release.previousVersion, version, 'Verified predecessor differs from patch predecessor');
    assert.equal(patch(input.release.version), patch(version) + 1, 'Only consecutive patches may roll forward');
    assert((input.release.changes.length === 1 && input.release.changes[0] === 'fix') || reviewedMigration(input.release, input.service, input.policy), 'Unattended patches must be fix only unless the owner approved this exact release');
    assert.equal(baseline.artifact.ui.contractVersion, input.release.contract.version);
    assert.equal(policyGate(input.release, input.service, input.policy).state, 'eligible', 'Current reviewed patch window required');
    // policyGate returns early for a migration; recheck the window at every boundary.
    const window = input.policy.patchWindow, next = patch(input.release.version);
    assert(window && patch(window.minVersion) <= next && next <= patch(window.maxVersion) && window.contractVersion === input.release.contract.version && window.services?.includes(input.service.id)
      && Date.parse(window.startsAt) <= Date.now() && Date.parse(window.expiresAt) > Date.now(), 'Release outside the approved patch window');
  }
}
function environment(config) {
  const env = { PATH: config.executionPath, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1', ESTIMATE_NODE_PATH: config.executables.node, COPYFILE_DISABLE: '1', GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_COUNT: '3', GIT_CONFIG_KEY_0: 'core.hooksPath', GIT_CONFIG_VALUE_0: '/dev/null', GIT_CONFIG_KEY_1: 'core.fsmonitor', GIT_CONFIG_VALUE_1: 'false', GIT_CONFIG_KEY_2: 'commit.gpgsign', GIT_CONFIG_VALUE_2: 'false' };
  for (const name of ['HOME', 'TMPDIR', 'LANG', 'LC_ALL']) if (process.env[name]) env[name] = process.env[name];
  if (config.browserDirectory) { assert(canonical(config.browserDirectory)); env.PLAYWRIGHT_BROWSERS_PATH = config.browserDirectory; }
  return env;
}
async function command(file, args, options = {}) {
  try { return await exec(file, args, { ...options, shell: false, encoding: 'utf8', timeout: options.timeout ?? 30 * 60 * 1000, maxBuffer: 4 * 1024 * 1024 }); }
  catch { throw new Error('Estimate command failed or timed out; private output suppressed'); }
}

/** The code archive is distinct from manifest.artifactHash (an inventory hash).
 * Current live code is read only; neither runtime data nor config enters it. */
export async function createArtifact(ref, config) {
  const before = verifyReference(ref), store = privateDirectory(config.artifactDirectory);
  const temporary = mkdtempSync(join(store, '.package-'));
  try {
    const tree = join(temporary, 'release'); mkdirSync(tree, { mode: 0o700 });
    copyFileSync(join(ref.directory, 'manifest.json'), join(tree, 'manifest.json'));
    copyCode(join(ref.directory, 'app'), join(tree, 'app'));
    verifyReference({ ...ref, directory: tree });
    const archive = join(temporary, 'code.tar.gz');
    await command(config.executables.tar, ['-czf', archive, '-C', tree, 'app', 'manifest.json'], { env: environment(config) });
    const sha256 = hash(readFileSync(archive)), destination = join(store, sha256);
    const artifact = { immutable: true, id: ref.artifactId, releaseId: ref.releaseId, manifestSha256: ref.manifestSha256, sourceRevision: ref.sourceRevision, ui: ref.ui, packageSha256: packageSha256(before), sha256, path: join(destination, 'code.tar.gz'), storageRef: pathToFileURL(join(destination, 'code.tar.gz')).href, directory: join(destination, 'release') };
    assert.deepEqual(verifyReference(ref), before, 'Source release changed while archiving');
    if (existsSync(destination)) {
      assertArtifact(artifact); assert.deepEqual(readPrivateJSON(join(destination, 'artifact.json')), artifact, 'Stored artifact binding changed');
      rmSync(temporary, { recursive: true }); return artifact;
    }
    atomicJSON(join(temporary, 'artifact.json'), artifact);
    renameSync(temporary, destination);
    const fd = openSync(store, 'r'); try { fsyncSync(fd); } finally { closeSync(fd); }
    assertArtifact(artifact); return artifact;
  } catch (error) { rmSync(temporary, { recursive: true, force: true }); throw error; }
}
export function assertVerification(response, request) {
  assert(response?.schemaVersion === 1 && response.passed === true, 'Production verifier did not pass');
  for (const [key, value] of Object.entries({ releaseId: request.release.releaseId, serviceId: 'estimate', idempotencyKey: request.idempotencyKey, attemptId: request.attemptId, phase: request.phase })) assert.equal(response[key], value, 'Verifier invocation binding mismatch: ' + key);
  assert.deepEqual(response.identity, request.expectedIdentity, 'Verified immutable identity mismatch');
  assert.deepEqual(request.artifact.ui, { version: request.release.version, contractVersion: request.release.contract.version });
  for (const [key, value] of Object.entries({ archiveSha256: request.release.archive.sha256, referenceSha256: request.release.contract.sha256, accountReferenceSha256: request.release.account.sha256 })) assert.equal(response[key], value, 'Verifier frozen input mismatch: ' + key);
  const time = Date.parse(response.checkedAt);
  assert(Number.isFinite(time) && time <= Date.now() + 5000 && Date.now() - time <= request.policy.maxEvidenceAgeSeconds * 1000, 'Fresh browser verification required');
  assert(Array.isArray(response.routes), 'Concrete route receipts required');
  for (const route of request.service.routes.filter(route => route.policy !== 'non-ui')) assert(response.routes.some(receipt => receipt.path === route.path && receipt.routeKey === routeKey(route) && (receipt.passed === true || receipt.status === 'production-verified')), 'Missing exact route/state verification');
}
async function packageCandidate(input, config, revision, run, gate) {
  gate();
  const result = await run(config.executables.node, ['--import', config.tsxPath, 'scripts/package-standalone.mts'], { cwd: config.worktree, env: { ...environment(config), NAEIL_SOURCE_REVISION: revision } });
  const matches = [...result.stdout.matchAll(/^Standalone prepared: (release\/[a-f0-9]{12}-[a-f0-9]{12})\s*$/gm)];
  assert.equal(matches.length, 1, 'One explicit standalone release receipt required');
  const directory = join(config.worktree, matches[0][1]), manifest = read(join(directory, 'manifest.json'));
  const ref = { directory, releaseId: manifest.releaseId, manifestSha256: hash(readFileSync(join(directory, 'manifest.json'))), artifactId: manifest.buildId, sourceRevision: revision, ui: { version: input.release.version, contractVersion: input.release.contract.version } };
  verifyReference(ref); gate();
  await run(config.executables.node, ['--import', config.tsxPath, 'scripts/check-release.mts', matches[0][1]], { cwd: config.worktree, env: environment(config) });
  await run(config.executables.pnpm, ['run', 'smoke'], { cwd: config.worktree, env: environment(config) });
  gate(); return createArtifact(ref, config);
}
export async function installedPackage(input, config, run) {
  const archive = input.release.archive.path;
  const listing = await run(config.executables.tar, ['-tzf', archive], { env: environment(config) });
  const members = listing.stdout.trim().split('\n').filter(name => !name.endsWith('/'));
  assert(members.length > 0 && members.length <= 1000, 'Bounded frozen package inventory required');
  assert.equal(new Set(members).size, members.length, 'Duplicate frozen package member');
  const files = {};
  for (const name of members) {
    assert(name.startsWith('package/') && !name.split('/').some(part => part === '..' || part === '.' || !part), 'Unsafe UI archive member');
    const key = name.slice(8), path = join(config.worktree, 'node_modules/@naeil/ui', key);
    const member = execFileSync(config.executables.tar, ['-xOf', archive, name], { env: environment(config), maxBuffer: 16 * 1024 * 1024, timeout: 10000, stdio: 'pipe' });
    assert(lstatSync(path).isFile() && !lstatSync(path).isSymbolicLink(), 'Regular installed UI member required');
    files[key] = hash(readFileSync(path)); assert.equal(files[key], hash(member), 'Installed UI differs from frozen archive');
  }
  const root = realpathSync(join(config.worktree, 'node_modules/@naeil/ui')), nested = join(root, 'node_modules');
  // pnpm creates node_modules/.bin tool shims inside the package; they are not package content.
  if (existsSync(nested)) assert(lstatSync(nested).isDirectory() && !lstatSync(nested).isSymbolicLink() && readdirSync(nested).every(name => name === '.bin'), 'Installed UI contains unexpected nested dependencies');
  const installed = Object.fromEntries(Object.entries(inventory(root)).filter(([key]) => !key.startsWith('node_modules/.bin/')));
  assert.deepEqual(installed, files, 'Installed UI must contain exactly the frozen files');
  return files;
}
async function cleanCheckout(config, run) {
  const env = environment(config), git = args => run(config.executables.git, args, { cwd: config.worktree, env });
  assert.equal((await git(['status', '--porcelain', '--untracked-files=normal'])).stdout.trim(), '', 'Commit the reviewed source before building');
  assert.equal((await git(['branch', '--show-current'])).stdout.trim(), config.branch, 'Dedicated standing branch required');
  await git(['merge-base', '--is-ancestor', config.reviewedSourceRevision, 'HEAD']);
  const changed = (await git(['diff', '--name-only', config.reviewedSourceRevision, 'HEAD'])).stdout.trim().split('\n').filter(Boolean);
  assert(changed.every(path => ['package.json', 'pnpm-lock.yaml'].includes(path) || /^vendor\/naeil-ui-[0-9A-Za-z.+-]+\.tgz$/.test(path)), 'Consumer code changed outside the reviewed dependency-only scope');
  const revision = (await git(['rev-parse', 'HEAD'])).stdout.trim(); assert(REVISION.test(revision), 'Exact clean source revision required'); return revision;
}
export function installDependencies(config) {
  const env = environment(config), modules = join(config.worktree, 'node_modules');
  if (existsSync(modules)) { assert(lstatSync(modules).isDirectory() && !lstatSync(modules).isSymbolicLink(), 'Regular isolated node_modules required'); rmSync(modules, { recursive: true }); }
  for (const flags of [['--no-frozen-lockfile', '--ignore-scripts'], ['--frozen-lockfile', '--ignore-scripts']]) execFileSync(config.executables.pnpm, ['install', '--prod=false', ...flags], { cwd: config.worktree, env, shell: false, stdio: 'pipe', timeout: 20 * 60 * 1000, maxBuffer: 4 * 1024 * 1024 });
}

export async function runStanding(input, config, dependencies = {}) {
  const result = { schemaVersion: 1, releaseId: input?.release?.releaseId, serviceId: input?.service?.id, idempotencyKey: input?.idempotencyKey, attemptId: input?.attemptId, state: 'gate-failed', mutationAttempted: false, runtimeMutationAttempted: false };
  let state, directory, lock, token, pending = false, activated = false, baselineCommitted = false, baseline, artifact, ledger, ledgerOwned = false, native, verify, pendingAction, handoff, staged = false, fenceLost = false;
  const fence = () => { try { return assertGenerationFence(input, config); } catch (error) { fenceLost = true; throw error; } };
  const persist = (path, value) => { fence(); atomicJSON(path, value); };
  const makeDirectory = path => { fence(); return durableDirectory(path); };
  const terminalLedger = () => { if (ledgerOwned) persist(ledger, { attemptId: input.attemptId, idempotencyKey: input.idempotencyKey, state: result.state, mutationAttempted: result.mutationAttempted, runtimeMutationAttempted: result.runtimeMutationAttempted, completedAt: new Date().toISOString() }); };
  const save = () => { if (directory) persist(join(directory, 'result.json'), { ...result, checkedAt: new Date().toISOString() }); };
  const trust = () => { fence(); assertGenerationExecution(input, config); assertTrustedFiles(input.trustedFiles); assertTrustedFiles(config.trustedFiles); };
  const stageOptions = () => ({worktree:config.worktree,branch:config.branch,reviewedSourceRevision:config.reviewedSourceRevision,git:config.executables.git,executionPath:config.executionPath,gitSha256:config.trustedFiles[config.executables.git]});
  const boundary = () => { active(input); trust(); releaseGate(input, config, baseline); if(handoff) {validateCandidateHandoff(handoff,input,config);if(staged)assertCandidateSource(handoff,stageOptions());} };
  const run = dependencies.command ?? command;
  try {
    fence(); assertGenerationExecution(input, config); configuration(input, config); active(input); assertFrozenInputs(input.release);
    if(input.candidate !== undefined || input.sourceAdoption !== undefined || (config.handoff || input.generationSha256 !== undefined) && input.mode === 'standing') {
      assert.equal(input.mode,'standing','Source/candidate adoption does not replace baseline adoption');
      handoff = validateCandidateHandoff(input.candidate,input,config);
    }
    fence(); state = privateDirectory(config.stateDirectory);
    const lockPath = join(state, 'running.lock');
    try { fence(); lock = openSync(lockPath, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600); }
    catch (error) { if (error.code === 'EEXIST') return { ...result, state: 'deferred', reason: 'Existing operation requires reconciliation' }; throw error; }
    token = randomUUID(); fence(); writeFileSync(lock, JSON.stringify({ token, attemptId: input.attemptId, idempotencyKey: input.idempotencyKey })); fsyncSync(lock);
    const stateFd = openSync(state, 'r'); try { fsyncSync(stateFd); } finally { closeSync(stateFd); }
    const attempts = makeDirectory(join(state, 'attempts')), keys = makeDirectory(join(state, 'keys'));
    ledger = join(keys, hash(input.idempotencyKey) + '.json');
    if (existsSync(ledger)) {
      const bytes = readPrivateBytes(ledger, 2 * 1024 * 1024), prior = JSON.parse(bytes);
      const terminal = ['deferred', 'gate-failed', 'review-required', 'not-deployed'].includes(prior.state);
      const retry = prior.idempotencyKey === input.idempotencyKey && typeof prior.attemptId === 'string' && terminal && prior.runtimeMutationAttempted === false && (prior.mutationAttempted === false || prior.state === 'gate-failed' && prior.mutationAttempted === true && input.reconciliation?.priorAttemptId === prior.attemptId);
      if (!retry) return { ...result, state: 'review-required', reason: 'Retained ledger requires explicit review; no uncertain or runtime-mutated operation is replayed' };
      fence(); const history = openSync(ledger + '.history-' + randomUUID(), 'wx', 0o600);
      try { writeFileSync(history, bytes); fsyncSync(history); } finally { closeSync(history); }
      const parent = openSync(dirname(ledger), 'r'); try { fsyncSync(parent); } finally { closeSync(parent); }
    }
    directory = join(attempts, input.attemptId); assert(!existsSync(directory), 'Attempt already exists; reconcile retained result'); makeDirectory(directory);
    persist(ledger, { attemptId: input.attemptId, idempotencyKey: input.idempotencyKey, state: 'invoked', mutationAttempted: false, runtimeMutationAttempted: false }); ledgerOwned = true; save();
    const baselinePath = join(state, 'baseline.json');
    if (existsSync(baselinePath)) { baseline = readPrivateJSON(baselinePath); assertArtifact(baseline.artifact); assertFrozenInputs(baseline.release); nativeUi(baseline.artifact, baseline.release); assert.equal(baseline.production?.identity?.artifactId, baseline.artifact.id, 'Baseline verification artifact mismatch'); assert.deepEqual(baseline.production.identity, identity(baseline.artifact)); }
    releaseGate(input, config, baseline);
    native = async (action, current, target, previous = current, label = action, approvalExtra = {}) => {
      boundary(); assert.equal(hash(readFileSync(config.bridgePath)), config.bridgeSha256, 'Native bridge review drift');
      const nativeConfig = { ...config.activation, current: reference(current), candidate: reference(target), previous: reference(previous) };
      const nativeDirectory = makeDirectory(join(directory, 'native-' + label));
      const approval = { schemaVersion: 1, operationId: 'standing-' + hash(input.idempotencyKey + ':' + input.attemptId + ':' + label), action, approvedBy: input.policy.approvedBy, reviewRef: input.policy.approvalRef, expiresAt: new Date(Math.min(Date.parse(input.policy.expiresAt), Date.now() + 2 * 60 * 60 * 1000)).toISOString(), configSha256: hash(JSON.stringify(nativeConfig)), bridgeSha256: config.bridgeSha256, expectedCurrentReleaseId: current.releaseId, targetReleaseId: (action === 'inspect' ? current : ['rollback', 'recover'].includes(action) ? previous : target).releaseId, scope: 'code-only-preserve-current-data', ...approvalExtra };
      const request = { schemaVersion: 1, releaseId: input.release.releaseId, serviceId: 'estimate', idempotencyKey: input.idempotencyKey, attemptId: input.attemptId, action, config: nativeConfig, approval, executionPath: config.executionPath };
      persist(join(nativeDirectory, 'dispatch.json'), { schemaVersion: 1, state: 'invoked', action, requestSha256: hash(JSON.stringify(request)), invokedAt: new Date().toISOString() });
      if (action !== 'inspect') { result.mutationAttempted = true; result.runtimeMutationAttempted = true; pendingAction = action; pending = true; result.state = 'activation-pending'; save(); }
      boundary();
      const response = dependencies.native ? await dependencies.native(action, request) : await invokeJSON({ file: config.executables.node, args: ['--import', config.tsxPath, config.bridgePath], cwd: config.worktree, timeoutMs: config.activation.timeoutMs * 4 + 60000 }, request, nativeDirectory);
      for (const [key, value] of Object.entries({ schemaVersion: 1, releaseId: input.release.releaseId, serviceId: 'estimate', idempotencyKey: input.idempotencyKey, attemptId: input.attemptId, action, passed: true })) assert.equal(response[key], value, 'Bound native response mismatch: ' + key);
      const expected = action === 'inspect' ? current : ['rollback', 'recover'].includes(action) ? previous : target;
      assert.equal(response.nativeReleaseId, expected.releaseId); assert.equal(response.artifactId, expected.id);
      if (action === 'inspect') assert.equal(response.mutationAttempted, false);
      else if (action === 'deploy') assert.equal(response.deploymentId, expected.releaseId);
      else { assert.equal(response.activated, true); assert.equal(response.preservationVerified, true); }
      persist(join(nativeDirectory, 'dispatch.json'), { state: 'completed', action, response, checkedAt: new Date().toISOString() }); pending = false; return response;
    };
    verify = async (phase, target, released = input.release) => {
      boundary(); assertFrozenInputs(released); assertArtifact(target);
      const outputDirectory = makeDirectory(join(directory, 'browser-' + phase));
      const request = { ...input, release: released, phase, artifact: target, expectedIdentity: identity(target), origin: input.service.origin, outputDirectory, referencePath: released.contract.path, executionPath: config.executionPath };
      boundary();
      const response = dependencies.verify ? await dependencies.verify(request) : await invokeJSON(input.service.verification.command, request, makeDirectory(join(outputDirectory, 'invocation')), 'verify');
      assertVerification(response, request); persist(join(outputDirectory, 'receipt.json'), response); return response;
    };
    if (input.mode === 'adopt') {
      assert(!baseline, 'Baseline already adopted; do not overwrite the verified chain');
      verifyReference(config.currentBaseline);
      const live = { ...config.currentBaseline, id: config.currentBaseline.artifactId };
      nativeUi(live, input.release);
      await native('inspect', live, live, live, 'inspect-before');
      artifact = await createArtifact(config.currentBaseline, config); result.artifact = artifact; save();
      result.production = await verify('adopt', artifact);
      await native('inspect', artifact, artifact, artifact, 'inspect-after');
    } else {
      if(handoff) {
        boundary();result.mutationAttempted=true;
        const intent={schemaVersion:1,state:'invoked',candidateReceipt:handoff.receipt,sourceAdoptionSha256:config.handoff.sourceAdoptionSha256,generationSha256:config.handoff.generationSha256,candidateSourceSha:handoff.candidateSourceSha};
        persist(join(directory,'candidate-stage.json'),intent);save();
        stageCandidate(handoff,{...stageOptions(),beforeMutation:boundary});staged=true;
        persist(join(directory,'candidate-stage.json'),{...intent,state:'completed'});
        artifact=handoff.artifact;assertArtifact(artifact);nativeUi(artifact,input.release);
      }
      await native('inspect', baseline.artifact, baseline.artifact, baseline.artifact, 'inspect-before');
      if(!handoff) {
      const env = environment(config);
      assert.equal((await run(config.executables.node, ['--version'], { env })).stdout.trim(), 'v24.21.0', 'Dedicated Node24.21.0 required');
      assert.equal((await run(config.executables.pnpm, ['--version'], { env })).stdout.trim(), config.pnpmVersion, 'Pinned pnpm required');
      await cleanCheckout(config, run); boundary();
      result.mutationAttempted = true; persist(join(directory, 'source-update.json'), { state: 'invoked', checkedAt: new Date().toISOString() }); save();
      const context = { ...input, adapterOptions: { update: { enabled: true, worktree: config.worktree, branch: config.branch, packageManager: 'pnpm@' + config.pnpmVersion } } };
      let updated;
      if (dependencies.update) updated = await dependencies.update(context);
      else {
        const prior = { ...process.env }; for (const key of Object.keys(process.env)) delete process.env[key]; Object.assign(process.env, env);
        try { updated = updateConsumer(context, { root: config.worktree, install: () => installDependencies(config) }); }
        finally { for (const key of Object.keys(process.env)) delete process.env[key]; Object.assign(process.env, prior); }
      }
      assert.equal(updated.uiVersion, input.release.version); assert.equal(updated.archiveSha256, input.release.archive.sha256); assert.equal(updated.dependencyExact, true); assert(REVISION.test(updated.sourceRevision), 'Clean committed update revision required');
      persist(join(directory, 'source-update.json'), { state: 'completed', ...updated }); boundary(); assert.equal(await cleanCheckout(config, run), updated.sourceRevision, 'Updated source revision differs from clean HEAD');
      const packageCheck = dependencies.packageCheck ?? (() => installedPackage(input, config, run)), before = await packageCheck();
      if (!dependencies.command && existsSync(join(config.worktree, '.next'))) { const next = join(config.worktree, '.next'); assert(lstatSync(next).isDirectory() && !lstatSync(next).isSymbolicLink()); rmSync(next, { recursive: true }); }
      for (const args of [['run', 'typecheck'], ['run', 'lint'], ['run', 'test', '--maxWorkers=1'], ['run', 'build']]) { boundary(); await run(config.executables.pnpm, args, { cwd: config.worktree, env: { ...env, NAEIL_SOURCE_REVISION: updated.sourceRevision } }); }
      assert.deepEqual(await packageCheck(), before, 'Installed UI changed during build');
      artifact = dependencies.package ? await dependencies.package(input, config, updated.sourceRevision) : await packageCandidate(input, config, updated.sourceRevision, run, boundary);
      assertArtifact(artifact); assert.equal(artifact.sourceRevision, updated.sourceRevision); nativeUi(artifact, input.release);
      result.artifact = artifact; result.previousArtifact = baseline.artifact; save(); boundary();
      const fixturePath = join(directory, 'ui-fixture.json');
      persist(fixturePath, { schemaVersion: 1, ui: artifact.ui, sourceRevision: input.release.sourceRevision, archiveSha256: input.release.archive.sha256, account: input.release.account });
      const browserEnvironment = { ...env, NAEIL_UI_STANDING_FIXTURE: fixturePath, SHARED_HEADER_EVIDENCE_DIR: join(directory, 'browser-isolated/header'), SHELL_EVIDENCE_DIR: join(directory, 'browser-isolated/shell'), NAVIGATION_EVIDENCE_DIR: join(directory, 'browser-isolated/navigation'), COMPANY_LAYOUT_EVIDENCE_DIR: join(directory, 'browser-isolated/company'), LAYOUT_EVIDENCE_DIR: join(directory, 'browser-isolated/layout'), E2E_REPORT_PATH: join(directory, 'browser-isolated/e2e.json') };
      await run(config.executables.pnpm, ['run', 'test:e2e', ...['shared-header', 'shared-footer', 'shared-account', 'shared-domain-access', 'ui-release-identity', 'app-shell', 'navigation-composition', 'save-recovery', 'editor', 'company-layout', 'layout'].map(name => 'tests/e2e/' + name + '.spec.ts'), '--workers=1'], { cwd: config.worktree, env: browserEnvironment });
      assert.equal(await cleanCheckout(config, run), artifact.sourceRevision, 'Packaged source revision differs from clean HEAD'); assertArtifact(artifact);
      } else {
        result.artifact=artifact;result.previousArtifact=baseline.artifact;result.candidateReceipt=handoff.receipt;result.sourceAdoptionSha256=config.handoff.sourceAdoptionSha256;save();boundary();
      }
      await native('deploy', baseline.artifact, artifact);
      await native('activate', baseline.artifact, artifact); activated = true;
      result.production = await verify('production', artifact);
      await native('inspect', artifact, artifact, baseline.artifact, 'inspect-after');
    }
    boundary(); assertArtifact(artifact);
    result.artifact = artifact; result.state = 'production-verified';
    persist(baselinePath, { state: result.state, artifact, release: input.release, production: result.production, verifiedAt: new Date().toISOString() });
    baselineCommitted = true;
    terminalLedger(); save(); return result;
  } catch (error) {
    dependencies.onError?.(error);
    const stopped = stopActive(input?.policy?.stopFile);
    result.state = pending ? 'activation-pending' : (error.deferred || stopped) && !result.mutationAttempted ? 'deferred' : 'gate-failed';
    if (stopped) result.reasonCode = result.runtimeMutationAttempted ? 'stopped-after-native-dispatch' : result.mutationAttempted ? 'stopped-after-source-update' : 'stopped';
    result.reason = pending ? 'Native operation may have changed runtime; retained state requires reconciliation' : 'Estimate gate failed; inspect private step records';
    if (baselineCommitted) { pending = true; result.state = 'activation-pending'; }
    if (pending && !activated && !baselineCommitted && pendingAction === 'activate') {
      try {
        active(input); trust(); releaseGate(input, config, baseline);
        assert(input.policy.rollbackApproved === true && input.policy.rollbackScope === 'code-only', 'Explicit recovery authorization required');
        const bytes = readPrivateBytes(join(config.activation.stateDirectory, 'operation.json'), 2 * 1024 * 1024), marker = JSON.parse(bytes);
        assert.equal(marker.operationId, 'standing-' + hash(input.idempotencyKey + ':' + input.attemptId + ':activate'), 'Foreign activation marker');
        assert.equal(marker.action, 'activate'); assert.equal(marker.from, baseline.artifact.releaseId); assert.equal(marker.to, artifact.releaseId);
        assert(['validated', 'captured', 'stop-requested', 'stopped', 'switch-requested', 'switched', 'bootstrap-requested'].includes(marker.phase), 'Ambiguous activation phase');
        const pointer = join(config.activation.deploymentRoot, 'current');
        assert(lstatSync(pointer).isSymbolicLink(), 'Native current must be a symlink');
        const pointed = realpathSync(pointer), releases = join(config.activation.deploymentRoot, 'releases');
        assert(pointed === join(releases, marker.from) || pointed === join(releases, marker.to), 'Native current points elsewhere');
        const current = pointed === join(releases, marker.from) ? baseline.artifact : artifact;
        assertArtifact(baseline.artifact); assertArtifact(artifact); assertFrozenInputs(baseline.release);
        const response = await native('recover', current, artifact, baseline.artifact, 'recover', { recoveryMarkerSha256: hash(bytes) });
        pending = true; result.state = 'activation-pending'; save();
        const production = await verify('rollback', baseline.artifact, baseline.release);
        persist(join(directory, 'native-recover', 'verification.json'), { response, production });
        result.rollback = { state: 'production-verified', mode: 'recover', artifact: baseline.artifact, production };
        pending = false; result.state = 'gate-failed';
      } catch {
        pending = true; result.state = 'activation-pending';
        if (pendingAction === 'recover') result.rollback = { state: 'activation-pending', mode: 'recover', artifact: baseline?.artifact };
      }
    }
    if (activated && !pending && !baselineCommitted) {
      pending = true; result.state = 'activation-pending';
      try { save(); } catch {}
      if (input.policy.rollbackApproved === true && input.policy.rollbackScope === 'code-only' && !stopActive(input.policy.stopFile)) {
        try {
          active(input); trust(); assertFrozenInputs(baseline.release); assertArtifact(baseline.artifact);
          const rollbackDirectory = makeDirectory(join(directory, 'native-rollback'));
          const rollbackConfig = { ...config.activation, current: reference(artifact), candidate: reference(artifact), previous: reference(baseline.artifact) };
          const approval = { schemaVersion: 1, operationId: 'standing-' + hash(input.idempotencyKey + ':' + input.attemptId + ':rollback'), action: 'rollback', approvedBy: input.policy.approvedBy, reviewRef: input.policy.approvalRef, expiresAt: new Date(Math.min(Date.parse(input.policy.expiresAt), Date.now() + 2 * 60 * 60 * 1000)).toISOString(), configSha256: hash(JSON.stringify(rollbackConfig)), bridgeSha256: config.bridgeSha256, expectedCurrentReleaseId: artifact.releaseId, targetReleaseId: baseline.artifact.releaseId, scope: 'code-only-preserve-current-data' };
          const request = { schemaVersion: 1, releaseId: input.release.releaseId, serviceId: 'estimate', idempotencyKey: input.idempotencyKey, attemptId: input.attemptId, action: 'rollback', config: rollbackConfig, approval, executionPath: config.executionPath };
          persist(join(rollbackDirectory, 'dispatch.json'), { state: 'invoked', requestSha256: hash(JSON.stringify(request)), checkedAt: new Date().toISOString() });
          boundary();
          const response = dependencies.native ? await dependencies.native('rollback', request) : await invokeJSON({ file: config.executables.node, args: ['--import', config.tsxPath, config.bridgePath], cwd: config.worktree, timeoutMs: config.activation.timeoutMs * 4 + 60000 }, request, rollbackDirectory);
          for (const [key, value] of Object.entries({ schemaVersion: 1, releaseId: input.release.releaseId, serviceId: 'estimate', idempotencyKey: input.idempotencyKey, attemptId: input.attemptId, action: 'rollback', passed: true, activated: true, preservationVerified: true, nativeReleaseId: baseline.artifact.releaseId, artifactId: baseline.artifact.id })) assert.equal(response[key], value, 'Rollback binding mismatch');
          const outputDirectory = makeDirectory(join(directory, 'browser-rollback'));
          const verification = { ...input, release: baseline.release, phase: 'rollback', artifact: baseline.artifact, expectedIdentity: identity(baseline.artifact), origin: input.service.origin, outputDirectory, referencePath: baseline.release.contract.path, executionPath: config.executionPath };
          active(input); trust(); assertFrozenInputs(baseline.release); assertArtifact(baseline.artifact);
          const production = dependencies.verify ? await dependencies.verify(verification) : await invokeJSON(input.service.verification.command, verification, makeDirectory(join(outputDirectory, 'invocation')), 'verify');
          assertVerification(production, verification);
          persist(join(rollbackDirectory, 'dispatch.json'), { state: 'completed', response, production });
          result.rollback = { state: 'production-verified', artifact: baseline.artifact, production }; pending = false; result.state = 'gate-failed';
        } catch { result.rollback = { state: 'activation-pending', artifact: baseline.artifact }; }
      }
    }
    try { terminalLedger(); save(); } catch { pending = true; result.state = 'activation-pending'; }
    return result;
  } finally {
    if (lock !== undefined) {
      try { if (!pending && !fenceLost) { fence(); assert.equal(readPrivateJSON(join(state, 'running.lock')).token, token, 'Lock ownership changed'); unlinkSync(join(state, 'running.lock')); } } catch { pending = true; result.state = 'activation-pending'; }
      finally { closeSync(lock); }
    }
  }
}

async function main() {
  let input, output, invoked = false;
  try {
    assert(canonical(process.env.NAEIL_ROLLOUT_INPUT) && canonical(process.env.NAEIL_ROLLOUT_OUTPUT), 'Private standing file transport required');
    input = readPrivateJSON(process.env.NAEIL_ROLLOUT_INPUT); output = process.env.NAEIL_ROLLOUT_OUTPUT;
    const config = readPrivateJSON(input.service?.adapterOptions?.standingConfigPath);
    assert(!existsSync(output), 'Standing output already exists; reconcile prior invocation');
    invoked = true; const result = await runStanding(input, config); assertGenerationFence(input,config); atomicJSON(output, result);
    if (!['production-verified', 'deferred'].includes(result.state)) process.exitCode = 1;
  } catch {
    try { if (output && !existsSync(output)) { assertGenerationFence(input); atomicJSON(output, { schemaVersion: 1, releaseId: input?.release?.releaseId, serviceId: input?.service?.id, idempotencyKey: input?.idempotencyKey, attemptId: input?.attemptId, state: invoked ? 'activation-pending' : 'gate-failed', mutationAttempted: invoked, reason: invoked ? 'Estimate dispatched outcome requires private reconciliation' : 'Estimate private configuration/transport refused' }); } } catch {}
    process.exitCode = 1;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
