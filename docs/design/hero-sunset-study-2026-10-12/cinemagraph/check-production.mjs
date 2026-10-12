import {chromium,webkit} from '@playwright/test';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const origin=process.env.HERO_ORIGIN||'https://naeil.dev';
const out=new URL('./production-results.json',import.meta.url);const results=[];
for(const name of ['sunset-a.webp','sunset-a-light.webp','sunset-water-dark.mp4','sunset-water-light.mp4']){
 const response=await fetch(`${origin}/images/hero/${name}`);assert.equal(response.status,200);
 const deployed=Buffer.from(await response.arrayBuffer());const local=await fs.readFile(new URL(`../../../../public/images/hero/${name}`,import.meta.url));
 const hash=b=>crypto.createHash('sha256').update(b).digest('hex');assert.equal(hash(deployed),hash(local));
 results.push({asset:name,status:response.status,bytes:deployed.length,sha256:hash(deployed),matches:true});
}
for(const engine of [chromium,webkit]){
 const b=await engine.launch();try{
 for(const width of [390,1440])for(const theme of ['light','dark']){
  const p=await b.newPage({viewport:{width,height:width===390?844:1000},reducedMotion:'no-preference'});
  await p.addInitScript(t=>localStorage.setItem('theme',t),theme);const errors=[];p.on('pageerror',e=>errors.push(e.message));
  const r=await p.goto(`${origin}/ko`);assert.equal(r.status(),200);
  await p.waitForFunction(()=>{const v=document.querySelector('video');return v?.readyState>=2&&!v.paused&&v.currentTime>0&&v.dataset.ready==='true'});
  assert((await p.locator('video').getAttribute('src')).endsWith(`-${theme}.mp4`));
  const overflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth);assert(!overflow);
  await p.getByRole('button',{name:'수면 움직임 멈추기'}).click();assert(await p.locator('video').evaluate(v=>v.paused));
  await p.getByRole('button',{name:'수면 움직임 재생'}).click();await p.waitForFunction(()=>!document.querySelector('video').paused);
  if(engine===chromium)await p.screenshot({path:new URL(`production-${width}-${theme}.png`,import.meta.url).pathname});
  await p.emulateMedia({reducedMotion:'reduce'});await p.waitForFunction(()=>!document.querySelector('video'));
  results.push({engine:engine.name(),width,theme,status:r.status(),played:true,pauseResume:true,reducedMotion:true,overflow,errors});assert.equal(errors.length,0);await p.close();
 }
 for(const path of ['/ja','/']){
  const p=await b.newPage({reducedMotion:'reduce'});try{const r=await p.goto(origin+path);await p.locator('section[data-active]').waitFor({timeout:10000});results.push({engine:engine.name(),path,status:r.status(),label:await p.locator('section[data-active]').getAttribute('aria-label')});}catch(e){results.push({engine:engine.name(),path,existingRouteLimitation:e.message.split('\n')[0]});}finally{await p.close();}
 }
 }finally{await b.close();await fs.writeFile(out,JSON.stringify(results,null,2));}
}
console.log(JSON.stringify(results,null,2));
