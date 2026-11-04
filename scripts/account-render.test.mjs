import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { assertAccountRender, captureAccountRender } from './account-render.mjs';

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

async function accountPage(t) {
  const browser = await chromium.launch(); t.after(() => browser.close());
  const page = await browser.newPage(); page.setDefaultTimeout(1000);
  await page.setContent(`<style>
    body{margin:0}button{font-family:Arial,sans-serif}
    [data-naeil-account-trigger]{width:44px;height:44px;padding:0}
    .naeil-header-account-avatar{display:inline-flex;width:24px;height:24px}
    svg{width:16px;height:16px}
    [data-naeil-account-menu]{box-sizing:border-box;width:224px;padding:4px}
  </style><header data-naeil-header data-naeil-ui-version="0.7.1"><button data-naeil-account-trigger><span class="naeil-header-account-avatar"><svg></svg></span></button></header><div data-naeil-account-menu role="menu"><button role="menuitem">Synthetic action</button></div><div id="unrelated">Synthetic decoration</div>`);
  return page;
}

async function captureWithin(page, options) {
  let timer;
  try {
    return await Promise.race([captureAccountRender(page, options), new Promise((_, reject) => { timer = setTimeout(() => reject(Error('Fixture capture deadline exceeded')), 800); })]);
  } finally { clearTimeout(timer); }
}

test('account capture ignores unrelated finite/infinite animations and preserves every measurement', async t => {
  const page = await accountPage(t), baseline = await captureWithin(page);
  await page.evaluate(() => {
    const decoration = document.querySelector('#unrelated');
    decoration.animate([{ opacity: 1 }, { opacity: 0.5 }], { duration: 100, iterations: Infinity });
    decoration.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(1px)' }], { duration: 10000 });
  });
  const result = await captureWithin(page, { animationTimeoutMs: 100 });
  assert.deepEqual(result, baseline); assertAccountRender(result, baseline);
});

test('account capture waits for relevant finite menu animation before reading final geometry', async t => {
  const page = await accountPage(t), baseline = await captureWithin(page);
  await page.evaluate(() => document.querySelector('[data-naeil-account-menu]').animate([{ width: '64px' }, { width: '224px' }], { duration: 150, fill: 'forwards' }));
  const result = await captureWithin(page, { animationTimeoutMs: 500 });
  assert.equal(result.menu.width, '224px'); assertAccountRender(result, baseline);
  assert.equal(await page.evaluate(() => document.querySelector('[data-naeil-account-menu]').getAnimations()[0].playState), 'finished');
});

test('account capture skips relevant infinite decoration and bounds a stuck finite animation', async t => {
  const page = await accountPage(t), baseline = await captureWithin(page);
  await page.evaluate(() => document.querySelector('.naeil-header-account-avatar').animate([{ opacity: 1 }, { opacity: 0.5 }], { duration: 100, iterations: Infinity }));
  assertAccountRender(await captureWithin(page, { animationTimeoutMs: 100 }), baseline);
  await page.evaluate(() => {
    const animation = document.querySelector('[data-naeil-account-menu]').animate([{ width: '64px' }, { width: '224px' }], { duration: 10000 });
    animation.pause();
  });
  await assert.rejects(captureWithin(page, { animationTimeoutMs: 50 }), /Account animation settling exceeded/);
});

test('account capture rechecks action authority after awaited setup and mouse movement',async()=>{
  for(const drift of ['menu','mouse']) {
    let current=true;const actions=[];
    const trigger={waitFor:async()=>{}};
    const menu={waitFor:async()=>{if(drift==='menu')current=false;},getByRole:()=>({first:()=>({focus:async()=>{actions.push('focus');}})})};
    const page={locator:selector=>selector.includes('trigger')?trigger:menu,mouse:{move:async()=>{actions.push('mouse');if(drift==='mouse')current=false;}},evaluate:async()=>assert.fail('lost fence reached account capture')};
    await assert.rejects(()=>captureAccountRender(page,{beforeAction:()=>assert(current,'account generation fence lost')}),/account generation fence lost/);
    assert.deepEqual(actions,drift==='mouse'?['mouse']:[]);
  }
});
