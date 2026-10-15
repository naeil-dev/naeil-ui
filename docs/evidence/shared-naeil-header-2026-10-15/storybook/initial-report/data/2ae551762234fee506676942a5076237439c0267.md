# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: naeil-header.spec.ts >> theme control changes the document theme and Japanese application omits unsupported locale UI
- Location: e2e/naeil-header.spec.ts:126:1

# Error details

```
Error: expect(locator).toHaveClass(expected) failed

Locator: locator('html')
Expected pattern: /dark/
Received string:  "light"
Timeout: 5000ms

Call log:
  - Expect "toHaveClass" locator('html') with timeout 5000ms
  - waiting for locator('html')
    14 × locator resolved to <html lang="en" class="light" data-ui-density="comfortable">…</html>
       - unexpected value "light"

```

```yaml
- document:
  - banner
  - main
```

# Test source

```ts
  32  |     const frame = header.locator(".ui-navigation-frame");
  33  |     const geometry = await frame.evaluate(element => {
  34  |       const rect = element.getBoundingClientRect();
  35  |       return { x: rect.x, width: rect.width, gutter: getComputedStyle(element).paddingInlineStart };
  36  |     });
  37  |     expect(geometry.width).toBe(Math.min(1280, width));
  38  |     expect(geometry.x).toBe((width - Math.min(1280, width)) / 2);
  39  |     expect(geometry.gutter).toBe("24px");
  40  |     expect(await header.evaluate(element => getComputedStyle(element).position)).toBe("fixed");
  41  |     const mobile = width < 816;
  42  |     const trigger = page.getByRole("button", { name: mobile ? "メニュー" : "プロジェクト", exact: true });
  43  |     await trigger.focus();
  44  |     await page.keyboard.press("Enter");
  45  |     const panel = page.locator(mobile ? '[data-slot="navigation-sheet"]' : '[data-slot="navigation-popover"]');
  46  |     await expect(panel).toBeVisible();
  47  |     await settled(page);
  48  |     expect(await panel.locator(".ui-navigation-menu-grid").count()).toBe(mobile ? 0 : 1);
  49  |     if (!mobile) expect(await panel.locator(".ui-navigation-menu-grid").evaluate(element => getComputedStyle(element).gridTemplateColumns.split(" ").length)).toBe(2);
  50  |     const links = panel.locator("a");
  51  |     for (const path of projects) await expect(panel.locator(`a[href="/${path}"]`)).toBeVisible();
  52  |     await expect(panel.getByText("準備中", { exact: true })).toHaveCount(2);
  53  |     for (const image of await panel.locator("img").all()) {
  54  |       await expect(image).toHaveAttribute("src", /^https:\/\/naeil.dev\/images\/(coral|jellyfish|whale|fish|turtle)\.png$/);
  55  |       await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0)).toBe(true);
  56  |     }
  57  |     expect(await panel.locator("img").count()).toBe(5);
  58  |     for (const control of await panel.locator("a,button").all()) {
  59  |       const rect = await control.boundingBox();
  60  |       if (rect) { expect(rect.width).toBeGreaterThanOrEqual(44); expect(rect.height).toBeGreaterThanOrEqual(44); }
  61  |     }
  62  |     expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  63  |     await audit(page, mobile ? '[data-slot="navigation-sheet"]' : "#storybook-root", info);
  64  |     mkdirSync(evidence, { recursive: true });
  65  |     await page.screenshot({ path: `${evidence}/${browserName}-${theme}-${width}-menu.png`, animations: "disabled" });
  66  |     await links.first().focus();
  67  |     await page.keyboard.press("Escape");
  68  |     await expect(panel).toBeHidden();
  69  |     await expect(trigger).toBeFocused();
  70  |     await page.screenshot({ path: `${evidence}/${browserName}-${theme}-${width}-header.png`, animations: "disabled" });
  71  |   });
  72  | }
  73  | 
  74  | test("desktop hover bridges the portal gap and keyboard navigation intercepts the selected destination", async ({ page }) => {
  75  |   await open(page);
  76  |   const brand = page.locator("[data-app-brand]");
  77  |   const trigger = page.getByRole("button", { name: "プロジェクト", exact: true });
  78  |   const panel = page.locator('[data-slot="navigation-popover"]');
  79  |   await brand.focus();
  80  |   await trigger.hover();
  81  |   await expect(panel).toBeVisible();
  82  |   await expect(brand).toBeFocused();
  83  |   const from = (await trigger.boundingBox())!;
  84  |   const to = (await panel.boundingBox())!;
  85  |   await page.mouse.move(from.x + 20, (from.y + from.height + to.y) / 2);
  86  |   await panel.getByRole("link").first().hover();
  87  |   await page.waitForTimeout(250);
  88  |   await expect(panel).toBeVisible();
  89  |   await page.mouse.move(1200, 700);
  90  |   await expect(panel).toBeHidden();
  91  |   await trigger.focus();
  92  |   await page.keyboard.press("Enter");
  93  |   await panel.locator('a[href="/design"]').focus();
  94  |   await page.keyboard.press("Enter");
  95  |   await expect(panel).toBeHidden();
  96  |   await expect(page.getByRole("status")).toHaveText("/design");
  97  |   await trigger.focus();
  98  |   await page.keyboard.press("Enter");
  99  |   await expect(panel.locator('a[href="/design"]')).toHaveAttribute("aria-current", "page");
  100 | });
  101 | 
  102 | test("mobile touch, focus trap, locale selection and reduced-motion dismissal", async ({ browser, browserName }) => {
  103 |   const context = await browser.newContext({ baseURL: "http://127.0.0.1:6007", viewport: { width: 390, height: 900 }, hasTouch: browserName !== "firefox", reducedMotion: "reduce" });
  104 |   const page = await context.newPage();
  105 |   try {
  106 |     await open(page, "dark");
  107 |     const trigger = page.getByRole("button", { name: "メニュー", exact: true });
  108 |     if (browserName === "firefox") await trigger.click(); else await trigger.tap();
  109 |     const sheet = page.getByRole("dialog", { name: "メニュー", exact: true });
  110 |     await expect(sheet).toBeVisible();
  111 |     expect(await sheet.evaluate(element => getComputedStyle(element).animationDuration)).toBe("0s");
  112 |     for (let n = 0; n < 18; n++) await page.keyboard.press("Tab");
  113 |     expect(await sheet.evaluate(element => element.contains(document.activeElement))).toBe(true);
  114 |     await sheet.getByRole("combobox", { name: "言語" }).click();
  115 |     await page.getByRole("option", { name: "한국어", exact: true }).click();
  116 |     const relabeledSheet = page.getByRole("dialog", { name: "메뉴", exact: true });
  117 |     await expect(relabeledSheet).toBeVisible();
  118 |     await expect(relabeledSheet.getByRole("link", { name: "블로그", exact: true })).toBeVisible();
  119 |     await expect(relabeledSheet.getByRole("combobox", { name: "언어" })).toBeFocused();
  120 |     await page.keyboard.press("Escape");
  121 |     await expect(relabeledSheet).toBeHidden();
  122 |     await expect(page.getByRole("button", { name: "메뉴", exact: true })).toBeFocused();
  123 |   } finally { await context.close(); }
  124 | });
  125 | 
  126 | test("theme control changes the document theme and Japanese application omits unsupported locale UI", async ({ page }) => {
  127 |   await open(page, "light", "japanese-application");
  128 |   await expect(page.getByRole("combobox")).toHaveCount(0);
  129 |   const theme = page.getByRole("button", { name: "ダークテーマに切り替える", exact: true });
  130 |   await expect(theme).toBeEnabled();
  131 |   await theme.click();
> 132 |   await expect(page.locator("html")).toHaveClass(/dark/);
      |                                      ^ Error: expect(locator).toHaveClass(expected) failed
  133 |   await expect(page.getByRole("button", { name: "ライトテーマに切り替える", exact: true })).toBeEnabled();
  134 |   await page.getByRole("button", { name: "Example session", exact: true }).click();
  135 |   await expect(page.getByRole("status")).toHaveText("Application session callback");
  136 | });
  137 | 
  138 | test("blocked decorative images preserve visible catalog links and descriptions", async ({ page }) => {
  139 |   await page.route("https://naeil.dev/images/*.png", route => route.abort());
  140 |   await open(page);
  141 |   const trigger = page.getByRole("button", { name: "プロジェクト", exact: true });
  142 |   await trigger.focus();
  143 |   await page.keyboard.press("Enter");
  144 |   const panel = page.locator('[data-slot="navigation-popover"]');
  145 |   await expect(panel.getByRole("link", { name: /Content Collector/ })).toBeVisible();
  146 |   await expect(panel.getByText("RSS、YouTube、Redditの自動収集 + AI要約", { exact: true })).toBeVisible();
  147 |   for (const path of projects) await expect(panel.locator(`a[href="/${path}"]`)).toBeVisible();
  148 |   await panel.locator('a[href="/cc"]').click();
  149 |   await expect(page.getByRole("status")).toHaveText("/cc");
  150 | });
  151 | 
  152 | test("actual whole-header Docs loads the public composition", async ({ page }) => {
  153 |   await page.goto("/?path=/docs/brand-naeilheader--docs");
  154 |   const frame = page.frameLocator("#storybook-preview-iframe");
  155 |   await expect(frame.locator(".sbdocs-content")).toContainText("complete React-only naeil header");
  156 |   await expect(frame.locator("[data-naeil-header]").first()).toBeVisible();
  157 | });
  158 | 
```