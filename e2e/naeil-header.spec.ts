import { test, expect, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const evidence = process.env.NAEIL_HEADER_EVIDENCE_DIR ?? "test-results/naeil-header";
const projects = ["design"];

async function open(page: Page, theme = "light", story = "usage") {
  await page.goto(`/iframe.html?id=brand-naeilheader--${story}&viewMode=story&globals=theme:${theme};a11y.manual:!true`);
  await expect(page.locator("[data-naeil-header]")).toBeVisible();
  await expect(page.locator("html")).toHaveClass(new RegExp(theme));
  // WebKit can leave FontFaceSet.ready pending after a document language change
  // even with no loading faces. Verify the actual text/faces instead of that flag.
  const fonts = await page.evaluate(async () => {
    const family = document.documentElement.lang === "ja" ? "Noto Sans JP" : "Pretendard";
    const text = document.querySelector('[data-naeil-header]')!.textContent!;
    return Promise.all([400, 500, 600].map(async weight => {
      const font = `${weight} 16px "${family}"`;
      return (await document.fonts.load(font, text)).length > 0 && document.fonts.check(font, text);
    }));
  });
  expect(fonts).toEqual([true, true, true]);
}

async function settled(page: Page) {
  await page.evaluate(() => Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {}))));
}

async function audit(page: Page, selector: string, info: TestInfo) {
  const builder = new AxeBuilder({ page }).include(selector);
  if (await page.locator('[data-slot="navigation-popover"]').count()) builder.include('[data-slot="navigation-popover"]');
  const result = await builder.analyze();
  const path = info.outputPath("axe.json");
  writeFileSync(path, JSON.stringify(result, null, 2));
  await info.attach("Raw axe result including incompletes", { path, contentType: "application/json" });
  expect(result.violations).toEqual([]);
}

