import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function usage(page: Page, family: string, theme = "light", density = "comfortable") {
  await page.goto(`/iframe.html?id=ui-${family}--usage&viewMode=story&globals=theme:${theme};density:${density};a11y:(manual:!true)`);
  await expect(page.locator("#storybook-root")).not.toBeEmpty();
  await expect(page.locator("html")).toHaveClass(new RegExp(theme));
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    await Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {})));
  });
}

async function renderedContrast(page: Page, family: "tabs" | "textarea") {
  await page.evaluate(async () => {
    await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    await Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => {})));
  });
  return page.evaluate(kind => {
    function luminance(value: string) {
      const channels = value.match(/[\d.]+/g)?.map(Number);
      if (!channels || channels.length < 3 || (channels.length === 4 && channels[3] !== 1))
        throw new Error(`Expected opaque rendered RGB color, got ${value}`);
      const [r, g, b] = channels.slice(0, 3).map(channel => {
        const fraction = channel / 255;
        return fraction <= 0.04045 ? fraction / 12.92 : ((fraction + 0.055) / 1.055) ** 2.4;
      });
      return r * 0.2126 + g * 0.7152 + b * 0.0722;
    }
    function pair(name: string, foreground: string, background: string, minimum: number) {
      const a = luminance(foreground), b = luminance(background);
      return { name, foreground, background, minimum, ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) };
    }
    const canvas = getComputedStyle(document.body).backgroundColor;
    if (kind === "tabs") {
      const selected = getComputedStyle(document.querySelector('[data-slot="tabs-trigger"][data-state="active"]')!);
      return [pair("selected text", selected.color, selected.backgroundColor, 4.5),
        pair("selected border inside", selected.borderBottomColor, selected.backgroundColor, 3),
        pair("selected border outside", selected.borderBottomColor, canvas, 3),
        pair("focus outline on canvas", selected.outlineColor, canvas, 3)];
    }
    const field = document.querySelector('[data-slot="textarea"][name="notes"]')!;
    const style = getComputedStyle(field), placeholder = getComputedStyle(field, "::placeholder");
    return [pair("textarea text", style.color, style.backgroundColor, 4.5),
      pair("textarea placeholder", placeholder.color, style.backgroundColor, 4.5),
      pair("textarea boundary inside", style.borderColor, style.backgroundColor, 3),
      pair("textarea boundary outside", style.borderColor, canvas, 3),
      pair("textarea focus outline", style.outlineColor, canvas, 3)];
  }, family);
}

test("Tabs automatic keyboard skips disabled, loops and unmounts drafts", async ({ page }) => {
  await usage(page, "tabs");
  const overview = page.getByRole("tab", { name: "Overview", exact: true });
  const history = page.getByRole("tab", { name: "History", exact: true });
  await expect(overview).toHaveAttribute("aria-selected", "true");
  const draft = page.getByLabel("Temporary panel draft");
  await draft.fill("Changed draft");
  await overview.focus(); await overview.press("ArrowRight");
  await expect(history).toBeFocused(); await expect(history).toHaveAttribute("aria-selected", "true");
  await expect(draft).toHaveCount(0);
  await history.press("ArrowRight"); await expect(overview).toBeFocused();
  await expect(draft).toHaveValue("Initial draft");
  await overview.press("End"); await expect(history).toBeFocused();
  await history.press("Home"); await expect(overview).toBeFocused();
  await expect(page.getByRole("tab", { name: "Unavailable", exact: true })).toBeDisabled();
  const controls = await overview.getAttribute("aria-controls");
  await expect(page.locator(`[id="${controls}"]`)).toHaveAttribute("role", "tabpanel");
  await expect(page.locator(`[id="${controls}"]`)).toHaveAttribute("aria-labelledby", await overview.getAttribute("id") as string);
});

