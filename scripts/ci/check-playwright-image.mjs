import assert from 'node:assert/strict';
import { constants } from 'node:fs';
import { access, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import * as playwright from '@playwright/test';

const require = createRequire(import.meta.url);
const { version } = require('@playwright/test/package.json');
const image = JSON.parse(await readFile('/ms-playwright/.docker-info', 'utf8'));
assert.equal(
  image.driverVersion,
  version,
  `Playwright ${version} requires matching images in both verify.yml jobs (currently ${image.driverVersion}).`,
);

const browsers = process.argv.slice(2);
assert(browsers.length > 0, 'Specify the browsers this job needs.');
for (const name of browsers) {
  assert(['chromium', 'firefox', 'webkit'].includes(name), `Unknown browser: ${name}`);
  const executable = playwright[name].executablePath();
  await access(executable, constants.X_OK);
  // Exercise native dependencies too, before the longer builds and test suites.
  const browser = await playwright[name].launch();
  await browser.close();
  console.log(`${name}: Playwright ${version}, ${executable}`);
}
