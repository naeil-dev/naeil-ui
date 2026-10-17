import { test, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { captureAccountRender } from "../scripts/account-render.mjs";

for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
  test(`independent account render ${width} ${theme}`, async ({ page, browserName }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`/iframe.html?id=brand-naeilheader--japanese-application&viewMode=story&globals=theme:${theme};a11y.manual:!true`);
    await expect(page.locator("html")).toHaveAttribute("lang", "ja");
    await expect(page.locator("html")).toHaveClass(new RegExp(theme));
    const fonts = await page.evaluate(async () => (await document.fonts.load('500 16px "Noto Sans JP"', 'アカウントログアウト')).length);
    expect(fonts).toBeGreaterThan(0);
    if (width === 390) await page.getByRole("button", { name: "メニュー", exact: true }).click();
    await page.getByRole("button", { name: "アカウントメニュー", exact: true }).click();
    const render = await captureAccountRender(page);
    expect(render.trigger.width).toBe("44px");
    expect(render.avatar.width).toBe("32px");
    expect(render.fontFamily).toBe("Noto Sans JP");
    const directory = "test-results/account-reference";
    mkdirSync(directory, { recursive: true });
    writeFileSync(`${directory}/${browserName}-${width}-${theme}.json`, JSON.stringify({ width, theme, locale: "ja", render }, null, 2));
    await page.screenshot({ path: `${directory}/${browserName}-${width}-${theme}.png`, animations: "disabled" });
  });
}
