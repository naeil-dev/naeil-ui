import {chromium,webkit,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {writeFileSync} from 'node:fs';
const base=process.env.SITE_URL||'https://naeil.dev';
const out='docs/design/site-production-2026-10-14';
const results=[], failures=[], accessibility=[];
const routes=['','/blog','/blog/2026-03-30','/login','/design','/cc'];
const pathFor=(locale,route)=>(locale==='en'?'':`/${locale}`)+(route||'/');
for(const [engineName,engine] of Object.entries({chromium,webkit})) {
 const browser=await engine.launch();
 try {
 for(const locale of ['ko','en','ja']) for(const theme of ['light','dark']) for(const width of [320,390,1440,2560]) {
  const context=await browser.newContext({viewport:{width,height:width === 320 ? 568 : width === 390 ? 844 : 1000},reducedMotion:'reduce',locale:locale==='ko'?'ko-KR':locale==='ja'?'ja-JP':'en-US'});
  await context.addInitScript(t=>localStorage.setItem('theme',t),theme);
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  let anchor;
  for(const route of routes) {
   const label=`${engineName} ${locale} ${theme} ${width} ${route||'home'}`;
   const errorStart=errors.length;
   try {
    const response=await page.goto(base+pathFor(locale,route),{waitUntil:'networkidle'});
    expect(response.status()).toBe(200);await expect(page.locator('html')).toHaveClass(new RegExp(theme));
    await expect(page.locator('main h1')).toHaveCount(1);
    const state=await page.evaluate(()=>{
     const nav=document.querySelector('.ui-navigation-brand').getBoundingClientRect();
     const menu=document.querySelector('.ui-navigation-desktop').getBoundingClientRect();
     const main=document.querySelector('main');
     return {url:location.pathname,title:document.title,lang:document.documentElement.lang,canonical:document.querySelector('link[rel=canonical]')?.href,icon:document.querySelector('link[rel=icon]')?.getAttribute('href'),viewport:{width:innerWidth,height:innerHeight},overflow:document.documentElement.scrollWidth>innerWidth,brand:{x:nav.x,y:nav.y,width:nav.width},menu:{x:menu.x,y:menu.y},nested:main.querySelectorAll('a a,a button,button a,button button').length,smallText:[...main.querySelectorAll('p,span,li,time,button')].filter(e=>e.getBoundingClientRect().width&&getComputedStyle(e).fontSize.replace('px','')<13).slice(0,8).map(e=>({text:e.textContent.slice(0,50),size:getComputedStyle(e).fontSize}))};
    });
    expect(state.overflow).toBe(false);expect(state.lang).toBe(locale);expect(state.nested).toBe(0);
    expect(state.canonical).toBe('https://naeil.dev'+pathFor(locale,route).replace(/\/$/, '')+(locale==='en'&&!route?'/':''));
    if(route)expect(state.title).toMatch(/ — naeil$/);else expect(state.title).toBe('naeil');
    if(anchor)expect(Math.abs(state.brand.x-anchor.x)).toBeLessThanOrEqual(1);else anchor=state.brand;
    if(route!='/cc')expect(state.smallText).toEqual([]);
    expect(errors.slice(errorStart)).toEqual([]);
    results.push({label,...state});
    if(engineName==='chromium'&&locale==='ko'&&[390,1440].includes(width)) {
     await page.screenshot({path:`${out}/after-${route.replaceAll('/','-').slice(1)||'home'}-${theme}-${width}.png`});
     if(route==='') {await page.locator('#projects').evaluate(e=>window.scrollTo(0,e.getBoundingClientRect().top+scrollY-88));await page.screenshot({path:`${out}/after-projects-${theme}-${width}.png`});}
    }
    if(engineName==='chromium'&&locale==='en'&&[390,1440].includes(width)&&route!='/cc') {
     const audit=await new AxeBuilder({page}).analyze();
     accessibility.push({label,violations:audit.violations,incomplete:audit.incomplete});
     expect(audit.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))).toEqual([]);
    }
   } catch(error) {failures.push({label,error:error.message});console.log('FAIL',label,error.message.slice(0,500));}
  }
  try {
   await page.goto(base+pathFor(locale,''),{waitUntil:'networkidle'});
   if(width>=1440) {
    const trigger=page.locator('.ui-navigation-desktop button').first();await trigger.focus();await page.keyboard.press('Enter');
    const panel=page.locator('.ui-navigation-popover');await expect(panel).toBeVisible();await expect(panel).toHaveAttribute('data-columns','2');
    const cols=await panel.locator('nav').evaluate(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length);expect(cols).toBe(2);
    await page.keyboard.press('Escape');await expect(trigger).toBeFocused();
   } else {
    const trigger=page.locator('.ui-navigation-toggle');await trigger.click();const sheet=page.locator('.ui-navigation-sheet');await expect(sheet).toBeVisible();
    const entry=sheet.locator('.ui-navigation-entry');const boxes=await entry.evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,w:r.width,h:r.height}}));expect(new Set(boxes.map(x=>x.x)).size).toBe(1);
    for(const box of boxes)expect(box.h).toBeGreaterThanOrEqual(44);
    for(let n=0;n<16;n++){await page.keyboard.press('Tab');expect(await sheet.evaluate(e=>e.contains(document.activeElement))).toBe(true);}
    await page.keyboard.press('Escape');await expect(sheet).toHaveCount(0);await expect(trigger).toBeFocused();
   }
   expect(errors).toEqual([]);
  }catch(error){failures.push({label:`${engineName} ${locale} ${theme} ${width} menu`,error:error.message});}
  await context.close();
  console.log(`${engineName} ${locale} ${theme} ${width}: done`);
 }
 }finally{await browser.close();}
}
writeFileSync(`${out}/site-matrix.json`,JSON.stringify({base,results,failures},null,2)+'\n');
writeFileSync(`${out}/site-axe.json`,JSON.stringify(accessibility,null,2)+'\n');
console.log(`${results.length} route conditions; ${failures.length} failures; ${accessibility.length} axe checks`);
if(failures.length)process.exitCode=1;
