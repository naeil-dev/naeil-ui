import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, realpath, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import ts from 'typescript';
import { MASK_POLICY, STYLE_PROPERTIES, readChrome, maskedRGBA, geometryComparison } from './live-compare-chrome.mjs';
import { distinctDifferences, rollup, writeReport } from './live-compare-report.mjs';
import { FALLBACK_CHECKS, FALLBACK_REASON, notRequired, scriptRuns, perScriptFontVerdict, classifyDocument, readDocumentContract, fallbackChecks, errorDocumentSummary } from './live-compare-contract.mjs';
import { prepareFontProbes } from './live-compare-fonts.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TIMEOUT = 15000;
export const SITES = [
  { id: 'naeil', origin: 'https://naeil.dev', short: 'projects', long: 'design', error: 'audit-missing-20261115', 'error-blog': 'blog/does-not-exist' },
  { id: 'abstorm', origin: 'https://abstorm.naeil.dev', short: 'unknown', error: 'login' },
  { id: 'estimate', origin: 'https://abestimate.naeil.dev', short: 'access-denied', error: 'audit-missing-20261115' },
  { id: 'jev', origin: 'https://jev.naeil.dev', short: 'login?state=denied', error: 'audit-missing-20261115' },
  // Real user-facing proxy, deliberately never replaced by localhost or a public alias.
  { id: 'home', origin: 'https://jay-macmini-2.tail165003.ts.net:2455', short: 'console', error: 'console/audit-missing-20261115' },
];
const CANONICAL_ICONS = ['/favicon.ico', '/icon.svg', '/apple-icon.png'];
const CHECKS = ['availability', 'locale', 'frame', 'gap', 'body', 'bodyFont', 'latinFont', 'digitFont', 'japaneseFont', 'icons', 'title', 'theme', 'headerPixels', 'footerPixels', 'logo', 'wordmark', 'themeControl', 'localeControl', 'accountControl', 'footerColumns', ...FALLBACK_CHECKS];
const nm = reason => ({ status: 'not measured', reason });
const verdict = (ok, values) => ({ status: ok ? 'match' : 'differs', values });
export const near = (actual, expected, tolerance = 0.5) => Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance;
export function validTitle(title, service, landing = false) {
  const brand = service === 'naeil' ? '.naeil' : `.naeil ${service}`;
  return (landing && title === brand) || (title.endsWith(` — ${brand}`) && title.slice(0, -` — ${brand}`.length).trim().length > 0 && title.split(' — ').length === 2);
}
export function diffRGBA(a, b) {
  const width = Math.max(a.width, b.width), height = Math.max(a.height, b.height);
  const data = new Uint8ClampedArray(width * height * 4);
  let differentPixels = 0, over16Pixels = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    let delta = 255;
    if (x < a.width && y < a.height && x < b.width && y < b.height) {
      delta = 0;
      for (let c = 0; c < 4; c++) delta = Math.max(delta, Math.abs(a.data[(y * a.width + x) * 4 + c] - b.data[(y * b.width + x) * 4 + c]));
    }
    if (delta) differentPixels++;
    if (delta > 16) over16Pixels++;
    const i = (y * width + x) * 4;
    data.set(delta > 16 ? [255, 40, 40, 255] : delta ? [255, 190, 40, 255] : [24, 24, 24, 255], i);
  }
  return { width, height, data, differentPixels, over16Pixels, totalPixels: width * height };
}
export function requestAllowed(method, url, origin, hasState) {
  return ['GET', 'HEAD'].includes(method) && (!hasState || new URL(url).origin === origin);
}
export function parseArgs(args) {
  const options = { states: {}, channel: 'chrome' };
  for (let i = 0; i < args.length; i++) {
    const flag = args[i], value = args[++i];
    if (!value) throw new Error(`Missing value for ${flag}`);
    if (flag === '--out') options.out = resolve(value);
    else if (flag === '--channel') options.channel = value;
    else if (flag === '--storage-state') {
      const index = value.indexOf('=');
      const site = value.slice(0, index), path = value.slice(index + 1);
      if (index < 1 || !path || !SITES.some(s => s.id === site) || options.states[site]) throw new Error('Use --storage-state SITE=FILE once per site (naeil|abstorm|estimate|jev|home)');
      options.states[site] = resolve(path);
    } else throw new Error(`Unknown argument ${flag}`);
  }
  return options;
}
async function bounded(promise, label, timeout = TIMEOUT) {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`${label}: timeout ${timeout}ms`)), timeout); })]); }
  finally { clearTimeout(timer); }
}
async function loadMeasure() {
  // Same terminal-flow-box algorithm as runtime conformance; catalog has a plain main.
  const source = (await readFile(join(ROOT, 'src/components/naeil-page-measure.ts'), 'utf8')).replace('const main = owned[0];', 'const main = owned[0] ?? mains[0];');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 } }).outputText;
  return (await import(`data:text/javascript,${encodeURIComponent(js)}`)).measureNaeilPage;
}
function address(site, locale, kind) {
  return site[kind] ? `${site.origin}/${site.id === 'home' ? '' : `${locale}/`}${site[kind]}` : null;
}
function readLayout() {
  const header = document.querySelector('[data-naeil-header]'), footer = document.querySelector('[data-naeil-footer]');
  const rect = el => el?.getBoundingClientRect().toJSON() ?? null;
  const body = getComputedStyle(document.body), html = document.documentElement;
  return { url: location.href, lang: html.lang, title: document.title, theme: html.classList.contains('dark') ? 'dark' : html.classList.contains('light') ? 'light' : 'unset', colorScheme: getComputedStyle(html).colorScheme,
    body: { size: parseFloat(body.fontSize), lineHeight: parseFloat(body.lineHeight), family: body.fontFamily },
    header: rect(header), footer: rect(footer), scrollHeight: html.scrollHeight, viewportHeight: innerHeight,
    footerGap: footer ? innerHeight - (footer.getBoundingClientRect().bottom + scrollY) : null,
    versions: [...document.querySelectorAll('[data-naeil-ui-version]')].map(e => e.getAttribute('data-naeil-ui-version')),
    accountStates: [...document.querySelectorAll('[data-naeil-account-state]')].map(e => e.getAttribute('data-naeil-account-state')) };
}
async function fontsFor(page, context, locale) {
  let cdp;
  try {
    await bounded(page.evaluate(`globalThis.naeilScriptRuns = (${scriptRuns.toString()})`), 'install script splitter');
    const targets = await bounded(page.evaluate(prepareFontProbes, locale), 'prepare isolated script probes');
    await page.waitForFunction(() => document.fonts.status === 'loaded', null, { timeout: TIMEOUT });
    await bounded(page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)))), 'paint isolated script probes');
    cdp = await bounded(context.newCDPSession(page), 'create CDP session');
    await bounded(cdp.send('DOM.enable'), 'DOM.enable');
    await bounded(cdp.send('CSS.enable'), 'CSS.enable');
    const { root } = await bounded(cdp.send('DOM.getDocument', { depth: 0 }), 'DOM.getDocument');
    for (const target of Object.values(targets)) if (target) {
      for (const run of target.runs) {
        const { nodeId } = await bounded(cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: run.selector }), 'font run node');
        run.fonts = (await bounded(cdp.send('CSS.getPlatformFontsForNode', { nodeId }), 'platform fonts per script')).fonts;
      }
    }
    return targets;
  } finally {
    if (cdp) await bounded(cdp.detach(), 'CDP detach').catch(() => {});
    await bounded(page.evaluate(() => { document.querySelector('[data-naeil-font-probes]')?.remove(); delete globalThis.naeilScriptRuns; }), 'remove measurement-only probes');
  }
}
async function iconsFor(site, declarations, userAgent) {
  const urls = [...new Set([...CANONICAL_ICONS.map(p => site.origin + p), ...declarations.map(d => d.href)])];
  const responses = [];
  // Playwright 1.63 aborts URLs ending in /favicon.ico before user route handlers.
  // Use explicit anonymous GETs to the exact addresses, outside browser routing.
  // Never use context.request (it shares cookies) or forward storage/session data.
  for (const url of urls) {
    if (!['https:', 'http:'].includes(new URL(url).protocol)) {
      responses.push({ url, error: 'Non-HTTP declared icon cannot be measured by GET' }); continue;
    }
    try {
      const response = await fetch(url, { method: 'GET', redirect: 'manual', headers: { 'user-agent': userAgent }, signal: AbortSignal.timeout(10000) });
      const bytes = Buffer.from(await response.arrayBuffer());
      responses.push({ url, status: response.status, type: response.headers.get('content-type'), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), ...(response.headers.has('location') ? { redirect: response.headers.get('location') } : {}) });
    } catch { responses.push({ url, error: 'Anonymous icon GET failed or timed out (10s); no redirect followed' }); }
  }
  return { collector: 'Anonymous Node GET; browser User-Agent only; no cookies or storage state; redirects recorded without following', declarations, responses };
}
export function iconVerdict(actual, reference, site) {
  const comparisons = actual.responses.map(response => {
    const path = new URL(response.url).pathname;
    const canonical = /\.svg$/i.test(path) ? '/icon.svg' : /\.ico$/i.test(path) ? '/favicon.ico' : /apple.*\.png$/i.test(path) ? '/apple-icon.png' : null;
    const candidate = reference?.responses.find(r => new URL(r.url).pathname === path) ?? reference?.responses.find(r => new URL(r.url).pathname === canonical);
    const expected = candidate?.status === 200 && /^image\//i.test(candidate.type ?? '') ? candidate : null;
    const accessBlocked = response.status === 403;
    return { ...response, accessBlocked, expectedSHA256: expected?.sha256 ?? null, matches: !!expected?.sha256 && response.status === 200 && response.sha256 === expected.sha256 };
  });
  const metadataNotes = actual.declarations.flatMap(d => {
    const counterpart = reference?.declarations.find(r => r.rel === d.rel && new URL(r.href).pathname === new URL(d.href).pathname);
    const differences = ['type', 'sizes'].filter(field => counterpart && counterpart[field] !== d[field]).map(field => ({ field, actual: d[field], reference: counterpart[field] }));
    return differences.length ? [{ href: d.href, differences }] : [];
  });
  actual.metadataNotes = metadataNotes;
  const values = { origin: site.origin, declared: actual.declarations, metadataNotes, responses: comparisons };
  // 404 is independently a real failed endpoint, even if reference bytes are unavailable.
  if (comparisons.some(r => !r.error && !r.accessBlocked && (r.status !== 200 || (r.expectedSHA256 && !r.matches)))) return verdict(false, values);
  if (comparisons.some(r => r.error || r.accessBlocked || !r.expectedSHA256)) return { ...nm('Icon access or valid image baseline unavailable; HTTP errors/challenge bodies never become reference hashes'), values };
  return verdict(true, values);
}
async function capture(job, browser, out, states, measure, blockedSites) {
  const { site, locale, viewport, scheme, kind } = job;
  const id = `${site.id}-${locale}-${viewport.width}-${scheme}-${kind}`;
  const requestedURL = address(site, locale, kind);
  const hasState = !!states[site.id];
  const row = { id, site: site.id, requestedURL, origin: site.origin, locale, viewport, osColorScheme: scheme, session: hasState ? 'signed-in requested (owner-supplied state; not authenticated by script)' : 'signed-out', browser: `Chrome ${browser.version()}`, deviceScaleFactor: 1, kind, at: new Date().toISOString(), checks: Object.fromEntries(CHECKS.map(k => [k, nm('Row did not complete')])) };
  if (!requestedURL) {
    row.requestedURL = site.origin;
    row.checks = Object.fromEntries(CHECKS.map(k => [k, nm('No audited signed-out long page; business routes require authentication. No substitute route used.')]));
    return row;
  }
  if (blockedSites.has(site.id)) {
    row.coverageFailure = blockedSites.get(site.id);
    row.checks = Object.fromEntries(CHECKS.map(k => [k, nm(row.coverageFailure)]));
    return row;
  }
  let context, stage = 'Create fresh browser context (15s)';
  try {
    // Playwright alone consumes the opaque state file. Never parse, print, copy or persist it.
    context = await bounded(browser.newContext({ viewport, locale: { ko: 'ko-KR', ja: 'ja-JP', en: 'en-US' }[locale], colorScheme: scheme, deviceScaleFactor: 1, serviceWorkers: 'block', ...(hasState ? { storageState: states[site.id] } : {}) }), 'new context');
    context.setDefaultTimeout(TIMEOUT); context.setDefaultNavigationTimeout(30000);
    row.blockedRequests = { nonReadOnly: 0, crossOriginWithState: 0 };
    await bounded(context.route('**/*', route => {
      const request = route.request();
      if (requestAllowed(request.method(), request.url(), site.origin, hasState)) return route.continue();
      row.blockedRequests[['GET', 'HEAD'].includes(request.method()) ? 'crossOriginWithState' : 'nonReadOnly']++;
      return route.abort();
    }), 'install request guard');
    await bounded(context.routeWebSocket('**/*', socket => socket.close()), 'install WebSocket guard');
    const page = await bounded(context.newPage(), 'new page');
    row.responses = [];
    page.on('response', response => {
      const request = response.request(), url = new URL(response.url());
      if (url.origin === site.origin && ['document', 'fetch', 'xhr'].includes(request.resourceType())) row.responses.push({ path: url.pathname, status: response.status(), resourceType: request.resourceType(), retryAfter: response.headers()['retry-after'] ?? null });
    });
    stage = 'Navigate requested address (30s)';
    const response = await page.goto(requestedURL, { waitUntil: 'load', timeout: 30000 });
    row.httpStatus = response?.status();
    if (row.httpStatus === 403 && response.headers()['x-vercel-mitigated'] === 'challenge') {
      row.coverageFailure = `HTTP 403 Vercel security checkpoint at ${site.origin}; origin paused for this run, no challenge bypass or substitute baseline`;
      blockedSites.set(site.id, row.coverageFailure);
      row.checks = Object.fromEntries(CHECKS.map(k => [k, nm(row.coverageFailure)]));
      row.screenshot = `screenshots/${id}.png`;
      await page.screenshot({ path: join(out, row.screenshot), timeout: TIMEOUT });
      console.log(`${id}: ${row.coverageFailure}`);
      return row;
    }
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => { row.networkIdleTimedOut = true; });
    stage = 'Wait for rendered fonts (15s)';
    await page.waitForFunction(() => document.fonts.status === 'loaded', null, { timeout: TIMEOUT });
    // Require a stable rendered title/lang/theme/heading, not the SPA's default title.
    await page.waitForFunction(() => {
      const snapshot = JSON.stringify([document.title, document.documentElement.lang, document.documentElement.className, document.querySelector('main h1')?.textContent]);
      if (globalThis.naeilStableDocument?.snapshot !== snapshot) globalThis.naeilStableDocument = { snapshot, since: performance.now() };
      const framed = !!document.querySelector('[data-naeil-header]'), heading = document.querySelector('main h1');
      return (!framed || !!heading?.checkVisibility()) && document.fonts.status === 'loaded' && performance.now() - globalThis.naeilStableDocument.since >= 600;
    }, null, { polling: 100, timeout: TIMEOUT });
    // Font and hydration waits are bounded; no clicks or form interactions.
    await bounded(page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)))), 'two frames');
    stage = 'Read page geometry (15s)';
    row.measurements = await bounded(page.evaluate(measure), 'page rhythm');
    row.layout = await bounded(page.evaluate(readLayout), 'page layout');
    if (row.httpStatus === 403 && row.layout.title === 'Vercel Security Checkpoint') {
      row.coverageFailure = `HTTP 403 Vercel security checkpoint at ${site.origin}; origin paused for this run, no challenge bypass or substitute baseline`;
      blockedSites.set(site.id, row.coverageFailure);
      row.checks = Object.fromEntries(CHECKS.map(k => [k, nm(row.coverageFailure)]));
      row.blockedDocument = row.layout; delete row.layout;
      console.log(`${id}: ${row.coverageFailure}`);
      return row;
    }
    row.documentSnapshot = await bounded(page.evaluate(readDocumentContract), 'document structure and fallback styles');
    row.document = classifyDocument(row.documentSnapshot, row.httpStatus);
    for (const key of FALLBACK_CHECKS) row.checks[key] = notRequired('D6-only check; this document is not a locale-layer fallback');
    row.chrome = await bounded(page.evaluate(readChrome, { site: site.id, styleProperties: STYLE_PROPERTIES }), 'shared chrome markers and styles');
    row.checks.availability = verdict(new URL(row.layout.url).origin === site.origin, { requested: requestedURL, final: row.layout.url, httpStatus: row.httpStatus });
    row.checks.locale = verdict(row.layout.lang.split('-')[0] === locale, { requested: locale, actual: row.layout.lang });
    const noFooter = site.id === 'home' && kind === 'short';
    const shortPage = kind === 'short' || kind.startsWith('error');
    row.checks.frame = verdict(!!row.layout.header && row.measurements.mainCount === 1 && (noFooter || !!row.layout.footer), { header: !!row.layout.header, main: row.measurements.mainCount, footer: !!row.layout.footer, allowedNoFooter: noFooter });
    row.checks.gap = noFooter ? nm('Home login deliberately omits footer') : !row.layout.footer ? verdict(false, { reason: 'Missing footer; bare error page', expected: kind === 'long' ? 96 : 0 }) : shortPage ? (row.layout.scrollHeight > viewport.height + 1 ? nm('Audited short route overflows this viewport; footer bottom cannot align to viewport') : verdict(near(row.layout.footerGap, 0), { footerBottomToViewport: row.layout.footerGap, expected: 0 })) : kind === 'long' ? verdict(near(row.measurements.contentFooter, 96), { contentToFooter: row.measurements.contentFooter, expected: 96 }) : nm('Supplementary error probe; frame checked separately');
    row.checks.body = verdict(near(row.layout.body.size, 16) && near(row.layout.body.lineHeight, 25), { ...row.layout.body, expected: '16/25px' });
    row.checks.title = verdict(validTitle(row.layout.title, site.id), { actual: row.layout.title, expected: `Page name — ${site.id === 'naeil' ? '.naeil' : `.naeil ${site.id}`}` });
    row.checks.theme = hasState ? nm('Supplied state may contain remembered theme; this is not a first visit') : verdict(row.layout.theme === 'dark', { actual: row.layout.theme, colorScheme: row.layout.colorScheme, expected: 'dark', os: scheme });
    // Geometry is final before any element capture can scroll the document.
    stage = 'Capture viewport and chrome (15s per image)';
    row.screenshot = `screenshots/${id}.png`;
    await page.screenshot({ path: join(out, row.screenshot), timeout: TIMEOUT });
    for (const band of ['header', 'footer']) if (row.layout[band]) {
      row[`${band}Image`] = `bands/${id}-${band}.png`;
      const locator = page.locator(`[data-naeil-${band}]`).first();
      await locator.screenshot({ path: join(out, row[`${band}Image`]), timeout: TIMEOUT });
      const normalization = await bounded(locator.evaluate(el => {
        const box = el.getBoundingClientRect(), css = getComputedStyle(el);
        const delta = { x: Math.round(box.x) - box.x, y: Math.round(box.y) - box.y };
        const previous = Object.fromEntries(['position', 'left', 'top'].map(property => [property, { value: el.style.getPropertyValue(property), priority: el.style.getPropertyPriority(property) }]));
        // Layout positioning, not compositor transforms: transforms preserve a
        // layer's old glyph raster phase and can create interpolation differences.
        if (delta.x || delta.y) {
          if (css.position === 'static') el.style.setProperty('position', 'relative', 'important');
          el.style.setProperty('left', `${(parseFloat(css.left) || 0) + delta.x}px`, 'important');
          el.style.setProperty('top', `${(parseFloat(css.top) || 0) + delta.y}px`, 'important');
        }
        return { previous, delta, originalOrigin: { x: box.x, y: box.y }, method: 'Comparison capture only: relative layout offset snaps band origin to integer CSS pixels; original geometry and raw image retained' };
      }), 'normalize capture origin');
      row[`${band}NormalizedImage`] = `bands/${id}-${band}-normalized.png`;
      row.chrome[band].captureNormalization = normalization;
      try { await locator.screenshot({ path: join(out, row[`${band}NormalizedImage`]), timeout: TIMEOUT }); }
      finally { await bounded(locator.evaluate((el, previous) => {
        for (const [property, { value, priority }] of Object.entries(previous)) {
          if (value) el.style.setProperty(property, value, priority); else el.style.removeProperty(property);
        }
      }, normalization.previous), 'restore band positioning'); }

    }
    row.icons = await iconsFor(site, row.measurements.icons, await bounded(page.evaluate(() => navigator.userAgent), 'browser user agent'));
    row.documentAtEnd = await bounded(page.evaluate(() => ({ title: document.title, lang: document.documentElement.lang, heading: document.querySelector('main h1')?.textContent ?? null })), 'final document identity');
    row.checks.title = verdict(validTitle(row.documentAtEnd.title, site.id), { actual: row.documentAtEnd.title, atLayout: row.layout.title, expected: `Page name — ${site.id === 'naeil' ? '.naeil' : `.naeil ${site.id}`}` });
    if (row.document.kind === 'locale-fallback') {
      for (const key of ['locale', 'frame', 'gap', 'body', 'bodyFont', 'latinFont', 'digitFont', 'japaneseFont', 'title', 'theme', 'headerPixels', 'footerPixels', 'logo', 'wordmark', 'themeControl', 'localeControl', 'accountControl', 'footerColumns']) row.checks[key] = notRequired(FALLBACK_REASON);
      Object.assign(row.checks, fallbackChecks({ ...row.documentSnapshot, title: row.documentAtEnd.title, lang: row.documentAtEnd.lang }, locale, validTitle(row.documentAtEnd.title, site.id)));
    } else {
      // Last operation that touches the page: fixed-position copies cannot
      // change the original layout, and no screenshot/geometry follows them.
      stage = 'Measure script-isolated rendered fonts (15s per operation)';
      try {
        row.fonts = await fontsFor(page, context, locale);
        for (const [sample, key] of Object.entries({ body: 'bodyFont', latin: 'latinFont', digit: 'digitFont', japanese: 'japaneseFont' })) row.checks[key] = perScriptFontVerdict(row.fonts[sample]);
      } catch { for (const key of ['bodyFont', 'latinFont', 'digitFont', 'japaneseFont']) row.checks[key] = nm('CDP per-script font measurement failed or exceeded 15s'); }
    }
    const limit = row.responses.find(r => r.status === 429);
    if (limit) {
      row.rateLimited = { ...limit, reason: `HTTP 429 at ${limit.path}: audited page state not measured` };
      row.checks = Object.fromEntries(CHECKS.map(key => [key, nm(row.rateLimited.reason)]));
    }
  } catch {
    // Never emit browser errors: a storage-state parser exception can include file contents.
    row.failure = `${stage} failed/timed out; no alternate address used`;
    row.checks.availability = nm(row.failure);
  } finally { if (context) await bounded(context.close(), 'close context').catch(() => {}); }
  console.log(`${id}: HTTP ${row.httpStatus ?? 'not measured'}; footer gap ${row.layout?.footerGap ?? 'not measured'}; ${row.failure ?? row.layout?.theme ?? ''}`);
  return row;
}
async function pixelComparison(page, row, reference, band, out) {
  const left = row[`${band}Image`], right = reference[`${band}Image`];
  const [leftPNG, rightPNG, leftNormalizedPNG, rightNormalizedPNG] = await Promise.all([left, right, row[`${band}NormalizedImage`], reference[`${band}NormalizedImage`]].map(async path => (await readFile(join(out, path))).toString('base64')));
  const a = row.chrome[band], b = reference.chrome[band];
  const masks = [...(a?.masks ?? []), ...(b?.masks ?? [])].filter(m => m.status === 'measured').flatMap(m => [m.rect, ...(m.textRects ?? [])]);
  const result = await bounded(page.evaluate(async ({ leftPNG, rightPNG, leftNormalizedPNG, rightNormalizedPNG, masks, heights }) => {
    const decode = async png => {
      const image = new Image(); image.src = `data:image/png;base64,${png}`; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
      return { width: image.width, height: image.height, data: ctx.getImageData(0, 0, image.width, image.height).data };
    };
    const encode = diff => {
      const canvas = document.createElement('canvas'); canvas.width = diff.width; canvas.height = diff.height;
      canvas.getContext('2d').putImageData(new ImageData(diff.data, diff.width, diff.height), 0, 0);
      return { width: diff.width, height: diff.height, differentPixels: diff.differentPixels, over16Pixels: diff.over16Pixels, totalPixels: diff.totalPixels, png: canvas.toDataURL('image/png').split(',')[1] };
    };
    const leftImage = await decode(leftPNG), rightImage = await decode(rightPNG);
    const normalizedLeft = await decode(leftNormalizedPNG), normalizedRight = await decode(rightNormalizedPNG);
    return { raw: encode(globalThis.naeilDiffRGBA(leftImage, rightImage)), masked: encode(globalThis.naeilDiffRGBA(globalThis.naeilMaskedRGBA(normalizedLeft, masks, heights[0] ?? normalizedLeft.height), globalThis.naeilMaskedRGBA(normalizedRight, masks, heights[1] ?? normalizedRight.height))) };
  }, { leftPNG, rightPNG, leftNormalizedPNG, rightNormalizedPNG, masks, heights: band === 'footer' ? [a?.coreHeight, b?.coreHeight] : [null, null] }), 'decode/compare/encode bands');
  const paths = {};
  for (const kind of ['raw', 'masked']) {
    paths[kind] = `diffs/${row.id}-${band}-${kind}.png`;
    await writeFile(join(out, paths[kind]), Buffer.from(result[kind].png, 'base64'));
    delete result[kind].png;
  }
  return { counted: verdict(result.masked.over16Pixels === 0, { ...result.masked, channelTolerance: 16, actual: left, reference: right, diff: paths.masked, masks: { actual: a?.masks ?? [], reference: b?.masks ?? [] }, coreHeights: [a?.coreHeight ?? null, b?.coreHeight ?? null] }), supporting: { ...result.raw, diff: paths.raw, counted: false } };
}
export function differenceCount(rows) {
  return rows.reduce((n, row) => n + Object.values(row.checks).filter(c => c.status === 'differs').length, 0);
}
export async function main(args = process.argv.slice(2)) {
  if (args.length === 1 && args[0] === '--help') {
    console.log('Usage: pnpm compare:live [--out /outside/repo] [--channel chrome] [--storage-state SITE=FILE ...]\nSites: naeil, abstorm, estimate, jev, home. Defaults: fresh signed-out contexts, installed Chrome, OS temp output. Exit 1: differences; 2: incomplete/error. See scripts/live-compare.md.');
    return 0;
  }
  const options = parseArgs(args);
  const out = options.out ?? await mkdtemp(join(tmpdir(), 'naeil-live-compare-'));
  await mkdir(out, { recursive: true });
  const resolvedOut = await realpath(out), resolvedRoot = await realpath(ROOT);
  const fromRoot = relative(resolvedRoot, resolvedOut);
  if (fromRoot !== '..' && !fromRoot.startsWith(`..${sep}`)) throw new Error('--out must be outside repository; evidence must not be committed');
  for (const dir of ['screenshots', 'bands', 'diffs', 'rows']) await mkdir(join(out, dir), { recursive: true });
  const measure = await loadMeasure();
  const browser = await chromium.launch({ channel: options.channel, headless: true, timeout: 30000 });
  const rows = [], jobs = [], blockedSites = new Map();
  for (const site of SITES) for (const locale of ['ko', 'ja', 'en']) for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) for (const scheme of ['light', 'dark']) for (const kind of ['short', 'long', 'error', ...(site.id === 'naeil' ? ['error-blog'] : [])]) jobs.push({ site, locale, viewport, scheme, kind });
  try {
    let next = 0;
    await Promise.all(Array.from({ length: 3 }, async () => {
      while (next < jobs.length) rows.push(await capture(jobs[next++], browser, out, options.states, measure, blockedSites));
    }));
    const context = await bounded(browser.newContext(), 'pixel context');
    const page = await bounded(context.newPage(), 'pixel page');
    // Inject only the local, unit-tested pure function into this blank page.
    await bounded(page.evaluate(`globalThis.naeilDiffRGBA = (${diffRGBA.toString()}); globalThis.naeilMaskedRGBA = (${maskedRGBA.toString()})`), 'install pixel function');
    for (const row of rows) {
      const reference = rows.find(r => r.site === 'naeil' && r.locale === row.locale && r.viewport.width === row.viewport.width && r.osColorScheme === row.osColorScheme && r.kind === 'short');
      if (row.icons && !row.rateLimited) row.checks.icons = iconVerdict(row.icons, reference?.icons, SITES.find(s => s.id === row.site));
      row.geometryComparisons = {};
      row.supportingPixelDiffs = {};
      for (const band of ['header', 'footer']) {
        const key = `${band}Pixels`;
        if (!row.layout || row.rateLimited || row.document?.kind === 'locale-fallback') continue;
        const sameCondition = row.layout.lang === row.locale && reference?.layout?.lang === row.locale && row.layout.theme === reference?.layout?.theme;
        const geometry = sameCondition ? geometryComparison(row.chrome?.[band], reference?.chrome?.[band]) : nm('No same rendered language/theme reference');
        row.geometryComparisons[band] = geometry;
        if (band === 'footer') row.checks.footerColumns = geometry;
        else for (const [name, check] of Object.entries({ logo: 'logo', wordmark: 'wordmark', theme: 'themeControl', locale: 'localeControl', account: 'accountControl' })) {
          const element = geometry.values?.elements[name];
          row.checks[check] = element ? { status: element.status, ...(element.reason ? { reason: element.reason } : {}), ...(element.status !== 'not measured' ? { values: element } : {}) } : nm(geometry.reason ?? 'No shared element measurement');
        }
        if (!sameCondition) { row.checks[key] = nm('No same rendered language/theme baseline'); continue; }
        if (!row[`${band}Image`] || !reference?.[`${band}Image`]) { row.checks[key] = nm(`Missing actual or baseline ${band} band`); continue; }
        const a = row.chrome?.[band], b = reference.chrome?.[band];
        const problems = [a?.error, b?.error, ...(a?.problems ?? []), ...(b?.problems ?? [])].filter(Boolean);
        try {
          const pixels = await pixelComparison(page, row, reference, band, out);
          row.checks[key] = !a || !b || problems.length ? nm(problems.join('; ') || 'Missing shared band markers; raw diff retained') : pixels.counted;
          row.supportingPixelDiffs[band] = pixels.supporting;
        } catch { row.checks[key] = nm('Band pixel comparison failed or timed out'); }
      }
    }
    await bounded(context.close(), 'close pixel context');
  } finally { await bounded(browser.close(), 'close browser'); }
  rows.sort((a, b) => a.id.localeCompare(b.id));
  const differences = differenceCount(rows);
  const notMeasured = rows.reduce((n, r) => n + Object.values(r.checks).filter(c => c.status === 'not measured').length, 0);
  const findings = distinctDifferences(rows);
  const notRequiredCount = rows.reduce((n, r) => n + Object.values(r.checks).filter(c => c.status === 'not required').length, 0);
  const report = { schemaVersion: 3, notRequired: notRequiredCount, errorDocuments: errorDocumentSummary(rows), measuredAt: new Date().toISOString(), browser: `${options.channel} (Chromium) ${browser.version()}`, differences, distinctDifferences: findings, notMeasured, masks: MASK_POLICY, rollup: rollup(rows, CHECKS, SITES.map(s => s.id)), pixelPolicy: 'Union masks and integer-origin comparison captures; channel tolerance 16 (same as audit visible-pixel metric); original raw differences retained. Geometry/resolved layout lengths tolerance 0.5px; other computed styles exact; inactive border colors recorded but excluded. Optional icon metadata not counted.', safety: 'GET/HEAD only; service workers and WebSockets blocked; opaque per-site state; cross-origin browser requests blocked with state. No login, submit or state-changing click.', coverageFailures: Object.fromEntries(blockedSites), rows };
  await writeReport(report, out, CHECKS, SITES.map(s => s.id));
  console.log(JSON.stringify({ out, rows: rows.length, distinctDifferences: findings.length, differingCheckCells: differences, notMeasured }));
  return findings.length > 0 ? 1 : notMeasured > 0 ? 2 : 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().then(code => { process.exitCode = code; }).catch(() => { console.error('Live comparison failed. Check CLI arguments, output path and installed browser. No storage-state contents or raw browser error is logged.'); process.exitCode = 2; });
}
