import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, readdir, mkdir, chmod, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { renewVerificationSession, sessionCookies, writePrivateJson } from './verification-session.mjs';

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
test('revoked, wrong-account or malformed sessions retain uncertain rotation evidence', async () => {
  for (const response of [new Response('{}', { status: 401 }), Response.json({ ...session, user: { id: 'other-user' } }), Response.json({ ...session, expires_at: 'invalid' })]) {
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
test('R5 short-lived rotated credentials are saved and unlocked before a non-uncertain lifetime failure', async () => {
  const { directory, config } = await fixture(), now = Date.now();
  const next = { ...session, refresh_token: 'rotated-short-lived', expires_at: Math.floor(now / 1000) + 3600 };
  let failure;
  try {
    await assert.rejects(renewVerificationSession(config, {
      now, minimumValidityMs: 65 * 60_000, fetchImpl: async () => Response.json(next),
    }), error => { failure = error; return error.reasonCode === 'session-expiry-insufficient'; });
    assert.deepEqual(JSON.parse(await readFile(config.stateFile, 'utf8')), next);
    assert.deepEqual((await readdir(directory)).sort(), ['session.json', 'session.json.last-refresh.json']);
    assert.equal(failure.manualRecovery, false); assert.equal(failure.retryable, false);
    await renewVerificationSession(config, { fetchImpl: async (url, init) => {
      assert.equal(JSON.parse(init.body).refresh_token, next.refresh_token);
      return Response.json(session);
    } });
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test('R4 STOP before refresh POST leaves no lock and permits the next refresh', async () => {
  const { directory, config } = await fixture(); let posts = 0;
  try {
    await assert.rejects(renewVerificationSession(config, {
      beforeAction: () => { throw Object.assign(Error('stop-requested'), { reasonCode: 'stop-requested' }); },
      fetchImpl: async () => { posts++; return Response.json(session); },
    }), error => error.reasonCode === 'stop-requested');
    assert.equal(posts, 0);
    assert.deepEqual(await readdir(directory), ['session.json']);
    await renewVerificationSession(config, { fetchImpl: async () => { posts++; return Response.json(session); } });
    assert.equal(posts, 1);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test('refresh transport uncertainty retains the lock and never replays the request', async () => {
  const { directory, config } = await fixture(); let posts = 0;
  try {
    await assert.rejects(renewVerificationSession(config, { fetchImpl: async () => { posts++; throw Error('synthetic transport loss'); } }), error => error.reasonCode === 'session-refresh-uncertain' && error.manualRecovery);
    await assert.rejects(renewVerificationSession(config, { fetchImpl: async () => { posts++; assert.fail('uncertain replay'); } }), error => error.reasonCode === 'session-refresh-locked' && error.manualRecovery);
    assert.equal(posts, 1);
    assert.equal(JSON.parse(await readFile(config.stateFile + '.refresh-lock/pending.json', 'utf8')).phase, 'refresh-requested');
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
  await assert.rejects(()=>renewVerificationSession(config,{beforeAction:()=>assert(current,'generation fence lost'),beforeWrite:()=>assert(current,'generation fence lost'),fetchImpl:async()=>{posts++;current=false;return Response.json({...session,refresh_token:'rotated-on-server'});}}),error=>error.reasonCode==='session-persistence-uncertain'&&error.manualRecovery===true);
  assert.equal(posts,1);assert.equal(JSON.parse(await readFile(config.stateFile,'utf8')).refresh_token,'synthetic-refresh');
  assert.equal(JSON.parse(await readFile(config.stateFile+'.refresh-lock/pending.json','utf8')).phase,'refresh-requested');
 }finally{await rm(directory,{recursive:true,force:true});}
});

test('R2 session renewal exposes exact atomic file and lock operations before persistence',async()=>{
 const {directory,config}=await fixture(),writes=[];
 try {
  await renewVerificationSession(config,{fetchImpl:async()=>Response.json({...session,refresh_token:'rotated'}),beforeWrite:write=>writes.push(write)});
  assert.deepEqual(writes.map(write=>write.operation),['mkdir','create','write','rename','create','write','rename','rename','rmdir']);
  assert.equal(writes[0].path,config.stateFile+'.refresh-lock');assert.equal(writes[8].path,config.stateFile+'.refresh-lock');
  for(const [start,target]of [[1,config.stateFile+'.refresh-lock/pending.json'],[4,config.stateFile]]) {
   assert.equal(writes[start].target,target);assert.match(writes[start].path.slice(target.length),/^\.[a-f0-9-]{36}\.tmp$/);
   assert.deepEqual(writes[start+1],{operation:'write',path:writes[start].path,target});
   assert.deepEqual(writes[start+2],{operation:'rename',path:writes[start].path,destination:target});
  }
  assert.deepEqual(writes[7],{operation:'rename',path:config.stateFile+'.refresh-lock/pending.json',destination:config.stateFile+'.last-refresh.json'});
  const refused=join(directory,'refused.json');
  await assert.rejects(()=>writePrivateJson(refused,{synthetic:true},{beforeWrite:()=>{throw Error('unapproved target');}}),/unapproved target/);
  assert.deepEqual((await readdir(directory)).sort(),['session.json','session.json.last-refresh.json']);
 }finally{await rm(directory,{recursive:true,force:true});}
});
