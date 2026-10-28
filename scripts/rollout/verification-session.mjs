import assert from 'node:assert/strict';
import { constants } from 'node:fs';
import { open, lstat, realpath, mkdir, rename, rmdir } from 'node:fs/promises';
import { dirname, isAbsolute, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { VerificationError } from './verification-error.mjs';

export async function assertPrivateDirectory(path) {
  assert(isAbsolute(path) && resolve(path) === path && await realpath(path) === path, 'Canonical private directory required');
  const stat = await lstat(path);
  assert(stat.isDirectory() && stat.uid === process.getuid() && (stat.mode & 0o777) === 0o700, 'Owner-only private0700 directory required');
}

export async function readPrivateJson(path) {
  assert(isAbsolute(path) && resolve(path) === path && await realpath(path) === path, 'Canonical private file required');
  await assertPrivateDirectory(dirname(path));
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await file.stat();
    assert(stat.isFile() && stat.nlink === 1 && stat.uid === process.getuid() && (stat.mode & 0o777) === 0o600 && stat.size <= 8 * 1024 * 1024, 'Owner-only bounded single-link private0600 file required');
    try { return JSON.parse(await file.readFile('utf8')); } catch { throw new Error('Private JSON is invalid'); }
  } finally { await file.close(); }
}

export async function writePrivateJson(path, value, { beforeWrite = () => {} } = {}) {
  await assertPrivateDirectory(dirname(path));
  const bytes=JSON.stringify(value)+'\n';
  assert(Buffer.byteLength(bytes)<=8*1024*1024,'Bounded private JSON write required');
  const temporary = `${path}.${randomUUID()}.tmp`;
  beforeWrite({operation:'create',path:temporary,target:path}); const file = await open(temporary, constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW, 0o600);
  try { beforeWrite({operation:'write',path:temporary,target:path}); await file.writeFile(bytes); await file.sync(); } finally { await file.close(); }
  beforeWrite({operation:'rename',path:temporary,destination:path}); await rename(temporary, path);
  const directory = await open(dirname(path), constants.O_RDONLY);
  try { await directory.sync(); } finally { await directory.close(); }
}

function supabaseOrigin(url) {
  const parsed = new URL(url);
  assert(parsed.protocol === 'https:' && /^[a-z0-9]+\.supabase\.co$/.test(parsed.hostname) && parsed.origin === url && !parsed.username && !parsed.password, 'Exact hosted Supabase origin required');
  return parsed;
}

function assertSession(session, userId, now, minimumValidityMs) {
  assert(session && typeof session.access_token === 'string' && session.access_token.length > 0 && typeof session.refresh_token === 'string' && session.refresh_token.length > 0, 'Verification session missing');
  assert.equal(session.user?.id, userId, 'Verification account mismatch');
  if (!Number.isFinite(session.expires_at) || session.expires_at * 1000 <= now + minimumValidityMs) throw new VerificationError('session-refresh', 'session-expiry-insufficient', { manualRecovery: true });
}

/** A refresh is a credential rotation. An interrupted/ambiguous rotation leaves
 * the lock for explicit reconciliation, never a blind automatic token replay. */
export async function renewVerificationSession(config, { fetchImpl = fetch, now = Date.now(), minimumValidityMs = 25 * 60_000, beforeWrite = () => {}, beforeAction = () => {} } = {}) {
  supabaseOrigin(config.supabaseUrl);
  assert(Number.isSafeInteger(minimumValidityMs) && minimumValidityMs >= 5 * 60_000, 'Bounded verification session lifetime required');
  assert(typeof config.anonKey === 'string' && config.anonKey && typeof config.userId === 'string' && config.userId, 'Pinned verification account/config required');
  await readPrivateJson(config.stateFile);
  const lock = `${config.stateFile}.refresh-lock`;
  beforeWrite({operation:'mkdir',path:lock}); try { await mkdir(lock, { mode: 0o700 }); } catch { throw new VerificationError('session-refresh', 'session-refresh-locked', { manualRecovery: true }); }
  // Read only after obtaining the lock; another completed refresh may have
  // rotated the token between the initial permission check and lock creation.
  const prior = await readPrivateJson(config.stateFile);
  assert.equal(prior.user?.id, config.userId, 'Verification account mismatch');
  assert(typeof prior.refresh_token === 'string' && prior.refresh_token, 'Verification refresh session missing');
  // No secret is ever written into the operation marker or error message.
  await writePrivateJson(`${lock}/pending.json`, { startedAt: new Date(now).toISOString(), phase: 'refresh-requested' }, { beforeWrite });
  let response;
  beforeAction();
  try {
    response = await fetchImpl(`${config.supabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20_000),
      headers: { apikey: config.anonKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: prior.refresh_token }),
    });
  } catch (error) { throw new VerificationError('session-refresh', 'session-refresh-uncertain', { timeout: ['AbortError', 'TimeoutError'].includes(error.name), manualRecovery: true }); }
  if (!response.ok) throw new VerificationError('session-refresh', [400, 401, 403].includes(response.status) ? 'auth-required' : 'session-refresh-rejected', { status: response.status, manualRecovery: true });
  let next;
  try { next = await response.json(); } catch { throw new VerificationError('session-refresh', 'session-response-invalid', { manualRecovery: true }); }
  try { assertSession(next, config.userId, now, minimumValidityMs); }
  catch (error) { if (error instanceof VerificationError) throw error; throw new VerificationError('session-refresh', 'session-response-invalid', { manualRecovery: true }); }
  try {
    await writePrivateJson(config.stateFile, next, { beforeWrite });
    // Retain the consumed marker as an audit record, without credential data.
    beforeWrite({operation:'rename',path:`${lock}/pending.json`,destination:`${config.stateFile}.last-refresh.json`}); await rename(`${lock}/pending.json`, `${config.stateFile}.last-refresh.json`);
    beforeWrite({operation:'rmdir',path:lock}); await rmdir(lock);
  } catch { throw new VerificationError('session-refresh', 'session-persistence-uncertain', { manualRecovery: true }); }
  return next;
}

/** Supabase SSR uses base64url JSON split into 3180-character cookie chunks.
 * Only these shared-session cookies are exposed to isolated browser contexts. */
export function sessionCookies(session, url) {
  const project = supabaseOrigin(url).hostname.split('.')[0];
  const name = `sb-${project}-auth-token`;
  const value = `base64-${Buffer.from(JSON.stringify(session)).toString('base64url')}`;
  const chunks = value.match(/.{1,3180}/g);
  return chunks.map((chunk, index) => ({
    name: chunks.length === 1 ? name : `${name}.${index}`, value: chunk,
    domain: '.naeil.dev', path: '/', secure: true, httpOnly: false,
    sameSite: 'Lax', expires: session.expires_at,
  }));
}
