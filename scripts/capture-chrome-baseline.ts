import assert from "node:assert/strict";
import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { chromium } from "@playwright/test";
import { frameComparisonPolicy } from "./frame-comparison-policy";

// Local 0.17 frame recapture uses independently extracted, checksum-verified
// 0.16.0 and current chrome fixtures. It never edits an old baseline/receipt.
if (process.argv.includes("--fixtures")) {
  await captureFrameBaseline(process.argv[2], process.argv[process.argv.indexOf("--fixtures") + 1]);
} else {
// Explicit one-shot B2 capture. Never run from the normal gates or replace it.
const output = resolve(process.argv[2]);
assert(!existsSync(join(output, "receipt.json")), "Frozen B2 already exists; owner approval is required to replace it");
mkdirSync(output, { recursive: true });
const browser = await chromium.launch();
const receipt: unknown[] = [];
try {
  for (const locale of ["ko", "en", "ja"]) {
    const response = await fetch(`https://naeil.dev/${locale}`);
    assert(response.ok);
    const html = await response.text(); writeFileSync(join(output, `${locale}.html`), html);
    const deploymentId = html.match(/dpl_[A-Za-z0-9]+/)?.[0] || null;
    for (const width of [320, 390, 1440]) for (const theme of ["light", "dark"] as const) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme });
      const page = await context.newPage();
      try {
        await page.goto(`https://naeil.dev/${locale}`, { waitUntil: "domcontentloaded" });
        await page.locator("[data-naeil-header]").waitFor();
        await page.evaluate(async theme => { document.documentElement.classList.remove("light", "dark"); document.documentElement.classList.add(theme); await document.fonts.ready; await Promise.all(document.getAnimations().filter(a => a.effect?.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => {}))); }, theme);
        const measured = await page.evaluate(() => ({
          dpr: devicePixelRatio, documentLanguage: document.documentElement.lang,
          version: document.querySelector("[data-naeil-header]")!.getAttribute("data-naeil-ui-version"),
          contract: document.querySelector("[data-naeil-header]")!.getAttribute("data-naeil-ui-contract"),
          fonts: [...document.fonts].map(f => ({ family: f.family, weight: f.weight, status: f.status })),
          elements: [...document.querySelectorAll("header, .ui-navigation-frame, header svg[data-naeil-brand], .naeil-header-controls, .naeil-header-controls > *, footer, .ui-site-footer-frame, .ui-site-footer-description, .ui-site-footer-label, .ui-site-footer-link")].map(e => { const r = e.getBoundingClientRect(), c = getComputedStyle(e); return { tag: e.tagName, class: e.className, box: { x: r.x, y: r.y, width: r.width, height: r.height }, styles: Object.fromEntries(["color", "background-color", "border-color", "font-family", "font-size", "font-weight", "line-height", "letter-spacing", "opacity", "-webkit-font-smoothing", "-moz-osx-font-smoothing"].map(p => [p, c.getPropertyValue(p)])) }; }),
        }));
        await page.screenshot({ path: join(output, `${locale}-${theme}-${width}.png`), fullPage: true });
        receipt.push({ capturedAt: new Date().toISOString(), url: page.url(), deploymentId, requestId: response.headers.get("x-vercel-id"), viewport: { width, height: 900 }, theme, auth: "signed-out", browser: browser.version(), ...measured });
      } finally { await context.close(); }
    }
  }
} finally {
  writeFileSync(join(output, "receipt.json"), JSON.stringify(receipt, null, 2));
  await browser.close();
}

}

