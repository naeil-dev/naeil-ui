const configuredPort = process.env.NAEIL_UI_FIXTURE_PORT;
export const fixturePort = Number(configuredPort || 6008);
if (!Number.isInteger(fixturePort) || fixturePort < 1 || fixturePort > 65535) {
  throw new Error("NAEIL_UI_FIXTURE_PORT must be an integer from 1 to 65535");
}
export const fixtureURL = `http://127.0.0.1:${fixturePort}`;
// Explicit ports isolate builds and reports for concurrent runs in one worktree.
export const fixtureDirectory = `test-results/chrome-fixtures${configuredPort ? `-${fixturePort}` : ""}`;
export const fixtureResults = configuredPort ? `test-results/fixture-${fixturePort}` : undefined;
export const fixtureReport = configuredPort ? `playwright-report/fixture-${fixturePort}` : undefined;
