#!/usr/bin/env node
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runLocal, approvalFor, classifyFailure } from './local-runner.mjs';
import { readJSON, recoverMachineLock } from './local-runtime.mjs';
import { validateLocalRelease, discoverLocalRelease } from './local-release.mjs';
import { createLocalVerifier } from './local-verification.mjs';
import { withLocalHandoff } from './local-handoff.mjs';

export function executeLocalCommand(config, dependencies, options, entry = {}) {
  const run = () => (entry.run || runLocal)(config, dependencies, options);
  // Recovery is transaction-bound and must remain independent of handoff
  // authority. Preparation/verification do not import or mutate legacy state.
  return options.command === 'run' && config.plan?.handoff
    ? (entry.handoff || withLocalHandoff)(config, run)
    : run();
}

export async function main(args = process.argv.slice(2)) {
  process.umask(0o077);
  const [command, configPath, ...rest] = args;
  assert(['discover', 'approval-template', 'status', 'prepare', 'verify', 'run', 'rollback', 'recover-lock'].includes(command) && configPath, 'Usage: local-cli.mjs <command> <private-config.json> [service-id | transaction-id | lock-owner-id] [--retry-held]');
  const config = readJSON(resolve(configPath));
  if (command === 'approval-template') { assert.equal(rest.length, 0); console.log(JSON.stringify(approvalFor(config.plan), null, 2)); return; }
  if (command === 'discover') { assert.equal(rest.length, 0); const result = await discoverLocalRelease(config); console.log(JSON.stringify({ releaseId: result.release.releaseId, archiveSha256: result.release.archive.sha256, release: result.release })); return; }
  if (command === 'recover-lock') { assert(rest.length === 1 && !rest[0].startsWith('-'), 'Exact stale lock owner ID required'); recoverMachineLock(config.lockFile, { ownerId: rest[0] }); console.log(JSON.stringify({ status: 'lock-recovered' })); return; }
  const retryHeld = rest.includes('--retry-held');
  const selectors = rest.filter(value => value !== '--retry-held');
  assert(rest.length <= 2 && selectors.length <= 1 && new Set(rest).size === rest.length && selectors.every(value => !value.startsWith('-')) && (!retryHeld || ['run', 'prepare', 'verify'].includes(command)), 'Only one selector and an explicit retry flag are accepted');
  assert(!selectors.length || ['prepare', 'verify', 'rollback'].includes(command), 'Sequential run and status do not accept a service selector');
  const { createLocalConsumers } = await import('./local-consumers.mjs');
  const consumers = createLocalConsumers();
  const state = await executeLocalCommand(config, { ...consumers, validateRelease: validateLocalRelease, verify: createLocalVerifier(config) }, { command, ...(retryHeld ? { retryHeld: true } : {}), ...(selectors[0] ? command === 'rollback' ? { transactionId: selectors[0] } : { serviceId: selectors[0] } : {}) });
  console.log(JSON.stringify({ releaseId: state.releaseId, status: state.status, failure: state.failure, services: Object.fromEntries(Object.entries(state.services).map(([id, service]) => [id, { status: service.status, transactionId: service.transactionId, artifactId: service.artifact?.id, failure: service.failure }])) }, null, 2));
  if (['held', 'auth-required', 'manual-recovery', 'retryable'].includes(state.status)) process.exitCode = 1;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { const result = classifyFailure(error, 'command'); console.error(JSON.stringify({ status: result.category, failure: result.failure })); process.exitCode = 1; });
