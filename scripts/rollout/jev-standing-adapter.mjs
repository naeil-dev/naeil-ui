/**
 * Main provisions service.adapterOptions.standingConfigPath (owned0600 JSON).
 * NAEIL_ROLLOUT_INPUT/OUTPUT carry JSON files; no shell, credentials or inline code.
 * See /tmp/jev-standing-config.example.json for provisioning, or the protocol
 * comment at the end of jev-native.py for native fields. Adoption verifies the
 * exact current artifact; ordinary patches require a previously verified baseline.
 */
import assert from 'node:assert/strict';
import { execFile, execFileSync } from 'node:child_process';
import { constants, closeSync, copyFileSync, existsSync, fchmodSync, fstatSync, ftruncateSync, fsyncSync, lstatSync, mkdirSync, mkdtempSync, openSync, readFileSync, readdirSync, readlinkSync, realpathSync, renameSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, basename } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertFrozen, digest } from './rollout.mjs';
import { routeKey, assertRouteConfig } from './route-contract.mjs';
import { updateConsumer } from './update-consumer.mjs';
import { assertCandidateHarness, prepareCandidateHarness } from './jev-candidate.mjs';
import { assertTrustedFiles } from './standing-config.mjs';

const exec = promisify(execFile);
const ID = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$/;
const HEX = /^[a-f0-9]{64}$/;
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const appId = service => service.appId ?? service.identity?.appId ?? service.id;
const forbidden = name => /^(?:\.env(?:\..*)?|server\.env|password\.json|state\.sqlite(?:-.*)?|api-key|tests|test-results|playwright-report)$/.test(name) || /^(?:coral|fish|jellyfish|turtle|whale)\.png$/.test(name);
const manifestSha = value => digest(JSON.stringify(Object.fromEntries(Object.entries(value).sort().map(([key, entry]) => [key, Object.fromEntries(Object.entries(entry).sort())]))));
const stopped = path => { try { lstatSync(path); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } };

function readPrivate(path) {
  assert(isAbsolute(path || ''), 'Absolute private JSON path required');
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = fstatSync(fd);
    assert(stat.isFile() && stat.nlink === 1 && stat.uid === process.getuid() && !(stat.mode & 0o077) && stat.size <= 8 * 1024 * 1024, 'Private bounded owned JSON required');
    return JSON.parse(readFileSync(fd, 'utf8'));
  } finally { closeSync(fd); }
}

function privateDirectory(path) {
  assert(isAbsolute(path), 'Absolute private directory required');
  mkdirSync(path, { recursive: true, mode: 0o700 });
  const stat = lstatSync(path);
  assert(stat.isDirectory() && !stat.isSymbolicLink() && stat.uid === process.getuid() && !(stat.mode & 0o077), 'Owned0700 directory required');
  return realpathSync(path);
}

export function writePrivate(path, value, exclusive = false) {
  assert(isAbsolute(path), 'Absolute private JSON path required');
  const fd = openSync(path, constants.O_WRONLY | constants.O_CREAT | constants.O_NOFOLLOW | (exclusive ? constants.O_EXCL : 0), 0o600);
  try {
    const stat = fstatSync(fd); assert(stat.isFile() && stat.nlink === 1 && stat.uid === process.getuid(), 'Owned single-link JSON required');
    fchmodSync(fd, 0o600); ftruncateSync(fd); writeFileSync(fd, `${JSON.stringify(value, null, 2)}\n`); fsyncSync(fd);
  } finally { closeSync(fd); }
}

function atomic(path, value) {
  const temporary = `${path}.next`;
  writePrivate(temporary, value, true); renameSync(temporary, path);
  const fd = openSync(dirname(path), constants.O_RDONLY); try { fsyncSync(fd); } finally { closeSync(fd); }
}

function executable(command) {
  const file = command.file ?? command.executable;
  assert(isAbsolute(file || '') && !/^(?:sh|bash|zsh|fish|cmd|powershell|pwsh)(?:\.exe)?$/.test(basename(file)), 'Absolute non-shell executable required');
  assert(!command.file || !command.executable || command.file === command.executable, 'Ambiguous executable');
  assert(Array.isArray(command.args) && command.args.every(arg => typeof arg === 'string'), 'Explicit argv required');
  return file;
}

