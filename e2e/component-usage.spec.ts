import { expect, test, type Page, type TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const families = ["button", "input", "card", "dialog", "dropdownmenu", "badge", "avatar", "toaster", "select", "switch", "checkbox"];
async function usage(page: Page, family: string, theme = "light", density = "comfortable") {
  await page.goto(`/iframe.html?id=ui-${family}--usage&viewMode=story&globals=theme:${theme};density:${density};a11y:(manual:!true)`);
  await expect(page.locator("#storybook-root")).not.toBeEmpty();
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator("html")).toHaveClass(new RegExp(theme));
  // Let theme transitions settle; intermediate colors are not the rest-state palette.
  await page.evaluate(async () => {
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    await Promise.all(document.getAnimations().filter(animation => !animation.effect?.getTiming().iterations || animation.effect.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {})));
  });
}
async function axe(page: Page, info: TestInfo, state: string) {
  // Opening overlays starts finite opacity/color animations after usage() has
  // settled the theme. Scan the stable open state, with no rules suppressed.
  await page.evaluate(async () => {
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    await Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {})));
  });
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  await info.attach(`axe-${state}`, { body: JSON.stringify({ state, violations: result.violations, incomplete: result.incomplete }, null, 2), contentType: "application/json" });
  expect(result.violations).toEqual([]);
  return result;
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

for (const family of families) {
  test(`${family}: actual built Docs guide`, async ({ page }) => {
    await page.goto(`/?path=/docs/ui-${family}--docs`);
    const docs = page.frameLocator("#storybook-preview-iframe");
    await expect(docs.getByRole("heading", { name: "API and wrapper defaults", exact: true })).toBeVisible({ timeout: 15000 });
    await expect(docs.getByRole("heading", { name: "States, resilience and mistakes", exact: true })).toBeVisible();
    await expect(docs.getByRole("link", { name: "shared usage contract", exact: true })).toHaveAttribute("href", /docs\/components\/common.md$/);
    if (family === "avatar") {
      await expect(docs.getByText('For a named group, supply', { exact: false })).toBeVisible();
      await expect(docs.getByText('3 additional members', { exact: false })).toBeVisible();
    }
  });
  for (const theme of ["light", "dark"]) test(`${family}: ${theme} mobile compact localized accessibility`, async ({ page }, info) => {
    await page.setViewportSize({ width: 320, height: 900 });
    await usage(page, family, theme, "compact");
    await expect(page.locator("html")).toHaveAttribute("data-ui-density", "compact");
    if (family === "dialog") await page.getByRole("button", { name: "Edit workspace", exact: true }).click();
    if (family === "dropdownmenu") await page.getByRole("button", { name: "Workspace actions" }).click();
    if (family === "select") await page.getByRole("combobox", { name: "Language" }).click();
    await noOverflow(page);
    await expect(page.locator('[lang="ko"]').first()).toBeVisible();
    await expect(page.locator('[lang="en"]').first()).toBeVisible();
    await expect(page.locator('[lang="ja"]').first()).toBeVisible();
    if (family === "avatar") {
      const group = page.getByRole("group", { name: "Team members", exact: true });
      await expect(group).toMatchAriaSnapshot(`
        - group "Team members":
          - img "Alex Lee": AL
          - img "田中 遥": 田
          - text: 3 additional members
      `);
      await info.attach("avatar-group-accessibility", { body: await group.ariaSnapshot(), contentType: "text/plain" });
      await expect(page.locator('[data-slot="avatar-image"]')).toBeVisible();
      await expect(page.locator('[data-slot="avatar-fallback"]', { hasText: "KM" })).toBeVisible();
      await expect(group.locator('[data-slot="avatar-group-count"] > [aria-hidden="true"]')).toHaveText("+3");
      await page.screenshot({ path: info.outputPath(`avatar-${theme}-320-compact.png`), fullPage: true });
    }
    const result = await axe(page, info, `${family}-${theme}-mobile`);
    if (family === "avatar") expect(result.incomplete.filter(finding => finding.id === "aria-prohibited-attr")).toEqual([]);
  });
}

