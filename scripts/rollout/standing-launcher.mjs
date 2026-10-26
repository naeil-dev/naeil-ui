import assert from 'node:assert/strict';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { acquireControlLock, assertGenerationFence, atomicJSON, JSON_LIMITS, privateDirectory, readActiveGeneration } from './standing-config.mjs';

export { readActiveGeneration };

/** Independent bounded heartbeat: dispatcher state is never needed to report exit. */
export async function runActiveGeneration(controlDirectory, dependencies = {}) {
  privateDirectory(controlDirectory);
  const startedAt = new Date().toISOString(), statusPath = join(controlDirectory, 'launcher-status.json');
  let lease, active, dispatched = false;
  const status = (state, exitCode, endedAt = null) => atomicJSON(statusPath, { schemaVersion: 1, state, startedAt, endedAt, exitCode, generationId: active?.pointer.generationId || null }, JSON_LIMITS.operatorStatus);
  try {
    lease = acquireControlLock(controlDirectory); status('starting', null);
    active = readActiveGeneration(controlDirectory);
    const config = { ...active.config, generationFence: { controlDirectory, pointerSha256: active.pointerSha256 } };
    assertGenerationFence(config); status('running', null);
    const poll = dependencies.poll || (await import('./standing-dispatcher.mjs')).poll;
    dispatched = true;
    const result = await poll(config, { ...dependencies.dispatcher, controlLease: lease });
    assertGenerationFence(config);
    const exitCode = result?.state === 'blocked' ? 1 : 0; status('exited', exitCode, new Date().toISOString()); return result;
  } catch (cause) {
    // Lock contention must not overwrite the running launcher's heartbeat.
    if (lease) status(dispatched ? 'failed' : 'refused', 1, new Date().toISOString());
    throw new Error('Active generation launcher refused or failed; inspect retained control evidence', { cause });
  } finally { lease?.release(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  assert(process.argv.length === 3, 'Usage: standing-launcher.mjs CONTROL_DIRECTORY');
  runActiveGeneration(resolve(process.argv[2])).then(result => { if (result?.state === 'blocked') process.exitCode = 1; }).catch(() => { console.error('Standing launcher refused; inspect private launcher-status and control journal.'); process.exitCode = 1; });
}
