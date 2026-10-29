/** The child owns session access. Parent sees only bounded, sanitized receipts. */
import assert from 'node:assert/strict';
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { randomUUID } from 'node:crypto';
import { entryExists as stopped, hash, immutableJSON, readJSON, privateDirectory, LocalRolloutError, runRegistered } from './local-runtime.mjs';
import { verifyLocalProduction } from './production-verifier.mjs';
import { readPrivateJson } from './verification-session.mjs';
import { loadReleaseExpectations } from './release-expectations.mjs';
import { routeKey } from './route-contract.mjs';

const script = fileURLToPath(import.meta.url);
export function assertLocalVerification(result, request, startedAt) {
  const { release, service, artifact } = request;
  assert(result?.schemaVersion === 1 && result.passed === true, 'Production verification did not pass');
  for (const [key, expected] of Object.entries({ releaseId: release.releaseId, serviceId: service.id, attemptId: request.attemptId, idempotencyKey: request.idempotencyKey, phase: request.phase, archiveSha256: release.archive.sha256, referenceSha256: release.contract.sha256, accountReferenceSha256: release.account.sha256, expectationsSha256: loadReleaseExpectations(release).sha256 })) assert.equal(result[key], expected, `Verification ${key} mismatch`);
  assert.deepEqual(result.identity, { schemaVersion: 1, appId: service.appId, artifactId: artifact.id, sourceRevision: artifact.sourceRevision, ui: artifact.ui }, 'Production artifact identity mismatch');
  const checkedAt = Date.parse(result.checkedAt);
  assert(checkedAt >= startedAt - 1000 && checkedAt <= Date.now() + 5000, 'Receipt does not belong to this verification');
  for (const route of service.routes.filter(value => value.policy !== 'non-ui')) assert(result.routes?.some(value => value.routeKey === routeKey(route) && value.path === route.path && (value.passed || value.status === 'production-verified')), 'Exact route verification missing');
  return result;
}

export function createLocalVerifier(config) {
  return async ({ plan, service, transaction, directory, registerChild }) => {
    const artifact = transaction?.candidateArtifact || service.artifact;
    assert(artifact, 'Exact production artifact required');
    const selected = service.verification;
    const timeoutMs = selected.timeoutMs ?? 2400000;
    assert(Number.isSafeInteger(timeoutMs) && timeoutMs > 0 && timeoutMs <= 3 * 60 * 60_000, 'Bounded verification timeout required');
    for (const path of [selected.configPath, selected.nodeExecutable, selected.browserDirectory]) assert(isAbsolute(path || '') && realpathSync(path) === path, 'Canonical verification paths required');
    assert.equal(hash(readFileSync(selected.nodeExecutable)), selected.nodeSha256, 'Verification Node bytes changed');
    assert.equal(hash(readFileSync(selected.configPath)), selected.configSha256, 'Verification configuration bytes changed');
    const outputDirectory = join(directory, `verification-${randomUUID()}`);
    privateDirectory(directory, true); privateDirectory(outputDirectory, true);
    const request = { schemaVersion: 1, kind: 'local-rollout-verification', phase: 'production', verificationTimeoutMs: timeoutMs, release: plan.release, service, artifact, idempotencyKey: `${plan.release.releaseId}:${service.id}`, attemptId: randomUUID(), outputDirectory: join(outputDirectory, 'render'), referencePath: plan.release.contract.path };
    const input = join(outputDirectory, 'input.json'), output = join(outputDirectory, 'result.json');
    immutableJSON(input, { request, verifierConfigPath: selected.configPath, verifierConfigSha256: selected.configSha256, evidenceRoot: outputDirectory, stopFile: config.stopFile });
    const env = { PATH: `${dirname(selected.nodeExecutable)}:/usr/bin:/bin:/usr/sbin:/sbin`, NODE_OPTIONS: '', NODE_PATH: '', PLAYWRIGHT_BROWSERS_PATH: selected.browserDirectory, NAEIL_LOCAL_VERIFY_INPUT: input, NAEIL_LOCAL_VERIFY_OUTPUT: output };
    for (const name of ['HOME', 'USER', 'LOGNAME', 'LANG', 'LC_ALL', 'TMPDIR']) if (process.env[name]) env[name] = process.env[name];
    const startedAt = Date.now();
    try {
      await runRegistered(selected.nodeExecutable, [script], { cwd: dirname(script), env, timeout: timeoutMs, maxBuffer: 4096 }, registerChild);
    }
    catch (error) {
      let failure;
      try { failure = readJSON(output).error; } catch { /* Child may have stopped before receipt. */ }
      if (failure) throw Object.assign(new Error(failure.reasonCode), failure);
      throw new LocalRolloutError(error.killed ? 'verification-timeout' : 'verification-child-failed', { stage: 'production-verify', timeout: Boolean(error.killed), retryable: Boolean(error.killed) });
    }
    const result = readJSON(output);
    if (result.error) throw Object.assign(new Error(result.error.reasonCode), result.error);
    return assertLocalVerification(result, request, startedAt);
  };
}

async function main() {
  process.umask(0o077);
  const input = readJSON(process.env.NAEIL_LOCAL_VERIFY_INPUT);
  const output = process.env.NAEIL_LOCAL_VERIFY_OUTPUT;
  try {
    assert.equal(hash(readFileSync(input.verifierConfigPath)), input.verifierConfigSha256, 'Verifier configuration changed');
    const config = await readPrivateJson(input.verifierConfigPath);
    config.evidenceRoot = input.evidenceRoot;
    const beforeAction = () => { if (stopped(input.stopFile)) throw new LocalRolloutError('stop-requested'); };
    // A started credential rotation must persist its result even if STOP appears.
    const result = await verifyLocalProduction(input.request, config, { beforeAction, beforeWrite: () => {} });
    immutableJSON(output, result);
  } catch (error) {
    immutableJSON(output, { error: { stage: error.stage || 'production-verify', reasonCode: error.reasonCode || 'verification-mismatch', status: Number.isInteger(error.status) ? error.status : null, timeout: error.timeout === true, retryable: error.retryable === true, manualRecovery: error.manualRecovery === true } });
    process.exitCode = 1;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(() => { console.error('Local verification failed before a safe receipt was available.'); process.exitCode = 1; });
