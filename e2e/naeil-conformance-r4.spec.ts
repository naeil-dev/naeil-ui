import { test, expect } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { measureNaeilPage } from '../src/components/naeil-page-measure';
import { assessNaeilPage } from '../bin/conformance-runtime.mjs';
const exec = promisify(execFile);
let server: Server, origin: string, root: string;
const received: {url: string; cookie: string; first?: string; second?: string}[] = [];

// Controlled geometry fixture: each gap is independently set in CSS; no DS measurements build the expected values.
const html = (content = '<section><p>Content</p></section>') => `<!doctype html><html><head>
<title>Fixture — .naeil estimate</title>
<link rel="icon" href="/favicon.ico" type="image/x-icon" sizes="16x16">
<link rel="icon" href="/icon.svg" type="image/svg+xml" sizes="any">
<link rel="apple-touch-icon" href="/apple-icon.png" type="image/png" sizes="180x180">
<style>body{margin:0;font-size:16px}header{height:64px}main{padding:48px 16px 96px}
.ui-page-header{margin-bottom:32px}h1{font-size:32px;line-height:42px;font-weight:600;margin:0}
.ui-page-description{margin:12px 0 0;line-height:25px}p{margin:0;line-height:25px}footer{height:100px}</style>
<script>document.documentElement.className=localStorage.getItem('theme')||'dark';if(location.pathname==='/authenticated'&&localStorage.getItem('session-data')!=='keep')document.title='Lost authentication state';</script></head><body>
<header data-naeil-header></header><main id="main" class="ui-app-main"><div class="ui-page-header"><h1>Title</h1><p class="ui-page-description">Description</p></div>${content}</main><footer data-naeil-footer></footer></body></html>`;

