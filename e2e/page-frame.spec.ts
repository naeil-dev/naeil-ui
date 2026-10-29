import { test, expect } from "@playwright/test";
import { frameState, stableFrame, settleFrame, exercisePageFrame, exerciseFrameLocks } from "../scripts/page-frame-browser";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

test.beforeEach(async ({ page, browser, browserName }, info) => {
  const mode = process.env.NAEIL_UI_SCROLLBAR_MODE;
  if (mode && browserName !== "chromium") test.skip();
  let argv: string[] | undefined;
  if (browserName === "chromium") {
    const cdp = await browser.newBrowserCDPSession();
    argv = (await cdp.send("Browser.getBrowserCommandLine")).arguments;
    await cdp.detach();
  }
  if (mode) {
    expect(argv).not.toContain("--hide-scrollbars");
    expect(argv).toContain(mode === "classic" ? "Always" : "WhenScrolling");
  }
  await page.setContent('<!doctype html><style>html{scrollbar-gutter:stable}body{margin:0}main{height:3000px}</style><main></main>');
  const probe = await frameState(page);
  if (mode) expect(probe.scrollbar).toBe(mode === "classic" ? 15 : 0);
  expect(probe.available).toBe(page.viewportSize()!.width - probe.scrollbar);
  await info.attach("launch-and-probe", { contentType: "application/json", body: JSON.stringify({ browser: browser.version(), mode: mode || "default engine", argv, probe, fixtureIdentity: JSON.parse(readFileSync("test-results/chrome-fixtures/identity.json", "utf8")), wrapperSha256: mode ? createHash("sha256").update(readFileSync(`${process.env.NAEIL_UI_SCROLLBAR_WRAPPERS}/chromium-${mode}.sh`)).digest("hex") : null }) });
});

test("root reservation prevents short to long anchor motion", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://127.0.0.1:6008/candidate/index.html?locale=ko&auth=in");
  await page.evaluate(() => document.fonts.ready);
  const frame = page.locator(".ui-navigation-frame");
  const before = await frame.boundingBox();
  await page.locator("main").evaluate(e => (e as HTMLElement).style.minHeight = "3000px");
  expect((await frame.boundingBox())!.width).toBeCloseTo(before!.width, 2);
});

for (const css of ["globals", "split"]) for (const locale of ["ko", "en", "ja"]) for (const theme of ["light", "dark"]) for (const width of [320, 390, 768, 1440, 1920, 2560]) {
  test(`G2 natural frame ${css}/${locale}/${theme}/${width}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`http://127.0.0.1:6008/candidate/index.html?frame&css=${css}&locale=${locale}&theme=${theme}&auth=in`);
    await expect(page.locator("html")).toHaveClass(new RegExp(theme));
    await exercisePageFrame(page, async (name, data) => { await info.attach(name, { body: JSON.stringify(data), contentType: "application/json" }); });
    const before = await frameState(page);
    await info.attach("viewport", { body: await page.screenshot(), contentType: "image/png" });
    stableFrame(before, await frameState(page));
  });
}

for (const css of ["globals", "split"]) {
  test(`G3 removing correction detects content drift ${css}`, async ({ page }, info) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`http://127.0.0.1:6008/candidate/index.html?frame&long&css=${css}-no-correction`);
    await settleFrame(page); const before = await frameState(page);
    await page.getByRole("button", { name: "Body dialog", exact: true }).click();
    await expect(page.locator("body")).toHaveAttribute("data-scroll-locked", "1");
    const open = await frameState(page);
    expect(open.boxes[".ui-navigation-frame"]).toEqual(before.boxes[".ui-navigation-frame"]);
    if (before.scrollbar > 0) {
      expect(before.boxes.body!.width - open.boxes.body!.width).toBe(before.scrollbar);
      expect(() => stableFrame(before, open)).toThrow();
    }
    await info.attach("intentional-failure", { body: JSON.stringify({ before, open }), contentType: "application/json" });
  });

  test(`G1 opt-out and false-support branch ${css}`, async ({ page }, info) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const rows: unknown[] = [];
    for (const control of [`${css}&optout`, `${css}-guard-false`, "theme-only", "js-only"]) {
      await page.goto(`http://127.0.0.1:6008/candidate/index.html?frame&long&css=${control}`);
      await settleFrame(page);
      const before = await frameState(page); expect(before.gutter).toBe("auto");
      await page.getByRole("button", { name: "Body dialog", exact: true }).click();
      await expect(page.locator("body")).toHaveAttribute("data-scroll-locked", "1");
      const open = await frameState(page), gap = before.innerWidth - before.clientWidth;
      expect(open.margin).toBe(`${gap}px`); expect(open.removed).toBe(`${gap}px`);
      await page.keyboard.press("Escape");
      await expect.poll(() => page.locator("body").getAttribute("data-scroll-locked")).toBe(null);
      rows.push({ control, note: "false guard is fixture branch coverage, not a real unsupported engine", before, open, closed: await frameState(page) });
    }
    await info.attach("controls", { contentType: "application/json", body: JSON.stringify(rows) });
  });

  test(`G2 actual container breakpoint ${css}`, async ({ page }, info) => {
    await page.goto(`http://127.0.0.1:6008/candidate/index.html?frame&css=${css}`);
    let low = 768, high = 880;
    while (high - low > 1) {
      const width = Math.floor((low + high) / 2); await page.setViewportSize({ width, height: 900 });
      if (await page.locator(".ui-navigation-toggle").isVisible()) low = width; else high = width;
    }
    const rows: unknown[] = [];
    for (const width of [low, high]) {
      await page.setViewportSize({ width, height: 900 });
      await exercisePageFrame(page, async (name, data) => { rows.push({ width, name, data }); });
      expect(await page.locator(".ui-navigation-toggle").isVisible()).toBe(width === low);
    }
    await info.attach("container-boundary", { contentType: "application/json", body: JSON.stringify(rows) });
  });
}