for (const theme of ["light", "dark"]) for (const width of [390, 768, 1440, 2560]) {
  test(`whole header catalog, frame and accessibility ${theme} ${width}`, async ({ page, browserName }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await open(page, theme);
    const header = page.locator("[data-naeil-header]");
    const frame = header.locator(".ui-navigation-frame");
    const geometry = await frame.evaluate(element => {
      const rect = element.getBoundingClientRect();
      return { x: rect.x, width: rect.width, gutter: getComputedStyle(element).paddingInlineStart };
    });
    expect(geometry.width).toBe(Math.min(1600, width));
    expect(geometry.x).toBe((width - Math.min(1600, width)) / 2);
    const gutters: Record<number, number> = { 390: 16, 768: 18.432, 1440: 34.56, 2560: 40 };
    expect(parseFloat(geometry.gutter)).toBeCloseTo(gutters[width], 1);
    expect(await header.evaluate(element => getComputedStyle(element).position)).toBe("fixed");
    const mobile = width <= 768;
    const trigger = page.getByRole("button", { name: mobile ? "メニュー" : "プロジェクト", exact: true });
    await trigger.focus();
    await page.keyboard.press("Enter");
    const panel = page.locator(mobile ? '[data-slot="navigation-sheet"]' : '[data-slot="navigation-popover"]');
    await expect(panel).toBeVisible();
    await settled(page);
    expect(await panel.locator(".ui-navigation-menu-grid").count()).toBe(mobile ? 0 : 1);
    if (!mobile) expect(await panel.locator(".ui-navigation-menu-grid").evaluate(element => getComputedStyle(element).gridTemplateColumns.split(" ").length)).toBe(1);
    const links = panel.locator("a");
    for (const path of projects) await expect(panel.locator(`a[href="/${path}"]`)).toBeVisible();
    await expect(panel.getByText("準備中", { exact: true })).toHaveCount(0);
    for (const image of await panel.locator("img").all()) {
      await expect(image).toHaveAttribute("src", /^https:\/\/naeil.dev\/images\/whale\.png$/);
      await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
    }
    expect(await panel.locator("img").count()).toBe(1);
    for (const control of await panel.locator("a,button").all()) {
      const rect = await control.boundingBox();
      if (rect) { expect(rect.width).toBeGreaterThanOrEqual(44); expect(rect.height).toBeGreaterThanOrEqual(44); }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await audit(page, mobile ? '[data-slot="navigation-sheet"]' : "#storybook-root", info);
    mkdirSync(evidence, { recursive: true });
    await page.screenshot({ path: `${evidence}/${browserName}-${theme}-${width}-menu.png`, animations: "disabled" });
    await links.first().focus();
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(trigger).toBeFocused();
    await page.screenshot({ path: `${evidence}/${browserName}-${theme}-${width}-header.png`, animations: "disabled" });
  });
}

test("desktop hover bridges the portal gap and keyboard navigation intercepts the selected destination", async ({ page }) => {
  await open(page);
  const brand = page.locator("[data-app-brand]");
  const trigger = page.getByRole("button", { name: "プロジェクト", exact: true });
  const panel = page.locator('[data-slot="navigation-popover"]');
  await brand.focus();
  await trigger.hover();
  await expect(panel).toBeVisible();
  await expect(brand).toBeFocused();
  const from = (await trigger.boundingBox())!;
  const to = (await panel.boundingBox())!;
  await page.mouse.move(from.x + 20, (from.y + from.height + to.y) / 2);
  await panel.getByRole("link").first().hover();
  await page.waitForTimeout(250);
  await expect(panel).toBeVisible();
  await page.mouse.move(1200, 700);
  await expect(panel).toBeHidden();
  await trigger.focus();
  await page.keyboard.press("Enter");
  await panel.locator('a[href="/design"]').focus();
  await page.keyboard.press("Enter");
  await expect(panel).toBeHidden();
  await expect(page.getByRole("status")).toHaveText("/design");
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(panel.locator('a[href="/design"]')).toHaveAttribute("aria-current", "page");
});

test("mobile touch, focus trap, locale selection and reduced-motion dismissal", async ({ browser, browserName }) => {
  const context = await browser.newContext({ baseURL: "http://127.0.0.1:6007", viewport: { width: 390, height: 900 }, hasTouch: browserName !== "firefox", reducedMotion: "reduce" });
  const page = await context.newPage();
  try {
    await open(page, "dark");
    const trigger = page.getByRole("button", { name: "メニュー", exact: true });
    if (browserName === "firefox") await trigger.click(); else await trigger.tap();
    const sheet = page.getByRole("dialog", { name: "メニュー", exact: true });
    await expect(sheet).toBeVisible();
    expect(await sheet.evaluate(element => getComputedStyle(element).animationDuration)).toBe("0s");
    for (let n = 0; n < 18; n++) await page.keyboard.press("Tab");
    expect(await sheet.evaluate(element => element.contains(document.activeElement))).toBe(true);
    await sheet.getByRole("combobox", { name: "言語" }).click();
    await page.getByRole("option", { name: "한국어", exact: true }).click();
    const relabeledSheet = page.getByRole("dialog", { name: "메뉴", exact: true });
    await expect(relabeledSheet).toBeVisible();
    await expect(relabeledSheet.getByRole("link", { name: "블로그", exact: true })).toBeVisible();
    await expect(relabeledSheet.getByRole("combobox", { name: "언어" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(relabeledSheet).toBeHidden();
    await expect(page.getByRole("button", { name: "메뉴", exact: true })).toBeFocused();
  } finally { await context.close(); }
});

test("theme control changes the document theme and Japanese application omits unsupported locale UI", async ({ page }) => {
  await open(page, "light", "japanese-application");
  await expect(page.getByRole("combobox")).toHaveCount(0);
  const theme = page.getByRole("button", { name: "ダークテーマに切り替える", exact: true });
  await expect(theme).toBeEnabled();
  await theme.click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.getByRole("button", { name: "ライトテーマに切り替える", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "アカウントメニュー", exact: true }).click();
  await page.getByRole("menuitem", { name: "ログアウト", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Application session callback");
  // Provider synchronization must not reset the user's selection after its own effect runs.
  await page.waitForTimeout(250);
  await expect(page.locator("html")).toHaveClass(/dark/);
});

test("blocked decorative images preserve visible catalog links and descriptions", async ({ page }) => {
  await page.route("https://naeil.dev/images/*.png", route => route.abort());
  await open(page);
  const trigger = page.getByRole("button", { name: "プロジェクト", exact: true });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const panel = page.locator('[data-slot="navigation-popover"]');
  await expect(panel.getByRole("link", { name: /naeil-ui/ })).toBeVisible();
  await expect(panel.getByText("ミニマルデザインシステム — OKLCHトークン、Tailwind v4、shadcn", { exact: true })).toBeVisible();
  for (const path of projects) await expect(panel.locator(`a[href="/${path}"]`)).toBeVisible();
  await panel.locator('a[href="/design"]').click();
  await expect(page.getByRole("status")).toHaveText("/design");
});

test("actual whole-header Docs loads the public composition", async ({ page }) => {
  await page.goto("/?path=/docs/brand-naeilheader--docs");
  const frame = page.frameLocator("#storybook-preview-iframe");
  await expect(frame.locator(".sbdocs-content")).toContainText("complete React-only naeil header");
  await expect(frame.locator("[data-naeil-header]").first()).toBeVisible();
});
