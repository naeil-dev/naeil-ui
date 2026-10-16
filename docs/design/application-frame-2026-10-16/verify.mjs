// Run after build:storybook + preview:storybook (6007) and build + next start (3097).
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";

const output = fileURLToPath(new URL("./", import.meta.url));
const storybook = process.env.NAEIL_FRAME_STORYBOOK_URL ?? "http://127.0.0.1:6007";
const site = process.env.NAEIL_FRAME_SITE_URL ?? "http://127.0.0.1:3097";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ ignoreDefaultArgs: ["--hide-scrollbars"] });
const report = { scrollbarMode: "native, --hide-scrollbars removed", cases: [], scrollbarPolicy: {}, site: { status: "not-run" } };

async function geometry(page) {
  return page.evaluate(() => ({
    innerWidth, clientWidth: document.documentElement.clientWidth,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    theme: document.documentElement.className,
    frames: [...document.querySelectorAll(".ui-navigation-frame, main.ui-app-frame, .ui-site-footer-frame")].map(element => {
      const rect = element.getBoundingClientRect(), css = getComputedStyle(element);
      return { x: rect.x, width: rect.width, gutter: parseFloat(css.paddingInlineStart) };
    }),
    content: [...document.querySelectorAll("[data-ui-layout]")].map(element => ({
      kind: element.getAttribute("data-ui-layout"), width: element.getBoundingClientRect().width,
    })),
  }));
}

async function capture(page, name, fixture) {
  await page.evaluate(() => document.fonts.ready);
  const result = await geometry(page);
  assert.equal(result.overflow, false, `${name}: page overflow`);
  for (const frame of result.frames) {
    assert(frame.width <= 1600, `${name}: frame cap`);
    assert(Math.abs(frame.x - result.frames[0].x) < 0.1, `${name}: frame alignment`);
    assert(Math.abs(frame.width - result.frames[0].width) < 0.1, `${name}: frame width alignment`);
  }
  const fonts = await page.evaluate(async () => {
    const faces = await document.fonts.load("400 16px Pretendard", "한글 Latin");
    return { pretendard: faces.length > 0 && document.fonts.check("400 16px Pretendard", "한글 Latin") };
  });
  assert(fonts.pretendard, `${name}: font loading`);
  await page.screenshot({ path: `${output}${name}.png`, animations: "disabled" });
  report.cases.push({ name, fixture, ...result, fonts });
}

async function openStory(page, id, theme) {
  await page.goto(`${storybook}/iframe.html?id=${id}&viewMode=story&globals=theme:${theme};a11y.manual:!true`);
  await page.locator("main").waitFor();
  if (id === "ui-v2--workspace") await page.getByRole("button", { name: theme === "light" ? "라이트" : "다크", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(new RegExp(theme));
}

try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1000 } });
  for (const theme of ["light", "dark"]) {
    await openStory(page, "ui-navigation--home", theme);
    await capture(page, `home-${theme}-1920`, "generic navigation, Korean dashboard, sparse");
    const before = await geometry(page);
    await page.getByRole("button", { name: "설정", exact: true }).click();
    await expect(page.getByRole("heading", { name: "설정", exact: true })).toBeVisible();
    await capture(page, `settings-${theme}-1920`, "same Korean frame, narrow settings route");
    assert.deepEqual((await geometry(page)).frames, before.frames, "Route content must not move shared chrome");
    assert.equal((await geometry(page)).content[0].width, 640);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await openStory(page, "brand-naeilheader--usage", "dark");
  await capture(page, "canonical-dark-390", "canonical header, Japanese, compact footer");
  await page.setViewportSize({ width: 1920, height: 1000 });
  await openStory(page, "brand-naeilheader--usage", "light");
  await capture(page, "canonical-light-1920", "canonical header, Japanese, compact footer");
  report.scrollbarPolicy.autoShort = await geometry(page);
  await page.locator("main").evaluate(element => { element.style.minHeight = "2400px"; });
  report.scrollbarPolicy.autoTall = await geometry(page);
  await page.locator("html").evaluate(element => { element.style.scrollbarGutter = "stable"; });
  report.scrollbarPolicy.stableTall = await geometry(page);
  await page.locator("main").evaluate(element => { element.style.minHeight = ""; });
  report.scrollbarPolicy.stableShort = await geometry(page);
  assert.deepEqual(report.scrollbarPolicy.stableTall.frames, report.scrollbarPolicy.stableShort.frames);

  await openStory(page, "ui-v2--workspace", "light");
  await page.locator('[data-ui-layout="list"]').scrollIntoViewIfNeeded();
  await capture(page, "workspace-list-light-1920", "Korean dense task list, reading/settings remain purpose-specific");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-ui-layout="list"]').scrollIntoViewIfNeeded();
  await capture(page, "workspace-list-light-390", "same task list, mobile reflow/local overflow");
  await page.close();

  siteChecks: for (const theme of ["light", "dark"]) for (const width of [390, 1920]) {
    const sitePage = await browser.newPage({ viewport: { width, height: 1000 }, colorScheme: theme });
    await sitePage.addInitScript(value => localStorage.setItem("theme", value), theme);
    let previous;
    for (const route of ["/ko", "/ko/design"]) {
      const response = await sitePage.goto(`${site}${route}`);
      if (!response?.ok()) {
        report.site = { status: "blocked", route, httpStatus: response?.status() };
        await sitePage.close();
        break siteChecks;
      }
      await sitePage.locator("main").waitFor();
      await expect(sitePage.locator("html")).toHaveClass(new RegExp(theme));
      const name = `site-${route === "/ko" ? "home" : "design"}-${theme}-${width}`;
      await capture(sitePage, name, `${route}, Korean, unchanged product-specific home body`);
      const current = (await geometry(sitePage)).frames[0];
      if (previous) assert.deepEqual(current, previous, "Site routes must preserve header geometry");
      previous = current;
    }
    await sitePage.close();
  }
  if (report.site.status !== "blocked") report.site = { status: "passed" };
} finally {
  await browser.close();
  await writeFile(`${output}measurements.json`, JSON.stringify(report, null, 2) + "\n");
}
console.log(`Verified ${report.cases.length} rendered cases plus native-scrollbar policy. Site: ${report.site.status}.`);
if (report.site.status === "blocked") process.exitCode = 1;
