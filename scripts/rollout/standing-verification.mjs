import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdir, realpath } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadReleaseExpectations, selectExpectationProfile, assertExpectationChrome } from './release-expectations.mjs';
import { verifyProduction } from '../verify-ui-production.mjs';
import { captureAccountRender } from '../account-render.mjs';
import { assertGenerationVerification, assertGenerationFence, fingerprint, readExactReference } from './standing-config.mjs';
import { routeKey, assertRouteConfig } from './route-contract.mjs';
import { requestSiteTarget, assertSiteArtifact } from './site-continuation.mjs';
import { readPrivateJson, writePrivateJson, assertPrivateDirectory, renewVerificationSession, sessionCookies } from './verification-session.mjs';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const origins = { naeil: 'https://naeil.dev', estimate: 'https://abestimate.naeil.dev', jev: 'https://jev.naeil.dev' };
const menuLabels = { en: 'Menu', ja: 'メニュー', ko: '메뉴' };

export function validateVerificationRequest(input, config) {
  const active=assertGenerationVerification(input);
  if(active){const args=input.service.verification.command.args,index=args.indexOf('--config');assert(index>=0&&args.lastIndexOf('--config')===index,'Exact referenced verifier configuration required');const ref=active.config.configReferences.find(ref=>ref.path===args[index+1]);assert(ref,'Verifier config absent from active manifest');assert.equal(fingerprint(config),fingerprint(JSON.parse(readExactReference(ref))),'Running verifier configuration changed');}
  assert(input.kind === undefined, 'Standalone input cannot use operational verification');
  return validateVerificationData(input, config);
}

function validateVerificationData(input, config, standalone = false) {
  assert.equal(input.schemaVersion, 1);
  assert.equal(config.schemaVersion, 1);
  if (standalone) assert(input.kind === 'standing-site-read-only' && input.mode === undefined && input.phase === 'site-read-only', 'Explicit standalone verification scope required');
  else {
    assert(['standing', 'adopt'].includes(input.mode), 'Explicit standing/adopt mode required');
    assert(['adopt', 'production', 'rollback'].includes(input.phase), 'Explicit verification phase required');
  }
  const expectations=loadReleaseExpectations(input.release);
  const service = config.services?.[input.service?.id];
  assert(service && origins[service.id], 'Locally registered service required');
  assert.equal(service.origin, origins[service.id], 'Canonical production origin required');
  assert.equal(input.service.origin, service.origin, 'Service origin drift');
  if (input.origin) assert.equal(input.origin, service.origin, 'Request origin drift');
  assert.equal(input.service.appId, service.appId, 'Service app identity drift');
  assert(Array.isArray(input.service.routes) && input.service.routes.length > 0, 'Concrete routes required');
  for (const route of input.service.routes) {
    assertRouteConfig(route);
    assertExpectationChrome(route.chrome);
    selectExpectationProfile(expectations,route.chrome?.projectProfile);
    assert(!/[\[\]*]/.test(route.path), 'Concrete production specimen required');
    assert.equal(new URL(route.path, service.origin).origin, service.origin, 'Route escaped service origin');
  }
  assert.deepEqual(input.service.routes.map(routeKey), service.routes.map(routeKey), 'Reviewed route scope changed');
  assert.match(input.artifact?.sourceRevision || '', /^[a-f0-9]{40}$/, 'Exact app source required');
  assert.match(input.artifact?.id || '', /^[a-zA-Z0-9._-]{1,100}$/, 'Exact artifact required');
  assert.equal(input.artifact.ui.version, input.release.version, 'Artifact UI version mismatch');
  assert.equal(input.artifact.ui.contractVersion, input.release.contract.version, 'Artifact contract mismatch');
  for (const key of ['idempotencyKey', 'attemptId']) assert(typeof input[key] === 'string' && input[key] && input[key].length <= 200, 'Attempt binding required');
  const identity = { schemaVersion: 1, appId: service.appId, artifactId: input.artifact.id, sourceRevision: input.artifact.sourceRevision, ui: input.artifact.ui };
  if (input.expectedIdentity) assert.deepEqual(input.expectedIdentity, identity, 'Expected identity differs from artifact');
  if (input.service.id === 'naeil') assertSiteArtifact(input, input.artifact);
  return identity;
}

