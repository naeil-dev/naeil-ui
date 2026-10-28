import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const base = "http://127.0.0.1:6008";
const properties = ["color", "background-color", "border-color", "font-family", "font-size", "font-weight", "line-height", "letter-spacing", "opacity", "-webkit-font-smoothing", "-moz-osx-font-smoothing", "padding", "gap", "min-height"];
async function prepare(page: Page, side: string, query: string, state: string, home = false) {
  await page.goto(`${base}/${side}/index.html?${query}${home ? "&profile=home" : ""}${state === "current" ? `&current=${home ? "/" : "/design"}` : ""}`);
  await page.locator("header").waitFor();
  await page.evaluate(() => document.fonts.ready);
  const mobile = await page.locator(".ui-navigation-toggle").isVisible();
  if (mobile && ["sheet", "account", "locale", "current"].includes(state)) await page.locator(".ui-navigation-toggle").click();
  const scope = mobile && state !== "closed" && state !== "focus" ? page.locator('[data-slot="navigation-sheet"]') : page.locator("header");
  if (["hover", "focus", "popover"].includes(state)) {
    const target = mobile ? page.locator(".ui-navigation-toggle") : page.locator(".ui-navigation-desktop > button").first();
    if (state === "hover") await target.hover();
    else { await target.focus(); if (state === "popover") await target.press("Enter"); }
  }
  if (state === "account") await scope.locator("[data-naeil-account-trigger]").click();
  if (state === "locale") await scope.getByRole("combobox").click();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(document.getAnimations().filter(a => a.effect?.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => {})));
  });
}

async function snapshot(page: Page, home = false) {
  return page.evaluate(({ properties, home }) => {
    const visible = (e: Element) => !!e.getBoundingClientRect().width && !!e.getBoundingClientRect().height;
    const style = (e: Element) => Object.fromEntries(properties.map(p => [p, getComputedStyle(e).getPropertyValue(p)]));
    const rect = (e: Element, origin?: Element) => { const r = e.getBoundingClientRect(), o = origin?.getBoundingClientRect(); return { x: r.x - (o?.x || 0), y: r.y - (o?.y || 0), width: r.width, height: r.height }; };
    const roots = [...document.querySelectorAll('header, footer, [data-slot="navigation-popover"], [data-slot="navigation-sheet"], [data-naeil-account-menu], [data-slot="select-content"]')].filter(visible);
    if (!home) {
      const nodes = roots.flatMap(root => [root, ...root.querySelectorAll("*")].filter(visible).map(e => ({ tag: e.tagName, slot: e.getAttribute("data-slot"), text: [...e.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join(""), rect: rect(e, root), style: style(e) })));
      const html = roots.map(root => { const clone = root.cloneNode(true) as Element; for (const e of [clone, ...clone.querySelectorAll("*")]) for (const a of [...e.attributes]) {
        if (["data-naeil-chrome", "data-naeil-locale-menu", "lang", "data-naeil-ui-version"].includes(a.name)) e.removeAttribute(a.name);
        else e.setAttribute(a.name, a.value.replace(/radix-[\w-]+|_r_[\w]+_|_R_[\w]+_/g, "GENERATED_ID"));
      } return clone.outerHTML; });
      return { nodes, html, common: common() };
    }
    function common() {
      const result: Record<string, unknown> = {};
      for (const selector of ["header", ".ui-navigation-frame", "header svg[data-naeil-brand]", ".naeil-header-controls", ".naeil-header-controls > *", ".ui-site-footer-frame", ".ui-site-footer-brand", "footer svg[data-naeil-brand]", ".ui-site-footer-description", ".ui-site-footer-label", ".ui-site-footer-link", '[data-slot="navigation-sheet"]', ".ui-navigation-sheet-heading", '[data-slot="navigation-sheet"] h2', '[data-slot="navigation-popover"]', '[data-naeil-account-menu]', '[data-slot="dropdown-menu-label"]', '[data-slot="dropdown-menu-label"] > span', '[data-slot="dropdown-menu-item"]', '[data-slot="select-content"]', '[data-slot="select-item"]']) {
        const elements = [...document.querySelectorAll(selector)].filter(visible);
        result[selector] = elements.map(e => {
          const isToolbar = !!e.closest(".naeil-header-controls");
          const footer = e.closest("footer");
          const origin = isToolbar ? e.parentElement?.closest(".naeil-header-controls") : footer;
          const box: Partial<ReturnType<typeof rect>> = rect(e, origin || undefined);
          // D1: sheet menu data moves the toolbar and dependent portal Y.
          if ((isToolbar && getComputedStyle(document.querySelector(".ui-navigation-toggle")!).display !== "none") || e.matches('[data-slot="select-content"], [data-naeil-account-menu], [data-slot="dropdown-menu-label"], [data-slot="dropdown-menu-label"] > span, [data-slot="dropdown-menu-item"], [data-slot="select-item"]')) delete box.y;
          // D1: menu width/height and wrapping derive from its actual entries.
          if (e.matches('[data-slot="navigation-popover"]')) { delete box.height; delete box.width; delete box.x; }
          // D4 adds a footer row but leaves the common content and its origin intact.
          if (e.matches(".ui-site-footer-frame")) delete box.height;
          return { box, style: style(e) };
        });
      }
      for (const [name, selector] of [["trigger", ".ui-navigation-desktop > button"], ["flat", ".ui-navigation-desktop > a"], ["entry", ".ui-navigation-entry"], ["title", ".ui-navigation-title"], ["description", ".ui-navigation-description"], ["icon", ".ui-navigation-entry .ui-navigation-icon"]]) {
        const e = [...document.querySelectorAll(selector)].find(visible);
        result[name] = e ? { style: style(e), height: ["trigger", "flat", "icon"].includes(name) ? e.getBoundingClientRect().height : undefined } : null;
      }
      return result;
    }
    return { common: common() };
  }, { properties, home });
}

function compare(a: unknown, b: unknown, prefix = "", failures: string[] = []): string[] {
  if (typeof a === "number" && typeof b === "number") { if (Math.abs(a - b) > 0.01) failures.push(`${prefix}: ${a} != ${b}`); }
  else if (a && b && typeof a === "object" && typeof b === "object") {
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) compare((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key], `${prefix}.${key}`, failures);
  } else if (a !== b) failures.push(`${prefix}: ${String(a)} != ${String(b)}`);
  return failures;
}

