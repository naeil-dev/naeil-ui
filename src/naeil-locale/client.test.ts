import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { chromium, type Browser, type Page } from "@playwright/test";
import { build } from "tsup";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import type { LocaleIntent } from "./intent";
import type { LocaleTransitionError } from "./client";
import type {} from "./client.test.harness";

let browser: Browser;
let page: Page;
let directory: string;
let script: string;
let browserErrors: string[];
const base = "http://127.0.0.1:6802";
const initial = "/calendar?view=week#today";
const korean = "/ko/calendar?view=week#today";
const japanese = "/ja/calendar?view=week#today";

beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "naeil-locale-client-"));
  const entry = path.resolve("src/naeil-locale/client.test.harness.tsx");
  await build({
    entry: { client: entry }, outDir: directory, config: false, format: ["iife"], platform: "browser", target: "es2022",
    bundle: true, splitting: false, noExternal: [/.*/], silent: true,
    define: { "process.env.NODE_ENV": '"development"' },
    esbuildOptions(options) { options.alias = { "next/navigation": entry }; },
  });
  script = await readFile(path.join(directory, "client.global.js"), "utf8");
  browser = await chromium.launch();
}, 30000);
afterAll(async () => { await browser?.close(); if (directory) await rm(directory, { recursive: true, force: true }); });
beforeEach(async () => {
  page = await browser.newPage();
  browserErrors = [];
  page.on("pageerror", error => browserErrors.push(error.message));
  // No server or shared fixture port is occupied: every request is fulfilled locally.
  await page.route(`${base}/**`, route => route.fulfill({ contentType: "text/html", body: '<!doctype html><div id="root"></div>' }));
  await page.goto(base + initial);
  await page.clock.install();
  await page.addScriptTag({ content: script });
  await page.waitForFunction(() => document.getElementById("status")?.textContent?.includes('"pending":false'));
});
afterEach(async () => { await page?.close(); expect(browserErrors).toEqual([]); });

async function status(): Promise<{ pending: boolean; error: LocaleTransitionError | null; intent: LocaleIntent | null }> {
  return JSON.parse(await page.locator("#status").innerText());
}
async function timeout() {
  await page.clock.runFor(1001);
  await page.waitForFunction(() => document.getElementById("status")?.textContent?.includes('"error":"timeout"'));
  expect(await status()).toMatchObject({ pending: false, error: "timeout", intent: null });
}

describe("locale controller recovery with a committed React provider", () => {
  it.each([true, false])("clears a timeout on a matching late arrival (preference writes: %s)", async enabled => {
    await page.evaluate(enabled => window.localeHarness.setPreferenceWrites(enabled), enabled);
    expect(await page.evaluate(() => window.localeHarness.request("ko"))).toBe(true);
    await timeout();
    expect(await page.evaluate(() => document.cookie)).toBe("");
    await page.evaluate(href => window.localeHarness.commit(href, "ko"), korean);
    expect(await status()).toEqual({ pending: false, error: null, intent: null });
    expect(await page.evaluate(() => document.cookie)).toBe(enabled ? "naeil_locale_dev_v1=ko" : "");
    expect(await page.evaluate(() => window.localeHarness.retry())).toBe(false);
    expect((await status()).error).toBeNull();
    expect(await page.evaluate(() => window.localeHarness.requests)).toEqual([korean]);
  });

  it("clears a retry error when the URL arrived before the provider committed", async () => {
    await page.evaluate(() => window.localeHarness.request("ko"));
    await timeout();
    await page.evaluate(href => window.localeHarness.commit(href, "en"), korean);
    expect((await status()).error).toBe("timeout");
    expect(await page.evaluate(() => window.localeHarness.retry())).toBe(false);
    expect((await status()).error).toBeNull();
    expect(await page.evaluate(() => document.cookie)).toBe("");
    await page.evaluate(href => window.localeHarness.commit(href, "ko"), korean);
    expect(await page.evaluate(() => document.cookie)).toBe("naeil_locale_dev_v1=ko");
  });

  it("retries the latest failed request after leaving an unsupported current route", async () => {
    await page.evaluate(() => window.localeHarness.request("ja"));
    await page.evaluate(href => window.localeHarness.commit(href, "ja"), japanese);
    await page.evaluate(() => window.localeHarness.commit("/missing", "en"));
    expect(await page.evaluate(() => window.localeHarness.request("ko"))).toBe(false);
    expect((await status()).error).toBe("unsupported-route");
    await page.evaluate(href => window.localeHarness.commit(href, "en"), initial);
    expect(await page.evaluate(() => window.localeHarness.retry())).toBe(true);
    expect(await status()).toMatchObject({ pending: true, error: null, intent: { locale: "ko", href: korean } });
  });

  it("retains failed destination options instead of replaying an older successful selection", async () => {
    await page.evaluate(() => window.localeHarness.request("ja"));
    await page.evaluate(href => window.localeHarness.commit(href, "ja"), japanese);
    expect(await page.evaluate(() => window.localeHarness.request("ko", { route: "/missing" }))).toBe(false);
    await page.evaluate(href => window.localeHarness.commit(href, "en"), initial);
    expect(await page.evaluate(() => window.localeHarness.retry())).toBe(false);
    expect(await status()).toEqual({ pending: false, error: "unsupported-route", intent: null });
    expect(await page.evaluate(() => window.localeHarness.requests)).toEqual([japanese]);
  });

  it.each(["cancel", "departure", "new-selection"] as const)("does not write preference for a timed-out arrival after %s", async action => {
    await page.evaluate(() => window.localeHarness.request("ko"));
    await timeout();
    if (action === "cancel") await page.evaluate(() => window.localeHarness.cancel());
    if (action === "departure") await page.evaluate(() => window.localeHarness.commit("/estimates", "en"));
    if (action === "new-selection") await page.evaluate(() => window.localeHarness.request("ja"));
    await page.evaluate(href => window.localeHarness.commit(href, "ko"), korean);
    expect(await page.evaluate(() => document.cookie)).toBe("");
    if (action === "new-selection") {
      expect(await status()).toMatchObject({ pending: true, intent: { locale: "ja" } });
      await page.evaluate(href => window.localeHarness.commit(href, "ja"), japanese);
      expect(await status()).toEqual({ pending: false, error: null, intent: null });
      expect(await page.evaluate(() => document.cookie)).toBe("naeil_locale_dev_v1=ja");
    }
  });

  it("requires the complete timed-out destination, including query and fragment", async () => {
    await page.evaluate(() => window.localeHarness.request("ko"));
    await timeout();
    await page.evaluate(() => window.localeHarness.commit("/ko/calendar?view=day#other", "ko"));
    expect((await status()).error).toBe("timeout");
    expect(await page.evaluate(() => document.cookie)).toBe("");
  });
});
