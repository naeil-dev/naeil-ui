// Dated acceptance runner. Expected identities are operator-supplied, never
// learned from the production endpoint that this runner is checking.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { chromium } from '@playwright/test';
import { assertRouteDestination, assertRouteState, readChrome, assertGeometry, assertLinks, checkMenu } from '../../../../scripts/verify-ui-production.mjs';
import { assertReference, verifyIdentity } from '../../../../scripts/rollout/rollout.mjs';

const [inputPath, outputPath] = process.argv.slice(2);
assert(inputPath && outputPath, 'Usage: node verify-public.mjs INPUT.json OUTPUT_DIRECTORY');
const input = JSON.parse(readFileSync(inputPath));
const root = resolve(import.meta.dirname, '../../../..');
const release = JSON.parse(readFileSync(join(root, 'docs/rollout/release.json')));
const referenceBytes = readFileSync(join(root, 'docs/rollout', release.contract.path));
const reference = assertReference(release, referenceBytes);
const registry = JSON.parse(readFileSync(join(root, 'docs/rollout/services.json')));
assert(Array.isArray(input.services) && input.services.length > 0);
const output = resolve(outputPath); mkdirSync(output, { recursive: true });
const labels = { en: { menu: 'Menu', login: 'Log in' }, ko: { menu: '메뉴', login: '로그인' }, ja: { menu: 'メニュー', login: 'ログイン' } };
const browser = await chromium.launch();
const results = [];
try {
  for (const expected of input.services) {
    const service = registry.services.find(s => s.id === expected.serviceId);
    assert(service && ['naeil', 'estimate', 'jev'].includes(service.id));
    assert.equal(expected.identity.ui.version, '0.7.1');
    assert.match(expected.identity.sourceRevision, /^[a-f0-9]{40}$/);
    await verifyIdentity(service.origin, expected.identity);
    const cases = [];
    const routes = service.routes.filter(r => r.path.includes('login') && r.policy === 'canonical');
    assert(routes.length > 0);
    for (const route of routes) for (const width of reference.contract.viewports) for (const theme of reference.contract.themes) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme });
      try {
        await context.addInitScript(theme => { localStorage.setItem('theme', theme); localStorage.setItem('naeil-theme', theme); }, theme);
        const page = await context.newPage();
        assert((await page.goto(new URL(route.path, service.origin).href))?.ok());
        assertRouteDestination(page.url(), route, service.origin);
        await assertRouteState(page, route);
        await page.waitForFunction(theme => document.documentElement.classList.contains(theme), theme);
        const chrome = await readChrome(page, route.locale);
        assert.equal(chrome.version, '0.7.1'); assert.equal(chrome.footerVersion, '0.7.1');
        assert.equal(chrome.contractVersion, '1'); assert.equal(chrome.footerContract, '1');
        const baseline = reference.cases.find(c => c.locale === route.locale && c.width === width && c.theme === theme && c.variant === chrome.footerVariant);
        assert(baseline, 'Matching independent frame reference required');
        assertGeometry(chrome, reference.contract, baseline.render);
        assertLinks(chrome, route.locale, service.origin, reference.contract);
        await checkMenu(page, route.locale, theme, route.chrome);
        const menu = page.getByRole('button', { name: labels[route.locale].menu, exact: true });
        const mobile = await menu.isVisible();
        if (mobile) await menu.click();
        const account = page.locator('[data-naeil-account-state="signed-out"]:visible');
        assert.equal(await account.count(), 1, 'One visible shared login control required');
        assert.equal(await page.locator('[data-naeil-account-trigger]:visible').count(), 0);
        assert.equal((await account.textContent())?.trim(), labels[route.locale].login);
        const login = await account.evaluate(el => {
          const s = getComputedStyle(el), r = el.getBoundingClientRect();
          return { href: el.getAttribute('href'), height: r.height, width: r.width, fontSize: s.fontSize, fontWeight: s.fontWeight, lineHeight: s.lineHeight, color: s.color, background: s.backgroundColor, padding: s.padding, borderRadius: s.borderRadius };
        });
        assert.equal(login.height, 44); assert.equal(login.fontSize, '16px'); assert.equal(login.fontWeight, '500');
        const destination = new URL(login.href, service.origin);
        assert.equal(destination.origin, service.origin);
        assert(destination.pathname.endsWith('/login'));
        if (service.id === 'naeil') assert.equal(destination.searchParams.get('next'), '/login');
        if (service.id === 'jev') assert.equal(destination.searchParams.get('lang'), route.locale);
        await account.focus(); assert(await account.evaluate(el => el === document.activeElement));
        const filename = `${service.id}-${route.locale}-${width}-${theme}`;
        if (width === 390 || width === 1440) {
          await (mobile ? page.locator('[data-slot="navigation-sheet"]') : page.locator('[data-naeil-header]')).screenshot({ path: join(output, `${filename}-account.png`), animations: 'disabled' });
        }
        if (mobile) await page.keyboard.press('Escape');
        assertRouteDestination(page.url(), route, service.origin);
        cases.push({ path: route.path, locale: route.locale, width, theme, chrome, login, passed: true });
      } finally { await context.close(); }
    }
    await verifyIdentity(service.origin, expected.identity);
    const receipt = { serviceId: service.id, origin: service.origin, checkedAt: new Date().toISOString(), identity: expected.identity, referenceSha256: createHash('sha256').update(referenceBytes).digest('hex'), cases, passed: true, scope: 'Anonymous production login and shared frame only; authenticated acceptance uses isolated actual-consumer tests.' };
    writeFileSync(join(output, `${service.id}-public.json`), JSON.stringify(receipt, null, 2));
    results.push(receipt);
    console.log(`${service.id}: ${cases.length} public frame/account conditions passed`);
  }
  // Equivalent Japanese anonymous states must agree across the selected apps.
  for (const width of reference.contract.viewports) for (const theme of reference.contract.themes) {
    const matched = results.map(r => r.cases.find(c => c.locale === 'ja' && c.width === width && c.theme === theme)).filter(Boolean);
    const comparable = c => { const { href, ...presentation } = c.login; return presentation; };
    for (const actual of matched.slice(1)) assert.deepEqual(comparable(actual), comparable(matched[0]));
  }
  writeFileSync(join(output, 'public-summary.json'), JSON.stringify({ checkedAt: new Date().toISOString(), passed: true, services: results.map(r => ({ serviceId: r.serviceId, identity: r.identity, cases: r.cases.length })), matchedJapaneseLoginPresentation: results.length > 1, authenticatedProductionAccess: false }, null, 2));
} finally { await browser.close(); }
