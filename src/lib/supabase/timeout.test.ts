import { createServer, type Server } from 'node:http';
import { afterAll, beforeAll, expect, it, vi } from 'vitest';
vi.mock('next/headers', () => ({cookies:async()=>({getAll:()=>[],set:vi.fn()}),headers:async()=>new Headers({host:'localhost'})}));
vi.mock('@/app/[locale]/login/actions',()=>({prepareLogin:vi.fn(),clearLocalSession:vi.fn()}));
import { createClient } from './server';
import { passwordLogin } from '../../app/[locale]/login/credential-actions';
let server:Server, calls=0;
beforeAll(async()=>{
  server=createServer(()=>{ calls++; /* deliberately never send headers */ });
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address(); if(!address || typeof address==='string') throw Error('No server');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL',`http://127.0.0.1:${address.port}`);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY','fictional-test-key');
});
afterAll(async()=>{server.closeAllConnections(); await new Promise<void>(resolve=>server.close(()=>resolve())); vi.unstubAllEnvs();});
it('does not contact upstream for a signed-out getUser',async()=>{
  const client=await createClient(); const before=calls;
  const result=await client.auth.getUser();
  expect(result.data.user).toBeNull(); expect(calls).toBe(before);
});
it('returns an auth error within 12 seconds for an unresponsive upstream',async()=>{
  const client=await createClient(); const start=performance.now();
  const form=new FormData();form.set('email','fixture@example.test');form.set('password','fictional');
  const [result, action]=await Promise.race([Promise.all([client.auth.signInWithPassword({email:'fixture@example.test',password:'fictional'}),passwordLogin(form)]),new Promise<never>((_,reject)=>{const timer=setTimeout(()=>reject(Error('Auth exceeded 12 second budget')),12000);timer.unref();})]);
  expect(action).toEqual({status:'error'});
  expect(result.error).toBeTruthy(); expect(performance.now()-start).toBeLessThan(12000); expect(calls).toBeGreaterThan(0);
},15000);
