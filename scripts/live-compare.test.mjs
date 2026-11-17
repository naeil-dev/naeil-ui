import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import ts from 'typescript';
import { maskedRGBA, geometryComparison, footerMetaVerdict, MASK_POLICY, metaHeightAttribution } from './live-compare-chrome.mjs';
import { scriptRuns, perScriptFontVerdict, classifyDocument, fallbackChecks, readDocumentContract, errorDocumentSummary, compareRememberedThemes } from './live-compare-contract.mjs';
import { prepareFontProbes } from './live-compare-fonts.mjs';
import { distinctDifferences, rollup } from './live-compare-report.mjs';
import { diffRGBA, differenceCount, iconVerdict, near, parseArgs, requestAllowed, validTitle } from './live-compare.mjs';

test('pixel diff detects channel/alpha differences and unequal extents', () => {
  const a = { width: 2, height: 1, data: [0, 0, 0, 255, 20, 20, 20, 255] };
  assert.equal(diffRGBA(a, a).differentPixels, 0);
  const b = { ...a, data: [0, 0, 0, 254, 40, 20, 20, 255] };
  assert.equal(diffRGBA(a, b).differentPixels, 2);
  assert.equal(diffRGBA(a, b).over16Pixels, 1);
  const c = { width: 1, height: 2, data: [0, 0, 0, 255, 20, 20, 20, 255] };
  assert.equal(diffRGBA(a, c).differentPixels, 3);
});
test('owned footer meta must be absent or empty without hiding its pixels or height', () => {
  assert.equal(footerMetaVerdict([]).status, 'match');
  assert.equal(footerMetaVerdict(['', ' \n ']).status, 'match');
  assert.equal(footerMetaVerdict(undefined).status, 'not measured');
  const meta = footerMetaVerdict([' v1.2.3 ']);
  assert.equal(meta.status, 'differs');
  assert.deepEqual(meta.values.texts, ['v1.2.3']);
  assert(!MASK_POLICY.some(([band]) => band === 'footer'));
  const reference = { width: 2, height: 2, data: new Uint8ClampedArray(16).fill(255) };
  const actual = { width: 2, height: 3, data: new Uint8ClampedArray(24).fill(255) };
  actual.data[8] = 0;
  const options = { metaRectangles: [{ x: 0, y: 1, width: 1, height: 1 }], metaExtraHeight: 1 };
  const diff = diffRGBA(actual, reference, options);
  assert.equal(diff.over16Pixels, 3); // Meta text plus the complete extra height still fail.
  assert.equal(diff.outsideMetaOver16Pixels, 0);
  actual.data[0] = 0;
  assert.equal(diffRGBA(actual, reference, options).outsideMetaOver16Pixels, 1);
});
test('meta attribution never absorbs unrelated padding, gaps or minimum height', () => {
  const frameStyles = { rowGap: '32px', paddingBottom: '32px', minHeight: 'auto' };
  const reference = { size: { height: 2 }, metaFlow: { extension: 0, frameStyles } };
  const actual = { size: { height: 3 }, metaFlow: { extension: 1, frameStyles } };
  assert.equal(metaHeightAttribution(actual, reference), 1);
  assert.equal(metaHeightAttribution({ ...actual, size: { height: 100 } }, reference), 0);
  for (const key of ['rowGap', 'paddingBottom', 'minHeight']) {
    assert.equal(metaHeightAttribution({ ...actual, metaFlow: { ...actual.metaFlow, frameStyles: { ...frameStyles, [key]: '64px' } } }, reference), 0);
  }
  const pixels = (height) => ({ width: 2, height, data: new Uint8ClampedArray(2 * height * 4).fill(255) });
  const diff = diffRGBA(pixels(100), pixels(2), { metaRectangles: [{ x: 0, y: 1, width: 1, height: 1 }], metaExtraHeight: 1 });
  assert.equal(diff.over16Pixels, 196);
  assert.equal(diff.outsideMetaOver16Pixels, 196);
});
test('only pixel changes contained in measured meta/extra-height footprint share its cause', () => {
  const row = { id: 'home', site: 'home', checks: {
    footerMeta: { status: 'differs', values: { texts: ['v1.2.3'] } },
    footerPixels: { status: 'differs', values: { outsideMetaOver16Pixels: 0, over16Pixels: 30, totalPixels: 100 } },
  } };
  assert.equal(distinctDifferences([row]).length, 1);
  row.checks.footerPixels.values.outsideMetaOver16Pixels = 1;
  assert.equal(distinctDifferences([row]).length, 2);
});
test('title requires exact brand, named page and single separator', () => {
  assert(validTitle('프로젝트 — .naeil', 'naeil'));
  assert(validTitle('ログイン — .naeil home', 'home'));
  for (const title of ['', '.naeil home', ' — .naeil home', 'Login - .naeil home', 'Login — Home', 'Login — .naeil home — .naeil home']) assert(!validTitle(title, 'home'));
  assert(validTitle('.naeil home', 'home', true));
});
test('absence and not-measured never become successful numeric comparisons', () => {
  assert(!near(null, 0)); assert(!near(NaN, 0)); assert(near(96.125, 96));
  assert.equal(differenceCount([{ checks: { a: { status: 'not measured' }, b: { status: 'differs' }, c: { status: 'match' } } }]), 1);
});
test('read-only methods and credential origin guard include sibling subdomains', () => {
  const origin = 'https://jev.naeil.dev';
  assert(requestAllowed('GET', origin + '/login', origin, true));
  assert(requestAllowed('HEAD', origin + '/icon.svg', origin, false));
  for (const method of ['POST', 'DELETE', 'PUT', 'PATCH', 'OPTIONS']) assert(!requestAllowed(method, origin, origin, false));
  assert(!requestAllowed('GET', 'https://naeil.dev/login', origin, true));
  assert(!requestAllowed('GET', 'https://abstorm.naeil.dev/', origin, true));
  assert(requestAllowed('GET', 'https://naeil.dev/font.woff2', origin, false));
});
test('state is explicitly scoped to one known site, never a global file', () => {
  assert.deepEqual(Object.keys(parseArgs(['--storage-state', 'jev=/tmp/opaque.json']).states), ['jev']);
  assert.throws(() => parseArgs(['--storage-state', '/tmp/opaque.json']));
  assert.throws(() => parseArgs(['--storage-state', 'unknown=/tmp/opaque.json']));
  assert.throws(() => parseArgs(['--storage-state', 'jev=a', '--storage-state', 'jev=b']));
  assert.throws(() => parseArgs(['--out']));
});

