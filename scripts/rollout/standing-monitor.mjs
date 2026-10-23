import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { lstatSync } from 'node:fs';
import { basename, isAbsolute, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { assertTrustedFiles, atomicJSON, commandConfig, fingerprint, loadConfig, readPrivateJSON } from './standing-config.mjs';

const exec = promisify(execFile), day = 86400;
const waiting = new Set(['waiting-package-ci', 'deferred', 'waiting-predecessor', 'poll-unavailable', 'release-unavailable', 'stopped']);
const defaults = { staleSeconds: 1200, waitingSeconds: 21600, expiryWarningSeconds: 14 * day, stopWarningSeconds: day, repeatSeconds: day };
const bounds = { staleSeconds: [60, 3600], waitingSeconds: [300, day], expiryWarningSeconds: [day, 30 * day], stopWarningSeconds: [3600, 7 * day], repeatSeconds: [day, 7 * day] };
const safe = value => typeof value === 'string' && /^[A-Za-z0-9._:-]{1,120}$/.test(value) ? value : null;
const timestamp = value => Number.isFinite(Date.parse(value)) ? Date.parse(value) : null;
const iso = time => new Date(time).toISOString();

export function monitorOptions(config) {
  const options = { ...defaults };
  for (const [key, [min, max]] of Object.entries(bounds)) if (config.monitor?.[key] !== undefined) {
    const value = config.monitor[key]; assert(Number.isSafeInteger(value) && value >= min && value <= max, `Monitor ${key} outside safe bounds`); options[key] = value;
  }
  const notifier = config.monitor?.notifier;
  if (notifier) {
    commandConfig(notifier);
    assert(notifier.timeoutMs <= 60000, 'Monitor notifier timeout limited to60seconds');
    for (const path of [notifier.file, ...notifier.args.filter(arg => isAbsolute(arg) && /\.(?:[cm]?js|[cm]?ts|py)$/.test(arg))]) assert(config.trustedFiles?.[path], 'Notifier executable/helper must be trusted');
    assertTrustedFiles(config.trustedFiles);
  }
  return options;
}

function optionalJSON(path) {
  try { return { value: readPrivateJSON(path) }; } catch (error) { return { error: error.code === 'ENOENT' ? 'missing' : 'unreadable' }; }
}

/** Read-only with respect to dispatcher, policy and services. Only monitor-owned
 * receipts are written; no dispatcher locks, markers or service state change. */
export async function monitor(config, { dispatcherExit, now = Date.now(), stderr = line => process.stderr.write(line) } = {}) {
  assert(Number.isSafeInteger(dispatcherExit) && dispatcherExit >= 0 && dispatcherExit <= 255, 'Dispatcher exit0..255 required');
  const options = monitorOptions(config), directory = config.stateDirectory;
  const priorRead = optionalJSON(join(directory, 'monitor.json'));
  assert(!priorRead.error || priorRead.error === 'missing', 'Monitor dedup state unreadable; preserve it for inspection');
  const prior = priorRead.value || { schemaVersion: 1, alerts: {}, waiting: {} };
  assert.equal(prior.schemaVersion, 1, 'Monitor schema1 required');
  const summaryRead = optionalJSON(join(directory, 'summary.json')), stateRead = optionalJSON(join(directory, 'state.json'));
  const summary = summaryRead.value, state = stateRead.value, current = [], seenWaiting = {};
  const add = (code, severity, scope = {}, detail = {}) => current.push({ fingerprint: fingerprint({ code, ...scope }), code, severity, ...scope, ...detail });
  if (priorRead.error !== 'missing' && !prior.alerts) throw Error('Monitor dedup alerts missing');
  if (summaryRead.error || !summary || summary.schemaVersion !== 1 || !timestamp(summary.observedAt)) add('summary-unavailable', 'alert');
  else if (now - timestamp(summary.observedAt) > options.staleSeconds * 1000 || timestamp(summary.observedAt) > now + 60000) add('summary-stale', 'alert', {}, { observedAt: summary.observedAt });
  if (stateRead.error || state?.schemaVersion !== 1) add('state-unavailable', 'alert');
  const blocked = summary?.state === 'blocked' ? summary : state?.blocked ? { blockedRelease: state.blocked.releaseId, blockedService: state.blocked.serviceId, reasonCode: state.blocked.reasonCode } : null;
  if (blocked) add('blocked', 'alert', { blockedRelease: safe(blocked.blockedRelease), service: safe(blocked.blockedService), reasonCode: safe(blocked.reasonCode) });
  if (dispatcherExit !== 0) add('dispatcher-exit', 'alert', {}, { exit: dispatcherExit });
  // Top-level state is the dispatcher's public current status. Release/service
  // states cover a pending receipt even if a newer summary omits its detail.
  const pending = [];
  if (waiting.has(summary?.state)) pending.push({ state: summary.state, since: summary.since });
  for (const record of summary?.releases || []) {
    if (record.state === 'complete') continue;
    if (waiting.has(record.state)) pending.push({ state: record.state, release: safe(record.releaseId || record.version), since: record.since });
    for (const service of record.services || []) if (waiting.has(service.state)) pending.push({ state: service.state, release: safe(record.releaseId || record.version), service: safe(service.id), since: service.since });
  }
  for (const item of pending) {
    const { since, ...scope } = item, key = fingerprint(scope);
    const supplied = timestamp(since), firstSeen = prior.waiting?.[key]?.firstSeen;
    const start = supplied !== null && supplied <= now ? supplied : timestamp(firstSeen) ?? now;
    seenWaiting[key] = { ...scope, firstSeen: iso(start) };
    if (now - start > options.waitingSeconds * 1000) add('long-wait', 'alert', scope, { since: iso(start) });
  }
  for (const [scope, value] of [['policy', config.policy.expiresAt], ['patchWindow', config.policy.patchWindow?.expiresAt]]) {
    const expires = timestamp(value);
    if (expires === null) add('authorization-invalid', 'alert', { scope });
    else if (expires - now <= options.expiryWarningSeconds * 1000) add('authorization-expiry', expires <= now ? 'alert' : 'warning', { scope }, { expiresAt: iso(expires) });
  }
  let stopSince = null;
  try {
    const stat = lstatSync(config.policy.stopFile);
    stopSince = prior.stopSince || iso(Math.min(now, stat.mtimeMs));
    if (now - timestamp(stopSince) > options.stopWarningSeconds * 1000) add('stop-active', 'warning', {}, { since: stopSince });
  } catch (error) { if (error.code !== 'ENOENT') add('stop-unreadable', 'alert'); }
  const records = { ...prior.alerts }, notifications = [];
  for (const alert of current) {
    const old = records[alert.fingerprint];
    const notify = !old || old.clearedAt || (old.severity === 'warning' && alert.severity === 'alert') || now - timestamp(old.lastNotifiedAt) >= options.repeatSeconds * 1000;
    records[alert.fingerprint] = { ...alert, firstSeen: old && !old.clearedAt ? old.firstSeen : iso(now), lastSeen: iso(now), lastNotifiedAt: notify ? iso(now) : old.lastNotifiedAt, notificationCount: (old?.notificationCount || 0) + (notify ? 1 : 0) };
    if (notify) notifications.push(alert);
  }
  const active = new Set(current.map(alert => alert.fingerprint));
  for (const [key, value] of Object.entries(records)) if (!active.has(key) && !value.clearedAt) records[key] = { ...value, clearedAt: iso(now) };
  const payload = { schemaVersion: 1, observedAt: iso(now), alerts: current };
  atomicJSON(join(directory, 'alerts.json'), payload);
  let delivery = prior.delivery || null;
  if (notifications.length) {
    const notificationPath = join(directory, 'monitor-notification.json');
    atomicJSON(notificationPath, { schemaVersion: 1, observedAt: iso(now), alerts: notifications });
    if (config.monitor?.notifier) {
      const command = config.monitor.notifier;
      try {
        await exec(command.file, command.args, { shell: false, timeout: command.timeoutMs, maxBuffer: 64 * 1024, env: { PATH: config.executionPath, NAEIL_STANDING_ALERT_FILE: notificationPath } });
        delivery = { attemptedAt: iso(now), passed: true, count: notifications.length };
      } catch { delivery = { attemptedAt: iso(now), passed: false, reasonCode: 'notifier-failed', count: notifications.length }; }
    } else {
      const name = safe(basename(directory)) || 'state';
      for (const alert of notifications) stderr(`standing-monitor ${name} ${alert.severity} ${alert.code} ${alert.fingerprint}\n`);
      delivery = { attemptedAt: iso(now), passed: true, channel: 'stderr', count: notifications.length };
    }
  }
  atomicJSON(join(directory, 'monitor.json'), { schemaVersion: 1, observedAt: iso(now), alerts: records, waiting: seenWaiting, stopSince, delivery });
  return { ...payload, notifications: notifications.length, delivery };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const [path, flag, exit] = process.argv.slice(2);
    assert(path && flag === '--dispatcher-exit' && /^\d{1,3}$/.test(exit), 'Usage: standing-monitor.mjs CONFIG --dispatcher-exit N');
    await monitor(loadConfig(resolve(path)), { dispatcherExit: Number(exit) });
  } catch { console.error('standing-monitor failed to evaluate; inspect private configuration and monitor receipts'); process.exitCode = 1; }
}
