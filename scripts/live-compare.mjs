import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir, realpath, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import ts from 'typescript';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const TIMEOUT = 15000;
export const SITES = [
  { id: 'naeil', origin: 'https://naeil.dev', short: 'projects', long: 'design', error: 'audit-missing-20261115' },
  { id: 'abstorm', origin: 'https://abstorm.naeil.dev', short: 'unknown', error: 'login' },
  { id: 'estimate', origin: 'https://abestimate.naeil.dev', short: 'access-denied', error: 'audit-missing-20261115' },
  { id: 'jev', origin: 'https://jev.naeil.dev', short: 'login?state=denied', error: 'audit-missing-20261115' },
  // Real user-facing proxy, deliberately never replaced by localhost or a public alias.
  { id: 'home', origin: 'https://jay-macmini-2.tail165003.ts.net:2455', short: 'console', error: 'console/audit-missing-20261115' },
];
const CANONICAL_ICONS = ['/favicon.ico', '/icon.svg', '/apple-icon.png'];
const CHECKS = ['availability', 'locale', 'frame', 'gap', 'body', 'bodyFont', 'latinFont', 'digitFont', 'japaneseFont', 'icons', 'title', 'theme', 'headerPixels', 'footerPixels'];
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
async function fontsFor(page, context) {
  const targets = await bounded(page.evaluate(() => {
    const visible = el => el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) && el.getBoundingClientRect().width > 0;
    const text = el => [...el.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join('').trim();
    const selector = el => {
      const parts = [];
      while (el && el !== document.documentElement) {
        let i = 1;
        for (let prev = el.previousElementSibling; prev; prev = prev.previousElementSibling) if (prev.tagName === el.tagName) i++;
        parts.unshift(`${el.tagName.toLowerCase()}:nth-of-type(${i})`); el = el.parentElement;
      }
      return `html>${parts.join('>')}`;
    };
    const candidates = root => root ? [root, ...root.querySelectorAll('*')].filter(el => !['SCRIPT', 'STYLE', 'SVG', 'PATH'].includes(el.tagName) && visible(el) && text(el) && el.children.length === 0) : [];
    const chrome = [...candidates(document.querySelector('header')), ...candidates(document.querySelector('footer'))];
    const body = candidates(document.querySelector('main') ?? document.body);
    const all = [...body, ...chrome];
    const latin = chrome.find(el => /^[\x20-\x7e\xa0-\xff]+$/.test(text(el)) && /[a-z]/i.test(text(el)));
    const digit = chrome.find(el => /^[\x20-\x7e\xa0-\xff]+$/.test(text(el)) && /\d/.test(text(el)));
    const japanese = document.documentElement.lang.startsWith('ja') ? all.find(el => /[\u3040-\u30ff\u3400-\u9fff]/.test(text(el)) && !/[a-z0-9]/i.test(text(el))) : null;
    const ordinary = body.find(el => ['P', 'LI', 'SPAN', 'DIV'].includes(el.tagName)) ?? body[0];
    return Object.fromEntries(Object.entries({ body: ordinary, latin, digit, japanese }).map(([key, el]) => [key, el ? { selector: selector(el), text: text(el).slice(0, 100), computedFamily: getComputedStyle(el).fontFamily } : null]));
  }), 'find visible font samples');
  const cdp = await bounded(context.newCDPSession(page), 'create CDP session');
  try {
    await bounded(cdp.send('DOM.enable'), 'DOM.enable');
    await bounded(cdp.send('CSS.enable'), 'CSS.enable');
    const { root } = await bounded(cdp.send('DOM.getDocument', { depth: 0 }), 'DOM.getDocument');
    for (const target of Object.values(targets)) if (target) {
      const { nodeId } = await bounded(cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: target.selector }), 'font node');
      target.fonts = (await bounded(cdp.send('CSS.getPlatformFontsForNode', { nodeId }), 'platform fonts')).fonts;
    }
  } finally { await bounded(cdp.detach(), 'CDP detach'); }
  return targets;
}
function fontVerdict(target, expected) {
  if (!target) return nm('No visible, script-isolated text sample on this page');
  const fonts = target.fonts.filter(font => font.glyphCount > 0);
  return fonts.length ? verdict(fonts.every(font => expected.test(`${font.familyName} ${font.postScriptName}`)), target) : nm('CDP returned no rendered glyphs');
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
  if (!reference) return nm('naeil.dev icon baseline unavailable');
  const comparisons = actual.responses.map(response => {
    const path = new URL(response.url).pathname;
    const expected = reference.responses.find(r => new URL(r.url).pathname === path);
    return { ...response, expectedSHA256: expected?.sha256 ?? null, matches: !!expected?.sha256 && response.status === 200 && response.sha256 === expected.sha256 };
  });
  const declared = actual.declarations.map(d => ({ ...d, matches: reference.declarations.some(r => r.rel === d.rel && r.type === d.type && r.sizes === d.sizes && new URL(r.href).pathname === new URL(d.href).pathname) }));
  const values = { origin: site.origin, declared, responses: comparisons };
  if (declared.length === 0 || declared.some(d => !d.matches) || comparisons.some(r => !r.error && r.expectedSHA256 && !r.matches)) return verdict(false, values);
  if (comparisons.some(r => r.error || !r.expectedSHA256)) return { ...nm('Anonymous icon GET or baseline unavailable; response details retained'), values };
  return verdict(true, values);
}
async function capture(job, browser, out, states, measure) {
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
    stage = 'Navigate requested address (30s)';
    const response = await page.goto(requestedURL, { waitUntil: 'load', timeout: 30000 });
    row.httpStatus = response?.status();
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => { row.networkIdleTimedOut = true; });
    stage = 'Wait for rendered fonts (15s)';
    await page.waitForFunction(() => document.fonts.status === 'loaded', null, { timeout: TIMEOUT });
    // Font and hydration waits are bounded; no clicks or form interactions.
    await bounded(page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)))), 'two frames');
    stage = 'Read page geometry (15s)';
    row.measurements = await bounded(page.evaluate(measure), 'page rhythm');
    row.layout = await bounded(page.evaluate(readLayout), 'page layout');
    row.checks.availability = verdict(new URL(row.layout.url).origin === site.origin, { requested: requestedURL, final: row.layout.url, httpStatus: row.httpStatus });
    row.checks.locale = verdict(row.layout.lang.split('-')[0] === locale, { requested: locale, actual: row.layout.lang });
    const noFooter = site.id === 'home' && kind === 'short';
    row.checks.frame = verdict(!!row.layout.header && row.measurements.mainCount === 1 && (noFooter || !!row.layout.footer), { header: !!row.layout.header, main: row.measurements.mainCount, footer: !!row.layout.footer, allowedNoFooter: noFooter });
    row.checks.gap = noFooter ? nm('Home login deliberately omits footer') : !row.layout.footer ? verdict(false, { reason: 'Missing footer; bare error page', expected: kind === 'long' ? 96 : 0 }) : kind === 'short' ? (row.layout.scrollHeight > viewport.height + 1 ? nm('Audited short route overflows this viewport; footer bottom cannot align to viewport') : verdict(near(row.layout.footerGap, 0), { footerBottomToViewport: row.layout.footerGap, expected: 0 })) : kind === 'long' ? verdict(near(row.measurements.contentFooter, 96), { contentToFooter: row.measurements.contentFooter, expected: 96 }) : nm('Supplementary error probe; frame checked separately');
    row.checks.body = verdict(near(row.layout.body.size, 16) && near(row.layout.body.lineHeight, 25), { ...row.layout.body, expected: '16/25px' });
    row.checks.title = verdict(validTitle(row.layout.title, site.id), { actual: row.layout.title, expected: `Page name — ${site.id === 'naeil' ? '.naeil' : `.naeil ${site.id}`}` });
    row.checks.theme = hasState ? nm('Supplied state may contain remembered theme; this is not a first visit') : verdict(row.layout.theme === 'dark', { actual: row.layout.theme, colorScheme: row.layout.colorScheme, expected: 'dark', os: scheme });
    // Geometry is final before any element capture can scroll the document.
    stage = 'Capture viewport and chrome (15s per image)';
    row.screenshot = `screenshots/${id}.png`;
    await page.screenshot({ path: join(out, row.screenshot), timeout: TIMEOUT });
    for (const band of ['header', 'footer']) if (row.layout[band]) {
      row[`${band}Image`] = `bands/${id}-${band}.png`;
      await page.locator(`[data-naeil-${band}]`).first().screenshot({ path: join(out, row[`${band}Image`]), timeout: TIMEOUT });
    }
    try {
      row.fonts = await fontsFor(page, context);
      row.checks.latinFont = fontVerdict(row.fonts.latin, /Pretendard/i);
      row.checks.digitFont = fontVerdict(row.fonts.digit, /Pretendard/i);
      row.checks.japaneseFont = fontVerdict(row.fonts.japanese, /Noto\s*Sans\s*JP|NotoSansJP/i);
      const sample = row.fonts.body;
      row.checks.bodyFont = sample && /[a-z0-9]/i.test(sample.text) && /[\u3040-\u30ff\u3400-\u9fff]/.test(sample.text) && locale === 'ja' ? nm('Mixed-script body sample; aggregate CDP families recorded in JSON, cannot assign font to each glyph') : fontVerdict(sample, locale === 'ja' && /[\u3040-\u30ff\u3400-\u9fff]/.test(sample?.text ?? '') ? /Noto\s*Sans\s*JP|NotoSansJP/i : /Pretendard/i);
    } catch { for (const k of ['bodyFont', 'latinFont', 'digitFont', 'japaneseFont']) row.checks[k] = nm('CDP font measurement failed or exceeded 15s'); }
    row.icons = await iconsFor(site, row.measurements.icons, await bounded(page.evaluate(() => navigator.userAgent), 'browser user agent'));
  } catch {
    // Never emit browser errors: a storage-state parser exception can include file contents.
    row.failure = `${stage} failed/timed out; no alternate address used`;
    row.checks.availability = nm(row.failure);
  } finally { if (context) await bounded(context.close(), 'close context').catch(() => {}); }
  console.log(`${id}: HTTP ${row.httpStatus ?? 'not measured'}; footer gap ${row.layout?.footerGap ?? 'not measured'}; ${row.failure ?? row.layout?.theme ?? ''}`);
  return row;
}
async function pixelComparison(page, left, right, out, name) {
  const [leftPNG, rightPNG] = await Promise.all([left, right].map(async path => (await readFile(join(out, path))).toString('base64')));
  // Keep raw RGBA in the browser; transferring millions of channel numbers via
  // the automation protocol makes a full matrix unnecessarily slow.
  const result = await bounded(page.evaluate(async ({ leftPNG, rightPNG }) => {
    const decode = async png => {
      const image = new Image(); image.src = `data:image/png;base64,${png}`; await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
      return { width: image.width, height: image.height, data: ctx.getImageData(0, 0, image.width, image.height).data };
    };
    const diff = globalThis.naeilDiffRGBA(await decode(leftPNG), await decode(rightPNG));
    const canvas = document.createElement('canvas'); canvas.width = diff.width; canvas.height = diff.height;
    canvas.getContext('2d').putImageData(new ImageData(diff.data, diff.width, diff.height), 0, 0);
    return { width: diff.width, height: diff.height, differentPixels: diff.differentPixels, over16Pixels: diff.over16Pixels, totalPixels: diff.totalPixels, png: canvas.toDataURL('image/png').split(',')[1] };
  }, { leftPNG, rightPNG }), 'decode/compare/encode bands');
  const path = `diffs/${name}.png`;
  await writeFile(join(out, path), Buffer.from(result.png, 'base64'));
  const values = { width: result.width, height: result.height, differentPixels: result.differentPixels, over16Pixels: result.over16Pixels, totalPixels: result.totalPixels };
  return verdict(result.differentPixels === 0, { ...values, actual: left, reference: right, diff: path });
}
export function differenceCount(rows) {
  return rows.reduce((n, row) => n + Object.values(row.checks).filter(c => c.status === 'differs').length, 0);
}
const cell = value => value.replaceAll('|', '\\|').replaceAll('\n', ' ');
function checkText(check) {
  if (check.status === 'not measured') return `재지 않음/not measured: ${check.reason}${check.values ? `; ${JSON.stringify(check.values)}` : ''}`;
  return `${check.status}: ${JSON.stringify(check.values)}`;
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
  for (const dir of ['screenshots', 'bands', 'diffs']) await mkdir(join(out, dir), { recursive: true });
  const measure = await loadMeasure();
  const browser = await chromium.launch({ channel: options.channel, headless: true, timeout: 30000 });
  const rows = [], jobs = [];
  for (const site of SITES) for (const locale of ['ko', 'ja', 'en']) for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) for (const scheme of ['light', 'dark']) for (const kind of ['short', 'long', 'error']) jobs.push({ site, locale, viewport, scheme, kind });
  try {
    let next = 0;
    await Promise.all(Array.from({ length: 3 }, async () => {
      while (next < jobs.length) rows.push(await capture(jobs[next++], browser, out, options.states, measure));
    }));
    const context = await bounded(browser.newContext(), 'pixel context');
    const page = await bounded(context.newPage(), 'pixel page');
    // Inject only the local, unit-tested pure function into this blank page.
    await bounded(page.evaluate(`globalThis.naeilDiffRGBA = (${diffRGBA.toString()})`), 'install pixel function');
    for (const row of rows) {
      const reference = rows.find(r => r.site === 'naeil' && r.locale === row.locale && r.viewport.width === row.viewport.width && r.osColorScheme === row.osColorScheme && r.kind === 'short');
      if (row.icons) row.checks.icons = iconVerdict(row.icons, reference?.icons, SITES.find(s => s.id === row.site));
      for (const band of ['header', 'footer']) {
        const key = `${band}Pixels`;
        if (!row.layout) continue;
        if (row.layout.lang !== row.locale || reference?.layout?.lang !== row.locale) { row.checks[key] = nm('Requested locale did not render; no same-locale baseline comparison'); continue; }
        if (!row[`${band}Image`] || !reference?.[`${band}Image`]) { row.checks[key] = nm(`Missing actual or baseline ${band} band${row.site === 'home' && row.kind === 'short' && band === 'footer' ? '; Home login intentionally has no footer' : ''}`); continue; }
        if (row.layout.theme !== reference.layout.theme) { row.checks[key] = nm('Actual themes differ; no same-theme baseline'); continue; }
        try { row.checks[key] = await pixelComparison(page, row[`${band}Image`], reference[`${band}Image`], out, `${row.id}-${band}`); }
        catch { row.checks[key] = nm('Band pixel comparison failed or timed out'); }
      }
    }
    await bounded(context.close(), 'close pixel context');
  } finally { await bounded(browser.close(), 'close browser'); }
  rows.sort((a, b) => a.id.localeCompare(b.id));
  const differences = differenceCount(rows);
  const notMeasured = rows.reduce((n, r) => n + Object.values(r.checks).filter(c => c.status === 'not measured').length, 0);
  const report = { schemaVersion: 1, measuredAt: new Date().toISOString(), browser: `Chrome ${browser.version()}`, differences, notMeasured, countUnit: 'individual check cells, including each OS-scheme/viewport/locale; not unique defects', pixelPolicy: 'Exact RGBA equality, no masks. Intentional service suffix/account/navigation differences also count. Red >16 channel delta; amber 1–16. Bands aligned at top-left; missing extents differ.', safety: 'GET/HEAD only; service workers and WebSockets blocked; storage state opaque and cross-origin requests blocked when supplied. No login, submit or state-changing click.', rows };
  await writeFile(join(out, 'comparison.json'), JSON.stringify(report, null, 2));
  const columns = ['Condition / address', ...CHECKS];
  const lines = ['# Live site comparison', '', `Measured ${report.measuredAt}. ${report.browser}; DPR 1. Each row uses a fresh context.`, '', report.pixelPolicy, '', 'Long service routes were not measured. No route was invented. Home uses the audited Tailscale proxy; browser language preference is supplied without changing application state. If ignored, the locale check differs and pixels are not compared as that locale.', '', `| ${columns.join(' | ')} |`, `| ${columns.map(() => '---').join(' | ')} |`];
  for (const row of rows) lines.push(`| ${[`${row.id}; ${row.requestedURL}; ${row.locale}; ${row.viewport.width}×${row.viewport.height}; ${row.session}; ${row.browser}; OS ${row.osColorScheme}${row.screenshot ? `; [screenshot](${row.screenshot})` : ''}`, ...CHECKS.map(k => checkText(row.checks[k]))].map(cell).join(' | ')} |`);
  lines.push('', `Differences: **${differences}** check cells. Not measured: **${notMeasured}** check cells. Zero differences with unmeasured cells does not establish complete parity.`, '');
  await writeFile(join(out, 'comparison.md'), lines.join('\n'));
  console.log(JSON.stringify({ out, rows: rows.length, differences, notMeasured }));
  return differences > 0 ? 1 : notMeasured > 0 ? 2 : 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().then(code => { process.exitCode = code; }).catch(() => { console.error('Live comparison failed. Check CLI arguments, output path and installed browser. No storage-state contents or raw browser error is logged.'); process.exitCode = 2; });
}
