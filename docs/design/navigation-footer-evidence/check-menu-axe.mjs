import {chromium,expect} from '@playwright/test';import AxeBuilder from '@axe-core/playwright';import {writeFileSync} from 'node:fs';
const b=await chromium.launch();const context=await b.newContext();const p=await context.newPage();const results=[];
for(const width of [1440,390]) for(const theme of ['light','dark']) {
 await p.setViewportSize({width,height:1000});await p.goto(`http://127.0.0.1:6007/iframe.html?id=ui-navigation--usage&viewMode=story&globals=theme:${theme};a11y.manual:!true`);await expect(p.locator('html')).toHaveClass(new RegExp(theme));
 if(width===390) await p.getByRole('button',{name:'메뉴',exact:true}).click();
 await p.getByRole('button',{name:/Change language/}).click();await p.getByRole('menuitem',{name:/English/}).click();
 if(width===1440) await p.getByRole('button',{name:'Projects',exact:true}).click();
 const selector=width===1440?'.ui-navigation-popover':'.ui-navigation-sheet';await expect(p.locator(selector)).toBeVisible();await p.evaluate(()=>Promise.all(document.getAnimations().map(a=>a.finished.catch(()=>{}))));
 const audit=await new AxeBuilder({page:p}).include(selector).analyze();expect(audit.violations).toEqual([]);expect(await p.locator(selector).evaluate(e=>e.scrollWidth>e.clientWidth)).toBe(false);const contrast = await p.locator(selector).evaluate(panel => {
  const canvas=document.createElement('canvas'); canvas.width=canvas.height=1; const ctx=canvas.getContext('2d');
  const rgba=color=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data]};
  const luminance=rgb=>rgb.slice(0,3).map(v=>{v/=255;return v<=0.04045?v/12.92:((v+0.055)/1.055)**2.4}).reduce((s,v,i)=>s+v*[0.2126,0.7152,0.0722][i],0);
  return [...panel.querySelectorAll('.ui-navigation-description')].map(el=>{
    let parent=el,bg;
    while(parent){const c=rgba(getComputedStyle(parent).backgroundColor);if(c[3]===255){bg=c;break}parent=parent.parentElement;}
    const fg=rgba(getComputedStyle(el).color);const f=luminance(fg),b=luminance(bg);
    return {text:el.textContent,foreground:fg,background:bg,backgroundSource:parent.className,ratio:(Math.max(f,b)+0.05)/(Math.min(f,b)+0.05)};
  });
 });
 for(const pair of contrast) expect(pair.ratio,pair.text).toBeGreaterThanOrEqual(4.5);
 results.push({width,theme,language:'en',violations:audit.violations,incomplete:audit.incomplete,descriptionContrast:contrast});
}
writeFileSync('docs/design/navigation-footer-evidence/menu-axe.json',JSON.stringify(results,null,2)+'\n');console.log('4 English website menu cases: axe pass, no panel overflow.');await context.close();await b.close();
