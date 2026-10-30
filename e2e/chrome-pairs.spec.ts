import { test, expect, type Page, type TestInfo } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { frameState, scrollbarLaunch } from "../scripts/page-frame-browser";

test.beforeEach(async ({ page, browser, browserName }, info) => {
  await record(info, "launch-and-probe", await scrollbarLaunch(page, browser, browserName));
});

const base = "http://127.0.0.1:6008";
const properties = ["color", "background-color", "border-color", "font-family", "font-size", "font-weight", "line-height", "letter-spacing", "opacity", "-webkit-font-smoothing", "-moz-osx-font-smoothing", "padding", "gap", "min-height"];
type EntryMeasurement = { active: boolean; metrics: Record<string, unknown>; raw: unknown };
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
  if (home && process.env.NAEIL_UI_P3_MUTATION === "title-offset") await page.addStyleTag({ content: '[data-slot="navigation-popover"] .ui-navigation-title { margin-top: 8px; }' });
  if (state !== "hover") await page.mouse.move(page.viewportSize()!.width / 2, 850);
  await page.evaluate(async () => {
    await document.fonts.ready;
    for (;;) {
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const animations = document.getAnimations().filter(a => a.playState !== "finished" && a.effect?.getComputedTiming().iterations !== Infinity);
      if (!animations.length) break;
      await Promise.all(animations.map(a => a.finished.catch(() => {})));
    }
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
      const html = roots.map(root => { const clone = root.cloneNode(true) as Element; for (const e of [clone, ...clone.querySelectorAll("*")]) { const marked = e.hasAttribute("data-naeil-chrome"); for (const a of [...e.attributes]) {
        if ((["data-naeil-chrome", "data-naeil-locale-menu", "data-naeil-ui-version"].includes(a.name) || (a.name === "lang" && marked))) e.removeAttribute(a.name);
        else e.setAttribute(a.name, a.value.replace(/radix-(?:_r_[\w]+_|_R_[\w]+_)/g, "GENERATED_ID"));
      } } return clone.outerHTML; });
      return { nodes, html, common: common() };
    }
    function common() {
      const result: Record<string, unknown> = {};
      const mobile = !!document.querySelector(".ui-navigation-toggle")?.getBoundingClientRect().width;
      for (const selector of ["header", ".ui-navigation-frame", "header svg[data-naeil-brand]", ".naeil-header-controls", ".naeil-header-controls > *", ".ui-site-footer-frame", ".ui-site-footer-brand", "footer svg[data-naeil-brand]", ".ui-site-footer-description", ".ui-site-footer-label", ".ui-site-footer-link", '[data-slot="navigation-sheet"]', ".ui-navigation-sheet-heading", '[data-slot="navigation-sheet"] h2', ".ui-navigation-group-label", '[data-slot="navigation-popover"]', '[data-naeil-account-menu]', '[data-slot="dropdown-menu-label"]', '[data-slot="dropdown-menu-label"] > span', '[data-slot="dropdown-menu-item"]', '[data-slot="select-content"]', '[data-slot="select-item"]']) {
        const elements = [...document.querySelectorAll(selector)].filter(visible);
        result[selector] = elements.map(e => {
          const footer = e.closest("footer");
          const toolbar = e.closest(".naeil-header-controls");
          const portal = e.closest('[data-naeil-account-menu], [data-slot="select-content"]');
          const origin = toolbar && toolbar !== e ? toolbar : portal && portal !== e ? portal : footer;
          const box: Partial<ReturnType<typeof rect>> = rect(e, origin || undefined);
          // Only the mobile menu's height may move these anchors. Keep local
          // child geometry and desktop portal Y intact.
          if (mobile && toolbar === e) box.y = e.getBoundingClientRect().y - document.querySelector(".ui-navigation-mobile-links")!.getBoundingClientRect().bottom;
          if (mobile && portal === e) {
            const anchor = document.querySelector(e.matches("[data-naeil-account-menu]") ? '.ui-navigation-mobile-toolbar [data-naeil-account-trigger]' : '.ui-navigation-mobile-toolbar [role="combobox"]')!;
            // Radix rounds the portal to device pixels; subtract the equally
            // rounded actual anchor so fractional data-driven menu heights cancel.
            box.y = e.getBoundingClientRect().y - Math.round(anchor.getBoundingClientRect().y * devicePixelRatio) / devicePixelRatio;
          }
          // D1/D2/D3 change the popover's anchor X and data-derived total size.
          if (e.matches('[data-slot="navigation-popover"]')) {
            box.x = e.getBoundingClientRect().x - document.querySelector(".ui-navigation-desktop > button")!.getBoundingClientRect().x;
            delete box.height; delete box.width;
          }
          // D4 adds a footer row but leaves the common content and its origin intact.
          if (e.matches(".ui-site-footer-frame")) delete box.height;
          return { box, style: style(e) };
        });
      }
      for (const [name, selector] of [["trigger", ".ui-navigation-desktop > button"], ["flat", ".ui-navigation-desktop > a"], ["entry", ".ui-navigation-entry"], ["title", ".ui-navigation-title"], ["description", ".ui-navigation-description"], ["icon", ".ui-navigation-entry .ui-navigation-icon"]]) {
        const e = [...document.querySelectorAll(selector)].find(visible);
        result[name] = e ? { style: style(e), height: ["trigger", "flat", "icon"].includes(name) ? e.getBoundingClientRect().height : undefined } : null;
      }
      const baseline = (element: Element, origin: Element) => {
        const container = element.matches(".ui-navigation-title") ? element.querySelector(":scope > span")! : element;
        const probe = document.createElement("span");
        probe.style.cssText = "display:inline-block;width:0;height:0;padding:0;margin:0;border:0;vertical-align:baseline";
        container.prepend(probe);
        const y = probe.getBoundingClientRect().y - origin.getBoundingClientRect().y;
        probe.remove(); return y;
      };
      result.entries = [...document.querySelectorAll(".ui-navigation-entry")].filter(visible).map(entry => {
        const copy = entry.querySelector(".ui-navigation-copy")!;
        const title = entry.querySelector(".ui-navigation-title")!;
        const description = entry.querySelector(".ui-navigation-description");
        const icon = entry.querySelector(".ui-navigation-icon");
        const copyBox = rect(copy, entry), titleBox = rect(title, copy);
        return {
          active: entry.getAttribute("aria-current") === "page",
          metrics: {
            entry: { style: style(entry), width: mobile ? entry.getBoundingClientRect().width : undefined, verticalInset: entry.getBoundingClientRect().height - Math.max(copy.getBoundingClientRect().height, icon?.getBoundingClientRect().height || 0) },
            copy: { x: copyBox.x, y: copyBox.y, style: style(copy) },
            title: { x: titleBox.x, y: titleBox.y, baseline: baseline(title, copy), style: style(title) },
            description: description ? { x: rect(description, copy).x, gapAfterTitle: description.getBoundingClientRect().y - title.getBoundingClientRect().bottom, baseline: baseline(description, description), style: style(description) } : null,
            icon: icon ? { box: rect(icon, entry), style: style(icon) } : null,
          },
          raw: { entry: rect(entry), copy: rect(copy), title: rect(title), description: description ? rect(description) : null, icon: icon ? rect(icon) : null },
        };
      });
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
  const frame = await frameState(page), mode = process.env.NAEIL_UI_SCROLLBAR_MODE;
  if (mode) expect(frame.scrollbar).toBe(mode === "classic" ? 15 : 0);
  expect(frame.gutter).toBe("stable");
  expect(frame.available).toBe(page.viewportSize()!.width - frame.scrollbar);
  await record(info, `${name}-page-frame`, frame);
  const path = info.outputPath(`${name}.png`);
  const guard = await snapshot(page);
  await page.screenshot({ path });
  expect(await snapshot(page), "Viewport capture must preserve geometry and computed styles").toEqual(guard);
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
    await prepare(page, "candidate", query, "closed");
    const mobile = await page.locator(".ui-navigation-toggle").isVisible();
    // Cache real B1 normal entries before current entries; Home's extra normal
    // rows then use an actual normal-state B1 render, never fabricated values.
    const states = ["closed", ...(mobile ? ["sheet"] : []), "current", "focus", ...(mobile ? [] : ["hover", "popover"]), ...(auth === "in" ? ["account"] : []), "locale"];
    const failures: string[] = [];
    const entryReferences = new Map<boolean, { state: string; metrics: Record<string, unknown> }>();
    await record(info, "identity", { ...JSON.parse(readFileSync("test-results/chrome-fixtures/identity.json", "utf8")), browser: page.context().browser()?.version(), viewport: { width, height: 900 }, locale, theme, auth, css: "globals.css", dpr: await page.evaluate(() => devicePixelRatio), fonts: "local PretendardVariable.woff2; Noto Sans JP 400/500/600 subsets", review: "Human review required. Candidate renders are not expected baselines." });
    for (const state of states) {
      await prepare(page, "baseline", query, state);
      const baseline = await snapshot(page); await evidence(page, info, `${state}-B1`, baseline);
      const { entries: baselineEntries, ...baselineCommon } = baseline.common;
      for (const entry of baselineEntries as EntryMeasurement[]) entryReferences.set(entry.active, { state, metrics: entry.metrics });
      await prepare(page, "candidate", query, state);
      const candidate = await snapshot(page); await evidence(page, info, `${state}-default`, candidate);
      compare(baseline, candidate, `${state}.default`, failures);
      await prepare(page, "baseline08", query, state);
      const baseline08 = await snapshot(page); await evidence(page, info, `${state}-0.8.0`, baseline08);
      compare(baseline08, candidate, `${state}.0.8.0`, failures);
      await prepare(page, "candidate", query, state, true);
      const home = await snapshot(page, true); await evidence(page, info, `${state}-Home`, home);
      await prepare(page, "baseline08", query, state, true);
      const home08 = await snapshot(page, true); await evidence(page, info, `${state}-Home-0.8.0`, home08);
      compare(home08, home, `${state}.Home-0.8.0`, failures);
      // Remaining product assertions must inspect the candidate, not the reference.
      await prepare(page, "candidate", query, state, true);
      const { entries: homeEntries, ...homeCommon } = home.common;
      const matched = (homeEntries as EntryMeasurement[]).map(entry => {
        const reference = entryReferences.get(entry.active);
        expect(reference, `${state}: B1 entry for active=${entry.active}`).toBeDefined();
        return reference!;
      });
      const pair = {
        reference: { ...baselineCommon, entries: matched.map(entry => entry.metrics) },
        actual: { ...homeCommon, entries: (homeEntries as EntryMeasurement[]).map(entry => entry.metrics) },
        B1EntryStates: matched.map(entry => entry.state),
      };
      await record(info, `${state}-Home-pair`, pair);
      compare(pair.reference, pair.actual, `${state}.Home`, failures);
      expect.soft(await page.evaluate(() => document.documentElement.scrollWidth <= Math.ceil(document.documentElement.getBoundingClientRect().width)), `${state} overflow`).toBe(true);
      const targets = await page.locator("header button, header a, [data-slot='navigation-sheet'] button, [data-slot='navigation-sheet'] a").evaluateAll(es => es.filter(e => e.getBoundingClientRect().width).map(e => ({ width: e.getBoundingClientRect().width, height: e.getBoundingClientRect().height })));
      for (const target of targets) expect.soft(target.height).toBeGreaterThanOrEqual(44);
    }
    await record(info, "pair-differences", failures);
    expect(failures).toEqual([]);
  });
}

