/** Packed production consumers. Chromium records compositor PNGs, not RAF classes.
 * Firefox/WebKit lack CDP screencasts: record pre-hydration/post-load raster checkpoints.
 * Evidence always identifies that narrower coverage. External scripts are held to expose
 * the pre-content background; Next's async page streams separately from its shell.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer, get } from "node:http";
import { spawn, execFileSync } from "node:child_process";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { chromium, firefox, webkit, type Browser, type Page } from "@playwright/test";

// Font readiness can wait for load in WebKit while scripts are deliberately held.
// Background raster checkpoints must capture that phase, without waiting for fonts.
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = "1";
const out = resolve(process.env.NAEIL_UI_PAINT_EVIDENCE || "test-results/theme-paint");
mkdirSync(out, { recursive: true });
const archive = resolve(process.env.NAEIL_UI_PAINT_ARCHIVE || `docs/releases/${JSON.parse(readFileSync("package.json", "utf8")).version}/naeil-ui-${JSON.parse(readFileSync("package.json", "utf8")).version}.tgz`);
const urlOverride = process.env.NAEIL_UI_PAINT_URL;
const bootstrap = process.env.NAEIL_UI_PAINT_BOOTSTRAP !== "0";
const repeats = Number(process.env.NAEIL_UI_PAINT_REPEATS || 3);
const palette = { light: [247, 248, 250], dark: [11, 12, 14] };
type Condition = { id: string; cookie?: string; local?: string; denied?: string; os: "light" | "dark"; expected: "light" | "dark" };
const conditions: Condition[] = [
  { id: "cookie-light-os-dark", cookie: "light", local: "dark", os: "dark", expected: "light" },
  { id: "cookie-dark-os-light", cookie: "dark", local: "light", os: "light", expected: "dark" },
  { id: "default-os-light", os: "light", expected: "dark" },
  { id: "local-light-os-dark", local: "light", os: "dark", expected: "light" },
  { id: "storage-denied", denied: "storage", os: "light", expected: "dark" },
  { id: "cookie-denied", denied: "cookie", local: "light", os: "dark", expected: "light" },
].filter(row => !process.env.NAEIL_UI_PAINT_CASES || process.env.NAEIL_UI_PAINT_CASES.split(",").includes(row.id)) as Condition[];
async function htmlOrder(url: string, name: string) {
  const chunks: { bytes: number; total: number; at: number }[] = []; let html = "";
  await new Promise<void>((done, reject) => get(url, response => {
    response.on("data", bytes => { html += bytes.toString(); chunks.push({ bytes: bytes.length, total: Buffer.byteLength(html), at: performance.now() }); }); response.on("end", done); response.on("error", reject);
  }).on("error", reject));
  writeFileSync(join(out, `${name}.html`), html);
  const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].filter(match => !/\bsrc=/.test(match[1])).map(match => ({ offset: Buffer.byteLength(html.slice(0, match.index)), bytes: Buffer.byteLength(match[0]), attributes: match[1], content: match[2] }));
  const order = { body: Buffer.byteLength(html.slice(0, html.indexOf("<body"))), styles: [...html.matchAll(/<(?:link\b[^>]*rel="stylesheet"|style\b)/g)].map(m => Buffer.byteLength(html.slice(0, m.index))), scripts, chunks };
  writeFileSync(join(out, `${name}-order.json`), JSON.stringify(order, null, 2));
  if (bootstrap && !urlOverride) assert(scripts.some(s => /data-naeil-theme-preference/.test(s.attributes) && s.offset < order.body), "Bootstrap must precede body in the actual built HTML");
}
async function pixels(page: Page, data: string) {
  return page.evaluate(async data => {
    const image = new Image(); image.src = `data:image/png;base64,${data}`; await image.decode();
    const canvas = document.createElement("canvas"); canvas.width = image.width; canvas.height = image.height; const ctx = canvas.getContext("2d")!; ctx.drawImage(image, 0, 0);
    const color = [...ctx.getImageData(8, Math.floor(image.height / 2), 1, 1).data];
    const all = ctx.getImageData(0, 0, image.width, image.height).data; let different = 0;
    for (let i = 0; i < all.length; i += 4) if (all[i] !== color[0] || all[i + 1] !== color[1] || all[i + 2] !== color[2]) different++;
    return { color, containsContent: different > 100, differentPixels: different };
  }, data);
}
async function sample(browser: Browser, engine: string, url: string, name: string, condition: Condition) {
  const context = await browser.newContext({ colorScheme: condition.os, viewport: { width: 800, height: 600 } });
  if (condition.cookie) await context.addCookies([{ name: "naeil_theme_v1", value: condition.cookie, url }]);
  await context.addInitScript(({ local, denied }) => {
    if (local) localStorage.setItem("theme", local);
    if (denied === "storage") Object.defineProperty(window, "localStorage", { get() { throw new DOMException("Denied", "SecurityError"); } });
    if (denied === "cookie") Object.defineProperty(document, "cookie", { get() { throw new DOMException("Denied", "SecurityError"); }, set() { throw new DOMException("Denied", "SecurityError"); } });
  }, condition);
  let release!: () => void; const gate = new Promise<void>(done => { release = done; });
  await context.route("**/*", async route => { if (route.request().resourceType() === "script") await gate; await route.continue().catch(() => {}); });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const cdp = engine === "chromium" ? await context.newCDPSession(page) : undefined;
  const frames: { data: string; timestamp?: number; checkpoint?: string }[] = [];
  if (cdp) {
    await cdp.send("Page.enable");
    cdp.on("Page.screencastFrame", frame => { frames.push({ data: frame.data, timestamp: frame.metadata.timestamp }); void cdp.send("Page.screencastFrameAck", { sessionId: frame.sessionId }).catch(() => {}); });
    await cdp.send("Page.startScreencast", { format: "png", everyNthFrame: 1 });
  }
  try {
    const response = await page.goto(url, { waitUntil: "commit" });
    assert.equal(response?.status(), 200);
    try {
      await page.waitForFunction(() => {
        if (!document.body || getComputedStyle(document.body).backgroundColor === "rgba(0, 0, 0, 0)") return false;
        Reflect.set(window, "naeilPaintCssReady", { at: performance.timeOrigin + performance.now(), background: getComputedStyle(document.body).backgroundColor }); return true;
      }, undefined, { timeout: 5000, polling: 50 });
    } catch (error) {
      writeFileSync(join(out, `${name}-${condition.id}-blocked.html`), await page.content());
      throw error;
    }
    const cssReady = await page.evaluate(() => Reflect.get(window, "naeilPaintCssReady") as { at: number; background: string });
    await page.waitForTimeout(250);
    // Screenshots are evidence of rendered checkpoints, not a substitute for CDP frames.
    frames.push({ data: (await page.screenshot({ timeout: 5000 })).toString("base64"), timestamp: Date.now() / 1000, checkpoint: "scripts-held" });
    const beforeHydration = await page.locator("html").getAttribute("class");
    const releasedAt = Date.now(); release(); await page.waitForLoadState("load");
    await page.waitForSelector("main", { state: "visible" });
    await page.waitForTimeout(150);
    if (cdp) await cdp.send("Page.stopScreencast");
    else frames.push({ data: (await page.screenshot()).toString("base64"), checkpoint: "loaded" });
    const paints = await page.evaluate(() => ({ timeOrigin: performance.timeOrigin, paints: performance.getEntriesByType("paint").map(p => ({ name: p.name, at: p.startTime })) }));
    const records = [];
    for (const [index, frame] of frames.entries()) {
      records.push({ index, timestamp: frame.timestamp, checkpoint: frame.checkpoint, phase: frame.checkpoint ?? ((frame.timestamp ?? 0) * 1000 < releasedAt ? "scripts-held" : "loaded"), ...await pixels(page, frame.data) });
      writeFileSync(join(out, `${name}-${condition.id}-${index}.png`), Buffer.from(frame.data, "base64"));
    }
    // Before CSS, browser canvas can be white/OS-dark. Once CSS is known ready,
    // count every color, including unexpected white/transparent backgrounds.
    // Recognizable palette frames are counted even before the readiness probe.
    const cssFrames = records.filter(f => f.checkpoint || (f.timestamp ?? 0) * 1000 >= cssReady.at || Object.values(palette).some(color => color.every((v, i) => f.color[i] === v)));
    const wrong = cssFrames.filter(f => !palette[condition.expected].every((v, i) => f.color[i] === v));
    const afterHydration = await page.locator("html").getAttribute("class");
    const result = { name, engine, coverage: cdp ? "compositor-every-frame" : "raster-checkpoints-only", condition, paints, cssReady, releasedAt, frames: records, beforeHydration, afterHydration, errors, cssFrames: cssFrames.length, heldFrames: cssFrames.filter(f => f.phase === "scripts-held").length, wrongBackground: wrong.filter(f => !f.containsContent).length, wrongContent: wrong.filter(f => f.containsContent).length };
    writeFileSync(join(out, `${name}-${condition.id}.json`), JSON.stringify(result, null, 2));
    console.log(JSON.stringify({ name, condition: condition.id, cssFrames: result.cssFrames, wrongBackground: result.wrongBackground, wrongContent: result.wrongContent, errors }));
    return result;
  } finally { release(); await context.close(); }
}
async function freePort() {
  const server = createServer(); await new Promise<void>(done => server.listen(0, "127.0.0.1", done));
  const address = server.address(); assert(address && typeof address !== "string");
  await new Promise<void>(done => server.close(() => done())); return address.port;
}
const results: Awaited<ReturnType<typeof sample>>[] = [];
async function measure(url: string, name: string) {
  for (const engine of (process.env.NAEIL_UI_PAINT_ENGINES || "chromium,firefox,webkit").split(",")) {
    const browser = await ({ chromium, firefox, webkit }[engine as "chromium"]!).launch();
    try {
      for (let repeat = 0; repeat < repeats; repeat++) for (const condition of conditions) results.push(await sample(browser, engine, url, `${name}-${engine}-${repeat}`, condition));
    } finally { await browser.close(); }
  }
}
const work = mkdtempSync(join(tmpdir(), "naeil-theme-paint-"));
function run(cwd: string, command: string, args: string[], name: string) {
  const output = execFileSync(command, args, { cwd, encoding: "utf8", maxBuffer: 20_000_000, env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } });
  writeFileSync(join(out, `${name}.log`), output);
}
try {
  if (urlOverride) { await htmlOrder(urlOverride, "site"); await measure(urlOverride, "site"); }
  else for (const framework of (process.env.NAEIL_UI_PAINT_BUNDLERS || "webpack,turbopack,vite").split(",")) {
    const cwd = join(work, framework); mkdirSync(cwd);
    const next = framework !== "vite";
    const pkg = JSON.parse(readFileSync(next ? "scripts/fixtures/next/package.json" : "examples/react/package.json", "utf8"));
    pkg.dependencies["@naeil/ui"] = `file:${archive}`;
    writeFileSync(join(cwd, "package.json"), JSON.stringify(pkg));
    if (next) {
      cpSync("scripts/fixtures/next/tsconfig.json", join(cwd, "tsconfig.json"));
      mkdirSync(join(cwd, "app"));
      for (const file of ["layout.tsx", "page.tsx", "globals.css"]) {
        let source = readFileSync(`scripts/fixtures/theme-paint/next/${file}`, "utf8");
        if (!bootstrap) source = source.replace('import { NaeilThemeScript } from "@naeil/ui/theme-bootstrap";', "").replace("<head><NaeilThemeScript /></head>", "");
        writeFileSync(join(cwd, "app", file), source);
      }
      writeFileSync(join(cwd, "next.config.mjs"), 'export default { poweredByHeader:false };');
      writeFileSync(join(cwd, "postcss.config.mjs"), 'export default {plugins:{"@tailwindcss/postcss":{}}};');
    } else {
      for (const file of ["main.tsx", "index.html", "vite.config.mjs"]) {
        let source = readFileSync(`scripts/fixtures/theme-paint/vite/${file}`, "utf8");
        if (!bootstrap) source = source.replace('import { naeilThemeBootstrap } from "@naeil/ui/theme-bootstrap";', "").replace('transformIndexHtml() { return [{tag:"script", attrs:{"data-naeil-theme-preference":""}, children:naeilThemeBootstrap, injectTo:"head-prepend"}]; }', "");
        writeFileSync(join(cwd, file), source);
      }
      cpSync("scripts/fixtures/theme-paint/next/globals.css", join(cwd, "globals.css"));
    }
    run(cwd, "npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--package-lock=false"], `${framework}-install`);
    run(cwd, "npm", next ? ["run", framework === "webpack" ? "build" : "build:turbopack"] : ["exec", "vite", "build"], framework);
    const port = await freePort(), url = `http://127.0.0.1:${port}/`;
    const server = spawn(process.execPath, next ? [join(cwd, "node_modules/next/dist/bin/next"), "start", "-H", "127.0.0.1", "-p", String(port)] : [join(cwd, "node_modules/vite/bin/vite.js"), "preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], { cwd, stdio: "ignore" });
    try {
      let ready = false;
      for (let attempt = 0; attempt < 100; attempt++) { try { if ((await fetch(url)).ok) { ready = true; break; } } catch {} await new Promise(done => setTimeout(done, 100)); }
      assert(ready, `${framework} server did not start`);
      await htmlOrder(url, framework); await measure(url, framework);
    } finally { server.kill(); }
  }
} finally {
  writeFileSync(join(out, "results.json"), JSON.stringify({ archive, sha256: urlOverride ? undefined : createHash("sha256").update(readFileSync(archive)).digest("hex"), bootstrap, urlOverride, results }, null, 2));
  rmSync(work, { recursive: true, force: true });
}
assert(results.length > 0 && results.every(row => row.cssFrames > 0 && row.heldFrames > 0 && row.wrongBackground === 0 && row.wrongContent === 0 && row.afterHydration?.split(" ").includes(row.condition.expected) && row.errors.length === 0), "Wrong painted theme frame/hydration; inspect compositor evidence");
