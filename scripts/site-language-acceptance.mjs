import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from '@playwright/test';
import matter from 'gray-matter';

// Acceptance of the actual built Site and packed common preference reader.
// All server/business transport stays local. The HTTPS cases use browser request
// interception, not live DNS/TLS or the native Jev/Estimate applications.
const locales = ['en', 'ko', 'ja'];
const names = { en: 'English', ko: '한국어', ja: '日本語' };
const paths = { en: '', ko: '/ko', ja: '/ja' };
const titles = {
  en: { '/': '.naeil', '/projects': 'Projects — .naeil', '/design': 'Design System — .naeil', '/blog': 'Blog — .naeil', '/login': 'Sign in — .naeil', '/login/change-password': 'Change password — .naeil' },
  ko: { '/': '.naeil', '/projects': '프로젝트 — .naeil', '/design': '디자인 시스템 — .naeil', '/blog': '블로그 — .naeil', '/login': '로그인 — .naeil', '/login/change-password': '비밀번호 변경 — .naeil' },
  ja: { '/': '.naeil', '/projects': 'プロジェクト — .naeil', '/design': 'デザインシステム — .naeil', '/blog': 'ブログ — .naeil', '/login': 'ログイン — .naeil', '/login/change-password': 'パスワードを変更 — .naeil' },
};
const inviteTitles = { en: 'Confirm invitation — .naeil', ko: '초대 확인 — .naeil', ja: '招待の確認 — .naeil' };
const currentCookie = 'naeil_locale_dev_v1';
const sharedCookie = 'naeil_locale_v1';
const pathFor = (locale, route = '/') => paths[locale] + (route === '/' ? (locale === 'en' ? '/' : '') : route);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const fixtureTitle = locale => `Acceptance original ${locale}`;

export function prepareSiteLanguageFixture(privateDir, evidence, artifact) {
  const source = resolve('content/blog');
  const content = join(privateDir, 'content/blog');
  cpSync(source, content, { recursive: true });
  const originalPosts = locales.flatMap(locale => readdirSync(join(source, locale)).filter(name => name.endsWith('.mdx')).map(name => {
    const bytes = readFileSync(join(source, locale, name));
    const { data } = matter(bytes.toString());
    return { locale, slug: name.slice(0, -4), title: data.title, source: relative(process.cwd(), join(source, locale, name)), sha256: sha256(bytes) };
  }));
  for (const locale of locales) {
    for (const [slug, title, date] of [[`acceptance-only-${locale}`, fixtureTitle(locale), '2026-11-03'], ['acceptance-neighbor', `Acceptance neighbor ${locale}`, '2026-03-29']]) {
      writeFileSync(join(content, locale, `${slug}.mdx`), `---\ntitle: "${title}"\nslug: "${slug}"\ndate: "${date}"\nsummary: "Synthetic local acceptance content ${locale}"\nlocale: ${locale}\ncategories: []\ntags: []\n---\n\n# ${title}\n\nSynthetic content read-boundary fixture.\n`);
    }
  }
  const accessLog = join(evidence, 'content-fixture-access.jsonl');
  const preload = join(privateDir, 'content-preload.cjs');
  // The app uses synchronous fs calls. Only its exact content/blog roots are
  // redirected; Next build output, imports, source and static sitemap are intact.
  const roots = [source, ...(artifact ? [resolve(artifact, 'standalone/content/blog')] : [])];
  writeFileSync(preload, `const fs=require('node:fs'),path=require('node:path');
const roots=${JSON.stringify(roots)},target=${JSON.stringify(content)},log=${JSON.stringify(accessLog)};
const append=fs.appendFileSync.bind(fs),seen=new Set();
function mapped(input){if(typeof input!=='string')return input;const full=path.resolve(input);for(const root of roots){if(full===root||full.startsWith(root+path.sep)){const next=target+full.slice(root.length);if(!seen.has(full)){seen.add(full);append(log,JSON.stringify({source:full,fixture:next})+'\\n');}return next;}}return input;}
for(const name of ['readFileSync','readdirSync','existsSync','statSync']){const original=fs[name];fs[name]=function(input,...args){return original.call(fs,mapped(input),...args);};}
require('node:module').syncBuiltinESMExports();\n`);
  const pack = process.env.NAEIL_LANGUAGE_PACK || '/Users/jaymini/.local/share/naeil-shared-language/2026-11-04/frozen-0.10.0/naeil-ui-0.10.0.tgz';
  assert.ok(existsSync(pack), 'A frozen package is required for browser reader checks');
  const extracted = join(privateDir, 'packed');
  mkdirSync(extracted);
  execFileSync('tar', ['-xzf', pack, '-C', extracted]);
  return { preload, content, accessLog, originalPosts, pack, packSha256: sha256(readFileSync(pack)), moduleRoot: join(extracted, 'package/dist/naeil-locale') };
}