test('icon differences need measured responses; transport failures are unknown', () => {
  const declarations = [{ rel: 'icon', href: 'https://naeil.dev/icon.svg', type: 'image/svg+xml', sizes: 'any' }];
  const reference = { declarations, responses: [{ url: 'https://naeil.dev/icon.svg', status: 200, type: 'image/svg+xml', sha256: 'abc' }] };
  const site = { origin: 'https://jev.naeil.dev' };
  const actual = { declarations: declarations.map(d => ({ ...d, href: site.origin + '/icon.svg' })), responses: [{ url: site.origin + '/icon.svg', status: 200, type: 'image/svg+xml', sha256: 'abc' }] };
  assert.equal(iconVerdict(actual, reference, site).status, 'match');
  assert.equal(iconVerdict({ ...actual, responses: [{ url: site.origin + '/icon.svg', error: 'timeout' }] }, reference, site).status, 'not measured');
  assert.equal(iconVerdict({ ...actual, responses: [{ url: site.origin + '/icon.svg', status: 404, sha256: 'def' }] }, reference, site).status, 'differs');
  assert.equal(iconVerdict(actual, undefined, site).status, 'not measured');
});

test('optional icon sizes/type notes never become response or byte differences', () => {
  const response = { url: 'https://naeil.dev/favicon.ico', status: 200, type: 'image/x-icon', sha256: 'same' };
  const reference = { declarations: [{ rel: 'icon', href: response.url, sizes: '16x16', type: 'image/x-icon' }], responses: [response] };
  const actual = { declarations: [{ rel: 'icon', href: 'https://jev.naeil.dev/favicon.ico?hash', sizes: '48x48', type: '' }], responses: [{ ...response, url: 'https://jev.naeil.dev/favicon.ico?hash' }] };
  assert.equal(iconVerdict(actual, reference, { origin: 'https://jev.naeil.dev' }).status, 'match');
  assert.deepEqual(actual.metadataNotes[0].differences.map(d => d.field), ['type', 'sizes']);
});


