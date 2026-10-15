import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
const base=process.env.HEADER_SITE_BASE??'https://naeil.dev';
const kind=process.env.HEADER_SITE_KIND??'live';
const out=resolve('docs/evidence/shared-naeil-header-2026-10-15',kind);
await mkdir(out,{recursive:true});
const browser=await chromium.launch({args:[],ignoreDefaultArgs:['--hide-scrollbars']});
const records:Array<{name:string;error?:string;[key:string]:unknown}>=[];
try{
 for(const locale of ['ja','ko'])for(const width of [390,768,1440,2560])for(const theme of ['light','dark'] as const){
  const context=await browser.newContext({viewport:{width,height:900},locale:locale==='ja'?'ja-JP':'ko-KR',colorScheme:theme,reducedMotion:'reduce'});
  const page=await context.newPage();
  const name=`${locale}-${width}-${theme}`;
  try{
   await page.addInitScript(theme=>localStorage.setItem('theme',theme),theme);
   await page.goto(`${base}/${locale}`);
   const header=page.locator('[data-slot="navigation"]');
   await header.waitFor({state:'visible'});
   await page.evaluate(()=>document.fonts.ready);
   await page.waitForFunction(theme=>document.documentElement.classList.contains(theme),theme);
   const geometry=await header.evaluate(h=>{
    const landmarks=Object.fromEntries([['header',h],['frame',h.firstElementChild],['brand',h.querySelector('.ui-navigation-brand')],['nav',h.querySelector('.ui-navigation-desktop')],['toolbar',h.querySelector('.ui-navigation-toolbar')]].map(([name,node])=>{const e=node as Element;if(!e)return [name,null];const b=e.getBoundingClientRect(),s=getComputedStyle(e);return [name,{x:b.x,y:b.y,width:b.width,height:b.height,position:s.position,padding:s.padding,gap:s.gap,font:s.font,color:s.color,background:s.backgroundColor}];}));
    return {viewport:{width:innerWidth,height:innerHeight,clientWidth:document.documentElement.clientWidth},lang:document.documentElement.lang,theme:document.documentElement.className,...landmarks,overflow:document.documentElement.scrollWidth>innerWidth};
   });
   await header.screenshot({path:join(out,`${name}-header.png`)});
   const mobile=await page.getByRole('button',{name:locale==='ja'?'メニュー':'메뉴',exact:true}).isVisible();
   const trigger=mobile?page.getByRole('button',{name:locale==='ja'?'メニュー':'메뉴',exact:true}):page.getByRole('button',{name:locale==='ja'?'プロジェクト':'프로젝트',exact:true});
   await trigger.focus();await trigger.press('Enter');
   const panel=page.getByRole('dialog',{name:mobile?(locale==='ja'?'メニュー':'메뉴'):(locale==='ja'?'プロジェクト':'프로젝트'),exact:true});
   await panel.waitFor({state:'visible'});
   await Promise.all((await panel.locator('img').all()).map(i=>i.evaluate(async e=>{try{await (e as HTMLImageElement).decode();}catch{}})));
   const menu=await panel.evaluate(p=>({text:p.textContent,images:[...p.querySelectorAll('img')].map(i=>({src:i.getAttribute('src'),loaded:i.complete&&i.naturalWidth>0})),links:[...p.querySelectorAll('a')].map(a=>({href:a.getAttribute('href'),text:a.textContent})),columns:getComputedStyle(p.querySelector('.ui-navigation-menu-grid')??p).gridTemplateColumns}));
   await panel.screenshot({path:join(out,`${name}-menu.png`)});
   await page.keyboard.press('Escape');await panel.waitFor({state:'hidden'});
   const footer=page.locator('[data-slot="site-footer"]');
   await footer.scrollIntoViewIfNeeded();await footer.screenshot({path:join(out,`${name}-footer.png`)});
   records.push({name,mobile,geometry,menu,escapeFocus:await trigger.evaluate(e=>e===document.activeElement)});
   console.log(`${kind} ${name}: captured header/menu/footer`);
  }catch(e){records.push({name,error:String(e)});console.error(`${name}: ${e}`);}
  finally{await context.close();}
 }
}finally{await browser.close();await writeFile(join(out,'measurements.json'),JSON.stringify({base,capturedAt:new Date().toISOString(),records},null,2));}
if(records.some(r=>r.error))process.exitCode=1;
