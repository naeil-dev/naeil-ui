const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const assert = require('assert/strict');
const pw = require('/Users/jaymini/.paseo/worktrees/28nele6j/public-ui-publication/node_modules/@playwright/test');
const kit = path.resolve(__dirname, '../../../../brand/naeil/1.0.0');
const evidence = path.join(__dirname, 'evidence');
const consumer = fs.mkdtempSync(path.join(os.tmpdir(), 'naeil-brand-consumer-'));
fs.cpSync(kit, consumer, {recursive: true});
const mime = {'.html':'text/html', '.svg':'image/svg+xml', '.css':'text/css', '.png':'image/png', '.ico':'image/x-icon', '.json':'application/json'};
const server = http.createServer((req, res) => {
  const file = path.resolve(consumer, '.' + decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(consumer + path.sep) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
  res.end(fs.readFileSync(file));
});
const uri = file => 'data:image/svg+xml;base64,' + fs.readFileSync(path.join(kit, file)).toString('base64');

async function navMetrics(page) {
  return page.evaluate(() => {
    const nav = document.querySelector('nav');
    const brand = nav.querySelector('a');
    const rect = e => {const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}};
    const shown = e => {const s=getComputedStyle(e), r=e.getBoundingClientRect();return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'};
    return {brand:rect(brand), controls:[...nav.querySelectorAll('a,button')].filter(e=>e!==brand&&shown(e)).map(e=>({name:e.getAttribute('aria-label')||e.textContent.trim(),...rect(e)})),overflow:document.documentElement.scrollWidth>innerWidth};
  });
}

async function replaceLive(page, theme) {
  const mode = theme==='dark'?'color-dark':'color';
  await page.evaluate(({header,footer,symbol}) => {
    const image = (src,height,kind) => {const i=new Image();i.src=src;i.alt='naeil';i.height=height;i.style.cssText=`height:${height}px;width:auto;display:block`;i.dataset.brandProof=kind;return i};
    const brand=document.querySelector('nav a');
    brand.innerHTML='';brand.setAttribute('aria-label','naeil');brand.append(image(header,28,'header'));
    const foot=document.querySelector('footer svg[aria-label="naeil"]');
    if(foot){const parent=foot.parentElement;parent.innerHTML='';parent.append(image(footer,20,'footer'));}
    const login=[...document.querySelectorAll('svg[aria-label="naeil"]')].find(e=>!e.closest('nav,footer'));
    if(login)login.replaceWith(image(symbol,40,'login'));
  }, {header:uri(`svg/naeil-horizontal-${mode}.svg`),footer:uri(`svg/naeil-footer-${mode}.svg`),symbol:uri(`svg/naeil-symbol-${mode}-small.svg`)});
  await page.locator('img[data-brand-proof]').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode())));
}

