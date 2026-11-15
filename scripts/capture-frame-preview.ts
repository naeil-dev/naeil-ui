/** Read-only review of the built site; images and receipts stay out of git. */
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium, firefox, webkit } from "@playwright/test";
const origin = process.argv[2] || "http://127.0.0.1:6186";
const output = process.argv[3] || "/tmp/naeil-0170-preview";
mkdirSync(output, { recursive: true });
const browser = await chromium.launch();
const rows: unknown[] = [];
try {
  for (const locale of ["ko", "ja", "en"]) for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    for (const [length, route] of [["short", "projects"], ["long", "design"]]) {
      const page = await browser.newPage({ viewport, colorScheme: "dark", reducedMotion: "reduce" });
      const requests: string[] = []; page.on("request", r => requests.push(r.url()));
      try {
        const response = await page.goto(`${origin}/${locale}/${route}`);
        assert.equal(response?.status(), 200);
        await page.locator("main h1").waitFor(); await page.evaluate(() => document.fonts.ready);
        const result = await page.evaluate(() => {
          const main = document.querySelector("main")!, footer = document.querySelector("footer")!;
          const box = footer.getBoundingClientRect();
          return { frameCount: document.querySelectorAll(".ui-service-shell[data-naeil-shell]").length,
            theme: document.documentElement.className, title: document.title, bodyLineHeight: getComputedStyle(document.body).lineHeight,
            viewportGap: innerHeight - box.bottom, footerTop: box.top, footerBottom: box.bottom,
            mainPaddingBottom: getComputedStyle(main).paddingBottom, contentFooter: box.top - main.lastElementChild!.getBoundingClientRect().bottom,
            overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth };
        });
        assert.equal(result.frameCount, 1); assert.equal(result.theme, "dark"); assert.equal(result.bodyLineHeight, "25px"); assert.equal(result.overflow, false);
        if (length === "short") assert.equal(result.viewportGap, 0); else assert(result.footerBottom > viewport.height);
        const delivery = await page.evaluate(() => {
          const sheets = new Set<string>(), files = new Set<string>();
          for (const sheet of document.styleSheets) if (sheet.href) {
            const rules = [...sheet.cssRules];
            for (let i = 0; i < rules.length; i++) {
              const rule = rules[i];
              if (rule instanceof CSSFontFaceRule && rule.style.fontFamily.includes("Noto Sans JP")) {
                sheets.add(sheet.href);
                for (const match of rule.style.getPropertyValue("src").matchAll(/url\(["']?([^"')]+)["']?\)/g)) files.add(new URL(match[1], sheet.href).href);
              } else if ("cssRules" in rule) rules.push(...(rule as CSSGroupingRule).cssRules);
            }
          }
          return { japaneseStylesheets: [...sheets], japaneseFiles: [...files] };
        });
        const japaneseFontFiles = requests.filter(url => delivery.japaneseFiles.includes(url));
        assert(delivery.japaneseStylesheets.length <= 1);
        if (locale === "ko") assert.equal(japaneseFontFiles.length, 0);
        if (length === "long") assert(Math.abs(result.contentFooter - 96) < 0.01);
        const name = `${length}-${locale}-${viewport.width}`;
        await page.screenshot({ path: join(output, `${name}-viewport.png`) });
        await page.screenshot({ path: join(output, `${name}-full.png`), fullPage: true });
        await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
        await page.screenshot({ path: join(output, `${name}-footer.png`) });
        rows.push({ url: page.url(), locale, viewport, length, auth: "signed-out", browser: browser.version(), ...result,
          fontStylesheets: requests.filter(url => /\.css(?:\?|$)/.test(url)), japaneseStylesheets: delivery.japaneseStylesheets, japaneseFontFiles });
        if (locale === "ja" && length === "long" && viewport.width === 1440) {
          const sample = page.locator("p.font-normal").filter({ hasText: "400 Regular" }).first();
          await sample.scrollIntoViewIfNeeded();
          await sample.screenshot({ path: join(output, "japanese-latin-digits-closeup.png"), scale: "css" });
          const cdp = await page.context().newCDPSession(page); await cdp.send("DOM.enable"); await cdp.send("CSS.enable");
          const { root } = await cdp.send("DOM.getDocument");
          const { nodeId } = await cdp.send("DOM.querySelector", { nodeId: root.nodeId, selector: "p.font-normal" });
          rows.push({ japaneseCloseup: true, text: await sample.innerText(), fonts: (await cdp.send("CSS.getPlatformFontsForNode", { nodeId })).fonts });
        }
      } finally { await page.close(); }
    }
    const page = await browser.newPage({ viewport, colorScheme: "dark" });
    try {
      await page.goto(`${origin}/${locale}/blog/missing-post-0170`);
      await page.locator("[data-site-not-found]").waitFor();
      assert.equal(await page.locator("[data-naeil-shell]").count(), 1);
      assert.equal(await page.locator("[data-naeil-header]").count(), 1);
      assert.equal(await page.locator("[data-naeil-footer]").count(), 1);
      const home = locale === "en" ? "/" : `/${locale}`;
      assert(await page.locator(`[data-site-not-found] a[href='${home}']`).isVisible());
      assert.equal(await page.locator("html").getAttribute("class"), "dark");
      await page.screenshot({ path: join(output, `not-found-${locale}-${viewport.width}.png`) });
      rows.push({ notFound: true, locale, viewport, url: page.url(), title: await page.title(), theme: "dark", frameCount: 1, returnHref: home });
    } finally { await page.close(); }
  }
  const page = await browser.newPage({ colorScheme: "dark" });
  try {
    const response = await page.goto(`${origin}/ja/no-such-route-0170`);
    const colours = await page.locator("body").evaluate(e => { const c = getComputedStyle(e); return { background: getComputedStyle(document.documentElement).backgroundColor, color: c.color, family: c.fontFamily, lineHeight: c.lineHeight }; });
    assert.equal(colours.background, "rgb(11, 12, 14)"); assert.equal(colours.color, "rgb(239, 240, 243)");
    assert.match(colours.family, /Pretendard/); assert(await page.locator('a[href="/ja"]').isVisible());
    await page.screenshot({ path: join(output, "locale-fallback-error-dark.png") });
    rows.push({ localeFallback: true, url: page.url(), status: response?.status(), ...colours, returnLinks: await page.locator("a").evaluateAll(es => es.map(e => e.getAttribute("href"))) });
  } finally { await page.close(); }
  // Preserve the site's viewport-wide artwork while main keeps its 1600px cap.
  for (const [engine, browserType] of Object.entries({ chromium, firefox, webkit })) {
    const landingBrowser = await browserType.launch();
    try {
      for (const width of [390, 1440, 2560]) {
        const viewport = { width, height: width === 390 ? 844 : 900 };
        const page = await landingBrowser.newPage({ viewport, colorScheme: "dark", reducedMotion: "reduce" });
        try {
          await page.goto(`${origin}/`);
          await page.locator("main section[data-active]").waitFor();
          await page.evaluate(() => document.fonts.ready);
          const result = await page.evaluate(() => {
            const hero = document.querySelector("main section[data-active]")!.getBoundingClientRect();
            return { heroX: hero.x, heroY: hero.y, heroWidth: hero.width, heroHeight: hero.height,
              available: document.documentElement.getBoundingClientRect().width, mainWidth: document.querySelector("main")!.getBoundingClientRect().width,
              overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth };
          });
          assert(Math.abs(result.heroX) < 0.01 && Math.abs(result.heroY) < 0.01);
          assert(Math.abs(result.heroWidth - result.available) < 0.01);
          assert(Math.abs(result.heroHeight - viewport.height) < 0.01);
          assert(result.mainWidth <= 1600 && !result.overflow);
          await page.screenshot({ path: join(output, `landing-${engine}-${width}.png`) });
          await page.evaluate(() => scrollTo(0, 200));
          assert(Math.abs(await page.locator("header").evaluate(e => e.getBoundingClientRect().top)) < 0.01);
          rows.push({ landing: true, engine, browser: landingBrowser.version(), viewport, url: page.url(), auth: "signed-out", ...result });
        } finally { await page.close(); }
      }
    } finally { await landingBrowser.close(); }
  }
} finally {
  writeFileSync(join(output, "measurements.json"), JSON.stringify(rows, null, 2));
  await browser.close();
}
console.log(`Captured ${rows.length} site measurements in ${output}`);