async function metadata(page) {
  return page.evaluate(() => ({
    lang: document.documentElement.lang,
    title: document.title,
    canonical: [...document.querySelectorAll('link[rel="canonical"]')].map(node => node.getAttribute('href')),
    alternates: [...document.querySelectorAll('link[rel="alternate"][hreflang]')].map(node => [node.getAttribute('hreflang'), node.getAttribute('href')]).sort(),
    icons: [...document.querySelectorAll('link[rel~="icon"]')].map(node => node.getAttribute('href')),
    robots: [...document.querySelectorAll('meta[name="robots"]')].map(node => node.getAttribute('content')),
    ogUrl: document.querySelector('meta[property="og:url"]')?.getAttribute('content') ?? null,
    ogTitle: document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? null,
    twitterTitle: document.querySelector('meta[name="twitter:title"]')?.getAttribute('content') ?? null,
    headings: [...document.querySelectorAll('main h1, main h2')].map(node => node.textContent),
    jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].map(node => JSON.parse(node.textContent)),
  }));
}

function assertPublicMeta(observed, locale, route, title, available = locales) {
  const canonical = 'https://naeil.dev' + pathFor(locale, route);
  const alternates = available.map(language => [language, 'https://naeil.dev' + pathFor(language, route)]);
  if (available.includes('en')) alternates.push(['x-default', 'https://naeil.dev' + pathFor('en', route)]);
  assert.equal(observed.lang, locale);
  assert.equal(observed.title, title);
  assert.deepEqual(observed.canonical, [canonical]);
  assert.deepEqual(observed.alternates, alternates.sort());
  assert.ok(observed.icons.includes('/icon.svg'));
  assert.ok(!observed.robots.some(value => /noindex/.test(value)));
  assert.equal(observed.ogUrl, canonical);
  assert.equal(observed.ogTitle, title);
  assert.equal(observed.twitterTitle, title);
}