test("Dialog traps focus, preserves invalid input, recovers and restores trigger", async ({ page }, info) => {
  await usage(page, "dialog");
  const trigger = page.getByRole("button", { name: "Edit workspace", exact: true });
  await trigger.focus(); await trigger.press("Enter");
  const dialog = page.getByRole("dialog", { name: "Edit workspace" });
  await expect(dialog).toBeVisible();
  const input = page.getByRole("textbox", { name: "Workspace name" });
  await expect(input).toBeFocused();
  for (let i = 0; i < 7; i++) {
    await page.keyboard.press("Tab");
    expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
  }
  for (let i = 0; i < 7; i++) {
    await page.keyboard.press("Shift+Tab");
    expect(await dialog.evaluate(element => element.contains(document.activeElement))).toBe(true);
  }
  await page.getByRole("button", { name: "Save workspace", exact: true }).click();
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(input).toBeFocused();
  await axe(page, info, "dialog-open-invalid");
  await input.fill("긴 작업 공간 / Long workspace / 長い作業場所");
  await page.getByRole("button", { name: "Save workspace", exact: true }).click();
  await expect(page.getByRole("button", { name: "Saving…" })).toBeDisabled();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.getByRole("status")).toHaveText("Workspace saved. (Example)");
  await trigger.press("Enter"); await page.keyboard.press("Escape"); await expect(trigger).toBeFocused();
});

test("Input invalid/loading recovery keeps the value and announces completion", async ({ page }, info) => {
  await usage(page, "input", "dark");
  const input = page.getByRole("textbox", { name: "Notification email" });
  await input.fill("invalid"); await page.getByRole("button", { name: "Save email" }).click();
  await expect(input).toHaveValue("invalid"); await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(input).toBeFocused(); await axe(page, info, "input-invalid");
  await input.fill("valid@example.com"); await page.getByRole("button", { name: "Save email" }).click();
  const loading = page.getByRole("button", { name: "Saving…" });
  await expect(loading).toBeDisabled(); await expect(loading).toHaveAttribute("aria-busy", "true");
  await expect(page.getByRole("status")).toHaveText("Email saved. (Example)");
  await expect(page.getByRole("button", { name: "Save email" })).toBeEnabled();
});

test("Action menu keyboard, disabled items, checkbox/radio and submenu", async ({ page }, info) => {
  await usage(page, "dropdownmenu");
  const trigger = page.getByRole("button", { name: "Workspace actions" });
  await trigger.focus(); await trigger.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: /Copy reference/ })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  const mixed = page.getByRole("menuitemcheckbox", { name: "Show completed" });
  await expect(mixed).toBeFocused(); await expect(mixed).toHaveAttribute("aria-checked", "mixed");
  await axe(page, info, "menu-open-mixed");
  await page.keyboard.press("Enter");
  await expect(trigger).toBeFocused();
  await trigger.press("ArrowDown");
  await expect(page.getByRole("menuitemcheckbox", { name: "Show completed" })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("menuitemradio", { name: "Name first" }).click();
  await expect(page.getByText("Sort: name; completed: true", { exact: true })).toBeVisible();
  await trigger.press("ArrowDown");
  await page.getByRole("menuitem", { name: "More actions", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("menuitem", { name: "Export details" })).toBeFocused();
  await axe(page, info, "submenu-open");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toHaveText("Export prepared. (Example)");
  await expect(trigger).toBeFocused();
  await trigger.press("ArrowDown"); await page.keyboard.press("Escape"); await expect(trigger).toBeFocused();
});

test("Select submits values, skips disabled options and recovers empty/loading", async ({ page }, info) => {
  await usage(page, "select");
  const trigger = page.getByRole("combobox", { name: "Language" });
  await expect(trigger).toHaveText("Choose language");
  await trigger.focus(); await trigger.press("Enter");
  await page.keyboard.press("e");
  await expect(page.getByRole("option", { name: "English", exact: true })).toBeFocused();
  await axe(page, info, "select-open");
  await page.keyboard.press("Enter"); await expect(trigger).toHaveText("English"); await expect(trigger).toBeFocused();
  await page.getByRole("button", { name: "Submit value" }).click(); await expect(page.getByRole("status").last()).toHaveText("Submitted: en");
  await page.getByRole("button", { name: "Loading options" }).click(); await expect(trigger).toBeDisabled();
  await page.getByRole("button", { name: "Empty options" }).click(); await expect(page.getByText(/No languages available/)).toBeVisible();
  await page.getByRole("button", { name: "Retry options" }).click(); await expect(trigger).toBeEnabled();
  await page.getByRole("button", { name: "Clear", exact: true }).click(); await expect(trigger).toHaveText("Choose language");
});

