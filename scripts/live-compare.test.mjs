import assert from 'node:assert/strict';
import { test } from 'node:test';
import { maskedRGBA, geometryComparison } from './live-compare-chrome.mjs';
import { distinctDifferences, rollup } from './live-compare-report.mjs';
import { diffRGBA, differenceCount, iconVerdict, near, parseArgs, requestAllowed, validTitle } from './live-compare.mjs';

test('pixel diff detects channel/alpha differences and unequal extents', () => {
  const a = { width: 2, height: 1, data: [0, 0, 0, 255, 20, 20, 20, 255] };
  assert.equal(diffRGBA(a, a).differentPixels, 0);
  const b = { ...a, data: [0, 0, 0, 254, 40, 20, 20, 255] };
  assert.equal(diffRGBA(a, b).differentPixels, 2);
  assert.equal(diffRGBA(a, b).over16Pixels, 1);
  const c = { width: 1, height: 2, data: [0, 0, 0, 255, 20, 20, 20, 255] };
  assert.equal(diffRGBA(a, c).differentPixels, 3);
});
test('title requires exact brand, named page and single separator', () => {
  assert(validTitle('프로젝트 — .naeil', 'naeil'));
  assert(validTitle('ログイン — .naeil home', 'home'));
  for (const title of ['', '.naeil home', ' — .naeil home', 'Login - .naeil home', 'Login — Home', 'Login — .naeil home — .naeil home']) assert(!validTitle(title, 'home'));
  assert(validTitle('.naeil home', 'home', true));
});
test('absence and not-measured never become successful numeric comparisons', () => {
  assert(!near(null, 0)); assert(!near(NaN, 0)); assert(near(96.125, 96));
  assert.equal(differenceCount([{ checks: { a: { status: 'not measured' }, b: { status: 'differs' }, c: { status: 'match' } } }]), 1);
});
test('read-only methods and credential origin guard include sibling subdomains', () => {
  const origin = 'https://jev.naeil.dev';
  assert(requestAllowed('GET', origin + '/login', origin, true));
  assert(requestAllowed('HEAD', origin + '/icon.svg', origin, false));
  for (const method of ['POST', 'DELETE', 'PUT', 'PATCH', 'OPTIONS']) assert(!requestAllowed(method, origin, origin, false));
  assert(!requestAllowed('GET', 'https://naeil.dev/login', origin, true));
  assert(!requestAllowed('GET', 'https://abstorm.naeil.dev/', origin, true));
  assert(requestAllowed('GET', 'https://naeil.dev/font.woff2', origin, false));
});
test('state is explicitly scoped to one known site, never a global file', () => {
  assert.deepEqual(Object.keys(parseArgs(['--storage-state', 'jev=/tmp/opaque.json']).states), ['jev']);
  assert.throws(() => parseArgs(['--storage-state', '/tmp/opaque.json']));
  assert.throws(() => parseArgs(['--storage-state', 'unknown=/tmp/opaque.json']));
  assert.throws(() => parseArgs(['--storage-state', 'jev=a', '--storage-state', 'jev=b']));
  assert.throws(() => parseArgs(['--out']));
});

test('icon differences need measured responses; transport failures are unknown', () => {
  const declarations = [{ rel: 'icon', href: 'https://naeil.dev/icon.svg', type: 'image/svg+xml', sizes: 'any' }];
  const reference = { declarations, responses: [{ url: 'https://naeil.dev/icon.svg', status: 200, type: 'image/svg+xml', sha256: 'abc' }] };
  const site = { origin: 'https://jev.naeil.dev' };
  const actual = { declarations: declarations.map(d => ({ ...d, href: site.origin + '/icon.svg' })), responses: [{ url: site.origin + '/icon.svg', status: 200, type: 'image/svg+xml', sha256: 'abc' }] };
  assert.equal(iconVerdict(actual, reference, site).status, 'match');
  assert.equal(iconVerdict({ ...actual, responses: [{ url: site.origin + '/icon.svg', error: 'timeout' }] }, reference, site).status, 'not measured');
  assert.equal(iconVerdict({ ...actual, responses: [{ url: site.origin + '/icon.svg', status: 404, sha256: 'def' }] }, reference, site).status, 'differs');
  assert.equal(iconVerdict(actual, undefined, site).status, 'not measured');
});

