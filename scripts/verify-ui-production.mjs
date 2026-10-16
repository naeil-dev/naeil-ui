import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const hash = value => createHash('sha256').update(value).digest('hex');
const near = (actual, expected, tolerance, label) => assert(Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance, `${label}: ${actual} expected ${expected} ±${tolerance}`);
const labels = {
  en: { menu: 'Menu', projects: 'Projects', light: 'Switch to light theme', dark: 'Switch to dark theme' },
  ko: { menu: '메뉴', projects: '프로젝트', light: '밝은 테마로 전환', dark: '어두운 테마로 전환' },
  ja: { menu: 'メニュー', projects: 'プロジェクト', light: 'ライトテーマに切り替える', dark: 'ダークテーマに切り替える' },
};

export function assertRouteDestination(actual, route, origin) {
  const expected = new URL(route.expectedPath || route.path, origin);
  const final = new URL(actual);
  assert.equal(final.origin, expected.origin, 'Route redirected to another origin');
  assert.equal(final.pathname, expected.pathname, `Requested ${route.path} rendered another route`);
  assert.equal(final.search, expected.search, 'Route redirected to another query');
}

/** No app token supplies an expectation. These values come from the frozen reviewed reference. */
export function assertGeometry(actual, contract, baseline) {
  const tolerance = contract.tolerancePx;
  const expectedWidth = Math.min(actual.layoutWidth, contract.frame.maxWidth);
  const gutter = Math.min(contract.frame.gutterMax, Math.max(contract.frame.gutterMin, actual.layoutWidth * contract.frame.gutterVw / 100));
  for (const [name, frame] of [['header', actual.headerFrame], ['footer', actual.footerFrame]]) {
    near(frame.width, expectedWidth, tolerance, `${name} frame width`);
    near(frame.x, actual.layoutX + (actual.layoutWidth - expectedWidth) / 2, tolerance, `${name} frame x`);
    near(frame.padding, gutter, tolerance, `${name} gutter`);
  }
  near(actual.headerHeight, contract.header.height, tolerance, 'header height');
  near(actual.headerBrand.height, contract.header.brandHeight, tolerance, 'header brand height');
  near(actual.footerBrand.height, contract.footer.brandHeight, tolerance, 'footer brand height');
  near(actual.headerBrand.offset, gutter, tolerance, 'header brand baseline');
  near(actual.footerBrand.offset, gutter, tolerance, 'footer brand baseline');
  assert(!actual.overflow, 'Document has horizontal overflow');
  assert(actual.fontLoaded, `Expected ${actual.expectedFont} is not loaded`);
  assert(actual.fontFamily.includes(actual.expectedFont), `Wrong rendered font: ${actual.fontFamily}`);
  if (baseline) {
    // Absolute positions can differ by the platform scrollbar reservation.
    for (const key of ['headerHeight']) near(actual[key], baseline[key], tolerance, `reference ${key}`);
    for (const key of ['headerBrand', 'footerBrand']) near(actual[key].height, baseline[key].height, tolerance, `reference ${key} height`);
    assert.equal(actual.expectedFont, baseline.expectedFont, 'Reference locale font mismatch');
    for (const key of ['background', 'foreground']) assert.equal(actual[key], baseline[key], `Reference ${key} mismatch`);
  }
}

