import { test, expect } from "@playwright/test";
import { fixtureURL } from "../scripts/chrome-fixture-config";

for (const css of ["globals", "split"]) for (const locale of ["ko", "ja", "en"]) for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`frame contract ${css}/${locale}/${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    for (const mode of ["short", "long", "noFooter"]) {
      await page.goto(`${fixtureURL}/candidate/shell.html?css=${css}&locale=${locale}&${mode}`);
      await expect(page.locator("main h1")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator("body")).toHaveCSS("line-height", "25px");
      const result = await page.evaluate(() => {
        const frame = document.querySelector("[data-naeil-shell]")!;
        const main = frame.querySelector("main")!, footer = frame.querySelector("footer");
        return { frame: frame.getBoundingClientRect().height, bottom: footer?.getBoundingClientRect().bottom,
          gap: footer ? footer.getBoundingClientRect().top - main.lastElementChild!.getBoundingClientRect().bottom : null,
          mainBottom: main.getBoundingClientRect().bottom, overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth };
      });
      expect(result.overflow).toBe(false);
      if (mode === "long") { expect(result.frame).toBeGreaterThan(viewport.height); expect(result.gap).toBeCloseTo(96, 2); }
      else if (mode === "short") { expect(result.frame).toBeCloseTo(viewport.height, 2); expect(result.bottom).toBeCloseTo(viewport.height, 2); }
      else { expect(await page.locator("footer").count()).toBe(0); expect(result.mainBottom).toBeCloseTo(viewport.height, 2); }
    }
  });
}

test("Japanese body and chrome render Latin with Pretendard and Japanese with Noto", async ({ page, context, browserName }, info) => {
  test.skip(browserName !== "chromium", "CSS.getPlatformFontsForNode is a Chromium CDP API");
  await page.goto(`${fixtureURL}/candidate/shell.html?css=split&locale=ja`);
  await page.evaluate(() => document.fonts.ready);
  const cdp = await context.newCDPSession(page);
  await cdp.send("DOM.enable"); await cdp.send("CSS.enable");
  const { root } = await cdp.send("DOM.getDocument");
  const fonts = async (selector: string) => {
    const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector });
    const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId }); return fonts;
  };
  const latin = await fonts("[data-font-latin]"), japanese = await fonts("[data-font-japanese]"), footerLatin = await fonts(".ui-site-footer-description");
  expect(latin.length).toBeGreaterThan(0); expect(latin.every(f => /Pretendard/.test(f.familyName) && f.isCustomFont)).toBe(true);
  expect(japanese.length).toBeGreaterThan(0); expect(japanese.every(f => /Noto Sans JP/.test(f.familyName) && f.isCustomFont)).toBe(true);
  expect(footerLatin.every(f => /Pretendard/.test(f.familyName) && f.isCustomFont)).toBe(true);
  await info.attach("actual-platform-fonts", { body: JSON.stringify({ latin, japanese, footerLatin }, null, 2), contentType: "application/json" });
});

test("Korean page fetches no Japanese font file and only the one public font stylesheet", async ({ page }) => {
  const requested: string[] = [];
  page.on("request", r => requested.push(r.url()));
  await page.goto(`${fixtureURL}/candidate/shell.html?locale=ko`);
  await page.evaluate(() => document.fonts.ready);
  expect(requested.filter(url => /noto-sans-jp.*\.(woff2?|otf|ttf)/.test(url))).toEqual([]);
  expect(requested.filter(url => /fonts\.css/.test(url))).toHaveLength(1);
});

test("generic split consumers can explicitly override the shared body baseline", async ({ page }) => {
  await page.goto(`${fixtureURL}/candidate/shell.html?css=split&locale=en`);
  await page.addStyleTag({ content: "body { font-size: 18px; line-height: 2; font-family: serif; color: rgb(1, 2, 3); }" });
  await expect(page.locator("body")).toHaveCSS("line-height", "36px");
  await expect(page.locator("body")).toHaveCSS("font-family", "serif");
  await expect(page.locator("body")).toHaveCSS("color", "rgb(1, 2, 3)");
  await expect(page.locator("header")).toHaveCSS("font-size", "16px");
});
