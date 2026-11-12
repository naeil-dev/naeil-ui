import { test, expect, type Page, type Locator } from "@playwright/test";
import { fixtureURL } from "../scripts/chrome-fixture-config";

// This additive 24-case matrix belongs to Chromium's `other` CI suite.
// The frozen B1 pairs remain unchanged in their three separate shards. WebKit's
// expensive existing shards already approached the old 25-minute budget; the
// shared Radix behavior remains covered there by naeil-header/navigation specs.
// Set NAEIL_UI_SERVICE_ALL_BROWSERS=1 for the same matrix on Firefox/WebKit locally.
test.beforeEach(({ browserName }) => {
  test.skip(browserName !== "chromium" && !process.env.NAEIL_UI_SERVICE_ALL_BROWSERS,
    "Service presentation matrix runs in Chromium; existing chrome suites cover all engines");
});

const profiles = ["canonical", "home", "estimate", "jev"] as const;
const styleProperties = ["font-family", "font-size", "font-weight", "line-height", "letter-spacing", "color", "background-color", "padding", "gap", "min-height", "border-radius", "text-decoration-line"];
async function styles(target: Locator) {
  return target.evaluate((element, properties) => Object.fromEntries(properties.map(p => [p, getComputedStyle(element).getPropertyValue(p)])), styleProperties);
}
async function settle(page: Page) {
  await page.evaluate(async () => {
    await Promise.all(document.getAnimations().filter(a => a.effect?.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => {})));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}
async function geometry(page: Page) {
  return page.evaluate(() => {
    const box = (e: Element) => { const { x, y, width, height } = e.getBoundingClientRect(); return { x, y, width, height }; };
    const brand = document.querySelector('[data-app-brand]')!;
    const logo = brand.querySelector('svg[data-naeil-brand]')!;
    const suffix = brand.querySelector('.naeil-header-brand-suffix');
    const nav = document.querySelector('.ui-navigation-desktop')!;
    return {
      header: box(document.querySelector('header')!),
      brand: box(brand), logo: box(logo),
      suffix: suffix ? {
        text: suffix.textContent,
        gap: suffix.getBoundingClientRect().x - logo.getBoundingClientRect().right,
        typography: Object.fromEntries(['font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'margin-inline-start', 'transform', 'text-box-trim'].map(p => [p, getComputedStyle(suffix).getPropertyValue(p)])),
      } : null,
      centerOffset: nav.children.length && nav.getBoundingClientRect().width ? nav.getBoundingClientRect().x - brand.getBoundingClientRect().x : null,
      centerGap: nav.children.length && nav.getBoundingClientRect().width ? nav.getBoundingClientRect().x - brand.parentElement!.getBoundingClientRect().right : null,
    };
  });
}
async function toolbar(page: Page, mobile: boolean) {
  return page.locator(mobile ? '.ui-navigation-mobile-toolbar [data-app-toolbar]' : '.ui-navigation-toolbar [data-app-toolbar]').evaluate(element => {
    const rect = element.getBoundingClientRect();
    return { right: rect.right, controls: [...element.children].map(e => {
      const r = e.getBoundingClientRect();
      const css = getComputedStyle(e);
      return { width: r.width, height: r.height, font: css.font, padding: css.padding };
    }) };
  });
}

for (const width of [390, 1440]) for (const locale of ["ko", "ja", "en"]) for (const theme of ["light", "dark"]) for (const auth of ["in", "out"]) {
  test(`service profiles ${width}/${locale}/${theme}/${auth}`, async ({ page }, info) => {
    test.setTimeout(90000);
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const evidence: Record<string, unknown> = {};
    let reference: Awaited<ReturnType<typeof geometry>> | undefined;
    let suffixReference: NonNullable<Awaited<ReturnType<typeof geometry>>["suffix"]> | undefined;
    let toolbarReference: Awaited<ReturnType<typeof toolbar>> | undefined;
    const states = new Map<string, unknown>();
    for (const profile of profiles) {
      await page.goto(`${fixtureURL}/candidate/index.html?service=${profile}&locale=${locale}&theme=${theme}&auth=${auth}`);
      await expect(page.locator('[data-naeil-header]')).toBeVisible();
      await expect(page.locator('html')).toHaveClass(new RegExp(theme));
      await page.evaluate(() => document.fonts.ready);
      const measured = await geometry(page);
      evidence[profile] = { geometry: measured };
      const { brand, suffix, centerGap, centerOffset, ...common } = measured;
      if (!reference) reference = measured;
      expect(common).toEqual({ header: reference.header, logo: reference.logo });
      expect({ x: brand.x, y: brand.y, height: brand.height }).toEqual({ x: reference.brand.x, y: reference.brand.y, height: reference.brand.height });
      await expect(page.locator('.ui-navigation-brand > *')).toHaveCount(1);
      await expect(page.locator('.ui-navigation-brand > [data-app-brand]')).toHaveCount(1);
      await expect(page.locator('[data-app-brand] > *')).toHaveCount(profile === 'canonical' ? 1 : 2);
      await expect(page.locator('.naeil-header-brand-row')).toHaveCount(0);
      if (profile !== 'canonical') {
        expect(suffix!.text).toBe(profile);
        expect(suffix!.gap).toBe(4);
        if (!suffixReference) suffixReference = suffix!;
        expect(suffix!.typography).toEqual(suffixReference.typography);
        await expect(page.locator('[data-app-brand]')).toHaveAccessibleName(`.naeil ${profile}`);
        await expect(page.locator('[data-app-brand]')).toHaveAttribute('href', '/');
        await expect(page.locator('.ui-navigation-desktop > *')).toHaveCount(profile === 'jev' ? 0 : 2);
      } else expect(suffix).toBeNull();
      if (width === 1440 && profile !== 'jev') {
        expect(centerGap).toBe(16);
        expect(centerOffset).toBe(reference.centerOffset);
      }
      const mobile = width === 390;
      if (mobile) {
        await page.locator('.ui-navigation-toggle').click();
        await expect(page.locator('[data-slot="navigation-sheet"]')).toBeVisible();
      }
      await settle(page);
      const measuredToolbar = await toolbar(page, mobile);
      if (!toolbarReference) toolbarReference = measuredToolbar;
      expect(measuredToolbar).toEqual(toolbarReference);
      for (const control of measuredToolbar.controls.filter(c => c.width > 1)) expect(control.height).toBe(44);
      if (profile !== 'canonical') {
        await expect(page.locator('.ui-navigation-desktop [href="/blog"], .ui-navigation-mobile-links [href="/blog"], .ui-navigation-desktop [href="/design"], .ui-navigation-mobile-links [href="/design"]')).toHaveCount(0);
        await expect(page.locator('img[src="https://naeil.dev/images/whale.png"]')).toHaveCount(0);
      }
      if (profile === 'jev') {
        await expect(page.locator('header nav, [data-slot="navigation-sheet"] nav, [data-slot="navigation-sheet"] ul')).toHaveCount(0);
        if (mobile) {
          await page.setViewportSize({ width: 1440, height: 900 });
          await expect(page.locator('[data-slot="navigation-sheet"]')).toBeHidden();
          await page.setViewportSize({ width, height: 900 });
        }
        continue;
      }
      const scope = page.locator(mobile ? '.ui-navigation-mobile-links' : '.ui-navigation-desktop');
      const flat = scope.locator(':scope > a').first();
      const state: Record<string, unknown> = { default: await styles(flat) };
      await flat.hover(); await settle(page);
      state.hover = await styles(flat);
      await flat.click();
      if (mobile) await page.locator('.ui-navigation-toggle').click();
      await page.mouse.move(width - 10, 800); await settle(page);
      await expect(flat).toHaveAttribute('aria-current', 'page');
      state.selected = await styles(flat);
      for (const key of ['default', 'hover', 'selected']) {
        if (!states.has(key)) states.set(key, state[key]);
        expect(state[key], `${profile} ${key} tab`).toEqual(states.get(key));
      }
      if (profile !== 'home') {
        if (mobile) {
          state.group = await styles(scope.locator('.ui-navigation-group-label').first());
          state.entry = await styles(scope.locator('.ui-navigation-entry').first());
        } else {
          const trigger = scope.locator(':scope > button').first();
          await trigger.focus(); await trigger.press('Enter'); await settle(page);
          await expect(trigger).toHaveAttribute('aria-expanded', 'true');
          state.expanded = await styles(trigger);
          const popover = page.locator('[data-slot="navigation-popover"]');
          await expect(popover).toBeVisible();
          state.entry = await styles(popover.locator('.ui-navigation-entry').first());
          state.popover = await styles(popover);
        }
        for (const key of mobile ? ['group', 'entry'] : ['expanded', 'entry', 'popover']) {
          if (!states.has(key)) states.set(key, state[key]);
          expect(state[key], `${profile} ${key}`).toEqual(states.get(key));
        }
      }
      evidence[profile] = { geometry: measured, toolbar: measuredToolbar, states: state };
    }
    await info.attach('service-profile-measurements', { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  });
}
