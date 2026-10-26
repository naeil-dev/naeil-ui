import assert from 'node:assert/strict';
import { closeSync, fsyncSync, lstatSync, openSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { atomicJSON, hash, HEX, inactiveState, JSON_LIMITS, privateDirectory, readPrivateBytes, serializeJSON } from './standing-config.mjs';

export { JSON_LIMITS };
export class StandingStorageError extends Error { constructor(cause) { super('Standing storage failed; no dispatch permitted', { cause }); this.code = 'standing-storage-failed'; } }
const entryExists = path => { try { lstatSync(path); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } };
const histories = new WeakMap(), HISTORY = new Set(['history', 'reverifications', 'reverificationAttempts']);
const exact = (value, keys) => assert(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(','), 'Unknown storage fields/type');
function validateValue(value, active = new Set(), depth = 0) {
  assert(depth <= 128, 'JSON nesting exceeds bound');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') { assert(Number.isFinite(value), 'Finite JSON number required'); return; }
  assert(typeof value === 'object' && (Array.isArray(value) || Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null), 'Unsupported JSON value type');
  assert(!active.has(value) && Object.getOwnPropertySymbols(value).length === 0, 'Cyclic/symbol JSON value prohibited'); active.add(value);
  const archived = histories.get(value);
  for (const item of archived ? archived.pending : Array.isArray(value) ? value : Object.values(value)) validateValue(item, active, depth + 1);
  active.delete(value);
}
function freezeHistory(value) {
  if (value && typeof value === 'object' && !histories.has(value)) { for (const child of Object.values(value)) freezeHistory(child); Object.freeze(value); }
  return value;
}
const syncDirectory = directory => { const fd = openSync(directory, 'r'); try { fsyncSync(fd); } finally { closeSync(fd); } };

// JSON.parse silently discards duplicate names. Scan the grammar first, with a
// depth bound, so neither a duplicate binding nor prototype key can be hidden.
export function parseStandingJSON(bytes) {
  const text = bytes.toString('utf8'); let i = 0;
  const ws = () => { while (/\s/.test(text[i] || '') && i < text.length) i++; };
  function string() { const start = i++; while (i < text.length) { const c = text[i++]; if (c === '\\') i++; else if (c === '"') return JSON.parse(text.slice(start, i)); } throw Error('Invalid JSON string'); }
  function value(depth = 0) {
    assert(depth <= 128, 'JSON nesting exceeds bound'); ws();
    if (text[i] === '"') { string(); return; }
    if (text[i] === '{' || text[i] === '[') {
      const object = text[i++] === '{', end = object ? '}' : ']', keys = new Set(); ws();
      if (text[i] === end) { i++; return; }
      while (i < text.length) {
        if (object) { assert(text[i] === '"', 'Invalid JSON key'); const key = string(); assert(!keys.has(key), 'Duplicate JSON key'); keys.add(key); ws(); assert(text[i++] === ':', 'Invalid JSON object'); }
        value(depth + 1); ws(); if (text[i] === end) { i++; return; } assert(text[i++] === ',', 'Invalid JSON separator'); ws();
      }
      throw Error('Unterminated JSON');
    }
    const start = i; while (i < text.length && !/[\s,}\]]/.test(text[i])) i++; assert(i > start, 'Invalid JSON value'); JSON.parse(text.slice(start, i));
  }
  value(); ws(); assert.equal(i, text.length, 'Trailing JSON bytes'); return JSON.parse(text);
}
const readJSON = (path, limit) => parseStandingJSON(readPrivateBytes(path, limit));
function assertReference(ref) {
  exact(ref, ['path', 'sha256', 'bytes']);
  assert(typeof ref.path === 'string' && /^evidence\/[a-f0-9]{64}\.json$/.test(ref.path) && HEX.test(ref.sha256) && ref.path === `evidence/${ref.sha256}.json`, 'Unsafe evidence reference');
  assert(Number.isSafeInteger(ref.bytes) && ref.bytes > 0 && ref.bytes <= JSON_LIMITS.evidence, 'Invalid reference byte bound');
}
function readNode(directory, ref) {
  assertReference(ref); privateDirectory(join(directory, 'evidence'));
  const bytes = readPrivateBytes(join(directory, ref.path), JSON_LIMITS.evidence);
  assert.equal(bytes.length, ref.bytes, 'Evidence size changed'); assert.equal(hash(bytes), ref.sha256, 'Evidence digest changed');
  const node = parseStandingJSON(bytes); assert.equal(node.schemaVersion, 1, 'Unsupported evidence schema'); return node;
}
function putNode(directory, node) {
  const bytes = serializeJSON({ schemaVersion: 1, ...node }, JSON_LIMITS.evidence), sha256 = hash(bytes);
  const ref = { path: `evidence/${sha256}.json`, sha256, bytes: bytes.length }, path = join(directory, ref.path);
  if (entryExists(path)) { readNode(directory, ref); return ref; }
  // Exclusive creation: immutable objects are never replaced. Partial writes
  // remain preserved and fail digest validation on a later attempt.
  const fd = openSync(path, 'wx', 0o600);
  try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); }
  syncDirectory(join(directory, 'evidence')); return ref;
}
function historyPage(directory, ref) {
  const node = readNode(directory, ref); exact(node, ['schemaVersion', 'type', 'previous', 'entries', 'count']);
  assert.equal(node.type, 'history-page', 'History page type required');
  assert(Array.isArray(node.entries) && node.entries.length > 0 && node.entries.length <= 32 && Number.isSafeInteger(node.count) && node.count >= node.entries.length, 'Invalid history page');
  assert(node.previous === null || (node.previous && typeof node.previous === 'object'), 'Invalid previous history reference');
  node.entries.forEach(assertReference); if (node.previous) assertReference(node.previous); else assert.equal(node.count, node.entries.length, 'History count mismatch');
  return node;
}
function historyArray(directory, descriptor) {
  exact(descriptor, ['schemaVersion', 'type', 'tail', 'count']);
  assert(Number.isSafeInteger(descriptor.count) && descriptor.count >= 0 && (!!descriptor.tail === (descriptor.count > 0)), 'Invalid history descriptor');
  assert(descriptor.tail === null || (descriptor.tail && typeof descriptor.tail === 'object'), 'Invalid history tail');
  if (descriptor.tail) { assertReference(descriptor.tail); assert.equal(historyPage(directory, descriptor.tail).count, descriptor.count, 'History count mismatch'); }
  const meta = { directory, tail: descriptor.tail, count: descriptor.count, pending: [] }, pages = new Map();
  const pageAt = ref => { if (!pages.has(ref.sha256)) pages.set(ref.sha256, historyPage(directory, ref)); return pages.get(ref.sha256); };
  const item = index => {
    if (index >= meta.count) return meta.pending[index - meta.count];
    let ref = meta.tail, expected = meta.count;
    while (ref) {
      const page = pageAt(ref); assert.equal(page.count, expected, 'Broken history sequence');
      const start = page.count - page.entries.length;
      if (index >= start) return freezeHistory(decode(directory, page.entries[index - start]));
      expected = start; ref = page.previous;
    }
    throw Error('Missing history item');
  };
  const proxy = new Proxy([], { get(target, key) {
    if (key === 'length') return meta.count + meta.pending.length;
    if (key === 'push') return (...values) => { meta.pending.push(...values); return meta.count + meta.pending.length; };
    if (key === 'at') return index => { const length = meta.count + meta.pending.length; index = Number(index); if (index < 0) index += length; return index < 0 || index >= length ? undefined : item(index); };
    if (key === Symbol.iterator) return function* () { for (let n = 0; n < meta.count + meta.pending.length; n++) yield item(n); };
    if (typeof key === 'string' && /^(0|[1-9]\d*)$/.test(key)) return item(Number(key));
    return Reflect.get(target, key);
  }, has(target, key) { if (typeof key === 'string' && /^(0|[1-9]\d*)$/.test(key)) return Number(key) < meta.count + meta.pending.length; return Reflect.has(target, key); }, set() { throw Error('Historical arrays are append-only'); } });
  histories.set(proxy, meta); return proxy;
}
function encodeHistory(directory, array) {
  const old = histories.get(array);
  if (old) assert.equal(old.directory, directory, 'History belongs to another epoch');
  let tail = old?.tail || null, count = old?.count || 0;
  const values = old ? old.pending : array;
  for (let start = 0; start < values.length; start += 32) {
    const entries = values.slice(start, start + 32).map(value => encode(directory, value)); count += entries.length;
    tail = putNode(directory, { type: 'history-page', previous: tail, entries, count });
  }
  return putNode(directory, { type: 'history', tail, count });
}
function fitsInline(value) {
  let remaining = 32768;
  function count(value, key = '') {
    if (histories.has(value) || (HISTORY.has(key) && Array.isArray(value))) return false;
    if (value === null || typeof value !== 'object') {
      if (typeof value === 'string' && value.length > remaining) return false;
      remaining -= JSON.stringify(value).length + 1; return remaining >= 0;
    }
    const entries = Object.entries(value); if (entries.length > 64) return false;
    remaining -= 2;
    for (const [name, item] of entries) {
      remaining -= JSON.stringify(name).length + 2;
      if (remaining < 0 || !count(item, name)) return false;
    }
    return remaining >= 0;
  }
  return count(value);
}
function putPages(directory, type, references) {
  while (references.length > 64) references = Array.from({ length: Math.ceil(references.length / 64) }, (_, n) => putNode(directory, { type, pages: references.slice(n * 64, (n + 1) * 64) }));
  return putNode(directory, { type, pages: references });
}
function encode(directory, value, key = '') {
  if (Array.isArray(value) && (HISTORY.has(key) || histories.has(value))) return encodeHistory(directory, value);
  if (fitsInline(value)) return putNode(directory, { type: 'json', value });
  // Keep payloads bounded and make histories independently paged even when the
  // containing object would fit inline. Small leaf JSON stays readable on disk.
  if (value === null || typeof value !== 'object') return putNode(directory, { type: 'json', value });
  if (Array.isArray(value)) {
    if (value.length > 64) return putPages(directory, 'array-pages', Array.from({ length: Math.ceil(value.length / 64) }, (_, n) => encode(directory, value.slice(n * 64, (n + 1) * 64))));
    return putNode(directory, { type: 'array', entries: value.map(item => encode(directory, item)) });
  }
  const entries = Object.entries(value);
  if (entries.length > 64) return putPages(directory, 'object-pages', Array.from({ length: Math.ceil(entries.length / 64) }, (_, n) => encode(directory, Object.fromEntries(entries.slice(n * 64, (n + 1) * 64)))));
  return putNode(directory, { type: 'object', entries: entries.map(([name, item]) => [name, encode(directory, item, name)]) });
}
function decode(directory, ref, depth = 0) {
  assert(depth < 128, 'Evidence nesting exceeds bound');
  const node = readNode(directory, ref), next = ref => decode(directory, ref, depth + 1);
  if (node.type === 'json') { exact(node, ['schemaVersion', 'type', 'value']); return node.value; }
  if (node.type === 'history') return historyArray(directory, node);
  if (node.type === 'array' || node.type === 'object') {
    exact(node, ['schemaVersion', 'type', 'entries']); assert(Array.isArray(node.entries) && node.entries.length <= 64, 'Invalid evidence entries');
    if (node.type === 'array') return node.entries.map(next);
    const result = {}, keys = new Set();
    for (const entry of node.entries) { assert(Array.isArray(entry) && entry.length === 2 && typeof entry[0] === 'string' && !keys.has(entry[0]), 'Duplicate/invalid object key'); keys.add(entry[0]); Object.defineProperty(result, entry[0], { value: next(entry[1]), enumerable: true, writable: true, configurable: true }); }
    return result;
  }
  if (node.type === 'array-pages' || node.type === 'object-pages') {
    exact(node, ['schemaVersion', 'type', 'pages']); assert(Array.isArray(node.pages) && node.pages.length > 0 && node.pages.length <= 64, 'Invalid catalog pages');
    const refs = new Set(), result = node.type === 'array-pages' ? [] : {};
    for (const ref of node.pages) { assertReference(ref); assert(node.type === 'array-pages' || !refs.has(ref.path), 'Duplicate catalog reference'); refs.add(ref.path); const page = next(ref);
      if (Array.isArray(result)) { assert(Array.isArray(page), 'Invalid array page'); result.push(...page); }
      else { assert(page && typeof page === 'object' && !Array.isArray(page), 'Invalid object page'); for (const [key, value] of Object.entries(page)) { assert(!Object.hasOwn(result, key), 'Duplicate catalog key'); Object.defineProperty(result, key, { value, enumerable: true, configurable: true, writable: true }); } }
    } return result;
  }
  throw Error('Unknown evidence type');
}
function readIntent(directory) {
  const value = readJSON(join(directory, 'pending-intent.json'), JSON_LIMITS.controlIndex);
  exact(value, ['schemaVersion', 'intents']); assert(value.schemaVersion === 1 && Array.isArray(value.intents) && value.intents.length > 0, 'Invalid pending intent schema');
  const seen = new Set();
  for (const intent of value.intents) {
    exact(intent, ['releaseId', 'serviceId', 'kind', 'attemptId', 'requestSha256']);
    assert(typeof intent.releaseId === 'string' && ['naeil', 'estimate', 'jev'].includes(intent.serviceId) && ['rollout', 'verify'].includes(intent.kind) && typeof intent.attemptId === 'string' && intent.attemptId.length > 0 && HEX.test(intent.requestSha256), 'Invalid bound pending intent');
    const key = `${intent.releaseId}:${intent.serviceId}:${intent.kind}`; assert(!seen.has(key), 'Duplicate intent reference'); seen.add(key);
  }
  return value;
}
function readRoot(directory) {
  privateDirectory(directory);
  const root = readJSON(join(directory, 'state.json'), JSON_LIMITS.controlIndex);
  exact(root, ['schemaVersion', 'encodingVersion', 'epochId', 'state', 'legacy', 'observation']);
  assert(root.schemaVersion === 2 && root.encodingVersion === 1 && /^[A-Za-z0-9_-]{1,100}$/.test(root.epochId), 'Unsupported standing state encoding/schema');
  assertReference(root.state);
  exact(root.observation, ['observedAt', 'lastState', 'blocked']);
  assert(root.observation.observedAt === null || (typeof root.observation.observedAt === 'string' && Number.isFinite(Date.parse(root.observation.observedAt))), 'Invalid observation date');
  assert(root.observation.lastState === null || typeof root.observation.lastState === 'string', 'Invalid observation status');
  if (root.legacy !== null) {
    exact(root.legacy, ['evidenceRoot', 'inventory', 'sourceSha256']);
    assert(typeof root.legacy.evidenceRoot === 'string' && isAbsolute(root.legacy.evidenceRoot) && resolve(root.legacy.evidenceRoot) === root.legacy.evidenceRoot && HEX.test(root.legacy.sourceSha256), 'Invalid legacy evidence root');
    assertReference(root.legacy.inventory);
  }
  return root;
}
export function readStandingState(directory, { allowLegacy = false } = {}) {
  privateDirectory(directory);
  const path = join(directory, 'state.json');
  assert(!entryExists(join(directory, 'import-incomplete.json')), 'Offline import incomplete; execution prohibited');
  if (!entryExists(path)) { assert(!entryExists(join(directory, 'pending-intent.json')), 'Orphan invocation intent; execution prohibited'); return null; }
  // Legacy reads are explicitly bounded and never write/import on demand.
  const prefix = readJSON(path, allowLegacy ? JSON_LIMITS.evidence : JSON_LIMITS.controlIndex);
  if (prefix.schemaVersion === 1) { assert(allowLegacy, 'Legacy state requires explicit offline import'); return prefix; }
  const root = readRoot(directory), state = decode(directory, root.state);
  validateValue(state);
  assert(state.schemaVersion === 1 && state.releases && !Array.isArray(state.releases), 'Invalid dispatcher state');
  if (entryExists(join(directory, 'pending-intent.json'))) Object.defineProperty(state, 'storageIntents', { value: readIntent(directory), enumerable: false });
  return state;
}
function intentsFor(state) {
  const intents = [];
  for (const record of Object.values(state.releases)) for (const [serviceId, service] of Object.entries(record.services || {})) {
    for (const [kind, attempt] of [['rollout', service.state === 'invoking' ? service : null], ['verify', service.verificationIntent]]) if (attempt) {
      assert(attempt.request && typeof attempt.request.attemptId === 'string', 'Bound invocation request required');
      serializeJSON(attempt.request, JSON_LIMITS.transport);
      intents.push({ releaseId: record.releaseId, serviceId, kind, attemptId: attempt.request.attemptId, requestSha256: hash(serializeJSON(attempt.request)) });
    }
  }
  return intents;
}
export function writeStandingState(directory, state) {
  try {
    validateValue(state);
    privateDirectory(directory); assert(state.schemaVersion === 1 && state.releases && !Array.isArray(state.releases), 'Invalid dispatcher state');
    const path = join(directory, 'state.json'), old = entryExists(path) ? readRoot(directory) : null;
    const observation = { observedAt: state.observedAt || null, lastState: state.lastState || null, blocked: state.blocked || null };
    const index = { schemaVersion: 2, encodingVersion: 1, epochId: old?.epochId || 'initial', state: { path: `evidence/${'0'.repeat(64)}.json`, sha256: '0'.repeat(64), bytes: 1 }, legacy: old?.legacy || null, observation };
    serializeJSON(index, JSON_LIMITS.controlIndex);
    const intents = intentsFor(state), marker = join(directory, 'pending-intent.json');
    // This marker binds the exact request before any invoking evidence/index is
    // written. A crash on either side of root replacement cannot enable replay.
    if (intents.length) atomicJSON(marker, { schemaVersion: 1, intents }, JSON_LIMITS.controlIndex);
    privateDirectory(join(directory, 'evidence'), true);
    index.state = encode(directory, state);
    atomicJSON(path, index, JSON_LIMITS.controlIndex);
    if (!intents.length && entryExists(marker)) { unlinkSync(marker); syncDirectory(directory); }
    return index;
  } catch (cause) { throw new StandingStorageError(cause); }
}