export function cleanEnvironment(config) {
  const env = {};
  for (const name of ['HOME', 'USER', 'LOGNAME', 'LANG', 'LC_ALL', 'TMPDIR', 'SYSTEMROOT']) if (process.env[name]) env[name] = process.env[name];
  env.PATH = config.executionPath ?? `${dirname(config.nodeExecutable)}:${dirname(config.pnpmExecutable)}:/usr/bin:/bin:/usr/sbin:/sbin`;
  if (config.executionPath) assert(config.executionPath.split(':').every(path => isAbsolute(path) && resolve(path) === path && realpathSync(path) === path && lstatSync(path).isDirectory()), 'Reviewed canonical execution PATH required');
  env.NODE_PATH = ''; env.NODE_OPTIONS = ''; env.NEXT_TELEMETRY_DISABLED = '1';
  env.GIT_CONFIG_NOSYSTEM = '1'; env.GIT_CONFIG_GLOBAL = '/dev/null'; env.GIT_CONFIG_SYSTEM = '/dev/null';
  const gitOptions = { 'core.hooksPath': '/dev/null', 'core.fsmonitor': 'false', 'commit.gpgsign': 'false', 'tag.gpgsign': 'false' };
  env.GIT_CONFIG_COUNT = String(Object.keys(gitOptions).length);
  Object.entries(gitOptions).forEach(([key, value], index) => { env[`GIT_CONFIG_KEY_${index}`] = key; env[`GIT_CONFIG_VALUE_${index}`] = value; });
  if (config.browserDirectory) { assert(isAbsolute(config.browserDirectory)); env.PLAYWRIGHT_BROWSERS_PATH = config.browserDirectory; }
  return env;
}

function gitExecutable(config) {
  for (const directory of cleanEnvironment(config).PATH.split(':')) {
    const path = join(directory, 'git');
    if (!existsSync(path)) continue;
    const stat = lstatSync(path);
    assert(stat.isFile() && !stat.isSymbolicLink() && realpathSync(path) === path && (stat.mode & 0o111), 'Canonical reviewed git executable required');
    if (config.gitExecutable) assert.equal(path, config.gitExecutable, 'Bare git differs from reviewed absolute executable');
    return path;
  }
  assert.fail('Reviewed git executable missing from execution PATH');
}

function withEnvironment(env, action) {
  const original = process.env;
  try { process.env = { ...env }; return action(); }
  finally { process.env = original; }
}

export async function runCommand(file, args, options = {}) {
  executable({ file, args });
  const timeout = options.timeoutMs ?? 1200000;
  assert(Number.isSafeInteger(timeout) && timeout > 0 && timeout <= 3 * 60 * 60 * 1000, 'Bounded command timeout required');
  return exec(file, args, { maxBuffer: 4 * 1024 * 1024, ...options, shell: false, timeout });
}

async function transport(command, request, directory, prefix, config, environmentNames) {
  directory = mkdtempSync(join(directory, `${prefix}-`));
  const input = join(directory, `${prefix}.input.json`), output = join(directory, `${prefix}.output.json`);
  writePrivate(input, request, true);
  assert(!existsSync(output), 'Subprocess result already exists');
  const env = { ...cleanEnvironment(config), [environmentNames[0]]: input, [environmentNames[1]]: output };
  // Captured subprocess payloads are deliberately not persisted or echoed.
  await runCommand(executable(command), command.args, { cwd: config.worktree, env, timeoutMs: command.timeoutMs ?? 1200000 });
  const stat = lstatSync(output);
  assert(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1 && stat.uid === process.getuid() && !(stat.mode & 0o077) && stat.size <= 4 * 1024 * 1024, 'Private bounded subprocess result required');
  return readPrivate(output);
}

export const invokeVerifier = (request, config, directory) => transport(config.verificationCommand, request, directory, `verify-${request.phase}`, config, ['NAEIL_VERIFY_INPUT', 'NAEIL_VERIFY_OUTPUT']);

async function invokeNative(action, request, config, directory) {
  const helper = fileURLToPath(new URL('./jev-native.py', import.meta.url));
  return transport({ file: config.pythonExecutable, args: ['-B', helper], timeoutMs: config.nativeTimeoutMs ?? 180000 }, { ...request, action, config: { ...config.native, baselineArtifact: config.baselineArtifact } }, directory, `native-${action}`, config, ['NAEIL_ROLLOUT_INPUT', 'NAEIL_ROLLOUT_OUTPUT']);
}

