# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: naeil-header.spec.ts >> whole header catalog, frame and accessibility light 768
- Location: e2e/naeil-header.spec.ts:28:3

# Error details

```
Error: expect(received).toBeGreaterThanOrEqual(expected)

Expected: >= 44
Received:    40
```

# Page snapshot

```yaml
- generic:
  - generic:
    - banner [aria-hidden]:
      - generic:
        - generic:
          - generic:
            - link:
              - /url: /
          - button [expanded]
    - main [aria-hidden]:
      - heading [level=1]: .naeil
      - paragraph: Shared website header
  - dialog [ref=e2]:
    - generic [ref=e3]:
      - heading "メニュー" [level=2] [ref=e4]
      - button "メニューを閉じる" [active] [ref=e5]
    - navigation "メインナビゲーション" [ref=e9]:
      - region "プロジェクト" [ref=e10]:
        - heading "プロジェクト" [level=3] [ref=e11]
        - link "Content Collector RSS、YouTube、Redditの自動収集 + AI要約" [ref=e12]:
          - /url: /cc
          - generic [ref=e15]:
            - generic [ref=e16]: Content Collector
            - generic [ref=e18]: RSS、YouTube、Redditの自動収集 + AI要約
        - link "PKM 準備中 個人ナレッジ管理 — ドキュメント解析、埋め込み、セマンティック検索" [ref=e19]:
          - /url: /pkm
          - generic [ref=e22]:
            - generic [ref=e23]:
              - generic [ref=e24]: PKM
              - generic [ref=e25]: 準備中
            - generic [ref=e26]: 個人ナレッジ管理 — ドキュメント解析、埋め込み、セマンティック検索
        - link "naeil-ui ミニマルデザインシステム — OKLCHトークン、Tailwind v4、shadcn" [ref=e27]:
          - /url: /design
          - generic [ref=e30]:
            - generic [ref=e31]: naeil-ui
            - generic [ref=e33]: ミニマルデザインシステム — OKLCHトークン、Tailwind v4、shadcn
        - link "Sustainability Analyzer ESGレポートAI分析 — PDF解析、定性評価、比較表の自動生成" [ref=e34]:
          - /url: /sa
          - generic [ref=e37]:
            - generic [ref=e38]: Sustainability Analyzer
            - generic [ref=e40]: ESGレポートAI分析 — PDF解析、定性評価、比較表の自動生成
        - link "Baby Agent 準備中 育児AIエージェント — LINE Q&A、記録、リマインダー" [ref=e41]:
          - /url: /baby-agent
          - generic [ref=e44]:
            - generic [ref=e45]:
              - generic [ref=e46]: Baby Agent
              - generic [ref=e47]: 準備中
            - generic [ref=e48]: 育児AIエージェント — LINE Q&A、記録、リマインダー
      - link "ブログ" [ref=e49]:
        - /url: /blog
    - generic [ref=e54]:
      - button "ダークテーマに切り替える" [ref=e55] [cursor=pointer]
      - combobox "言語" [ref=e56]:
        - generic: JA
      - button "Example session" [ref=e60] [cursor=pointer]
```

# Test source

