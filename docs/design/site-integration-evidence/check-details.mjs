import {chromium,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {writeFileSync} from 'node:fs';
const base=process.env.SITE_URL||'http://localhost:3010';const out='docs/design/site-integration-evidence';const b=await chromium.launch();const results=[];
for(const theme of ['light','dark']) for(const width of [320,1440]) {
 const context=await b.newContext({viewport:{width,height:width===320?568:1000},hasTouch:width===320,reducedMotion:'reduce',locale:'en-US'});await context.addInitScript(t=>localStorage.setItem('theme',t),theme);const p=await context.newPage();
 for(const path of ['/','/blog','/blog/2026-03-30','/login','/design']){
  await p.goto(base+path,{waitUntil:'networkidle'});
  const measurements=await p.evaluate(()=>{
   const visible=e=>e.getBoundingClientRect().width&&e.getBoundingClientRect().height&&getComputedStyle(e).visibility!=='hidden';
   const targets=[...document.querySelectorAll('header[data-slot=navigation] a,header[data-slot=navigation] button,footer[data-slot=site-footer] a,main button,main input,main a')].filter(e=>visible(e)&&!e.disabled&&!e.closest('[class*="markdown"]')).map(e=>{const t=e.closest('label')||e;const r=t.getBoundingClientRect();return {tag:e.tagName,text:(e.getAttribute('aria-label')||e.textContent||e.getAttribute('placeholder')||'').slice(0,50),width:r.width,height:r.height};});
   const samples=[...document.querySelectorAll('main p,main h1,main h2,main h3,main time')].filter(visible).map(e=>({text:e.textContent.slice(0,50),size:getComputedStyle(e).fontSize,lineHeight:getComputedStyle(e).lineHeight}));
   const a=document.querySelector('article[class*="article"]');
   return {targets,samples,article:a?{width:a.getBoundingClientRect().width,padding:getComputedStyle(a).paddingInline}:null,footer:[...document.querySelectorAll('[data-slot=site-footer] a')].map(e=>({label:e.getAttribute('aria-label')||e.textContent,href:e.getAttribute('href')})),images:[...document.images].filter(e=>e.getBoundingClientRect().width).map(e=>({src:e.getAttribute('src').split('?')[0],loaded:e.complete&&e.naturalWidth>0}))};
  });
  if(width===320)expect(measurements.targets.filter(t=>t.width<43.9||t.height<43.9)).toEqual([]);
  if(path.includes('2026')){expect(measurements.article.width).toBeLessThanOrEqual(640);if(width===1440)expect(measurements.article.width).toBe(640);await expect(p.locator('blockquote')).toContainText('particularly exciting');}
  expect(measurements.images.filter(x=>!x.loaded)).toEqual([]);
  if(path==='/design'){
   const triggers=p.locator('main [role=combobox]');await triggers.first().click();let id=await triggers.first().getAttribute('aria-controls');expect(await p.locator(`[id="${id}"]`).count()).toBe(1);await p.keyboard.press('Escape');
   const dialogTrigger=p.locator('main [data-slot=dialog-trigger]');await dialogTrigger.click();const dialogId=await dialogTrigger.getAttribute('aria-controls');expect(await p.locator(`[id="${dialogId}"]`).count()).toBe(1);await expect(p.locator('[data-slot=dialog-content]')).toBeVisible();await p.keyboard.press('Escape');await expect(dialogTrigger).toBeFocused();
   const typo=p.getByRole('heading',{name:'Typography',exact:true});if(await typo.count()){await typo.scrollIntoViewIfNeeded();await p.screenshot({path:`${out}/design-type-${theme}-${width}.png`});}
  }
  if(path==='/'){
   if(width===320)await p.locator('.ui-navigation-toggle').click();else await p.locator('.ui-navigation-desktop button').first().click();
   const panel=p.locator(width===320?'.ui-navigation-sheet':'.ui-navigation-popover');await expect(panel).toBeVisible();
   const menuAudit=await new AxeBuilder({page:p}).include(width===320?'.ui-navigation-sheet':'.ui-navigation-popover').analyze();expect(menuAudit.violations).toEqual([]);
   await p.screenshot({path:`${out}/site-menu-${theme}-${width}.png`});await p.keyboard.press('Escape');
  }
  results.push({theme,width,path,...measurements});
 }
 await context.close();
}
await b.close();writeFileSync(`${out}/site-details.json`,JSON.stringify(results,null,2)+'\n');console.log('20 detail checks passed: touch targets, loaded images, 640px article, preserved copy, Radix controls and menu axe.');
