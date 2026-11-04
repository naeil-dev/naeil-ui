import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';
import { captureAccountRender } from '../account-render.mjs';
import { hash, privateDirectory, REVISION, VERSION } from './rollout-io.mjs';
import { runtimeIndex } from './package-runtime.mjs';

/** Capture the existing synthetic Japanese AccountStates Storybook story. No
 * production session, account data or logout action is used. */
export async function captureAccountReference({ origin, archivePath, sourceRevision, version, outputPath }) {
  const url = new URL(origin);
  assert(['http:', 'https:'].includes(url.protocol) && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) && url.pathname === '/' && !url.search && !url.hash && !url.username && !url.password, 'Loopback Storybook origin required');
  assert(REVISION.test(sourceRevision) && VERSION.test(version), 'Exact source/version required');
  const archive = readFileSync(archivePath), index = runtimeIndex(archive);
  assert.equal(index.package.version, version, 'Account archive version mismatch');
  const response = await fetch(new URL('/naeil-release.json', origin), { signal: AbortSignal.timeout(10000), redirect: 'error' });
  assert(response.ok, 'Reference build identity required');
  const build = await response.json();
  assert.equal(build.schemaVersion, 1); assert.equal(build.frozen, true, 'Clean frozen reference build required');
  assert.equal(build.sourceRevision, sourceRevision, 'Account build source mismatch');
  assert.deepEqual(build.ui, { version, contractVersion: '1' }, 'Account build UI mismatch');
  const output = resolve(outputPath); privateDirectory(dirname(output));
  const browser = await chromium.launch(), cases = [];
  try {
    for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme });
      const page = await context.newPage(); page.setDefaultTimeout(10000);
      try {
        await page.goto(`${url.origin}/iframe.html?id=brand-naeilheader--account-states&viewMode=story&globals=theme:${theme};a11y.manual:!true`);
        await page.waitForFunction(theme => document.documentElement.lang === 'ja' && document.documentElement.classList.contains(theme), theme);
        await page.evaluate(() => document.fonts.ready);
        const mobile = page.locator('[data-naeil-header]').getByRole('button', { name: 'メニュー', exact: true });
        if (await mobile.isVisible()) await mobile.click();
        await page.locator('[data-naeil-account-trigger]:visible').click();
        await page.evaluate(async () => { await document.fonts.load('400 16px "Noto Sans JP"', '日本語 Latin'); await document.fonts.ready; });
        const render = await captureAccountRender(page);
        assert.equal(render.uiVersion, version, 'Account rendered version mismatch'); assert.equal(render.overflow, false, 'Account reference overflow');
        assert.equal(render.fontFamily, 'Noto Sans JP', 'Account reference locale font mismatch');
        assert(await page.evaluate(() => document.fonts.check('400 16px "Noto Sans JP"', '日本語 Latin') && [...document.fonts].some(face => face.family.replaceAll('"', '') === 'Noto Sans JP' && face.status === 'loaded')), 'Account reference font not loaded');
        cases.push({ width, theme, locale: 'ja', render });
      } finally { await context.close(); }
    }
    const reference = { schemaVersion: 1, kind: 'independent-account-render', frozen: true, sourceRevision, archiveSha256: hash(archive), ui: build.ui, capturedAt: new Date().toISOString(), cases };
    writeFileSync(output, `${JSON.stringify(reference, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
    return { sha256: hash(readFileSync(output)), cases: cases.length };
  } finally { await browser.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    assert.equal(process.argv.length, 3, 'Usage: capture-account-reference.mjs INPUT.json');
    console.log(JSON.stringify(await captureAccountReference(JSON.parse(readFileSync(process.argv[2])))));
  } catch { console.error('Account reference capture failed; inspect frozen local Storybook inputs'); process.exitCode = 1; }
}
