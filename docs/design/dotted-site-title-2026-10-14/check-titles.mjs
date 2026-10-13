import { chromium, webkit, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';

const base = process.env.SITE_URL || 'http://localhost:3010';
const output = process.env.RESULT_NAME || 'local';
const results = [];
for (const engine of [chromium, webkit]) {
  const browser = await engine.launch();
  const context = await browser.newContext({ locale: 'en-US' });
  const page = await context.newPage();
  for (const locale of ['en', 'ko', 'ja']) {
    const prefix = locale === 'en' ? '' : `/${locale}`;
    for (const route of ['', '/blog', '/blog/2026-03-30', '/login', '/design', '/projects', '/cc', '/sa', '/pkm', '/baby-agent']) {
      const path = prefix + (route || '/');
      const response = await page.goto(base + path);
      expect(response.status()).toBe(200);
      const title = await page.title();
      if (!route) expect(title).toBe('.naeil');
      else {
        expect(title).toMatch(/ — \.naeil$/);
        expect(title.match(/ — \.naeil/g)).toHaveLength(1);
      }
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', title);
      await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute('content', title);
      await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute('content', '.naeil');
      const canonical = await page.locator('link[rel=canonical]').getAttribute('href');
      expect(canonical).toBe('https://naeil.dev' + (prefix + route || '/'));
      results.push({ engine: engine.name(), path, title, canonical });
    }
  }
  await page.goto(base + '/ko/blog');
  await page.locator('main article a').first().click();
  await expect(page).toHaveURL(/\/ko\/blog\/2026-03-30$/);
  await expect(page).toHaveTitle(/ — \.naeil$/);
  await page.goBack();
  await expect(page).toHaveTitle('블로그 — .naeil');
  await page.locator('.ui-navigation-toolbar').getByRole('combobox').click();
  await page.getByRole('option', { name: 'English', exact: true }).click();
  await expect(page).toHaveTitle('Blog — .naeil');
  await browser.close();
}
writeFileSync(`docs/design/dotted-site-title-2026-10-14/${output}.json`, JSON.stringify({ base, results, clientNavigationBackLocale: 'passed in both browsers' }, null, 2) + '\n');
console.log(`${results.length} title/social/canonical checks; client navigation, back and locale switching passed`);
