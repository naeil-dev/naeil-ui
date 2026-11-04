import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { closeSync, constants, fstatSync, fsyncSync, linkSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';

const LIMIT = 8 * 1024 * 1024;
export const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export class LocalRolloutError extends Error {
  constructor(reasonCode, fields = {}) { super(reasonCode); Object.assign(this, fields, { reasonCode }); }
}
export function canonicalJSON(value) {
  const seen = new Set();
  function normalize(item, depth = 0) {
    assert(depth < 100, 'JSON depth bound exceeded');
    if (item === null || typeof item === 'string' || typeof item === 'boolean') return item;
    if (typeof item === 'number') { assert(Number.isFinite(item), 'Finite JSON value required'); return item; }
    assert(item && typeof item === 'object' && !seen.has(item), 'Plain acyclic JSON value required');
    assert(Array.isArray(item) || Object.getPrototypeOf(item) === Object.prototype || Object.getPrototypeOf(item) === null, 'Plain JSON object required');
    seen.add(item);
    const result = Array.isArray(item) ? item.map(child => normalize(child, depth + 1)) : Object.fromEntries(Object.keys(item).sort().map(key => [key, normalize(item[key], depth + 1)]));
    seen.delete(item); return result;
  }
  return JSON.stringify(normalize(value));
}
export const digest = value => hash(canonicalJSON(value));
export function privateDirectory(path, create = false) {
  assert(isAbsolute(path) && resolve(path) === path, 'Canonical absolute directory required');
  if (create) mkdirSync(path, { recursive: true, mode: 0o700 });
  const stat = lstatSync(path);
  assert(stat.isDirectory() && !stat.isSymbolicLink() && realpathSync(path) === path, 'Real private directory required');
  assert((stat.mode & 0o077) === 0 && (process.getuid?.() === undefined || stat.uid === process.getuid()), 'Owner-only directory required');
  return path;
}
function syncDirectory(path) { const fd = openSync(path, 'r'); try { fsyncSync(fd); } finally { closeSync(fd); } }
export function entryExists(path) { try { lstatSync(path); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } }
export function readBytes(path, limit = LIMIT) {
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = fstatSync(fd);
    assert(stat.isFile() && stat.size <= limit && stat.size > 0, 'Regular file byte bound exceeded');
    const bytes = readFileSync(fd); assert(bytes.length <= limit, 'Regular file grew beyond byte bound'); return bytes;
  } finally { closeSync(fd); }
}
/** Reject duplicate keys before JSON.parse can silently discard an approval binding. */
export function parseJSON(bytes) {
  const text = bytes.toString('utf8'); let offset = 0;
  const ws = () => { while (offset < text.length && /\s/.test(text[offset])) offset++; };
  const string = () => { const start = offset++; while (offset < text.length) { const c = text[offset++]; if (c === '\\') offset++; else if (c === '"') return JSON.parse(text.slice(start, offset)); } throw Error('Invalid JSON string'); };
  function value(depth = 0) {
    assert(depth < 100, 'JSON depth bound exceeded'); ws();
    if (text[offset] === '"') { string(); return; }
    if (text[offset] === '{' || text[offset] === '[') {
      const object = text[offset++] === '{', end = object ? '}' : ']', keys = new Set(); ws();
      if (text[offset] === end) { offset++; return; }
      while (offset < text.length) {
        if (object) { assert.equal(text[offset], '"', 'Invalid JSON key'); const key = string(); assert(!keys.has(key), 'Duplicate JSON key'); keys.add(key); ws(); assert.equal(text[offset++], ':'); }
        value(depth + 1); ws(); if (text[offset] === end) { offset++; return; } assert.equal(text[offset++], ',', 'Invalid JSON separator'); ws();
      }
      throw Error('Unterminated JSON');
    }
    const start = offset; while (offset < text.length && !/[\s,}\]]/.test(text[offset])) offset++; assert(offset > start, 'Invalid JSON value'); JSON.parse(text.slice(start, offset));
  }
  value(); ws(); assert.equal(offset, text.length, 'Trailing JSON bytes'); return JSON.parse(text);
}
export const readJSON = (path, limit = LIMIT) => parseJSON(readBytes(path, limit));
function bytesFor(value, limit) {
  canonicalJSON(value);
  const bytes = Buffer.from(JSON.stringify(value, null, 2) + '\n'); assert(bytes.length <= limit, 'JSON byte bound exceeded'); return bytes;
}
function install(path, bytes, immutable) {
  const directory = dirname(path); privateDirectory(directory);
  if (entryExists(path)) assert(lstatSync(path).isFile() && !lstatSync(path).isSymbolicLink(), 'Regular destination required');
  const temporary = join(directory, `.local-${randomUUID()}.tmp`);
  let fd;
  try {
    fd = openSync(temporary, 'wx', 0o600); writeFileSync(fd, bytes); fsyncSync(fd); closeSync(fd); fd = undefined;
    if (immutable) { linkSync(temporary, path); unlinkSync(temporary); } else renameSync(temporary, path);
    syncDirectory(directory);
  } finally { if (fd !== undefined) closeSync(fd); if (entryExists(temporary)) unlinkSync(temporary); }
}
export function atomicJSON(path, value, limit = LIMIT) { install(path, bytesFor(value, limit), false); }
export function immutableJSON(path, value, limit = LIMIT) { const bytes = bytesFor(value, limit); install(path, bytes, true); return { path, sha256: hash(bytes) }; }
export function appendReceipt(directory, value) {
  privateDirectory(directory); const attempts = privateDirectory(join(directory, 'attempts'), true);
  const id = randomUUID(), path = `attempts/${id}.json`;
  const ref = immutableJSON(join(directory, path), { schemaVersion: 1, receiptId: id, recordedAt: new Date().toISOString(), ...value });
  syncDirectory(attempts); return { path, sha256: ref.sha256 };
}
export function readReceipt(directory, reference) {
  assert(reference && /^attempts\/[a-f0-9-]{36}\.json$/.test(reference.path) && /^[a-f0-9]{64}$/.test(reference.sha256), 'Bound immutable receipt required');
  const bytes = readBytes(join(directory, reference.path)); assert.equal(hash(bytes), reference.sha256, 'Receipt digest mismatch'); return parseJSON(bytes);
}
export function acquireMachineLock(path) {
  privateDirectory(dirname(path), true);
  const owner = { schemaVersion: 1, pid: process.pid, ownerId: randomUUID(), acquiredAt: new Date().toISOString(), children: [] };
  let fd;
  try { fd = openSync(path, 'wx', 0o600); }
  catch (error) {
    if (error.code !== 'EEXIST') throw error;
    let previous;
    try { previous = readJSON(path, 16384); } catch { throw new LocalRolloutError('lock-recovery-required'); }
    if (Number.isSafeInteger(previous.pid) && previous.pid > 0) {
      try { process.kill(previous.pid, 0); throw new LocalRolloutError('machine-busy'); }
      catch (check) { if (check.reasonCode || check.code !== 'ESRCH') throw check.reasonCode ? check : new LocalRolloutError('machine-busy'); }
    }
    // A vanished owner does not prove its child/native worker is gone.
    throw new LocalRolloutError('lock-recovery-required');
  }
  try { writeFileSync(fd, JSON.stringify(owner)); fsyncSync(fd); } finally { closeSync(fd); }
  syncDirectory(dirname(path));
  let retained = false, released = false;
  const assertOwner = () => { if (!entryExists(path) || readJSON(path, 16384).ownerId !== owner.ownerId) throw new LocalRolloutError('lock-ownership-changed'); };
  return {
    owner,
    retain() { retained = true; },
    allowRelease() { retained = false; },
    hasRunningChildren() { return owner.children.some(childAlive); },
    registerChild(child, { processGroup = false } = {}) {
      assert(!released && Number.isSafeInteger(child?.pid) && child.pid > 0 && child.pid !== process.pid, 'Owned child PID required');
      assertOwner(); owner.children.push({ pid: child.pid, processGroup: Boolean(processGroup) }); atomicJSON(path, owner);
    },
    release() {
      if (retained || released) return;
      assertOwner();
      if (owner.children.some(childAlive)) throw new LocalRolloutError('child-recovery-required');
      unlinkSync(path); syncDirectory(dirname(path)); released = true;
    },
  };
}
/** Run PROGRAM in its own process group (execFile ignores `detached`). It is
 * exec'd only after that group is durably registered; if the parent ends first,
 * stdin closes and the gate exits without running it. Timeout signals only this
 * group; survivors keep the lock retained for explicit recovery. */
