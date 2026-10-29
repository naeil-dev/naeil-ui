/** Bounded private IO and immutable historical digest/lock contracts.
 * These helpers do not admit or schedule standing execution. */
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { constants, closeSync, fstatSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, realpathSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';

export const HEX = /^[a-f0-9]{64}$/;
export const REVISION = /^[a-f0-9]{40}$/;
export const VERSION = /^0\.7\.(0|[1-9]\d*)$/;
export const hash = value => createHash('sha256').update(value).digest('hex');
export const fingerprint = value => hash(JSON.stringify(value));
/** Published identity is independent of the epoch that materialized assets. */
export function releaseIdentityDigest(release) {
  const identity=structuredClone(release);
  for(const key of ['archive','siteArchive','contract','account','expectations'])if(identity[key])delete identity[key].path;
  return fingerprint(identity);
}
export function generationDigest(identity) {
  assert.deepEqual(Object.keys(identity).sort(), ['automationSha256','executionPath','stateSchemaVersion','trustedFiles'].sort(), 'Unsupported generation identity field');
  assert(HEX.test(identity.automationSha256), 'Exact automation generation digest required');
  assert(Number.isSafeInteger(identity.stateSchemaVersion)&&identity.stateSchemaVersion>0,'Exact state schema required');
  assert(typeof identity.executionPath==='string'&&identity.executionPath.split(':').every(path=>isAbsolute(path)&&resolve(path)===path),'Exact generation execution PATH required');
  assert(identity.trustedFiles&&Object.keys(identity.trustedFiles).length>0,'Generation trusted closure required');
  const trustedFiles=Object.entries(identity.trustedFiles).sort(([a],[b])=>a.localeCompare(b));
  for(const [path,digest] of trustedFiles) assert(isAbsolute(path)&&resolve(path)===path&&HEX.test(digest),'Exact generation trusted file pin required');
  return fingerprint({schemaVersion:1,automationSha256:identity.automationSha256,trustedFiles,executionPath:identity.executionPath,stateSchemaVersion:identity.stateSchemaVersion});
}

export function privateDirectory(path, create = false) {
  assert(isAbsolute(path) && resolve(path) === path, 'Canonical absolute private directory required');
  if (create) mkdirSync(path, { recursive: true, mode: 0o700 });
  const stat = lstatSync(path);
  assert(stat.isDirectory() && !stat.isSymbolicLink() && realpathSync(path) === path && stat.uid === process.getuid() && (stat.mode & 0o777) === 0o700, 'Owned private0700 directory required');
  return path;
}

export function readPrivateBytes(path, maxBytes = 64 * 1024 * 1024) {
  assert(isAbsolute(path) && resolve(path) === path && realpathSync(path) === path, 'Canonical absolute private file required');
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    const stat = fstatSync(fd);
    assert(stat.isFile() && stat.nlink === 1 && stat.uid === process.getuid() && (stat.mode & 0o777) === 0o600 && stat.size <= maxBytes, 'Owned bounded private0600 file required');
    const bytes = readFileSync(fd); assert(bytes.length <= maxBytes, 'Private file exceeds bound');
    return bytes;
  } finally { closeSync(fd); }
}

export function readPrivateJSON(path, maxBytes = 2 * 1024 * 1024) {
  return JSON.parse(readPrivateBytes(path, maxBytes).toString('utf8'));
}

export const JSON_LIMITS = Object.freeze({ controlIndex: 262144, evidence: 2097152, transport: 2097152, summary: 262144, monitor: 262144, operatorStatus: 262144, offlineLegacy: 16777216 });

export function serializeJSON(value, maxBytes = JSON_LIMITS.evidence) {
  assert(Number.isSafeInteger(maxBytes) && maxBytes > 0, 'Positive JSON bound required');
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
  assert(bytes.length <= maxBytes, 'Serialized JSON exceeds byte limit');
  return bytes;
}

