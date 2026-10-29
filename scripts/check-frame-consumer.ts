import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { extname, resolve, sep } from "node:path";
import { createHash } from "node:crypto";
import { chromium } from "@playwright/test";
import { frameState, stableFrame, exercisePageFrame, exerciseFrameLocks, settleFrame } from "./page-frame-browser";

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
        records.push({ name: "launch", data: { argv: (await cdp.send("Browser.getBrowserCommandLine")).arguments, browser: browser.version(), mode, wrapperSha256: mode === "default" ? null : createHash("sha256").update(readFileSync(wrapper)).digest("hex") } });
        await cdp.detach();
        for (const width of [320, 390, 1440]) for (const long of [false, true]) {
          const context = await browser.newContext({ viewport: { width, height: 900 }, deviceScaleFactor: 1, colorScheme: long ? "dark" : "light", reducedMotion: "reduce", serviceWorkers: "block" });
          try {
            const page = await context.newPage();
            const profile = width === 390 ? "home" : "site", auth = width === 320 ? "out" : "in";
            const url = `${origin}/${framework === "react" ? "frame.html" : "frame"}?frame&profile=${profile}&auth=${auth}&locale=ja&theme=${long ? "dark" : "light"}`;
            await page.goto(url); await page.getByTestId("length").waitFor(); await settleFrame(page);
            const state = await frameState(page);
            if (mode !== "default") assert.equal(state.scrollbar, mode === "classic" ? 15 : 0, "Actual mode probe");
            const record = async (name: string, data: unknown) => { records.push({ name: `${width}/${long}/${name}`, data }); };
            await exercisePageFrame(page, record);
            if (long) await page.getByTestId("length").click();
            await exerciseFrameLocks(page, record);
            const guard = await frameState(page);
            await page.screenshot({ path: resolve(evidence, `${framework}-${css}-${mode}-${width}-${long}.png`) });
            stableFrame(guard, await frameState(page));
          } finally { await context.close(); }
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
