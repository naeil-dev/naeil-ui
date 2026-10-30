import { test, expect } from "@playwright/test";

test("canonical brand/content and native external footer links preserve unsaved navigation interception", async ({ page }) => {
  await page.goto('/iframe.html?id=ui-sitefooter--guarded-links&viewMode=story');
  const original = page.url();
  const footer = page.locator('[data-naeil-footer]');
  for (const [name, href] of [['.naeil', 'https://naeil.dev/en'], ['Projects', 'https://naeil.dev/en/projects'], ['Blog', 'https://naeil.dev/en/blog']]) {
    await footer.getByRole('link', { name, exact: true }).click();
    await expect(page.getByRole('status')).toHaveText(`Blocked unsaved navigation: ${href}`);
    expect(page.url()).toBe(original);
  }
  await page.getByRole('link', { name: 'External same-tab destination' }).click();
  await expect(page.getByRole('status')).toHaveText('Blocked unsaved navigation: https://example.org/leave');
  expect(page.url()).toBe(original);
  await expect(footer.getByRole('link', { name: 'GitHub' })).toHaveAttribute('target', '_blank');
  // A canceled guard changes dispatchEvent's return. Modifier clicks remain native.
  const modifiedAllowed = await footer.getByRole('link', { name: 'Projects' }).evaluate(element => {
    // Prevent actual browser departure after the React guard has had a chance to act.
    let guardPrevented = false;
    document.addEventListener('click', event => { guardPrevented = event.defaultPrevented; event.preventDefault(); }, { once: true });
    element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true }));
    return !guardPrevented;
  });
  expect(modifiedAllowed).toBe(true);
});

for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`canonical footer content and touch targets ${width} ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/iframe.html?id=brand-naeilheader--reference-compact&args=locale:ja&viewMode=story&globals=theme:${theme}`);
    const footer = page.locator('[data-naeil-footer]');
    await expect(footer).toHaveAttribute('data-naeil-ui-contract', '1');
    await expect(footer.getByRole('link')).toHaveCount(4);
    // Firefox can report 43.999969px for a computed 44px box at fractional y.
    // Allow only floating-point serialization noise, not a smaller hit target.
    for (const link of await footer.getByRole('link').all()) expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44 - 0.001);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= Math.ceil(document.documentElement.getBoundingClientRect().width))).toBe(true);
  });
}