export function assertAccountReference(actual, expected, locale) {
  assert.equal(actual.uiVersion, expected.uiVersion, 'Account version differs from frozen reference');
  assert.equal(actual.overflow, false, 'Account page overflow');
  const fonts = locale === 'ja' ? [expected.fontFamily] : ['Pretendard', 'Pretendard Variable'];
  assert(fonts.includes(actual.fontFamily), 'Account font differs from approved locale family');
  for (const field of ['trigger', 'avatar', 'icon', 'menu', 'action']) assert.deepEqual(actual[field], expected[field], `Account ${field} differs from frozen reference`);
}

async function checkAccount(page, route, locale, width, theme, reference, beforeAction) {
  const header = page.locator('[data-naeil-header]');
  const menu = header.getByRole('button', { name: menuLabels[locale], exact: true });
  const mobile = await menu.isVisible();
  if (mobile) { beforeAction(); await menu.click(); }
  const signedIn = route.renderState.access === 'protected';
  if (signedIn) {
    const trigger = page.locator('[data-naeil-account-trigger]:visible');
    await trigger.waitFor({ state: 'visible' });
    assert.equal(await page.locator('[data-naeil-account-state="signed-out"]:visible').count(), 0, 'Authenticated chrome rendered login');
    beforeAction(); await trigger.click();
    const actual = await captureAccountRender(page,{beforeAction});
    // Frozen 0.7.1 account geometry is viewport-independent and was captured
    // at desktop/mobile in Japanese. Fonts are checked per supported locale.
    const sample = reference.cases.find(value => value.theme === theme && value.width === (width < 768 ? 390 : 1440));
    assert(sample, 'Independent account reference case missing');
    assertAccountReference(actual, sample.render, locale);
    beforeAction(); await page.keyboard.press('Escape');
    await page.locator('[data-naeil-account-menu]:visible').waitFor({ state: 'hidden' });
  } else {
    await page.locator('[data-naeil-account-state="signed-out"]:visible').waitFor({ state: 'visible' });
    assert.equal(await page.locator('[data-naeil-account-trigger]:visible').count(), 0, 'Anonymous chrome unexpectedly authenticated');
  }
  if (mobile) {
    beforeAction(); await page.keyboard.press('Escape');
    await page.getByRole('dialog', { name: menuLabels[locale], exact: true }).waitFor({ state: 'hidden' });
  }
}

async function anonymousBoundaries(service, beforeAction, fetchImpl) {
  const result = [];
  for (const probe of service.anonymousBoundaries || []) {
    const url = new URL(probe.path, service.origin);
    assert.equal(url.origin, service.origin, 'Boundary origin escape');
    beforeAction(); const response = await fetchImpl(url, { redirect: 'manual', signal: AbortSignal.timeout(15_000), cache: 'no-store' });
    assert.equal(response.status, probe.status, 'Anonymous boundary status changed');
    if (probe.centralLogin) {
      const location = new URL(response.headers.get('location'), service.origin);
      assert.equal(location.origin, 'https://naeil.dev', 'Central login origin changed');
      assert(/^\/(?:en\/|ja\/|ko\/)?login$/.test(location.pathname), 'Central login destination changed');
      assert.equal(new URL(location.searchParams.get('next')).origin, service.origin, 'Return service changed');
    }
    result.push({ path: probe.path, status: response.status, passed: true });
  }
  return result;
}

export async function verifyStanding(input, config, dependencies = {}) {
  const identity = validateVerificationRequest(input, config);
  return verifyData(input, config, identity, { beforeWrite: () => assertGenerationFence(input), beforeAction: () => assertGenerationVerification(input) }, dependencies);
}

/** The standalone caller supplies its exact non-operational approval guards.
 * No policy or generation exemption is passed through the operational entry. */
export async function verifySiteReadOnly(input, config, hooks, dependencies = {}) {
  assert(typeof hooks?.beforeAction === 'function' && typeof hooks?.beforeWrite === 'function', 'Standalone approval guards required');
  assert(input.service?.id === 'naeil' && input.policy === undefined && input.generationFence === undefined && input.generationSha256 === undefined, 'Standalone verifier supports only naeil without operational authority');
  hooks.beforeAction();
  const identity = validateVerificationData(input, config, true);
  return verifyData(input, config, identity, hooks, dependencies);
}

