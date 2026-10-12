import {chromium,webkit} from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);const sharp=createRequire(require.resolve('next/package.json'))('sharp');
const out=new URL('./',import.meta.url),base=process.env.HERO_URL || 'http://127.0.0.1:3107/ko';const results=[];
const browser=await chromium.launch();
async function ready(p){await p.waitForFunction(()=>{const v=document.querySelector('video');return v&&v.readyState>=2&&!v.paused&&v.currentTime>0&&v.dataset.ready==='true'});}
try{
 for(const [width,height] of [[390,844],[600,300],[1440,1000],[2560,1000]])for(const theme of ['dark','light']){
  const p=await browser.newPage({viewport:{width,height},reducedMotion:'no-preference'});
  await p.addInitScript(t=>localStorage.setItem('theme',t),theme);const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(base);await ready(p);
  const measure=await p.locator('video').evaluate(v=>({source:v.currentSrc,duration:v.duration,width:v.videoWidth,height:v.videoHeight,muted:v.muted,loop:v.loop,inline:v.playsInline,overflow:document.documentElement.scrollWidth>innerWidth,requests:performance.getEntriesByType('resource').filter(r=>r.name.endsWith('.mp4')).map(r=>r.name),quality:{total:v.getVideoPlaybackQuality().totalVideoFrames,dropped:v.getVideoPlaybackQuality().droppedVideoFrames}}));
  assert.equal(measure.duration,3.2);assert(!measure.overflow);assert.equal(measure.requests.length,1);assert(measure.source.endsWith(`-${theme}.mp4`));assert(measure.muted&&measure.loop&&measure.inline);assert.equal(errors.length,0);
  await p.getByRole('button',{name:'수면 움직임 멈추기'}).click();assert(await p.locator('video').evaluate(v=>v.paused));
  const t=await p.locator('video').evaluate(v=>v.currentTime);await p.waitForTimeout(180);assert.equal(await p.locator('video').evaluate(v=>v.currentTime),t);
  await p.screenshot({path:new URL(`${width}-${theme}.png`,out).pathname,fullPage:true});
  await p.getByRole('button',{name:'수면 움직임 재생'}).focus();await p.keyboard.press('Space');await ready(p);
  await p.setViewportSize({width,height:360});await p.evaluate(()=>scrollTo(0,document.body.scrollHeight));await p.waitForFunction(()=>document.querySelector('video').paused);await p.evaluate(()=>scrollTo(0,0));await ready(p);
  await p.emulateMedia({reducedMotion:'reduce'});await p.waitForFunction(()=>!document.querySelector('video'));assert(await p.locator('section[data-active] button').isHidden());
  results.push({name:`${width}-${theme}`,measure,errors,pauseResume:true,offscreenPause:true,reducedMotionRemovesVideo:true});await p.close();
 }
 // A failed dark asset must not pause the healthy light asset.
 const recovery=await browser.newPage({viewport:{width:1440,height:1000}});
 await recovery.addInitScript(()=>localStorage.setItem('theme','dark'));
 await recovery.route('**/sunset-water-dark.mp4',r=>r.abort());
 await recovery.goto(base);await recovery.waitForFunction(()=>document.querySelector('video')?.error);
 await recovery.getByRole('button',{name:'Switch to light mode'}).click();await ready(recovery);
 results.push({name:'failed-theme-recovery',healthyThemePlays:true});await recovery.close();
 // Block autoplay until the test enables gesture retry; tolerate StrictMode remounts.
 const retry=await browser.newPage({viewport:{width:390,height:844}});
 await retry.addInitScript(()=>{const real=HTMLMediaElement.prototype.play;window.allowTestPlayback=false;HTMLMediaElement.prototype.play=function(){if(!window.allowTestPlayback)return Promise.reject(new DOMException('Test autoplay block','NotAllowedError'));return real.call(this);};});
 await retry.goto(base);await retry.getByRole('button',{name:'수면 움직임 재생'}).waitFor();await retry.evaluate(()=>{window.allowTestPlayback=true;});await retry.getByRole('button',{name:'수면 움직임 재생'}).click();await ready(retry);
 results.push({name:'autoplay-retry',playsAfterUserClick:true});await retry.close();
 const p=await browser.newPage({viewport:{width:1440,height:1000}});await p.addInitScript(()=>localStorage.setItem('theme','light'));await p.goto(base);await ready(p);
 const loop=await p.locator('video').evaluate(v=>new Promise(resolve=>{let prev=v.currentTime,wraps=0;const start=performance.now();const poll=()=>{if(v.currentTime<prev)wraps++;prev=v.currentTime;if(performance.now()-start>6800)resolve({wraps,quality:{total:v.getVideoPlaybackQuality().totalVideoFrames,dropped:v.getVideoPlaybackQuality().droppedVideoFrames}});else requestAnimationFrame(poll)};poll();}));assert(loop.wraps>=2);
 await p.getByRole('button',{name:'수면 움직임 멈추기'}).click();
 const capture=async t=>{await p.locator('video').evaluate((v,time)=>new Promise(resolve=>{v.addEventListener('seeked',resolve,{once:true});v.currentTime=time;}),t);return p.screenshot({clip:{x:0,y:60,width:1440,height:820}});};
 const a=await sharp(await capture(.5)).removeAlpha().raw().toBuffer(),b=await sharp(await capture(1.8)).removeAlpha().raw().toBuffer();let landDiff=0,waterDiff=0;
 for(let y=0;y<820;y++)for(let x=0;x<1440;x++){const n=(y*1440+x)*3;if(Math.max(...[0,1,2].map(c=>Math.abs(a[n+c]-b[n+c])))>2){if(y+60<720)landDiff++;else waterDiff++;}}
 assert.equal(landDiff,0);assert(waterDiff>1000);
 // Paused A -> B -> A must not expose a newly mounted, undecoded video.
 await p.getByRole('button',{name:'Switch to dark mode'}).click();
 await p.getByRole('button',{name:'Switch to light mode'}).click();
 assert.equal(await p.locator('video').getAttribute('data-ready'),'false');
 await p.emulateMedia({reducedMotion:'reduce'});await p.waitForFunction(()=>!document.querySelector('video'));
 await p.emulateMedia({reducedMotion:'no-preference'});await p.locator('video').waitFor({state:'attached'});
 assert.equal(await p.locator('video').getAttribute('data-ready'),'false');assert(await p.locator('video').evaluate(v=>v.paused));
 await p.getByRole('button',{name:'Switch to dark mode'}).click();assert(await p.locator('video').evaluate(v=>v.paused));await p.getByRole('button',{name:'수면 움직임 재생'}).click();await ready(p);assert((await p.locator('video').getAttribute('src')).includes('-dark'));
 // Synthetic visibility event exercises the handler; not a real OS tab switch.
 await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});await p.waitForFunction(()=>document.querySelector('video').paused);
 await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>false});document.dispatchEvent(new Event('visibilitychange'));});await ready(p);
 results.push({name:'loop-and-stillness',loop,landDiff,waterDiff,themeSwitch:true,pausedRemountFallback:true,simulatedVisibilityPause:true});await p.close();
 for(const mode of ['reduced','error','blocked']){
  const q=await browser.newPage({viewport:{width:390,height:844},reducedMotion:mode==='reduced'?'reduce':'no-preference'});
  if(mode==='error')await q.route('**/*.mp4',r=>r.abort());
  if(mode==='blocked')await q.addInitScript(()=>{HTMLMediaElement.prototype.play=function(){return Promise.reject(new DOMException('Test autoplay block','NotAllowedError'));};});
  await q.goto(base);
  if(mode==='error'){await q.waitForFunction(()=>document.querySelector('video')?.error);assert(await q.locator('section[data-active] button').isHidden());}
  if(mode==='blocked'){await q.getByRole('button',{name:'수면 움직임 재생'}).waitFor();assert(await q.locator('video').evaluate(v=>v.paused));}
  if(mode==='reduced'){await q.waitForTimeout(300);assert.equal(await q.locator('video').count(),0);assert.equal(await q.evaluate(()=>performance.getEntriesByType('resource').filter(r=>r.name.endsWith('.mp4')).length),0);}
  await q.getByRole('link',{name:'프로젝트 보기',exact:true}).click();assert(q.url().endsWith('#projects'));results.push({name:mode,staticFallbackAndNavigation:true});await q.close();
 }
}catch(e){results.push({failure:e.stack});throw e;}finally{await fs.writeFile(new URL('browser-results.json',out),JSON.stringify(results,null,2));await browser.close();}
try{const w=await webkit.launch();try{const p=await w.newPage({viewport:{width:390,height:844}});await p.goto(base);await ready(p);results.push({name:'webkit-mobile',duration:await p.locator('video').evaluate(v=>v.duration),playing:true});}finally{await w.close();}}catch(e){results.push({name:'webkit-mobile',unverified:e.message});}
await fs.writeFile(new URL('browser-results.json',out),JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
