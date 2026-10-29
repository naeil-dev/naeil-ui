import assert from "node:assert/strict";
import { expect, type Page, type Browser } from "@playwright/test";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const selectors = ["body", ".ui-navigation-frame", "main.ui-app-frame", ".ui-site-footer-frame", '[data-testid="frame-reading"]', '[data-testid="frame-fluid"]', '[data-testid="frame-fixed"]'];

export async function frameState(page: Page) {
  return page.evaluate(selectors => {
    const probe = document.createElement("div");
    probe.style.cssText = "position:fixed;left:-10000px;width:100px;height:100px;overflow:scroll;border:0";
    document.body.append(probe); const scrollbar = probe.offsetWidth - probe.clientWidth;
    probe.style.cssText = "position:fixed;left:-10000px;width:100vw;height:0";
    const vw = probe.getBoundingClientRect().width; probe.remove();
    const body = getComputedStyle(document.body), root = document.documentElement;
    return {
      scrollbar, vw, innerWidth, clientWidth: root.clientWidth, available: root.getBoundingClientRect().width,
      scrollHeight: root.scrollHeight, scrollY, gutter: getComputedStyle(root).scrollbarGutter,
      margin: body.marginRight, padding: body.paddingRight, overflow: body.overflowY,
      removed: body.getPropertyValue("--removed-body-scroll-bar-size").trim(), lock: document.body.getAttribute("data-scroll-locked"),
      fonts: document.fonts.status, theme: root.className, lang: root.lang, headerLang: document.querySelector("header")?.getAttribute("lang"),
      boxes: Object.fromEntries(selectors.map(selector => {
        const element = document.querySelector(selector), rect = element?.getBoundingClientRect();
        return [selector, rect ? { x: rect.x, width: rect.width, padding: getComputedStyle(element!).paddingInlineStart } : null];
      })),
    };
  }, selectors);
}
type State = Awaited<ReturnType<typeof frameState>>;

export async function scrollbarLaunch(page: Page, browser: Browser, browserName: string) {
  const mode = process.env.NAEIL_UI_SCROLLBAR_MODE;
  let argv: string[] | undefined;
  if (browserName === "chromium") {
    const cdp = await browser.newBrowserCDPSession();
    argv = (await cdp.send("Browser.getBrowserCommandLine")).arguments;
    await cdp.detach();
  }
  let wrapper;
  if (mode) {
    assert.equal(browserName, "chromium", "Mode jobs require the validated Chromium recipe");
    assert(!argv!.includes("--hide-scrollbars"));
    assert(argv!.includes(mode === "classic" ? "Always" : "WhenScrolling"));
    const path = `${process.env.NAEIL_UI_SCROLLBAR_WRAPPERS}/chromium-${mode}.sh`, contents = readFileSync(path, "utf8");
    wrapper = { path, contents, sha256: createHash("sha256").update(contents).digest("hex") };
  }
  await page.setContent('<!doctype html><style>html{scrollbar-gutter:stable}body{margin:0}main{height:3000px}</style><main></main>');
  const probe = await frameState(page);
  if (mode) assert.equal(probe.scrollbar, mode === "classic" ? 15 : 0, "Actual mode probe");
  assert.equal(probe.available, page.viewportSize()!.width - probe.scrollbar, "Long stable root probe");
  return { browser: browser.version(), mode: mode || "default engine", argv, probe, wrapper };
}

export function stableFrame(before: State, after: State) {
  for (const [selector, box] of Object.entries(before.boxes)) {
    assert.deepEqual(!!after.boxes[selector], !!box, selector);
    if (!box) continue;
    for (const field of ["x", "width"] as const) assert(Math.abs(box[field] - after.boxes[selector]![field]) <= .01, `${selector}.${field}: ${box[field]} -> ${after.boxes[selector]![field]}`);
    assert.equal(after.boxes[selector]!.padding, box.padding, `${selector} padding`);
  }
  assert.equal(after.vw, before.vw, "100vw basis changed");
}

