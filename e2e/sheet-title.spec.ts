import { expect, test } from '@playwright/test';
test('SheetTitle uses the 20/29 section title role', async ({page}) => {
  await page.goto('/iframe.html?id=ui-sheet--usage&globals=theme:dark;a11y.manual:!true');
  await page.locator('[data-slot="sheet-trigger"]').click();
  await expect(page.locator('[data-slot="sheet-title"]')).toHaveCSS('font-size','20px');
  await expect(page.locator('[data-slot="sheet-title"]')).toHaveCSS('line-height','29px');
});
