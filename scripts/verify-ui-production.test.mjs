import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { assertGeometry, assertRouteDestination, readChrome } from './verify-ui-production.mjs';
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