function activePolicy(input, config) {
  const { policy, release, service, mode } = input;
  assert(policy?.enabled === true && [undefined, 1].includes(policy.schemaVersion), 'Standing policy disabled or unknown schema');
  assert(['approvedBy', 'approvalRef'].every(key => typeof policy[key] === 'string' && policy[key].trim()) && Date.parse(policy.expiresAt) > Date.now(), 'Recorded live authorization required');
  assert(policy.services?.includes(service.id) && isAbsolute(policy.stopFile || '') && Number.isFinite(policy.maxEvidenceAgeSeconds) && policy.maxEvidenceAgeSeconds > 0 && policy.maxEvidenceAgeSeconds <= 21600, 'Scoped service, STOP and bounded evidence lifetime required');
  assert.equal(release.contract.version, '1', 'Only reviewed contract1 is supported');
  if (mode === 'adopt') {
    const artifact = config.baselineArtifact; validateArtifact(artifact);
    assert.equal(release.version, '0.7.1', 'Only exact current0.7.1 can be adopted');
    assert.deepEqual(artifact.ui, { version: release.version, contractVersion: release.contract.version }, 'Adoption UI differs from pinned current artifact');
    assert.equal(artifact.packageSha256, release.archive.sha256, 'Adoption archive differs from pinned current artifact');
    return;
  }
  const patch = value => /^0\.7\.(0|[1-9]\d*)$/.test(value || '') ? Number(value.split('.')[2]) : NaN;
  assert.equal(patch(release.version), patch(release.previousVersion) + 1, 'Consecutive0.7.x patch required');
  assert.deepEqual(release.changes, ['fix'], 'Only fix-only standing changes are approved');
  const window = policy.patchWindow;
  const low = patch(window?.minVersion), high = patch(window?.maxVersion), next = patch(release.version);
  assert(Number.isSafeInteger(next) && Number.isSafeInteger(low) && Number.isSafeInteger(high) && low <= next && next <= high && window.contractVersion === '1', 'Release outside approved patch/contract window');
  if (window.expiresAt !== undefined) assert(Date.parse(window.expiresAt) > Date.now(), 'Patch window expired');
  if (window.startsAt !== undefined) assert(Date.parse(window.startsAt) <= Date.now(), 'Patch window not active');
}

function updaterPolicy(policy) {
  // The existing generic updater uses the older policy representation. Express
  // the already validated bounded approval; never add a migration exemption.
  return { ...policy, schemaVersion: 1, reviewedMigration: undefined, patchWindow: { ...policy.patchWindow, approvedBy: policy.approvedBy, approvalRef: policy.approvalRef, reason: 'Approved consecutive fix-only standing patch window', startsAt: policy.patchWindow.startsAt ?? '1970-01-02', expiresAt: policy.patchWindow.expiresAt ?? policy.expiresAt, services: policy.services } };
}

function validateArtifact(artifact) {
  assert(artifact?.immutable === true && ID.test(artifact.id) && /^[a-f0-9]{40}$/.test(artifact.sourceRevision), 'Immutable exact-source artifact required');
  assert(HEX.test(artifact.sha256) && isAbsolute(artifact.path || '') && digest(readFileSync(artifact.path)) === artifact.sha256, 'Artifact digest mismatch');
  assert(typeof artifact.storageRef === 'string' && artifact.storageRef.includes(artifact.sha256), 'Digest-addressed storage reference required');
  assert(isAbsolute(artifact.manifestPath || '') && HEX.test(artifact.manifestSha256) && typeof artifact.buildId === 'string' && artifact.buildId, 'Native artifact manifest/build binding required');
  assert.equal(manifestSha(read(artifact.manifestPath)), artifact.manifestSha256, 'Artifact manifest mismatch');
  assert(HEX.test(artifact.packageSha256), 'Frozen UI archive binding required');
  assert(/^\d+\.\d+\.\d+$/.test(artifact.ui?.version || '') && /^[1-9]\d*$/.test(artifact.ui?.contractVersion || ''), 'Exact UI identity required');
}

function assertNative(response, action, request) {
  assert.equal(response?.schemaVersion, 1, 'Native schema mismatch');
  for (const [key, expected] of Object.entries({ releaseId: request.release.releaseId, serviceId: request.service.id, idempotencyKey: request.idempotencyKey, attemptId: request.attemptId, action })) assert.equal(response[key], expected, `Native ${key} mismatch`);
  if (response.passed !== true) { const error = new Error('Native operation refused'); error.deferred = response.deferred === true; error.nativeSafe = response.safe === true; throw error; }
  assert.equal(response.safe, true, 'Native operation safety unconfirmed');
}