export async function settleFrame(page: Page) {
  await expect(page.locator("header .naeil-header-controls > button").first()).toBeEnabled();
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (const animation of document.getAnimations()) {
      if (animation.effect?.getComputedTiming().iterations !== Infinity) await animation.finished.catch(() => {});
    }
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

export async function assertRootFrame(page: Page) {
  const state = await frameState(page);
  assert.equal(state.gutter, "stable");
  assert.equal(state.available, page.viewportSize()!.width - state.scrollbar);
  const width = Math.min(state.available, 1600), padding = Math.min(40, Math.max(16, state.vw * .024));
  for (const selector of [".ui-navigation-frame", "main.ui-app-frame", ".ui-site-footer-frame"]) {
    const box = state.boxes[selector];
    if (!box) continue;
    assert(Math.abs(box.width - width) <= .01, `${selector} frame width`);
    assert(Math.abs(box.x - (state.available - width) / 2) <= .01, `${selector} frame origin`);
    assert(Math.abs(parseFloat(box.padding) - padding) < .02, `${selector} vw padding`);
  }
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= Math.ceil(document.documentElement.getBoundingClientRect().width)), "Horizontal overflow beyond the reserved layout width");
  const theme = await page.evaluate(() => {
    const button = document.querySelector("header .naeil-header-controls > button");
    return { dark: document.documentElement.classList.contains("dark"), icon: button?.querySelector("svg")?.getAttribute("class"), label: button?.getAttribute("aria-label"), locale: document.documentElement.lang, background: getComputedStyle(document.body).backgroundColor };
  });
  const names: Record<string, string[]> = { ko: ["어두운 테마로 전환", "밝은 테마로 전환"], en: ["Switch to dark theme", "Switch to light theme"], ja: ["ダークテーマに切り替える", "ライトテーマに切り替える"] };
  assert(theme.icon?.includes(theme.dark ? "lucide-sun" : "lucide-moon"), "Provider-driven theme icon must match root colors");
  assert.equal(theme.label, names[theme.locale][theme.dark ? 1 : 0]);
  assert.equal(theme.background, theme.dark ? "rgb(11, 12, 14)" : "rgb(247, 248, 250)");
  return state;
}

export async function exercisePageFrame(page: Page, record: (name: string, data: unknown) => Promise<void>) {
  await page.locator('[data-testid="length"]').waitFor(); await settleFrame(page);
  const before = await assertRootFrame(page);
  assert(before.scrollHeight <= page.viewportSize()!.height, "Short fixture must actually be short");
  const states: Record<string, unknown> = { before };
  for (const action of ["length", "length", "route-long", "route-short"]) {
    await page.getByTestId(action).click(); await settleFrame(page);
    const next = await assertRootFrame(page); stableFrame(before, next);
    states[`${action}-${Object.keys(states).length}`] = next;
  }
  await record("length-and-router", states);
}

export async function startFrameSampling(page: Page) {
  // Sample ordinary content/fixed anchors through animations, not moving modal panels.
  // Plain browser source also works under tsx, whose named-function helpers
  // are otherwise captured by evaluate serialization in clean consumer checks.
  await page.addScriptTag({ content: `(() => {
    const selectors = ${JSON.stringify(selectors)};
    const target = window;
    target.frameSampling = true; target.frameSamples = [];
    const sample = () => {
      if (!target.frameSampling) return;
      target.frameSamples.push(Object.fromEntries(selectors.flatMap(selector => {
        const r = document.querySelector(selector)?.getBoundingClientRect();
        return r ? [[selector, { x: r.x, width: r.width }]] : [];
      })));
      requestAnimationFrame(sample);
    }; sample();
  })();` });
}

export async function finishFrameSampling(page: Page, before: State, record: (name: string, data: unknown) => Promise<void>, states: unknown) {
  if (page.isClosed()) return;
  const samples = await page.evaluate(() => {
    const target = window as unknown as { frameSampling: boolean; frameSamples: Record<string, { x: number; width: number }>[] };
    target.frameSampling = false; return target.frameSamples;
  });
  await record("locks-and-animation-frames", { states, samples });
  assert(samples.length > 0, "Animation sampling must run");
  for (const sample of samples) for (const [selector, box] of Object.entries(sample)) {
    const original = before.boxes[selector]; if (!original) continue;
    for (const key of ["x", "width"] as const) assert(Math.abs(original[key] - box[key]) <= .01, `Animation ${selector}.${key}: ${original[key]} -> ${box[key]}`);
  }
}

function unlockedBody(before: State, state: State) {
  for (const key of ["lock", "margin", "padding", "removed", "overflow"] as const) assert.equal(state[key], before[key], `Unlocked body ${key}`);
}