export function atomicJSON(path, value, maxBytes = JSON_LIMITS.evidence) {
  const bytes = serializeJSON(value, maxBytes);
  privateDirectory(dirname(path));
  let destinationStat; try { destinationStat = lstatSync(path); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (destinationStat) assert(destinationStat.isFile() && !destinationStat.isSymbolicLink() && destinationStat.nlink === 1 && destinationStat.uid === process.getuid() && (destinationStat.mode & 0o777) === 0o600, 'Unsafe receipt destination');
  const temporary = `${path}.${randomUUID()}.tmp`, fd = openSync(temporary, 'wx', 0o600);
  try { writeFileSync(fd, bytes); fsyncSync(fd); } catch (error) { try { unlinkSync(temporary); } catch {} throw error; } finally { closeSync(fd); }
  renameSync(temporary, path);
  const directory = openSync(dirname(path), 'r'); try { fsyncSync(directory); } finally { closeSync(directory); }
}

const exactFields = (value, keys, reason) => assert(value && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(','), reason);
export const pathExists = path => { try { lstatSync(path); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } };
export function syncDirectory(directory) {
  const fd = openSync(directory, 'r'); try { fsyncSync(fd); } finally { closeSync(fd); }
}
export function fileReference(path, maxBytes = JSON_LIMITS.transport) {
  const bytes = readPrivateBytes(path, maxBytes); return { path, sha256: hash(bytes), bytes: bytes.length };
}
export function readExactReference(ref, maxBytes = JSON_LIMITS.transport) {
  exactFields(ref, ['path','sha256','bytes'], 'Exact immutable reference required');
  assert(HEX.test(ref.sha256) && Number.isSafeInteger(ref.bytes) && ref.bytes > 0 && ref.bytes <= maxBytes, 'Bounded immutable reference required');
  const bytes = readPrivateBytes(ref.path, maxBytes);
  assert.equal(bytes.length, ref.bytes, 'Referenced byte count changed'); assert.equal(hash(bytes), ref.sha256, 'Referenced bytes changed'); return bytes;
}

/** Exact legacy control.lock protocol for local handoff. Never steals stale locks. */
export function acquireControlLock(directory, acquisition) {
  privateDirectory(directory);
  assert(!pathExists(join(directory,'control-archive.lock')), 'Explicit lock archival is in progress or incomplete');
  const path = join(directory, 'control.lock'), token = randomUUID();
  // The acquisition is part of the first durable write, not a later admission
  // phase. A crash before the first journal must still have an exact purpose.
  const bytes = serializeJSON({ schemaVersion: 1, token, pid: process.pid, startedAt: new Date().toISOString(), ...(acquisition ? { acquisition } : {}) }, JSON_LIMITS.controlIndex);
  const fd = openSync(path, 'wx', 0o600);
  try {
    writeFileSync(fd, bytes); fsyncSync(fd); syncDirectory(directory);
    if(acquisition?.kind==='standing-active-generation-acquisition') {
      readExactReference(acquisition.pointer,JSON_LIMITS.controlIndex);readExactReference(acquisition.journal,JSON_LIMITS.controlIndex);
    }
  }
  catch (error) { closeSync(fd); throw error; }
  if(pathExists(join(directory,'control-archive.lock'))) {
    try { assert.equal(readPrivateJSON(path).token,token); unlinkSync(path);syncDirectory(directory); } finally { closeSync(fd); }
    throw Error('Explicit lock archival is in progress or incomplete');
  }
  const release = () => { assert.equal(readPrivateJSON(path, JSON_LIMITS.controlIndex).token, token, 'Control lock ownership changed'); unlinkSync(path); syncDirectory(directory); closeSync(fd); };
  // Fail-closed transition authority loss retains ownership bytes for explicit
  // archival, while closing this process's descriptor without stealing a lock.
  return { token, release, retain: () => closeSync(fd) };
}
