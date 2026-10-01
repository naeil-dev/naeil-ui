import assert from "node:assert/strict";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, expect } from "@playwright/test";

export async function checkConsumerBrowser(root: string) {
  const output = resolve("test-results/packed-consumer");
  mkdirSync(output, { recursive: true });
  for (const [notice, installed] of [["Pretendard-OFL.txt", "pretendard/dist/LICENSE.txt"], ["Noto-Sans-JP-OFL.txt", "@fontsource/noto-sans-jp/LICENSE"]])
    assert.equal(readFileSync(join(root, "dist/licenses", notice), "utf8"), readFileSync(join(root, "node_modules", installed), "utf8"), `Packed consumer font notice drift: ${notice}`);
  const codeNotices = JSON.parse(readFileSync(join(root, "dist/licenses/bundled-consumer-code.json"), "utf8"));
  for (const name of ["@naeil/ui", "react", "react-dom", "@radix-ui/react-dropdown-menu"])
    assert(codeNotices.packages.some((entry: { name: string; notices: { text: string }[] }) => entry.name === name && entry.notices.every(notice => !!notice.text.trim())), `Packed consumer code notice missing: ${name}`);
  for (const entry of codeNotices.packages) assert(entry.notices.length && entry.notices.every((notice: { text: string }) => !!notice.text.trim()), `Empty actual consumer package notice: ${entry.name}`);
  assert(!JSON.stringify(codeNotices).includes(root), "Private consumer build path in notices");
  console.log(`Packed consumer notices: PASS (${codeNotices.packages.length} actual code packages, exact consumer-owned font OFLs)`);
  const server = createServer((request, response) => {
    const path = new URL(request.url || "/", "http://localhost").pathname;
    const file = join(root, "dist", path === "/" ? "index.html" : path);
    if (!existsSync(file)) { response.writeHead(404).end(); return; }
    const type: Record<string, string> = { ".html": "text/html", ".css": "text/css", ".js": "application/javascript", ".woff": "font/woff", ".woff2": "font/woff2", ".txt": "text/plain" };
    response.setHeader("Content-Type", type[extname(file)] || "application/octet-stream");
    response.end(readFileSync(file));
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert(address && typeof address !== "string");
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  let development: { close(): Promise<void>; resolvedUrls: { local: string[] } | null } | undefined;
  try {
    browser = await chromium.launch();
    for (const theme of ["light", "dark"] as const) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: theme });
      await page.goto(`http://127.0.0.1:${address.port}`);
      await page.getByRole("heading", { name: "Profile preferences" }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      const result = await page.evaluate(async () => {
        const faces = [];
        for (const [font, text] of [["400 16px Pretendard", "한글 Latin"], ['400 16px "Noto Sans JP"', "日本語"]]) {
          const loaded = await document.fonts.load(font, text);
          faces.push({ font, count: loaded.length, loaded: document.fonts.check(font, text) });
        }
        return { faces, overflow: document.documentElement.scrollWidth > innerWidth, body: getComputedStyle(document.body).backgroundColor };
      });
      for (const face of result.faces) assert(face.count > 0 && face.loaded, `Packed font did not load: ${face.font}`);
      assert(!result.overflow, "Packed consumer has mobile page overflow");
      assert.equal(result.body, theme === "light" ? "rgb(247, 248, 250)" : "rgb(11, 12, 14)", "Packed theme did not resolve");
      await page.getByLabel("Display name").fill("");
      await page.getByRole("button", { name: "Save preferences" }).click();
      assert.equal(await page.getByRole("status").textContent(), "", "Invalid required field submitted");
      assert.equal(await page.getByLabel("Display name").evaluate(input => (input as HTMLInputElement).validity.valueMissing), true);
      await page.getByLabel("Display name").fill("한글 / English / 日本語");
      await page.getByRole("button", { name: "Save preferences" }).click();
      assert.equal(await page.getByRole("status").textContent(), "Preferences saved for this example.");
      assert.equal(await page.getByLabel("Display name").inputValue(), "한글 / English / 日本語");
      await page.screenshot({ path: join(output, `consumer-${theme}.png`), fullPage: true });
      console.log(`Packed React browser: PASS (${theme}, 390px, local Pretendard/Noto faces, real form recovery/state, no overflow)`);
      await page.close();
    }
    // Mixed bundled/deep imports must share inert ownership. Hidden controls
    // are invoked programmatically solely to simulate external app state.
    const checkOverlays = async (baseURL: string, strictReplay: boolean) => {
    const overlays = await browser!.newPage();
    await overlays.goto(baseURL);
    if (strictReplay) await expect(overlays.getByTestId("mixed-specimen")).toHaveAttribute("data-effect-setups", "2");
    const background = overlays.getByTestId("mixed-background");
    const inert = () => background.evaluate(element => !!element.closest("[inert]"));
    const activate = async (name: string) => overlays.getByRole("button", { name, exact: true, includeHidden: true }).evaluate(element => (element as HTMLButtonElement).click());
    for (const removeEarlier of [false, true]) {
      const trigger = overlays.getByRole("button", { name: "Bundled actions", exact: true });
      await trigger.focus(); await trigger.press("Enter");
      await expect(overlays.getByRole("menuitem", { name: "Bundled keep open" })).toBeVisible();
      await expect.poll(inert).toBe(true);
      await activate("Open deep layer");
      await expect(overlays.getByRole("menuitem", { name: "Deep keep open" })).toBeVisible();
      await activate("Inspect object refs");
      await expect(overlays.getByTestId("mixed-object-refs")).toHaveText("dropdown-menu-content/dropdown-menu-content");
      if (removeEarlier) {
        await activate("Remove bundled layer");
        await expect(overlays.getByRole("menuitem", { name: "Bundled keep open", includeHidden: true })).toHaveCount(0);
        await expect.poll(inert).toBe(true);
        await background.evaluate(element => (element as HTMLElement).focus());
        await expect(background).not.toBeFocused();
        await activate("Remove all layers");
      } else {
        await overlays.keyboard.press("Escape");
        await expect(overlays.getByRole("menuitem", { name: "Deep keep open", includeHidden: true })).toHaveCount(0);
        await expect.poll(inert).toBe(true);
        await overlays.keyboard.press("Escape");
        await expect(trigger).toBeFocused();
      }
      await expect.poll(inert).toBe(false);
      await expect(overlays.locator('[data-slot="dropdown-menu-content"]')).toHaveCount(0);
      await activate("Inspect object refs");
      await expect(overlays.getByTestId("mixed-object-refs")).toHaveText("null/null");
      await expect(overlays.getByTestId("mixed-original-inert")).toHaveAttribute("inert", "");
      await background.focus(); await expect(background).toBeFocused();
    }
    console.log(`Packed mixed imports: PASS (${strictReplay ? "development StrictMode effect replay" : "production"}, object refs, overlapping ownership, both close orders, forced unmount, focus and original inert restoration)`);
    await overlays.close();
    };
    await checkOverlays(`http://127.0.0.1:${address.port}`, false);
    const { createServer: createViteServer } = await import(pathToFileURL(join(root, "node_modules/vite/dist/node/index.js")).href);
    development = await createViteServer({ root, configFile: join(root, "vite.config.mjs"), server: { host: "127.0.0.1", port: 0 } });
    await (development as typeof development & { listen(): Promise<void> }).listen();
    assert(development?.resolvedUrls?.local[0], "Independent development consumer did not start");
    await checkOverlays(development.resolvedUrls.local[0], true);
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, colorScheme: "light" });
    await page.route(/\.(?:woff2?|ttf)(?:\?|$)/, route => route.abort());
    await page.goto(`http://127.0.0.1:${address.port}`);
    const loaded = await page.evaluate(async () => {
      try { return (await document.fonts.load("400 16px Pretendard", "한글 Latin")).length > 0; }
      catch { return false; }
    });
    assert(!loaded, "Blocked-font fixture unexpectedly loaded Pretendard");
    assert(await page.getByLabel("Display name").isVisible(), "Fallback consumer is not usable");
    await page.getByRole("button", { name: "Save preferences" }).click();
    assert.equal(await page.getByRole("status").textContent(), "Preferences saved for this example.");
    await page.screenshot({ path: join(output, "consumer-font-fallback.png"), fullPage: true });
    console.log("Packed React font fallback: PASS (font requests blocked, face unavailable, visible operable form)");
    await page.close();
  } finally {
    await browser?.close();
    await development?.close();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}
