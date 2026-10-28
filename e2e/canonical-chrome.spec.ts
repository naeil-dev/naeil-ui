import { test, expect, type Page } from "@playwright/test";

const base = "http://127.0.0.1:6008";
async function open(page: Page, query = "", side = "candidate") {
  await page.goto(`${base}/${side}/index.html?${query}`);
  await expect(page.locator("header")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}
async function settled(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(document.getAnimations().filter(a => a.effect?.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => {})));
  });
}
const sheet = (page: Page) => page.locator('[data-slot="navigation-sheet"]');
const toggle = (page: Page) => page.locator(".ui-navigation-toggle");
async function mobile(page: Page, query = "") {
  await page.setViewportSize({ width: 390, height: 900 });
  await open(page, `profile=home&${query}`);
  await toggle(page).click();
  await expect(sheet(page)).toBeVisible();
}

test("P2 Home data, accessible brand and one status outside the link", async ({ page }) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await open(page, "profile=home&current=/keys");
    await expect(page.locator("[data-app-brand]")).toHaveAccessibleName("Naeil Home");
    await expect(page.getByTestId("readiness")).toHaveCount(1);
    expect(await page.getByTestId("readiness").evaluate(e => !!e.closest("a"))).toBe(false);
    const gap = await page.getByTestId("readiness").evaluate(e => e.getBoundingClientRect().x - document.querySelector("[data-app-brand]")!.getBoundingClientRect().right);
    expect(Math.abs(gap - 8)).toBeLessThanOrEqual(0.01);
    await expect(page.locator(".naeil-header-brand-suffix")).toHaveText("Home");
    const qualifier = await page.locator(".naeil-header-brand-suffix").evaluate(label => {
      const svg = document.querySelector('header svg[data-naeil-brand]')!;
      const box = svg.getBoundingClientRect();
      const paths = [...svg.querySelectorAll("path")].map(p => p.getBoundingClientRect()).filter(p => p.width && p.height && p.left > box.left + box.width * .28);
      const wordmarkCenter = (Math.min(...paths.map(p => p.top)) + Math.max(...paths.map(p => p.bottom))) / 2;
      const probe = document.createElement("i"); probe.style.cssText = "display:inline-block;width:0;height:0;vertical-align:baseline"; label.append(probe);
      const baseline = probe.getBoundingClientRect().y; probe.remove();
      const css = getComputedStyle(label), context = document.createElement("canvas").getContext("2d")!;
      context.font = `${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
      const ink = context.measureText("Home");
      return { centerDelta: baseline + (ink.actualBoundingBoxDescent - ink.actualBoundingBoxAscent) / 2 - wordmarkCenter, gap: label.getBoundingClientRect().x - svg.getBoundingClientRect().right, fontSize: css.fontSize };
    });
    expect(qualifier.fontSize).toBe("14px"); expect(qualifier.gap).toBe(4); expect(Math.abs(qualifier.centerDelta)).toBeLessThanOrEqual(.25);
    if (width === 390) await toggle(page).click();
    const scope = width === 390 ? sheet(page) : page.locator("header");
    await expect(scope.getByRole(width === 390 ? "heading" : "button", { name: "AI", exact: true })).toBeVisible();
    await expect(scope.getByRole("link", { name: "Console", exact: true })).toBeVisible();
    if (width === 1440) { await scope.getByRole("button", { name: "AI", exact: true }).focus(); await page.keyboard.press("Enter"); }
    await expect(page.locator('.ui-navigation-entry[aria-current="page"]')).toHaveAttribute("href", "/keys");
    expect(await page.locator(".ui-navigation-entry").evaluateAll(es => es.filter(e => e.getBoundingClientRect().width > 0).map(e => e.getAttribute("href")))).toEqual(["/", "/keys", "/connections", "/auto"]);
  }
});

for (const css of ["globals", "split"]) for (const locale of ["ko", "en", "ja"]) {
  test(`P4 final typography ${css}/${locale} and unmarked body controls`, async ({ page, context }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    const reference = await context.newPage(); await reference.setViewportSize({ width: 390, height: 900 });
    try {
      await open(reference, `locale=${locale}&css=${css}`);
      await open(page, `locale=${locale}&css=${css}&hostile`);
      const text = async (p: Page) => p.locator('header, footer, header *, footer *, [data-slot="navigation-sheet"], [data-slot="navigation-sheet"] *, [data-naeil-account-menu], [data-naeil-account-menu] *, [data-slot="select-content"], [data-slot="select-content"] *').evaluateAll(es => es.filter(e => e.getBoundingClientRect().width && [...e.childNodes].some(n => n.nodeType === Node.TEXT_NODE && n.textContent?.trim())).map(e => { const c = getComputedStyle(e); return { text: e.textContent, family: c.fontFamily, size: c.fontSize, weight: c.fontWeight, line: c.lineHeight, spacing: c.letterSpacing, smoothing: c.getPropertyValue("-webkit-font-smoothing") }; }));
      expect(await text(page)).toEqual(await text(reference));
      for (const p of [reference, page]) await toggle(p).click();
      expect(await text(page)).toEqual(await text(reference));
      for (const kind of ["account", "locale"]) {
        for (const p of [reference, page]) {
          await (kind === "account" ? sheet(p).locator("[data-naeil-account-trigger]") : sheet(p).getByRole("combobox")).click();
          await settled(p);
        }
        expect(await text(page)).toEqual(await text(reference));
        const content = page.locator(kind === "account" ? "[data-naeil-account-menu]" : '[data-slot="select-content"]');
        await expect(content).toHaveAttribute("data-naeil-chrome", "");
        await expect(content).toHaveAttribute("lang", locale);
        if (kind === "locale") await expect(content).toHaveAttribute("data-naeil-locale-menu", "");
        for (const p of [reference, page]) { await p.keyboard.press("Escape"); await settled(p); }
      }
      await page.keyboard.press("Escape"); await settled(page);
      for (const [trigger, content] of [["Body language", "body-select"], ["Body menu", "body-menu"], ["Body dialog", "body-dialog"]]) {
        await page.getByRole(trigger === "Body language" ? "combobox" : "button", { name: trigger, exact: true }).click();
        await expect(page.getByTestId(content)).toBeVisible();
        // Disable only marker-scoped rules: ordinary portals must match zero of them.
        const result = await page.getByTestId(content).evaluate(root => {
          const nodes = [document.body, root, ...root.querySelectorAll("*")];
          const snapshot = () => nodes.map(e => { const c = getComputedStyle(e); return [c.fontFamily, c.fontSize, c.lineHeight, c.fontWeight, c.getPropertyValue("-webkit-font-smoothing")]; });
          const before = snapshot(); let matches = 0;
          const rules: CSSStyleRule[] = [];
          const walk = (list: CSSRuleList) => { for (const rule of list) { if (rule instanceof CSSStyleRule && rule.selectorText.includes("data-naeil-chrome")) { matches += nodes.filter(e => e.matches(rule.selectorText)).length; rules.push(rule); } else if ("cssRules" in rule) walk((rule as CSSGroupingRule).cssRules); } };
          for (const style of document.styleSheets) walk(style.cssRules);
          const saved = rules.map(r => r.style.cssText); rules.forEach(r => r.style.cssText = ""); const after = snapshot(); rules.forEach((r, i) => r.style.cssText = saved[i]);
          return { before, after, matches };
        });
        expect(result.matches).toBe(0); expect(result.after).toEqual(result.before);
        await page.keyboard.press("Escape"); await settled(page);
      }
    } finally { await reference.close(); }
  });
}

test("P4 Japanese locale supplies its own stack when document is English", async ({ page }) => {
  await mobile(page, "locale=ja&documentLang=en");
  for (const root of ["header", "footer", '[data-slot="navigation-sheet"]']) {
    await expect(page.locator(root)).toHaveAttribute("lang", "ja");
    await expect(page.locator(root)).toHaveCSS("font-family", /^"Noto Sans JP"/);
  }
  for (const selector of ["[data-naeil-account-trigger]", '[role="combobox"]']) {
    await sheet(page).locator(selector).click();
    await expect(page.locator('[data-naeil-chrome][role="menu"], [data-naeil-locale-menu]')).toHaveCSS("font-family", /^"Noto Sans JP"/);
    await page.keyboard.press("Escape"); await settled(page);
  }
});

test("P4 generic Navigation portals remain unmarked", async ({ page }) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 }); await open(page, "profile=generic");
    await expect(page.locator("header[data-naeil-chrome]")).toHaveCount(0);
    if (width === 390) await toggle(page).click();
    else { await page.getByRole("button", { name: "AI", exact: true }).focus(); await page.keyboard.press("Enter"); }
    await expect(page.locator('[data-slot="navigation-sheet"][data-naeil-chrome], [data-slot="navigation-popover"][data-naeil-chrome]')).toHaveCount(0);
  }
});

for (const mode of ["controlled", "observer", "uncontrolled"]) {
  test(`P5 ${mode} closes once per transition and respects nested Escape/clicks/resize`, async ({ page }) => {
    await mobile(page, `mode=${mode}`);
    for (const selector of ["[data-naeil-account-trigger]", '[role="combobox"]']) {
      await sheet(page).locator(selector).click(); await page.keyboard.press("Escape"); await settled(page);
      await expect(sheet(page)).toBeVisible();
    }
    await sheet(page).locator('a[href="/keys"]').click({ modifiers: ["ControlOrMeta"] });
    await expect(sheet(page)).toBeVisible();
    await sheet(page).locator('a[href="/keys"]').click({ button: "middle" });
    await expect(sheet(page)).toBeVisible();
    await page.keyboard.press("Escape"); await expect(sheet(page)).toBeHidden();
    if (mode !== "uncontrolled") await expect(page.getByTestId("transitions")).toHaveText("[true,false]");
    await expect(toggle(page)).toBeFocused();
    await toggle(page).click(); await sheet(page).locator('a[href="/keys"]').click(); await expect(sheet(page)).toBeHidden();
    if (mode !== "uncontrolled") await expect(page.getByTestId("transitions")).toHaveText("[true,false,true,false]");
    await toggle(page).click(); await page.setViewportSize({ width: 1440, height: 900 }); await expect(sheet(page)).toBeHidden();
    if (mode !== "uncontrolled") await expect(page.getByTestId("transitions")).toHaveText("[true,false,true,false,true,false]");
    await page.setViewportSize({ width: 806, height: 900 });
    await toggle(page).click(); await page.locator('[data-slot="navigation-overlay"]').click({ position: { x: 1, y: 400 } }); await expect(sheet(page)).toBeHidden();
    await toggle(page).click(); await sheet(page).locator(".ui-navigation-sheet-heading button").click(); await expect(sheet(page)).toBeHidden();
    await toggle(page).click(); await page.getByTestId("route").evaluate(e => (e as HTMLButtonElement).click()); await expect(sheet(page)).toBeHidden();
    await page.getByTestId("route").click();
    if (mode !== "uncontrolled") await expect(page.getByTestId("transitions")).toHaveText("[true,false,true,false,true,false,true,false,true,false,true,false]");
  });
}

for (const reducedMotion of ["no-preference", "reduce"] as const) for (const resize of [false, true]) {
  test(`P5 dirty guard focus, cancel/discard/fail/retry ${reducedMotion}/desktop=${resize}`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    const guard = page.getByTestId("guard");
    const logout = async () => {
      await toggle(page).click(); await sheet(page).locator("[data-naeil-account-trigger]").click();
      await page.getByRole("menuitem", { name: "로그아웃", exact: true }).click();
      await expect(guard).toBeVisible(); await expect(sheet(page)).toBeHidden(); await settled(page);
      await expect(page.getByRole("dialog")).toHaveCount(1);
      expect(await guard.evaluate(e => e.contains(document.activeElement))).toBe(true);
      for (let i = 0; i < 5; i++) { await page.keyboard.press("Tab"); expect(await guard.evaluate(e => e.contains(document.activeElement))).toBe(true); }
    };
    await page.setViewportSize({ width: 390, height: 900 }); await open(page, "profile=home");
    await logout();
    if (resize) await page.setViewportSize({ width: 1440, height: 900 });
    await guard.getByRole("button", { name: "Cancel", exact: true }).click(); await settled(page);
    await expect(page.getByTestId("requests")).toHaveText("0"); await expect(page.getByTestId("notice")).toHaveText("draft retained");
    await expect(resize ? page.locator("header [data-naeil-account-trigger]") : toggle(page)).toBeFocused();
    await page.setViewportSize({ width: 390, height: 900 }); await logout();
    await guard.getByRole("button", { name: "Discard", exact: true }).dblclick(); await expect(page.getByTestId("requests")).toHaveText("1");
    await toggle(page).click(); await sheet(page).locator("[data-naeil-account-trigger]").click(); await expect(page.getByRole("menuitem")).toHaveAttribute("data-disabled", "");
    await page.keyboard.press("Escape"); await settled(page); await page.keyboard.press("Escape"); await settled(page);
    await page.getByTestId("fail").click(); await logout(); await guard.getByRole("button", { name: "Discard", exact: true }).click(); await expect(page.getByTestId("requests")).toHaveText("2");
  });
}