test("Checkbox mixed group and disabled form semantics; Switch keyboard/form values", async ({ page }) => {
  await usage(page, "checkbox");
  const all = page.getByRole("checkbox", { name: "Select all channels" });
  await expect(all).toHaveAttribute("aria-checked", "mixed");
  await all.focus(); await all.press("Space"); await expect(all).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Desktop", exact: true })).toBeChecked();
  await page.getByRole("button", { name: "Save channels" }).click(); await expect(page.getByRole("status")).toHaveText("Submitted: email, desktop");
  await all.focus(); await all.press("Space"); await expect(all).not.toBeChecked();
  await page.getByRole("button", { name: "Save channels" }).click(); await expect(page.getByRole("status")).toHaveText("Submitted: none");
  await expect(page.getByRole("checkbox", { name: "Managed channel (unavailable)", exact: true })).toBeDisabled();
  await usage(page, "switch");
  const control = page.getByRole("switch", { name: "Weekly summary" });
  await control.focus(); await control.press("Space"); await expect(control).toBeChecked();
  await page.getByRole("button", { name: "Save preferences" }).click(); await expect(page.getByRole("status")).toHaveText("Summary enabled.");
  await control.focus(); await control.press("Space"); await expect(control).not.toBeChecked();
  await page.getByRole("button", { name: "Save preferences" }).click(); await expect(page.getByRole("status")).toHaveText("Summary disabled.");
});

test("Toaster loading update, action and keyboard focus return with reduced motion", async ({ page, browserName }, info) => {
  await usage(page, "toaster"); await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Start loading" }).click();
  const loading = page.locator('[data-sonner-toast][data-type="loading"]'); await expect(loading).toHaveText(/Saving workspace/);
  await expect(loading.locator("svg")).toHaveCSS("animation-name", "none");
  await page.getByRole("button", { name: "Finish loading" }).click(); await expect(page.locator('[data-sonner-toast]')).toHaveText(/Workspace saved/);
  const trigger = page.getByRole("button", { name: "Show success" }); await trigger.focus(); await trigger.press("Enter");
  await page.keyboard.press("Alt+t");
  expect(await page.locator('[data-sonner-toaster]').evaluate(element => element.contains(document.activeElement))).toBe(true);
  await page.keyboard.press("Escape");
  // Multiple toasts expose several tabbable items. Leave the stack rather
  // than assuming one Shift+Tab exits every engine's sequential focus order.
  for (let step = 0; step < 8; step++) {
    // macOS WebKit's default keyboard navigation uses Option+Tab for buttons.
    await page.keyboard.press(browserName === "webkit" ? "Alt+Shift+Tab" : "Shift+Tab");
    if (!await page.locator('[data-sonner-toaster]').evaluate(element => element.contains(document.activeElement))) break;
  }
  await info.attach("toast-focus-return", { body: JSON.stringify(await page.evaluate(() => ({ active: document.activeElement?.outerHTML, focused: document.hasFocus() }))), contentType: "application/json" });
  await expect(trigger).toBeFocused();
  // Verify keyboard return before the scan, then inspect the focused stack.
  await page.keyboard.press("Alt+t");
  await axe(page, info, "toast-success-action");
  await page.getByRole("button", { name: "Undo", exact: true }).click(); await expect(page.getByText("Change undone.", { exact: true })).toBeVisible();
});

test("Font faces are delivered locally for Korean/Latin and Japanese", async ({ page }) => {
  await usage(page, "input");
  const faces = await page.evaluate(async () => {
    const result = [];
    for (const [font, text] of [["400 16px Pretendard", "한글 Latin"], ['400 16px "Noto Sans JP"', "日本語"]]) {
      const loaded = await document.fonts.load(font, text);
      result.push({ font, count: loaded.length, available: document.fonts.check(font, text) });
    }
    return result;
  });
  for (const face of faces) { expect(face.count).toBeGreaterThan(0); expect(face.available).toBe(true); }
});

