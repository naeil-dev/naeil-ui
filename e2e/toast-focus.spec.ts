import { expect, test } from '@playwright/test';

for (const theme of ['light', 'dark']) test(`toast action focus contrast ${theme}`, async ({page}, info) => {
  await page.goto(`/iframe.html?id=checks-shared-defaults--toast-targets&globals=theme:${theme};a11y.manual:!true`);
  await expect(page.locator('html')).toHaveClass(new RegExp(theme));
  await page.locator('[data-slot="button"]').click();
  const action = page.locator('[data-sonner-toast] [data-button]');
  await expect(action).toBeVisible();
  await page.keyboard.press('Tab');
  await action.focus();
  const value = await action.evaluate(element => {
    const style = getComputedStyle(element), surface = getComputedStyle(element.closest('[data-sonner-toast]')!);
    const rgb = (color: string) => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
      const ctx = canvas.getContext('2d')!; ctx.fillStyle = color; ctx.fillRect(0,0,1,1);
      return [...ctx.getImageData(0,0,1,1).data].slice(0,3);
    };
    const luminance = (color: string) => rgb(color).map(c => { const s=c/255; return s<=0.04045?s/12.92:((s+0.055)/1.055)**2.4; }).reduce((a,c,i)=>a+c*[0.2126,0.7152,0.0722][i],0);
    const a=luminance(style.outlineColor), b=luminance(surface.backgroundColor);
    return {outlineStyle:style.outlineStyle, outlineWidth:style.outlineWidth, outlineOffset:style.outlineOffset, outlineColor:style.outlineColor, background:surface.backgroundColor, contrast:(Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)};
  });
  await info.attach('focus-measurements', {body: JSON.stringify(value), contentType:'application/json'});
  expect(value.outlineStyle).toBe('solid'); expect(value.outlineWidth).toBe('2px'); expect(value.outlineOffset).toBe('3px');
  expect(value.contrast).toBeGreaterThanOrEqual(3);
});
