import { test, expect } from "@playwright/test";

const cases = [
  { width: 320, frame: 320, gutter: 16 },
  { width: 390, frame: 390, gutter: 16 },
  { width: 768, frame: 768, gutter: 18.432 },
  { width: 1440, frame: 1440, gutter: 34.56 },
  { width: 1920, frame: 1600, gutter: 40 },
  { width: 2560, frame: 1600, gutter: 40 },
];

for (const theme of ["light", "dark"]) for (const size of cases) {
  test(`shared application frame ${theme} ${size.width}`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: 1000 });
    await page.goto(`/iframe.html?id=ui-navigation--home&viewMode=story&globals=theme:${theme};a11y.manual:!true`);
    await expect(page.getByRole("heading", { name: "대시보드", exact: true })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const frames = await page.locator(".ui-navigation-frame, main, .ui-site-footer-frame").evaluateAll(elements => elements.map(element => {
      const rect = element.getBoundingClientRect();
      const css = getComputedStyle(element);
      return { x: rect.x, width: rect.width, gutter: parseFloat(css.paddingInlineStart) };
    }));
    expect(frames).toHaveLength(3);
    for (const frame of frames) {
      expect(frame.width).toBeCloseTo(size.frame, 1);
      expect(frame.x).toBeCloseTo((size.width - size.frame) / 2, 1);
      expect(frame.gutter).toBeCloseTo(size.gutter, 1);
    }
    const list = page.locator('[data-ui-layout="list"]');
    expect((await list.boundingBox())!.width).toBeCloseTo(size.frame - size.gutter * 2, 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("narrow content and consumer overrides keep navigation and footer aligned", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1000 });
  await page.goto("/iframe.html?id=ui-navigation--home&viewMode=story&globals=theme:light;a11y.manual:!true");
  const frame = page.locator(".ui-navigation-frame");
  const before = await frame.boundingBox();
  await page.getByRole("button", { name: "설정", exact: true }).click();
  await expect(page.getByRole("heading", { name: "설정", exact: true })).toBeVisible();
  expect((await page.locator('[data-ui-layout="settings"]').boundingBox())!.width).toBe(640);
  expect(await frame.boundingBox()).toEqual(before);

  // A product-level theme override applies to all three regions, including
  // the generic footer. The content width remains independent of that frame.
  await page.evaluate(() => {
    document.documentElement.style.setProperty("--ui-width-frame", "1100px");
    document.documentElement.style.setProperty("--ui-frame-gutter", "20px");
  });
  for (const region of await page.locator(".ui-navigation-frame, main, .ui-site-footer-frame").all()) {
    expect((await region.boundingBox())!.width).toBe(1100);
    expect(await region.evaluate(element => getComputedStyle(element).paddingInlineStart)).toBe("20px");
  }
  expect((await page.locator('[data-ui-layout="settings"]').boundingBox())!.width).toBe(640);

  // Existing explicit utility overrides must keep winning over the defaults.
  await frame.evaluate(element => element.classList.add("max-w-7xl", "px-0"));
  expect((await frame.boundingBox())!.width).toBe(1280);
  expect(await frame.evaluate(element => getComputedStyle(element).paddingInlineStart)).toBe("0px");
});