test('union masks hide only measured boxes and preserve the complete band height', () => {
  const a = { width: 3, height: 2, data: new Uint8ClampedArray(24).fill(255) };
  const b = { ...a, data: new Uint8ClampedArray(a.data) };
  b.data[0] = 0; b.data[4] = 0; b.data[8] = 0;
  const union = [{ x: 0, y: 0, width: 1, height: 1 }, { x: 1, y: 0, width: 1, height: 1 }];
  assert.equal(diffRGBA(maskedRGBA(a, union), maskedRGBA(b, union)).differentPixels, 1);
  assert.equal(maskedRGBA(a, []).height, 2);
  assert.equal(maskedRGBA(a, [{ x: -5, y: -5, width: 100, height: 100 }]).data.length, 24);
});
test('reusable measurement records only owned-shell meta and preserves standalone compatibility', { timeout: 30000 }, async () => {
  const source = await readFile(new URL('../src/components/naeil-page-measure.ts', import.meta.url), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 } }).outputText;
  const { measureNaeilPage } = await import(`data:text/javascript,${encodeURIComponent(js)}`);
  const browser = await chromium.launch({ channel: 'chrome', timeout: 15000 });
  try {
    const page = await browser.newPage(); page.setDefaultTimeout(5000);
    await page.setContent('<div class="ui-service-shell" data-naeil-shell><header data-naeil-header></header><main id="main" class="ui-app-main"><h1>Title</h1><p>Body</p></main><footer data-naeil-footer><div class="ui-site-footer-meta"> v1.2.3 </div></footer></div><footer data-naeil-footer><div class="ui-site-footer-meta">Standalone compatibility</div></footer>');
    assert.deepEqual((await page.evaluate(measureNaeilPage)).footerMetaTexts, ['v1.2.3']);
    await page.locator('.ui-service-shell .ui-site-footer-meta').evaluate(el => { el.textContent = ' '; });
    assert.deepEqual((await page.evaluate(measureNaeilPage)).footerMetaTexts, ['']);
    await page.locator('.ui-service-shell .ui-site-footer-meta').evaluate(el => el.remove());
    assert.deepEqual((await page.evaluate(measureNaeilPage)).footerMetaTexts, []);
    assert.equal(await page.locator('body > footer .ui-site-footer-meta').textContent(), 'Standalone compatibility');
  } finally { await browser.close(); }
});
test('relative geometry ignores global placement but catches shared style/size changes', () => {
  const e = { status: 'measured', geometry: { edge: 20, top: 10, width: 44, height: 44 }, styles: { color: 'same' }, state: null };
  const band = { elements: { theme: e } };
  assert.equal(geometryComparison(band, band).status, 'match');
  assert.equal(geometryComparison({ elements: { theme: { ...e, rect: { x: 900 }, geometry: { ...e.geometry, width: 46 } } } }, band).status, 'differs');
  assert.equal(geometryComparison({ elements: { theme: { ...e, styles: { color: 'other' } } } }, band).status, 'differs');
  assert.equal(geometryComparison({ elements: {} }, band).status, 'not measured');
  assert.equal(geometryComparison(null, band).status, 'not measured');
});
test('distinct causes group matrix repetitions and deduplicate multiple checks per condition', () => {
  const row = id => ({ id, site: 'naeil', layout: { header: null }, measurements: { mainCount: 0 }, checks: { frame: { status: 'differs' }, gap: { status: 'differs' } } });
  const rows = [row('ko-light-1440'), row('ja-dark-390')];
  const groups = distinctDifferences(rows);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].affectedConditions, 2);
  assert.deepEqual(groups[0].checks, ['frame', 'gap']);
  assert.equal(rollup(rows, ['frame'], ['naeil']).frame.naeil.differs, 2);
  const long = { id: 'long', site: 'naeil', kind: 'long', checks: { gap: { status: 'differs', values: { contentToFooter: 80 } } } };
  assert.equal(distinctDifferences([long])[0].id, 'long-content-footer-gap');
  assert.equal(distinctDifferences([long])[0].values[0], '80px (expected 96)');
  const missing = { ...long, checks: { gap: { status: 'differs', values: { reason: 'Missing footer' } } } };
  assert.equal(distinctDifferences([missing])[0].id, 'missing-footer');
});


test('resolved auto-layout lengths tolerate subpixel rounding but colors remain exact', () => {
  const e = { status: 'measured', geometry: { edge: 20 }, styles: { marginRight: '1040.36px', color: 'rgb(1, 2, 3)' } };
  const reference = { elements: { column: e } };
  assert.equal(geometryComparison({ elements: { column: { ...e, styles: { ...e.styles, marginRight: '1040.38px' } } } }, reference).status, 'match');
  assert.equal(geometryComparison({ elements: { column: { ...e, styles: { ...e.styles, color: 'rgb(1, 2, 4)' } } } }, reference).status, 'differs');
});