test.beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), 'shell-r4-http-'));
  server = createServer((request, response) => {
    const path = new URL(request.url!, 'http://fixture').pathname;
    received.push({url: path, cookie: request.headers.cookie ?? '', first: request.headers['x-first'] as string, second: request.headers['x-second'] as string});
    if (path === '/redirect') { response.writeHead(302, {location: '/settings'}).end(); return; }
    if (path === '/redirect-error') { response.writeHead(302, {location: '/unknown'}).end(); return; }
    if (path === '/') { response.writeHead(307, {location: '/en'}).end(); return; }
    if (path === '/authenticated' && (!request.headers.cookie?.includes('session=fixture') || request.headers['x-first'] !== 'one:two' || request.headers['x-second'] !== 'second')) { response.writeHead(401, {'content-type':'text/html'}).end(html()); return; }
    const status = path === '/unknown' ? 404 : path === '/access-denied' ? 403 : 200;
    let document = html(path === '/bad-error' ? '<section style="padding-bottom:64px"><p>Content</p></section>'
      : path === '/painted-card' ? '<section><div style="border:1px solid #888;padding:24px"><p>Card</p></div></section>'
      : path === '/padded-wrapper' ? '<section><div style="padding-bottom:64px"><p>Content</p></div></section>'
      : path === '/scroll-svg' ? '<section><div style="overflow:auto;height:100px"><div style="height:2000px">Tall</div></div><svg width="40" height="40" style="display:block"><rect width="40" height="40"/></svg></section>'
      : path === '/inline-only' ? '<section><p style="line-height:25px"><span style="font-size:16px">Only inline text</span></p></section>'
      : path === '/busy' ? '<section aria-busy="true" style="padding-bottom:64px"><p>Loading</p></section><script>setTimeout(()=>{const s=document.querySelector("section");s.removeAttribute("aria-busy");s.style.paddingBottom="0";s.innerHTML="<p>Loaded</p>";},800)</script>'
      : path === '/late' ? '<section style="padding-bottom:64px"><p>Loading</p></section><script>setTimeout(()=>{const s=document.querySelector("section");s.style.paddingBottom="0";s.innerHTML="<p id=ready>Loaded</p>";},800)</script>'
      : path === '/closed-details' ? `<section><p>Content</p><details><summary style="line-height:25px">More</summary><pre>${'hidden line\n'.repeat(120)}</pre></details></section>` : undefined);
    if (path === '/client-redirect') document = document.replace('</body>', '<script>requestAnimationFrame(()=>requestAnimationFrame(()=>history.replaceState({},"","/settings")))</script></body>');
    if (path === '/client-error') document = document.replace('</body>', '<script>addEventListener("load",()=>requestAnimationFrame(()=>location.replace("/unknown")))</script></body>');
    response.writeHead(status, {'content-type':'text/html', 'cache-control':'no-store'}).end(document);
  });
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
  const address = server.address(); if (!address || typeof address === 'string') throw Error('No fixture server');
  origin = `http://127.0.0.1:${address.port}`;
});
test.afterAll(async () => { await new Promise<void>(done => server.close(() => done())); rmSync(root, {recursive:true, force:true}); });
async function cli(routes: string[], args: string[] = []) {
  try { return {...await exec(process.execPath, [process.env.NAEIL_UI_CONFORMANCE_BIN ?? 'bin/naeil-ui-conformance.mjs', '--service','estimate','--url', origin, '--routes', routes.join(','), ...args], {timeout:90000}), code: 0}; }
  catch (error) { return error as unknown as {code: number; stdout: string; stderr: string}; }
}
test('runtime applies authentication to every fresh context and strips stored theme without mutating the file', async () => {
  test.setTimeout(90000);
  const state = join(root, 'session.json');
  const json = JSON.stringify({cookies: [{name:'session',value:'fixture',domain:'127.0.0.1',path:'/',expires:-1,httpOnly:true,secure:false,sameSite:'Lax'}], origins:[{origin, localStorage:[{name:'theme',value:'light'},{name:'session-data',value:'keep'}]}]});
  writeFileSync(state, json);
  const result = await cli(['/authenticated'], ['--storage-state',state,'--header','X-First:one:two','--header','X-Second:second']);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  expect(result.stdout).toContain('4 checks, 0 failures');
  expect(received.filter(item => item.url === '/authenticated' && item.cookie.includes('session=fixture') && item.first === 'one:two' && item.second === 'second')).toHaveLength(4);
  expect(readFileSync(state, 'utf8')).toBe(json);
  const rejected = await cli(['/authenticated']);
  expect(rejected.code).toBe(1); expect(rejected.stdout).toContain('HTTP 401');
});
test('intentional error responses require exact status and still receive geometry checks', async () => {
  test.setTimeout(90000);
  const passed = await cli(['/unknown','/access-denied'], ['--expect-status','/unknown=404','--expect-status','/access-denied=403']);
  expect(passed.code, passed.stdout + passed.stderr).toBe(0); expect(passed.stdout).toContain('8 checks, 0 failures');
  const mismatch = await cli(['/unknown'], ['--expect-status','/unknown=403']);
  expect(mismatch.code).toBe(1); expect(mismatch.stdout).toContain('expected 403');
  const implicit = await cli(['/unknown']); expect(implicit.code).toBe(1); expect(implicit.stdout).toContain('HTTP 404');
  const geometry = await cli(['/bad-error'], ['--expect-status','/bad-error=200']);
  expect(geometry.code).toBe(1); expect(geometry.stdout).toContain('last content → footer: 160');
  const navigated = await cli(['/client-error'], ['--expect-status','/client-error=404','--allow-redirect','/client-error=/unknown']);
  expect(navigated.code, navigated.stdout + navigated.stderr).toBe(0);
  const httpRedirects = await cli(['/redirect','/redirect-error'], ['--expect-status','/redirect-error=404','--allow-redirect','/redirect=/settings','--allow-redirect','/redirect-error=/unknown']);
  expect(httpRedirects.code, httpRedirects.stdout + httpRedirects.stderr).toBe(0);
});
test('unexpected final route fails, explicit redirects and locale aliases pass', async () => {
  test.setTimeout(90000);
  const rejected = await cli(['/redirect']); expect(rejected.code).toBe(1); expect(rejected.stdout).toContain('redirect');
  const allowed = await cli(['/redirect'], ['--allow-redirect','/redirect=/settings']);
  expect(allowed.code, allowed.stdout + allowed.stderr).toBe(0);
  const wrong = await cli(['/redirect'], ['--allow-redirect','/redirect=/login']); expect(wrong.code).toBe(1);
  const localized = await cli(['/']); expect(localized.code, localized.stdout + localized.stderr).toBe(0);
  const client = await cli(['/client-redirect']); expect(client.code, client.stdout + client.stderr).toBe(1);
  const clientAllowed = await cli(['/client-redirect'], ['--allow-redirect','/client-redirect=/settings']); expect(clientAllowed.code, clientAllowed.stdout + clientAllowed.stderr).toBe(0);
});
test('measurement descends wrappers, checks header/content spacing and retains icon origin', async ({page}) => {
  await page.goto(origin + '/settings');
  expect(assessNaeilPage(await page.evaluate(measureNaeilPage), {service:'estimate'})).toEqual([]);
  await page.evaluate(() => document.querySelector('section')!.style.paddingBottom = '64px');
  expect(assessNaeilPage(await page.evaluate(measureNaeilPage), {service:'estimate'})).toContain('last content → footer: 160 (expected 96 ±0.5px)');
  await page.evaluate(() => { document.querySelector('section')!.style.paddingBottom = '0'; document.querySelector<HTMLElement>('.ui-page-header')!.style.marginBottom = '64px'; });
  expect(assessNaeilPage(await page.evaluate(measureNaeilPage), {service:'estimate'})).toContain('PageHeader → content: 64 (expected 32 ±0.5px)');
  await page.evaluate(() => document.querySelector<HTMLLinkElement>('link[href="/icon.svg"]')!.href = 'https://other.example/icon.svg');
  expect(assessNaeilPage(await page.evaluate(measureNaeilPage), {service:'estimate'})).toContain('icon links must use the document origin');
});
test('transparent header wrappers and direct main text retain measured boundaries', async ({page}) => {
  await page.goto(origin + '/settings');
  await page.evaluate(() => {
    const header = document.querySelector('.ui-page-header')!, wrapper = document.createElement('div');
    wrapper.style.display = 'contents'; header.replaceWith(wrapper); wrapper.append(header);
    document.querySelector<HTMLElement>('section')!.style.marginTop = '64px';
  });
  expect(assessNaeilPage(await page.evaluate(measureNaeilPage), {service:'estimate'})).toContain('PageHeader → content: 64 (expected 32 ±0.5px)');
  await page.goto(origin + '/settings');
  await page.evaluate(() => {
    document.querySelector('.ui-page-header')!.remove(); document.querySelector('section')!.remove();
    const main = document.querySelector('main')!;
    main.style.lineHeight = '25px'; main.append('Trailing main text');
  });
  const values = await page.evaluate(measureNaeilPage);
  const actual = await page.evaluate(() => {
    const range = document.createRange(); range.selectNodeContents(document.querySelector('main')!.lastChild!);
    return document.querySelector('footer')!.getBoundingClientRect().top - range.getBoundingClientRect().bottom;
  });
  expect(values.contentFooter).toBe(actual);
});

test('closed <details> content does not count as the last visible content', async () => {
  test.setTimeout(90000);
  const result = await cli(['/closed-details']);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  expect(result.stdout).toContain('4 checks, 0 failures');
});

test('content boundary: painted boxes, scroll containers, replaced and inline-only blocks end the content; transparent wrapper padding stays in the gap', async () => {
  test.setTimeout(120000);
  for (const route of ['/painted-card', '/scroll-svg', '/inline-only']) {
    const result = await cli([route]);
    expect(result.code, route + result.stdout + result.stderr).toBe(0);
  }
  const padded = await cli(['/padded-wrapper']);
  expect(padded.code).toBe(1);
  expect(padded.stdout + padded.stderr).toContain('160');
});

test('runtime waits for aria-busy to clear and for --wait-for selectors before measuring', async () => {
  test.setTimeout(120000);
  const busy = await cli(['/busy']);
  expect(busy.code, busy.stdout + busy.stderr).toBe(0);
  const late = await cli(['/late'], ['--wait-for', '/late=#ready']);
  expect(late.code, late.stdout + late.stderr).toBe(0);
  const unwaited = await cli(['/late']);
  expect(unwaited.code).toBe(1);
});
