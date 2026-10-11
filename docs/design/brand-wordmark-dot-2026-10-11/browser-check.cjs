// Run from the repository with @playwright/test installed. Checks a fresh copied kit.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const assert = require('node:assert/strict');
const { chromium, webkit } = require('@playwright/test');
const root = path.resolve(process.argv[2]);
const output = path.resolve(process.argv[3]);
const copy = fs.mkdtempSync(path.join(os.tmpdir(), 'naeil-dot-consumer-'));
fs.cpSync(root, copy, { recursive: true });
fs.mkdirSync(output, { recursive: true });
const types = { '.html': 'text/html', '.svg': 'image/svg+xml', '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  const file = path.resolve(copy, '.' + new URL(req.url, 'http://localhost').pathname);
  if (!file.startsWith(copy + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return res.writeHead(404).end();
  res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
  res.end(fs.readFileSync(file));
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const result = { method: 'Fresh copied standalone kit; no production access', engines: {}, cases: [] };
  try {
    for (const [name, engine] of Object.entries({ chromium, webkit })) {
      const browser = await engine.launch();
      result.engines[name] = browser.version();
      try {
        for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
          const page = await browser.newPage({ viewport: { width, height: 900 }, deviceScaleFactor: width === 390 ? 2 : 1, colorScheme: theme });
          const external = [];
          page.on('request', req => { if (!req.url().startsWith(base)) external.push(req.url()); });
          await page.goto(base + '/examples/usage.html');
          if (theme === 'dark') await page.locator('#theme').click();
          await page.locator('img').evaluateAll(images => Promise.all(images.map(img => img.decode())));
          const metrics = await page.evaluate(() => ({
            overflow: document.documentElement.scrollWidth > innerWidth,
            images: [...document.images].filter(img => getComputedStyle(img).display !== 'none').map(img => ({ width: img.getBoundingClientRect().width, height: img.getBoundingClientRect().height, src: img.getAttribute('src') })),
          }));
          assert.equal(metrics.overflow, false);
          assert.deepEqual(metrics.images.map(img => img.height), [28, 40, 20]);
          assert(metrics.images.every(img => theme === 'dark' ? img.src.includes('-dark') : !img.src.includes('-dark')));
          assert.equal(external.length, 0);
          const key = `${name}-${width}-${theme}`;
          await page.screenshot({ path: path.join(output, `${key}.png`), fullPage: true });
          result.cases.push({ key, ...metrics, externalRequests: external.length });
          if (width === 1440) {
            await page.goto(base + '/verification/proof.html');
            await page.locator('img').evaluateAll(images => Promise.all(images.map(img => img.decode())));
            await page.screenshot({ path: path.join(output, `proof-${name}-${theme}.png`), fullPage: true });
          }
          await page.close();
        }
      } finally { await browser.close(); }
    }
    fs.writeFileSync(path.join(output, 'browser-results.json'), JSON.stringify(result, null, 2) + '\n');
    console.log(`Copied standalone .naeil kit: ${result.cases.length} cases passed`);
  } finally { server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
