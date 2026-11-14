import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

for (const service of ["abstorm", "home", "estimate", "jev"]) for (const locale of ["ko", "ja", "en"]) for (const width of [1440, 390]) for (const colorScheme of ["light", "dark"] as const) {
  test(`shell rhythm ${service}/${locale}/${width}/OS-${colorScheme}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ colorScheme });
    // Each test has a fresh context: no theme storage, even when the OS prefers light.
    await page.goto(`/iframe.html?id=brand-naeilserviceshell--${service}&viewMode=story&shellLocale=${locale}`);
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.locator("main h1")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const values = await page.evaluate(() => {
      const box = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
      const header = box("[data-naeil-header]"), title = box("main h1"), description = box(".ui-page-description");
      const pageHeader = box(".ui-page-header"), content = box("[data-shell-content]"), footer = box("[data-naeil-footer]");
      const titleStyle = getComputedStyle(document.querySelector("main h1")!);
      return { headerTitle: title.top - header.bottom, titleDescription: description.top - title.bottom,
        headerContent: content.top - pageHeader.bottom, contentFooter: footer.top - content.bottom,
        fontSize: titleStyle.fontSize, lineHeight: titleStyle.lineHeight, weight: titleStyle.fontWeight,
        body: getComputedStyle(document.body).fontSize, lang: document.documentElement.lang,
        theme: document.documentElement.className, stored: localStorage.getItem("theme"),
        overflow: document.documentElement.scrollWidth > document.documentElement.getBoundingClientRect().width,
      };
    });
    expect(values).toMatchObject({ headerTitle: 48, titleDescription: 12, headerContent: 32, contentFooter: 96,
      fontSize: "32px", lineHeight: "42px", weight: "600", body: "16px", lang: locale, theme: "dark", stored: null, overflow: false });
    const path = info.outputPath("measurements.json"); mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, JSON.stringify(values, null, 2));
    if (service === "estimate" && locale === "ko" && colorScheme === "light") {
      await page.screenshot({ path: info.outputPath(width === 1440 ? "desktop.png" : "mobile.png"), fullPage: true });
    }
  });
}

test("skip link focuses main, theme changes persist, and shared account works", async ({ page }) => {
  await page.goto('/iframe.html?id=brand-naeilserviceshell--home&viewMode=story&shellLocale=en');
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.keyboard.press("Tab");
  await expect(page.locator('.ui-skip-link')).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator('main')).toBeFocused();
  await page.getByRole('button', { name: 'Switch to light theme', exact: true }).click();
  await expect(page.locator('html')).toHaveClass(/light/);
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/light/);
  await page.locator('[data-naeil-account-trigger]').click();
  await page.getByRole('menuitem', { name: 'Log out', exact: true }).click();
  await expect(page.locator('main [role="status"]')).toHaveText('Signed out');
  await expect(page.locator('[data-app-toolbar] a[href="/login"]')).toBeVisible();
});

test("recorded Home login has no footer and anonymous mobile chrome", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto('/iframe.html?id=brand-naeilserviceshell--home&viewMode=story&shellLocale=ja&shellAuth=out&noFooter');
  await expect(page.locator('main')).toBeVisible();
  await expect(page.locator('footer')).toHaveCount(0);
  await page.locator('.ui-navigation-toggle').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('link', { name: 'ログイン', exact: true })).toBeVisible();
});
