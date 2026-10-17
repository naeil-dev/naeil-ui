import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertAccountRender } from './account-render.mjs';

const reference = {
  uiVersion: '0.7.1', overflow: false, fontFamily: 'Noto Sans JP',
  trigger: { width: '44px', height: '44px' }, avatar: { color: 'rgb(32, 33, 39)' },
  icon: { width: '16px' }, menu: { width: '224px' }, action: { fontWeight: '400' },
};
test('independent reference rejects a consumer width override even if its own CSS token agrees', () => {
  const actual = structuredClone(reference);
  actual.trigger.width = '40px';
  assert.throws(() => assertAccountRender(actual, reference), /trigger differs/);
});
test('independent reference rejects visual, font and package-version divergence', () => {
  for (const change of [
    actual => { actual.avatar.color = 'rgb(255, 255, 255)'; },
    actual => { actual.action.fontWeight = '600'; },
    actual => { actual.fontFamily = 'sans-serif'; },
    actual => { actual.uiVersion = '0.7.0'; },
    actual => { actual.overflow = true; },
  ]) {
    const actual = structuredClone(reference); change(actual);
    assert.throws(() => assertAccountRender(actual, reference));
  }
  assert.doesNotThrow(() => assertAccountRender(structuredClone(reference), reference));
});
