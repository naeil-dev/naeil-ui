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

for (const story of ['brand-naeilheader--usage', 'brand-naeilheader--japanese-application', 'ui-sitefooter--guarded-links']) {
  test(`owned service example uses the full footer: ${story}`, async ({ page }) => {
    await page.goto(`/iframe.html?id=${story}&viewMode=story`);
    await expect(page.locator('[data-naeil-footer]')).toHaveAttribute('data-variant', 'full');
  });
}

for (const locale of ['ko', 'ja', 'en']) for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
  test(`canonical footer content and touch targets ${locale} ${width} ${theme}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    const story = `brand-naeilheader--reference-compact${locale === 'ja' ? '' : `-${locale}`}`;
    await page.goto(`/iframe.html?id=${story}&viewMode=story&globals=theme:${theme}`);
    const footer = page.locator('[data-naeil-footer]');
    await expect(footer).toHaveAttribute('lang', locale);
    await expect(footer).toHaveAttribute('data-variant', 'compact');
    await expect(page.locator('html')).toHaveClass(new RegExp(theme));
    // Wait for the rendered faces; WebKit can leave the global FontFaceSet pending.
    await footer.evaluate(async element => {
      await Promise.all([...element.querySelectorAll('a, h2')].map(node => {
        const style = getComputedStyle(node);
        return document.fonts.load(`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`, node.textContent || '');
      }));
    });
    await expect(footer).toHaveAttribute('data-naeil-ui-contract', '1');
    await expect(footer.getByRole('link')).toHaveCount(4);
    // Firefox can report 43.999969px for a computed 44px box at fractional y.
    // Allow only floating-point serialization noise, not a smaller hit target.
    for (const link of await footer.getByRole('link').all()) expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44 - 0.001);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= Math.ceil(document.documentElement.getBoundingClientRect().width))).toBe(true);
    const geometry = await footer.evaluate(element => {
      const frame = element.querySelector('.ui-site-footer-frame')!.getBoundingClientRect();
      const titles = [...element.querySelectorAll('.ui-site-footer-label')].map(title => title.getBoundingClientRect().top);
      return { titles, offset: Math.max(...titles) - Math.min(...titles), frameTop: frame.top, frameHeight: frame.height,
        brandTop: element.querySelector('.ui-site-footer-brand')!.getBoundingClientRect().top };
    });
    expect(geometry.titles).toHaveLength(2);
    await info.attach('footer-geometry', { body: JSON.stringify({ locale, width, theme, ...geometry }), contentType: 'application/json' });
    await footer.screenshot({ path: info.outputPath(`compact-${locale}-${theme}-${width}.png`) });
    if (width === 1440) expect(geometry.offset).toBeLessThanOrEqual(1);
  });
}

test("compact footer keeps a consumer items-* containerClassName in charge of alignment", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/iframe.html?id=brand-naeilheader--reference-compact-en&viewMode=story');
  const frame = page.locator('[data-naeil-footer] .ui-site-footer-frame');
  const bottoms = () => frame.evaluate(element => [...element.querySelectorAll(':scope > nav')].map(nav => Math.round(nav.getBoundingClientRect().bottom)));
  const tops = () => frame.evaluate(element => [...element.querySelectorAll(':scope > nav')].map(nav => Math.round(nav.getBoundingClientRect().top)));
  expect(new Set(await tops()).size, "default compact link groups share a top edge").toBe(1);
  await frame.evaluate(element => element.classList.add('items-end'));
  expect(await frame.evaluate(element => getComputedStyle(element).alignItems)).toBe('flex-end');
  expect(new Set(await bottoms()).size, "items-end override aligns link group bottoms").toBe(1);
});