async function evidence(page: Page, info: TestInfo, name: string, measurements: unknown) {
  await record(info, name, measurements);
  const path = info.outputPath(`${name}.png`);
  await page.screenshot({ fullPage: true, path });
  await info.attach(`${name}.png`, { path, contentType: "image/png" });
}
async function record(info: TestInfo, name: string, measurements: unknown) {
  const path = info.outputPath(`${name}.json`);
  mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, JSON.stringify(measurements, null, 2));
  await info.attach(`${name}.json`, { path, contentType: "application/json" });
}

for (const locale of ["ko", "en", "ja"]) for (const theme of ["light", "dark"]) for (const width of [320, 390, 806, 807, 1440, 1920]) for (const auth of ["in", "out"]) {
  test(`P3 paired B1/default/Home ${locale}/${theme}/${width}/${auth}`, async ({ page }, info) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width, height: 900 });
    const query = `locale=${locale}&theme=${theme}&auth=${auth}`;
    const mobile = width <= 806;
    const states = ["closed", "current", "focus", ...(mobile ? ["sheet"] : ["hover", "popover"]), ...(auth === "in" ? ["account"] : []), "locale"];
    const failures: string[] = [];
    await record(info, "identity", { ...JSON.parse(readFileSync("test-results/chrome-fixtures/identity.json", "utf8")), browser: page.context().browser()?.version(), viewport: { width, height: 900 }, locale, theme, auth, css: "globals.css", dpr: await page.evaluate(() => devicePixelRatio), fonts: "local PretendardVariable.woff2; Noto Sans JP 400/500/600 subsets", review: "Human review required. Candidate renders are not expected baselines." });
    for (const state of states) {
      await prepare(page, "baseline", query, state);
      const baseline = await snapshot(page); await evidence(page, info, `${state}-B1`, baseline);
      await prepare(page, "candidate", query, state);
      const candidate = await snapshot(page); await evidence(page, info, `${state}-default`, candidate);
      compare(baseline, candidate, `${state}.default`, failures);
      await prepare(page, "candidate", query, state, true);
      const home = await snapshot(page, true); await evidence(page, info, `${state}-Home`, home);
      compare(baseline.common, home.common, `${state}.Home`, failures);
      expect.soft(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${state} overflow`).toBe(true);
      const targets = await page.locator("header button, header a, [data-slot='navigation-sheet'] button, [data-slot='navigation-sheet'] a").evaluateAll(es => es.filter(e => e.getBoundingClientRect().width).map(e => ({ width: e.getBoundingClientRect().width, height: e.getBoundingClientRect().height })));
      for (const target of targets) expect.soft(target.height).toBeGreaterThanOrEqual(44);
    }
    await record(info, "pair-differences", failures);
    expect(failures).toEqual([]);
  });
}

for (const profile of ["canonical", "estimate", "jev"]) for (const css of ["globals", "split"]) {
  test(`P1 omitted props, default ${profile}/${css} profile preserves B1`, async ({ page }, info) => {
    const failures: string[] = [];
    for (const width of [390, 1440, 2560]) {
      await page.setViewportSize({ width, height: 900 });
      for (const auth of ["in", "out", "busy"]) {
        const query = `profile=${profile}&css=${css}&locale=ja&auth=${auth}`;
        await prepare(page, "baseline", query, "closed"); const baseline = await snapshot(page);
        await prepare(page, "candidate", query, "closed"); const candidate = await snapshot(page);
        compare(baseline, candidate, `${width}/${auth}`, failures);
      }
    }
    await record(info, "pair-differences", failures);
    expect(failures).toEqual([]);
  });
}
