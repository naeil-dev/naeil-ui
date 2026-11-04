import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hash, HEX, JSON_LIMITS, readPrivateBytes, REVISION, VERSION } from './rollout-io.mjs';

const locales = ['en', 'ko', 'ja'];
const text = value => typeof value === 'string' && value.trim() && value === value.trim();
function freeze(value) {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
}
function keys(value, allowed) {
  assert(value && typeof value === 'object' && !Array.isArray(value), 'Expectation object required');
  assert(Object.keys(value).every(key => allowed.includes(key)), 'Unsupported expectation field');
}
function review(value) {
  keys(value, ['approvedBy', 'approvalRef', 'sourceCitations', 'notes']);
  if (value.notes !== undefined) assert(text(value.notes), 'Review notes must be plain text');
  assert(text(value.approvedBy) && text(value.approvalRef) && Array.isArray(value.sourceCitations) &&
    value.sourceCitations.length > 0 && value.sourceCitations.every(text), 'Reviewed expectation metadata required');
}
function catalogs(value, canonical) {
  keys(value, locales);
  assert.deepEqual(Object.keys(value).sort(), [...locales].sort(), 'Complete expectation locales required');
  for (const locale of locales) {
    const items = value[locale];
    assert(Array.isArray(items) && items.length > 0 && items.length <= 100, 'Nonempty bounded project catalog required');
    const ids = new Set(), tuples = new Set();
    for (const item of items) {
      keys(item, ['id', 'href', 'name', 'accessibleName', 'image']);
      assert(Object.values(item).length === 5 && Object.values(item).every(text), 'Complete project content required');
      assert(/^[A-Za-z][A-Za-z0-9_-]*$/.test(item.id) && !ids.has(item.id), 'Duplicate or invalid project ID');
      ids.add(item.id);
      const url = new URL(item.href, 'https://naeil.dev');
      assert(!url.username && !url.password && url.protocol === 'https:' &&
        (item.href.startsWith('https://') || /^\/(?!\/)/.test(item.href)), 'Declared HTTPS or local project URL required');
      if (canonical) assert(item.href.startsWith(`https://naeil.dev/${locale}/`), 'Canonical localized project URL required');
      assert(/^https:\/\/naeil\.dev\/images\/[A-Za-z0-9_-]+\.png$/.test(item.image), 'Official declared project image required');
      const tuple = JSON.stringify([item.href, item.accessibleName, item.image]);
      assert(!tuples.has(tuple), 'Duplicate project content');
      tuples.add(tuple);
    }
    assert.deepEqual(items.map(item => item.id), value.en.map(item => item.id), 'Locale catalog IDs/order differ');
  }
}

/** Schema 1 contains reviewed data only: no selectors, callbacks or commands. */
export function validateReleaseExpectations(data, release) {
  keys(data, ['schemaVersion', 'kind', 'frozen', 'release', 'review', 'layout', 'locales', 'profiles']);
  assert.equal(data.schemaVersion, 1, 'Unsupported expectations schema');
  assert.equal(data.kind, 'independent-project-expectations');
  assert.equal(data.frozen, true, 'Frozen expectations declaration required');
  assert(VERSION.test(release.version) && REVISION.test(release.sourceRevision) &&
    /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/.test(release.releaseId), 'Supported exact release identity required');
  assert.equal(release.contract.version, '1', 'Only expectations contract1 supported');
  for (const entry of [release.archive, release.contract, release.account]) assert(HEX.test(entry.sha256), 'Exact expectation release digests required');
  assert.deepEqual(data.release, {
    releaseId: release.releaseId, version: release.version, contractVersion: release.contract.version,
    sourceRevision: release.sourceRevision, archiveSha256: release.archive.sha256,
    chromeSha256: release.contract.sha256, accountSha256: release.account.sha256,
  }, 'Expectations release tuple mismatch');
  review(data.review);
  catalogs(data.locales, true);
  keys(data.layout, ['desktopColumns', 'mobileColumns', 'minimumTargetPx', 'tolerancePx', 'columnGapPx']);
  assert([1, 2].includes(data.layout.desktopColumns) && data.layout.mobileColumns === 1 &&
    data.layout.minimumTargetPx === 44 && data.layout.tolerancePx === 2 && data.layout.columnGapPx === 8, 'Unsupported declared layout');
  keys(data.profiles, Object.keys(data.profiles || {}));
  for (const [id, profile] of Object.entries(data.profiles)) {
    assert(/^[A-Za-z][A-Za-z0-9_-]{0,99}$/.test(id) && id !== 'canonical', 'Invalid routing profile ID');
    keys(profile, ['review', 'locales']);
    review(profile.review);
    catalogs(profile.locales, false);
  }
  return data;
}