test("320px reflow, 200% text scaling and 200% CSS zoom on localized controls", async ({ page }, info) => {
  // These are separate CSS probes; they do not claim native desktop browser zoom.
  await page.setViewportSize({ width: 320, height: 900 }); await usage(page, "button"); await noOverflow(page);
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  await noOverflow(page); await expect(page.getByRole("button", { name: "Save settings" })).toHaveCSS("font-size", "32px");
  await usage(page, "checkbox");
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  await noOverflow(page);
  await page.setViewportSize({ width: 1280, height: 900 }); await usage(page, "dialog");
  await page.evaluate(() => { document.documentElement.style.zoom = "2"; });
  await page.getByRole("button", { name: "Edit workspace", exact: true }).click();
  const dialog = page.getByRole("dialog"); await expect(dialog).toBeVisible();
  expect(await dialog.evaluate(element => { const r = element.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; })).toBe(true);
  await axe(page, info, "dialog-css-zoom-200");
});

test("Forced-colors emulation retains control states and visible focus", async ({ page, browserName }, info) => {
  test.skip(browserName !== "chromium", "Forced-colors emulation checked in Chromium; actual Windows high contrast remains manual.");
  await page.emulateMedia({ forcedColors: "active" }); await usage(page, "switch");
  expect(await page.evaluate(() => matchMedia("(forced-colors: active)").matches)).toBe(true);
  const control = page.getByRole("switch", { name: "Weekly summary" });
  await control.focus(); await page.keyboard.press("Tab"); await page.keyboard.press("Shift+Tab");
  await expect(control).toHaveCSS("outline-style", "solid");
  const thumb = control.locator('[data-slot="switch-thumb"]');
  const trackColor = await control.evaluate(element => getComputedStyle(element).backgroundColor);
  expect(await thumb.evaluate(element => getComputedStyle(element).backgroundColor)).not.toBe(trackColor);
  await control.press("Space"); await expect(control).toBeChecked();
  await axe(page, info, "forced-colors-switch");
  await page.screenshot({ path: info.outputPath("forced-colors-switch.png") });
  await usage(page, "checkbox"); await expect(page.getByRole("checkbox", { name: "Select all channels" })).toHaveAttribute("aria-checked", "mixed");
  await expect(page.getByRole("checkbox", { name: "Email", exact: true })).toHaveCSS("border-top-style", "solid");
  await axe(page, info, "forced-colors-checkbox");
});

for (const theme of ["light", "dark"]) test(`Workspace visual evidence: ${theme}, wide/default and mobile/compact`, async ({ page }, info) => {
  await page.setViewportSize({ width: 2560, height: 1100 });
  await page.goto("/iframe.html?id=ui-v2--workspace&viewMode=story&globals=a11y:(manual:!true)");
  await page.getByRole("button", { name: theme === "light" ? "라이트" : "다크", exact: true }).click();
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByLabel("워크스페이스 이름")).toHaveCSS("font-size", "16px");
  await expect(page.getByLabel("워크스페이스 이름")).toHaveCSS("height", "40px");
  await expect(page.locator('[data-ui-layout="settings"]')).toHaveCSS("max-width", "640px");
  await expect(page.locator('[data-ui-layout="list"]')).toHaveCSS("max-width", "1200px");
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath(`workspace-${theme}-2560-default.png`), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "촘촘하게", exact: true }).click();
  await expect(page.getByLabel("워크스페이스 이름")).toHaveCSS("height", "44px");
  await noOverflow(page);
  await page.screenshot({ path: info.outputPath(`workspace-${theme}-390-compact.png`), fullPage: true });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "새 작업", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCSS("animation-name", "none");
  await expect(page.getByRole("dialog")).toHaveCSS("transition-duration", "0s");
  await axe(page, info, `workspace-${theme}-mobile-dialog`);
  await page.screenshot({ path: info.outputPath(`workspace-${theme}-390-dialog.png`) });
});

test("Choice labels and pseudo-element hit areas work without overlapping adjacent rows", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await usage(page, "switch");
  const control = page.getByRole("switch", { name: "Weekly summary" });
  const box = await control.boundingBox(); expect(box).not.toBeNull();
  const point = { x: box!.x + box!.width / 2, y: box!.y - 8 };
  expect(await control.evaluate((element, point) => element.contains(document.elementFromPoint(point.x, point.y)), point)).toBe(true);
  await page.mouse.click(point.x, point.y); await expect(control).toBeChecked();
  const rows = await page.locator(".ui-choice-label").evaluateAll(elements => elements.map(element => {
    const rect = element.getBoundingClientRect(); return { top: rect.top, bottom: rect.bottom, height: rect.height };
  }));
  for (const row of rows) expect(row.height).toBeGreaterThanOrEqual(44);
  for (let index = 1; index < rows.length; index++) expect(rows[index].top - rows[index - 1].bottom).toBeGreaterThanOrEqual(12);
});

