import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { naeilIcons } from './naeil-icons.generated.mjs';

/** Resolve from the consuming project, never from this package's dev dependencies. */
export async function resolveConsumerPlaywright(app) {
  const require = createRequire(resolve(app, 'package.json'));
  for (const name of ['playwright', '@playwright/test']) {
    if (!existsSync(resolve(app, 'node_modules', name))) continue;
    let path;
    try { path = require.resolve(name); } catch { continue; }
    const loaded = await import(pathToFileURL(path).href);
    if (loaded.chromium) return loaded;
    if (loaded.default?.chromium) return loaded.default;
  }
  throw Object.assign(new Error('Consumer Playwright is required. Run pnpm add -D @playwright/test && pnpm exec playwright install chromium'), {exitCode: 2});
}

/** Pure assessment so consumers can retain the exact failed measurements in reports. */
export function assessNaeilPage(value, {service, noFooter = false}) {
  const errors = [];
  const exact = (name, actual, expected) => { if (actual !== expected) errors.push(`${name}: ${actual} (expected ${expected})`); };
  const gap = (name, actual, expected) => { if (actual === null || !Number.isFinite(actual) || Math.abs(actual - expected) > 0.5) errors.push(`${name}: ${actual} (expected ${expected} ±0.5px)`); };
  exact('main count', value.mainCount, 1); exact('main#main.ui-app-main count', value.ownedMainCount, 1);
  exact('header count', value.headerCount, 1);
  gap('header → h1', value.headerTitle, 48);
  exact('h1 font-size', value.titleSize, 32); exact('h1 line-height', value.titleLineHeight, 42); exact('h1 weight', value.titleWeight, 600);
  if (value.titleDescription !== null) gap('h1 → description', value.titleDescription, 12);
  exact('footer count', value.footerCount, noFooter ? 0 : 1);
  if (!noFooter) gap('last content → footer', value.contentFooter, 96);
  exact('body font-size', value.bodySize, 16); exact('fresh html dark', value.dark, true);
  if (!value.title.endsWith(`.naeil ${service}`)) errors.push(`document.title: ${JSON.stringify(value.title)} (expected suffix .naeil ${service})`);
  const identity = link => `${link.rel.toLowerCase()}|${new URL(link.href, 'https://naeil.invalid').pathname}|${link.type.toLowerCase()}`;
  const expected = new Set(naeilIcons.links.map(identity)), actual = new Set(value.icons.map(identity));
  if (expected.size !== actual.size || [...expected].some(key => !actual.has(key))) errors.push('icon links: expected naeilIcons.links rel/href path/type');
  if (value.icons.some(link => /\.ico(?:\?|$)/i.test(link.href) && /(?:^|\s)32x32(?:\s|$)/i.test(link.sizes))) errors.push('ICO sizes must not list 32x32; SVG must remain preferred');
  return errors;
}

export async function checkRuntimeConformance({service, url, routes, noFooter = [], app = process.cwd()}) {
  const origin = new URL(url);
  if (!['http:', 'https:'].includes(origin.protocol)) throw new Error('--url must be an http(s) origin');
  if (!routes.length || routes.some(route => !route.startsWith('/') || route.startsWith('//'))) throw new Error('--routes requires comma-separated local /paths');
  if (noFooter.some(route => !routes.includes(route))) throw new Error('Every --no-footer route must be listed in --routes');
  const {chromium} = await resolveConsumerPlaywright(app);
  const {measureNaeilPage} = await import('../dist/source/components/naeil-page-measure.js');
  const browser = await chromium.launch();
  const rows = [];
  try {
    for (const route of routes) for (const viewport of [{width: 1440, height: 900}, {width: 390, height: 844}]) for (const colorScheme of ['light', 'dark']) {
      const context = await browser.newContext({viewport, colorScheme});
      try {
        const page = await context.newPage();
        const response = await page.goto(new URL(route, origin).href, {waitUntil: 'load'});
        if (response && !response.ok()) throw new Error(`HTTP ${response.status()}`);
        await page.locator('main h1').first().waitFor({state: 'visible', timeout: 15000});
        await page.evaluate(() => document.fonts.ready);
        // Let provider effects and the next paint settle without modifying app state.
        await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
        const measurements = await page.evaluate(measureNaeilPage);
        rows.push({route, viewport: `${viewport.width}×${viewport.height}`, scheme: colorScheme, measurements,
          errors: assessNaeilPage(measurements, {service, noFooter: noFooter.includes(route)})});
      } catch (error) { rows.push({route, viewport: `${viewport.width}×${viewport.height}`, scheme: colorScheme, errors: [error.message]}); }
      finally { await context.close(); }
    }
  } finally { await browser.close(); }
  return rows;
}