test("Tabs controlled manual/vertical, loop override and retained hidden children", async ({ page }) => {
  await usage(page, "tabs");
  const profile = page.getByRole("tab", { name: "Profile", exact: true });
  const alerts = page.getByRole("tab", { name: "Alerts", exact: true });
  await profile.focus(); await profile.press("ArrowDown");
  await expect(alerts).toBeFocused(); await expect(profile).toHaveAttribute("aria-selected", "true");
  await alerts.press("ArrowDown"); await expect(alerts).toBeFocused();
  await alerts.press("Enter"); await expect(alerts).toHaveAttribute("aria-selected", "true");
  await alerts.press("ArrowUp"); await profile.press("Space"); await expect(profile).toHaveAttribute("aria-selected", "true");
  const retained = page.getByLabel("Retained panel draft"); await retained.fill("Preserved draft");
  await page.getByRole("tab", { name: "Preview", exact: true }).click();
  await expect(retained).toHaveCount(1); await expect(retained).toBeHidden();
  await page.getByRole("tab", { name: "Draft", exact: true }).click(); await expect(retained).toHaveValue("Preserved draft");

});

test("Textarea native refs/rows/editing, form values, invalid recovery and choices", async ({ page }) => {
  await usage(page, "textarea", "dark");
  const notes = page.getByLabel("Workspace notes", { exact: true });
  expect(await notes.evaluate(element => (element as HTMLTextAreaElement).rows)).toBe(2);
  await expect(notes).toHaveCSS("resize", "vertical");
  await expect(page.getByLabel("Four-row notes")).toHaveAttribute("rows", "4");
  await expect(page.getByLabel("Four-row notes")).toHaveCSS("resize", "none");
  await page.getByRole("button", { name: "Save notes", exact: true }).click();
  await expect(notes).toBeFocused(); await expect(notes).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("alert")).toHaveText("Enter workspace notes before saving.");
  await notes.fill("한글 / English / 日本語"); await notes.press("End"); await notes.press("Enter"); await notes.press("n");
  await expect(notes).toHaveValue("한글 / English / 日本語\nn");
  await expect(notes).toHaveAttribute("aria-invalid", "false");
  const instant = page.getByRole("radio", { name: "Instant delivery", exact: true });
  const digest = page.getByRole("radio", { name: "Daily digest", exact: true });
  await instant.focus(); await instant.press("ArrowDown"); await expect(digest).toBeChecked();
  await page.getByText("Instant delivery", { exact: true }).click(); await expect(instant).toBeChecked();
  await page.getByText("Daily digest", { exact: true }).click(); await expect(digest).toBeChecked();
  const values = await notes.evaluate(element => Object.fromEntries(new FormData((element as HTMLTextAreaElement).form!)));
  expect(values).toMatchObject({ delivery: "digest", language: "en", reference: "Reference notes\nKeep this value" });
  expect(values).not.toHaveProperty("unavailable");
  const pinned = page.getByRole("button", { name: "Pin preview" });
  await pinned.focus(); await pinned.press("Space"); await expect(pinned).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Save notes", exact: true }).click();
  await expect(page.getByRole("button", { name: "Saving…" })).toHaveAttribute("aria-busy", "true");
  await expect(page.getByRole("status")).toHaveText("Saved digest / en. (Example)");
  await expect(notes).toHaveValue("한글 / English / 日本語\nn");
});

