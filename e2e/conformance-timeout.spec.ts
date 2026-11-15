import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
import { checkRuntimeConformance } from '../bin/conformance-runtime.mjs';

test('checker bounds font settling and its overall runtime',async({}, info)=>{
  const server=createServer((req,res)=>{
    if(req.url==='/held.woff2') return; // actual request stays open
    res.writeHead(200,{'content-type':'text/html'}).end('<!doctype html><style>@font-face{font-family:held;src:url(/held.woff2)}h1{font-family:held}</style><main><h1>Hung font</h1></main>');
  });
  await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));
  const a=server.address();if(!a||typeof a==='string')throw Error('No server');
  try {
    const start=performance.now();
    const rows=await Promise.race([checkRuntimeConformance({service:'estimate',url:`http://127.0.0.1:${a.port}`,routes:['/'],stepTimeoutMs:1000,timeoutMs:6000}),new Promise<never>((_,reject)=>{const t=setTimeout(()=>reject(Error('checker exceeded 8s external guard')),8000);t.unref();})]);
    const elapsed=performance.now()-start;
    await info.attach('timeouts', {body:JSON.stringify({elapsed,rows}),contentType:'application/json'});
    expect(elapsed).toBeLessThan(8000);
    expect(rows.some(row=>row.errors.some(error=>/font readiness timeout/i.test(error)))).toBe(true);
  } finally {server.closeAllConnections();await new Promise<void>(done=>server.close(()=>done()));}
});
