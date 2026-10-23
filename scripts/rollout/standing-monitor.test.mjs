import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { atomicJSON, hash, readPrivateJSON } from './standing-config.mjs';
import { monitor, monitorOptions } from './standing-monitor.mjs';

const day = 86400000, now = Date.parse('2026-10-23T12:00:00Z');
function fixture(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'standing-monitor-'))); chmodSync(root, 0o700);
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const config = { stateDirectory: root, executionPath: '/usr/bin:/bin', trustedFiles: {}, policy: { expiresAt: new Date(now + 30 * day).toISOString(), patchWindow: { expiresAt: new Date(now + 30 * day).toISOString() }, stopFile: join(root, 'STOP') } };
  const lines = [], summary = (value = {}, time = now) => atomicJSON(join(root, 'summary.json'), { schemaVersion: 1, observedAt: new Date(time).toISOString(), state: 'waiting-release', releases: [], ...value });
  summary(); atomicJSON(join(root, 'state.json'), { schemaVersion: 1, releases: {} });
  const run = (time = now, exit = 0) => monitor(config, { dispatcherExit: exit, now: time, stderr: line => lines.push(line) });
  return { root, config, lines, summary, run, receipt: () => readPrivateJSON(join(root, 'monitor.json')) };
}
const codes = result => result.alerts.map(alert => alert.code);

test('complete healthy poll emits nothing, preserves dispatcher files and writes0600 receipts', async t => {
  const f = fixture(t); f.summary({ state: 'complete' });
  const before = ['summary.json', 'state.json'].map(name => readFileSync(join(f.root, name), 'utf8'));
  assert.deepEqual(codes(await f.run()), []); assert.equal(f.lines.length, 0);
  for (const name of ['monitor.json', 'alerts.json']) assert.equal(statSync(join(f.root, name)).mode & 0o777, 0o600);
  assert.deepEqual(['summary.json', 'state.json'].map(name => readFileSync(join(f.root, name), 'utf8')), before);
});

test('blocked summary includes bounded release/service/reason and dispatcher exit is independent', async t => {
  const f = fixture(t); f.summary({ state: 'blocked', blockedRelease: 'ui-synthetic', blockedService: 'estimate', reasonCode: 'gate-failed' });
  const result = await f.run(now, 1), blocked = result.alerts.find(alert => alert.code === 'blocked');
  assert.deepEqual(codes(result), ['blocked', 'dispatcher-exit']);
  assert.equal(blocked.blockedRelease, 'ui-synthetic'); assert.equal(blocked.service, 'estimate'); assert.equal(blocked.reasonCode, 'gate-failed');
  assert(f.lines.every(line => line.length < 240 && !line.includes(f.root) && !line.includes('ui-synthetic')));
});

test('missing/unreadable summary, missing state and stale observation raise alerts', async t => {
  const f = fixture(t); rmSync(join(f.root, 'summary.json'));
  assert(codes(await f.run()).includes('summary-unavailable'));
  writeFileSync(join(f.root, 'summary.json'), '{broken', { mode: 0o600 });
  assert(codes(await f.run()).includes('summary-unavailable'));
  f.summary({}, now - 1200001); assert(codes(await f.run()).includes('summary-stale'));
  f.summary({}, now - 1200000); assert(!codes(await f.run()).includes('summary-stale'));
  rmSync(join(f.root, 'state.json')); assert(codes(await f.run()).includes('state-unavailable'));
});

test('durable blocked state is noticed even if a fresh summary has not been written', async t => {
  const f = fixture(t); atomicJSON(join(f.root, 'state.json'), { schemaVersion: 1, blocked: { releaseId: 'synthetic', serviceId: 'jev', reasonCode: 'interrupted-invocation' } });
  assert(codes(await f.run()).includes('blocked'));
});

test('each non-complete waiting state ages beyond6hours using summary since', async t => {
  for (const state of ['waiting-package-ci', 'deferred', 'waiting-predecessor', 'poll-unavailable', 'release-unavailable', 'stopped']) {
    const f = fixture(t); f.summary({ state, since: new Date(now - 21600001).toISOString() });
    const alert = (await f.run()).alerts.find(alert => alert.code === 'long-wait'); assert.equal(alert.state, state);
  }
});

test('first-seen waiting timers survive polls, clear on completion and restart for new waits', async t => {
  const f = fixture(t); f.summary({ state: 'deferred' }); assert(!codes(await f.run()).includes('long-wait'));
  const later = now + 21600001; f.summary({ state: 'deferred' }, later);
  assert(codes(await f.run(later)).includes('long-wait'));
  f.summary({ state: 'complete' }, later); await f.run(later);
  assert.deepEqual(f.receipt().waiting, {});
  f.summary({ state: 'deferred' }, later + 1); assert(!codes(await f.run(later + 1)).includes('long-wait'));
});

test('pending release/service entries are covered and completed release entries are ignored', async t => {
  const f = fixture(t), since = new Date(now - day).toISOString();
  f.summary({ state: 'waiting-release', releases: [{ releaseId: 'synthetic', state: 'deferred', since, services: [{ id: 'naeil', state: 'deferred', since }] }, { releaseId: 'old', state: 'complete', services: [{ id: 'jev', state: 'deferred', since }] }] });
  const waits = (await f.run()).alerts.filter(alert => alert.code === 'long-wait'); assert.equal(waits.length, 2); assert(!waits.some(alert => alert.release === 'old'));
});

