/** Read-only schema1/schema2 standing evidence decoder for local handoff.
 * No state, import, rebind or monitor writers are retained. */
import assert from 'node:assert/strict';
import { lstatSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { hash, HEX, JSON_LIMITS, privateDirectory, readPrivateBytes } from './rollout-io.mjs';

export { JSON_LIMITS };
const entryExists = path => { try { lstatSync(path); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } };
const histories = new WeakMap();
// The historical evidence node's `value` reserves one JSON depth level.
const MAX_JSON_DEPTH = 128, MAX_VALUE_DEPTH = MAX_JSON_DEPTH - 1;
const exact = (value, keys) => assert(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(','), 'Unknown storage fields/type');
function validateValue(value, active = new Set(), depth = 0) {
  assert(depth <= MAX_VALUE_DEPTH, 'JSON nesting exceeds bound');
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') { assert(Number.isFinite(value), 'Finite JSON number required'); return; }
  assert(typeof value === 'object' && (Array.isArray(value) || Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null), 'Unsupported JSON value type');
  assert(!active.has(value) && Object.getOwnPropertySymbols(value).length === 0, 'Cyclic/symbol JSON value prohibited'); active.add(value);
  const archived = histories.get(value);
  for (const item of archived ? [] : Array.isArray(value) ? value : Object.values(value)) validateValue(item, active, depth + 1);
  active.delete(value);
}
function freezeHistory(value) {
  if (value && typeof value === 'object' && !histories.has(value)) { for (const child of Object.values(value)) freezeHistory(child); Object.freeze(value); }
  return value;
}
// JSON.parse silently discards duplicate names. Scan the grammar first, with a
// depth bound, so neither a duplicate binding nor prototype key can be hidden.
export function parseStandingJSON(bytes) {
  const text = bytes.toString('utf8'); let i = 0;
  const ws = () => { while (/\s/.test(text[i] || '') && i < text.length) i++; };
  function string() { const start = i++; while (i < text.length) { const c = text[i++]; if (c === '\\') i++; else if (c === '"') return JSON.parse(text.slice(start, i)); } throw Error('Invalid JSON string'); }
  function value(depth = 0) {
    assert(depth <= MAX_JSON_DEPTH, 'JSON nesting exceeds bound'); ws();
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
  const meta = { directory, tail: descriptor.tail, count: descriptor.count }, pages = new Map();
  const pageAt = ref => { if (!pages.has(ref.sha256)) pages.set(ref.sha256, historyPage(directory, ref)); return pages.get(ref.sha256); };
  const item = index => {
    if (index >= meta.count) return undefined;
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
    if (key === 'length') return meta.count;
    if (key === 'at') return index => { const length = meta.count; index = Number(index); if (index < 0) index += length; return index < 0 || index >= length ? undefined : item(index); };
    if (key === Symbol.iterator) return function* () { for (let n = 0; n < meta.count; n++) yield item(n); };
    if (typeof key === 'string' && /^(0|[1-9]\d*)$/.test(key)) return item(Number(key));
    return Reflect.get(target, key);
  }, has(target, key) { if (typeof key === 'string' && /^(0|[1-9]\d*)$/.test(key)) return Number(key) < meta.count; return Reflect.has(target, key); }, set() { throw Error('Historical arrays are read-only'); } });
  histories.set(proxy, meta); return proxy;
}
function decode(directory, ref, depth = 0) {
  assert(depth < MAX_JSON_DEPTH, 'Evidence nesting exceeds bound');
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
  exact(root, ['schemaVersion', 'encodingVersion', 'epochId', 'state', 'legacy', 'observation', ...(root.epochs ? ['epochs'] : [])]);
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
  if(root.epochs) {
    assert(Array.isArray(root.epochs)&&root.epochs.length>0&&root.epochs.length<=64,'Bounded retained epoch inventory required');
    const seen=new Set();
    for(const epoch of root.epochs) {
      exact(epoch,['evidenceRoot','inventory','sourceSha256']);
      assert(isAbsolute(epoch.evidenceRoot)&&resolve(epoch.evidenceRoot)===epoch.evidenceRoot&&HEX.test(epoch.sourceSha256)&&!seen.has(epoch.evidenceRoot),'Invalid/duplicate retained epoch');
      seen.add(epoch.evidenceRoot);assertReference(epoch.inventory);
    }
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

export function readStandingEvidence(directory, reference) { privateDirectory(directory); return decode(directory, reference); }