(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const results={testedAt:new Date().toISOString(),method:'Standalone copied kit + temporary DOM substitution in fresh public-site contexts; no server writes or production deployment',engines:{},local:[],live:[],errors:[]};
  try {
    // Browser engines are independent; each writes different evidence files.
    await Promise.all(['chromium','firefox','webkit'].map(async engine=>{
      let browser;
      try {
        browser=await pw[engine].launch({headless:true});results.engines[engine]=browser.version();
        for(const width of [390,1440])for(const theme of ['light','dark']){
          const dpr=width===390?2:1,key=`${engine}-${width}-${theme}`;
          const context=await browser.newContext({viewport:{width,height:900},deviceScaleFactor:dpr,colorScheme:theme,reducedMotion:'reduce'});
          const page=await context.newPage();
          const external=[];
          page.on('request',r=>{if(!r.url().startsWith(base))external.push(r.url())});
          await page.goto(base+'/examples/usage.html');
          if(theme==='dark')await page.locator('#theme').click();
          await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
          const local=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,
            broken:[...document.images].filter(i=>!i.complete||!i.naturalWidth).length,
            visibleBrands:[...document.querySelectorAll('.naeil-brand img')].filter(i=>getComputedStyle(i).display!=='none').map(i=>({src:i.getAttribute('src'),height:i.getBoundingClientRect().height}))}));
          assert.equal(local.overflow,false);assert.equal(local.broken,0);assert.equal(local.visibleBrands.length,3);
          assert.deepEqual(local.visibleBrands.map(i=>i.height),[28,40,20]);
          assert(local.visibleBrands.every(i=>theme==='dark'?i.src.includes('-dark'):!i.src.includes('-dark')));
          assert.equal(external.length,0);
          await page.screenshot({path:path.join(evidence,`consumer-${key}.png`),fullPage:true});
          await page.goto(base+'/verification/proof.html');
          await page.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
          await page.locator('[data-favicon]').screenshot({path:path.join(evidence,`favicon-${key}.png`)});
          if(width===1440)await page.screenshot({path:path.join(evidence,`proof-${engine}-${theme}.png`),fullPage:true});
          results.local.push({key,dpr,...local,externalRequests:external.length});
          await context.close();
          console.log(`Local ${key}: images, theme, dimensions, overflow passed`);
        }
        const locales=engine==='chromium'?['ko','en','ja']:['ko'];
        for(const locale of locales)for(const width of (locale==='ko'?[390,1440]:[390]))for(const theme of ['light','dark']){
          const key=`${engine}-${locale}-${width}-${theme}`;
          const context=await browser.newContext({viewport:{width,height:width===390?844:900},deviceScaleFactor:width===390?2:1,colorScheme:theme,reducedMotion:'reduce'});
          await context.addInitScript(t=>localStorage.setItem('theme',t),theme);
          const page=await context.newPage();page.setDefaultTimeout(20000);
          try {
            await page.goto(`https://naeil.dev/${locale}`,{waitUntil:'domcontentloaded'});
            await page.locator('button[aria-label^="Switch to"]').waitFor({state:'attached'});
            await page.evaluate(()=>document.fonts.ready);
            const before=await navMetrics(page);
            await replaceLive(page,theme);
            const after=await navMetrics(page);
            assert.equal(after.controls.length,before.controls.length);
            const shifts=after.controls.map((c,i)=>({name:c.name,dx:c.x-before.controls[i].x,dy:c.y-before.controls[i].y}));
            assert(shifts.every(s=>Math.abs(s.dx)<.1&&Math.abs(s.dy)<.1));
            const collisions=after.controls.filter(c=>c.x<after.brand.right&&c.right>after.brand.x&&c.y<after.brand.bottom&&c.bottom>after.brand.y);
            assert.equal(collisions.length,0);assert.equal(after.overflow,false);
            await page.screenshot({path:path.join(evidence,`live-${key}-header.png`),clip:{x:0,y:0,width,height:80}});
            await page.locator('footer').screenshot({path:path.join(evidence,`live-${key}-footer.png`)});
            let menu=false;
            if(width===390){
              await page.evaluate(()=>scrollTo(0,0));
              await page.locator('nav button[aria-label="Menu"]').click();
              await page.screenshot({path:path.join(evidence,`live-${key}-menu.png`)});
              const opened=await navMetrics(page);
              assert(Math.abs(opened.brand.x-after.brand.x)<.1&&Math.abs(opened.brand.y-after.brand.y)<.1);
              assert.equal(opened.overflow,false);
              // Ensure overlay has been mounted and button toggled to its close icon.
              menu=await page.locator('nav button[aria-label="Menu"] path').getAttribute('d')==='M18 6L6 18M6 6l12 12';
              assert(menu);
            }
            await page.goto(`https://naeil.dev/${locale}/login`,{waitUntil:'domcontentloaded'});
            await page.locator('button[aria-label^="Switch to"]').waitFor({state:'attached'});
            await page.locator('h1').waitFor();
            await replaceLive(page,theme);
            assert.equal(await page.locator('img[data-brand-proof="login"]').count(),1);
            const login=await page.locator('img[data-brand-proof="login"]').boundingBox();
            assert.equal(login.width,40);assert.equal(login.height,40);
            await page.screenshot({path:path.join(evidence,`live-${key}-login.png`)});
            results.live.push({key,locale,width,theme,before,after,shifts,collisions:collisions.length,mobileMenuChecked:menu,login});
            console.log(`Live ${key}: header, footer, login${menu?', mobile menu':''} passed`);
          } catch(error){results.errors.push({key,error:String(error)});console.log(`FAILED ${key}: ${error.message}`)}
          finally{await context.close()}
        }
      } catch(error){results.errors.push({engine,error:String(error)});console.log(`FAILED ${engine}: ${error.message}`)}
      finally{if(browser)await browser.close()}
    }));
  } finally {
    fs.writeFileSync(path.join(__dirname,'browser-results.json'),JSON.stringify(results,null,2)+'\n');
    server.close();
  }
  console.log(JSON.stringify({engines:results.engines,local:results.local.length,live:results.live.length,errors:results.errors}));
  if(results.errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);server.close();process.exitCode=1});
