import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { chromium, expect } from '@playwright/test';

// Run with: node --test scripts/site-auth-slot.test.mjs (Chromium installed).
const require = createRequire(import.meta.url);
const { build } = require(require.resolve('esbuild', { paths: [require.resolve('tsup')] }));
// Keep the real website adapter, locale/session providers, shared header,
// responsive Navigation and Radix menus. Fake framework routing, session
// requests and toast delivery at the browser fixture boundary.
const mocks = {
  'next/navigation': `export { unstable_rethrow } from 'next/dist/client/components/unstable-rethrow.browser';
    export const usePathname = () => '/ja';
    export const useRouter = () => ({replace() {}});`,
  'next/link': `import {createElement} from 'react';
    export default function Link(props) { return createElement('a', props); }`,
  '@/app/[locale]/login/actions': `export async function clearLocalSession() {}
    export function logout(locale) {
    window.siteFixture.requests.push(locale);
    return new Promise((resolve, reject) => { window.siteFixture.finish = error => error ? reject(error) : resolve(); });
  }`,
  sonner: `export const toast = {error: message => window.siteFixture.errors.push(message), dismiss() {}};`,
};
const output = await build({
  stdin: { contents: `import {createElement} from 'react';
    import {createRoot} from 'react-dom/client';
    import {NavWrapper} from './src/components/nav-wrapper';
    import {SiteSessionStateProvider} from './src/components/site-session-state';
    import {NaeilLocaleController, NaeilLocaleProvider} from './src/naeil-locale/client';
    import common from './src/naeil-locale/messages/ja.json';
    import app from './messages/ja.json';
    window.siteFixture = {requests: [], errors: []};
    createRoot(document.getElementById('root')).render(
      createElement(NaeilLocaleController, {service: 'main'},
        createElement(SiteSessionStateProvider, null,
          createElement(NaeilLocaleProvider, {locale: 'ja', messages: {...common, ...app}, timeZone: 'UTC'},
            createElement(NavWrapper, {user: {id: 'synthetic-user'}})))));`,
    resolveDir: process.cwd(), loader: 'tsx' },
  bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [{ name: 'website-boundaries', setup(builder) {
    builder.onResolve({ filter: /^(next\/(?:navigation|link)$|sonner$|@\/app\/)/ }, args =>
      Object.hasOwn(mocks, args.path) ? { path: args.path, namespace: 'website-test' } : undefined);
    builder.onLoad({ filter: /.*/, namespace: 'website-test' }, args => ({ contents: mocks[args.path], resolveDir: process.cwd(), loader: 'js' }));
  } }],
});
const css = ['theme.css', 'components.css'].map(name => readFileSync(new URL(`../src/styles/${name}`, import.meta.url), 'utf8')).join('\n');

async function fixture(width) {
  const browser = await chromium.launch();
  const pageErrors = [];
  try {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    page.on('pageerror', error => pageErrors.push(error.message));
    page.setDefaultTimeout(5000);
    await page.route('**/*', route => route.abort()); // No production assets or endpoints.
    await page.setContent('<html class="light" lang="ja"><body><div id="root"></div></body></html>');
    await page.addStyleTag({ content: css });
    await page.addScriptTag({ content: output.outputFiles[0].text });
    await expect(page.locator('[data-naeil-header]')).toBeVisible();
    return { browser, page, pageErrors };
  } catch (error) {
    await browser.close();
    if (pageErrors.length) throw new Error(pageErrors.join('\n'), { cause: error });
    throw error;
  }
}
const account = page => page.locator('[data-naeil-account-trigger]:visible');
const mobileMenu = page => page.getByRole('button', { name: 'メニュー', exact: true });
async function startLogout(page) {
  await account(page).click();
  await page.getByRole('menuitem', { name: 'ログアウト', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.siteFixture.requests.length)).toBe(1);
  await expect(account(page)).toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('[data-naeil-account-menu]')).toHaveCount(0);
}
async function stillPending(page) {
  await expect(account(page)).toHaveAttribute('aria-busy', 'true');
  await account(page).click();
  const item = page.getByRole('menuitem', { name: 'ログアウト中…', exact: true });
  await expect(item).toBeDisabled();
  await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => window.siteFixture.requests.length), 1);
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-naeil-account-menu]')).toHaveCount(0);
  await expect(account(page)).toBeFocused();
}

test('site pending logout survives closing/reopening the mobile sheet and switching to desktop', async () => {
  const { browser, page, pageErrors } = await fixture(390);
  try {
    await mobileMenu(page).click();
    await startLogout(page);
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-slot="navigation-sheet"]')).toHaveCount(0);
    await mobileMenu(page).click();
    await stillPending(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(page.getByRole('dialog', { name: 'メニュー', exact: true })).toBeHidden();
    await stillPending(page);
    await page.evaluate(() => window.siteFixture.finish(new Error('synthetic provider failure')));
    await expect(account(page)).not.toHaveAttribute('aria-busy', 'true');
    const japanese = JSON.parse(readFileSync(new URL('../messages/ja.json', import.meta.url), 'utf8'));
    assert.deepEqual(await page.evaluate(() => window.siteFixture.errors), [japanese.site.auth.logoutFailed]);
    await account(page).click();
    await page.getByRole('menuitem', { name: 'ログアウト', exact: true }).click();
    await expect.poll(() => page.evaluate(() => window.siteFixture.requests.length)).toBe(2);
    await page.evaluate(() => window.siteFixture.finish());
    await expect(account(page)).not.toHaveAttribute('aria-busy', 'true');
    assert.deepEqual(pageErrors, []);
  } finally { await browser.close(); }
});

test('site desktop logout remains pending when the mobile account slot mounts', async () => {
  const { browser, page, pageErrors } = await fixture(1440);
  try {
    await startLogout(page);
    await page.setViewportSize({ width: 390, height: 900 });
    await mobileMenu(page).click();
    await stillPending(page);
    await page.evaluate(() => window.siteFixture.finish());
    await expect(account(page)).not.toHaveAttribute('aria-busy', 'true');
    assert.deepEqual(await page.evaluate(() => window.siteFixture.errors), []);
    assert.deepEqual(pageErrors, []);
  } finally { await browser.close(); }
});
