import { test, expect } from "@playwright/test";

const cases = [320, 390, 768, 1440, 1920, 2560];

for (const theme of ["light", "dark"]) for (const size of cases) {
  test(`shared application frame ${theme} ${size}`, async ({ page }) => {
    await page.setViewportSize({ width: size, height: 1000 });
    await page.goto(`/iframe.html?id=ui-navigation--home&viewMode=story&globals=theme:${theme};a11y.manual:!true`);
    await expect(page.getByRole("heading", { name: "대시보드", exact: true })).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const basis = await page.evaluate(() => {
      const probe = document.createElement("div");
      probe.style.cssText = "position:fixed;left:-10000px;width:100vw;height:0";
      document.body.append(probe); const vw = probe.getBoundingClientRect().width; probe.remove();
      return { available: document.documentElement.getBoundingClientRect().width, vw };
    });
    const expectedFrame = Math.min(basis.available, 1600);
    const expectedGutter = Math.min(40, Math.max(16, basis.vw * .024));
    const frames = await page.locator(".ui-navigation-frame, main, .ui-site-footer-frame").evaluateAll(elements => elements.map(element => {
      const rect = element.getBoundingClientRect();
      const css = getComputedStyle(element);
      return { x: rect.x, width: rect.width, gutter: parseFloat(css.paddingInlineStart) };
    }));
    expect(frames).toHaveLength(3);
    for (const frame of frames) {
      expect(frame.width).toBeCloseTo(expectedFrame, 1);
      expect(frame.x).toBeCloseTo((basis.available - expectedFrame) / 2, 1);
      expect(frame.gutter).toBeCloseTo(expectedGutter, 1);
    }
    const list = page.locator('[data-ui-layout="list"]');
    expect((await list.boundingBox())!.width).toBeCloseTo(expectedFrame - expectedGutter * 2, 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= Math.ceil(document.documentElement.getBoundingClientRect().width))).toBe(true);
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