const GATE = ['-c', 'IFS= read -r go && [ "$go" = go ] && exec "$0" "$@"'];
export function runRegistered(file, args, { cwd, env, timeout, maxBuffer = 1024 * 1024 }, registerChild) {
  return new Promise((resolve, reject) => {
    const child = spawn('/bin/sh', [...GATE, file, ...args], { cwd, env, detached: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '', settled = false; const sizes = new Map();
    const settle = (error, value) => { if (settled) return; settled = true; clearTimeout(timer); if (error) reject(error); else resolve(value); };
    // Timeout/output cap end the call without waiting for EOF: a descendant may keep the pipes open.
    const stop = reason => {
      try { process.kill(-child.pid, 'SIGTERM'); } catch { /* group already gone */ }
      for (const stream of [child.stdin, child.stdout, child.stderr]) stream.destroy();
      settle(Object.assign(new Error(reason), { killed: reason === 'child-timeout', code: reason }));
    };
    const timer = setTimeout(() => stop('child-timeout'), timeout);
    for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { const size = (sizes.get(stream) || 0) + chunk.length; sizes.set(stream, size); if (size > maxBuffer) stop('child-output-limit'); else if (stream === child.stdout) output += chunk; });
    child.on('error', error => settle(error));
    child.on('close', code => settle(code === 0 ? null : Object.assign(new Error('child-failed'), { code, killed: false }), output));
    try { if (child.pid) registerChild?.(child, { processGroup: true }); child.stdin.end('go\n'); }
    catch (error) { child.stdin.end(); settle(error); }
  });
}
function processAlive(pid) { try { process.kill(pid, 0); return true; } catch (error) { return error.code !== 'ESRCH'; } }
function childAlive(child) { return processAlive(child.pid) || (child.processGroup && processAlive(-child.pid)); }
/** Explicit operator recovery only. This never steals a live owner/worker lock;
 * callers must obtain authorization before applying it to operational paths. */
export function recoverMachineLock(path, { ownerId }) {
  privateDirectory(dirname(path));
  const owner = readJSON(path, 16384);
  assert(typeof ownerId === 'string' && ownerId.length > 0 && owner.ownerId === ownerId, 'Exact retained lock owner required');
  if (!Number.isSafeInteger(owner.pid) || owner.pid <= 0 || !Array.isArray(owner.children)) throw new LocalRolloutError('lock-recovery-required');
  if (processAlive(owner.pid) || owner.children.some(child => !Number.isSafeInteger(child.pid) || child.pid <= 0 || childAlive(child))) throw new LocalRolloutError('machine-busy');
  if (readJSON(path, 16384).ownerId !== ownerId) throw new LocalRolloutError('lock-ownership-changed');
  unlinkSync(path); syncDirectory(dirname(path));
}
