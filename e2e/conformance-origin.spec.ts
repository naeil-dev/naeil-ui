import { test, expect } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { checkRuntimeConformance } from '../bin/conformance-runtime.mjs';
let target:Server, foreign:Server, origin:string, other:string;
const received:{origin:string,path:string,authorization:string|undefined,tenant:string|undefined}[]=[];
const document=(content='')=>`<!doctype html><html><head><title>Fixture — .naeil estimate</title></head><body><main><h1>Fixture</h1>${content}</main></body></html>`;
async function listen(server:Server) {await new Promise<void>(done=>server.listen(0,'127.0.0.1',done)); const a=server.address();if(!a||typeof a==='string')throw Error('No server');return `http://127.0.0.1:${a.port}`;}
test.beforeAll(async()=>{
  foreign=createServer((req,res)=>{received.push({origin:'foreign',path:req.url!,authorization:req.headers.authorization,tenant:req.headers['x-tenant'] as string|undefined});res.writeHead(200,{'content-type':req.url==='/script'?'application/javascript':'text/html'}).end(req.url==='/script'?'window.foreignLoaded=true':document());});
  other=await listen(foreign);
  target=createServer((req,res)=>{
    received.push({origin:'target',path:req.url!,authorization:req.headers.authorization,tenant:req.headers['x-tenant'] as string|undefined});
    if(req.url==='/same-redirect') {res.writeHead(302,{location:'/ordinary'}).end();return;}
    if(req.url==='/redirect') {res.writeHead(302,{location:other+'/landing'}).end();return;}
    res.writeHead(200,{'content-type':'text/html'}).end(document(`<script src="${other}/script"></script><img src="${other}/image"><script>fetch('${other}/fetch').catch(()=>{})</script>`));
  });origin=await listen(target);
});
test.afterAll(async()=>{for(const s of [target,foreign]){s.closeAllConnections();await new Promise<void>(done=>s.close(()=>done()));}});
test('CLI credentials reach only the target origin across resources and redirects',async()=>{
  test.setTimeout(90000);
  const rows=await checkRuntimeConformance({service:'estimate',url:origin,routes:['/ordinary','/same-redirect','/redirect'],headers:['Authorization:Bearer synthetic','X-Tenant:synthetic']});
  expect(rows).toHaveLength(12);
  expect(received.filter(r=>r.origin==='target' && ['/ordinary','/redirect'].includes(r.path)).every(r=>r.authorization==='Bearer synthetic'&&r.tenant==='synthetic')).toBe(true);
  const resources=received.filter(r=>r.origin==='foreign');
  for(const path of ['/script','/image','/fetch','/landing']) expect(resources.some(r=>r.path===path)).toBe(true);
  expect(resources.filter(r=>r.authorization||r.tenant)).toEqual([]);
});
