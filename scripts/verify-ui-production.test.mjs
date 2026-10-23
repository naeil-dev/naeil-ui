import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { assertGeometry, assertRouteDestination, assertRouteState, checkMenu, readChrome } from './verify-ui-production.mjs';
const contract = JSON.parse(readFileSync(new URL('../contracts/naeil-chrome.v1.json', import.meta.url)));
const baseline = {
  layoutWidth: 1920, layoutX: 0, headerFrame: { x: 160, width: 1600, padding: 40 }, footerFrame: { x: 160, width: 1600, padding: 40 },
  headerHeight: 65, headerBrand: { height: 28, offset: 40 }, footerBrand: { height: 20, offset: 40 }, overflow: false,
  expectedFont: 'Pretendard', fontLoaded: true, fontFamily: 'Pretendard, sans-serif', background: 'black', foreground: 'white',
};
test('independent contract rejects self-consistent wrong consumer tokens', () => {
  assert.doesNotThrow(() => assertGeometry(baseline, contract, baseline));
  const drift = structuredClone(baseline);
  drift.headerFrame = drift.footerFrame = { x: 320, width: 1280, padding: 24 };
  drift.headerBrand.offset = drift.footerBrand.offset = 24;
  assert.throws(() => assertGeometry(drift, contract, baseline), /frame width/);
});
test('font fallback and shared visual drift fail even when geometry agrees', () => {
  assert.throws(() => assertGeometry({ ...baseline, fontLoaded: false }, contract, baseline), /not loaded/);
  assert.throws(() => assertGeometry({ ...baseline, background: 'purple' }, contract, baseline), /background mismatch/);
});
test('a login redirect cannot certify a protected route', () => {
  assert.throws(() => assertRouteDestination('https://example.org/login', { path: '/settings' }, 'https://example.org'), /another route/);
  assert.doesNotThrow(() => assertRouteDestination('https://example.org/en', { path: '/', expectedPath: '/en' }, 'https://example.org'));
  assert.throws(() => assertRouteDestination('https://outside.org/settings', { path: '/settings' }, 'https://example.org'), /another origin/);
});
test('registered application theme labels still require working theme changes and focus restoration', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage(); page.setDefaultTimeout(1000);
    await page.route('https://naeil.dev/**', route => route.abort());
    await page.setContent(`<html class="light"><header data-naeil-header><button id="projects">Projects</button><button id="theme">Theme</button></header><div id="catalog" role="dialog" aria-label="Projects" hidden>${Array.from({length:5}, (_, i) => `<img src="https://naeil.dev/images/fixture-${i}.png">`).join('')}</div><script>
      const catalog = document.getElementById('catalog'), projects = document.getElementById('projects');
      projects.onclick = () => { catalog.hidden = false; };
      document.addEventListener('keydown', e => { if(e.key === 'Escape') { catalog.hidden = true; projects.focus(); } });
      document.getElementById('theme').onclick = () => { document.documentElement.className = document.documentElement.className === 'light' ? 'dark' : 'light'; };
    </script></html>`, { waitUntil: 'domcontentloaded' });
    await checkMenu(page, 'en', 'light', { themeControlLabels: { light: 'Theme', dark: 'Theme' } });
    assert.equal(await page.locator('html').getAttribute('class'), 'light');
    await page.locator('#theme').evaluate(button => { button.onclick = null; });
    await assert.rejects(checkMenu(page, 'en', 'light', { themeControlLabels: { light: 'Theme', dark: 'Theme' } }), /Timeout/);
    await page.locator('#theme').evaluate(button => { button.onclick = () => document.documentElement.classList.add('light', 'dark'); });
    await assert.rejects(checkMenu(page, 'en', 'light', { themeControlLabels: { light: 'Theme', dark: 'Theme' } }), /Timeout/);
  } finally { await browser.close(); }
});
test('browser font verification accepts real static/variable faces and rejects fallback-only stacks', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    for (const [family, file] of [['Pretendard', 'static/woff2/Pretendard-Regular.woff2'], ['Pretendard Variable', 'variable/woff2/PretendardVariable.woff2']]) {
      const font = readFileSync(new URL(`../node_modules/pretendard/dist/web/${file}`, import.meta.url)).toString('base64');
      await page.setContent(`<style>@font-face{font-family:'${family}';src:url(data:font/woff2;base64,${font})}header{font-family:'${family}',sans-serif}</style><header data-naeil-header><div class="ui-navigation-frame"><a data-app-brand><svg></svg></a>한글 Latin</div></header><footer data-naeil-footer><div class="ui-site-footer-frame"><a data-footer-brand><svg></svg></a></div></footer>`);
      const loaded = await readChrome(page, 'ko'); assert.equal(loaded.fontLoaded, true); assert.equal(loaded.renderedFont, family);
      if (family === 'Pretendard') {
        await page.addStyleTag({ content: 'header{font-family:"Pretendard Variable",Pretendard,sans-serif}' });
        assert.equal((await readChrome(page, 'ko')).fontLoaded, true, 'An absent approved variable face may use the registered static face');
      }
      await page.addStyleTag({ content: `header{font-family:Arial,'${family}',sans-serif}` });
      assert.equal((await readChrome(page, 'ko')).fontLoaded, false, 'A later approved fallback must not certify Arial');
    }
    await page.setContent('<header data-naeil-header style="font-family:Pretendard,sans-serif"><div class="ui-navigation-frame"><a data-app-brand><svg></svg></a>Missing webfont</div></header><footer data-naeil-footer><div class="ui-site-footer-frame"><a data-footer-brand><svg></svg></a></div></footer>');
    assert.equal((await readChrome(page, 'ko')).fontLoaded, false, 'Missing faces must not certify system fallback');
  } finally { await browser.close(); }
});

