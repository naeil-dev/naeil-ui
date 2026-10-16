import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assertGeometry, assertRouteDestination } from './verify-ui-production.mjs';
const contract = JSON.parse(readFileSync(new URL('../contracts/naeil-chrome.v1.json', import.meta.url)));
const baseline = {
  layoutWidth: 1920, layoutX: 0, headerFrame: { x: 160, width: 1600, padding: 40 }, footerFrame: { x: 160, width: 1600, padding: 40 },
  headerHeight: 65, headerBrand: { height: 28, offset: 40 }, footerBrand: { height: 20, offset: 40 }, overflow: false,
  expectedFont: 'Pretendard', fontLoaded: true, fontFamily: 'Pretendard, sans-serif', background: 'black', foreground: 'white',
};
test('independent contract rejects self-consistent wrong consumer tokens', () => {
  assert.doesNotThrow(() => assertGeometry(baseline, contract, baseline));
  const drift = structuredClone(baseline);
  drift.headerFrame = drift.footerFrame = { x: 320, width: 1280, padding: 24 };
  drift.headerBrand.offset = drift.footerBrand.offset = 24;
  assert.throws(() => assertGeometry(drift, contract, baseline), /frame width/);
});
test('font fallback and shared visual drift fail even when geometry agrees', () => {
  assert.throws(() => assertGeometry({ ...baseline, fontLoaded: false }, contract, baseline), /not loaded/);
  assert.throws(() => assertGeometry({ ...baseline, background: 'purple' }, contract, baseline), /background mismatch/);
});
test('a login redirect cannot certify a protected route', () => {
  assert.throws(() => assertRouteDestination('https://example.org/login', { path: '/settings' }, 'https://example.org'), /another route/);
  assert.doesNotThrow(() => assertRouteDestination('https://example.org/en', { path: '/', expectedPath: '/en' }, 'https://example.org'));
  assert.throws(() => assertRouteDestination('https://outside.org/settings', { path: '/settings' }, 'https://example.org'), /another origin/);
});