for (const css of ["globals", "split"]) for (const width of [320, 390, 1440, 1920]) for (const long of [false, true]) for (const motion of ["reduce", "no-preference"] as const) {
  test(`G3 frame and content locks ${css}/${width}/${long ? "long" : "short"}/${motion}`, async ({ page }, info) => {
    test.setTimeout(60000);
    const locale = width === 320 || width === 1440 ? "ja" : "ko", theme = long ? "dark" : "light";
    const auth = width === 320 ? "out" : width === 1920 ? "busy" : "in";
    await page.setViewportSize({ width, height: 900 }); await page.emulateMedia({ reducedMotion: motion });
    await page.goto(`http://127.0.0.1:6008/candidate/index.html?frame&css=${css}&locale=${locale}&theme=${theme}&auth=${auth}${long ? "&long" : ""}`);
    await exerciseFrameLocks(page, async (name, data) => {
      await info.attach(name, { contentType: "application/json", body: JSON.stringify(data) });
      if (name === "dialog-open") {
        const before = await frameState(page); await info.attach(name, { contentType: "image/png", body: await page.screenshot() }); stableFrame(before, await frameState(page));
      }
    });
  });
}

for (const theme of ["light", "dark"]) for (const long of [false, true]) {
  test(`G5 Japanese 320 F3 ${theme}/${long}`, async ({ page }, info) => {
    await page.setViewportSize({ width: 320, height: 900 });
    const heights = [];
    for (const profile of ["site", "home", "login-gate"]) {
      await page.goto(`http://127.0.0.1:6008/candidate/index.html?frame&locale=ja&theme=${theme}&auth=${profile === "home" ? "in" : "out"}&profile=${profile}${long ? "&long" : ""}`);
      await page.locator(".ui-navigation-toggle").click(); await settleFrame(page);
      const state = await frameState(page), controls = page.locator('.ui-navigation-mobile-toolbar .naeil-header-controls');
      const height = (await controls.boundingBox())!.height;
      expect(height).toBe(profile === "site" && state.scrollbar === 15 ? 104 : 44);
      for (const control of await controls.locator("button, a, [role=combobox]").all()) {
        expect((await control.boundingBox())!.height).toBeGreaterThanOrEqual(44);
        await control.focus(); await expect(control).toBeFocused();
      }
      const before = await frameState(page); await info.attach(`${profile}-viewport`, { body: await page.screenshot(), contentType: "image/png" }); stableFrame(before, await frameState(page));
      heights.push({ profile, height, state });
    }
    await info.attach("F3", { body: JSON.stringify(heights), contentType: "application/json" });
  });
}

for (const css of ["globals", "split"]) for (const motion of ["reduce", "no-preference"] as const) {
  test(`G3 Home sheet to confirmation ${css}/${motion}`, async ({ page }, info) => {
    await page.setViewportSize({ width: 390, height: 900 }); await page.emulateMedia({ reducedMotion: motion });
    await page.goto(`http://127.0.0.1:6008/candidate/index.html?frame&long&profile=home&locale=ko&css=${css}`);
    await settleFrame(page); const before = await frameState(page);
    const states = [];
    await page.locator(".ui-navigation-toggle").click(); await settleFrame(page);
    stableFrame(before, await frameState(page));
    await page.locator('[data-slot="navigation-sheet"] [data-naeil-account-trigger]').click(); await settleFrame(page);
    states.push(await frameState(page)); stableFrame(before, states[0]);
    await page.getByRole("menuitem", { name: "로그아웃", exact: true }).click();
    const guard = page.getByTestId("guard"); await expect(guard).toBeVisible(); await settleFrame(page);
    await expect(page.getByRole("dialog")).toHaveCount(1);
    expect(await guard.evaluate(e => e.contains(document.activeElement))).toBe(true);
    states.push(await frameState(page)); stableFrame(before, states[1]);
    await guard.getByRole("button", { name: "Cancel", exact: true }).click(); await settleFrame(page);
    await expect.poll(() => page.locator("body").getAttribute("data-scroll-locked")).toBe(null);
    states.push(await frameState(page)); stableFrame(before, states[2]);
    await info.attach("handoff", { contentType: "application/json", body: JSON.stringify({ before, states }) });
  });
}

test("reserved root does not duplicate body scroll-lock compensation", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://127.0.0.1:6008/candidate/index.html?locale=ko&auth=in");
  await page.evaluate(() => { document.documentElement.style.scrollbarGutter = "stable"; });
  await page.locator("main").evaluate(e => (e as HTMLElement).style.minHeight = "3000px");
  const before = (await page.locator("body").boundingBox())!.width;
  await page.getByRole("button", { name: "Body dialog", exact: true }).click();
  await expect(page.locator("body")).toHaveAttribute("data-scroll-locked", "1");
  expect((await page.locator("body").boundingBox())!.width).toBeCloseTo(before, 2);
});
