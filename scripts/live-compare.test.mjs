import assert from 'node:assert/strict';
import { test } from 'node:test';
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
  const reference = { declarations, responses: [{ url: 'https://naeil.dev/icon.svg', status: 200, sha256: 'abc' }] };
  const site = { origin: 'https://jev.naeil.dev' };
  const actual = { declarations: declarations.map(d => ({ ...d, href: site.origin + '/icon.svg' })), responses: [{ url: site.origin + '/icon.svg', status: 200, sha256: 'abc' }] };
  assert.equal(iconVerdict(actual, reference, site).status, 'match');
  assert.equal(iconVerdict({ ...actual, responses: [{ url: site.origin + '/icon.svg', error: 'timeout' }] }, reference, site).status, 'not measured');
  assert.equal(iconVerdict({ ...actual, responses: [{ url: site.origin + '/icon.svg', status: 404, sha256: 'def' }] }, reference, site).status, 'differs');
  assert.equal(iconVerdict(actual, undefined, site).status, 'not measured');
});
