import { defineConfig } from '@playwright/test';

// HTTP-only checker regressions need no Storybook/chrome comparison server.
export default defineConfig({
  testDir: './e2e',
  testMatch: ['conformance-origin.spec.ts', 'conformance-timeout.spec.ts'],
  workers: 1,
  outputDir: 'test-results/runtime',
  reporter: 'list',
  projects: [{name: 'chromium', use: {browserName:'chromium'}}],
});
