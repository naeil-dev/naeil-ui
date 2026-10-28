#!/usr/bin/env node
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runLocal, approvalFor, classifyFailure, finalizePlan, planDigest } from './local-runner.mjs';
import { entryExists, readJSON, recoverMachineLock } from './local-runtime.mjs';
import { validateLocalRelease, discoverLocalRelease } from './local-release.mjs';
import { withLocalHandoff } from './local-handoff.mjs';

export function executeLocalCommand(config, dependencies, options, entry = {}) {
  const run = () => (entry.run || runLocal)(config, dependencies, options);
  // Recovery is transaction-bound and must remain independent of handoff
  // authority. Preparation/verification do not import or mutate legacy state.
  return options.command === 'run' && config.plan?.handoff
    ? (entry.handoff || withLocalHandoff)(config, run)
    : run();
}

/** Draft config → final plan binding each deployment's passed candidate, its
 * consumer-input proof and the recorded predecessor. Creates no state/approval;
 * `prepare` on the result re-inspects the live predecessor. */
export async function preparePlan(draft, checks) {
  const { assertLocalArtifact, candidateFor, localCandidateProof } = checks || await import('./local-consumers.mjs');
  const plan = structuredClone(draft.plan), bindings = {};
  (checks?.validateRelease || validateLocalRelease)({ plan });
  for (const service of plan.services.filter(item => item.mode === 'deploy')) {
    const proof = localCandidateProof(service.consumer?.candidate);
    service.consumer.candidateBinding ??= proof.candidateBinding;
    const { candidate } = candidateFor(plan, service); assertLocalArtifact(service.id, service.currentArtifact);
    bindings[service.id] = { previousArtifact: service.currentArtifact, candidateArtifact: candidate.artifact, consumerInputsSha256: proof.consumerInputsSha256 };
  }
  return { ...draft, plan: finalizePlan(plan, bindings) };
}

export function localCommandOptions(command, rest) {
  const retryHeld = rest.includes('--retry-held'), recoverVerification = rest.includes('--recover-verification');
  const selectors = rest.filter(value => !['--retry-held', '--recover-verification'].includes(value));
  assert(rest.length <= 2 && selectors.length <= 1 && new Set(rest).size === rest.length && selectors.every(value => !value.startsWith('-')) && (!retryHeld || ['run', 'prepare', 'verify'].includes(command)), 'Only one selector and an explicit retry flag are accepted');
  assert(!recoverVerification || (command === 'verify' && selectors.length === 1 && !retryHeld), 'Verification recovery requires verify with one explicit service and no retry flag');
  assert(!selectors.length || ['prepare', 'verify', 'rollback'].includes(command), 'Sequential run and status do not accept a service selector');
  return { command, ...(retryHeld ? { retryHeld: true } : {}), ...(recoverVerification ? { recoverVerification: true } : {}), ...(selectors[0] ? command === 'rollback' ? { transactionId: selectors[0] } : { serviceId: selectors[0] } : {}) };
}

export async function main(args = process.argv.slice(2)) {
  process.umask(0o077);
  const [command, configPath, ...rest] = args;
  assert(['discover', 'prepare-plan', 'approval-template', 'status', 'prepare', 'verify', 'run', 'rollback', 'recover-lock'].includes(command) && configPath, 'Usage: local-cli.mjs <command> <private-config.json> [service-id | transaction-id | lock-owner-id | output-config.json] [--retry-held | --recover-verification (verify SERVICE only)]');
  const config = readJSON(resolve(configPath));
  if (command === 'prepare-plan') {
    assert(rest.length === 1 && resolve(rest[0]) !== resolve(configPath) && !entryExists(resolve(rest[0])), 'Separate new output config required');
    const final = await preparePlan(config);
    writeFileSync(resolve(rest[0]), JSON.stringify(final, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ configPath: resolve(rest[0]), planSha256: planDigest(final.plan), approvalCreated: false })); return;
  }
  if (command === 'approval-template') { assert.equal(rest.length, 0); console.log(JSON.stringify(approvalFor(config.plan), null, 2)); return; }
  if (command === 'discover') { assert.equal(rest.length, 0); const result = await discoverLocalRelease(config); console.log(JSON.stringify({ releaseId: result.release.releaseId, archiveSha256: result.release.archive.sha256, release: result.release })); return; }
  if (command === 'recover-lock') { assert(rest.length === 1 && !rest[0].startsWith('-'), 'Exact stale lock owner ID required'); recoverMachineLock(config.lockFile, { ownerId: rest[0] }); console.log(JSON.stringify({ status: 'lock-recovered' })); return; }
  const options = localCommandOptions(command, rest);
  const { createLocalConsumers } = await import('./local-consumers.mjs');
  const consumers = createLocalConsumers();
  // Rollback/status never load the browser verifier, so recovery needs no node_modules.
  const verify = ['rollback', 'status'].includes(command) ? undefined : (await import('./local-verification.mjs')).createLocalVerifier(config);
  const state = await executeLocalCommand(config, { ...consumers, validateRelease: validateLocalRelease, verify }, options);
  // Verify succeeds only for services actually verified; an absent deployment is reported, not passed.
  const unverified = command === 'verify' ? config.plan.services.filter(service => (!options.serviceId || service.id === options.serviceId) && state.services[service.id]?.status !== 'production-verified').map(service => service.id) : [];
  console.log(JSON.stringify({ releaseId: state.releaseId, status: state.status, failure: state.failure, ...(command === 'status' ? { machineLock: entryExists(config.lockFile) } : {}), ...(unverified.length ? { unverified } : {}), services: Object.fromEntries(Object.entries(state.services).map(([id, service]) => [id, { status: service.status, transactionId: service.transactionId, artifactId: service.artifact?.id, failure: service.failure }])) }, null, 2));
  if (['held', 'auth-required', 'manual-recovery', 'retryable'].includes(state.status) || unverified.length) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { const result = classifyFailure(error, 'command'); console.error(JSON.stringify({ status: result.category, failure: result.failure })); process.exitCode = 1; });
