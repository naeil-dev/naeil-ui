import { mkdtempSync, rmSync, mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { assessNaeilPage, resolveConsumerPlaywright, checkRuntimeConformance } from "../../../../bin/conformance-runtime.mjs";
import type { NaeilPageMeasurements } from "../../../components/naeil-page-measure";
import { naeilIcons } from "../../../naeil-locale/icons.generated";
const roots: string[] = [];
afterEach(() => roots.splice(0).forEach(root => rmSync(root, {recursive: true, force: true})));
const passing = (): NaeilPageMeasurements => ({
  mainCount: 1, ownedMainCount: 1, headerCount: 1, footerCount: 1,
  headerTitle: 48, titleDescription: 12, contentFooter: 96,
  titleSize: 32, titleLineHeight: 42, titleWeight: 600, bodySize: 16, dark: true,
  pageHeaderContent: 32, url: 'https://estimate.example/settings',
  title: "Settings — .naeil estimate", icons: naeilIcons.links.map(link => ({...link})),
});
describe("runtime conformance measurements", () => {
  it("accepts canonical measurements including Next query strings and extra sizes variants", () => {
    const value = passing();
    value.icons = value.icons.map(link => ({...link, href: `${link.href}?build=123`}));
    value.icons.push({...value.icons[1]});
    expect(assessNaeilPage(value, {service: 'estimate'})).toEqual([]);
  });
  it.each([
    ['mainCount', 2], ['ownedMainCount', 0], ['headerCount', 0], ['headerTitle', 47.4], ['headerTitle', null],
    ['titleDescription', 13], ['contentFooter', 95], ['contentFooter', null], ['footerCount', 0],
    ['titleSize', 24], ['titleLineHeight', 40], ['titleWeight', 500], ['bodySize', 14], ['dark', false],
    ['title', 'Wrong service'], ['icons', []], ['pageHeaderContent', 64],
  ])("rejects %s = %s", (key, value) => {
    expect(assessNaeilPage({...passing(), [key]: value}, {service: 'estimate'}).length).toBeGreaterThan(0);
  });
  it("accepts absent descriptions and half-pixel tolerances", () => {
    expect(assessNaeilPage({...passing(), titleDescription: null, pageHeaderContent: null, headerTitle: 48.5, contentFooter: 95.5}, {service: 'estimate'})).toEqual([]);
  });
  it("only accepts a missing footer on the explicitly declared route", () => {
    const value = {...passing(), footerCount: 0, contentFooter: null};
    expect(assessNaeilPage(value, {service: 'estimate'}).length).toBeGreaterThan(0);
    expect(assessNaeilPage(value, {service: 'estimate', noFooter: true})).toEqual([]);
    expect(assessNaeilPage(passing(), {service: 'estimate', noFooter: true}).length).toBeGreaterThan(0);
  });
  it.each([
    {rel: 'icon', href: '/other.svg', type: 'image/svg+xml', sizes: 'any'},
    {rel: 'icon', href: '/favicon.ico', type: 'image/x-icon', sizes: '16x16 32x32'},
    {rel: 'icon', href: 'https://other.example/icon.svg', type: 'image/svg+xml', sizes: 'any'},
    {rel: 'icon', href: '/favicon.ico#v1', type: 'image/x-icon', sizes: '32x32'},
  ])("rejects an alternate icon or browser-preferred large ICO: %s", icon => {
    const value = passing(); value.icons.push(icon);
    expect(assessNaeilPage(value, {service: 'estimate'}).length).toBeGreaterThan(0);
  });
});
it.each([
  {cookies:[{}],origins:[]},
  {cookies:[],origins:[{origin:'not-a-url',localStorage:[]}]},
  {cookies:[],origins:[{origin:'https://estimate.example',localStorage:[{name:'session',value:1}]}]},
])('rejects malformed storage state before resolving or launching Playwright: %s', async state => {
  const root = mkdtempSync(join(tmpdir(), 'shell-invalid-state-')); roots.push(root);
  const path = join(root, 'state.json'); writeFileSync(path, JSON.stringify(state));
  await expect(checkRuntimeConformance({service:'estimate',url:'http://127.0.0.1:1',routes:['/'],app:root,storageState:path})).rejects.toThrow('Cannot read --storage-state');
});
it.each(["playwright", "@playwright/test"])("resolves %s from the consumer and returns an install hint when absent", async name => {
  const root = mkdtempSync(join(tmpdir(), 'shell-runtime-')); roots.push(root);
  await expect(resolveConsumerPlaywright(root)).rejects.toMatchObject({exitCode: 2, message: expect.stringContaining('pnpm add -D @playwright/test')});
  const require = createRequire(import.meta.url);
  mkdirSync(dirname(join(root, 'node_modules', name)), {recursive: true});
  const installed = name === 'playwright' ? createRequire(require.resolve('@playwright/test/package.json')).resolve('playwright/package.json') : require.resolve('@playwright/test/package.json');
  symlinkSync(dirname(installed), join(root, 'node_modules', name));
  expect((await resolveConsumerPlaywright(root)).chromium).toBeDefined();
});

it.each([
  [['--header', 'missing-colon'], '--header requires name:value'],
  [['--expect-status', '/unknown=404'], '--expect-status requires <listed-route>'],
  [['--expect-status', '/=invalid'], '--expect-status requires an HTTP status'],
  [['--expect-status', '/=200', '--expect-status', '/=404'], 'Duplicate --expect-status'],
  [['--allow-redirect', '/=https://other.example/'], '--allow-redirect target must be a local /path'],
  [['--storage-state', '/missing/fixture-state.json'], 'Cannot read --storage-state'],
])('rejects invalid runtime options before launching a browser: %s', (args, message) => {
  const result = spawnSync(process.execPath, ['bin/naeil-ui-conformance.mjs', '--service', 'estimate', '--url', 'http://127.0.0.1:1', '--routes', '/', ...args], {encoding:'utf8'});
  expect(result.status).toBe(1); expect(result.stderr).toContain(message);
});
