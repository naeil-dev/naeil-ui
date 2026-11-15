import { expect, test } from '@playwright/test';
for (const reducedMotion of ['no-preference', 'reduce'] as const) test(`toast standard transition with motion ${reducedMotion}`, async ({page}) => {
  await page.emulateMedia({reducedMotion});
  await page.goto('/iframe.html?id=checks-shared-defaults--toast-targets&globals=theme:dark;a11y.manual:!true');
  await page.locator('[data-slot="button"]').click();
  const toast=page.locator('[data-sonner-toast]').first(); await expect(toast).toBeVisible();
  const durations=await toast.evaluate(element => [element,...element.querySelectorAll('[data-button], [data-close-button]')].map(e=>getComputedStyle(e).transitionDuration.split(',').map(s=>parseFloat(s))));
  for (const values of durations) for(const duration of values) expect(duration).toBe(reducedMotion==='reduce'?0:0.18);
});
