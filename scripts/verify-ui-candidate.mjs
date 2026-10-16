/** Local integration evidence only. Never invoked by the production coordinator. */
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { routeKey } from './rollout/route-contract.mjs';
import { assertReference } from './rollout/rollout.mjs';
import { assertGeometry, assertLinks, assertRouteDestination, assertRouteState, checkMenu, readChrome } from './verify-ui-production.mjs';

export async function verifyLocalCandidate({ release, origin, identity, identityPath = '/.well-known/naeil-ui.json', routes, referencePath, outputDir, configureContext, preparePage }) {
  const url = new URL(origin);
  assert(['127.0.0.1', '[::1]', 'localhost'].includes(url.hostname) && url.protocol === 'http:', 'Synthetic candidate verification is restricted to loopback HTTP');
  assert.match(identity.sourceRevision, /^[a-f0-9]{40}$/, 'Candidate requires clean committed source');
  assert.equal(identity.ui.version, release.version);
  assert.equal(identity.ui.contractVersion, release.contract.version);
  const reference = assertReference(release, readFileSync(referencePath));
  const verifyIdentity = async () => {
    const response = await fetch(new URL(identityPath, origin), { redirect: 'manual', signal: AbortSignal.timeout(15000) });
    assert.equal(response.status, 200, 'Local artifact identity unavailable');
    assert.deepEqual(await response.json(), identity, 'Local artifact identity changed');
  };
  await verifyIdentity();
  const output = resolve(outputDir); mkdirSync(output, { recursive: true });
  const browser = await chromium.launch(); const results = [];
  try {
    for (const route of routes) {
      assert(['canonical', 'shared'].includes(route.policy), 'Explicit canonical route policy required');
      const cases = [];
      for (const width of reference.contract.viewports) for (const theme of reference.contract.themes) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme });
        try {
          await context.addInitScript(value => { localStorage.setItem('theme', value); localStorage.setItem('naeil-theme', value); }, theme);
          if (configureContext) await configureContext(context, route);
          const page = await context.newPage(); page.setDefaultTimeout(10000);
          const response = await page.goto(new URL(route.path, origin).href);
          assert(response?.ok(), 'Local route HTTP failure');
          if (preparePage) await preparePage(page, route);
          assertRouteDestination(page.url(), route, origin);
          if (route.renderState) await assertRouteState(page, route);
          await page.waitForFunction(value => document.documentElement.classList.contains(value), theme);
          const actual = await readChrome(page, route.locale);
          assert.equal(actual.version, release.version); assert.equal(actual.footerVersion, release.version);
          assert.equal(actual.contractVersion, release.contract.version); assert.equal(actual.footerContract, release.contract.version);
          const baseline = reference.cases.find(item => item.width === width && item.theme === theme && item.locale === route.locale && item.variant === actual.footerVariant);
          assert(baseline, 'Independent matching render missing');
          assertGeometry(actual, reference.contract, baseline.render);
          assertLinks(actual, route.locale, origin, reference.contract);
          await checkMenu(page, route.locale, theme, route.chrome);
          const name = `${results.length}-${width}-${theme}`;
          await page.locator('[data-naeil-header]').screenshot({ path: join(output, `${name}-header.png`) });
          await page.locator('[data-naeil-footer]').screenshot({ path: join(output, `${name}-footer.png`) });
          // Negative control: a self-consistent consumer override must still fail.
          let negativeOverrideRejected = null;
          if (width === 1920 && theme === 'light') {
            await page.addStyleTag({ content: ':root { --ui-width-frame: 1280px !important; --ui-frame-gutter: 24px !important; }' });
            const wrong = await readChrome(page, route.locale);
            assert.throws(() => assertGeometry(wrong, reference.contract, baseline.render), /frame width|gutter/, 'Wrong consumer override escaped the independent contract');
            negativeOverrideRejected = true;
          }
          assertRouteDestination(page.url(), route, origin);
          if (route.renderState) await assertRouteState(page, route);
          cases.push({ width, theme, locale: route.locale, render: actual, negativeOverrideRejected, passed: true });
        } finally { await context.close(); }
      }
      results.push({ path: route.path, routeKey: routeKey(route), locale: route.locale || null, renderState: route.renderState || null, state: route.state || null, status: 'local-candidate-verified', cases });
    }
    await verifyIdentity();
    const result = { schemaVersion: 1, scope: 'local-synthetic-candidate', productionVerified: false, referenceSha256: release.contract.sha256, identity, checkedAt: new Date().toISOString(), routes: results, passed: true };
    writeFileSync(join(output, 'render-verification.json'), JSON.stringify(result, null, 2));
    return result;
  } finally { await browser.close(); }
}