function identity(service, artifact) {
  return { schemaVersion: 1, appId: appId(service), artifactId: artifact.id, sourceRevision: artifact.sourceRevision, ui: artifact.ui };
}

function assertProduction(result, request) {
  assert.equal(result?.schemaVersion, 1); assert.equal(result.passed, true, 'Production verification failed');
  for (const [field, expected] of Object.entries({ releaseId: request.release.releaseId, serviceId: request.service.id, idempotencyKey: request.idempotencyKey, attemptId: request.attemptId, phase: request.phase })) assert.equal(result[field], expected, `Verifier ${field} mismatch`);
  assert.deepEqual(result.identity, request.expectedIdentity, 'Verifier identity mismatch');
  assert.equal(result.referenceSha256, request.release.contract.sha256, 'Verifier reference mismatch');
  assert.equal(result.archiveSha256, request.release.archive.sha256, 'Verifier UI archive mismatch');
  if (request.release.account) assert.equal(result.accountReferenceSha256, request.release.account.sha256, 'Verifier account reference mismatch');
  const age = Date.now() - Date.parse(result.checkedAt);
  assert(Number.isFinite(age) && age >= -5000 && age <= request.policy.maxEvidenceAgeSeconds * 1000, 'Stale verifier result');
  assert(Array.isArray(result.routes) && result.routes.length, 'Verifier route receipts required');
  for (const route of request.service.routes) {
    if (route.policy === 'non-ui') continue;
    assertRouteConfig(route);
    assert(result.routes.some(entry => entry.path === route.path && entry.routeKey === routeKey(route) && (entry.passed === true || entry.status === 'production-verified')), 'Missing exact route/state receipt');
  }
}

function manifest(root, normalizeLinks = false) {
  const result = {};
  const walk = (directory, prefix = '') => {
    for (const entry of readdirSync(directory).sort()) {
      assert(!forbidden(entry), 'Forbidden packaged member');
      const path = join(directory, entry), name = prefix + entry, stat = lstatSync(path);
      if (stat.isDirectory()) walk(path, `${name}/`);
      else if (stat.isSymbolicLink()) {
        const target = normalizeLinks ? relative(dirname(path), realpathSync(path)) : readlinkSync(path), resolvedTarget = relative(realpathSync(root), realpathSync(path));
        assert(!isAbsolute(target) && resolvedTarget !== '..' && !resolvedTarget.startsWith('../') && !isAbsolute(resolvedTarget), 'Packaged link escapes artifact');
        result[name] = { type: 'symlink', target, resolvedTarget };
      } else { assert(stat.isFile(), 'Unsupported packaged member'); result[name] = { bytes: stat.size, sha256: digest(readFileSync(path)) }; }
    }
  };
  walk(root); return result;
}

function copyCode(source, destination) {
  mkdirSync(destination, { mode: 0o700 });
  for (const name of readdirSync(source)) {
    assert(!forbidden(name), 'Forbidden source member');
    const input = join(source, name), output = join(destination, name), stat = lstatSync(input);
    if (stat.isDirectory()) copyCode(input, output);
    else if (stat.isSymbolicLink()) symlinkSync(relative(dirname(input), realpathSync(input)), output);
    else { assert(stat.isFile(), 'Unsupported source member'); copyFileSync(input, output); }
  }
}

