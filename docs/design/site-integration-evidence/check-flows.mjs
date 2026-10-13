import {chromium,webkit,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {writeFileSync} from 'node:fs';
const base=process.env.SITE_URL||'http://localhost:3010';const results=[];
for(const [name,engine] of Object.entries({chromium,webkit})) {
 const browser=await engine.launch();
 for(const width of [390,1440]) {
 const context=await browser.newContext({viewport:{width,height:width===390?844:1000},locale:'en-US',hasTouch:width===390,reducedMotion:'reduce'});
 const page=await context.newPage();await page.goto(base+'/ko/blog?review=1#top');
 const openControls=async()=>{if(width===390)await page.locator('.ui-navigation-toggle').click();};
 await openControls();const root=()=>page.locator(width===390?'.ui-navigation-sheet':'.ui-navigation-toolbar');
 await root().getByRole('combobox').click();await page.getByRole('option',{name:'English',exact:true}).click();
 await expect(page).toHaveURL(/\/blog\?review=1#top$/);await expect(page.locator('html')).toHaveAttribute('lang','en');await expect(page).toHaveTitle('Blog — naeil');
 if(width===390){await page.keyboard.press('Escape');await openControls();}
 const themeBefore=await page.locator('html').getAttribute('class');await root().getByRole('button',{name:/Switch to .* theme/}).click();const themeAfter=await page.locator('html').getAttribute('class');expect(themeAfter).not.toBe(themeBefore);
 if(width===390)await page.keyboard.press('Escape');
 await page.locator('main article a').first().click();await expect(page).toHaveURL(/\/blog\/2026-03-30$/);await expect(page).toHaveTitle(/ — naeil$/);await page.goBack();await expect(page).toHaveTitle('Blog — naeil');
 const fonts=await page.evaluate(async()=>{
  await document.fonts.ready; const latin=await document.fonts.load('400 16px "Pretendard Variable"','한글 Latin');return {latin:latin.length,body:getComputedStyle(document.body).fontFamily};
 });expect(fonts.latin).toBeGreaterThan(0);
 await page.goto(base+'/ja/blog');const japanese=await page.evaluate(async()=>{const f=await document.fonts.load('400 16px "Noto Sans JP"','日本語');return {count:f.length,family:getComputedStyle(document.body).fontFamily}});expect(japanese.count).toBeGreaterThan(0);
 await page.goto(base+'/ko/login?error=auth&next=%2Fblog');await expect(page.locator('main').getByRole('alert')).toContainText(/로그인/);expect(await page.locator('main button:disabled').count()).toBe(0);
 const errorAudit=await new AxeBuilder({page}).include('main').analyze();expect(errorAudit.violations).toEqual([]);
 const callback=await context.request.get(base+'/auth/callback?error=access_denied',{maxRedirects:0});expect(callback.status()).toBe(307);expect(callback.headers().location).toContain('/login?error=auth');
 let authorizeRequested=false;let release;const gate=new Promise(r=>release=r);
 await page.route('**/auth/v1/authorize**',async route=>{authorizeRequested=true;await gate;await route.abort();});
 const authorize=page.waitForRequest(request=>new URL(request.url()).pathname.includes('/auth/v1/authorize'));await page.getByRole('button',{name:/Google/}).click({noWaitAfter:true});const request=await authorize;expect(new URL(request.url()).searchParams.get('provider')).toBe('google');await expect.poll(()=>authorizeRequested).toBe(true);
 results.push({engine:name,width,localeQueryHash:'pass',theme:'pass',clientAndBackNavigation:'pass',fonts,japanese,callbackError:'pass',oauthAuthorizeRequest:'pass',oauthPendingUI:'covered by OAuth unit tests; immediate document navigation prevents stable browser DOM assertion',errorViolations:errorAudit.violations});
 release();await context.close();
 }
 await browser.close();
}
writeFileSync('docs/design/site-integration-evidence/site-flows.json',JSON.stringify(results,null,2)+'\n');console.log('4 real Next interaction flows passed (Chromium/WebKit, desktop/touch). OAuth authorize requests intercepted; provider login not performed.');