test('Japanese font verification loads both Japanese and Latin unicode subsets', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const font = readFileSync(new URL('../node_modules/pretendard/dist/web/static/woff2/Pretendard-Regular.woff2', import.meta.url));
    const loaded = [];
    await page.route('https://font.test/**', async route => {
      loaded.push(new URL(route.request().url()).pathname);
      await route.fulfill({ status: 200, contentType: 'font/woff2', headers: { 'access-control-allow-origin': '*' }, body: font });
    });
    await page.setContent(`<style>
      @font-face{font-family:'Noto Sans JP';src:url(https://font.test/japanese.woff2);unicode-range:U+3000-9FFF}
      @font-face{font-family:'Noto Sans JP';src:url(https://font.test/latin.woff2);unicode-range:U+0-FF}
      header{font-family:'Noto Sans JP',sans-serif}
      </style><header data-naeil-header><div class="ui-navigation-frame"><a data-app-brand><svg></svg></a>日本語</div></header><footer data-naeil-footer><div class="ui-site-footer-frame"><a data-footer-brand><svg></svg></a></div></footer>`);
    const result = await readChrome(page, 'ja');
    assert.equal(result.fontLoaded, true);
    assert(loaded.includes('/japanese.woff2'));
    assert(loaded.includes('/latin.woff2'), 'The Latin subset must finish before certifying the font');
  } finally { await browser.close(); }
});

test('a same-URL SPA login cannot certify an authenticated screen', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(200);
    await page.setContent('<main><input type="password"><div data-workspace hidden>Fixture workspace</div></main>');
    const route = { path: '/', renderState: { access: 'protected', visible: '[data-workspace]', hidden: ['input[type=password]'] } };
    await assert.rejects(assertRouteState(page, route), /visible|Timeout/);
    await page.locator('[data-workspace]').evaluate(el => el.hidden = false);
    await assert.rejects(assertRouteState(page, route), /Unexpected visible state/);
    await page.locator('input').evaluate(el => el.remove());
    await assertRouteState(page, route);
    await assert.rejects(assertRouteState(page, { path: '/' }), /Explicit route access/);
    await assert.rejects(assertRouteState(page, { renderState: { access: 'protected' } }), /visible state marker/);
    await assertRouteState(page, { renderState: { access: 'public' } });
  } finally { await browser.close(); }
});

test('Japanese font verification rejects a Latin-only face with Japanese fallback', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const font = readFileSync(new URL('../node_modules/pretendard/dist/web/static/woff2/Pretendard-Regular.woff2', import.meta.url)).toString('base64');
    await page.setContent(`<style>@font-face{font-family:'Noto Sans JP';src:url(data:font/woff2;base64,${font});unicode-range:U+0-FF}header{font-family:'Noto Sans JP',sans-serif}</style><header data-naeil-header><div class="ui-navigation-frame"><a data-app-brand><svg></svg></a>日本語 Latin</div></header><footer data-naeil-footer><div class="ui-site-footer-frame"><a data-footer-brand><svg></svg></a></div></footer>`);
    assert.equal((await readChrome(page, 'ja')).fontLoaded, false, 'Latin coverage must not certify missing Japanese faces');
  } finally { await browser.close(); }
});
test('protected production contexts require an explicit scoped provider while public routes stay anonymous', async () => {
  const { createVerificationContext } = await import('./verify-ui-production.mjs');
  const browser = await chromium.launch();
  try {
    const options = { browser, origin: 'https://jev.naeil.dev', viewport: { width: 390, height: 900 }, colorScheme: 'dark' };
    const protectedRoute = { path: '/', renderState: { access: 'protected', visible: '[data-workspace]' } };
    await assert.rejects(createVerificationContext({ ...options, route: protectedRoute }), /provider|authenticated/i);
    let calls = 0;
    const contextFactory = async ({ browser, origin, contextOptions }) => {
      assert.equal(origin, options.origin); calls++;
      const context = await browser.newContext(contextOptions);
      await context.addCookies([{ name: 'synthetic', value: 'test', url: origin }]);
      return context;
    };
    const protectedContext = await createVerificationContext({ ...options, route: protectedRoute, contextFactory });
    assert.equal((await protectedContext.cookies()).length, 1);
    await protectedContext.close();
    const publicContext = await createVerificationContext({ ...options, route: { renderState: { access: 'public' } }, contextFactory });
    assert.equal((await publicContext.cookies()).length, 0);
    assert.equal(calls, 1, 'Public checks must never inherit the private session');
    await publicContext.close();
  } finally { await browser.close(); }
});
