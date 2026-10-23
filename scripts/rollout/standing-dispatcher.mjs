import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { acquireLock, assertActive, assertProduction, assertTrustedFiles, atomicJSON, automationDigest, fingerprint, HEX, IDS, invokeJSON, loadConfig, privateDirectory, readPrivateJSON, validateConfig } from './standing-config.mjs';
import { assertPolicyRelease, GitHub, GitHubUnavailable, materializeRelease, releaseMetadata } from './standing-github.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const patch = value => Number(value.split('.')[2]);

export function assertServiceResult(result, request) {
  for (const [key, expected] of Object.entries({ schemaVersion: 1, releaseId: request.release.releaseId, serviceId: request.service.id, idempotencyKey: request.idempotencyKey, attemptId: request.attemptId })) assert.equal(result?.[key], expected, `Adapter ${key} mismatch`);
  assert(['production-verified', 'deferred', 'gate-failed', 'activation-pending', 'not-deployed', 'review-required'].includes(result.state), 'Unknown native result state');
  if (result.state === 'deferred') assert.equal(result.mutationAttempted, false, 'Only proven pre-mutation deferral may retry');
  if (result.state !== 'production-verified') return;
  assert(result.artifact && typeof result.artifact.id === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(result.artifact.id), 'Exact app artifact required');
  if (request.service.id === 'naeil') {
    assert.equal(result.artifact.sourceRevision, request.release.siteSourceRevision, 'Site observer used package tag instead of reviewed app source');
    assert.equal(result.artifact.platform?.kind, 'vercel-git', 'Existing Git/Vercel provenance required');
    assert(typeof result.artifact.platform.deploymentId === 'string' && result.artifact.platform.deploymentId, 'Exact platform deployment required');
  } else assert.match(result.artifact.sha256, HEX, 'Native immutable artifact digest required');
  assertProduction(result.production, request, result.artifact);
}

function publicSummary(state) {
  return { schemaVersion: 1, scope: 'selected-services', services: IDS, allDiscoveredServicesComplete: false, observedAt: new Date().toISOString(), currentVersion: state.currentVersion, state: state.blocked ? 'blocked' : state.lastState || 'waiting-release', ...(state.blocked ? { blockedRelease: state.blocked.releaseId, blockedService: state.blocked.serviceId || null, reasonCode: state.blocked.reasonCode } : {}), releases: Object.values(state.releases).map(record => ({ version: record.version, releaseId: record.releaseId || null, state: record.state, services: IDS.map(id => ({ id, state: record.services?.[id]?.state || 'not-started', ...(record.services?.[id]?.result?.artifact ? { artifactId: record.services[id].result.artifact.id, sourceRevision: record.services[id].result.artifact.sourceRevision } : {}) })) })) };
}