test('forbidden/checkpoint response cannot become an icon hash reference', () => {
  const actual = { declarations: [], responses: [{ url: 'https://jev.naeil.dev/icon.svg', status: 200, type: 'image/svg+xml', sha256: 'image' }] };
  const forbidden = { declarations: [], responses: [{ url: 'https://naeil.dev/icon.svg', status: 403, type: 'text/html', sha256: 'checkpoint' }] };
  assert.equal(iconVerdict(actual, forbidden, { origin: 'https://jev.naeil.dev' }).status, 'not measured');
  const missing = { declarations: [], responses: [{ url: 'https://home.example/icon.svg', status: 404, type: 'text/plain', sha256: 'missing' }] };
  assert.equal(iconVerdict(missing, undefined, { origin: 'https://home.example' }).status, 'differs');
});

test('script splitting assigns Latin-1 punctuation to Pretendard and Japanese punctuation to Noto', () => {
  const runs = scriptRuns('デザイン · テーマ — 42 café', 'ja');
  assert(runs.filter(run => run.script === 'latin').some(run => run.text.includes('·')));
  assert(runs.filter(run => run.script === 'japanese').some(run => run.text.includes('—')));
  assert(runs.filter(run => run.script === 'latin').some(run => run.text.includes('42 café')));
  for (const run of runs.filter(run => run.script === 'japanese')) assert(!/[\u0020-\u007e\u00a0-\u00ff]/.test(run.text));
  assert.equal(scriptRuns('한국어', 'ko')[0].expected, 'Pretendard');
  assert.equal(scriptRuns('ショーケース・テーマ', 'ja').length, 1);
  assert.equal(scriptRuns('ショーケース・テーマ', 'ja')[0].script, 'japanese');
});

test('mixed Japanese body passes only when each isolated run uses its required family', () => {
  const runs = scriptRuns('日本語 · 42', 'ja').map(run => ({ ...run, fonts: [{ familyName: run.expected, glyphCount: 2 }] }));
  assert.equal(perScriptFontVerdict({ locale: 'ja', runs }).status, 'match');
  const wrong = runs.map(run => run.script === 'latin' ? { ...run, fonts: [{ familyName: 'Noto Sans JP', glyphCount: 2 }] } : run);
  assert.equal(perScriptFontVerdict({ locale: 'ja', runs: wrong }).status, 'differs');
  assert.equal(perScriptFontVerdict({ locale: 'ja', runs: [{ script: 'japanese', text: '日本語 ·', fonts: [{ familyName: 'Noto Sans JP', glyphCount: 2 }] }] }).status, 'not measured');
  assert.equal(perScriptFontVerdict({ locale: 'ja', runs: runs.map(run => ({ ...run, fonts: [] })) }).status, 'not measured');
  assert.equal(perScriptFontVerdict(null).status, 'not measured');
});

const fallbackSnapshot = () => ({ shell: false, header: false, mainCount: 0, reactRoot: false, heading: '404', directMessage: true, directList: true,
  origin: 'https://naeil.dev', homeLinks: ['ko', 'ja', 'en'].map(lang => ({ lang, href: `https://naeil.dev/${lang}`, text: lang })),
  colours: { background: 'rgb(11, 12, 14)', foreground: 'rgb(239, 240, 243)', colorScheme: 'dark' },
  stack: '"Pretendard Variable", Pretendard, "Noto Sans JP", -apple-system, system-ui, sans-serif', metrics: { size: 16, lineHeight: 25 }, lang: 'ja', title: '見つかりません — .naeil' });

test('D6 classification uses structure, never broken style/lang/title or route names', () => {
  const snapshot = fallbackSnapshot();
  assert.equal(classifyDocument(snapshot, 404).kind, 'locale-fallback');
  assert.equal(classifyDocument({ ...snapshot, lang: '', title: '', stack: 'Times', colours: {} }, 404).kind, 'locale-fallback');
  assert.equal(classifyDocument({ ...snapshot, header: true, shell: true, mainCount: 1 }, 404).kind, 'framed');
  for (const changed of [{ homeLinks: [] }, { directMessage: false }, { directList: false }, { heading: '403' }, { reactRoot: true }, { shell: true }]) assert.equal(classifyDocument({ ...snapshot, ...changed }, 404).kind, 'unframed');
  const proxy = { ...snapshot, heading: '', homeLinks: [], directMessage: false, directList: false, lang: '', title: '' };
  assert.equal(classifyDocument(proxy, 404).kind, 'unframed');
});

