import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:6007",
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "python3 -m http.server 6007 --bind 127.0.0.1 --directory storybook-static",
    url: "http://127.0.0.1:6007",
    reuseExistingServer: true,
  },
});