/** Private downloaded declarations use the same owned/bounded reader as state.
 * Compatibility files are reviewed code-closure inputs, never live DOM captures. */
export function loadReleaseExpectations(release, { profile } = {}) {
  let bytes;
  if (release.expectations) {
    assert(HEX.test(release.expectations.sha256), 'Expectations digest required');
    bytes = readPrivateBytes(release.expectations.path, JSON_LIMITS.evidence);
    assert.equal(hash(bytes), release.expectations.sha256, 'Expectations asset digest mismatch');
  } else {
    assert(['0.7.1', '0.7.2'].includes(release.version), 'Explicit reviewed expectations declaration required');
    bytes = readFileSync(new URL(`./expectations/${release.version}.json`, import.meta.url));
  }
  const data = validateReleaseExpectations(JSON.parse(bytes), release);
  return selectExpectationProfile(freeze({ ...data, sha256: hash(bytes) }), profile);
}

export function assertExpectationChrome(chrome = {}) {
  assert(chrome && typeof chrome === 'object' && !Array.isArray(chrome) &&
    Object.keys(chrome).every(key => ['themeControlLabels', 'projectProfile'].includes(key)), 'Unapproved chrome override');
}

/** The route's exact profile ID/digest is included by the existing routeKey. */
export function selectExpectationProfile(data, profile) {
  let selected = data.locales;
  if (profile !== undefined) {
    keys(profile, ['id', 'sha256']);
    assert(Object.hasOwn(data.profiles, profile.id), 'Unapproved routing profile');
    const approved = data.profiles[profile.id];
    assert(HEX.test(profile.sha256) && hash(JSON.stringify(approved)) === profile.sha256,
      'Unapproved routing profile or profile digest mismatch');
    selected = approved.locales;
  }
  return freeze({ ...data, locales: selected, profile: profile || null });
}

export function expectedProjects(expectations, locale, origin) {
  assert(locales.includes(locale) && expectations.locales[locale]?.length, 'Supported catalog locale required');
  return freeze(expectations.locales[locale].map(item => ({ ...item, href: new URL(item.href, origin).href })));
}

/** Semantic IDs have no DOM attribute in 0.7.x. Match their unique, independently
 * declared ordered tuples; checkMenu separately checks real accessible names. */
export function assertProjectCatalog(actual, expected, layout) {
  assert.equal(actual.items.length, expected.length, 'Project catalog count mismatch');
  assert.equal(actual.columns, layout.columns, 'Project column geometry mismatch');
  if (actual.declaredColumns !== null) assert.equal(actual.declaredColumns, layout.columns, 'Project declared columns mismatch');
  for (let i = 0; i < expected.length; i++) {
    const item = actual.items[i], want = expected[i];
    const trackWidth = (actual.width - (layout.columns - 1) * layout.columnGapPx) / layout.columns;
    assert(Math.abs(item.width - trackWidth) <= layout.tolerancePx, 'Project track width mismatch');
    for (const key of ['href', 'name', 'image']) assert.equal(item[key], want[key], `Project ${i} ${key} mismatch`);
    assert(item.visible && item.width >= layout.minimumTargetPx - layout.tolerancePx &&
      item.height >= layout.minimumTargetPx - layout.tolerancePx, 'Project hidden or target too small');
    assert(item.x >= actual.x - layout.tolerancePx &&
      item.x + item.width <= actual.x + actual.width + layout.tolerancePx, 'Project overflow');
    const previous = actual.items[i - 1];
    if (previous) {
      if (i % layout.columns === 0) {
        assert(item.y >= previous.y + previous.height - layout.tolerancePx &&
          Math.abs(item.x - actual.items[0].x) <= layout.tolerancePx, 'Project row geometry mismatch');
      } else {
        assert(Math.abs(item.y - previous.y) <= layout.tolerancePx &&
          item.x >= previous.x + previous.width - layout.tolerancePx, 'Project column geometry mismatch');
      }
    }
  }
}