async function chooseLocale(page, locale) {
  await page.locator('[data-naeil-focus-id="locale-control"]:visible').click();
  await page.getByRole('option', { name: names[locale], exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', locale);
  await expect(page.locator('[data-naeil-header]')).not.toHaveAttribute('aria-busy', 'true');
}

function observeCookieSetter({ denied = false } = {}) {
  const descriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
  window.acceptanceCookieWrites = [];
  Object.defineProperty(Document.prototype, 'cookie', {
    ...descriptor,
    get() { return descriptor.get.call(this); },
    set(value) {
      if (/^naeil_locale_(?:dev_)?v1=/.test(value)) {
        window.acceptanceCookieWrites.push({ value, lang: document.documentElement.lang, pathname: location.pathname });
        if (denied === 'throw') throw new DOMException('Synthetic current-cookie denial', 'SecurityError');
        if (denied === 'drop') return;
      }
      return descriptor.set.call(this, value);
    },
  });
}

export async function runSiteLanguageAcceptance({ browser, origin, authOrigin, identity, evidence, fixture, withPasswordChangeSession }) {
  const senderEnabled = process.env.NAEIL_LOCALE_SEND_ENABLED === '1';
  const cases = [];
  const selected = process.env.NAEIL_LANGUAGE_CASE_FILTER ? new RegExp(process.env.NAEIL_LANGUAGE_CASE_FILTER) : null;
  const reportPath = join(evidence, 'language-acceptance.json');
  const report = {
    schemaVersion: 1, startedAt: new Date().toISOString(), scope: 'actual-built-site-local-synthetic-boundaries',
    productionVerified: false, identity, senderEnabled, caseFilter: selected?.source ?? null,
    archive: { path: fixture.pack, sha256: fixture.packSha256 },
    scripts: Object.fromEntries(['scripts/site-account-language.mjs', 'scripts/site-language-acceptance.mjs'].map(file => [file, sha256(readFileSync(file))])),
    fixture: { originalPosts: fixture.originalPosts, accessLog: fixture.accessLog, contentBoundary: 'temporary fs read mapping; no product or build bytes edited', sitemapBoundary: 'unmodified build-time dataset', invitationBoundary: 'actual HTTP document and inline script; intercepted browser POST stage/confirm only; no acceptance RPC', crossServiceBoundary: 'rendered href and browser navigation to an intercepted landing stub; native receivers belong to consumer suites', secureCookieBoundary: 'real built Site controller at three HTTPS browser origins mapped to localhost; no live DNS/TLS, no live requests' },
    cases,
  };
  const persist = () => writeFileSync(reportPath, JSON.stringify(report, null, 2));
  async function check(name, details, work) {
    if (selected && !selected.test(name + ' ' + JSON.stringify(details))) return;
    const result = { name, ...details, status: 'running', startedAt: new Date().toISOString() };
    cases.push(result); persist();
    try { result.observations = await work(); result.status = 'passed'; }
    catch (error) { result.status = 'failed'; result.error = error.stack || String(error); }
    result.finishedAt = new Date().toISOString(); persist();
    console.log(JSON.stringify({ acceptance: name, ...details, status: result.status, ...(result.error ? { error: result.error } : {}) }));
  }
  async function localContext(options = {}) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', ...options });
    await context.route('**/*', route => [origin, authOrigin].includes(new URL(route.request().url()).origin) ? route.continue() : route.abort());
    return context;
  }
  async function visit(page, locale, route) {
    const response = await page.goto(origin + pathFor(locale, route));
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    if (titles[locale][route]) await expect(page).toHaveTitle(titles[locale][route]);
    return response;
  }
  const preference = async context => (await context.cookies(origin)).filter(cookie => cookie.name === currentCookie);

  for (const locale of locales) for (const route of ['/', '/projects', '/design', '/blog', '/blog/2026-03-30']) {
    await check('public HTTP and exact metadata', { locale, route }, async () => {
      const observations = [];
      for (const conflictingHints of [false, true]) {
        const context = await localContext({ locale: conflictingHints ? 'ja-JP' : 'en-US' });
        try {
          if (conflictingHints) await context.addCookies([{ name: currentCookie, value: locale === 'ko' ? 'en' : 'ko', domain: 'localhost', path: '/' }, { name: 'NEXT_LOCALE', value: 'ja', domain: 'localhost', path: '/' }]);
          const page = await context.newPage();
          const response = await visit(page, locale, route);
          assert.equal(response.status(), 200);
          const title = titles[locale][route] || fixture.originalPosts.find(post => post.locale === locale && post.slug === '2026-03-30').title + ' — .naeil';
          await expect(page).toHaveTitle(title);
          const meta = await metadata(page);
          assertPublicMeta(meta, locale, route, title);
          if (route.startsWith('/blog/')) {
            const post = meta.jsonLd.find(value => value['@type'] === 'BlogPosting');
            assert.equal(post.inLanguage, locale);
            assert.equal(post.url, 'https://naeil.dev' + pathFor(locale, route));
            assert.equal(post.mainEntityOfPage['@id'], post.url);
          }
          const headers = await response.allHeaders();
          assert.doesNotMatch(headers.link || '', /hreflang|rel=["']?alternate/i, 'Middleware must not invent alternate links');
          assert.doesNotMatch(headers['set-cookie'] || '', /naeil_locale_(?:dev_)?v1=/);
          observations.push({ conflictingHints, status: response.status(), metadata: meta, headers: Object.fromEntries(['cache-control', 'vary', 'link', 'set-cookie'].map(name => [name, headers[name] ?? null])) });
        } finally { await context.close(); }
      }
      assert.deepEqual(observations[0].metadata, observations[1].metadata, 'URL-identical anonymous content and metadata ignore browser/cookie hints');
      for (const name of ['cache-control', 'vary', 'link']) assert.equal(observations[0].headers[name], observations[1].headers[name], name);
      return observations;
    });
  }

  await check('baked sitemap actual translations', {}, async () => {
    const response = await fetch(origin + '/sitemap.xml');
    assert.equal(response.status, 200);
    const xml = await response.text();
    writeFileSync(join(evidence, 'sitemap.xml'), xml);
    const context = await localContext();
    try {
      const page = await context.newPage();
      const entries = await page.evaluate(xml => {
        const document = new DOMParser().parseFromString(xml, 'application/xml');
        if (document.querySelector('parsererror')) throw new Error('Invalid sitemap XML');
        return [...document.getElementsByTagName('url')].map(node => ({ url: node.getElementsByTagName('loc')[0].textContent, alternates: [...node.getElementsByTagNameNS('http://www.w3.org/1999/xhtml', 'link')].map(link => [link.getAttribute('hreflang'), link.getAttribute('href')]).sort() }));
      }, xml);
      const routes = ['/', '/projects', '/design', '/blog', ...new Set(fixture.originalPosts.map(post => '/blog/' + post.slug))];
      const expected = routes.flatMap(route => {
        const available = route.startsWith('/blog/') ? locales.filter(locale => fixture.originalPosts.some(post => post.locale === locale && '/blog/' + post.slug === route)) : locales;
        const alternates = available.map(locale => [locale, 'https://naeil.dev' + pathFor(locale, route)]);
        if (available.includes('en')) alternates.push(['x-default', 'https://naeil.dev' + pathFor('en', route)]);
        return available.map(locale => ({ url: 'https://naeil.dev' + pathFor(locale, route), alternates: alternates.sort() }));
      });
      assert.deepEqual(entries.sort((a, b) => a.url.localeCompare(b.url)), expected.sort((a, b) => a.url.localeCompare(b.url)));
      assert.doesNotMatch(xml, /\/en(?:\/|<|\")|\/login|\/auth\/|acceptance-only|acceptance-neighbor/);
      return { entries, headers: Object.fromEntries(response.headers), sha256: sha256(xml) };
    } finally { await context.close(); }
  });

  for (const locale of locales) await check('auth exact titles and noindex', { locale }, async () => {
    const context = await localContext();
    try {
      const page = await context.newPage();
      const results = [];
      const inspect = async route => {
        const response = await visit(page, locale, route);
        assert.equal(response.status(), 200);
        const meta = await metadata(page);
        assert.deepEqual(meta.canonical, []);
        assert.deepEqual(meta.alternates, []);
        assert.ok(meta.robots.some(value => /noindex/.test(value)));
        assert.ok(meta.icons.includes('/icon.svg'));
        results.push({ route, metadata: meta });
      };
      await inspect('/login');
      await withPasswordChangeSession(context, () => inspect('/login/change-password'));
      return results;
    } finally { await context.close(); }
  });

  // Only the browser's cookie setter is denied: read access, navigation, storage,
  // unrelated cookies, React, the controller and the actual router remain real.
  for (const denied of ['drop', 'throw']) await check('current cookie setter denial', { denied }, async () => {
    const context = await localContext({ locale: 'ja-JP' });
    try {
      await context.addCookies([{ name: currentCookie, value: 'ko', domain: 'localhost', path: '/' }]);
      await context.addInitScript(observeCookieSetter, { denied });
      const page = await context.newPage();
      await visit(page, 'en', '/projects');
      await chooseLocale(page, 'ja');
      await expect(page).toHaveURL(origin + '/ja/projects');
      await expect(page).toHaveTitle(titles.ja['/projects']);
      assert.equal((await preference(context))[0]?.value, 'ko');
      await page.evaluate(() => { document.cookie = 'acceptance_unrelated=works; Path=/'; });
      assert.equal((await context.cookies(origin)).find(cookie => cookie.name === 'acceptance_unrelated')?.value, 'works');
      const writes = await page.evaluate(() => window.acceptanceCookieWrites);
      assert.equal(writes.length, senderEnabled ? 1 : 0);
      if (senderEnabled) { assert.match(writes[0].value, /^naeil_locale_dev_v1=ja;/); assert.equal(writes[0].lang, 'ja'); assert.equal(writes[0].pathname, '/ja/projects'); }
      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
      return { writes, cookies: await preference(context), url: page.url() };
    } finally { await context.close(); }
  });

  await check('two live tabs URL authority and passive events', {}, async () => {
    const context = await localContext({ locale: 'ja-JP' });
    try {
      await context.addCookies([{ name: currentCookie, value: 'en', domain: 'localhost', path: '/' }]);
      await context.addInitScript(observeCookieSetter, {});
      const a = await context.newPage(), b = await context.newPage();
      await visit(a, 'en', '/blog');
      await visit(b, 'ko', '/projects');
      await chooseLocale(a, 'ja');
      await expect(b.locator('html')).toHaveAttribute('lang', 'ko');
      const afterA = senderEnabled ? 'ja' : 'en';
      assert.equal((await preference(context))[0]?.value, afterA);
      await b.reload();
      await expect(b.locator('html')).toHaveAttribute('lang', 'ko');
      await visit(b, 'en', '/');
      await visit(b, 'ko', '/blog');
      await b.goBack();
      await expect(b.locator('html')).toHaveAttribute('lang', 'en');
      await b.goForward();
      await expect(b.locator('html')).toHaveAttribute('lang', 'ko');
      // Real browser request headers at the prefetch boundary, with actual RSC.
      const prefetch = await b.evaluate(async () => {
        const response = await fetch('/ja/projects?_rsc=acceptance-prefetch', { headers: { RSC: '1', 'Next-Router-Prefetch': '1', Purpose: 'prefetch' } });
        return { status: response.status, type: response.headers.get('content-type') };
      });
      assert.equal(prefetch.status, 200); assert.match(prefetch.type, /text\/x-component/);
      assert.equal((await preference(context))[0]?.value, afterA);
      await visit(b, 'ko', '/login');
      await b.getByRole('button', { name: /Google/ }).click();
      await expect(b).toHaveURL(new RegExp(authOrigin + '/auth/v1/authorize'));
      await b.goto(origin + '/auth/callback?error=denied');
      await expect(b).toHaveURL(/\/ko\/login\?error=auth/);
      assert.equal((await preference(context))[0]?.value, afterA, 'Auth return must not record an explicit language choice');
      assert.deepEqual(await b.evaluate(() => window.acceptanceCookieWrites), []);
      await chooseLocale(b, 'en');
      assert.equal((await preference(context))[0]?.value, 'en');
      await expect(a.locator('html')).toHaveAttribute('lang', 'ja');
      await expect(a).toHaveURL(origin + '/ja/blog');
      return { firstTab: a.url(), secondTab: b.url(), preference: await preference(context), prefetch, writesA: await a.evaluate(() => window.acceptanceCookieWrites), writesB: await b.evaluate(() => window.acceptanceCookieWrites) };
    } finally { await context.close(); }
  });

  for (const host of ['naeil.dev', 'jev.naeil.dev', 'abestimate.naeil.dev']) await check('secure shared cookie duplicates attributes and expiry', { host }, async () => {
    const secureOrigin = 'https://' + host;
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', locale: 'ja-JP' });
    const mappedOrigins = new Set(['https://naeil.dev', 'https://jev.naeil.dev', 'https://abestimate.naeil.dev']);
    const mappedRequests = [];
    try {
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (!mappedOrigins.has(url.origin)) return route.abort();
        if (url.pathname.startsWith('/__acceptance_packed__/')) {
          const file = resolve(fixture.moduleRoot, url.pathname.slice('/__acceptance_packed__/'.length));
          assert.ok(file.startsWith(fixture.moduleRoot + sep));
          return route.fulfill({ status: 200, contentType: 'text/javascript', body: readFileSync(file) });
        }
        const headers = { ...route.request().headers(), host: new URL(origin).host };
        if (headers.origin) headers.origin = origin;
        const destination = origin + url.pathname + url.search;
        mappedRequests.push({ browser: url.href, local: destination });
        const response = await route.fetch({ url: destination, headers, maxRedirects: 0 });
        await route.fulfill({ response });
      });
      await context.addInitScript(observeCookieSetter, {});
      await context.addCookies([
        { name: sharedCookie, value: 'ja', domain: '.naeil.dev', path: '/', secure: true, sameSite: 'Lax' },
        { name: sharedCookie, value: 'ko', url: secureOrigin + '/', secure: true, sameSite: 'Lax' },
      ]);
      const page = await context.newPage();
      await page.goto(secureOrigin + '/projects');
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      assert.equal(await page.evaluate(() => window.isSecureContext), true);
      const readActualCookie = () => page.evaluate(async () => {
        const { readLocalePreference } = await import('/__acceptance_packed__/index.js');
        return { raw: document.cookie, preference: readLocalePreference(document.cookie) ?? null };
      });
      const duplicate = await readActualCookie();
      assert.equal(duplicate.raw.split(';').filter(value => value.trim().startsWith('naeil_locale_v1=')).length, 2);
      assert.equal(duplicate.preference, null, 'Packed reader ignores conflicting real browser duplicates');
      // Duplicates with equal values are equally ambiguous.
      await context.addCookies([{ name: sharedCookie, value: 'ja', url: secureOrigin + '/', secure: true, sameSite: 'Lax' }]);
      const equalDuplicate = await readActualCookie();
      assert.equal(equalDuplicate.preference, null);
      const start = Date.now() / 1000;
      await chooseLocale(page, 'ko');
      await expect(page).toHaveURL(secureOrigin + '/ko/projects');
      const cookies = (await context.cookies(secureOrigin)).filter(cookie => cookie.name === sharedCookie);
      const writes = await page.evaluate(() => window.acceptanceCookieWrites);
      if (senderEnabled) {
        assert.equal(cookies.length, 1);
        const cookie = cookies[0];
        assert.equal(cookie.domain, '.naeil.dev'); assert.equal(cookie.path, '/'); assert.equal(cookie.value, 'ko');
        assert.equal(cookie.secure, true); assert.equal(cookie.httpOnly, false); assert.equal(cookie.sameSite, 'Lax');
        assert.ok(cookie.expires >= start + 31536000 - 3 && cookie.expires <= Date.now() / 1000 + 31536000 + 3);
        assert.equal(writes.length, 2);
        assert.equal(writes[0].value, 'naeil_locale_v1=; Path=/; Max-Age=0; Secure; SameSite=Lax');
        assert.equal(writes[1].value, 'naeil_locale_v1=ko; Domain=naeil.dev; Path=/; Max-Age=31536000; Secure; SameSite=Lax');
        assert.equal((await readActualCookie()).preference, 'ko');
        for (const other of mappedOrigins) {
          const tab = await context.newPage();
          await tab.goto(other + '/ja/blog');
          await expect(tab.locator('html')).toHaveAttribute('lang', 'ja');
          assert.match(await tab.evaluate(() => document.cookie), /naeil_locale_v1=ko/);
          assert.deepEqual(await tab.evaluate(() => window.acceptanceCookieWrites), []);
          await tab.close();
        }
      } else { assert.equal(cookies.length, 2); assert.deepEqual(writes, []); }
      await context.addCookies([
        { name: sharedCookie, value: '', domain: '.naeil.dev', path: '/', secure: true, expires: 1 },
        { name: sharedCookie, value: '', url: secureOrigin + '/', secure: true, expires: 1 },
      ]);
      assert.equal((await readActualCookie()).preference, null);
      await page.reload();
      await expect(page.locator('html')).toHaveAttribute('lang', 'ko');
      assert.equal((await context.cookies(secureOrigin)).filter(cookie => cookie.name === sharedCookie).length, 0);
      await context.addCookies([{ name: sharedCookie, value: 'xx', domain: '.naeil.dev', path: '/', secure: true }]);
      assert.equal((await readActualCookie()).preference, null);
      return { duplicate, equalDuplicate, cookiesAfterExplicitChoice: cookies, writes, expiredCookieUrl: page.url(), invalidValueIgnored: true, mappedRequestCount: mappedRequests.length, productionNetworkRequests: 0 };
    } finally { await context.close(); }
  });

  for (const locale of locales) for (const target of locales.filter(value => value !== locale)) await check('missing translation actual selector fallback', { locale, target }, async () => {
    const context = await localContext();
    try {
      const page = await context.newPage();
      const route = '/blog/acceptance-only-' + locale;
      // Blocking bot metadata gives a true HTTP 404, independently of streamed UI.
      const missing = await context.request.get(origin + pathFor(target, route), { headers: { 'User-Agent': 'Googlebot', Accept: 'text/html' } });
      assert.equal(missing.status(), 404);
      assert.doesNotMatch(await missing.text(), new RegExp('<h1[^>]*>' + fixtureTitle(locale)));
      await visit(page, locale, route);
      await expect(page).toHaveTitle(fixtureTitle(locale) + ' — .naeil');
      assertPublicMeta(await metadata(page), locale, route, fixtureTitle(locale) + ' — .naeil', [locale]);
      assert.equal(await page.locator('article a[hreflang]').count(), 0);
      await chooseLocale(page, target);
      const fallback = pathFor(target, '/blog') + '?original=acceptance-only-' + locale + '&originalLocale=' + locale;
      await expect(page).toHaveURL(origin + fallback);
      await expect(page).toHaveTitle(titles[target]['/blog']);
      const notice = page.getByRole('status').filter({ has: page.locator('a') });
      await expect(notice).toBeVisible();
      const link = notice.locator('a');
      assert.equal(await link.getAttribute('href'), pathFor(locale, route));
      assertPublicMeta(await metadata(page), target, '/blog', titles[target]['/blog']);
      const results = [];
      for (const mode of ['modified-new-tab', 'copied-href', 'normal-click']) {
        const href = await link.getAttribute('href');
        let destination;
        if (mode === 'modified-new-tab') {
          const popup = context.waitForEvent('page');
          await link.click({ modifiers: ['ControlOrMeta'] });
          destination = await popup;
        } else if (mode === 'copied-href') { destination = await context.newPage(); await destination.goto(new URL(href, page.url()).href); }
        else { destination = page; await link.click(); }
        await expect(destination).toHaveURL(origin + pathFor(locale, route));
        await expect(destination.locator('html')).toHaveAttribute('lang', locale);
        await expect(destination).toHaveTitle(fixtureTitle(locale) + ' — .naeil');
        results.push({ mode, href, landed: destination.url() });
        if (destination !== page) await destination.close();
      }
      return { missingStatus: missing.status(), fallback, originalLinkModes: results };
    } finally { await context.close(); }
  });

  // Every edge starts with a real rendered anchor. Expected paths are literal
  // contract values above, never obtained from the production URL builder.
  for (const locale of locales) {
    const home = pathFor(locale), blog = pathFor(locale, '/blog'), design = pathFor(locale, '/design');
    const post = pathFor(locale, '/blog/2026-03-30');
    const edges = [
      { edge: 'header brand', source: '/blog', href: home, selector: '[data-app-brand]:visible' },
      { edge: 'header blog', source: '/projects', href: blog, selector: `[data-naeil-header] a[href="${blog}"]:visible` },
      { edge: 'header projects design', source: '/blog', href: design, selector: `[data-slot="navigation-popover"] a[href="${design}"]:visible`, openProjects: true },
      { edge: 'footer brand', source: '/blog', href: home, selector: '[data-footer-brand]' },
      { edge: 'footer projects', source: '/blog', href: pathFor(locale, '/projects'), selector: `[data-naeil-footer] a[href="${pathFor(locale, '/projects')}"]` },
      { edge: 'footer blog', source: '/projects', href: blog, selector: `[data-naeil-footer] a[href="${blog}"]` },
      { edge: 'landing project card', source: '/', href: design, selector: `#projects a[href="${design}"]` },
      { edge: 'projects card', source: '/projects', href: design, selector: `main a[href="${design}"]` },
      { edge: 'hero fragment', source: '/', href: '#projects', selector: 'a[href="#projects"]' },
      { edge: 'blog list post', source: '/blog', href: post, selector: `main article a[href="${post}"]` },
      { edge: 'blog back', source: '/blog/2026-03-30', href: blog, selector: `article > header a[href="${blog}"]` },
      { edge: 'blog previous', source: '/blog/2026-03-30', href: pathFor(locale, '/blog/acceptance-only-' + locale), selector: `article nav a[href="${pathFor(locale, '/blog/acceptance-only-' + locale)}"]` },
      { edge: 'blog next', source: '/blog/2026-03-30', href: pathFor(locale, '/blog/acceptance-neighbor'), selector: `article nav a[href="${pathFor(locale, '/blog/acceptance-neighbor')}"]` },
      ...locales.filter(value => value !== locale).map(target => ({ edge: 'blog language ' + target, source: '/blog/2026-03-30', href: pathFor(target, '/blog/2026-03-30'), selector: `article a[hreflang="${target}"]`, target })),
      { edge: 'login exact return', source: '/blog?filter=two%20words#results', href: pathFor(locale, '/login') + '?next=' + encodeURIComponent(blog + '?filter=two%20words#results'), selector: '[data-naeil-account-state="signed-out"]:visible' },
    ];
    for (const edge of edges) await check('rendered Site navigation modes', { locale, edge: edge.edge }, async () => {
      const context = await localContext();
      try {
        const page = await context.newPage();
        const results = [];
        for (const mode of ['modified-new-tab', 'copied-href', 'normal-click']) {
          await visit(page, locale, edge.source);
          if (edge.openProjects) await page.getByRole('button', { name: { en: 'Projects', ko: '프로젝트', ja: 'プロジェクト' }[locale], exact: true }).click();
          const anchor = page.locator(edge.selector).first();
          await expect(anchor).toBeVisible();
          const href = await anchor.getAttribute('href');
          assert.equal(href, edge.href);
          assert.doesNotMatch(href, /^\/en(?:\/|$)|[?&]lang=/);
          const absolute = new URL(href, page.url()).href;
          let destination;
          if (mode === 'modified-new-tab') {
            const popup = context.waitForEvent('page');
            await anchor.click({ modifiers: ['ControlOrMeta'] });
            destination = await popup;
          } else if (mode === 'copied-href') { destination = await context.newPage(); await destination.goto(absolute); }
          else { destination = page; await anchor.click(); }
          await expect(destination).toHaveURL(absolute);
          const language = edge.target || locale;
          await expect(destination.locator('html')).toHaveAttribute('lang', language);
          const route = new URL(absolute).pathname.replace(/^\/(ko|ja)(?=\/|$)/, '') || '/';
          const slug = route.startsWith('/blog/') ? route.slice('/blog/'.length) : null;
          const title = titles[language][route]
            || (slug === 'acceptance-neighbor' ? `Acceptance neighbor ${language} — .naeil` : undefined)
            || (slug === 'acceptance-only-' + language ? fixtureTitle(language) + ' — .naeil' : undefined)
            || (fixture.originalPosts.find(post => post.locale === language && post.slug === slug)?.title + ' — .naeil');
          await expect(destination).toHaveTitle(title);
          const cookies = await preference(context);
          assert.deepEqual(cookies.map(cookie => cookie.value), mode === 'normal-click' && edge.target && senderEnabled ? [edge.target] : [], 'Only an explicit controller language click records preference');
          results.push({ mode, href, landed: destination.url(), title: await destination.title(), preference: cookies });
          if (destination !== page) await destination.close();
        }
        return results;
      } finally { await context.close(); }
    });
  }

  for (const locale of locales) await check('actual invitation sender links and navigation modes', { locale }, async () => {
    const context = await localContext();
    const calls = [];
    const landings = [];
    try {
      // A receiver landing stub observes the browser's exact destination; the
      // separate consumer suites verify the actual applications at these hrefs.
      await context.route(/https:\/\/(?:jev|abestimate)\.naeil\.dev\//, async route => {
        if (!route.request().isNavigationRequest()) return route.abort();
        landings.push(route.request().url());
        const path = new URL(route.request().url()).pathname;
        const language = path.startsWith('/ko') ? 'ko' : path.startsWith('/ja') ? 'ja' : 'en';
        await route.fulfill({ status: 200, contentType: 'text/html', body: `<html lang="${language}"><title>Local receiver landing fixture</title><body>Local receiver landing fixture</body></html>` });
      });
      await context.route(origin + '/auth/invite?**', async route => {
        if (route.request().method() !== 'POST') return route.fallback();
        const payload = route.request().postDataJSON();
        assert.ok(['stage', 'confirm'].includes(payload.action));
        calls.push({ action: payload.action, locale: new URL(route.request().url()).searchParams.get('locale'), fragment: new URL(route.request().url()).hash, csrfPresent: typeof payload.csrf === 'string' });
        assert.ok(typeof payload.csrf === 'string');
        const response = payload.action === 'stage' ? { status: 'staged', csrf: 'synthetic-stage-csrf' } : { status: 'complete', csrf: 'synthetic-complete-csrf', links: [{ href: 'https://jev.naeil.dev/', label: 'JEV' }, { href: 'https://abestimate.naeil.dev/', label: 'AB Estimate' }, { href: 'https://untrusted.invalid/', label: 'Excluded' }] };
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response) });
      });
      const page = await context.newPage();
      const envelope = new URLSearchParams({ id: '10000000-0000-4000-8000-000000000001', version: '1', nonce: 'n'.repeat(48), token_hash: 'a'.repeat(64) });
      const open = async () => {
        await page.goto(origin + '/auth/invite?locale=' + locale + '#' + envelope);
        await expect(page).toHaveTitle(inviteTitles[locale]);
        await expect(page.locator('html')).toHaveAttribute('lang', locale);
        await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/icon.svg');
        await expect(page.locator('#confirm')).toBeVisible();
        assert.equal(new URL(page.url()).hash, '');
        await page.locator('#confirm').click();
        await expect(page.locator('#links a')).toHaveCount(2);
      };
      const results = [];
      for (const service of ['jev', 'abestimate']) for (const mode of ['modified-new-tab', 'copied-href', 'normal-click']) {
        await open();
        const anchor = page.locator(`#links a[href^="https://${service}.naeil.dev/"]`);
        const href = await anchor.getAttribute('href');
        const expected = 'https://' + service + '.naeil.dev' + (senderEnabled ? pathFor(locale) : '/');
        assert.equal(href, expected);
        let destination;
        if (mode === 'modified-new-tab') {
          const popup = context.waitForEvent('page');
          await anchor.click({ modifiers: ['ControlOrMeta'] });
          destination = await popup;
        } else if (mode === 'copied-href') { destination = await context.newPage(); await destination.goto(href); }
        else { destination = page; await anchor.click(); }
        await expect(destination).toHaveURL(expected);
        await expect(destination.locator('html')).toHaveAttribute('lang', senderEnabled ? locale : 'en');
        results.push({ service, mode, href, landed: destination.url() });
        if (destination !== page) await destination.close();
      }
      assert.equal(calls.filter(call => call.action === 'stage').length, 6);
      assert.equal(calls.filter(call => call.action === 'confirm').length, 6);
      assert.ok(calls.every(call => call.fragment === ''));
      return { results, transportCalls: calls, interceptedLandings: landings };
    } finally { await context.close(); }
  });

  report.finishedAt = new Date().toISOString();
  report.counts = { passed: cases.filter(result => result.status === 'passed').length, failed: cases.filter(result => result.status === 'failed').length };
  report.fixture.contentReadsObserved = existsSync(fixture.accessLog) ? readFileSync(fixture.accessLog, 'utf8').trim().split('\n').length : 0;
  persist();
  assert.equal(report.counts.failed, 0, `${report.counts.failed} language acceptance cases failed; see ${reportPath}`);
  return { evidence: reportPath, ...report.counts };
}