test('fallback requirements check declared stack and computed colours without webfont loading', () => {
  const snapshot = fallbackSnapshot();
  assert(Object.values(fallbackChecks(snapshot, 'ja', true)).every(check => check.status === 'match'));
  const defaultEnglish = { ...snapshot, homeLinks: snapshot.homeLinks.map(link => link.lang === 'en' ? { ...link, href: 'https://naeil.dev/' } : link) };
  assert.equal(fallbackChecks(defaultEnglish, 'ja', true).fallbackLinks.status, 'match');
  const checks = fallbackChecks({ ...snapshot, stack: 'Times', metrics: { size: 16, lineHeight: 24 }, lang: '', homeLinks: snapshot.homeLinks.slice(0, 1), colours: { background: 'rgb(255, 255, 255)', foreground: 'rgb(0, 0, 0)', colorScheme: 'normal' } }, 'ja', false);
  assert(Object.values(checks).every(check => check.status === 'differs'));
  const rows = [{ site: 'naeil', kind: 'error', requestedURL: 'https://naeil.dev/ja/missing', document: classifyDocument(snapshot, 404) }];
  assert.equal(errorDocumentSummary(rows)[0].routes[0].kind, 'locale-fallback');
  const counts = rollup([{ site: 'naeil', checks: { frame: { status: 'not required' } } }], ['frame'], ['naeil']);
  assert.equal(counts.frame.naeil['not required'], 1);
  assert.equal(counts.frame.naeil['not measured'], 0);
});

test('CDP probes isolate real text without changing the source layout', { timeout: 30000 }, async () => {
  const browser = await chromium.launch({ channel: 'chrome', timeout: 15000 });
  try {
    const page = await browser.newPage(); page.setDefaultTimeout(5000);
    await page.setContent('<html lang="ja"><body><main><p style="font:16px/25px Arial">デザイン · テーマ — 42 café</p></main></body></html>');
    const snapshot = () => ({ html: document.querySelector('main').innerHTML, height: document.documentElement.scrollHeight, box: document.querySelector('main').getBoundingClientRect().toJSON() });
    const before = await page.evaluate(snapshot);
    await page.evaluate(`globalThis.naeilScriptRuns = (${scriptRuns.toString()})`);
    const targets = await page.evaluate(prepareFontProbes, 'ja');
    await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
    assert.deepEqual(await page.evaluate(snapshot), before);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
    const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
    for (const target of Object.values(targets).filter(Boolean)) for (const run of target.runs) {
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: run.selector });
      const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
      assert(fonts.some(font => font.glyphCount > 0), run.text);
    }
    await cdp.detach();
    await page.evaluate(() => document.querySelector('[data-naeil-font-probes]').remove());
    assert.deepEqual(await page.evaluate(snapshot), before);
    await page.setContent('<html><body><h1>404</h1><p>Not found</p><ul><li><a lang="ko" href="https://naeil.dev/ko">한국어</a></li></ul></body></html>');
    assert.equal(classifyDocument(await page.evaluate(readDocumentContract), 404).kind, 'locale-fallback');
  } finally { await browser.close(); }
});

test('supplied-state theme mismatches count, while Home and fresh contexts keep their rules', () => {
  const row = (site, theme, hasStorageState = true, osColorScheme = 'dark') => ({ id: site, site, origin: site === 'home' ? 'https://private.ts.net' : site === 'naeil' ? 'https://naeil.dev' : `https://${site}.naeil.dev`, hasStorageState, osColorScheme, layout: { theme }, checks: {} });
  const rows = [row('naeil', 'dark'), row('abstorm', 'light'), row('home', 'light'), row('jev', 'dark', false)];
  compareRememberedThemes(rows);
  assert.equal(rows[0].checks.sharedTheme.status, 'differs');
  assert.equal(rows[1].checks.sharedTheme.status, 'differs');
  assert.equal(rows[2].checks.sharedTheme.status, 'not required');
  assert.equal(rows[3].checks.sharedTheme.status, 'not required');
  assert.equal(distinctDifferences(rows)[0].id, 'shared-theme-preference');
  rows[1].layout.theme = 'dark'; compareRememberedThemes(rows);
  assert.equal(rows[0].checks.sharedTheme.status, 'match');
  rows[1].osColorScheme = 'light'; compareRememberedThemes(rows);
  assert.equal(rows[0].checks.sharedTheme.status, 'not measured');
});