test('optional icon sizes/type notes never become response or byte differences', () => {
  const response = { url: 'https://naeil.dev/favicon.ico', status: 200, type: 'image/x-icon', sha256: 'same' };
  const reference = { declarations: [{ rel: 'icon', href: response.url, sizes: '16x16', type: 'image/x-icon' }], responses: [response] };
  const actual = { declarations: [{ rel: 'icon', href: 'https://jev.naeil.dev/favicon.ico?hash', sizes: '48x48', type: '' }], responses: [{ ...response, url: 'https://jev.naeil.dev/favicon.ico?hash' }] };
  assert.equal(iconVerdict(actual, reference, { origin: 'https://jev.naeil.dev' }).status, 'match');
  assert.deepEqual(actual.metadataNotes[0].differences.map(d => d.field), ['type', 'sizes']);
});


test('union masks hide only measured boxes, preserve unmasked pixels and crop optional rows', () => {
  const a = { width: 3, height: 2, data: new Uint8ClampedArray(24).fill(255) };
  const b = { ...a, data: new Uint8ClampedArray(a.data) };
  b.data[0] = 0; b.data[4] = 0; b.data[8] = 0;
  const union = [{ x: 0, y: 0, width: 1, height: 1 }, { x: 1, y: 0, width: 1, height: 1 }];
  assert.equal(diffRGBA(maskedRGBA(a, union), maskedRGBA(b, union)).differentPixels, 1);
  assert.equal(maskedRGBA(a, [], 1).height, 1);
  assert.equal(maskedRGBA(a, [{ x: -5, y: -5, width: 100, height: 100 }]).data.length, 24);
});
test('relative geometry ignores global placement but catches shared style/size changes', () => {
  const e = { status: 'measured', geometry: { edge: 20, top: 10, width: 44, height: 44 }, styles: { color: 'same' }, state: null };
  const band = { elements: { theme: e } };
  assert.equal(geometryComparison(band, band).status, 'match');
  assert.equal(geometryComparison({ elements: { theme: { ...e, rect: { x: 900 }, geometry: { ...e.geometry, width: 46 } } } }, band).status, 'differs');
  assert.equal(geometryComparison({ elements: { theme: { ...e, styles: { color: 'other' } } } }, band).status, 'differs');
  assert.equal(geometryComparison({ elements: {} }, band).status, 'not measured');
  assert.equal(geometryComparison(null, band).status, 'not measured');
});
test('distinct causes group matrix repetitions and deduplicate multiple checks per condition', () => {
  const row = id => ({ id, site: 'naeil', layout: { header: null }, measurements: { mainCount: 0 }, checks: { frame: { status: 'differs' }, gap: { status: 'differs' } } });
  const rows = [row('ko-light-1440'), row('ja-dark-390')];
  const groups = distinctDifferences(rows);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].affectedConditions, 2);
  assert.deepEqual(groups[0].checks, ['frame', 'gap']);
  assert.equal(rollup(rows, ['frame'], ['naeil']).frame.naeil.differs, 2);
  const long = { id: 'long', site: 'naeil', kind: 'long', checks: { gap: { status: 'differs', values: { contentToFooter: 80 } } } };
  assert.equal(distinctDifferences([long])[0].id, 'long-content-footer-gap');
  assert.equal(distinctDifferences([long])[0].values[0], '80px (expected 96)');
  const missing = { ...long, checks: { gap: { status: 'differs', values: { reason: 'Missing footer' } } } };
  assert.equal(distinctDifferences([missing])[0].id, 'missing-footer');
});


test('resolved auto-layout lengths tolerate subpixel rounding but colors remain exact', () => {
  const e = { status: 'measured', geometry: { edge: 20 }, styles: { marginRight: '1040.36px', color: 'rgb(1, 2, 3)' } };
  const reference = { elements: { column: e } };
  assert.equal(geometryComparison({ elements: { column: { ...e, styles: { ...e.styles, marginRight: '1040.38px' } } } }, reference).status, 'match');
  assert.equal(geometryComparison({ elements: { column: { ...e, styles: { ...e.styles, color: 'rgb(1, 2, 4)' } } } }, reference).status, 'differs');
});


test('forbidden/checkpoint response cannot become an icon hash reference', () => {
  const actual = { declarations: [], responses: [{ url: 'https://jev.naeil.dev/icon.svg', status: 200, type: 'image/svg+xml', sha256: 'image' }] };
  const forbidden = { declarations: [], responses: [{ url: 'https://naeil.dev/icon.svg', status: 403, type: 'text/html', sha256: 'checkpoint' }] };
  assert.equal(iconVerdict(actual, forbidden, { origin: 'https://jev.naeil.dev' }).status, 'not measured');
  const missing = { declarations: [], responses: [{ url: 'https://home.example/icon.svg', status: 404, type: 'text/plain', sha256: 'missing' }] };
  assert.equal(iconVerdict(missing, undefined, { origin: 'https://home.example' }).status, 'differs');
});