export async function createArtifact(input, config, sourceRevision) {
  const source = join(config.worktree, '.next/standalone');
  const before = manifest(source, true);
  const expected = read(join(source, 'public/.well-known/naeil-ui.json'));
  assert.equal(expected.appId, appId(input.service)); assert.equal(expected.sourceRevision, sourceRevision);
  assert.deepEqual(expected.ui, { version: input.release.version, contractVersion: input.release.contract.version });
  assert.deepEqual(Object.keys(expected).sort(), ['appId', 'artifactId', 'schemaVersion', 'sourceRevision', 'ui']); assert.equal(expected.schemaVersion, 1);
  const store = privateDirectory(config.artifactDirectory), temporary = mkdtempSync(join(store, '.package-'));
  try {
    const tree = join(temporary, 'standalone'); copyCode(source, tree);
    assert.deepEqual(manifest(tree), before, 'Artifact copy changed code');
    const manifestPath = join(temporary, 'file-manifest.json'); writePrivate(manifestPath, before, true);
    // Python and JS use the same sorted compact canonical manifest digest.
    const archive = join(temporary, 'standalone.tar.gz');
    await runCommand('/usr/bin/tar', ['-czf', archive, '-C', temporary, 'standalone'], { env: { ...cleanEnvironment(config), COPYFILE_DISABLE: '1' } });
    const sha256 = digest(readFileSync(archive));
    const destination = join(store, sha256);
    assert(!existsSync(destination), 'Immutable artifact already exists; reconcile existing attempt');
    const artifact = { id: expected.artifactId, sourceRevision, ui: expected.ui, packageSha256: input.release.archive.sha256, immutable: true, sha256, storageRef: pathToFileURL(join(destination, 'standalone.tar.gz')).href, path: join(destination, 'standalone.tar.gz'), manifestPath: join(destination, 'file-manifest.json'), manifestSha256: manifestSha(before), buildId: readFileSync(join(tree, '.next/BUILD_ID'), 'utf8').trim(), standalonePath: join(destination, 'standalone') };
    writePrivate(join(temporary, 'receipt.json'), { ...expected, ...artifact, packageSha256: input.release.archive.sha256, releaseId: input.release.releaseId }, true);
    assert.deepEqual(manifest(source, true), before, 'Source code changed during packaging');
    renameSync(temporary, destination); return artifact;
  } catch (error) { rmSync(temporary, { recursive: true, force: true }); throw error; }
}

