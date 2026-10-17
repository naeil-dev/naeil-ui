import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Actual built Next application; only Auth/provider transport and invite RPC are
// synthetic. Never accepts an external URL, live cookie, environment or user data.
const origin = 'http://localhost:2482';
const authOrigin = 'http://127.0.0.1:55431';
const evidence = resolve('test-results/site-account-language');
const artifact = process.env.NAEIL_ACCOUNT_TEST_ARTIFACT;
const receipt = artifact ? JSON.parse(readFileSync(join(artifact, 'receipt.json'), 'utf8')) : undefined;
if (receipt) {
  assert.equal(receipt.scope,'local-synthetic-auth-verification-only');
  assert.equal(receipt.publicAuthOrigin,authOrigin);
}
mkdirSync(evidence, { recursive: true });
const privateDir = mkdtempSync(join(realpathSync(tmpdir()), 'site-account-language-'));
const privateConfig = join(privateDir, 'invite.json');
writeFileSync(privateConfig, JSON.stringify({siteOrigin: origin, supabaseUrl: authOrigin, anonKey:'fixture-anon', serviceRoleKey:'fixture-service'}), {mode:0o600});
const user = {id:'20000000-0000-4000-8000-000000000002', email:'account@example.test', user_metadata:{full_name:'Integration Account'}, app_metadata:{}, aud:'authenticated', role:'authenticated', created_at:'2026-01-01T00:00:00Z'};
let outage = false;
const logouts = [];
const auth = createServer((req, res) => {
  if (req.url.startsWith('/auth/v1/logout')) {
    logouts.push(req.url);
    if(outage) res.writeHead(503, {'Content-Type':'application/json'}).end(JSON.stringify({error_code:'unexpected_failure'}));
    else res.writeHead(204).end();
    return;
  }
  if (req.url.startsWith('/auth/v1/authorize')) { res.writeHead(200, {'Content-Type':'text/html'}).end('<title>Synthetic provider</title>Provider fixture'); return; }
  if (req.url.startsWith('/auth/v1/token?grant_type=pkce')) {
    res.writeHead(200, {'Content-Type':'application/json'});
    res.end(JSON.stringify({access_token:'synthetic.access.token',refresh_token:'synthetic-refresh',token_type:'bearer',expires_in:3600,user}));
    return;
  }
  res.writeHead(outage ? 503 : 200, {'Content-Type':'application/json'});
  res.end(JSON.stringify(outage ? {error_code:'unexpected_failure'} : user));
});
let app, browser;
const checks = [];
const ui = {
  en:{account:'Account menu', menu:'Menu', logout:'Log out', login:'Log in', language:'Language'},
  ko:{account:'계정 메뉴', menu:'메뉴', logout:'로그아웃', login:'로그인', language:'언어'},
  ja:{account:'アカウントメニュー', menu:'メニュー', logout:'ログアウト', login:'ログイン', language:'言語'},
};
const rootPath = locale => locale === 'en' ? '' : '/'+locale;
function activeSession(cookies) {
  const generation = cookies.find(c=>c.name==='naeil-site-auth-generation')?.value;
  const epoch = cookies.find(c=>c.name==='naeil-site-auth-epoch')?.value ?? 'initial';
  return cookies.find(c=>c.name===`sb-naeil-site-auth-${generation}-${epoch}`);
}
async function addSession(context) {
  const session = {access_token:'synthetic.access.token', refresh_token:'synthetic-refresh', token_type:'bearer', expires_in:3600, expires_at:Math.floor(Date.now()/1000)+3600, user};
  const generation='a'.repeat(32), epoch='b'.repeat(32);
  await context.addCookies([
    {name:'naeil-site-auth-generation',value:generation,httpOnly:true},
    {name:'naeil-site-auth-epoch',value:epoch,httpOnly:true},
    {name:`sb-naeil-site-auth-${generation}-${epoch}`,value:'base64-'+Buffer.from(JSON.stringify(session)).toString('base64url')},
  ].map(cookie=>({...cookie,domain:'localhost',path:'/',sameSite:'Lax'})));
}
async function headerAccount(page, labels) {
  const menu = page.getByRole('button',{name:labels.menu,exact:true});
  if (await menu.isVisible()) {
    if(page.viewportSize().width<800) await menu.tap();
    else await menu.click();
  }
  return page.getByRole('button',{name:labels.account,exact:true});
}
try {
  // Refuse preexisting listeners instead of reusing another worker's process.
  for (const [port, host] of [[2482,'localhost'],[55431,'127.0.0.1']]) {
    const guard = createServer();
    await new Promise((yes,no)=>{guard.once('error',no);guard.listen(port,host,yes);});
    await new Promise(yes=>guard.close(yes));
  }
  await new Promise((yes,no)=>{auth.once('error',no);auth.listen(55431,'127.0.0.1',yes);});
  app = spawn(process.execPath,artifact ? [join(artifact,'standalone/server.js')] : ['node_modules/next/dist/bin/next','start','--hostname','localhost','--port','2482'], {
    env:{...process.env,PORT:'2482',HOSTNAME:'localhost',NAEIL_INVITE_DIST_DIR:'.next-console-invite',NAEIL_INVITE_CONFIG_FILE:privateConfig,NEXT_PUBLIC_SUPABASE_URL:authOrigin,NEXT_PUBLIC_SUPABASE_ANON_KEY:'fixture-anon'},stdio:['ignore','ignore','pipe'],
  });
  app.stderr.on('data',()=>{});
  for (let i=0;i<80;i++) { try { if ((await fetch(origin+'/api/health')).ok) break; } catch {} if(i===79) throw Error('Owned app failed to start'); await new Promise(r=>setTimeout(r,250)); }
  const identity = await (await fetch(origin+'/.well-known/naeil-ui.json')).json();
  if (receipt) assert.deepEqual(identity,receipt.identity);
  browser = await chromium.launch();
  for (const locale of ['ko','ja','en']) for (const width of [390,768,1440,1920]) for (const theme of ['light','dark']) for (const authenticated of [false,true]) {
    const context = await browser.newContext({viewport:{width,height:900},colorScheme:theme,locale:locale==='en'?'en-US':locale==='ja'?'ja-JP':'ko-KR',hasTouch:width<800});
    try {
      if(authenticated) await addSession(context);
      await context.addInitScript(theme=>localStorage.setItem('theme',theme),theme);
      const page = await context.newPage();
      await page.route('https://**/*',route=>route.abort());
      await page.goto(origin+rootPath(locale)+'/blog?filter=two%20words#results');
      const labels = ui[locale];
      await expect(page.locator('[data-naeil-header]')).toHaveAttribute('data-naeil-ui-version','0.7.1');
      await expect(page.locator('html')).toHaveClass(new RegExp(theme));
      const trigger = await headerAccount(page,labels);
      if(authenticated) {
        if(width<800) await trigger.tap();
        else await trigger.click();
        await expect(page.locator('[data-naeil-account-menu]')).toContainText(user.email);
        await expect(page.locator('[data-naeil-account-menu]')).toContainText('Integration Account');
        await page.keyboard.press('Escape');
        await expect(trigger).toBeFocused();
      } else {
        const login = page.locator('[data-naeil-account-state="signed-out"]:visible');
        const href = await login.getAttribute('href');
        assert.equal(new URL(href,origin).searchParams.get('next'),rootPath(locale)+'/blog?filter=two%20words#results');
      }
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      if(width===390 || width===1440) {
        await page.screenshot({path:join(evidence,`${locale}-${width}-${theme}-${authenticated?'account':'login'}.png`)});
      }
      checks.push({locale,width,theme,authenticated,status:'passed'});
    } finally {await context.close();}
  }
  const context = await browser.newContext({viewport:{width:1440,height:900}});
  const page = await context.newPage();
  await page.route('https://**/*',route=>route.abort());
  await page.goto(origin+'/ja/blog?filter=two%20words#results');
  await page.getByRole('combobox',{name:ui.ja.language}).click();
  await page.getByRole('option',{name:'한국어',exact:true}).click();
  await expect(page).toHaveURL(origin+'/ko/blog?filter=two%20words#results');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang','ko');
  await page.locator('[data-naeil-account-state="signed-out"]:visible').click();
  await page.getByRole('button',{name:/Google/}).click();
  await expect(page).toHaveURL(new RegExp(authOrigin+'/auth/v1/authorize'));
  const authorization = new URL(page.url());
  assert.equal(authorization.searchParams.get('prompt'),'select_account');
  assert.ok(authorization.searchParams.get('code_challenge'));
  const preparedCookies=await context.cookies(origin);
  const returnSuffix=`${preparedCookies.find(c=>c.name==='naeil-site-auth-generation')?.value}-${preparedCookies.find(c=>c.name==='naeil-site-auth-epoch')?.value ?? 'initial'}`;
  const redirectCookie=preparedCookies.find(c=>c.name===`auth_redirect_to-${returnSuffix}`);
  assert.ok(redirectCookie, 'Return state must belong to the prepared login binding');
  assert.equal(decodeURIComponent(redirectCookie.value),'/ko/blog?filter=two%20words#results');
  const callback = await context.request.get(origin+'/auth/callback?error=denied', {maxRedirects:0});
  assert.equal(callback.headers()['referrer-policy'],'no-referrer');
  assert.match(callback.headers()['cache-control'],/no-store/);
  await page.goto(origin+'/auth/callback?error=denied');
  await expect(page).toHaveURL(/\/ko\/login\?error=auth/);
  assert.equal(new URL(page.url()).searchParams.get('next'),'/ko/blog?filter=two%20words#results');
  await expect(page.locator('p[role="alert"]')).not.toHaveText('');
  await page.goto(origin+'/auth/callback?code=synthetic-code');
  await expect(page).toHaveURL(origin+'/ko/blog?filter=two%20words#results');
  const signedInCookies = await context.cookies(origin);
  assert.equal(activeSession(signedInCookies)?.domain,'localhost');
  assert.ok(!signedInCookies.some(c=>/^auth_redirect_(?:to|locale)(?:-|$)/.test(c.name)));
  checks.push({flow:'locale/reload/query/hash/provider/retry',status:'passed'});
  await page.goto(origin+'/ja/login?next='+encodeURIComponent('/ja/blog?q=100%25#success%25'));
  await expect(page).toHaveURL(origin+'/ja/blog?q=100%25#success%25');
  checks.push({flow:'existing session preserves one locale prefix and percent-bearing query/fragment',status:'passed'});
  await addSession(context);
  await page.goto(origin+'/ja/blog');
  await (await headerAccount(page,ui.ja)).click();
  await page.getByRole('menuitem',{name:ui.ja.logout,exact:true}).click();
  await expect(page.locator('[data-naeil-account-state="signed-out"]:visible')).toBeVisible();
  assert.deepEqual(logouts,['/auth/v1/logout?scope=local']);
  checks.push({flow:'actual server action local logout',status:'passed'});
  await addSession(context); outage=true;
  const failed=await page.goto(origin+'/ja/sa/reports/example?tab=one');
  assert.equal(failed.status(),503);
  assert.ok(activeSession(await context.cookies(origin)));
  checks.push({flow:'temporary Auth failure retains site cookie and protects document',status:'passed'});
  await context.addCookies([{name:'sb-legacy-auth-token',value:'preserved-other-service',domain:'localhost',path:'/',sameSite:'Lax'}]);
  await page.goto(origin+'/ja/blog');
  await (await headerAccount(page,ui.ja)).click();
  await expect(page.locator('[data-naeil-account-menu]')).not.toContainText(user.email);
  await page.getByRole('menuitem',{name:ui.ja.logout,exact:true}).click();
  const localLogout=page.getByRole('button',{name:'このブラウザーでログアウト',exact:true});
  await expect(localLogout).toBeVisible();
  await expect(page).toHaveURL(origin+'/ja/blog');
  assert.ok(activeSession(await context.cookies(origin)));
  const recoveryAudit=await new AxeBuilder({page}).include('[data-sonner-toaster]').analyze();
  assert.deepEqual(recoveryAudit.violations,[]);
  const recoveryToast=page.locator('[data-sonner-toast]').filter({has:localLogout});
  await expect.poll(async()=>{const box=await recoveryToast.boundingBox();return box ? box.y+box.height : Infinity;}).toBeLessThanOrEqual(900);
  await page.screenshot({path:join(evidence,'ja-outage-local-logout-recovery.png')});
  await page.setViewportSize({width:390,height:844});
  await expect.poll(async()=>{const box=await recoveryToast.boundingBox();return box ? box.y+box.height : Infinity;}).toBeLessThanOrEqual(844);
  assert.ok((await localLogout.boundingBox()).height>=44);
  assert.equal(await recoveryToast.evaluate(el=>el.scrollWidth>el.clientWidth),false);
  await page.screenshot({path:join(evidence,'ja-mobile-outage-local-logout-recovery.png')});
  await page.setViewportSize({width:1440,height:900});
  await localLogout.click();
  await expect(page).toHaveURL(origin+'/ja');
  await expect(page.locator('[data-naeil-account-state="signed-out"]:visible')).toBeVisible();
  const clearedCookies=await context.cookies(origin);
  assert.equal(activeSession(clearedCookies),undefined);
  assert.equal(clearedCookies.find(c=>c.name==='sb-legacy-auth-token')?.value,'preserved-other-service');
  outage=false;
  await page.locator('[data-naeil-account-state="signed-out"]:visible').click();
  await page.getByRole('button',{name:/Google/}).click();
  await expect(page).toHaveURL(new RegExp(authOrigin+'/auth/v1/authorize'));
  await page.goto(origin+'/auth/callback?code=synthetic-code-after-clear');
  await expect(page).toHaveURL(origin+'/ja');
  await expect(page.locator('[data-naeil-account-state="signed-in"]:visible')).toBeVisible();
  checks.push({flow:'outage shared menu, truthful failed logout, explicit local clear and fresh login',status:'passed'});
  for(const locale of ['ko','ja','en']) {
    await page.goto(origin+'/auth/invite?locale='+locale);
    await expect(page.locator('html')).toHaveAttribute('lang',locale);
    await expect(page).toHaveTitle(/ — \.naeil$/);
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href','/icon.svg');
    const audit=await new AxeBuilder({page}).analyze();
    assert.deepEqual(audit.violations,[]);
    await page.locator('#language').click();
    const next={ko:'ja',ja:'en',en:'ko'}[locale];
    await expect(page).toHaveURL(origin+'/auth/invite?locale='+next);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang',next);
    checks.push({flow:'isolated invitation language/reload',locale,status:'passed'});
  }
  await context.close();
  writeFileSync(join(evidence,'summary.json'),JSON.stringify({scope:'actual-built-app-synthetic-auth-transport',productionVerified:false,identity,artifact:artifact??null,checks},null,2));
  console.log(JSON.stringify({passed:checks.length,evidence}));
} finally {
  await browser?.close();
  if(app && app.exitCode===null) {const ended=new Promise(resolve=>app.once('exit',resolve));app.kill('SIGTERM');await ended;}
  await new Promise(resolve=>auth.close(resolve));
  rmSync(privateDir,{recursive:true,force:true});
}