async function backgroundWheel(page: Page, blocked: boolean) {
  const before = await page.evaluate(() => scrollY);
  await page.mouse.move(8, 850); await page.mouse.wheel(0, 200);
  if (blocked) {
    await page.waitForTimeout(80);
    assert.equal(await page.evaluate(() => scrollY), before, "Background wheel must remain blocked");
  } else {
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before);
    await page.evaluate(y => scrollTo(0, y), before); await settleFrame(page);
  }
}

export async function checkJapaneseToolbar(page: Page, profile: string) {
  await settleFrame(page);
  const state = await assertRootFrame(page), sheet = page.locator('[data-slot="navigation-sheet"]');
  const controls = page.locator('.ui-navigation-mobile-toolbar .naeil-header-controls');
  const height = (await controls.boundingBox())!.height;
  assert.equal(height, profile === "site" && state.scrollbar === 15 ? 104 : 44);
  const targets = controls.locator("button, a, [role=combobox]");
  const count = await targets.count();
  const clipped = await controls.evaluate(element => {
    const sheet = element.closest('[data-slot="navigation-sheet"]')!.getBoundingClientRect();
    return [...element.querySelectorAll("button, a, [role=combobox]")].some(control => {
      const box = control.getBoundingClientRect();
      if (box.height < 44 || box.left < sheet.left || box.right > sheet.right || box.bottom > sheet.bottom) return true;
      const walker = document.createTreeWalker(control, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (!node.textContent?.trim()) continue;
        const range = document.createRange(); range.selectNodeContents(node); const text = range.getBoundingClientRect();
        if (text.left < box.left - .01 || text.right > box.right + .01 || text.top < box.top - .01 || text.bottom > box.bottom + .01) return true;
      }
      return false;
    });
  });
  assert(!clipped, "Wrapped toolbar controls/text must fit inside the sheet");
  await sheet.focus();
  // macOS WebKit requires Option+Tab to include buttons in sequential navigation.
  const keys = page.context().browser()?.browserType().name() === "webkit" ? ["Alt+Tab", "Alt+Shift+Tab"] : ["Tab", "Shift+Tab"];
  for (const key of keys) {
    const reached = new Set<number>();
    const current = await targets.evaluateAll(elements => elements.findIndex(element => element === document.activeElement));
    if (current >= 0) reached.add(current);
    for (let step = 0; step < 40 && reached.size < count; step++) {
      await page.keyboard.press(key);
      const index = await targets.evaluateAll(elements => elements.findIndex(element => element === document.activeElement));
      if (index >= 0) reached.add(index);
    }
    assert.equal(reached.size, count, `${key} must reach every toolbar control`);
  }
  return { profile, height, state };
}

export async function exerciseHomeHandoff(page: Page, record: (name: string, data: unknown) => Promise<void>) {
  await settleFrame(page); const before = await assertRootFrame(page), states: State[] = [];
  await startFrameSampling(page);
  try {
    await page.locator(".ui-navigation-toggle").click(); await settleFrame(page);
    await page.locator('[data-slot="navigation-sheet"] [data-naeil-account-trigger]').click(); await settleFrame(page);
    states.push(await frameState(page)); stableFrame(before, states.at(-1)!);
    await page.getByRole("menuitem", { name: "로그아웃", exact: true }).click();
    const guard = page.getByTestId("guard"); await expect(guard).toBeVisible(); await settleFrame(page);
    await expect(page.getByRole("dialog")).toHaveCount(1);
    assert(await guard.evaluate(e => e.contains(document.activeElement)), "Confirmation owns focus");
    states.push(await frameState(page)); stableFrame(before, states.at(-1)!);
    assert.equal(states.at(-1)!.lock, "1");
    await backgroundWheel(page, true);
    await guard.getByRole("button", { name: "Cancel", exact: true }).click(); await settleFrame(page);
    await expect.poll(() => page.locator("body").getAttribute("data-scroll-locked")).toBe(null);
    states.push(await frameState(page)); stableFrame(before, states.at(-1)!); unlockedBody(before, states.at(-1)!);
    if (before.scrollHeight > page.viewportSize()!.height) await backgroundWheel(page, false);
  } finally { await finishFrameSampling(page, before, record, states); }
}