export async function readChrome(page, locale) {
  await page.locator('[data-naeil-header]').waitFor({ state: 'visible' });
  await page.locator('[data-naeil-footer]').waitFor({ state: 'attached' });
  return page.evaluate(async ({ locale }) => {
    const expectedFont = locale === 'ja' ? 'Noto Sans JP' : 'Pretendard';
    const header = document.querySelector('[data-naeil-header]');
    const footer = document.querySelector('[data-naeil-footer]');
    const css = getComputedStyle(header);
    // The website ships Pretendard Variable; packed consumers may ship the
    // static family. Skip only absent approved families, then require actual
    // faces before any unrelated/system fallback can win the font stack.
    const stack = css.fontFamily.split(',').map(value => value.trim().replace(/^['"]|['"]$/g, ''));
    const allowedFonts = locale === 'ja' ? ['Noto Sans JP'] : ['Pretendard', 'Pretendard Variable'];
    const registered = new Set([...document.fonts].map(face => face.family.replace(/^['"]|['"]$/g, '')));
    const renderedFont = stack.find(family => !allowedFonts.includes(family) || registered.has(family)) || '';
    const fontAllowed = allowedFonts.includes(renderedFont);
    const fontQuery = `400 16px "${fontAllowed ? renderedFont : expectedFont}"`;
    const faces = await document.fonts.load(fontQuery, locale === 'ja' ? '日本語' : '한글 Latin');
    const headerFrame = header.querySelector('.ui-navigation-frame');
    const footerFrame = footer.querySelector('.ui-site-footer-frame');
    const frame = el => { const box = el.getBoundingClientRect(); return { x: box.x, width: box.width, padding: parseFloat(getComputedStyle(el).paddingInlineStart) }; };
    const brand = (el, container) => { const box = el.getBoundingClientRect(); return { height: box.height, offset: box.x - container.getBoundingClientRect().x }; };
    const root = document.documentElement.getBoundingClientRect();
    return {
      layoutWidth: root.width, layoutX: root.x, headerFrame: frame(headerFrame), footerFrame: frame(footerFrame),
      headerHeight: header.getBoundingClientRect().height,
      headerBrand: brand(header.querySelector('[data-app-brand] svg'), headerFrame),
      footerBrand: brand(footer.querySelector('[data-footer-brand] svg'), footerFrame),
      overflow: document.documentElement.scrollWidth > innerWidth,
      expectedFont, renderedFont, fontLoaded: fontAllowed && faces.length > 0 && document.fonts.check(fontQuery),
      fontFamily: css.fontFamily, background: css.backgroundColor, foreground: css.color,
      version: header.dataset.naeilUiVersion, contractVersion: header.dataset.naeilUiContract,
      footerVersion: footer.dataset.naeilUiVersion, footerContract: footer.dataset.naeilUiContract,
      footerVariant: footer.dataset.variant,
      footerLinks: [...footer.querySelectorAll('a[href]')].map(el => ({ href: el.getAttribute('href'), target: el.target, rel: el.rel })),
    };
  }, { locale });
}

export function assertLinks(actual, locale, origin, contract) {
  const urls = actual.footerLinks.map(link => new URL(link.href, origin));
  for (const path of contract.footer.requiredPaths) {
    const localized = `/${locale}${path === '/' ? '' : path}`;
    assert(urls.some(url => (url.origin === new URL(origin).origin || url.origin === 'https://naeil.dev') && [path, localized, `${localized}/`].includes(url.pathname)), `Missing canonical footer path ${path}`);
  }
  assert(urls.some(url => url.href === contract.footer.github), 'Missing canonical GitHub destination');
  for (const link of actual.footerLinks.filter(link => link.target === '_blank')) assert(link.rel.includes('noopener') && link.rel.includes('noreferrer'), 'External target needs safe rel');
}

export async function checkMenu(page, locale, theme) {
  const header = page.locator('[data-naeil-header]');
  const menu = header.getByRole('button', { name: labels[locale].menu, exact: true });
  const mobile = await menu.isVisible();
  const trigger = mobile ? menu : header.getByRole('button', { name: labels[locale].projects, exact: true });
  await trigger.focus(); await trigger.press('Enter');
  const dialog = page.getByRole('dialog', { name: mobile ? labels[locale].menu : labels[locale].projects, exact: true });
  await dialog.waitFor({ state: 'visible' });
  assert.equal(await dialog.locator('img[src^="https://naeil.dev/images/"]').count(), 5, 'Canonical project catalog missing');
  const dismiss = async () => {
    await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'hidden' });
    assert(await trigger.evaluate(el => el === document.activeElement), 'Escape did not return focus to navigation trigger');
  };
  if (!mobile) await dismiss();
  const controls = mobile ? dialog : header;
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  await controls.getByRole('button', { name: labels[locale][nextTheme], exact: true }).click();
  await page.waitForFunction(value => document.documentElement.classList.contains(value), nextTheme);
  await controls.getByRole('button', { name: labels[locale][theme], exact: true }).click();
  await page.waitForFunction(value => document.documentElement.classList.contains(value), theme);
  if (mobile) await dismiss();
}

export async function verifyProduction({ release, origin, identity, routes, referencePath, outputDir }) {
  const { assertReference, verifyIdentity } = await import('./rollout/rollout.mjs');
  const referenceBytes = readFileSync(referencePath);
  const reference = assertReference(release, referenceBytes);
  assert.equal(reference.ui.version, identity.ui.version, 'Reference release version mismatch');
  assert.equal(reference.ui.contractVersion, identity.ui.contractVersion, 'Reference contract mismatch');
  assert(Array.isArray(routes) && routes.length > 0, 'Nonempty explicit route inventory required');
  await verifyIdentity(origin, identity);
  const output = resolve(outputDir); mkdirSync(output, { recursive: true });
  const browser = await chromium.launch(); const results = [];
  try {
    for (const route of routes) {
      if (!['canonical', 'shared'].includes(route.policy)) throw new Error(`Unverified route policy ${route.policy}: ${route.path}`);
      assert(!route.path.includes('*'), `Concrete route specimen required: ${route.path}`);
      const cases = [];
      for (const width of reference.contract.viewports) for (const theme of reference.contract.themes) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme });
        const page = await context.newPage();
        try {
          await context.addInitScript(value => { localStorage.setItem('theme', value); localStorage.setItem('naeil-theme', value); }, theme);
          const response = await page.goto(new URL(route.path, origin).href);
          assert(response?.ok(), `Route HTTP failure: ${route.path}`);
          assertRouteDestination(page.url(), route, origin);
          const locale = route.locale || await page.locator('html').getAttribute('lang');
          assert(labels[locale], 'Register the supported locale for this route');
          await page.locator('[data-naeil-header]').waitFor();
          await page.waitForFunction(value => document.documentElement.classList.contains(value), theme);
          const actual = await readChrome(page, locale);
          for (const key of ['version', 'footerVersion']) assert.equal(actual[key], identity.ui.version, `Rendered ${key} mismatch`);
          for (const key of ['contractVersion', 'footerContract']) assert.equal(actual[key], identity.ui.contractVersion, `Rendered ${key} mismatch`);
          const baseline = reference.cases.find(sample => sample.locale === locale && sample.theme === theme && sample.width === width && sample.variant === actual.footerVariant);
          assert(baseline, `No independent reference for ${locale}/${theme}/${width}/${actual.footerVariant}`);
          assertGeometry(actual, reference.contract, baseline.render);
          assertLinks(actual, locale, origin, reference.contract);
          await checkMenu(page, locale, theme);
          // Capture only shared chrome; never business/family content.
          const name = `${results.length}-${width}-${theme}`;
          await page.locator('[data-naeil-header]').screenshot({ path: join(output, `${name}-header.png`) });
          await page.locator('[data-naeil-footer]').screenshot({ path: join(output, `${name}-footer.png`) });
          cases.push({ width, theme, locale, variant: actual.footerVariant, render: actual, passed: true });
        } finally { await context.close(); }
      }
      results.push({ path: route.path, status: 'production-verified', cases });
    }
    await verifyIdentity(origin, identity);
    const result = { schemaVersion: 1, referenceSha256: hash(referenceBytes), identity, checkedAt: new Date().toISOString(), routes: results, passed: true };
    writeFileSync(join(output, 'render-verification.json'), JSON.stringify(result, null, 2));
    return result;
  } finally { await browser.close(); }
}

export async function captureReference({ origin, contractPath, archivePath, archiveSha256, sourceRevision, outputDir, allowDevelopment = false }) {
  assert.match(archiveSha256, /^[a-f0-9]{64}$/);
  assert.match(sourceRevision, /^[a-f0-9]{40}$/);
  assert.equal(hash(readFileSync(archivePath)), archiveSha256, 'Reference package archive digest mismatch');
  const response = await fetch(new URL('/naeil-release.json', origin));
  assert.equal(response.status, 200, 'Reference build identity required');
  const build = await response.json();
  assert.equal(build.sourceRevision, sourceRevision, 'Reference build source mismatch');
  assert(allowDevelopment || build.frozen, 'Reference build must use clean committed source');
  const contract = JSON.parse(readFileSync(contractPath));
  const output = resolve(outputDir); mkdirSync(output, { recursive: true });
  const browser = await chromium.launch(); const cases = [];
  try {
    for (const locale of contract.locales) for (const width of contract.viewports) for (const theme of contract.themes) for (const variant of contract.footer.variants) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme });
      const page = await context.newPage();
      try {
        await page.goto(`${origin}/iframe.html?id=brand-naeilheader--reference-${variant}${locale === 'ja' ? '' : `-${locale}`}&viewMode=story&globals=theme:${theme};a11y.manual:!true`);
        await page.waitForFunction(({ locale, theme }) => document.documentElement.lang === locale && document.documentElement.classList.contains(theme), { locale, theme });
        const render = await readChrome(page, locale); assertGeometry(render, contract);
        for (const key of ['version', 'footerVersion']) assert.equal(render[key], build.ui.version, 'Reference render package mismatch');
        for (const key of ['contractVersion', 'footerContract']) assert.equal(render[key], build.ui.contractVersion, 'Reference render contract mismatch');
        assertLinks(render, locale, 'https://naeil.dev', contract);
        if (width === 390 || width === 1440) {
          await page.locator('[data-naeil-header]').screenshot({ path: join(output, `${locale}-${width}-${theme}-${variant}-header.png`) });
          await page.locator('[data-naeil-footer]').screenshot({ path: join(output, `${locale}-${width}-${theme}-${variant}-footer.png`) });
        }
        cases.push({ locale, width, theme, variant, render });
      } finally { await context.close(); }
    }
    assert.equal(cases[0].render.version, build.ui.version);
    const reference = { schemaVersion: 1, kind: 'independent-release-render', frozen: build.frozen, sourceRevision, archiveSha256, capturedAt: new Date().toISOString(), ui: { version: cases[0].render.version, contractVersion: contract.contractVersion }, contract, cases };
    const path = join(output, 'reference.json'); writeFileSync(path, JSON.stringify(reference, null, 2));
    return { path, sha256: hash(readFileSync(path)), cases: cases.length };
  } finally { await browser.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [action, input] = process.argv.slice(2);
  assert(['capture', 'verify'].includes(action) && input, 'Usage: node scripts/verify-ui-production.mjs capture|verify INPUT.json');
  const args = JSON.parse(readFileSync(input));
  const result = await (action === 'capture' ? captureReference(args) : verifyProduction(args));
  console.log(JSON.stringify(result, null, 2));
}
