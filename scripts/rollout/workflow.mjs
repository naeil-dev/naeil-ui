import assert from 'node:assert/strict';
import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { aggregate, assertFrozen, digest, loadInputs, policyGate, runService, validateRelease, validateReleaseEvent } from './rollout.mjs';

const read = path => JSON.parse(readFileSync(path, 'utf8'));
const [action, configDirectory, stateDirectory, serviceId] = process.argv.slice(2);
try {
  assert(['validate-event', 'matrix', 'materialize', 'run-service', 'aggregate'].includes(action) && configDirectory && stateDirectory, 'Usage: workflow.mjs validate-event|matrix|materialize|run-service|aggregate CONFIG_DIR OUTPUT_DIR [SERVICE_ID]');
  const config = resolve(configDirectory); const state = resolve(stateDirectory);
  const { release, registry, policy, adapters } = loadInputs(config); validateRelease(release);
  if (action === 'validate-event') {
    validateReleaseEvent(release, { tag: process.env.RELEASE_TAG, sourceRevision: process.env.RELEASE_SOURCE_SHA });
    console.log(`Published release event matches ${release.releaseId}`);
  } else if (action === 'matrix') {
    const include = [];
    const plan = registry.services.map(service => {
      const adapter = adapters.adapters[service.deployment?.adapterId];
      const gate = policyGate(release, service, policy);
      if (gate.state === 'eligible' && adapter && adapter.enabled !== false && service.origin && service.routes?.length) {
        assert(Array.isArray(adapter.runner) && adapter.runner.length && adapter.runner.every(label => typeof label === 'string' && /^[a-zA-Z0-9._-]+$/.test(label)), 'Reviewed app-owned runner labels required');
        assert(isAbsolute(adapter.stateDirectory || ''), 'Durable app-owned state directory required');
        include.push({ serviceId: service.id, runner: adapter.runner });
      }
      return { serviceId: service.id, adapterConfigured: !!adapter, ...gate };
    });
    mkdirSync(state, { recursive: true }); writeFileSync(join(state, 'plan.json'), JSON.stringify({ releaseId: release.releaseId, services: plan }, null, 2));
    if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `matrix=${JSON.stringify({ include })}\ncount=${include.length}\n`);
    console.log(JSON.stringify({ include, services: plan }, null, 2));
  } else if (action === 'materialize') {
    // This only downloads frozen public inputs. It never runs app commands.
    for (const entry of [release.archive, release.contract]) {
      if (!existsSync(entry.path)) {
        let url = new URL(entry.url); assert.equal(url.protocol, 'https:', 'Frozen download requires HTTPS');
        const origins = new Set([url.origin, ...(entry.downloadOrigins || [])]);
        let response;
        for (let count = 0; count < 6; count++) {
          assert(url.protocol === 'https:' && !url.username && !url.password && origins.has(url.origin), 'Frozen redirect origin must be explicitly allowlisted');
          response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(60000) });
          if (![301, 302, 303, 307, 308].includes(response.status)) break;
          assert(response.headers.get('location'), 'Missing frozen redirect destination');
          url = new URL(response.headers.get('location'), url);
        }
        assert.equal(response.status, 200, `Frozen download failed: ${response.status}`);
        const bytes = Buffer.from(await response.arrayBuffer()); assert.equal(digest(bytes), entry.sha256, 'Frozen download digest mismatch');
        mkdirSync(dirname(entry.path), { recursive: true }); writeFileSync(entry.path, bytes);
      }
      assert.equal(digest(readFileSync(entry.path)), entry.sha256, 'Frozen file digest mismatch');
    }
    assertFrozen(release);
  } else if (action === 'run-service') {
    const service = registry.services.find(item => item.id === serviceId); assert(service, 'Unknown service');
    const adapter = adapters.adapters[service.deployment?.adapterId]; assert(adapter && isAbsolute(adapter.stateDirectory || ''), 'Durable app-owned state directory required');
    let receipt;
    try { receipt = await runService({ release, service, adapter, policy, stateDir: adapter.stateDirectory }); }
    finally {
      const source = join(adapter.stateDirectory, release.releaseId, service.id);
      if (existsSync(source)) { const destination = join(state, release.releaseId, service.id); mkdirSync(dirname(destination), { recursive: true }); cpSync(source, destination, { recursive: true }); }
    }
    console.log(JSON.stringify(receipt, null, 2)); if (receipt.state !== 'production-verified') process.exitCode = 1;
  } else {
    const receipts = [];
    // upload/download-artifact merge-multiple places each service directory here.
    for (const service of registry.services) {
      const candidates = [join(state, release.releaseId, service.id, 'receipt.json'), join(state, service.id, 'receipt.json')];
      const receipt = candidates.find(existsSync); if (receipt) receipts.push(read(receipt));
    }
    const result = aggregate(release, registry, receipts, policy);
    mkdirSync(state, { recursive: true }); writeFileSync(join(state, 'aggregate.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result, null, 2)); if (!result.complete) process.exitCode = 1;
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