// Direct invocation runs the same immutable build twice with runtime sender
// flags. It starts the established synthetic Auth harness, never a new build.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const base = resolve(process.env.NAEIL_ACCOUNT_EVIDENCE || 'test-results/site-language-acceptance');
  const modes = process.env.NAEIL_LANGUAGE_MODES ? process.env.NAEIL_LANGUAGE_MODES.split(',') : ['off', 'on'];
  assert.ok(modes.length && modes.every(mode => ['off', 'on'].includes(mode)));
  let failed = false;
  for (const mode of modes) {
    const status = await new Promise((yes, no) => {
      const child = spawn(process.execPath, ['scripts/site-account-language.mjs'], { cwd: root, stdio: 'inherit', env: { ...process.env, NAEIL_LANGUAGE_ACCEPTANCE: '1', NAEIL_LANGUAGE_ACCEPTANCE_ONLY: '1', NAEIL_LANGUAGE_FOCUS_ONLY: '1', NAEIL_LOCALE_SEND_ENABLED: mode === 'on' ? '1' : '0', NAEIL_ACCOUNT_EVIDENCE: join(base, 'sender-' + mode) } });
      child.once('error', no); child.once('exit', yes);
    });
    failed ||= status !== 0;
  }
  if (failed) process.exitCode = 1;
}