test('both authorization scopes warn within14days and escalate immediately on expiry', async t => {
  const f = fixture(t);
  f.config.policy.expiresAt = f.config.policy.patchWindow.expiresAt = new Date(now + day).toISOString();
  let result = await f.run(); assert.equal(result.notifications, 2); assert(result.alerts.every(alert => alert.severity === 'warning'));
  f.summary({}, now + day); result = await f.run(now + day); assert.equal(result.notifications, 2); assert(result.alerts.every(alert => alert.severity === 'alert'));
  assert.deepEqual(result.alerts.map(alert => alert.scope), ['policy', 'patchWindow']);
  assert.equal((await f.run(now + day + 1)).notifications, 0);
});

test('severity escalation bypasses24hour dedup; persistent alerts repeat at most daily and record clearing', async t => {
  const f = fixture(t); f.config.policy.expiresAt = new Date(now + 1000).toISOString();
  const first = await f.run(); assert.equal(first.notifications, 1); const key = first.alerts[0].fingerprint;
  assert.equal((await f.run(now + 500)).notifications, 0);
  assert.equal((await f.run(now + 1001)).notifications, 1);
  f.summary({}, now + day); assert.equal((await f.run(now + day)).notifications, 0);
  f.summary({}, now + day + 1001); assert.equal((await f.run(now + day + 1001)).notifications, 1);
  f.config.policy.expiresAt = new Date(now + 30 * day).toISOString(); f.summary({}, now + day + 1002);
  assert.equal((await f.run(now + day + 1002)).alerts.length, 0); assert(f.receipt().alerts[key].clearedAt);
  f.config.policy.expiresAt = new Date(now).toISOString(); assert.equal((await f.run(now + day + 1003)).notifications, 1);
});

test('STOP warns only after24hours, remains deduplicated and clears when removed', async t => {
  const f = fixture(t); writeFileSync(f.config.policy.stopFile, '', { mode: 0o600 }); utimesSync(f.config.policy.stopFile, now / 1000, now / 1000);
  assert(!codes(await f.run()).includes('stop-active'));
  f.summary({}, now + day + 1); assert(codes(await f.run(now + day + 1)).includes('stop-active'));
  rmSync(f.config.policy.stopFile); assert(!codes(await f.run(now + day + 2)).includes('stop-active'));
});

test('optional pinned notifier receives only the payload path; failure is recorded without child output', async t => {
  const f = fixture(t), script = join(f.root, 'notifier.mjs'), marker = join(f.root, 'notified.json');
  writeFileSync(script, `import { readFileSync, writeFileSync } from 'node:fs'; writeFileSync(process.argv[2], JSON.stringify({ payload: JSON.parse(readFileSync(process.env.NAEIL_STANDING_ALERT_FILE)), secret: process.env.GH_TOKEN || null }));`);
  f.config.trustedFiles = { [process.execPath]: hash(readFileSync(process.execPath)), [script]: hash(readFileSync(script)) };
  f.config.monitor = { notifier: { file: process.execPath, args: [script, marker], timeoutMs: 2000 } };
  const old = process.env.GH_TOKEN; process.env.GH_TOKEN = 'synthetic-not-forwarded'; t.after(() => { if (old === undefined) delete process.env.GH_TOKEN; else process.env.GH_TOKEN = old; });
  const result = await f.run(now, 1); assert.equal(result.delivery.passed, true); assert(existsSync(marker));
  const received = JSON.parse(readFileSync(marker)); assert.equal(received.secret, null); assert.equal(received.payload.alerts[0].code, 'dispatcher-exit'); assert.equal(f.lines.length, 0);
  writeFileSync(script, 'throw Error("synthetic-private-child-output");'); f.config.trustedFiles[script] = hash(readFileSync(script));
  f.summary({}, now + day); const failed = await f.run(now + day, 1); assert.equal(failed.delivery.passed, false); assert.equal(f.receipt().delivery.reasonCode, 'notifier-failed');
  assert(!JSON.stringify(f.receipt()).includes('synthetic-private-child-output'));
});

test('monitor rejects unsafe thresholds, shell/untrusted notifier and malformed exit', async t => {
  const f = fixture(t);
  for (const [key, value] of Object.entries({ staleSeconds: 1, waitingSeconds: 99999999, expiryWarningSeconds: 0, stopWarningSeconds: -1, repeatSeconds: 86399 })) {
    f.config.monitor = { [key]: value }; assert.throws(() => monitorOptions(f.config));
  }
  f.config.monitor = { staleSeconds: 60, waitingSeconds: 300, expiryWarningSeconds: 86400, stopWarningSeconds: 3600, repeatSeconds: 86400 }; assert.equal(monitorOptions(f.config).staleSeconds, 60);
  f.config.monitor = { notifier: { file: '/bin/sh', args: [], timeoutMs: 1000 } }; assert.throws(() => monitorOptions(f.config));
  f.config.monitor.notifier.file = process.execPath; assert.throws(() => monitorOptions(f.config), /trusted/);
  delete f.config.monitor; await assert.rejects(f.run(now, -1));
});
