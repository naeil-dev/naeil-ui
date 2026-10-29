import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
import { createHash } from "node:crypto";
import { chromium, expect, type Page } from "@playwright/test";
import { frameState, stableFrame, exercisePageFrame, exerciseFrameLocks, exerciseHomeHandoff, checkJapaneseToolbar, settleFrame } from "./page-frame-browser";

export async function checkFrameConsumer(root: string, framework: "react" | "next", css: string) {
  const directory = resolve(root, framework === "react" ? "frame-dist" : ".next");
  const server = createServer((request, response) => {
    try {
      const path = new URL(request.url || "/", "http://localhost").pathname;
      const file = resolve(directory, `.${path === "/" ? "/frame.html" : path}`);
      if (!file.startsWith(directory + sep)) { response.writeHead(403).end(); return; }
      const types: Record<string, string> = { ".html": "text/html", ".css": "text/css", ".js": "application/javascript", ".woff2": "font/woff2" };
      response.setHeader("Content-Type", types[extname(file)] || "application/octet-stream"); response.end(readFileSync(file));
    } catch { response.writeHead(404).end(); }
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address(); assert(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  let child: ChildProcess | undefined;
  try {
    if (framework === "next") {
      await new Promise<void>(resolve => server.close(() => resolve()));
      child = spawn(process.execPath, [resolve(root, "node_modules/next/dist/bin/next"), "start", "-H", "127.0.0.1", "-p", String(address.port)], { cwd: root, stdio: "ignore" });
      let ready = false;
      for (let attempt = 0; attempt < 150; attempt++) {
        try { if ((await fetch(`${origin}/frame`)).ok) { ready = true; break; } } catch {}
        if (child.exitCode !== null) break;
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      assert(ready, "Owned Next production server did not become ready");
    }
    const evidence = process.env.NAEIL_UI_CONSUMER_EVIDENCE || "test-results/packed-consumer";
    mkdirSync(evidence, { recursive: true });
    for (const mode of process.env.NAEIL_UI_SCROLLBAR_WRAPPERS ? ["classic", "overlay"] : ["default"]) {
      const wrapper = `${process.env.NAEIL_UI_SCROLLBAR_WRAPPERS}/chromium-${mode}.sh`;
      const launch = mode === "default" ? { args: ["--enable-automation"] } : { channel: "chromium", executablePath: wrapper, ignoreDefaultArgs: ["--hide-scrollbars"], args: ["--enable-automation"] };
      const browser = await chromium.launch(launch);
      const records: { name: string; data: unknown }[] = [];
      try {
        const cdp = await browser.newBrowserCDPSession();
        records.push({ name: "launch", data: { argv: (await cdp.send("Browser.getBrowserCommandLine")).arguments, browser: browser.version(), mode, wrapper: mode === "default" ? null : { path: wrapper, contents: readFileSync(wrapper, "utf8") }, wrapperSha256: mode === "default" ? null : createHash("sha256").update(readFileSync(wrapper)).digest("hex") } });
        await cdp.detach();
        const path = (control = "") => `${origin}/frame${control}${framework === "react" ? ".html" : ""}`;
        const visit = async (page: Page, query: string, control = "") => {
          await page.goto(`${path(control)}?frame&${query}`); await page.getByTestId("length").waitFor(); await settleFrame(page);
          const state = await frameState(page);
          if (mode !== "default") assert.equal(state.scrollbar, mode === "classic" ? 15 : 0, "Actual mode probe");
          return state;
        };
        const runCase = async (name: string, width: number, motion: "reduce" | "no-preference", action: (page: Page, record: (name: string, data: unknown) => Promise<void>) => Promise<void>) => {
          const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, reducedMotion: motion, serviceWorkers: "block" });
          try {
            const page = await context.newPage();
            const record = async (label: string, data: unknown) => { records.push({ name: `${name}/${label}`, data }); };
            await action(page, record);
          } finally { await context.close(); }
        };
        // Genuine separately compiled token-only/JS-only entries, never repaired candidate CSS.
        for (const control of ["optout", "false-guard", "theme", "js"]) {
          await runCase(`G1/${control}`, 1440, "reduce", async (page, record) => {
            const changes: unknown[] = [];
            if (control === "optout") await page.route("**/*", async route => {
              if (route.request().resourceType() !== "document") return route.continue();
              const response = await route.fetch(), original = await response.text();
              const body = original.replace(/<html(?=[\s>])/, '<html data-naeil-scrollbar-gutter="auto"');
              assert.notEqual(body, original, "Opt-out must exist before parsing/first paint");
              changes.push({ fixture: "HTML root attribute before first paint", url: route.request().url() });
              await route.fulfill({ response, body });
            });
            if (control === "false-guard") await page.route("**/*.css", async route => {
              const response = await route.fetch(), original = await response.text();
              const body = original.replace(/@supports\s*\(scrollbar-gutter:\s*stable\)/g, "@supports (scrollbar-gutter: naeil-unsupported)").replace(/scrollbar-gutter:\s*stable/g, "scrollbar-gutter:auto");
              if (body !== original) changes.push({ fixture: "false support branch, not unsupported-engine certification", url: route.request().url(), originalSha256: createHash("sha256").update(original).digest("hex"), adjustedSha256: createHash("sha256").update(body).digest("hex") });
              await route.fulfill({ response, body });
            });
            const before = await visit(page, `long&locale=ja&${control}`, ["theme", "js"].includes(control) ? `-${control}` : "");
            assert.equal(before.gutter, "auto");
            if (control === "false-guard") assert(changes.length, "Must transform the actual production stylesheet");
            await page.getByRole("button", { name: "Body dialog", exact: true }).click();
            await expect(page.locator("body")).toHaveAttribute("data-scroll-locked", "1");
            const open = await frameState(page), gap = before.innerWidth - before.clientWidth;
            assert.equal(open.margin, `${gap}px`); assert.equal(open.removed, `${gap}px`);
            await page.keyboard.press("Escape"); await settleFrame(page);
            const closed = await frameState(page);
            for (const key of ["lock", "margin", "padding", "removed", "overflow"] as const) assert.equal(closed[key], before[key]);
            await record("original-compensation", { before, open, closed, changes });
          });
        }
        // Resolve the actual content-container switch rather than inheriting 806/807.
        let low = 768, high = 880;
        await runCase("boundary-probe", 880, "reduce", async page => {
          await visit(page, "locale=ko");
          while (high - low > 1) {
            const width = Math.floor((low + high) / 2); await page.setViewportSize({ width, height: 900 });
            if (await page.locator(".ui-navigation-toggle").isVisible()) low = width; else high = width;
          }
        });
        records.push({ name: "actual-container-boundary", data: { below: low, above: high } });
        for (const locale of ["ko", "en", "ja"]) for (const theme of ["light", "dark"]) for (const width of [320, 390, 768, low, high, 1440, 1920, 2560]) {
          await runCase(`G2/${locale}/${theme}/${width}`, width, "reduce", async (page, record) => {
            await visit(page, `locale=${locale}&theme=${theme}&profile=site&auth=in`);
            await exercisePageFrame(page, record);
            if (width === low || width === high) assert.equal(await page.locator(".ui-navigation-toggle").isVisible(), width === low);
            if (locale === "ja" && theme === "dark") {
              const guard = await frameState(page);
              await page.screenshot({ path: resolve(evidence, `${framework}-${css}-${mode}-${width}.png`) });
              stableFrame(guard, await frameState(page));
            }
          });
        }
        for (const width of [320, 390, 1440, 1920]) for (const long of [false, true]) for (const motion of ["reduce", "no-preference"] as const) {
          await runCase(`G3/${width}/${long}/${motion}`, width, motion, async (page, record) => {
            await visit(page, `locale=${width === 320 || width === 1440 ? "ja" : "ko"}&theme=${long ? "dark" : "light"}&auth=${width === 320 ? "out" : width === 1920 ? "busy" : "in"}${long ? "&long" : ""}`);
            await exerciseFrameLocks(page, record);
          });
        }
        for (const long of [false, true]) for (const motion of ["reduce", "no-preference"] as const) {
          await runCase(`G3/Home-handoff/${long}/${motion}`, 390, motion, async (page, record) => {
            await visit(page, `profile=home&locale=ko${long ? "&long" : ""}`);
            await exerciseHomeHandoff(page, record);
          });
        }
        for (const theme of ["light", "dark"]) for (const long of [false, true]) for (const profile of ["site", "home", "login-gate"]) {
          await runCase(`F3/${theme}/${long}/${profile}`, 320, "reduce", async (page, record) => {
            await visit(page, `profile=${profile}&locale=ja&theme=${theme}&auth=${profile === "home" ? "in" : "out"}${long ? "&long" : ""}`);
            await page.locator(".ui-navigation-toggle").click();
            await record("toolbar", await checkJapaneseToolbar(page, profile));
          });
        }
      } finally {
        writeFileSync(resolve(evidence, `${framework}-${css}-${mode}-frame.json`), JSON.stringify({ framework, css, mode, records }, null, 2));
        await browser.close();
      }
    }
  } finally {
    if (child && child.exitCode === null) {
      const closed = new Promise(resolve => child!.once("exit", resolve)); child.kill("SIGTERM"); await closed;
    }
    if (server.listening) await new Promise<void>(resolve => server.close(() => resolve()));
  }
  console.log(`Clean ${framework}/${css}: actual production CSS and page-frame/lock interactions PASS`);
}
