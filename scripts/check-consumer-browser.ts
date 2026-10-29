import assert from "node:assert/strict";
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, webkit, expect, type Browser } from "@playwright/test";

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
      const brand = page.getByTestId("packed-brand");
      const { version: brandVersion } = JSON.parse(readFileSync("brand/current.json", "utf8"));
      await expect(brand).toHaveAttribute("data-naeil-brand", brandVersion);
      const palette = await brand.locator(`[data-naeil-palette="${theme}"]`).evaluate(el => getComputedStyle(el).display);
      assert.notEqual(palette, "none", "Packed brand did not follow consumer theme");
      const hiddenPalette = await brand.locator(`[data-naeil-palette="${theme === "light" ? "dark" : "light"}"]`).evaluate(el => getComputedStyle(el).display);
      assert.equal(hiddenPalette, "none", "Both brand palettes displayed");
      await page.screenshot({ path: join(output, `consumer-${theme}.png`), fullPage: true });
      console.log(`Packed React browser: PASS (${theme}, 390px, local Pretendard/Noto faces, real form recovery/state, no overflow)`);
      await page.close();
    }
    // Exercise the optional whole-header entry from the installed archive.
    // The fixture has no Next/site backend or consumer-owned artwork directory.
    for (const width of [390, 1440, 1920]) for (const theme of ["light", "dark"] as const) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme: theme });
      try {
        await page.goto(`http://127.0.0.1:${address.port}`);
        const header = page.locator("[data-naeil-header]");
        await expect(header).toBeVisible();
        const frames = await page.locator(".ui-navigation-frame, main.ui-app-frame, .ui-site-footer-frame").evaluateAll(elements => elements.map(element => {
          const rect = element.getBoundingClientRect();
          return { x: rect.x, width: rect.width, gutter: parseFloat(getComputedStyle(element).paddingInlineStart) };
        }));
        assert.equal(frames.length, 3, "Packed application must render the shared header, main frame and footer");
        const basis = await page.evaluate(() => {
          const probe = document.createElement("div"); probe.style.cssText = "position:fixed;left:-10000px;width:100vw;height:0";
          document.body.append(probe); const vw = probe.getBoundingClientRect().width; probe.remove();
          return { available: document.documentElement.getBoundingClientRect().width, vw };
        });
        const expected = { width: Math.min(basis.available, 1600), gutter: Math.min(40, Math.max(16, basis.vw * .024)) };
        for (const frame of frames) {
          assert(Math.abs(frame.width - expected.width) < 0.1, "Packed application frame width drift");
          assert(Math.abs(frame.gutter - expected.gutter) < 0.1, "Packed application gutter drift");
          assert(Math.abs(frame.x - frames[0].x) < 0.1, "Packed header/main/footer alignment drift");
        }
        if (width >= 1440) assert.equal((await page.locator('[data-ui-layout="settings"]').boundingBox())!.width, 640, "A wide frame must preserve the narrow settings form");
        const mobile = width === 390;
        const open = async (locale: "en" | "ja") => {
          if (mobile) {
            await page.getByRole("button", { name: locale === "en" ? "Menu" : "メニュー", exact: true }).click();
            return page.getByRole("dialog", { name: locale === "en" ? "Menu" : "メニュー", exact: true });
          }
          const projects = header.getByRole("button", { name: locale === "en" ? "Projects" : "プロジェクト", exact: true });
          await projects.focus(); await projects.press("Enter");
          return page.getByRole("dialog", { name: locale === "en" ? "Projects" : "プロジェクト", exact: true });
        };
        let panel = await open("en");
        const images = panel.locator("img");
        await expect(images).toHaveCount(1);
        for (const image of await images.all()) {
          await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).complete && (element as HTMLImageElement).naturalWidth > 0)).toBe(true);
          assert.match((await image.getAttribute("src"))!, /^https:\/\/naeil.dev\/images\/whale\.png$/);
        }
        await panel.getByRole("link", { name: /naeil-ui/ }).click();
        await expect(page.getByTestId("packed-header-route")).toHaveText("https://naeil.dev/en/design");
        if (mobile) panel = await open("en");
        const controls = mobile ? panel : header;
        await controls.getByRole("combobox").click();
        await page.getByRole("option", { name: "日本語", exact: true }).click();
        // Locale changes relabel an open mobile sheet in place. Keep its
        // current dialog locator; Escape during Select restoration may still
        // belong to that overlay rather than the containing sheet.
        const localizedControls = mobile ? page.getByRole("dialog", { name: "メニュー", exact: true }) : header;
        await expect(localizedControls.getByRole("combobox")).toHaveText("JA");
        panel = mobile ? localizedControls : await open("ja");
        await expect(panel.getByText("準備中", { exact: true })).toHaveCount(0);
        await expect(panel.locator('a[href="https://naeil.dev/ja/design"]')).toBeVisible();
        if (!mobile) await page.keyboard.press("Escape");
        const themeScope = mobile ? panel : header;
        const label = theme === "dark" ? "ライトテーマに切り替える" : "ダークテーマに切り替える";
        await themeScope.getByRole("button", { name: label, exact: true }).click();
        await expect(page.locator("html")).toHaveClass(theme === "dark" ? /light/ : /dark/);
        const account = themeScope.getByRole("button", { name: "アカウントメニュー", exact: true });
        assert.equal((await account.boundingBox())!.width, 44);
        await account.click();
        await expect(page.locator("[data-naeil-account-menu]")).toBeVisible();
        await page.getByRole("menuitem", { name: "ログアウト", exact: true }).click();
        await expect(page.getByTestId("packed-account-action")).toHaveText("logout requested");
        await expect(account).toBeFocused();
        if (mobile) {
          await page.keyboard.press("Escape");
          await expect(panel).toBeHidden();
          await expect(page.getByRole("button", { name: "メニュー", exact: true })).toBeFocused();
        }
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Packed whole header overflow");
        await page.screenshot({ path: join(output, `header-${width}-${theme}.png`) });
        console.log(`Packed whole header: PASS (${width}px/${theme}, official icons loaded, locales, guarded route, theme, mobile/desktop)`);
      } finally { await page.close(); }
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
    const checkExtensions = async (engine: Browser, name: string) => {
      const page = await engine.newPage({ viewport: { width: 390, height: 844 } });
      try {
        await page.goto(`http://127.0.0.1:${address.port}`);
        const notes = page.getByLabel("Profile notes", { exact: true });
        assert.equal(await notes.evaluate(element => (element as HTMLTextAreaElement).rows), 2);
        await expect(notes).toHaveCSS("font-size", "16px");
        await expect(notes).toHaveCSS("resize", "vertical");
        await notes.fill(""); await page.getByRole("button", { name: "Save preferences", exact: true }).click();
        await expect(notes).toBeFocused();
        await notes.fill("한글 / English / 日本語\nMultiline notes");
        const form = await notes.evaluate(element => Object.fromEntries(new FormData((element as HTMLTextAreaElement).form!)));
        assert.equal(form.notes, "한글 / English / 日本語\nMultiline notes");
        await page.getByRole("button", { name: "Save preferences", exact: true }).click();
        await expect(page.getByRole("status")).toHaveText("Preferences saved for this example.");
        const details = page.getByRole("tab", { name: "Details", exact: true });
        await expect(details).toHaveCSS("padding-left", "24px");
        await page.getByRole("button", { name: "Inspect extension refs", exact: true }).click();
        await expect(page.getByTestId("extension-refs")).toHaveText("tabs/tabs-list/tabs-trigger/tabs-content");
        await details.focus(); await details.press("ArrowRight");
        const history = page.getByRole("tab", { name: "History", exact: true });
        await expect(history).toBeFocused(); await expect(history).toHaveAttribute("aria-selected", "true");
        await expect(page.getByText("Current preferences.", { exact: true })).toHaveCount(0);
        await history.press("ArrowRight"); await expect(details).toBeFocused();
        const start = page.getByRole("tab", { name: "Start", exact: true });
        await start.focus(); await start.press("ArrowLeft");
        await expect(page.getByRole("tab", { name: "Next", exact: true })).toBeFocused();
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Packed extension page overflow");
        await page.screenshot({ path: join(output, `extensions-${name}-390.png`), fullPage: true });
        console.log(`Packed extensions: PASS (${name}, deep Textarea/Tabs + core Tabs, refs, class override, RTL/disabled keyboard, native rows/form/newline/required, 390px)`);
      } finally { await page.close(); }
    };
    await checkExtensions(browser, "chromium");
    const webkitBrowser = await webkit.launch();
    try { await checkExtensions(webkitBrowser, "webkit"); }
    finally { await webkitBrowser.close(); }
  } finally {
    await browser?.close();
    await development?.close();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
}
