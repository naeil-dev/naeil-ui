// Scoped follow-up to the raw axe incompletes attached by naeil-header.spec.ts.
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { chromium, firefox, webkit, expect } from "@playwright/test";

const results = [];
const luminance = rgb => rgb.map(value => {
  const s = value / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
const rgb = value => {
  assert(/^rgb\(/.test(value), `Expected opaque sRGB for reviewed default theme: ${value}`);
  return value.match(/[\d.]+/g).map(Number);
};

for (const engine of [chromium, firefox, webkit]) {
  const browser = await engine.launch();
  try {
    for (const theme of ["light", "dark"]) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto(`http://127.0.0.1:6007/iframe.html?id=brand-naeilheader--usage&viewMode=story&globals=theme:${theme};a11y.manual:!true`);
      const trigger = page.getByRole("button", { name: "プロジェクト", exact: true });
      await trigger.focus();
      await trigger.press("Enter");
      const panel = page.locator('[data-slot="navigation-popover"]');
      await expect(panel).toBeVisible();
      await page.evaluate(() => Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {}))));
      const target = await trigger.evaluate(element => {
        const id = element.getAttribute("aria-controls"), controlled = document.getElementById(id);
        return { id, exists: !!controlled, role: controlled?.getAttribute("role"), expanded: element.getAttribute("aria-expanded") };
      });
      assert(target.exists && target.role === "dialog" && target.expanded === "true");
      const colors = await panel.evaluate(element => ({
        background: getComputedStyle(element).backgroundColor,
        descriptions: [...element.querySelectorAll(".ui-navigation-description")].map(node => getComputedStyle(node).color),
      }));
      const background = luminance(rgb(colors.background));
      const ratios = colors.descriptions.map(color => {
        const foreground = luminance(rgb(color));
        return (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05);
      });
      assert(ratios.length === 5 && ratios.every(ratio => ratio >= 4.5));
      results.push({ browser: engine.name(), theme, target, colors, ratios });
      await page.close();
    }
  } finally { await browser.close(); }
}
await writeFile(new URL("./incomplete-review.json", import.meta.url), JSON.stringify(results, null, 2) + "\n");
console.log("6 popup checks passed: live ARIA target and all description contrast pairs.");