for (const theme of ["light", "dark"]) for (const density of ["comfortable", "compact"]) {
  test(`Extensions rendered ${theme}/${density}: tokens, contrast, focus and local overflow`, async ({ page }, info) => {
    await usage(page, "tabs", theme, density);
    const overview = page.getByRole("tab", { name: "Overview", exact: true });
    await expect(overview).toHaveCSS("height", density === "compact" ? "36px" : "40px");
    await expect(overview).toHaveCSS("font-size", "16px");
    expect(await overview.evaluate(element => getComputedStyle(element).transitionDuration)).toContain("0.12s");
    await overview.focus(); await overview.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "History", exact: true })).toHaveCSS("outline-style", "solid");
    await page.getByRole("tab", { name: "History", exact: true }).press("ArrowLeft");
    await expect(overview).toBeFocused();
    const tabContrast = await renderedContrast(page, "tabs");
    for (const pair of tabContrast) expect(pair.ratio, pair.name).toBeGreaterThanOrEqual(pair.minimum);
    await info.attach("tabs-rendered-contrast", { body: JSON.stringify(tabContrast), contentType: "application/json" });
    const list = page.getByRole("tablist", { name: "Localized sections" });
    expect(await list.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
    await list.getByRole("tab").first().focus(); await page.keyboard.press("End");
    await expect(list.getByRole("tab").last()).toBeFocused();
    await expect.poll(() => list.getByRole("tab").last().evaluate(element => { const rect = element.getBoundingClientRect(), parent = element.parentElement!.getBoundingClientRect(); return rect.left >= parent.left && rect.right <= parent.right; })).toBe(true);
    await expect(list.getByRole("tab").last()).toHaveAttribute("aria-selected", "true");
    const tabsAxe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(tabsAxe.violations).toEqual([]);
    await info.attach("tabs-axe", { body: JSON.stringify(tabsAxe), contentType: "application/json" });
    await page.screenshot({ path: info.outputPath(`tabs-${theme}-${density}-1440.png`), fullPage: true });
    await usage(page, "textarea", theme, density);
    const notes = page.getByLabel("Workspace notes", { exact: true });
    await expect(notes).toHaveCSS("font-size", "16px"); await expect(notes).toHaveCSS("line-height", "25px");
    await expect(notes).toHaveCSS("min-height", density === "compact" ? "36px" : "40px");
    await expect(notes).toHaveCSS("padding-top", "8px");
    expect(await notes.evaluate(element => getComputedStyle(element).transitionDuration)).toContain("0.12s");
    await notes.focus();
    const normalContrast = await renderedContrast(page, "textarea");
    for (const pair of normalContrast) expect(pair.ratio, pair.name).toBeGreaterThanOrEqual(pair.minimum);
    await info.attach("textarea-rendered-contrast-normal", { body: JSON.stringify(normalContrast), contentType: "application/json" });
    await page.getByRole("button", { name: "Save notes", exact: true }).click();
    await expect(notes).toHaveCSS("outline-style", "solid");
    const fieldContrast = await renderedContrast(page, "textarea");
    for (const pair of fieldContrast) expect(pair.ratio, pair.name).toBeGreaterThanOrEqual(pair.minimum);
    await info.attach("textarea-rendered-contrast", { body: JSON.stringify(fieldContrast), contentType: "application/json" });
    const textareaAxe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(textareaAxe.violations).toEqual([]);
    await info.attach("textarea-axe-invalid", { body: JSON.stringify(textareaAxe), contentType: "application/json" });
    await page.screenshot({ path: info.outputPath(`textarea-${theme}-${density}-1440-invalid.png`), fullPage: true });
  });
}

test("Extensions mobile/localized, reduced motion, text scaling and CSS zoom", async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 900 });
  for (const family of ["tabs", "textarea"]) {
    await usage(page, family, "dark", "compact");
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const control = family === "tabs" ? page.getByRole("tab", { name: "Overview", exact: true }) : page.getByLabel("Workspace notes", { exact: true });
    await expect(control).toHaveCSS("min-height", "44px");
    await expect(control).toHaveCSS("transition-duration", "0s");
    await page.screenshot({ path: info.outputPath(`${family}-dark-320-compact.png`), fullPage: true });
    await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
    await expect(control).toHaveCSS("font-size", "32px");
    if (family === "tabs") expect(await control.evaluate(element => element.clientHeight >= parseFloat(getComputedStyle(element).lineHeight))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.evaluate(() => { document.documentElement.style.fontSize = ""; document.documentElement.style.zoom = "2"; });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.setViewportSize({ width: 320, height: 900 });
  }
});

test("Extensions forced-colors retains selected border and invalid focus", async ({ page, browserName }, info) => {
  test.skip(browserName !== "chromium", "Chromium forced-colors media emulation only; actual Windows high contrast remains manual.");
  await page.emulateMedia({ forcedColors: "active" });
  await usage(page, "tabs");
  const tab = page.getByRole("tab", { name: "Overview", exact: true }); await tab.focus(); await tab.press("ArrowRight"); await page.keyboard.press("ArrowLeft");
  await expect(tab).toHaveCSS("outline-style", "solid"); await expect(tab).toHaveCSS("border-bottom-width", "2px");
  expect(await tab.evaluate(element => getComputedStyle(element).borderBottomColor)).not.toBe("rgba(0, 0, 0, 0)");
  await page.screenshot({ path: info.outputPath("tabs-forced-colors.png"), fullPage: true });
  await usage(page, "textarea"); await page.getByRole("button", { name: "Save notes", exact: true }).click();
  await expect(page.getByLabel("Workspace notes", { exact: true })).toHaveCSS("outline-style", "solid");
  await expect(page.getByRole("alert")).toBeVisible();
  await page.screenshot({ path: info.outputPath("textarea-forced-colors.png"), fullPage: true });
});
