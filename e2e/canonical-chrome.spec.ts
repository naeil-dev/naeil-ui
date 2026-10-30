import { scrollbarLaunch } from "../scripts/page-frame-browser";
import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

async function record(info: TestInfo, name: string, value: unknown) {
  const path = info.outputPath(`${name}.json`);
  mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, JSON.stringify(value, null, 2));
  await info.attach(name, { path, contentType: "application/json" });
}

const base = "http://127.0.0.1:6008";
async function open(page: Page, query = "", side = "candidate") {
  await page.goto(`${base}/${side}/index.html?${query}`);
  await expect(page.locator("header")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}
async function settled(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    // Mount/focus changes can start a transition on the next frame in WebKit.
    for (;;) {
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const animations = document.getAnimations().filter(a => a.playState !== "finished" && a.effect?.getComputedTiming().iterations !== Infinity);
      if (!animations.length) break;
      await Promise.all(animations.map(a => a.finished.catch(() => {})));
    }
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

const textTypography = (page: Page) => page.locator('[data-naeil-chrome], [data-naeil-chrome] *').evaluateAll(es => es.filter(e => e.getBoundingClientRect().width && [...e.childNodes].some(n => n.nodeType === Node.TEXT_NODE && n.textContent?.trim())).map(e => {
  const c = getComputedStyle(e);
  return { text: e.textContent, family: c.fontFamily, size: c.fontSize, weight: c.fontWeight, line: c.lineHeight, spacing: c.letterSpacing, smoothing: c.getPropertyValue("-webkit-font-smoothing") };
}));

test("P2 Home data, accessible brand and one status outside the link", async ({ page }, info) => {
  for (const locale of ["ko", "en", "ja"]) for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await open(page, `profile=home&current=/keys&locale=${locale}`);
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
      const baseline = probe.getBoundingClientRect().y;
      const previousTranslate = label.style.translate;
      label.style.translate = "0 1px";
      const shiftedBaseline = probe.getBoundingClientRect().y;
      label.style.translate = previousTranslate;
      probe.remove();
      const css = getComputedStyle(label), context = document.createElement("canvas").getContext("2d")!;
      context.font = `${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
      const rasterInk = context.measureText("Home");
      // At 14px Linux rounds ink bounds to whole pixels. Measure font geometry
      // at 100x and scale back, keeping the same .25px optical-alignment gate.
      const scale = 100;
      context.font = `${css.fontWeight} ${parseFloat(css.fontSize) * scale}px ${css.fontFamily}`;
      const ink = context.measureText("Home"), offset = (ink.actualBoundingBoxDescent - ink.actualBoundingBoxAscent) / scale / 2;
      return { centerDelta: baseline + offset - wordmarkCenter, shiftedCenterDelta: shiftedBaseline + offset - wordmarkCenter,
        rasterCenterDelta: baseline + (rasterInk.actualBoundingBoxDescent - rasterInk.actualBoundingBoxAscent) / 2 - wordmarkCenter,
        measureScale: scale, gap: label.getBoundingClientRect().x - svg.getBoundingClientRect().right, fontSize: css.fontSize };
    });
    await record(info, `${locale}-${width}-qualifier`, qualifier);
    expect(qualifier.fontSize).toBe("14px"); expect(qualifier.gap).toBe(4); expect(Math.abs(qualifier.centerDelta), `${locale}/${width} qualifier ink center`).toBeLessThanOrEqual(.25);
    expect(qualifier.shiftedCenterDelta - qualifier.centerDelta).toBeCloseTo(1, 2);
    expect(Math.abs(qualifier.shiftedCenterDelta), "A 1px qualifier displacement must fail the optical-alignment gate").toBeGreaterThan(.25);
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
      const text = textTypography;
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

for (const css of ["globals", "split"]) for (const order of ["before", "after"]) {
  test(`P4 R3 hostile typography ${css}/${order} preserves owned text and body host values`, async ({ page, context }, info) => {
    test.setTimeout(60000);
    const reference = await context.newPage();
    const hostile = ':root[data-dashboard-v2] :is([role="menuitem"], [role="option"], [role="dialog"]), :root[data-dashboard-v2] :is(a, button, h2, h3, p) { font-size: 23px; line-height: 2; font-weight: 700; letter-spacing: 3px; font-family: serif; }';
    try {
      for (const locale of ["ko", "en", "ja"]) {
        for (const p of [reference, page]) { await p.setViewportSize({ width: 1440, height: 900 }); await open(p, `profile=home&css=${css}&locale=${locale}`); }
        await page.evaluate(() => document.documentElement.setAttribute("data-dashboard-v2", ""));
        const style = await page.addStyleTag({ content: hostile });
        if (order === "before") await style.evaluate(element => document.head.prepend(element));
        expect.soft(await textTypography(page), `${locale} header/footer`).toEqual(await textTypography(reference));
        for (const p of [reference, page]) { await p.getByRole("button", { name: "AI", exact: true }).focus(); await p.keyboard.press("Enter"); await settled(p); }
        expect.soft(await textTypography(page), `${locale} popover`).toEqual(await textTypography(reference));
        for (const p of [reference, page]) { await p.keyboard.press("Escape"); await settled(p); await p.setViewportSize({ width: 390, height: 900 }); await toggle(p).click(); await settled(p); }
        expect.soft(await textTypography(page), `${locale} sheet`).toEqual(await textTypography(reference));
        for (const selector of ["[data-naeil-account-trigger]", '[role="combobox"]']) {
          for (const p of [reference, page]) { await sheet(p).locator(selector).click(); await settled(p); }
          expect.soft(await textTypography(page), `${locale} ${selector}`).toEqual(await textTypography(reference));
          for (const p of [reference, page]) { await p.keyboard.press("Escape"); await settled(p); }
        }
        for (const p of [reference, page]) { await p.keyboard.press("Escape"); await settled(p); }
        await page.getByRole("button", { name: "Body menu", exact: true }).click();
        const item = page.getByTestId("body-menu").getByRole("menuitem");
        const values = await item.evaluate(e => { const c = getComputedStyle(e); return { size: c.fontSize, line: c.lineHeight, weight: c.fontWeight, spacing: c.letterSpacing, family: c.fontFamily, chrome: !!e.closest("[data-naeil-chrome]") }; });
        await record(info, `${locale}-body-host`, values);
        expect(values).toEqual({ size: "23px", line: "46px", weight: "700", spacing: "3px", family: "serif", chrome: false });
        await page.keyboard.press("Escape"); await settled(page);
      }
    } finally { await reference.close(); }
  });
}

test("P4 Japanese locale supplies its own stack when document is English", async ({ page }) => {
  await mobile(page, "locale=ja&documentLang=en");
  for (const root of ["header", "footer", '[data-slot="navigation-sheet"]']) {
    await expect(page.locator(root)).toHaveAttribute("lang", "ja");
    await expect(page.locator(root)).toHaveCSS("font-family", /^"?Noto Sans JP"?/);
  }
  for (const selector of ["[data-naeil-account-trigger]", '[role="combobox"]']) {
    await sheet(page).locator(selector).click();
    await expect(page.locator('[data-naeil-chrome][role="menu"], [data-naeil-locale-menu]')).toHaveCSS("font-family", /^"?Noto Sans JP"?/);
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
    // WebKit's test shell follows middle links in this tab. Suppress only the
    // browser navigation; the real event still reaches the component handlers.
    await sheet(page).locator('a[href="/keys"]').evaluate(link => {
      for (const type of ["click", "auxclick"]) link.addEventListener(type, event => { if ((event as MouseEvent).button !== 0) event.preventDefault(); });
    });
    await sheet(page).locator('a[href="/keys"]').click({ button: "middle" });
    await expect(sheet(page)).toBeVisible();
    if (mode !== "uncontrolled") await expect(page.getByTestId("transitions")).toHaveText("[true]");
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

for (const mode of ["controlled", "observer", "uncontrolled"]) {
  test(`P5 empty navigation retains B1 desktop behavior and dismissal callbacks (${mode})`, async ({ page }, info) => {
    const rows = [];
    for (const side of ["baseline", "candidate"]) {
      await page.setViewportSize({ width: 390, height: 900 });
      await open(page, side === "baseline" ? "profile=legacy-empty" : `profile=home&mode=${mode}&empty`, side);
      const transitions: boolean[] = [];
      for (const dismissal of ["Escape", "close", "overlay", "route"]) {
        await page.setViewportSize({ width: 390, height: 900 });
        await toggle(page).click(); await expect(sheet(page)).toBeVisible(); transitions.push(true);
        await page.setViewportSize({ width: 1440, height: 900 }); await settled(page);
        await expect(sheet(page)).toBeVisible();
        expect(await page.locator(".ui-navigation-desktop").evaluate(e => e.getBoundingClientRect().width)).toBe(0);
        if (side === "candidate" && mode !== "uncontrolled") await expect(page.getByTestId("transitions")).toHaveText(JSON.stringify(transitions));
        if (dismissal === "Escape") await page.keyboard.press("Escape");
        else if (dismissal === "close") await sheet(page).locator(".ui-navigation-sheet-heading button").click();
        else if (dismissal === "overlay") await page.locator('[data-slot="navigation-overlay"]').click({ position: { x: 1, y: 400 } });
        else await page.getByTestId("route").evaluate(e => (e as HTMLButtonElement).click());
        await expect(sheet(page)).toBeHidden(); await settled(page); transitions.push(false);
        if (side === "candidate" && mode !== "uncontrolled") await expect(page.getByTestId("transitions")).toHaveText(JSON.stringify(transitions));
      }
      rows.push({ side, transitions, callbacks: JSON.parse(await page.getByTestId("transitions").textContent() || "[]") });
    }
    await record(info, "empty-navigation", { mode, rows });
    expect(rows[1].transitions).toEqual(rows[0].transitions);
    expect(rows[1].callbacks).toEqual(mode === "uncontrolled" ? [] : rows[0].transitions);
  });
}

for (const reducedMotion of ["no-preference", "reduce"] as const) for (const resize of [false, true]) {
  test(`P5 dirty guard focus, cancel/discard/fail/retry ${reducedMotion}/desktop=${resize}`, async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion });
    const guard = page.getByTestId("guard");
    const rowAccount = page.locator("header [data-naeil-account-trigger]");
    const logout = async () => {
      await page.setViewportSize({ width: 390, height: 900 });
      await toggle(page).click(); await sheet(page).locator("[data-naeil-account-trigger]").click();
      await page.getByRole("menuitem", { name: "로그아웃", exact: true }).click();
      await expect(guard).toBeVisible(); await expect(sheet(page)).toBeHidden(); await settled(page);
      await expect(page.getByRole("dialog")).toHaveCount(1);
      expect(await guard.evaluate(e => e.contains(document.activeElement))).toBe(true);
      for (let i = 0; i < 5; i++) { await page.keyboard.press("Tab"); expect(await guard.evaluate(e => e.contains(document.activeElement))).toBe(true); }
      if (resize) {
        await page.setViewportSize({ width: 1440, height: 900 }); await settled(page);
        await expect(rowAccount).toBeVisible();
        expect(await guard.evaluate(e => e.contains(document.activeElement))).toBe(true);
      }
    };
    await page.setViewportSize({ width: 390, height: 900 }); await open(page, "profile=home");
    await logout();
    await guard.getByRole("button", { name: "Cancel", exact: true }).click(); await settled(page);
    await expect(page.getByTestId("requests")).toHaveText("0"); await expect(page.getByTestId("notice")).toHaveText("draft retained");
    if (resize) {
      const active = await page.evaluate(() => {
        const e = document.activeElement!;
        return { tag: e.tagName, chrome: !!e.closest("[data-naeil-chrome]"), visible: !!e.getBoundingClientRect().width && !!e.getBoundingClientRect().height };
      });
      expect(active.chrome && !active.visible).toBe(false);
      await expect(rowAccount).toBeVisible();
      // Probe focusability only; choosing this desktop fallback is Home-owned.
      await rowAccount.focus(); await expect(rowAccount).toBeFocused();
      await record(info, "desktop-focus-boundary", { activeAfterCancel: active, rowVisible: true, rowFocusable: true, fallbackOwner: "Home (contract rev 4)" });
    } else await expect(toggle(page)).toBeFocused();
    await logout();
    await guard.getByRole("button", { name: "Discard", exact: true }).dblclick(); await expect(page.getByTestId("requests")).toHaveText("1");
    if (resize) await rowAccount.click();
    else { await toggle(page).click(); await sheet(page).locator("[data-naeil-account-trigger]").click(); }
    await expect(page.getByRole("menuitem")).toHaveAttribute("data-disabled", "");
    await page.keyboard.press("Escape"); await settled(page);
    if (!resize) { await page.keyboard.press("Escape"); await settled(page); }
    await page.getByTestId("fail").click(); await expect(page.getByTestId("notice")).toHaveText("failed; retry allowed");
    await logout(); await guard.getByRole("button", { name: "Discard", exact: true }).click(); await expect(page.getByTestId("requests")).toHaveText("2");
  });
}

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  for (const lifecycle of ["plain", "reopen", "unmount", "race", "rerender", "timer-reopen", "timer-unmount"]) {
    test(`P5 R1 ${lifecycle} cancels stale logout or completes one closing flow (${reducedMotion})`, async ({ page }, info) => {
      await page.emulateMedia({ reducedMotion });
      await mobile(page, `boundary&lifecycle=${lifecycle}`);
      if (lifecycle.startsWith("timer-")) {
        const control = lifecycle === "timer-reopen" ? "force-open" : "unmount";
        await sheet(page).evaluate((element, control) => {
          element.addEventListener("focusScope.autoFocusOnUnmount", () => {
            document.querySelector<HTMLButtonElement>(`[data-testid="${control}"]`)!.click();
          }, { once: true });
        }, control);
      }
      await sheet(page).locator("[data-naeil-account-trigger]").click();
      if (lifecycle === "race") await page.getByRole("menuitem", { name: "로그아웃", exact: true }).evaluate(element => {
        // Race an external close after the selection is accepted, rather than
        // unmounting the item in click capture before its handler can run.
        element.addEventListener("menu.itemSelect", () => queueMicrotask(() => {
          document.querySelector<HTMLButtonElement>('[data-testid="force-close"]')!.click();
        }), { once: true });
      });
      if (lifecycle === "rerender") await page.locator("[data-naeil-account-menu]").evaluate(element => {
        element.addEventListener("focusScope.autoFocusOnUnmount", () => {
          document.querySelector<HTMLButtonElement>('[data-testid="rerender"]')!.click();
        }, { once: true });
      });
      await page.getByRole("menuitem", { name: "로그아웃", exact: true }).click(); await settled(page);
      const observation = async () => ({
        sheet: await sheet(page).count(), header: await page.locator("header").count(),
        logoutCalls: await page.getByTestId("logout-calls").textContent(),
        transitions: await page.getByTestId("transitions").textContent(), guard: await page.getByTestId("guard").count(),
      });
      const afterSelection = await observation();
      if (lifecycle.endsWith("reopen")) {
        await expect(sheet(page)).toBeVisible();
        await page.keyboard.press("Escape"); await settled(page); await expect(sheet(page)).toBeHidden();
      }
      await record(info, "lifecycle", { lifecycle, reducedMotion, afterSelection, afterDismissal: await observation() });
      if (lifecycle === "plain" || lifecycle === "race" || lifecycle === "rerender") {
        await expect(page.getByTestId("logout-calls")).toHaveText("1");
        await expect(page.getByTestId("guard")).toBeVisible();
        await expect(page.getByRole("dialog")).toHaveCount(1);
        expect(await page.getByTestId("guard").evaluate(e => e.contains(document.activeElement))).toBe(true);
      } else {
        if (lifecycle.endsWith("unmount")) await expect(page.locator("header")).toHaveCount(0);
        await expect(page.getByTestId("logout-calls")).toHaveText("0");
        await expect(page.getByTestId("guard")).toBeHidden();
      }
    });
  }
}

for (const policy of ["reject", "delay"]) {
  test(`P5 R2 controlled ${policy} uses committed props with a stable callback`, async ({ page }, info) => {
    await mobile(page, `policy=${policy}`);
    await page.keyboard.press("Escape"); await settled(page); await expect(sheet(page)).toBeVisible();
    await expect(page.getByTestId("transitions")).toHaveText("[true,false]");
    await sheet(page).locator(".ui-navigation-sheet-heading button").click(); await settled(page);
    await record(info, "controlled-requests", { policy, sheetVisible: await sheet(page).isVisible(), requests: await page.getByTestId("transitions").textContent() });
    await expect(sheet(page)).toBeVisible();
    await expect(page.getByTestId("transitions")).toHaveText("[true,false,false]");
    if (policy === "delay") {
      await page.getByTestId("force-close").evaluate(e => (e as HTMLButtonElement).click()); await settled(page);
      await expect(sheet(page)).toBeHidden();
      await expect(page.getByTestId("transitions")).toHaveText("[true,false,false]");
      await toggle(page).click(); await expect(sheet(page)).toBeVisible();
      await page.keyboard.press("Escape"); await settled(page);
      await expect(page.getByTestId("transitions")).toHaveText("[true,false,false,true,false]");
    }
  });
}

for (const reducedMotion of ["no-preference", "reduce"] as const) {
  test(`P5 R1 delayed parent acceptance preserves the selected action ${reducedMotion}`, async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion });
    await mobile(page, "policy=delay");
    await sheet(page).locator("[data-naeil-account-trigger]").click();
    await page.getByRole("menuitem", { name: "로그아웃", exact: true }).click(); await settled(page);
    await expect(sheet(page)).toBeVisible();
    await expect(page.getByTestId("logout-calls")).toHaveText("0");
    await page.getByTestId("force-close").evaluate(e => (e as HTMLButtonElement).click()); await settled(page);
    await record(info, "delayed-action", { reducedMotion, transitions: await page.getByTestId("transitions").textContent(), calls: await page.getByTestId("logout-calls").textContent() });
    await expect(sheet(page)).toBeHidden();
    await expect(page.getByTestId("logout-calls")).toHaveText("1");
    await expect(page.getByTestId("guard")).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(1);
    expect(await page.getByTestId("guard").evaluate(e => e.contains(document.activeElement))).toBe(true);
  });
}

for (const reducedMotion of ["no-preference", "reduce"] as const) for (const cancel of ["sheet-request", "account-reopen"]) {
  test(`P5 R1 delayed selection cancelled by ${cancel} ${reducedMotion}`, async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion });
    await mobile(page, "policy=delay");
    await sheet(page).locator("[data-naeil-account-trigger]").click();
    await page.getByRole("menuitem", { name: "로그아웃", exact: true }).click(); await settled(page);
    await expect(sheet(page)).toBeVisible();
    await expect(page.locator("[data-naeil-account-menu]")).toBeHidden();
    if (cancel === "sheet-request") await page.keyboard.press("Escape");
    else {
      await sheet(page).locator("[data-naeil-account-trigger]").click();
      await expect(page.locator("[data-naeil-account-menu]")).toBeVisible();
      await page.keyboard.press("Escape");
    }
    await settled(page);
    await expect(page.getByTestId("transitions")).toHaveText(cancel === "sheet-request" ? "[true,false,false]" : "[true,false]");
    await page.getByTestId("force-close").evaluate(e => (e as HTMLButtonElement).click()); await settled(page);
    await record(info, "delayed-cancel", { reducedMotion, cancel, transitions: await page.getByTestId("transitions").textContent(), calls: await page.getByTestId("logout-calls").textContent() });
    await expect(sheet(page)).toBeHidden();
    await expect(page.getByTestId("logout-calls")).toHaveText("0");
    await expect(page.getByTestId("guard")).toBeHidden();
  });
}


test.beforeEach(async ({ page, browser, browserName }, info) => {
  await record(info, "launch-and-probe", await scrollbarLaunch(page, browser, browserName));
});