async function verifyData(input, config, identity, { beforeAction, beforeWrite }, { productionVerifier = verifyProduction, sessionRenewer = renewVerificationSession, boundaryFetch = fetch } = {}) {
  const service = config.services[input.service.id];
  await assertPrivateDirectory(config.evidenceRoot);
  assert(isAbsolute(input.outputDirectory), 'Absolute private output directory required');
  const inside = relative(config.evidenceRoot, resolve(input.outputDirectory));
  assert(inside && inside !== '..' && !inside.startsWith(`..${sep}`) && !isAbsolute(inside), 'Output escaped evidence root');
  beforeWrite(); await mkdir(input.outputDirectory, { recursive: true, mode: 0o700 });
  assert.equal(await realpath(input.outputDirectory), input.outputDirectory, 'Output symlink escape');
  await assertPrivateDirectory(input.outputDirectory);
  const account = input.release.account;
  assert(account && isAbsolute(account.path), 'Frozen account reference required');
  const accountBytes = readFileSync(account.path);
  assert.equal(digest(accountBytes), account.sha256, 'Account reference digest mismatch');
  const reference = JSON.parse(accountBytes);
  assert.equal(reference.kind, 'independent-account-render');
  assert.equal(reference.sourceRevision, input.release.sourceRevision);
  assert.equal(reference.archiveSha256, input.release.archive.sha256);
  assert.deepEqual(reference.ui, identity.ui);
  const boundaries = await anonymousBoundaries(service,beforeAction,boundaryFetch);
  const needsSession = service.routes.some(route => route.renderState.access === 'protected');
  const verificationTimeoutMs = input.service.verification?.command?.timeoutMs ?? 20 * 60_000;
  assert(Number.isSafeInteger(verificationTimeoutMs) && verificationTimeoutMs > 0 && verificationTimeoutMs <= 3 * 60 * 60_000, 'Bounded verification timeout required');
  // Finish before Supabase SSR/browser auto-refresh can rotate an unpersisted
  // cookie. The subprocess deadline is the upper bound for the entire check.
  const cookies = needsSession ? sessionCookies(await sessionRenewer(config.session, { minimumValidityMs: verificationTimeoutMs + 5 * 60_000, beforeAction, beforeWrite }), config.session.supabaseUrl) : null;
  const production = await productionVerifier({
    release: input.release, origin: service.origin, identity, routes: service.routes,
    referencePath: input.referencePath, outputDir: input.outputDirectory,
    screenshots: false, beforeAction, beforeWrite,
    contextFactory: async ({ browser, origin, contextOptions }) => {
      assert.equal(origin, service.origin, 'Session scope changed');
      beforeAction(); const context = await browser.newContext(contextOptions);
      // No storageState, private source pages, browser traces or business text
      // are persisted. A safe navigation remains subject to real service auth.
      beforeAction(); await context.addCookies(cookies);
      return context;
    },
    checkAccount: ({ page, route, locale, width, theme }) => checkAccount(page, route, locale, width, theme, reference, beforeAction),
  });
  return { ...production, schemaVersion: 1, releaseId: input.release.releaseId, serviceId: service.id,
    idempotencyKey: input.idempotencyKey, attemptId: input.attemptId, phase: input.phase,
    archiveSha256: input.release.archive.sha256, accountReferenceSha256: account.sha256, anonymousBoundaries: boundaries, ...(input.siteTarget ? { siteTargetSha256: fingerprint(requestSiteTarget(input)) } : {}) };
}

async function main() {
  process.umask(0o077);
  const index = process.argv.indexOf('--config');
  assert(index >= 0 && process.argv[index + 1], 'Private verifier config required');
  const config = await readPrivateJson(process.argv[index + 1]);
  const input = await readPrivateJson(process.env.NAEIL_VERIFY_INPUT || process.env.NAEIL_ROLLOUT_INPUT);
  const result = await verifyStanding(input, config);
  assertGenerationFence(input); await writePrivateJson(process.env.NAEIL_VERIFY_OUTPUT || process.env.NAEIL_ROLLOUT_OUTPUT, result, {beforeWrite:()=>assertGenerationFence(input)});
  console.log(JSON.stringify({ serviceId: result.serviceId, passed: true, routes: result.routes.length }));
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(() => {
  // Never print a provider body, cookie, request configuration or browser DOM.
  console.error('Standing verification failed; inspect private state and exact verification gates.');
  process.exitCode = 1;
});
