import { test, expect } from '@playwright/test';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { measureNaeilPage } from '../src/components/naeil-page-measure';
import { assessNaeilPage } from '../bin/conformance-runtime.mjs';
const exec = promisify(execFile);
const route = (service: string, locale = 'en', suffix = '') => `/iframe.html?id=brand-naeilserviceshell--${service}&viewMode=story&shellLocale=${locale}${suffix}`;
async function cli(origin: string, routes: string[], extra: string[] = []) {
  try {
    const result = await exec(process.execPath, ['bin/naeil-ui-conformance.mjs', '--service', 'estimate', '--url', origin, '--routes', routes.join(','), ...extra], {cwd: process.cwd(), timeout: 90000});
    return {...result, code: 0};
  } catch (error) {
    const failure = error as {code: number; stdout: string; stderr: string};
    return failure;
  }
}
for (const locale of ['ko', 'ja', 'en']) test(`runtime CLI measures real shell / ${locale}`, async ({baseURL}) => {
  test.setTimeout(90000);
  const result = await cli(baseURL!, [route('estimate', locale)]);
  expect(result.code, result.stdout + result.stderr).toBe(0);
  expect(result.stdout).toContain('4 checks, 0 failures');
  expect(result.stdout).toContain('1440×900');
  expect(result.stdout).toContain('390×844');
});
test('runtime CLI enforces route-specific no-footer and reports actual divergence', async ({baseURL}) => {
  test.setTimeout(90000);
  const login = route('estimate', 'en', '&noFooter');
  const accepted = await cli(baseURL!, [route('estimate'), login], ['--no-footer', login]);
  expect(accepted.code, accepted.stdout + accepted.stderr).toBe(0);
  const rejected = await cli(baseURL!, [login]);
  expect(rejected.code, rejected.stdout + rejected.stderr).toBe(1);
  expect(rejected.stdout).toContain('footer count: 0');
  const broken = await cli(baseURL!, [route('runtime-violation')]);
  expect(broken.code, broken.stdout + broken.stderr).toBe(1);
  expect(broken.stdout).toContain('body font-size: 14');
});
test('exported measurement function is serializable and observes DOM changes', async ({page}) => {
  await page.goto(route('estimate'));
  await expect(page.locator('main h1')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(async () => assessNaeilPage(await page.evaluate(measureNaeilPage), {service: 'estimate'})).toEqual([]);
  await page.evaluate(() => {
    document.body.style.fontSize = '14px';
    document.querySelector('main')!.append(Object.assign(document.createElement('div'), {hidden: true}));
  });
  const values = await page.evaluate(measureNaeilPage);
  expect(values.contentFooter).toBe(96); // hidden trailing elements cannot hide the final content block
  expect(assessNaeilPage(values, {service: 'estimate'})).toContain('body font-size: 14 (expected 16)');
});
