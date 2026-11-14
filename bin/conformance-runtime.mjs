import { existsSync, readFileSync } from 'node:fs';
import { validateHeaderName, validateHeaderValue } from 'node:http';
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
  if (value.pageHeaderContent !== null) gap('PageHeader → content', value.pageHeaderContent, 32);
  exact('footer count', value.footerCount, noFooter ? 0 : 1);
  if (!noFooter) gap('last content → footer', value.contentFooter, 96);
  exact('body font-size', value.bodySize, 16); exact('fresh html dark', value.dark, true);
  if (!value.title.endsWith(`.naeil ${service}`)) errors.push(`document.title: ${JSON.stringify(value.title)} (expected suffix .naeil ${service})`);
  const documentURL = new URL(value.url);
  const identity = link => `${link.rel.toLowerCase()}|${new URL(link.href, documentURL).pathname}|${link.type.toLowerCase()}`;
  if (value.icons.some(link => new URL(link.href, documentURL).origin !== documentURL.origin)) errors.push('icon links must use the document origin');
  const expected = new Set(naeilIcons.links.map(identity)), actual = new Set(value.icons.map(identity));
  if (expected.size !== actual.size || [...expected].some(key => !actual.has(key))) errors.push('icon links: expected naeilIcons.links rel/href path/type');
  if (value.icons.some(link => /\.ico$/i.test(new URL(link.href, documentURL).pathname) && /(?:^|\s)32x32(?:\s|$)/i.test(link.sizes))) errors.push('ICO sizes must not list 32x32; SVG must remain preferred');
  return errors;
}

export async function checkRuntimeConformance({service, url, routes, noFooter = [], app = process.cwd(), storageState, headers = [], expectStatus = [], allowRedirect = []}) {
  const origin = new URL(url);
  if (!['http:', 'https:'].includes(origin.protocol)) throw new Error('--url must be an http(s) origin');
  if (!routes.length || routes.some(route => !route.startsWith('/') || route.startsWith('//'))) throw new Error('--routes requires comma-separated local /paths');
  if (noFooter.some(route => !routes.includes(route))) throw new Error('Every --no-footer route must be listed in --routes');
  const extraHTTPHeaders = {};
  for (const header of headers) {
    const separator = header.indexOf(':');
    if (separator < 1) throw new Error('--header requires name:value');
    const name = header.slice(0, separator).trim(), value = header.slice(separator + 1).trim();
    validateHeaderName(name); validateHeaderValue(name, value);
    extraHTTPHeaders[name.toLowerCase()] = value;
  }
  let state;
  if (storageState) {
    try {
      const original = JSON.parse(readFileSync(resolve(storageState), 'utf8'));
      if (!Array.isArray(original.cookies) || !Array.isArray(original.origins)) throw new Error('Invalid state');
      const strings = (entry, keys) => entry && keys.every(key => typeof entry[key] === 'string');
      if (original.cookies.some(cookie => !strings(cookie, ['name','value','domain','path']) || !Number.isFinite(cookie.expires) || typeof cookie.httpOnly !== 'boolean' || typeof cookie.secure !== 'boolean' || !['Strict','Lax','None'].includes(cookie.sameSite))) throw new Error('Invalid cookie');
      if (original.origins.some(entry => !strings(entry, ['origin']) || !['http:','https:'].includes(new URL(entry.origin).protocol) || !Array.isArray(entry.localStorage) || entry.localStorage.some(item => !strings(item, ['name','value'])))) throw new Error('Invalid origin storage');
      state = {...original, origins: original.origins.map(entry => ({...entry, localStorage: entry.localStorage.filter(item => item.name !== 'theme')}))};
    } catch { throw new Error('Cannot read --storage-state: supply a valid Playwright storageState JSON file'); }
  }
  function mappings(values, flag) {
    const result = new Map();
    for (const value of values) {
      const route = [...routes].sort((a, b) => b.length - a.length).find(route => value.startsWith(route + '='));
      if (!route) throw new Error(`--${flag} requires <listed-route>=<value>`);
      const target = value.slice(route.length + 1);
      if (result.has(route)) throw new Error(`Duplicate --${flag} route: ${route}`);
      result.set(route, target);
    }
    return result;
  }
  const statuses = mappings(expectStatus, 'expect-status'), redirects = mappings(allowRedirect, 'allow-redirect');
  for (const code of statuses.values()) if (!/^[1-5]\d\d$/.test(code)) throw new Error('--expect-status requires an HTTP status code (100–599)');
  for (const path of redirects.values()) if (!path.startsWith('/') || path.startsWith('//')) throw new Error('--allow-redirect target must be a local /path');
  const {chromium} = await resolveConsumerPlaywright(app);
  const {measureNaeilPage} = await import('../dist/source/components/naeil-page-measure.js');
  const browser = await chromium.launch();
  const rows = [];
  try {
    for (const route of routes) for (const viewport of [{width: 1440, height: 900}, {width: 390, height: 844}]) for (const colorScheme of ['light', 'dark']) {
      const context = await browser.newContext({viewport, colorScheme, storageState: state, extraHTTPHeaders});
      try {
        const page = await context.newPage();
        let response;
        page.on('response', entry => { if (entry.request().isNavigationRequest() && entry.frame() === page.mainFrame()) response = entry; });
        response = await page.goto(new URL(route, origin).href, {waitUntil: 'load'});
        const expectedStatus = statuses.get(route);
        await page.locator('main h1').first().waitFor({state: 'visible', timeout: 15000}).catch(error => {
          if (!response || (expectedStatus ? response.status() !== Number(expectedStatus) : !response.ok())) throw new Error(`HTTP ${response?.status() ?? 'no response'} (expected ${expectedStatus ?? '2xx'})`);
          throw error;
        });
        await page.evaluate(() => document.fonts.ready);
        // Let provider effects and the next paint settle without modifying app state.
        await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
        const measurements = await page.evaluate(measureNaeilPage);
        // Validate the measured document, including client-side redirects after hydration.
        if (!response || (expectedStatus ? response.status() !== Number(expectedStatus) : !response.ok())) throw new Error(`HTTP ${response?.status() ?? 'no response'} (expected ${expectedStatus ?? '2xx'})`);
        const requested = new URL(route, origin), actual = new URL(measurements.url);
        const localizedAlias = !/^\/(?:ko|ja|en)(?:\/|$)/.test(requested.pathname) && (actual.pathname.replace(/^\/(?:ko|ja|en)(?=\/|$)/, '') || '/') === requested.pathname;
        const allowed = redirects.get(route);
        if (actual.origin !== requested.origin || !(actual.pathname === requested.pathname || localizedAlias || allowed && actual.pathname === new URL(allowed, origin).pathname))
          throw new Error(`Unexpected redirect ${requested.pathname} → ${actual.pathname}; use --allow-redirect for a recorded route`);
        rows.push({route, viewport: `${viewport.width}×${viewport.height}`, scheme: colorScheme, measurements,
          errors: assessNaeilPage(measurements, {service, noFooter: noFooter.includes(route)})});
      } catch (error) { rows.push({route, viewport: `${viewport.width}×${viewport.height}`, scheme: colorScheme, errors: [error.message]}); }
      finally { await context.close(); }
    }
  } finally { await browser.close(); }
  return rows;
}
