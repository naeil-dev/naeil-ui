import { chromium } from '@playwright/test';
import { renderToString } from 'react-dom/server';
import { expect, it } from 'vitest';
import { NaeilThemeProvider } from '../../../components/naeil-theme-provider';

it('paints dark before hydration when localStorage is denied', async () => {
  const browser=await chromium.launch();
  try {
    const page=await browser.newPage({colorScheme:'light'});
    await page.addInitScript(() => Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Storage denied','SecurityError');}}));
    const html=renderToString(<NaeilThemeProvider><main>First paint</main></NaeilThemeProvider>);
    await page.route('http://theme.test/**', route=>route.fulfill({contentType:'text/html',body:`<!doctype html><html><head><style>body{background:white;color:black}.dark body{background:#111;color:white}</style></head><body>${html}<script>requestAnimationFrame(()=>window.firstPaint={dark:document.documentElement.classList.contains('dark'),background:getComputedStyle(document.body).backgroundColor,scheme:document.documentElement.style.colorScheme})</script></body></html>`}));
    await page.goto('http://theme.test/');
    await page.waitForFunction(()=>Reflect.has(window,'firstPaint'));
    expect(await page.evaluate(()=>Reflect.get(window,'firstPaint'))).toEqual({dark:true,background:'rgb(17, 17, 17)',scheme:'dark'});
  } finally { await browser.close(); }
});
