import { test, expect, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve("tsup"))("esbuild");
let bundle: string;
let html: string;
test.beforeAll(async () => {
  html = execFileSync(process.execPath, ["--import", "tsx", "scripts/fixtures/theme-preference-ssr.ts"], { encoding: "utf8" });
  const result = await build({ entryPoints: ["scripts/fixtures/theme-preference.tsx"], bundle: true, write: false, format: "iife", platform: "browser", define: { "process.env.NODE_ENV": '"production"' } });
  bundle = result.outputFiles[0].text;
});
async function open(page: Page, options: { cookie?: string; local?: string; storageDenied?: boolean; cookieDenied?: boolean; host?: string } = {}) {
  const origin = `https://${options.host ?? "estimate.naeil.dev"}`;
  if (options.cookie) await page.context().addCookies([{ name: "naeil_theme_v1", value: options.cookie, domain: ".naeil.dev", path: "/", secure: true, sameSite: "Lax" }]);
  await page.addInitScript(({ local, storageDenied, cookieDenied }) => {
    if (local) localStorage.setItem("theme", local);
    if (storageDenied) Object.defineProperty(window, "localStorage", { get() { throw new DOMException("Denied", "SecurityError"); } });
    if (cookieDenied) Object.defineProperty(document, "cookie", { get() { throw new DOMException("Denied", "SecurityError"); }, set() { throw new DOMException("Denied", "SecurityError"); } });
  }, options);
  let release!: () => void;
  const hydration = new Promise<void>(resolve => { release = resolve; });
  await page.route(`${origin}/**`, async route => {
    if (route.request().url().endsWith("theme.js")) { await hydration; await route.fulfill({ contentType: "text/javascript", body: bundle }); return; }
    await route.fulfill({ contentType: "text/html", body: `<!doctype html><html><head><style>body{background:white}.dark body{background:rgb(17,17,17)}</style></head><body><div id="root">${html}</div><script>requestAnimationFrame(()=>window.firstPaint={theme:document.documentElement.className,scheme:document.documentElement.style.colorScheme,background:getComputedStyle(document.body).backgroundColor})</script><script defer src="/theme.js"></script></body></html>` });
  });
  await page.goto(origin, { waitUntil: "commit" });
  await page.waitForFunction(() => Reflect.has(window, "firstPaint"));
  const first = await page.evaluate(() => Reflect.get(window, "firstPaint"));
  release(); await page.waitForLoadState("load");
  // An explicit same-theme choice is also a hydration readiness probe.
  return first;
}
for (const [cookie, local] of [["light", "dark"], ["dark", "light"], ["system", "light"]]) test(`cookie ${cookie} wins over local ${local} before hydration`, async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  const rendered = cookie === "system" ? "dark" : cookie;
  expect(await open(page, { cookie, local })).toMatchObject({ theme: rendered, scheme: rendered, background: rendered === "dark" ? "rgb(17, 17, 17)" : "rgb(255, 255, 255)" });
  await expect(page.locator("html")).toHaveClass(rendered);
  await page.getByRole("button", { name: "light", exact: true }).click();
  await expect(page.locator("html")).toHaveClass("light");
  await page.reload(); await expect(page.locator("html")).toHaveClass("light");
});
test("old local preference is never broadcast; explicit choices share on next origin load", async ({ page }) => {
  expect(await open(page, { local: "light" })).toMatchObject({ theme: "light" });
  expect((await page.context().cookies()).filter(c => c.name === "naeil_theme_v1")).toEqual([]);
  for (const value of ["dark", "system", "light"]) {
    await page.getByRole("button", { name: value, exact: true }).click();
    await expect.poll(async () => (await page.context().cookies()).find(c => c.name === "naeil_theme_v1")?.value).toBe(value);
  }
  expect((await page.context().cookies()).find(c => c.name === "naeil_theme_v1")).toMatchObject({ domain: ".naeil.dev", path: "/", secure: true, sameSite: "Lax", value: "light" });
  expect(await open(page, { host: "jev.naeil.dev", local: "dark" })).toMatchObject({ theme: "light" });
});
test("storage denied keeps dark first paint and usable choices", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  expect(await open(page, { storageDenied: true })).toMatchObject({ theme: "dark", scheme: "dark" });
  await page.getByRole("button", { name: "light", exact: true }).click();
  await expect(page.locator("html")).toHaveClass("light");
});
test("cookie denied retains local persistence", async ({ page }) => {
  expect(await open(page, { cookieDenied: true, local: "light" })).toMatchObject({ theme: "light" });
  await page.getByRole("button", { name: "dark", exact: true }).click();
  await expect(page.locator("html")).toHaveClass("dark");
  expect(await page.evaluate(() => localStorage.getItem("theme"))).toBe("dark");
  expect((await page.context().cookies()).filter(c => c.name === "naeil_theme_v1")).toEqual([]);
});
test("invalid cookie cannot override local preference or execute markup", async ({ page }) => {
  expect(await open(page, { cookie: "not-a-theme", local: "light" })).toMatchObject({ theme: "light" });
});
test("same-origin tabs still synchronize through next-themes storage events", async ({ page }) => {
  await open(page);
  const other = await page.context().newPage();
  await open(other);
  await page.getByRole("button", { name: "light", exact: true }).click();
  await expect(other.locator("html")).toHaveClass("light");
});
