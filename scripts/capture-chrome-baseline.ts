import assert from "node:assert/strict";
import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { chromium } from "@playwright/test";

// Explicit one-shot B2 capture. Never run from the normal gates or replace it.
const output = resolve(process.argv[2]);
assert(!existsSync(join(output, "receipt.json")), "Frozen B2 already exists; owner approval is required to replace it");
mkdirSync(output, { recursive: true });
const browser = await chromium.launch();
const receipt: unknown[] = [];
try {
  for (const locale of ["ko", "en", "ja"]) {
    const response = await fetch(`https://naeil.dev/${locale}`);
    assert(response.ok);
    const html = await response.text(); writeFileSync(join(output, `${locale}.html`), html);
    const deploymentId = html.match(/dpl_[A-Za-z0-9]+/)?.[0] || null;
    for (const width of [320, 390, 1440]) for (const theme of ["light", "dark"] as const) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme });
      const page = await context.newPage();
      try {
        await page.goto(`https://naeil.dev/${locale}`, { waitUntil: "domcontentloaded" });
        await page.locator("[data-naeil-header]").waitFor();
        await page.evaluate(async theme => { document.documentElement.classList.remove("light", "dark"); document.documentElement.classList.add(theme); await document.fonts.ready; await Promise.all(document.getAnimations().filter(a => a.effect?.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))); }, theme);
        const measured = await page.evaluate(() => ({
          dpr: devicePixelRatio, documentLanguage: document.documentElement.lang,
          version: document.querySelector("[data-naeil-header]")!.getAttribute("data-naeil-ui-version"),
          contract: document.querySelector("[data-naeil-header]")!.getAttribute("data-naeil-ui-contract"),
          fonts: [...document.fonts].map(f => ({ family: f.family, weight: f.weight, status: f.status })),
          elements: [...document.querySelectorAll("header, .ui-navigation-frame, header svg[data-naeil-brand], .naeil-header-controls, .naeil-header-controls > *, footer, .ui-site-footer-frame, .ui-site-footer-description, .ui-site-footer-label, .ui-site-footer-link")].map(e => { const r = e.getBoundingClientRect(), c = getComputedStyle(e); return { tag: e.tagName, class: e.className, box: { x: r.x, y: r.y, width: r.width, height: r.height }, styles: Object.fromEntries(["color", "background-color", "border-color", "font-family", "font-size", "font-weight", "line-height", "letter-spacing", "opacity", "-webkit-font-smoothing", "-moz-osx-font-smoothing"].map(p => [p, c.getPropertyValue(p)])) }; }),
        }));
        await page.screenshot({ path: join(output, `${locale}-${theme}-${width}.png`), fullPage: true });
        receipt.push({ capturedAt: new Date().toISOString(), url: page.url(), deploymentId, requestId: response.headers.get("x-vercel-id"), viewport: { width, height: 900 }, theme, auth: "signed-out", browser: browser.version(), ...measured });
      } finally { await context.close(); }
    }
  }
} finally {
  writeFileSync(join(output, "receipt.json"), JSON.stringify(receipt, null, 2));
  await browser.close();
}
