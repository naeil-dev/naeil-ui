import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, mkdir, chmod, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renewVerificationSession, sessionCookies } from './verification-session.mjs';

const session = { access_token: 'synthetic-access', refresh_token: 'synthetic-refresh', token_type: 'bearer', expires_at: 4102444800, user: { id: 'test-user' } };
async function fixture() {
  const directory = await realpath(await mkdtemp(join(tmpdir(), 'naeil-session-')));
  await chmod(directory, 0o700);
  const stateFile = join(directory, 'session.json');
  await writeFile(stateFile, JSON.stringify(session), { mode: 0o600 });
  return { directory, config: { stateFile, userId: 'test-user', supabaseUrl: 'https://fixture.supabase.co', anonKey: 'synthetic-public-key' } };
}
test('refresh rotation is persisted privately before cookies are returned', async () => {
  const { directory, config } = await fixture();
  try {
    let requested = false;
    const next = { ...session, refresh_token: 'rotated', access_token: 'new-access' };
    const result = await renewVerificationSession(config, { fetchImpl: async (url, init) => {
      requested = true;
      assert.equal(url, 'https://fixture.supabase.co/auth/v1/token?grant_type=refresh_token');
      assert.equal(JSON.parse(init.body).refresh_token, 'synthetic-refresh');
      return Response.json(next);
    } });
    assert(requested);
    assert.deepEqual(JSON.parse(await readFile(config.stateFile, 'utf8')), next);
    assert.deepEqual(result, next);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test('expired, revoked or wrong-account sessions cannot certify protected routes', async () => {
  for (const response of [new Response('{}', { status: 401 }), Response.json({ ...session, user: { id: 'other-user' } }), Response.json({ ...session, expires_at: 1 })]) {
    const { directory, config } = await fixture();
    try {
      await assert.rejects(renewVerificationSession(config, { fetchImpl: async () => response }), /session|account|expiry/i);
      await assert.rejects(renewVerificationSession(config, { fetchImpl: async () => assert.fail('must not replay uncertain refresh') }), /reconcil|pending|lock/i);
      assert.equal(JSON.parse(await readFile(config.stateFile, 'utf8')).refresh_token, 'synthetic-refresh');
    } finally { await rm(directory, { recursive: true, force: true }); }
  }
});
test('concurrent refresh and broadly readable private files fail closed', async () => {
  const { directory, config } = await fixture();
  try {
    await mkdir(config.stateFile + '.refresh-lock', { mode: 0o700 });
    await assert.rejects(renewVerificationSession(config), /pending|lock|reconcil/i);
    await rm(config.stateFile + '.refresh-lock', { recursive: true });
    await chmod(config.stateFile, 0o644);
    await assert.rejects(renewVerificationSession(config), /private|0600/i);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test('refreshed credentials must outlive the complete verifier deadline and margin', async () => {
  const { directory, config } = await fixture();
  const now = Date.now();
  try {
    await assert.rejects(renewVerificationSession(config, {
      now,
      minimumValidityMs: 25 * 60_000,
      fetchImpl: async () => Response.json({ ...session, expires_at: Math.floor(now / 1000) + 10 * 60 }),
    }), /expiry/i);
    await assert.rejects(renewVerificationSession(config), /pending|lock|reconcil/i);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test('only exact shared session chunks are constructed without local storage or unrelated cookies', () => {
  const cookies = sessionCookies(session, 'https://fixture.supabase.co');
  assert.equal(cookies.length, 1);
  assert.equal(cookies[0].name, 'sb-fixture-auth-token');
  assert.equal(cookies[0].domain, '.naeil.dev');
  assert.equal(cookies[0].path, '/');
  assert.equal(cookies[0].secure, true);
  assert.equal(cookies[0].sameSite, 'Lax');
  assert.deepEqual(JSON.parse(Buffer.from(cookies[0].value.slice(7), 'base64url')), session);
  assert.throws(() => sessionCookies(session, 'https://untrusted.test'), /Supabase/);
});

test('fence loss during an admitted refresh retains prior session and unresolved rotation evidence',async()=>{
 const {directory,config}=await fixture();let current=true,posts=0;
 try {
  await assert.rejects(()=>renewVerificationSession(config,{beforeAction:()=>assert(current,'generation fence lost'),beforeWrite:()=>assert(current,'generation fence lost'),fetchImpl:async()=>{posts++;current=false;return Response.json({...session,refresh_token:'rotated-on-server'});}}),/generation fence lost/);
  assert.equal(posts,1);assert.equal(JSON.parse(await readFile(config.stateFile,'utf8')).refresh_token,'synthetic-refresh');
  assert.equal(JSON.parse(await readFile(config.stateFile+'.refresh-lock/pending.json','utf8')).phase,'refresh-requested');
 }finally{await rm(directory,{recursive:true,force:true});}
});
