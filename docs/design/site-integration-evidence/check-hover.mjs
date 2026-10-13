import { chromium, webkit, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const base = process.env.SITE_URL || 'http://localhost:3010';
const out = 'docs/design/site-integration-evidence';
const results = [];
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  for (const locale of ['ko', 'en', 'ja']) for (const theme of ['light', 'dark']) for (const width of [320, 390, 1440, 2560]) {
    const mobile = width < 768;
    const context = await browser.newContext({ viewport: { width, height: 1000 }, hasTouch: mobile, reducedMotion: 'reduce' });
    await context.addInitScript(t => localStorage.setItem('theme', t), theme);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + (locale === 'en' ? '/' : `/${locale}`), { waitUntil: 'networkidle' });
    const trigger = page.locator(mobile ? '.ui-navigation-toggle' : '.ui-navigation-desktop button').first();
    const panel = page.locator(mobile ? '.ui-navigation-sheet' : '.ui-navigation-popover');
    if (mobile) {
      await trigger.tap();
      await expect(panel).toBeVisible();
      for (let i = 0; i < 15; i++) await page.keyboard.press('Tab');
      expect(await panel.evaluate(element => element.contains(document.activeElement))).toBe(true);
      await page.keyboard.press('Escape');
      await expect(panel).toBeHidden();
      await expect(trigger).toBeFocused();
    } else {
      const brand = page.locator('.ui-navigation-brand a');
      await brand.focus();
      await trigger.hover();
      await expect(panel).toBeVisible();
      await expect(brand).toBeFocused();
      await panel.getByRole('link').first().hover();
      await page.waitForTimeout(350);
      await expect(panel).toBeVisible();
      expect(await panel.locator('nav').evaluate(e => getComputedStyle(e).gridTemplateColumns.split(' ').length)).toBe(2);
      if (locale === 'ko' && width === 1440) await page.screenshot({ path: `${out}/hover-${engine.name()}-${theme}.png` });
      await page.mouse.move(width - 10, 800);
      await expect(panel).toBeHidden();
      await expect(brand).toBeFocused();
      await trigger.hover();
      await trigger.click();
      await expect(panel).toBeVisible();
      await page.mouse.move(width - 10, 800);
      await expect(panel).toBeHidden();
      await trigger.focus();
      await page.keyboard.press('Enter');
      await expect(panel).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(trigger).toBeFocused();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    expect(errors).toEqual([]);
    results.push({ engine: engine.name(), locale, theme, width, passed: true });
    await context.close();
  }
  await browser.close();
}
writeFileSync(`${out}/hover-site.json`, JSON.stringify({ base, results }, null, 2) + '\n');
console.log(`${results.length} site hover/touch/keyboard conditions passed`);