export async function exerciseFrameLocks(page: Page, record: (name: string, data: unknown) => Promise<void>) {
  await settleFrame(page);
  const before = await assertRootFrame(page);
  const scrollable = before.scrollHeight > page.viewportSize()!.height;
  if (scrollable) await backgroundWheel(page, false);
  await startFrameSampling(page);
  const states: Record<string, unknown> = { before };
  const check = async (label: string, locked: boolean) => {
    await settleFrame(page);
    const state = await frameState(page); stableFrame(before, state);
    if (locked) {
      assert(state.lock !== null && Number(state.lock) > 0, `${label}: actual lock`);
      assert.equal(state.margin, "0px"); assert.equal(state.removed, "0px"); assert.equal(state.overflow, "hidden");
    } else unlockedBody(before, state);
    states[label] = state;
    if (label === "0-dialog-open") await record("dialog-open", state);
  };
  try {
    for (let repeat = 0; repeat < 2; repeat++) {
      for (const [label, trigger] of [["menu", page.getByRole("button", { name: "Body menu", exact: true })], ["select", page.getByRole("combobox", { name: "Body language" })], ["dialog", page.getByRole("button", { name: "Body dialog", exact: true })]] as const) {
        await trigger.click(); await check(`${repeat}-${label}-open`, true);
        if (label === "dialog") {
          const dialog = page.getByTestId("body-dialog");
          assert(await dialog.evaluate(e => e.contains(document.activeElement)), "Modal focus must stay in the dialog");
          await page.keyboard.press("Tab");
          assert(await dialog.evaluate(e => e.contains(document.activeElement)), "Tab must stay in the dialog");
          await backgroundWheel(page, true);
          const scroll = page.getByTestId("dialog-scroll"); await scroll.hover(); await page.mouse.wheel(0, 200);
          await expect.poll(() => scroll.evaluate(e => e.scrollTop)).toBeGreaterThan(0);
          await dialog.getByRole("button", { name: "Nested dialog", exact: true }).click();
          await expect(page.locator("body")).toHaveAttribute("data-scroll-locked", "2");
          await check(`${repeat}-nested-open`, true);
          await page.getByRole("button", { name: "Close nested", exact: true }).click();
          await expect(page.locator("body")).toHaveAttribute("data-scroll-locked", "1");
          await check(`${repeat}-nested-close`, true);
          await backgroundWheel(page, true);
        }
        await page.keyboard.press("Escape");
        await expect.poll(() => page.locator("body").getAttribute("data-scroll-locked")).toBe(null);
        await check(`${repeat}-${label}-closed`, false);
      }
      const mobile = await page.locator(".ui-navigation-toggle").isVisible();
      if (mobile) await page.locator(".ui-navigation-toggle").click();
      const scope = mobile ? page.locator('[data-slot="navigation-sheet"]') : page.locator("header");
      if (mobile) await check(`${repeat}-sheet-open`, true);
      for (const trigger of [scope.locator('[data-naeil-account-trigger]'), scope.getByRole("combobox")]) {
        if (!await trigger.count()) continue;
        if (await trigger.isDisabled()) continue;
        const label = await trigger.getAttribute("data-slot");
        await trigger.click(); await check(`${repeat}-header-${label}-open`, true);
        await page.keyboard.press("Escape"); await settleFrame(page);
        if (mobile) assert(await page.locator("body").getAttribute("data-scroll-locked"), "Nested close must retain the sheet lock");
        else await expect.poll(() => page.locator("body").getAttribute("data-scroll-locked")).toBe(null);
        await check(`${repeat}-header-inner-closed`, mobile);
      }
      if (mobile) {
        await page.keyboard.press("Escape");
        await expect.poll(() => page.locator("body").getAttribute("data-scroll-locked")).toBe(null);
      } else {
        const popover = page.locator(".ui-navigation-desktop > button").first();
        if (await popover.count()) {
          await popover.focus(); await popover.press("Enter"); await settleFrame(page);
          assert.equal(await page.locator("body").getAttribute("data-scroll-locked"), null, "Navigation popover must remain nonmodal");
          await page.keyboard.press("Escape");
        }
      }
      await check(`${repeat}-all-closed`, false);
      if (scrollable) await backgroundWheel(page, false);
    }
  } finally {
    await finishFrameSampling(page, before, record, states);
  }
}