for (const profile of ["canonical", "site", "estimate", "jev", "compat-routing", "compat-slots", "legacy-empty"]) for (const css of ["globals", "split"]) {
  test(`P1 omitted props, default ${profile}/${css} profile preserves B1`, async ({ page }, info) => {
    test.setTimeout(120000);
    const failures: string[] = [];
    for (const width of [390, 1440, 2560]) {
      await page.setViewportSize({ width, height: 900 });
      for (const auth of ["in", "out", "busy"]) {
        const query = `profile=${profile}&css=${css}&locale=ja&auth=${auth}`;
        for (const state of ["closed", ...(width === 390 ? ["sheet"] : profile === "legacy-empty" ? [] : ["popover"])]) {
          const name = `${width}-${auth}-${state}`;
          await prepare(page, "baseline", query, state); const baseline = await snapshot(page); await evidence(page, info, `${name}-B1`, baseline);
          await prepare(page, "candidate", query, state); const candidate = await snapshot(page); await evidence(page, info, `${name}-default`, candidate);
          compare(baseline, candidate, `${width}/${auth}/${state}`, failures);
        }
      }
    }
    await record(info, "pair-differences", failures);
    expect(failures).toEqual([]);
  });
}

test("P1 empty-menu omitted props retain the observed B1 resize behavior", async ({ page }, info) => {
  const rows = [];
  for (const side of ["baseline", "candidate"]) {
    await page.setViewportSize({ width: 390, height: 900 });
    await prepare(page, side, "profile=legacy-empty&locale=en", "sheet");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    rows.push({ side, sheetCount: await page.locator('[data-slot="navigation-sheet"]').count(), navigation: await page.locator(".ui-navigation-desktop").evaluate(e => ({ display: getComputedStyle(e).display, width: e.getBoundingClientRect().width, children: e.children.length })) });
  }
  await record(info, "B1-empty-menu-behavior", rows);
  expect(rows[0].sheetCount).toBe(1);
  expect(rows[1].sheetCount).toBe(rows[0].sheetCount);
});

test("P3 mutation guard detects an 8px title offset with identical Home data", async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await prepare(page, "candidate", "locale=en&theme=light&auth=in", "popover", true);
  const before = await snapshot(page, true); await evidence(page, info, "mutation-before", before);
  const beforeY = await page.locator('[data-slot="navigation-popover"] .ui-navigation-title').first().evaluate(e => e.getBoundingClientRect().y);
  await page.addStyleTag({ content: '[data-slot="navigation-popover"] .ui-navigation-title { margin-top: 8px; }' });
  const after = await snapshot(page, true); await evidence(page, info, "mutation-after", after);
  const afterY = await page.locator('[data-slot="navigation-popover"] .ui-navigation-title').first().evaluate(e => e.getBoundingClientRect().y);
  await record(info, "mutation-offset", { beforeY, afterY, delta: afterY - beforeY });
  expect(afterY - beforeY).toBe(8);
  const differences = compare(
    (before.common.entries as EntryMeasurement[]).map(entry => entry.metrics),
    (after.common.entries as EntryMeasurement[]).map(entry => entry.metrics),
  );
  await record(info, "mutation-differences", differences);
  expect(differences.length).toBeGreaterThan(0);
});