```ts
  1   | import { test, expect, type Page, type TestInfo } from "@playwright/test";
  2   | import AxeBuilder from "@axe-core/playwright";
  3   | import { mkdirSync, writeFileSync } from "node:fs";
  4   | 
  5   | const evidence = "docs/evidence/shared-naeil-header-2026-10-15/storybook";
  6   | const projects = ["cc", "pkm", "design", "sa", "baby-agent"];
  7   | 
  8   | async function open(page: Page, theme = "light", story = "usage") {
  9   |   await page.goto(`/iframe.html?id=brand-naeilheader--${story}&viewMode=story&globals=theme:${theme};a11y.manual:!true`);
  10  |   await expect(page.locator("[data-naeil-header]")).toBeVisible();
  11  |   await expect(page.locator("html")).toHaveClass(new RegExp(theme));
  12  |   await page.evaluate(() => document.fonts.ready);
  13  | }
  14  | 
  15  | async function settled(page: Page) {
  16  |   await page.evaluate(() => Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {}))));
  17  | }
  18  | 
  19  | async function audit(page: Page, selector: string, info: TestInfo) {
  20  |   const builder = new AxeBuilder({ page }).include(selector);
  21  |   if (await page.locator('[data-slot="navigation-popover"]').count()) builder.include('[data-slot="navigation-popover"]');
  22  |   const result = await builder.analyze();
  23  |   const path = info.outputPath("axe.json");
  24  |   writeFileSync(path, JSON.stringify(result, null, 2));
  25  |   await info.attach("Raw axe result including incompletes", { path, contentType: "application/json" });
  26  |   expect(result.violations).toEqual([]);
  27  | }
  28  | 
  29  | for (const theme of ["light", "dark"]) for (const width of [390, 768, 1440, 2560]) {
  30  |   test(`whole header catalog, frame and accessibility ${theme} ${width}`, async ({ page, browserName }, info) => {
  31  |     await page.setViewportSize({ width, height: 900 });
  32  |     await open(page, theme);
  33  |     const header = page.locator("[data-naeil-header]");
  34  |     const frame = header.locator(".ui-navigation-frame");
  35  |     const geometry = await frame.evaluate(element => {
  36  |       const rect = element.getBoundingClientRect();
  37  |       return { x: rect.x, width: rect.width, gutter: getComputedStyle(element).paddingInlineStart };
  38  |     });
  39  |     expect(geometry.width).toBe(Math.min(1280, width));
  40  |     expect(geometry.x).toBe((width - Math.min(1280, width)) / 2);
  41  |     expect(geometry.gutter).toBe("24px");
  42  |     expect(await header.evaluate(element => getComputedStyle(element).position)).toBe("fixed");
  43  |     const mobile = width < 816;
  44  |     const trigger = page.getByRole("button", { name: mobile ? "メニュー" : "プロジェクト", exact: true });
  45  |     await trigger.focus();
  46  |     await page.keyboard.press("Enter");
  47  |     const panel = page.locator(mobile ? '[data-slot="navigation-sheet"]' : '[data-slot="navigation-popover"]');
  48  |     await expect(panel).toBeVisible();
  49  |     await settled(page);
  50  |     expect(await panel.locator(".ui-navigation-menu-grid").count()).toBe(mobile ? 0 : 1);
  51  |     if (!mobile) expect(await panel.locator(".ui-navigation-menu-grid").evaluate(element => getComputedStyle(element).gridTemplateColumns.split(" ").length)).toBe(2);
  52  |     const links = panel.locator("a");
  53  |     for (const path of projects) await expect(panel.locator(`a[href="/${path}"]`)).toBeVisible();
  54  |     await expect(panel.getByText("準備中", { exact: true })).toHaveCount(2);
  55  |     for (const image of await panel.locator("img").all()) {
  56  |       await expect(image).toHaveAttribute("src", /^https:\/\/naeil.dev\/images\/(coral|jellyfish|whale|fish|turtle)\.png$/);
  57  |       await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
  58  |     }
  59  |     expect(await panel.locator("img").count()).toBe(5);
> 60  |     for (const control of await panel.locator("a,button").all()) {
      |                                                                                      ^ Error: expect(received).toBeGreaterThanOrEqual(expected)
  61  |       const rect = await control.boundingBox();
  62  |       if (rect) { expect(rect.width).toBeGreaterThanOrEqual(44); expect(rect.height).toBeGreaterThanOrEqual(44); }
  63  |     }
  64  |     expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  65  |     await audit(page, mobile ? '[data-slot="navigation-sheet"]' : "#storybook-root", info);
  66  |     mkdirSync(evidence, { recursive: true });
  67  |     await page.screenshot({ path: `${evidence}/${browserName}-${theme}-${width}-menu.png`, animations: "disabled" });
  68  |     await links.first().focus();
  69  |     await page.keyboard.press("Escape");
  70  |     await expect(panel).toBeHidden();
  71  |     await expect(trigger).toBeFocused();
  72  |     await page.screenshot({ path: `${evidence}/${browserName}-${theme}-${width}-header.png`, animations: "disabled" });
  73  |   });
  74  | }
  75  | 
  76  | test("desktop hover bridges the portal gap and keyboard navigation intercepts the selected destination", async ({ page }) => {
  77  |   await open(page);
  78  |   const brand = page.locator("[data-app-brand]");
  79  |   const trigger = page.getByRole("button", { name: "プロジェクト", exact: true });
  80  |   const panel = page.locator('[data-slot="navigation-popover"]');
  81  |   await brand.focus();
  82  |   await trigger.hover();
  83  |   await expect(panel).toBeVisible();
  84  |   await expect(brand).toBeFocused();
  85  |   const from = (await trigger.boundingBox())!;
  86  |   const to = (await panel.boundingBox())!;
  87  |   await page.mouse.move(from.x + 20, (from.y + from.height + to.y) / 2);
  88  |   await panel.getByRole("link").first().hover();
  89  |   await page.waitForTimeout(250);
  90  |   await expect(panel).toBeVisible();
  91  |   await page.mouse.move(1200, 700);
  92  |   await expect(panel).toBeHidden();
  93  |   await trigger.focus();
  94  |   await page.keyboard.press("Enter");
  95  |   await panel.locator('a[href="/design"]').focus();
  96  |   await page.keyboard.press("Enter");
  97  |   await expect(panel).toBeHidden();
  98  |   await expect(page.getByRole("status")).toHaveText("/design");
  99  |   await trigger.focus();
  100 |   await page.keyboard.press("Enter");
  101 |   await expect(panel.locator('a[href="/design"]')).toHaveAttribute("aria-current", "page");
  102 | });
  103 | 
  104 | test("mobile touch, focus trap, locale selection and reduced-motion dismissal", async ({ browser, browserName }) => {
  105 |   const context = await browser.newContext({ baseURL: "http://127.0.0.1:6007", viewport: { width: 390, height: 900 }, hasTouch: browserName !== "firefox", reducedMotion: "reduce" });
  106 |   const page = await context.newPage();
  107 |   try {
  108 |     await open(page, "dark");
  109 |     const trigger = page.getByRole("button", { name: "メニュー", exact: true });
  110 |     if (browserName === "firefox") await trigger.click(); else await trigger.tap();
  111 |     const sheet = page.getByRole("dialog", { name: "メニュー", exact: true });
  112 |     await expect(sheet).toBeVisible();
  113 |     expect(await sheet.evaluate(element => getComputedStyle(element).animationDuration)).toBe("0s");
  114 |     for (let n = 0; n < 18; n++) await page.keyboard.press("Tab");
  115 |     expect(await sheet.evaluate(element => element.contains(document.activeElement))).toBe(true);
  116 |     await sheet.getByRole("combobox", { name: "言語" }).click();
  117 |     await page.getByRole("option", { name: "한국어", exact: true }).click();
  118 |     const relabeledSheet = page.getByRole("dialog", { name: "메뉴", exact: true });
  119 |     await expect(relabeledSheet).toBeVisible();
  120 |     await expect(relabeledSheet.getByRole("link", { name: "블로그", exact: true })).toBeVisible();
  121 |     await expect(relabeledSheet.getByRole("combobox", { name: "언어" })).toBeFocused();
  122 |     await page.keyboard.press("Escape");
  123 |     await expect(relabeledSheet).toBeHidden();
  124 |     await expect(page.getByRole("button", { name: "메뉴", exact: true })).toBeFocused();
  125 |   } finally { await context.close(); }
  126 | });
  127 | 
  128 | test("theme control changes the document theme and Japanese application omits unsupported locale UI", async ({ page }) => {
  129 |   await open(page, "light", "japanese-application");
  130 |   await expect(page.getByRole("combobox")).toHaveCount(0);
  131 |   const theme = page.getByRole("button", { name: "ダークテーマに切り替える", exact: true });
  132 |   await expect(theme).toBeEnabled();
  133 |   await theme.click();
  134 |   await expect(page.locator("html")).toHaveClass(/dark/);
  135 |   await expect(page.getByRole("button", { name: "ライトテーマに切り替える", exact: true })).toBeEnabled();
  136 |   await page.getByRole("button", { name: "Example session", exact: true }).click();
  137 |   await expect(page.getByRole("status")).toHaveText("Application session callback");
  138 | });
  139 | 
  140 | test("blocked decorative images preserve visible catalog links and descriptions", async ({ page }) => {
  141 |   await page.route("https://naeil.dev/images/*.png", route => route.abort());
  142 |   await open(page);
  143 |   const trigger = page.getByRole("button", { name: "プロジェクト", exact: true });
  144 |   await trigger.focus();
  145 |   await page.keyboard.press("Enter");
  146 |   const panel = page.locator('[data-slot="navigation-popover"]');
  147 |   await expect(panel.getByRole("link", { name: /Content Collector/ })).toBeVisible();
  148 |   await expect(panel.getByText("RSS、YouTube、Redditの自動収集 + AI要約", { exact: true })).toBeVisible();
  149 |   for (const path of projects) await expect(panel.locator(`a[href="/${path}"]`)).toBeVisible();
  150 |   await panel.locator('a[href="/cc"]').click();
  151 |   await expect(page.getByRole("status")).toHaveText("/cc");
  152 | });
  153 | 
  154 | test("actual whole-header Docs loads the public composition", async ({ page }) => {
  155 |   await page.goto("/?path=/docs/brand-naeilheader--docs");
  156 |   const frame = page.frameLocator("#storybook-preview-iframe");
  157 |   await expect(frame.locator(".sbdocs-content")).toContainText("complete React-only naeil header");
  158 |   await expect(frame.locator("[data-naeil-header]").first()).toBeVisible();
  159 | });
  160 | 
```