import { defineConfig } from "@playwright/test";
import { fixturePort, fixtureURL, fixtureDirectory, fixtureResults, fixtureReport } from "./scripts/chrome-fixture-config";

const previewPort = Number(process.env.NAEIL_UI_STORYBOOK_PORT || 6007);
const scrollbarMode = process.env.NAEIL_UI_SCROLLBAR_MODE;
if (scrollbarMode && !["classic", "overlay"].includes(scrollbarMode)) throw new Error("Expected classic or overlay scrollbar mode");
const scrollbarLaunch = scrollbarMode && process.platform === "darwin" ? {
  channel: "chromium",
  executablePath: `${process.env.NAEIL_UI_SCROLLBAR_WRAPPERS}/chromium-${scrollbarMode}.sh`,
  ignoreDefaultArgs: ["--hide-scrollbars"],
} : { ignoreDefaultArgs: ["--hide-scrollbars"] };

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  outputDir: fixtureResults,
  reporter: [["list"], ["html", { open: "never", outputFolder: fixtureReport }]],
  use: {
    baseURL: `http://127.0.0.1:${previewPort}`,
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium", launchOptions: { ...scrollbarLaunch, args: ["--enable-automation"] } } },
    { name: "firefox", use: { browserName: "firefox" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
  webServer: [...(process.env.NAEIL_UI_CHROME_ONLY ? [] : [{
    command: `NAEIL_UI_PREVIEW_PORT=${previewPort} tsx scripts/serve-storybook.ts`,
    url: `http://127.0.0.1:${previewPort}`,
    reuseExistingServer: !process.env.CI,
    stdout: "ignore" as const,
    stderr: "ignore" as const,
  }]), {
    command: `tsx scripts/build-chrome-fixtures.ts && NAEIL_UI_PREVIEW_PORT=${fixturePort} tsx scripts/serve-storybook.ts ${fixtureDirectory}`,
    url: `${fixtureURL}/identity.json`,
    reuseExistingServer: false,
    timeout: 120000,
  }],
});
