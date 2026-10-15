# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: naeil-header.spec.ts >> theme control changes the document theme and Japanese application omits unsupported locale UI
- Location: e2e/naeil-header.spec.ts:128:1

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
  60  |     for (const control of await panel.locator("a,button").all()) {
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
> 134 |   await expect(page.locator("html")).toHaveClass(/dark/);
      |                                      ^ Error: expect(locator).toHaveClass(expected) failed
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