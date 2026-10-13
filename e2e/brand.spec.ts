import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, readFileSync } from "node:fs";

const { version: brandVersion } = JSON.parse(readFileSync("brand/current.json", "utf8"));
const output = "test-results/brand-integration";
async function open(page: Page, story: string, theme: string) {
  await page.goto(`/iframe.html?id=brand-logo--${story}&viewMode=story&globals=theme:${theme};a11y.manual:!true`);
  await expect(page.locator(`[data-naeil-brand="${brandVersion}"]`).first()).toBeVisible();
  await expect(page.locator('html')).toHaveClass(new RegExp(theme));
  await page.evaluate(async () => { await document.fonts.ready; await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))); });
}

for (const theme of ["light", "dark"]) {
  test(`canonical artwork, nested themes and SVG ids (${theme})`, async ({ page, browserName }) => {
    mkdirSync(output, { recursive: true });
    await page.emulateMedia({ colorScheme: theme === "dark" ? "light" : "dark" });
    await open(page, "usage", theme);
    for (const palette of ["light", "dark"]) for (const tone of ["color", "gray"]) {
      const component = page.getByTestId(`component-${palette}-${tone}`);
      const reference = page.getByTestId(`reference-${palette}-${tone}`);
      await reference.evaluate((img: HTMLImageElement) => img.decode());
      await expect(component.locator(`[data-naeil-palette="${palette}"]`)).toBeVisible();
      await expect(component.locator(`[data-naeil-palette="${palette === "light" ? "dark" : "light"}"]`)).toBeHidden();
      const c = await component.boundingBox(), r = await reference.boundingBox();
      expect(c!.width).toBeCloseTo(r!.width, 1); expect(c!.height).toBe(28);
      await component.screenshot({ path: `${output}/${browserName}-${theme}-${palette}-${tone}-component.png` });
      await reference.screenshot({ path: `${output}/${browserName}-${theme}-${palette}-${tone}-reference.png` });
    }
    await expect(page.getByTestId('nested-light').locator('[data-naeil-palette="light"]')).toBeVisible();
    await expect(page.getByTestId('nested-light').locator('[data-naeil-palette="dark"]')).toBeHidden();
    const errors = await page.evaluate(() => {
      const ids = [...document.querySelectorAll('svg[data-naeil-brand] [id]')].map(el => el.id);
      const references = [...document.querySelectorAll('svg[data-naeil-brand] *')].flatMap(el => [...el.attributes].flatMap(attr => [...attr.value.matchAll(/url\(#([^\)]+)\)/g)].map(m => m[1])));
      return { duplicates: ids.length - new Set(ids).size, unresolved: references.filter(id => !document.getElementById(id)), overflow: document.documentElement.scrollWidth > innerWidth };
    });
    expect(errors).toEqual({ duplicates: 0, unresolved: [], overflow: false });
    await page.screenshot({ path: `${output}/${browserName}-usage-${theme}.png`, fullPage: true });
    const a11y = await new AxeBuilder({ page }).include('#storybook-root').analyze();
    expect(a11y.violations).toEqual([]);
  });

  for (const width of [390, 1440]) test(`shared Nav/Footer frame and mobile menu (${theme}, ${width})`, async ({ page, browserName }) => {
    mkdirSync(output, { recursive: true });
    await page.setViewportSize({ width, height: 900 });
    await open(page, "application", theme);
    const brand = page.locator('[data-slot="navigation"] [data-naeil-variant="horizontal"]');
    const before = await brand.boundingBox();
    const anchors = await page.locator('[data-slot="navigation"]').evaluate(nav => [...nav.querySelectorAll('a,button')].map(el => {const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}}));
    await page.getByRole('button', { name: '화면 전환' }).click();
    await expect(page.getByRole('heading', { name: '로그인' })).toBeVisible();
    expect(await brand.boundingBox()).toEqual(before);
    const after = await page.locator('[data-slot="navigation"]').evaluate(nav => [...nav.querySelectorAll('a,button')].map(el => {const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height}}));
    expect(after).toEqual(anchors);
    await expect(page.locator('footer [data-naeil-variant="footer"]')).toBeVisible();
    await expect(page.locator('main [data-naeil-variant="symbol"]')).toHaveAttribute('height', '40');
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.screenshot({ path: `${output}/${browserName}-application-${width}-${theme}.png`, fullPage: true });
    if (width === 390) {
      await page.getByRole('button', { name: '메뉴', exact: true }).click();
      await expect(page.getByRole('dialog', { name: '메뉴' })).toBeVisible();
      expect(await brand.boundingBox()).toEqual(before);
      await page.screenshot({ path: `${output}/${browserName}-menu-${theme}.png` });
    }
  });
}

test('built Storybook Docs is reachable', async ({ page }) => {
  await page.goto('/?path=/docs/brand-logo--docs');
  const frame = page.frameLocator('#storybook-preview-iframe');
  await expect(frame.locator('.sbdocs-content')).toContainText('Lato 400');
  await expect(frame.locator('[data-naeil-brand]').first()).toBeVisible();
});


test('automatic logo follows OS preference and live changes without theme ancestors', async ({ page }) => {
  await open(page, "default", "light");
  await page.evaluate(() => {
    document.querySelectorAll('.light, .dark, [data-theme]').forEach(element => {
      element.classList.remove('light', 'dark');
      element.removeAttribute('data-theme');
    });
  });
  const brand = page.locator('svg[data-naeil-brand]').first();
  for (const theme of ['dark', 'light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await expect(brand.locator(`[data-naeil-palette="${theme}"]`)).toBeVisible();
    await expect(brand.locator(`[data-naeil-palette="${theme === 'light' ? 'dark' : 'light'}"]`)).toBeHidden();
  }
});
