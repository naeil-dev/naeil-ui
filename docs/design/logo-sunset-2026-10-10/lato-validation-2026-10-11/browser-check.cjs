// Actual public page + in-memory DOM substitution only. No server/source writes.
const {chromium}=require('/Users/jaymini/.paseo/worktrees/28nele6j/public-ui-publication/node_modules/@playwright/test');
const fs=require('fs');
const path=require('path');
const root=__dirname, evidence=path.join(root,'evidence');
const uri=file=>'data:image/svg+xml;base64,'+fs.readFileSync(path.join(root,'assets',file)).toString('base64');

async function metrics(page){
  return page.evaluate(()=>{
    const nav=document.querySelector('nav');
    const brand=nav.querySelector('a');
    const visible=el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0};
    const rect=el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
    return {url:location.href,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},theme:document.documentElement.className,bodyWidth:document.documentElement.scrollWidth,brand:rect(brand),nav:rect(nav),controls:[...nav.querySelectorAll('a,button')].filter(el=>el!==brand&&visible(el)).map(el=>({text:el.getAttribute('aria-label')||el.textContent.trim(),...rect(el)})),font: getComputedStyle(brand).fontFamily};
  });
}

async function replace(page,header,footer){
  await page.evaluate(({header,footer})=>{
    const brand=document.querySelector('nav a');
    if(!window.__naeilOldBrand){window.__naeilOldBrand=brand.innerHTML}
    brand.setAttribute('aria-label','naeil');
    brand.innerHTML='';
    const img=new Image();img.src=header;img.alt='naeil';img.height=28;img.style.display='block';img.dataset.naeilAudit='header';brand.append(img);
    const old=document.querySelector('footer svg[aria-label="naeil"]');
    if(old){const parent=old.parentElement;window.__naeilOldFooter=parent.innerHTML;parent.innerHTML='';const foot=new Image();foot.src=footer;foot.alt='naeil';foot.height=20;foot.style.display='block';foot.dataset.naeilAudit='footer';parent.append(foot);}
    else {const foot=document.querySelector('img[data-naeil-audit="footer"]');if(foot)foot.src=footer;}
  },{header,footer});
  await page.locator('img[data-naeil-audit="header"]').evaluate(img=>img.decode());
  await page.locator('img[data-naeil-audit="footer"]').evaluate(img=>img.decode());
}

(async()=>{
  const browser=await chromium.launch({headless:true});const results=[];
  try{
    for(const width of [1440,390])for(const theme of ['light','dark']){
      const context=await browser.newContext({viewport:{width,height:width===390?844:900},deviceScaleFactor:1,colorScheme:theme,reducedMotion:'reduce'});
      await context.addInitScript(theme=>localStorage.setItem('theme',theme),theme);
      const page=await context.newPage();
      await page.goto('https://naeil.dev/ko',{waitUntil:'domcontentloaded'});
      await page.locator('button[aria-label^="Switch to"]').waitFor({state:'attached'});
      await page.evaluate(()=>document.fonts.ready);
      const key=`${width}-${theme}`, mode=theme==='dark'?'color-dark':'color';
      const before=await metrics(page);
      await page.screenshot({path:path.join(evidence,key+'-before.png')});
      await replace(page,uri(`header-400-14-${mode}.svg`),uri(`footer-${mode}.svg`));
      const after=await metrics(page);
      await page.screenshot({path:path.join(evidence,key+'-recommended.png')});
      await page.locator('footer').screenshot({path:path.join(evidence,key+'-footer.png')});
      const shifts=after.controls.map((control,i)=>({text:control.text,dx:control.x-before.controls[i].x,dy:control.y-before.controls[i].y}));
      const collisions=after.controls.filter(c=>c.x<after.brand.right&&c.right>after.brand.x&&c.y<after.brand.bottom&&c.bottom>after.brand.y);
      results.push({key,before,after,shifts,collisions,pageOverflowBefore:before.bodyWidth>width,pageOverflowAfter:after.bodyWidth>width});
      if(width===390&&theme==='dark'){
        await page.evaluate(()=>scrollTo(0,0));
        for(const weight of [400,500,600])for(const ratio of [12,14,16]){
          await replace(page,uri(`header-${weight}-${ratio}-${mode}.svg`),uri(`footer-${mode}.svg`));
          await page.screenshot({path:path.join(evidence,`mobile-${weight}-${ratio}.png`),clip:{x:0,y:0,width:390,height:90}});
        }
      }
      // Preserve an explicit restoration check before closing the clean context.
      await page.evaluate(()=>{document.querySelector('nav a').innerHTML=window.__naeilOldBrand;const foot=document.querySelector('img[data-naeil-audit="footer"]');if(foot)foot.parentElement.innerHTML=window.__naeilOldFooter;});
      const restored=await page.locator('nav a').first().innerText();
      results.at(-1).restoredBrandText=restored;
      await context.close();
      console.log(`Checked ${key}: controls shift max ${Math.max(...shifts.map(x=>Math.abs(x.dx)))}, collisions ${collisions.length}, overflow ${after.bodyWidth>width}`);
    }
    fs.writeFileSync(path.join(root,'browser-results.json'),JSON.stringify({testedAt:new Date().toISOString(),method:'Chromium clean contexts; public /ko page; temporary DOM image substitution; no product integration',browser:browser.version(),cases:results},null,2));
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
