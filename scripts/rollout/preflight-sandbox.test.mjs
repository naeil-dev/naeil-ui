import test from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { createSandbox, verifySandbox, executeSandbox, networkManifest, sanitizedEnvironment } from './preflight-sandbox.mjs';
const hash = b => createHash('sha256').update(b).digest('hex');
const node = process.platform==='darwin'?'/Users/jaymini/.local/share/runtimes/node/v22.23.2/bin/node':realpathSync(process.execPath);
function setup(t) {
  const root = realpathSync(mkdtempSync(join(tmpdir(),'preflight-boundary-')));
  t.after(()=>rmSync(root,{recursive:true,force:true}));
  for (const name of ['checkout','output','tmp','cache','input','artifact','outside']) mkdirSync(join(root,name),{mode:0o700});
  const secret = join(root,'outside','secret'); writeFileSync(secret,'synthetic secret',{mode:0o600});
  const immutable = join(root,'input','canary'); writeFileSync(immutable,'immutable',{mode:0o600});
  const native = join(root,'outside','native');writeFileSync(native,'#!/bin/sh\nexit 0\n',{mode:0o700});
  const spec={schemaVersion:1,root,writable:['checkout','output','tmp','cache'].map(p=>join(root,p)),readOnly:[join(root,'input'),join(root,'artifact')],executables:{[node]:hash(readFileSync(node)), '/usr/bin/sandbox-exec':process.platform==='darwin'?hash(readFileSync('/usr/bin/sandbox-exec')):'a'.repeat(64)},runtime:node,readable:[],executionPath:node.slice(0,node.lastIndexOf('/')),endpoints:networkManifest('estimate')};
  return {root,spec,secret,immutable,native};
}
test('unsupported OS fails before filesystem or consumer access',()=>{assert.throws(()=>createSandbox({}, {platform:'linux'}),/macOS/);});
test('fails closed on missing pin, root overlap and symlink escape',{skip:process.platform!=='darwin'?'actual macOS sandbox required':false},t=>{
 const {root,spec}=setup(t);
 assert.throws(()=>createSandbox({...spec,executables:{}}),/pinned/);
 assert.throws(()=>createSandbox({...spec,writable:[root]}),/distinct|overlap|root/);
 assert.throws(()=>createSandbox({...spec,roles:['unknown']}),/role/);
 symlinkSync(join(root,'outside'),join(root,'checkout','escape'));
 const sandbox=createSandbox(spec);
 return executeSandbox(sandbox,{file:node,args:['-e',`require('fs').writeFileSync(${JSON.stringify(join(root,'checkout','escape','written'))},'bad')`]}).then(result=>{
  assert.notEqual(result.exitCode,0);assert(!existsSync(join(root,'outside','written')));
 });
});
test('environment never inherits secrets or user runtime hooks and never repurposes HOME',()=>{
 const env=sanitizedEnvironment({executionPath:'/usr/bin',tmp:'/isolated/tmp',cache:'/isolated/cache'}, {HOME:'/real/home',AWS_SECRET_ACCESS_KEY:'secret',NODE_OPTIONS:'--inspect',SSH_AUTH_SOCK:'/agent',PATH:'/evil',CUSTOM_TOKEN:'secret'});
 assert.equal(env.HOME,'/real/home');assert.equal(env.PATH,'/usr/bin');
 for(const key of ['AWS_SECRET_ACCESS_KEY','NODE_OPTIONS','SSH_AUTH_SOCK','CUSTOM_TOKEN']) assert(!Object.hasOwn(env,key));
});
test('exact role manifests reject port zero, duplicate endpoint and unknown roles',()=>{
 assert.equal(networkManifest('estimate').roles.estimateE2E,2480);
 assert.equal(networkManifest('estimate').roles.estimateSmoke,2481);
 assert.equal(networkManifest('jev').roles.jevE2E,2467);
 assert.throws(()=>networkManifest('estimate',{estimateAuth:0}),/port/);
 assert.throws(()=>networkManifest('estimate',{estimateAuth:2480}),/duplicate/i);
 assert.throws(()=>networkManifest('jev',{evil:3021}),/role/);
});
test('actual OS enforcement: immutable/private/outside/child/native/network denial; exact loopback permitted',{skip:process.platform!=='darwin'?'actual macOS sandbox only; no unsandboxed fallback':false},async t=>{
 const {root,spec,secret,immutable,native}=setup(t);
 process.env.PREFLIGHT_SYNTHETIC_SECRET='must not inherit';t.after(()=>delete process.env.PREFLIGHT_SYNTHETIC_SECRET);
 const sandbox=createSandbox(spec);
 const proof=await verifySandbox(sandbox,{outsideRead:secret,immutableFile:immutable,nativeExecutable:native});
 assert.equal(proof.passed,true);assert.equal(proof.checks.every(value=>value.passed),true);
 assert.equal(readFileSync(immutable,'utf8'),'immutable');assert.equal(readFileSync(secret,'utf8'),'synthetic secret');
 assert(!existsSync(join(root,'outside','write-probe')));
 const changed=join(root,'input','runtime');writeFileSync(changed,readFileSync(node));chmodSync(changed,0o700);
 await assert.rejects(()=>executeSandbox(sandbox,{file:changed,args:['-e','0']}),/approved|pinned/);
});

test('no-network stages deny even an otherwise approved exact loopback role',{skip:process.platform!=='darwin'?'actual macOS sandbox required':false},async t=>{
 const {spec}=setup(t);const sandbox=createSandbox({...spec,roles:[]});const port=spec.endpoints.roles.estimateAuth;
 const result=await executeSandbox(sandbox,{file:node,args:['-e',`const net=require('net');const s=net.createServer();s.on('error',e=>process.exit(['EPERM','EACCES'].includes(e.code)?0:2));s.listen(${port},'127.0.0.1',()=>{s.close();process.exit(3)});`]});assert.equal(result.exitCode,0);
});

test('pinned readable helper mutation is rejected before child launch',{skip:process.platform!=='darwin'?'actual macOS sandbox required':false},async t=>{
 const {root,spec}=setup(t);const helper=join(root,'outside','helper.mjs');writeFileSync(helper,'// independently reviewed helper');
 const sandbox=createSandbox({...spec,readable:[{path:helper,sha256:hash(readFileSync(helper))}]});writeFileSync(helper,'// changed after approval');
 await assert.rejects(()=>executeSandbox(sandbox,{file:node,args:['-e',`require('fs').writeFileSync(${JSON.stringify(join(root,'output','should-not-exist'))},'bad')`]}),/closure changed/);assert(!existsSync(join(root,'output','should-not-exist')));
});