export async function runStanding(input, config, dependencies = {}) {
  const result = { schemaVersion: 1, releaseId: input?.release?.releaseId, serviceId: input?.service?.id, idempotencyKey: input?.idempotencyKey, attemptId: input?.attemptId, state: 'gate-failed', mutationAttempted: false };
  let lock, directory, state, uncertain = false, mutated = false, storageFault = false, baseline, artifact;
  const persist = (path, value) => { try { atomic(path, value); } catch (error) { storageFault = true; throw error; } };
  const save = () => { if (directory) persist(join(directory, 'result.json'), { ...result, checkedAt: new Date().toISOString() }); };
  const gate = () => {
    if (input.trustedFiles && config.trustedFiles) assert.deepEqual(input.trustedFiles, config.trustedFiles, 'Trusted executable/helper closure drift');
    assertTrustedFiles(input.trustedFiles ?? config.trustedFiles);
    assertFrozen(input.release); activePolicy(input, config);
    if (input.release.account) { assert(isAbsolute(input.release.account.path || '') && digest(readFileSync(input.release.account.path)) === input.release.account.sha256, 'Frozen account reference mismatch'); }
    assert(!stopped(input.policy.stopFile), 'Stop switch active');
  };
  try {
    assert(input?.schemaVersion === 1 && input.service?.id === 'jev' && ['adopt', 'standing'].includes(input.mode), 'Jev standing envelope required');
    assert(ID.test(input.attemptId) && typeof input.idempotencyKey === 'string' && input.idempotencyKey.length <= 240 && input.idempotencyKey, 'Bounded attempt/idempotency required');
    assert(config?.schemaVersion === 1 && config.enabled === true && config.branch === 'rollout/standing', 'Enabled dedicated Jev configuration required');
    assert(/^[a-f0-9]{40}$/.test(config.reviewedSourceRevision || ''), 'Exact reviewed consumer source revision required');
    if (config.executionPath && input.executionPath) assert.equal(config.executionPath, input.executionPath, 'Private and dispatcher PATH differ');
    config = { ...config, executionPath: config.executionPath ?? input.executionPath };
    for (const path of [config.worktree, config.nodeExecutable, config.pnpmExecutable, config.pythonExecutable]) assert(isAbsolute(path || ''), 'Absolute configured path required');
    executable(config.verificationCommand); gate();
    state = privateDirectory(config.stateDirectory);
    try { lock = openSync(join(state, 'running.lock'), constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600); }
    catch (error) { if (error.code === 'EEXIST') return { ...result, state: 'deferred', reason: 'Existing operation or unresolved native uncertainty' }; throw error; }
    writeFileSync(lock, JSON.stringify({ attemptId: input.attemptId, idempotencyKey: input.idempotencyKey })); fsyncSync(lock);
    const stateFd = openSync(state, constants.O_RDONLY); try { fsyncSync(stateFd); } finally { closeSync(stateFd); }
    const attempts = privateDirectory(join(state, 'attempts')); directory = join(attempts, input.attemptId);
    assert(!existsSync(directory), 'Attempt already recorded; inspect retained result'); privateDirectory(directory); save();
    const native = async (action, fields = {}, expected = {}) => {
      gate();
      const request = { ...input, artifact, previousArtifact: baseline?.artifact, transactionDirectory: join(config.native.baseDirectory || state, 'releases', `ui-${input.attemptId}`), ...fields };
      const response = dependencies.native ? await dependencies.native(action, request) : await invokeNative(action, request, config, directory);
      assertNative(response, action, request);
      for (const [key, value] of Object.entries(expected)) assert.equal(response[key], value, `Native ${key} mismatch`);
      return response;
    };
    const verify = async (phase, target, release = input.release) => {
      gate(); assertFrozen(release);
      const request = { ...input, release, phase, artifact: target, previousArtifact: baseline?.artifact, origin: input.service.origin, expectedIdentity: identity(input.service, target), referencePath: release.contract.path, outputDirectory: privateDirectory(join(directory, `browser-${phase}`)) };
      const expected = structuredClone(request);
      const production = dependencies.verify ? await dependencies.verify(request) : await invokeVerifier(request, config, directory);
      assertProduction(production, expected); return production;
    };
    const baselinePath = join(state, 'baseline.json');
    if (input.mode === 'adopt') {
      artifact = config.baselineArtifact; validateArtifact(artifact);
      assert.deepEqual(artifact.ui, { version: input.release.version, contractVersion: input.release.contract.version }, 'Adoption UI mismatch');
      assert.equal(artifact.packageSha256, input.release.archive.sha256, 'Adoption UI archive mismatch');
      await native('inspect');
      result.production = await verify('adopt', artifact);
      await native('inspect', { inspection: 'after-verification' });
    } else {
      assert(existsSync(baselinePath), 'Adopt and verify the current artifact before standing changes');
      baseline = readPrivate(baselinePath); validateArtifact(baseline.artifact);
      assert.equal(baseline.schemaVersion, 1, 'Baseline schema mismatch');
      assert.equal(baseline.state, 'production-verified');
      assert.equal(baseline.artifact.ui.version, input.release.previousVersion, 'Previous verified version mismatch');
      assert.equal(baseline.artifact.ui.contractVersion, input.release.contract.version, 'Previous contract mismatch');
      assert.deepEqual(baseline.service, { id: input.service.id, appId: appId(input.service), origin: input.service.origin, routes: input.service.routes }, 'Baseline service/route scope mismatch');
      assert.deepEqual(baseline.production?.identity, identity(input.service, baseline.artifact), 'Baseline verification binding mismatch');
      assert.equal(baseline.production.releaseId, baseline.release.releaseId); assert.equal(baseline.production.serviceId, input.service.id);
      assert.equal(baseline.production.referenceSha256, baseline.release.contract.sha256); assert.equal(baseline.production.passed, true);
      assert.deepEqual(baseline.artifact.ui, { version: baseline.release.version, contractVersion: baseline.release.contract.version });
      assert.equal(baseline.artifact.packageSha256, baseline.release.archive.sha256, 'Predecessor UI archive mismatch');
      await native('inspect', { artifact: baseline.artifact });
      result.predecessorProduction = await verify('adopt', baseline.artifact, baseline.release);
      await native('inspect', { artifact: baseline.artifact, inspection: 'after-predecessor-verification' });
      const command = dependencies.command ?? runCommand;
      const env = cleanEnvironment(config);
      const node = await command(config.nodeExecutable, ['--version'], { env, cwd: config.worktree });
      const pnpm = await command(config.pnpmExecutable, ['--version'], { env, cwd: config.worktree });
      assert.equal(node.stdout.trim(), config.nodeVersion, 'Node version differs from reviewed native pin');
      assert.equal(pnpm.stdout.trim(), config.pnpmVersion, 'pnpm version differs from reviewed pin');
      gate();
      const sourceCheck = dependencies.sourceCheck ?? (async expectedRevision => {
        const git = args => command(gitExecutable(config), args, { cwd: config.worktree, env });
        for (const [args, expected] of [[['branch', '--show-current'], config.branch], [['status', '--porcelain', '--untracked-files=normal'], '']]) {
          assert.equal((await git(args)).stdout.trim(), expected, 'Dedicated source branch or cleanliness changed during pipeline');
        }
        await git(['merge-base', '--is-ancestor', config.reviewedSourceRevision, 'HEAD']);
        const changed = (await git(['diff', '--name-only', '-z', config.reviewedSourceRevision, 'HEAD', '--'])).stdout.split('\0').filter(Boolean);
        assert(changed.every(path => ['package.json', 'pnpm-lock.yaml'].includes(path) || /^vendor\/naeil-ui-[0-9A-Za-z.+-]+\.tgz$/.test(path)), 'Consumer source changed outside reviewed dependency-only scope');
        const revision = (await git(['rev-parse', 'HEAD'])).stdout.trim();
        assert(/^[a-f0-9]{40}$/.test(revision), 'Exact clean source revision required');
        if (expectedRevision) assert.equal(revision, expectedRevision, 'Dedicated source changed during pipeline');
        return revision;
      });
      await sourceCheck(); gate();
      const updateContext = { ...input, policy: updaterPolicy(input.policy), adapterOptions: { update: { enabled: true, worktree: config.worktree, branch: config.branch, packageManager: `pnpm@${config.pnpmVersion}` } } };
      const update = dependencies.update ? await dependencies.update(updateContext) : withEnvironment(env, () => updateConsumer(updateContext, { root: config.worktree, install: () => {
        const modules = join(config.worktree, 'node_modules');
        if (existsSync(modules)) { assert(lstatSync(modules).isDirectory() && !lstatSync(modules).isSymbolicLink()); rmSync(modules, { recursive: true }); }
        for (const flags of [['--no-frozen-lockfile', '--ignore-scripts'], ['--frozen-lockfile', '--ignore-scripts']]) execFileSync(config.pnpmExecutable, ['install', ...flags], { cwd: config.worktree, env, shell: false, stdio: 'pipe', timeout: 1200000, maxBuffer: 4 * 1024 * 1024 });
      } }));
      assert.equal(update.uiVersion, input.release.version); assert.equal(update.archiveSha256, input.release.archive.sha256); assert.equal(update.dependencyExact, true);
      assert(/^[a-f0-9]{40}$/.test(update.sourceRevision));
      await sourceCheck(update.sourceRevision);
      const packageCheck = dependencies.packageCheck ?? (async () => {
        const { verifyInstalledPackage } = await import(pathToFileURL(join(config.worktree, 'scripts/candidate-files.mjs')));
        return withEnvironment(env, () => verifyInstalledPackage(input.release.archive.path, join(config.worktree, 'node_modules/@naeil/ui')));
      });
      const installed = await packageCheck();
      const next = join(config.worktree, '.next');
      if (!dependencies.command && existsSync(next)) { assert(lstatSync(next).isDirectory() && !lstatSync(next).isSymbolicLink()); rmSync(next, { recursive: true }); }
      result.checks = [];
      for (const script of ['test', 'typecheck', 'lint', 'build']) {
        gate(); const check = { command: [config.pnpmExecutable, 'run', script], passed: false }; result.checks.push(check); save();
        await command(config.pnpmExecutable, ['run', script], { cwd: config.worktree, env }); check.passed = true; check.checkedAt = new Date().toISOString(); save();
      }
      assert.deepEqual(await packageCheck(), installed, 'Installed UI changed during build');
      await sourceCheck(update.sourceRevision);
      gate(); artifact = await createArtifact(input, config, update.sourceRevision);
      result.artifact = artifact; result.previousArtifact = baseline.artifact; save();
      const harness = (dependencies.prepareCandidate ?? prepareCandidateHarness)(input.release, config.worktree, join(directory, 'candidate-harness'), update.sourceRevision, config.candidateFixtureSha256);
      result.candidateHarness = harness.receipt;
      const browserCheck = { command: [config.pnpmExecutable, 'exec', 'playwright', 'test', '--config', harness.configPath], passed: false }; result.checks.push(browserCheck); save(); gate();
      await command(config.pnpmExecutable, browserCheck.command.slice(1), { cwd: harness.directory, env: { ...env, JEV_TEST_STANDALONE: artifact.standalonePath, JEV_CANDIDATE_RELEASE: harness.releasePath } });
      browserCheck.passed = true; browserCheck.checkedAt = new Date().toISOString(); save();
      (dependencies.assertCandidate ?? assertCandidateHarness)(harness);
      validateArtifact(artifact);
      assert.deepEqual(manifest(artifact.standalonePath), read(artifact.manifestPath), 'Artifact code changed during browser gates');
      assert.deepEqual(await packageCheck(), installed, 'Installed UI changed during browser gates');
      await sourceCheck(update.sourceRevision);
      await native('stage');
      result.state = 'activation-pending'; save();
      gate(); uncertain = true; result.mutationAttempted = true; save();
      const activated = await native('activate', {}, { activated: true, safe: true });
      uncertain = false; mutated = activated.activated;
      result.production = await verify('production', artifact);
      await native('inspect', { inspection: 'after-verification' });
    }
    result.artifact = artifact; result.state = 'production-verified';
    persist(baselinePath, { schemaVersion: 1, state: result.state, artifact, release: input.release, service: { id: input.service.id, appId: appId(input.service), origin: input.service.origin, routes: input.service.routes }, production: result.production, verifiedAt: new Date().toISOString() });
    save(); return result;
  } catch (error) {
    if (error.nativeSafe === true) uncertain = false;
    if (error.nativeSafe === true && error.deferred === true && !mutated) result.mutationAttempted = false;
    result.state = uncertain ? 'activation-pending' : error.deferred && !mutated ? 'deferred' : 'gate-failed';
    result.reason = uncertain ? 'Native operation may have changed runtime; durable reconciliation required' : 'Jev operation refused or gate failed; inspect private step records';
    if (mutated && baseline && artifact && directory && !storageFault) {
      result.state = 'activation-pending'; uncertain = true;
      if (input.policy.rollbackApproved === true && input.policy.rollbackScope === 'code-only' && !stopped(input.policy.stopFile)) {
        try {
          gate();
          const request = { ...input, artifact, previousArtifact: baseline.artifact, transactionDirectory: join(config.native.baseDirectory || state, 'releases', `ui-${input.attemptId}`) };
          const rollback = dependencies.native ? await dependencies.native('rollback', request) : await invokeNative('rollback', request, config, directory);
          assertNative(rollback, 'rollback', request); assert.equal(rollback.activated, true);
          gate();
          const verificationRequest = { ...input, release: baseline.release, phase: 'rollback', artifact: baseline.artifact, origin: input.service.origin, expectedIdentity: identity(input.service, baseline.artifact), referencePath: baseline.release.contract.path, outputDirectory: privateDirectory(join(directory, 'browser-rollback')) };
          const production = dependencies.verify ? await dependencies.verify(verificationRequest) : await invokeVerifier(verificationRequest, config, directory);
          assertProduction(production, verificationRequest);
          gate();
          const inspected = dependencies.native ? await dependencies.native('inspect', { ...request, artifact: baseline.artifact }) : await invokeNative('inspect', { ...request, artifact: baseline.artifact }, config, directory);
          assertNative(inspected, 'inspect', request);
          result.rollback = { state: 'production-verified', artifact: baseline.artifact, production }; uncertain = false; result.state = 'gate-failed';
        } catch { result.rollback = { state: 'activation-pending', artifact: baseline.artifact }; }
      }
    }
    if (storageFault && (mutated || uncertain)) { uncertain = true; result.state = 'activation-pending'; result.reason = 'Native operation evidence could not be persisted; durable reconciliation required'; }
    try { save(); } catch { if (mutated || uncertain) { uncertain = true; result.state = 'activation-pending'; } }
    return result;
  } finally {
    if (lock !== undefined) { closeSync(lock); if (!uncertain) unlinkSync(join(state, 'running.lock')); }
  }
}

async function main() {
  let output;
  try {
    assert(process.env.NAEIL_ROLLOUT_INPUT && process.env.NAEIL_ROLLOUT_OUTPUT, 'Private file transport required');
    output = process.env.NAEIL_ROLLOUT_OUTPUT;
    const input = readPrivate(process.env.NAEIL_ROLLOUT_INPUT);
    const path = input.service?.adapterOptions?.standingConfigPath ?? process.env.JEV_ROLLOUT_CONFIG;
    assert(isAbsolute(path || ''), 'Private standing configuration required');
    const result = await runStanding(input, readPrivate(path));
    writePrivate(output, result); if (!['production-verified', 'deferred'].includes(result.state)) process.exitCode = 1;
  } catch {
    if (output) writePrivate(output, { schemaVersion: 1, state: 'gate-failed', reason: 'Jev adapter configuration or private transport refused' });
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