/** One bounded poll; launchd supplies cadence. Never installs or starts a job. */
export async function poll(config, { github = new GitHub({ repository: config.repository }), invoke = invokeJSON } = {}) {
  validateConfig(config); assertActive(config);
  const unlock = acquireLock(config.stateDirectory);
  const path = join(config.stateDirectory, 'state.json');
  let state;
  const save = () => atomicJSON(path, state);
  const finish = () => { state.observedAt = new Date().toISOString(); save(); const summary = publicSummary(state); atomicJSON(join(config.stateDirectory, 'summary.json'), summary); return summary; };
  try {
    state = existsSync(path) ? readPrivateJSON(path) : { schemaVersion: 1, repository: config.repository, currentVersion: null, releases: {}, createdAt: new Date().toISOString() };
    assert(state.schemaVersion === 1 && state.repository === config.repository, 'Durable state repository/schema mismatch');
    // A process can die after an app accepted work but before output/receipt.
    // That invocation is never retried just because a new poll starts.
    for (const record of Object.values(state.releases)) for (const [id, service] of Object.entries(record.services || {})) if (service.state === 'invoking') { service.state = 'uncertain'; record.state = 'uncertain'; state.blocked = { releaseId: record.releaseId, serviceId: id, reasonCode: 'interrupted-invocation' }; }
    if (state.blocked) return finish();
    let published;
    try { published = await github.releases(); } catch { state.lastState = 'poll-unavailable'; return finish(); }
    const stable = published.filter(item => !item.draft && !item.prerelease && /^v0\.7\.(0|[1-9]\d*)$/.test(item.tag_name) && patch(item.tag_name.slice(1)) >= 1).sort((a, b) => patch(a.tag_name.slice(1)) - patch(b.tag_name.slice(1)));
    // Audit first-seen identity even for completed releases, before selecting a
    // next patch. Replacing an asset/tag cannot silently change past authority.
    for (const record of Object.values(state.releases)) {
      const item = stable.find(value => value.id === record.githubId);
      if (!item || fingerprint(releaseMetadata(item)) !== record.metadataHash || (record.tagSha && await github.tagRevision(item.tag_name) !== record.tagSha)) {
        state.blocked = { releaseId: record.releaseId || record.version, reasonCode: 'published-release-changed' }; record.state = 'blocked'; return finish();
      }
    }
    for (const item of stable) {
      const version = item.tag_name.slice(1);
      if (state.currentVersion && patch(version) <= patch(state.currentVersion)) continue;
      if (patch(version) !== (state.currentVersion ? patch(state.currentVersion) + 1 : 1)) { state.lastState = 'waiting-predecessor'; return finish(); }
      assertActive(config);
      const key = String(item.id);
      let record = state.releases[key];
      if (!record) { record = { githubId: item.id, version, metadataHash: fingerprint(releaseMetadata(item)), state: 'observed', services: {} }; state.releases[key] = record; save(); }
      try {
        const snapshot = await materializeRelease(item, config, github, record);
        const release = snapshot.release, mode = assertPolicyRelease(release, config, state.currentVersion);
        assert(!Object.values(state.releases).some(other => other !== record && (other.releaseId === release.releaseId || other.version === release.version)), 'Duplicate release/version identity');
        record.releaseId = release.releaseId; record.tagSha = snapshot.tagSha;
        const binding = fingerprint({ release, manifestHash: snapshot.manifestHash, automation: config.automation, trustedFiles: config.trustedFiles, executionPath: config.executionPath, policy: config.policy, services: config.services, mode });
        if (record.binding) assert.equal(record.binding, binding, 'Run configuration changed; reconciliation required');
        record.binding = binding; record.mode = mode; save();
        if (mode === 'standing') {
          const checks = await github.workflow(release.sourceRevision, '.github/workflows/verify.yml');
          if (checks.state === 'pending') { record.state = 'waiting-package-ci'; state.lastState = record.state; return finish(); }
          assert.equal(checks.state, 'success', 'Exact package source CI did not pass');
        }
        for (const id of IDS) {
          assertActive(config); assertTrustedFiles(config.trustedFiles);
          const prior = record.services[id];
          if (prior?.state === 'production-verified') {
            // Revalidate all cached evidence before allowing a later consumer.
            assertServiceResult(prior.result, prior.request); continue;
          }
          assert(!prior || prior.state === 'deferred', 'A dispatched failed/uncertain app cannot replay');
          const attemptId = randomUUID();
          const configured = config.services[id], { command, ...service } = configured;
          const directory = join(config.stateDirectory, 'runs', key, id, attemptId); privateDirectory(directory, true);
          const request = { schemaVersion: 1, release, service, policy: config.policy, adapterOptions: service.adapterOptions || {}, trustedFiles: config.trustedFiles, executionPath: config.executionPath, idempotencyKey: `${release.releaseId}:${id}`, attemptId, mode, outputDirectory: directory };
          record.services[id] = { state: 'invoking', attemptId, request, startedAt: new Date().toISOString() };
          record.state = 'running'; save(); // Must precede every child launch.
          let result;
          try { result = await invoke(command, request, directory); assertServiceResult(result, request); }
          catch {
            record.services[id].state = 'uncertain'; record.state = 'uncertain';
            state.blocked = { releaseId: release.releaseId, serviceId: id, reasonCode: 'command-or-result-uncertain' }; return finish();
          }
          Object.assign(record.services[id], { state: result.state, result, completedAt: new Date().toISOString() });
          if (result.state === 'deferred') { record.state = 'deferred'; state.lastState = 'deferred'; return finish(); }
          if (result.state !== 'production-verified') { record.state = 'failed'; state.blocked = { releaseId: release.releaseId, serviceId: id, reasonCode: result.state }; return finish(); }
          save();
        }
        // Completion receipt precedes the global cursor. Interrupted finalizing
        // can consume existing verified receipts, without invoking an app again.
        record.state = 'complete'; record.completedAt = new Date().toISOString();
        atomicJSON(join(config.stateDirectory, 'runs', key, 'receipt.json'), { schemaVersion: 1, scope: 'selected-services', complete: true, allDiscoveredServicesComplete: false, release, binding, mode, services: record.services, completedAt: record.completedAt });
        state.currentVersion = release.version; state.lastState = 'complete'; save();
      } catch (error) {
        if (error instanceof GitHubUnavailable) { record.state = 'release-unavailable'; state.lastState = record.state; return finish(); }
        record.state = 'blocked'; state.blocked = { releaseId: record.releaseId || version, reasonCode: 'release-or-config-validation-failed' }; return finish();
      }
    }
    state.lastState = state.currentVersion ? 'complete' : 'waiting-release'; return finish();
  } finally { unlock(); }
}

export async function main(args = process.argv.slice(2)) {
  const [action, path] = args;
  if (action === 'digest') { console.log(automationDigest(path ? resolve(path) : root)); return; }
  assert(['plan', 'poll'].includes(action) && path, 'Usage: standing-dispatcher.mjs digest [ROOT] | plan|poll PRIVATE_CONFIG');
  const config = loadConfig(resolve(path), root);
  if (action === 'plan') { console.log(JSON.stringify({ schemaVersion: 1, enabled: config.enabled && config.policy.enabled, repository: config.repository, services: IDS, automationSha256: config.automation.sha256, baselineVersion: config.baseline.version, patchWindow: config.policy.patchWindow, scheduled: false })); return; }
  const result = await poll(config); console.log(JSON.stringify(result));
  if (result.state === 'blocked') process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(() => { console.error('Standing dispatcher stopped; inspect private configuration/state and reconcile before retry.'); process.exitCode = 1; });