async function captureFrameBaseline(destination: string, origin: string) {
  const output = resolve(destination);
  assert(!existsSync(join(output, "receipt.json")), "Choose a new output directory; existing baselines are immutable");
  assert(/^http:\/\/(127\.0\.0\.1|localhost):[0-9]+$/.test(origin), "Expected a local chrome-fixture origin");
  mkdirSync(output, { recursive: true });
  const browser = await chromium.launch();
  const rows: unknown[] = [];
  const identity = await (await fetch(`${origin}/identity.json`)).json();
  try {
    for (const locale of ["ko", "ja", "en"]) for (const width of [1440, 390]) for (const long of [false, true]) {
      const pair: Record<string, Awaited<ReturnType<typeof measure>>> = {};
      for (const side of ["baseline016", "candidate"]) {
        const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 900 }, colorScheme: "dark" });
        try {
          await page.goto(`${origin}/${side}/shell.html?locale=${locale}${long ? "&long" : ""}`);
          await page.locator("main h1").waitFor(); await page.evaluate(() => document.fonts.ready);
          pair[side] = await measure(page);
          await page.screenshot({ path: join(output, `${side}-${locale}-${width}-${long ? "long" : "short"}.png`) });
          await page.locator("header").screenshot({ path: join(output, `${side}-${locale}-${width}-${long ? "long" : "short"}-header.png`) });
          await page.locator("footer").screenshot({ path: join(output, `${side}-${locale}-${width}-${long ? "long" : "short"}-footer.png`) });
          if (side === "baseline016" && locale === "ja") {
            await page.addStyleTag({ content: frameComparisonPolicy });
            await page.evaluate(() => document.fonts.ready);
            pair.baseline016WithD2 = await measure(page);
          }
        } finally { await page.close(); }
      }
      writeFileSync(join(output, `${locale}-${width}-${long ? "long" : "short"}.json`), JSON.stringify(pair, null, 2));
      const { baseline016: before, candidate: after } = pair;
      assert.equal(before.frameCount, 0); assert.equal(after.frameCount, 1);
      assert.equal(after.normalizedDOM, before.normalizedDOM, `Only the frame wrapper may change DOM: ${locale}/${width}/${long}`);
      const differences = chromeDifferences(before.chrome, after.chrome);
      const chromeEqual = differences.length === 0;
      if (locale !== "ja") assert(chromeEqual, `Unexpected chrome change: ${locale}/${width}/${long}`);
      const fontPolicyDifferences = locale === "ja" ? chromeDifferences(pair.baseline016WithD2.chrome, after.chrome) : [];
      assert.equal(fontPolicyDifferences.length, 0, `Only D2 may change Japanese chrome: ${fontPolicyDifferences.join("\n")}`);
      rows.push({ locale, width, length: long ? "long" : "short", auth: "signed-out", theme: "dark", structuralDiff: "one div.ui-service-shell[data-naeil-shell] around skip/header/main/footer", chromeEqual, differences, fontPolicyDifferences, ...pair });
    }
  } finally {
    writeFileSync(join(output, "receipt.json"), JSON.stringify({ capturedAt: new Date().toISOString(), browser: browser.version(), origin, identity, rows }, null, 2));
    await browser.close();
  }
}
async function measure(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const root = document.getElementById("root")!.cloneNode(true) as HTMLElement;
    root.querySelectorAll("script").forEach(e => e.remove());
    const frame = root.querySelector("[data-naeil-shell]");
    if (frame) frame.replaceWith(...frame.childNodes);
    for (const e of [root, ...root.querySelectorAll("*")]) {
      e.removeAttribute("data-naeil-ui-version");
      for (const a of [...e.attributes]) e.setAttribute(a.name, a.value.replace(/radix-(?:_r_[\w]+_|_R_[\w]+_)/g, "GENERATED_ID"));
    }
    const properties = ["font-family", "font-size", "font-weight", "line-height", "letter-spacing", "color", "background-color", "border-color", "padding", "gap"];
    const chrome = [...document.querySelectorAll("header, footer")].flatMap(root => [root, ...root.querySelectorAll("*")].filter(e => e.getBoundingClientRect().width && e.getBoundingClientRect().height).map(e => {
      const b = e.getBoundingClientRect(), r = root.getBoundingClientRect();
      return { tag: e.tagName, box: { x: b.x - r.x, y: b.y - r.y, width: b.width, height: b.height }, style: Object.fromEntries(properties.map(p => [p, getComputedStyle(e).getPropertyValue(p)])) };
    }));
    const footer = document.querySelector("footer")!.getBoundingClientRect();
    return { frameCount: document.querySelectorAll("[data-naeil-shell]").length, normalizedDOM: root.innerHTML, chrome,
      footerBottom: footer.bottom, footerViewportGap: innerHeight - footer.bottom,
      contentFooter: footer.top - document.querySelector("[data-shell-content]")!.getBoundingClientRect().bottom };
  });
}

function chromeDifferences(a: unknown, b: unknown, path = "", result: string[] = []): string[] {
  // Same 0.01px tolerance as chrome-pairs; SVG float precision varies with Y.
  if (typeof a === "number" && typeof b === "number") {
    if (Math.abs(a - b) > 0.01) result.push(`${path}: ${a} != ${b}`);
  } else if (a && b && typeof a === "object" && typeof b === "object") {
    for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) chromeDifferences((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key], `${path}.${key}`, result);
  } else if (a !== b) result.push(`${path}: ${String(a)} != ${String(b)}`);
  return result;
}
