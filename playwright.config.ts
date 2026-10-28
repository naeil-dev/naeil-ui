import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:6007",
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "firefox", use: { browserName: "firefox" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
  webServer: [...(process.env.NAEIL_UI_CHROME_ONLY ? [] : [{
    command: "tsx scripts/serve-storybook.ts",
    url: "http://127.0.0.1:6007",
    reuseExistingServer: !process.env.CI,
    stdout: "ignore",
    stderr: "ignore",
  }]), {
    command: "tsx scripts/build-chrome-fixtures.ts && NAEIL_UI_PREVIEW_PORT=6008 tsx scripts/serve-storybook.ts test-results/chrome-fixtures",
    url: "http://127.0.0.1:6008/identity.json",
    reuseExistingServer: false,
    timeout: 120000,
  }],
});
