import { chromium, webkit, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
const results=[];
for(const [name,engine] of [['chromium',chromium],['webkit',webkit]]) {
 const browser=await engine.launch();
 const page=await browser.newPage({viewport:{width:1440,height:1100}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const response=await page.goto('https://jay-macmini-2.tail165003.ts.net:6447/');expect(response.status()).toBe(200);
 for(const width of [1440,2560,900,390,320]) for(const theme of ['light','dark']) {
  await page.setViewportSize({width,height:1100});await page.selectOption('#theme',theme);
  const anchors=[];
  for(const mode of ['website','home']) {
   await page.selectOption('#example',mode);
   const f=page.frameLocator('#preview');await expect(f.locator('[data-slot="navigation"]')).toBeVisible();await expect(f.locator('html')).toHaveClass(new RegExp(theme));await f.locator('body').evaluate(async()=>await document.fonts.ready);
   const desktop=await f.locator('.ui-navigation-desktop').isVisible();
   if(desktop) anchors.push((await f.locator('.ui-navigation-desktop').boundingBox()).x);
   const trigger=f.getByRole('button',{name:desktop?(mode==='website'?'프로젝트':'AI'):'메뉴',exact:true});await trigger.focus();await page.keyboard.press('Enter');
   const menu=f.locator(desktop?'.ui-navigation-popover':'.ui-navigation-sheet');await expect(menu).toBeVisible();
   await f.locator('body').evaluate(()=>Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))));
   const current=menu.locator('a[aria-current="page"]');await expect(current).toHaveCSS('text-decoration-line','none');await expect(current.locator('.ui-navigation-title')).toHaveCSS('font-weight','600');
   if(mode==='website') expect(await menu.locator('img').evaluateAll(es=>es.every(e=>e.complete&&e.naturalWidth>0))).toBe(true);
   const geometry=await menu.locator('.ui-navigation-entry').evaluateAll(es=>es.map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}}));
   if(desktop && mode==='website') {expect(geometry[0].y).toBe(geometry[1].y);expect(geometry[0].x).not.toBe(geometry[1].x);} else {expect(new Set(geometry.map(r=>r.x)).size).toBe(1);}
   for(const r of geometry){expect(r.width).toBeGreaterThanOrEqual(44);expect(r.height).toBeGreaterThanOrEqual(44);}
   expect(await menu.evaluate(e=>e.scrollWidth>e.clientWidth)).toBe(false);
   expect(await f.locator('html').evaluate(e=>e.scrollWidth>innerWidth)).toBe(false);expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
   if(name==='chromium' && [1440,390].includes(width)) await page.screenshot({path:`docs/design/navigation-footer-evidence/menu-${mode}-${theme}-${width}.png`});
   await page.keyboard.press('Escape');await expect(menu).toBeHidden();await expect(trigger).toBeFocused();
   await trigger.click();await menu.getByRole('link',{name:mode==='website'?/naeil-ui/:/API 키/}).click();await expect(menu).toBeHidden();await expect(f.getByRole('heading',{name:mode==='website'?'naeil-ui':'API 키',exact:true})).toBeVisible();
   results.push({browser:name,width,theme,mode,desktop,geometry});
  }
  if(anchors.length) expect(anchors[0]).toBe(anchors[1]);
 }
 expect(errors).toEqual([]);await browser.close();
}
writeFileSync('docs/design/navigation-footer-evidence/menu-sample-checks.json',JSON.stringify(results,null,2)+'\n');console.log(`${results.length} served sample cases pass: columns, images, current state, keyboard, navigation, brand alignment, touch targets and overflow.`);