test("Required Checkbox consumer error/focus and pending recovery", async ({ page }, info) => {
  await page.goto("/iframe.html?id=ui-checkbox--required-consent&globals=theme:light;a11y:(manual:!true)");
  const control = page.getByRole("checkbox", { name: "I agree to the terms" });
  await page.getByRole("button", { name: "Confirm consent" }).click();
  await expect(control).toHaveAttribute("aria-invalid", "true"); await expect(control).toBeFocused();
  await expect(page.getByRole("alert")).toHaveText("Agree to the terms before continuing.");
  await axe(page, info, "required-consent-invalid");
  await control.press("Space"); await page.getByRole("button", { name: "Confirm consent" }).click();
  await expect(page.getByRole("button", { name: "Confirming…" })).toBeDisabled();
  await expect(page.getByRole("status")).toHaveText("Consent confirmed. (Example)");
  await expect(control).toHaveAttribute("aria-invalid", "false");
});

test("Modal and nonmodal menu preserve refs/handlers and previously inert background", async ({ page }, info) => {
  await page.goto("/iframe.html?id=ui-dropdownmenu--overlay-resilience&globals=theme:light;a11y:(manual:!true)");
  const background = page.getByRole("button", { name: "Background action", includeHidden: true }), trigger = page.getByRole("button", { name: "Resilience actions" });
  await trigger.focus(); await trigger.press("Enter");
  await expect(page.getByTestId("overlay-ref")).toHaveText("Consumer ref: dropdown-menu-content");
  expect(await background.evaluate(element => element.closest("[inert]") !== null)).toBe(true);
  await background.evaluate(element => (element as HTMLElement).focus());
  await expect(background).not.toBeFocused();
  await axe(page, info, "default-modal-inert-background");
  await page.keyboard.press("Escape"); await expect(trigger).toBeFocused();
  await expect(page.getByTestId("overlay-ref")).toHaveText("Consumer ref: cleanup");
  await expect(page.getByTestId("overlay-events")).toHaveText(/menu close handler/);
  expect(await background.evaluate(element => element.closest("[inert]") !== null)).toBe(false);
  await expect(page.getByTestId("preexisting-inert")).toHaveAttribute("inert", "");
  await page.getByRole("button", { name: "Use nonmodal menu" }).click();
  await trigger.focus(); await trigger.press("Enter");
  expect(await background.evaluate(element => element.closest("[inert]") !== null)).toBe(false);
  await page.keyboard.press("Escape"); await expect(trigger).toBeFocused();
});

test("Nested Dialog/Select restores each focus layer and cleans inert on forced unmount", async ({ page }, info) => {
  await page.goto("/iframe.html?id=ui-dropdownmenu--overlay-resilience&globals=theme:light;a11y:(manual:!true)");
  const dialogTrigger = page.getByRole("button", { name: "Open nested dialog" });
  await dialogTrigger.click(); const dialog = page.locator('[role="dialog"]');
  const select = page.getByRole("combobox", { name: "Nested language" });
  await select.focus(); await select.press("Enter");
  await expect(dialog).toHaveAttribute("inert", "");
  await axe(page, info, "nested-dialog-select");
  await page.keyboard.press("Escape");
  await expect(select).toBeFocused(); await expect(dialog).not.toHaveAttribute("inert", "");
  await page.keyboard.press("Escape"); await expect(dialogTrigger).toBeFocused();
  await expect(page.getByTestId("overlay-events")).toHaveText(/dialog open handler/);
  const trigger = page.getByRole("button", { name: "Resilience actions" });
  await trigger.focus(); await trigger.press("Enter");
  // Force removal through a consumer-owned state control; this simulates a route
  // change while the modal background itself is deliberately inert.
  await page.getByRole("button", { name: "Unmount menu", includeHidden: true }).evaluate(element => (element as HTMLButtonElement).click());
  await expect(page.getByRole("menu")).toHaveCount(0);
  const background = page.getByRole("button", { name: "Background action" });
  expect(await background.evaluate(element => element.closest("[inert]") !== null)).toBe(false);
  await expect(page.getByTestId("preexisting-inert")).toHaveAttribute("inert", "");
  await expect(page.getByTestId("overlay-ref")).toHaveText("Consumer ref: cleanup");
});