function contained(root, path) {
  assert(typeof path === 'string' && isAbsolute(path) && resolve(path) === path, 'Canonical absolute evidence path required');
  const rel = relative(root, path); assert(rel && !rel.startsWith('../') && !isAbsolute(rel), 'Evidence path escape'); return rel;
}
export function assertEvidencePath(config, path) {
  const root = readRoot(config.stateDirectory);
  const current = join(config.stateDirectory, 'runs');
  if (path.startsWith(current + '/')) { contained(current, path); readPrivateBytes(path, JSON_LIMITS.evidence); return path; }
  assert(root.legacy, 'Evidence is outside current epoch');
  exact(root.legacy, ['evidenceRoot', 'inventory', 'sourceSha256']); privateDirectory(root.legacy.evidenceRoot);
  const rel = contained(root.legacy.evidenceRoot, path), inventory = decode(config.stateDirectory, root.legacy.inventory);
  assert(inventory.schemaVersion === 1 && Array.isArray(inventory.files), 'Invalid legacy inventory');
  const seen = new Set(); let expected;
  for (const item of inventory.files) { exact(item, ['path', 'sha256', 'bytes']); assert(!seen.has(item.path), 'Duplicate inventory reference'); seen.add(item.path); assert.equal(contained(root.legacy.evidenceRoot, join(root.legacy.evidenceRoot, item.path)), item.path, 'Noncanonical inventory path'); if (item.path === rel) expected = item; }
  assert(expected && HEX.test(expected.sha256) && expected.bytes <= JSON_LIMITS.evidence, 'Evidence not in exact legacy inventory');
  const bytes = readPrivateBytes(path, JSON_LIMITS.evidence); assert.equal(bytes.length, expected.bytes, 'Legacy evidence size changed'); assert.equal(hash(bytes), expected.sha256, 'Legacy evidence digest changed'); return path;
}
export function importLegacyState({ sourcePath, expectedSha256, destination, epochId, evidenceRoot }) {
  assert(HEX.test(expectedSha256) && /^[A-Za-z0-9_-]{1,100}$/.test(epochId), 'Exact source hash/epoch required');
  const bytes = readPrivateBytes(sourcePath, JSON_LIMITS.offlineLegacy); assert.equal(hash(bytes), expectedSha256, 'Legacy source digest mismatch');
  const state = parseStandingJSON(bytes); validateValue(state); assert(state.schemaVersion === 1 && state.releases && typeof state.releases === 'object' && !Array.isArray(state.releases), 'Legacy schema1 required');
  privateDirectory(evidenceRoot);
  assert(isAbsolute(destination) && resolve(destination) === destination && destination !== evidenceRoot && !destination.startsWith(evidenceRoot + '/'), 'Separate canonical destination required');
  if (entryExists(destination)) { privateDirectory(destination); assert.equal(readdirSync(destination).length, 0, 'Offline import requires empty destination'); }
  const files = new Map();
  function add(path, optional = false, expectedSha256) {
    const rel = contained(evidenceRoot, path);
    if (optional && !entryExists(path)) return;
    const data = readPrivateBytes(path, JSON_LIMITS.evidence); if (expectedSha256 !== undefined) { assert(HEX.test(expectedSha256), 'Invalid old evidence digest'); assert.equal(hash(data), expectedSha256, 'Old evidence digest changed'); } files.set(rel, { path: rel, sha256: hash(data), bytes: data.length });
  }
  function visit(value) {
    if (!value || typeof value !== 'object') return;
    for (const [key, item] of Object.entries(value)) {
      if ((key === 'referencePath' || (key === 'path' && Object.hasOwn(value, 'sha256'))) && typeof item === 'string' && isAbsolute(item)) add(item, false, key === 'path' ? value.sha256 : undefined);
      if (key === 'outputDirectory' && typeof item === 'string') { if (item !== evidenceRoot) contained(evidenceRoot, item); privateDirectory(item); for (const file of ['input.json', 'output.json', 'invocation/input.json', 'invocation/output.json']) add(join(item, file), true); }
      visit(item);
    }
  }
  visit(state);
  const inventory = { schemaVersion: 1, files: [...files.values()].sort((a, b) => a.path.localeCompare(b.path)) };
  privateDirectory(destination, true); privateDirectory(join(destination, 'evidence'), true);
  atomicJSON(join(destination, 'import-incomplete.json'), { schemaVersion: 1, sourceSha256: expectedSha256, epochId }, JSON_LIMITS.controlIndex);
  // Preserve exact source bytes as an offline-only snapshot, never a poll input.
  const fd = openSync(join(destination, 'legacy-source.json'), 'wx', 0o600); try { writeFileSync(fd, bytes); fsyncSync(fd); } finally { closeSync(fd); } syncDirectory(destination);
  const index = writeStandingState(destination, state); index.epochId = epochId;
  index.legacy = { evidenceRoot, inventory: encode(destination, inventory), sourceSha256: expectedSha256 };
  atomicJSON(join(destination, 'state.json'), index, JSON_LIMITS.controlIndex);
  const manifest = { schemaVersion: 1, oldSha256: expectedSha256, oldBytes: bytes.length, newIndexSha256: hash(readPrivateBytes(join(destination, 'state.json'), JSON_LIMITS.controlIndex)), evidenceInventorySha256: index.legacy.inventory.sha256, epochId };
  atomicJSON(join(destination, 'import-manifest.json'), manifest, JSON_LIMITS.controlIndex); unlinkSync(join(destination, 'import-incomplete.json')); syncDirectory(destination); return manifest;
}
export function readOperatorStatus(config) {
  privateDirectory(config.stateDirectory);
  let stopActive = false; try { lstatSync(config.policy.stopFile); stopActive = true; } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const authorizationState = config.enabled !== true || config.policy.enabled !== true ? 'disabled' : !(Date.parse(config.policy.expiresAt) > Date.now()) ? 'authorization-expired' : 'authorized';
  const result = { schemaVersion: 1, observedAt: new Date().toISOString(), intent: stopActive ? 'stopped' : inactiveState(config) || 'running', stopActive, authorizationState, stateError: null, blocked: null };
  const path = join(config.stateDirectory, 'state.json');
  try {
    const root = readRoot(config.stateDirectory); result.blocked = root.observation?.blocked || null;
    readNode(config.stateDirectory, root.state); // root payload only, no catalog/history hydration
    if (entryExists(join(config.stateDirectory, 'import-incomplete.json'))) result.stateError = 'state-unreadable';
    const priorPath = join(config.stateDirectory, 'operator-status.json');
    if (entryExists(priorPath)) {
      const prior = readJSON(priorPath, JSON_LIMITS.operatorStatus);
      // A full reader may have found a deeper payload error. Retain it until a
      // later successful poll replaces operator-status after root persistence.
      if (prior.schemaVersion === 1 && ['state-unreadable', 'state-too-large', 'state-missing'].includes(prior.stateError) && prior.stateIndexSha256 === hash(readPrivateBytes(path, JSON_LIMITS.controlIndex))) result.stateError = prior.stateError;
    }
    result.stateIndexSha256 = hash(readPrivateBytes(path, JSON_LIMITS.controlIndex));
  }
  catch (error) {
    if (error.code === 'ENOENT' && !entryExists(path)) result.stateError = 'state-missing';
    else { let tooLarge = false; try { tooLarge = lstatSync(path).size > JSON_LIMITS.controlIndex; } catch {} result.stateError = tooLarge ? 'state-too-large' : 'state-unreadable'; }
  }
  if (entryExists(path)) { try { result.stateIndexSha256 = hash(readPrivateBytes(path, JSON_LIMITS.controlIndex)); } catch {} }
  return result;
}

// Files form a directory catalog of immutable bounded pages; monitor.json keeps
// only active alerts plus twenty recently cleared entries, never a growing list.
export function archiveMonitorHistory(directory, entries) {
  const archive = privateDirectory(join(directory, 'monitor-history'), true);
  for (let i = 0; i < entries.length; i += 20) {
    const page = { schemaVersion: 1, type: 'cleared-alerts', entries: entries.slice(i, i + 20) }, bytes = serializeJSON(page, JSON_LIMITS.monitor);
    const path = join(archive, hash(bytes) + '.json');
    if (entryExists(path)) assert.equal(hash(readPrivateBytes(path, JSON_LIMITS.monitor)), hash(bytes), 'Monitor archive changed');
    else atomicJSON(path, page, JSON_LIMITS.monitor);
  }
}

/** Bounded immutable snapshot references for completion receipts and later tasks. */
export function writeStandingEvidence(directory, value) {
  try { privateDirectory(directory); privateDirectory(join(directory, 'evidence')); validateValue(value); return encode(directory, value); }
  catch (cause) { throw new StandingStorageError(cause); }
}
export function readStandingEvidence(directory, reference) { privateDirectory(directory); return decode(directory, reference); }
