import assert from 'node:assert/strict';

// Capture the actual open account menu. The caller owns synthetic authentication,
// viewport, locale, theme, navigation opening and font readiness.
export async function captureAccountRender(page, { animationTimeoutMs = 2000, beforeAction = () => {} } = {}) {
  assert(Number.isSafeInteger(animationTimeoutMs) && animationTimeoutMs > 0 && animationTimeoutMs <= 10000, 'Bounded account animation timeout required');
  const trigger = page.locator('[data-naeil-account-trigger]:visible');
  const menu = page.locator('[data-naeil-account-menu]:visible');
  await trigger.waitFor();
  await menu.waitFor();
  beforeAction(); await page.mouse.move(0, 0);
  beforeAction(); await menu.getByRole('menuitem').first().focus();
  await page.evaluate(async timeoutMs => {
    const shown = selector => [...document.querySelectorAll(selector)].find(element => element.getBoundingClientRect().width > 0);
    const roots = [shown('[data-naeil-account-trigger]'), shown('[data-naeil-account-menu]')];
    if (roots.some(element => !element)) throw Error('Missing account animation root');
    let timer;
    try {
      await Promise.race([
        (async () => {
          for (;;) {
            // Product illustrations/loaders do not control shared account
            // measurements. Infinite decorative animations never settle.
            const animations = [...new Set(roots.flatMap(element => element.getAnimations({ subtree: true })))].filter(animation => !['finished', 'idle'].includes(animation.playState) && Number.isFinite(animation.effect?.getComputedTiming().endTime));
            if (!animations.length) return;
            await Promise.all(animations.map(animation => animation.finished.catch(() => {})));
            // Recheck after cancellation/replacement by a new transition.
          }
        })(),
        new Promise((_, reject) => { timer = setTimeout(() => reject(Error('Account animation settling exceeded bounded timeout')), timeoutMs); }),
      ]);
    } finally { clearTimeout(timer); }
  }, animationTimeoutMs);
  return page.evaluate(() => {
    const shown = selector => [...document.querySelectorAll(selector)].find(e => e.getBoundingClientRect().width > 0);
    const measure = (element, fields) => {
      if (!element) throw Error('Missing account element');
      const style = getComputedStyle(element);
      return Object.fromEntries(fields.map(key => [key, style[key]]));
    };
    const trigger = shown('[data-naeil-account-trigger]');
    const avatar = trigger.querySelector('.naeil-header-account-avatar');
    const menu = shown('[data-naeil-account-menu]');
    const action = menu.querySelector('[role="menuitem"]');
    return {
      uiVersion: document.querySelector('[data-naeil-header]').dataset.naeilUiVersion,
      trigger: measure(trigger, ['width', 'height', 'padding', 'borderRadius', 'backgroundColor', 'color']),
      avatar: measure(avatar, ['width', 'height', 'borderRadius', 'backgroundColor', 'color']),
      icon: measure(avatar.querySelector('svg'), ['width', 'height', 'strokeWidth']),
      menu: measure(menu, ['width', 'padding', 'borderRadius', 'backgroundColor', 'color', 'borderTopWidth', 'borderTopColor']),
      action: measure(action, ['height', 'fontSize', 'fontWeight', 'lineHeight', 'padding', 'color', 'backgroundColor']),
      fontFamily: getComputedStyle(action).fontFamily.split(',')[0].trim().replaceAll('"', ''),
      overflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
}

export function assertAccountRender(actual, reference) {
  assert.equal(actual.uiVersion, reference.uiVersion, 'Account package version differs from independent reference');
  assert.equal(actual.overflow, false, 'Account page overflows');
  assert.equal(actual.fontFamily, reference.fontFamily, 'Account font differs from independent reference');
  for (const key of ['trigger', 'avatar', 'icon', 'menu', 'action']) {
    assert.deepEqual(actual[key], reference[key], `Account ${key} differs from independent reference`);
  }
}
