import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync } from "node:fs";

test("hover can replace a keyboard-opened group without focus dismissing the new group", async ({ page }) => {
  await page.goto("/iframe.html?id=ui-navigation--multiple-groups&viewMode=story&globals=theme:light;a11y.manual:!true");
  const projects = page.getByRole("button", { name: "Projects", exact: true });
  const resources = page.getByRole("button", { name: "Resources", exact: true });
  await projects.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("link", { name: "Project overview" })).toBeVisible();
  // Radix can initially focus the panel instead of its links. Establish a
  // focused-link starting state explicitly to exercise group replacement.
  await page.getByRole("link", { name: "Project overview" }).focus();
  await expect(page.getByRole("link", { name: "Project overview" })).toBeFocused();
  await resources.hover();
  await page.waitForTimeout(350);
  await expect(resources).toHaveAttribute("aria-expanded", "true");
  await expect(projects).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("link", { name: "Guide", exact: true }).hover();
  await expect(resources).toHaveAttribute("aria-expanded", "true");
  await page.mouse.move(1200, 700);
  await expect(resources).toHaveAttribute("aria-expanded", "false");
});

test("desktop hover preserves focus and the path into the menu", async ({ page }) => {
  await page.goto("/iframe.html?id=ui-navigation--usage&viewMode=story&globals=theme:light;a11y.manual:!true");
  const trigger = page.getByRole("button", { name: "프로젝트", exact: true });
  const panel = page.locator('[data-slot="navigation-popover"]');
  const brand = page.locator(".ui-navigation-brand a");
  await brand.focus();
  await trigger.hover();
  await expect(panel).toBeVisible();
  await expect(brand).toBeFocused();
  const buttonBox = (await trigger.boundingBox())!;
  const panelBox = (await panel.boundingBox())!;
  // Cross the real portal gap, then remain on a menu link beyond the close grace.
  await page.mouse.move(buttonBox.x + 20, (buttonBox.y + buttonBox.height + panelBox.y) / 2);
  await panel.getByRole("link").first().hover();
  await page.waitForTimeout(350);
  await expect(panel).toBeVisible();
  await page.mouse.move(1200, 700);
  await expect(panel).toBeHidden();
  await expect(brand).toBeFocused();
  await trigger.hover();
  await expect(panel).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  await page.waitForTimeout(350);
  await expect(panel).toBeHidden();
  await expect(brand).toBeFocused();
});

test("mouse click still closes on leave while keyboard keeps the menu open", async ({ page }) => {
  await page.goto("/iframe.html?id=ui-navigation--home&viewMode=story&globals=theme:dark;a11y.manual:!true");
  const trigger = page.getByRole("button", { name: "AI", exact: true });
  const panel = page.locator('[data-slot="navigation-popover"]');
  await trigger.hover();
  await expect(panel).toBeVisible();
  await trigger.click();
  await expect(panel).toBeVisible();
  await page.mouse.move(1200, 700);
  await expect(panel).toBeHidden();
  await trigger.focus();
  await trigger.hover();
  await expect(panel).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(panel.getByRole("link").first()).toBeFocused();
  await page.mouse.move(1200, 700);
  await page.waitForTimeout(350);
  await expect(panel).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await trigger.hover();
  await expect(panel).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(panel).toBeHidden();
  // Click without re-entering: this must also close when the mouse leaves.
  await trigger.click();
  await expect(panel).toBeVisible();
  await page.mouse.move(1200, 700);
  await expect(panel).toBeHidden();
});

for (const theme of ["light", "dark"]) for (const width of [390, 1440, 2560]) {
  test(`shared navigation/footer ${theme} ${width}`, async ({ page, browserName }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/iframe.html?id=ui-navigation--home&viewMode=story&globals=theme:${theme};a11y.manual:!true`);
    await expect(page.locator("html")).toHaveClass(new RegExp(theme));
    const header = page.locator('[data-slot="navigation"]');
    await expect(header).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const before = await header.locator(".ui-navigation-brand").boundingBox();
    const mobile = width === 390;
    const trigger = page.getByRole("button", { name: mobile ? "메뉴" : "AI", exact: true });
    await trigger.focus();
    await page.keyboard.press("Enter");
    const region = mobile ? page.getByRole("dialog", { name: "메뉴" }) : page.locator(".ui-navigation-popover");
    await expect(region).toBeVisible();
    // Inspect final rendered colors after the shared 120ms opacity entrance.
    await page.evaluate(() => Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {}))));
    await expect(region.getByRole("link", { name: /대시보드/ })).toHaveAttribute("aria-current", "page");
    const menuAudit = new AxeBuilder({ page }).include(mobile ? ".ui-navigation-sheet" : "#storybook-root");
    if (!mobile) menuAudit.include(".ui-navigation-popover");
    expect((await menuAudit.analyze()).violations).toEqual([]);
    if (mobile) {
      // Radix keeps focus in the sheet and all navigation links meet the touch floor.
      for (let n = 0; n < 12; n++) await page.keyboard.press("Tab");
      expect(await region.evaluate(element => element.contains(document.activeElement))).toBe(true);
      const targets = await region.locator("a,button").evaluateAll(elements => elements.filter(element => element.getBoundingClientRect().width).map(element => ({ text: element.textContent, height: element.getBoundingClientRect().height, width: element.getBoundingClientRect().width })));
      for (const target of targets) { expect(target.height, target.text ?? "control").toBeGreaterThanOrEqual(44); expect(target.width).toBeGreaterThanOrEqual(44); }
    }
    await page.keyboard.press("Escape");
    await expect(region).toBeHidden();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await region.getByRole("link", { name: /API 키/ }).click();
    await expect(page.getByRole("heading", { name: "API 키", exact: true })).toBeVisible();
    await expect(region).toBeHidden();
    expect(await header.locator(".ui-navigation-brand").boundingBox()).toEqual(before);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > Math.ceil(document.documentElement.getBoundingClientRect().width))).toBe(false);
    await expect(page.locator('footer[data-slot="site-footer"]')).toBeVisible();
    expect((await new AxeBuilder({ page }).include("#storybook-root").analyze()).violations).toEqual([]);
    mkdirSync("test-results/navigation", { recursive: true });
    await page.screenshot({ path: `test-results/navigation/${browserName}-${theme}-${width}.png`, fullPage: true });
    if (mobile) {
      await trigger.click();
      await expect(region).toBeVisible();
      await page.screenshot({ path: `test-results/navigation/${browserName}-${theme}-${width}-menu.png`, animations: "disabled" });
      await page.setViewportSize({ width: 1440, height: 900 });
      await expect(region).toBeHidden();
      await expect(page.getByRole("button", { name: "AI", exact: true })).toBeFocused();
    }
  });
}

test("long labels, English and reduced motion", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/iframe.html?id=ui-navigation--long-labels&viewMode=story&globals=theme:light;a11y.manual:!true");
  await page.getByRole("button", { name: "메뉴", exact: true }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("link", { name: /팀과 서비스별/ })).toBeVisible();
  expect(await sheet.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  expect(await sheet.evaluate(element => getComputedStyle(element).animationDuration)).toBe("0s");
  await sheet.getByRole("button", { name: /Change language/ }).click();
  await page.getByRole("menuitem", { name: /English/ }).click();
  await expect(page.getByRole("dialog", { name: "Menu", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close menu", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
});
