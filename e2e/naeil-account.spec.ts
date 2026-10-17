import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
  test(`canonical account keyboard, busy, cancel and retry ${width} ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/iframe.html?id=brand-naeilheader--account-states&viewMode=story&globals=theme:${theme};a11y.manual:!true`);
    await expect(page.locator("html")).toHaveClass(new RegExp(theme));
    await expect(page.locator("html")).toHaveAttribute("lang", "ja");
    await page.evaluate(() => document.fonts.load('500 16px "Noto Sans JP"', 'アカウントログアウト'));
    const mobile = width === 390;
    if (mobile) await page.getByRole("button", { name: "メニュー", exact: true }).click();
    const trigger = page.getByRole("button", { name: "アカウントメニュー", exact: true });
    const rect = (await trigger.boundingBox())!;
    expect(rect.width).toBe(44);
    expect(rect.height).toBe(44);
    const avatar = trigger.locator(".naeil-header-account-avatar");
    expect((await avatar.boundingBox())!.width).toBe(32);
    await trigger.focus();
    await page.keyboard.press("Enter");
    const menu = page.locator("[data-naeil-account-menu]");
    await expect(menu).toBeVisible();
    await page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished.catch(() => {}))));
    await expect(menu.getByText("long-example-address@example.invalid")).toBeVisible();
    const bounds = (await menu.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    const audit = await new AxeBuilder({ page }).include("[data-naeil-account-menu]").analyze();
    expect(audit.violations).toEqual([]);
    await page.screenshot({ path: test.info().outputPath("account-menu.png"), animations: "disabled" });
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();

    for (const outcome of ["Cancel guarded action", "Fail session action"]) {
      await trigger.click();
      await page.getByRole("menuitem", { name: "ログアウト", exact: true }).click();
      await expect(trigger).toHaveAttribute("aria-busy", "true");
      await trigger.click();
      await expect(page.getByRole("menuitem", { name: "ログアウト中…", exact: true })).toBeDisabled();
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
      // Synthetic app resolves the request outside the open mobile navigation.
      if (mobile) await page.keyboard.press("Escape");
      await page.getByRole("button", { name: outcome, exact: true }).click();
      if (mobile) await page.getByRole("button", { name: "メニュー", exact: true }).click();
      await expect(trigger).not.toHaveAttribute("aria-busy", "true");
    }
    await trigger.click();
    await page.getByRole("menuitem", { name: "ログアウト", exact: true }).click();
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
    if (mobile) await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Complete session action", exact: true }).click();
    if (mobile) await page.getByRole("button", { name: "メニュー", exact: true }).click();
    await expect(page.getByRole("link", { name: "ログイン", exact: true })).toHaveAttribute("href", "/login?next=%2Feditor");
    await expect(trigger).toHaveCount(0);
  });
}
