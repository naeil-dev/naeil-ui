const { test } = require("node:test");
const assert = require("node:assert/strict");
const { createRequire } = require("node:module");
const projectRoot = require("node:path").resolve(__dirname, "../../..");
const req = createRequire(
  require("node:path").join(projectRoot, "package.json"),
);
const { chromium } = req("@playwright/test");
const AxeBuilder = req("@axe-core/playwright").default;
const fs = require("node:fs");
const script = require("node:path").resolve(
  __dirname,
  "../scripts/browser-check.cjs",
);
test("browser helper is available", () =>
  assert.ok(fs.existsSync(script), "missing reusable browser check"));
test("finds real contrast, nested interaction, small touch targets and overflow; accepts repaired UI", async () => {
  if (!fs.existsSync(script)) return;
  const { auditPage } = require(script);
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.setContent(
      '<html lang="en"><title>Fixture</title><style>body{background:#111;color:#666;font:16px Arial}button{width:32px;height:32px}main{width:900px}</style><main><p>Quota resets tomorrow</p><article role="button" tabindex="0">Account<button>Pause</button></article></main></html>',
    );
    const bad = await auditPage(
      page,
      {
        touchMin: 44,
        expectations: [{ selector: "body", css: { fontSize: "18px" } }],
      },
      AxeBuilder,
    );
    assert.ok(bad.violations.some((v) => v.id === "color-contrast"));
    assert.ok(bad.violations.some((v) => v.id === "nested-interactive"));
    assert.ok(bad.touchReview.some((v) => v.width === 32));
    assert.equal(bad.overflow, true);
    assert.ok(bad.expectations.some((v) => v.status === "fail"));
    assert.equal(bad.status, "needs-work");
    await page.setContent(
      '<html lang="en"><title>Fixture</title><style>body{margin:16px;background:#111;color:#eee;font:16px Arial}button{min-width:44px;height:44px}</style><main><p>Quota resets tomorrow</p><button>Pause</button></main></html>',
    );
    const good = await auditPage(
      page,
      {
        touchMin: 44,
        expectations: [{ selector: "body", css: { fontSize: "16px" } }],
      },
      AxeBuilder,
    );
    assert.deepEqual(good.violations, []);
    assert.deepEqual(good.touchReview, []);
    assert.equal(good.overflow, false);
    assert.equal(good.status, "automated-checks-passed");
    const missing = await auditPage(
      page,
      { expectations: [{ selector: ".not-here", css: { fontSize: "16px" } }] },
      AxeBuilder,
    );
    assert.equal(missing.expectations[0].status, "fail");
    assert.equal(missing.touchStatus, "not-configured");
  } finally {
    await browser.close();
  }
});
test("small visuals with expanded label area require review, not invented touch failure", async () => {
  if (!fs.existsSync(script)) return;
  const { auditPage } = require(script);
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.setContent(
      '<html lang="en"><title>Fixture</title><main><label style="display:flex;min-height:44px"><input type="checkbox">Enable</label></main></html>',
    );
    const r = await auditPage(page, { touchMin: 44 }, AxeBuilder);
    assert.ok(r.touchReview.some((x) => x.associatedLabel));
    assert.equal(r.status, "needs-review");
  } finally {
    await browser.close();
  }
});
test("CLI writes pass/finding/blocked reports using an isolated local fixture", async () => {
  const http = require("node:http");
  const os = require("node:os");
  const { spawn } = require("node:child_process");
  const tmp = fs.mkdtempSync(
    require("node:path").join(os.tmpdir(), "frontend-check-"),
  );
  const html =
    '<html lang="en"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Fixture</title><style>body{background:#111;color:#eee;font:16px Arial}button{min-width:44px;min-height:44px}</style><main><button>Save</button></main></html>';
  let requestCount = 0;
  const server = http.createServer((req, res) => {
    requestCount++;
    res.writeHead(req.url === "/missing" ? 404 : 200, {
      "Content-Type": "text/html",
    });
    res.end(req.url === "/no-meta" ? html.replace(/<meta[^>]+>/, "") : html);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const config = {
      authority: "fixture DESIGN: 16px/44px",
      baseURL: `http://127.0.0.1:${server.address().port}`,
      rules: {
        touchMin: 44,
        expectations: [{ selector: "body", css: { fontSize: "16px" } }],
      },
      cases: [
        {
          name: "touch",
          path: "/",
          viewport: { width: 390, height: 844 },
          touch: true,
          readySelector: "main",
        },
      ],
    };
    const cfg = require("node:path").join(tmp, "config.json"),
      out = require("node:path").join(tmp, "report.json");
    const run = () =>
      new Promise((resolve, reject) => {
        const p = spawn(
          process.execPath,
          [script, "--config", cfg, "--project", projectRoot, "--out", out],
          { stdio: "pipe" },
        );
        let stderr = "";
        p.stdout.resume();
        p.stderr.on("data", (s) => (stderr += s));
        p.on("error", reject);
        p.on("close", (code) => resolve({ code, stderr }));
      });
    fs.writeFileSync(cfg, JSON.stringify(config));
    assert.equal((await run()).code, 0);
    assert.equal(
      JSON.parse(fs.readFileSync(out)).results[0].status,
      "automated-checks-passed",
    );
    assert.equal(
      JSON.parse(fs.readFileSync(out)).status,
      "automated-checks-passed",
    );
    const recorded = JSON.parse(fs.readFileSync(out)).results[0];
    assert.equal(recorded.colorScheme, "dark");
    assert.equal(recorded.touch, true);
    assert.equal(recorded.viewportConfig.width, 390);
    config.cases[0].path = "/no-meta";
    fs.writeFileSync(cfg, JSON.stringify(config));
    assert.equal((await run()).code, 1);
    assert.equal(
      JSON.parse(fs.readFileSync(out)).results[0].viewportMismatch,
      true,
    );
    assert.equal(JSON.parse(fs.readFileSync(out)).status, "needs-work");
    config.cases[0].path = "/";
    config.rules.expectations[0].css.fontSize = "18px";
    fs.writeFileSync(cfg, JSON.stringify(config));
    assert.equal((await run()).code, 1);
    assert.equal(
      JSON.parse(fs.readFileSync(out)).results[0].status,
      "needs-work",
    );
    config.cases[0].path = "/missing";
    fs.writeFileSync(cfg, JSON.stringify(config));
    assert.equal((await run()).code, 1);
    assert.equal(JSON.parse(fs.readFileSync(out)).results[0].status, "blocked");
    config.cases[0].viewport.width = 0;
    fs.writeFileSync(cfg, JSON.stringify(config));
    const invalid = await run();
    assert.equal(invalid.code, 2);
    assert.match(invalid.stderr, /positive integer viewport/);
    const overwritten = JSON.parse(fs.readFileSync(out));
    assert.equal(overwritten.status, "blocked");
    assert.deepEqual(overwritten.results, []);
    config.cases[0].viewport.width = 390;
    config.cases.push({
      ...config.cases[0],
      name: "wrong origin",
      path: "https://example.invalid/",
    });
    requestCount = 0;
    fs.writeFileSync(cfg, JSON.stringify(config));
    const originError = await run();
    assert.equal(originError.code, 2);
    assert.match(originError.stderr, /preview origin/);
    assert.equal(requestCount, 0);
    delete config.baseURL;
    fs.writeFileSync(cfg, JSON.stringify(config));
    const missingBase = await run();
    assert.equal(missingBase.code, 2);
    assert.match(missingBase.stderr, /baseURL/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
test("isolates overflow, incomplete, missing expectations and fine-pointer coverage", async () => {
  const { auditPage } = require(script);
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
    });
    const page = await context.newPage();
    await page.setContent(
      '<html lang="en"><title>Fixture</title><style>body{background:#fff;color:#111;font:16px Arial}main{width:900px}</style><main>Wide content</main></html>',
    );
    const overflow = await auditPage(page, {}, AxeBuilder);
    assert.deepEqual(overflow.violations, []);
    assert.deepEqual(overflow.incomplete, []);
    assert.equal(overflow.overflow, true);
    assert.equal(overflow.status, "needs-work");
    await page.setContent(
      '<html lang="en"><title>Fixture</title><main><p style="background:linear-gradient(90deg,#fff,#ddd);color:#111">Gradient background</p></main></html>',
    );
    const incomplete = await auditPage(page, {}, AxeBuilder);
    assert.deepEqual(incomplete.violations, []);
    assert.equal(incomplete.overflow, false);
    assert.ok(incomplete.incomplete.length);
    assert.deepEqual(incomplete.touchReview, []);
    assert.equal(incomplete.status, "needs-review");
    await page.setContent(
      '<html lang="en"><title>Fixture</title><main><button style="height:20px">Save</button></main></html>',
    );
    const fine = await auditPage(page, { touchMin: 44 }, AxeBuilder);
    assert.equal(fine.touchStatus, "not-applicable-fine-pointer");
    assert.deepEqual(fine.touchReview, []);
    const missing = await auditPage(
      page,
      { expectations: [{ selector: ".absent", css: { color: "red" } }] },
      AxeBuilder,
    );
    assert.equal(missing.status, "needs-work");
  } finally {
    await browser.close();
  }
});
test("rejects malformed expectations instead of silently checking nothing", async () => {
  const { auditPage } = require(script);
  await assert.rejects(
    () =>
      auditPage(
        {},
        { expectations: [{ selector: "body", cs: { fontSize: "18px" } }] },
        AxeBuilder,
      ),
    /unsupported keys/,
  );
});
test("rejects empty CSS expectations", async () => {
  const { auditPage } = require(script);
  await assert.rejects(
    () =>
      auditPage(
        {},
        { expectations: [{ selector: "body", css: {} }] },
        AxeBuilder,
      ),
    /selector and nonempty css/,
  );
});
test("mobile layout viewport mismatch is a finding", async () => {
  const { auditPage } = require(script);
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    const page = await context.newPage();
    await page.setContent(
      '<html lang="en"><title>Fixture</title><main>Content without viewport declaration</main></html>',
    );
    const r = await auditPage(page, {}, AxeBuilder);
    assert.equal(r.viewportMismatch, true);
    assert.equal(r.status, "needs-work");
  } finally {
    await browser.close();
  }
});
test("touch candidates exclude noninteractive focus anchors and clipped skip links but include tabs", async () => {
  const { auditPage } = require(script);
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.setContent(
      '<html lang="en"><title>Fixture</title><a href="#main" style="position:absolute;width:1px;height:1px;clip:rect(0,0,0,0);overflow:hidden">Skip</a><main id="main" tabindex="-1"><h1 tabindex="-1" style="font-size:16px">Title</h1><div role="tablist"><div role="tab" aria-selected="true" style="height:20px">One</div></div></main></html>',
    );
    const r = await auditPage(page, { touchMin: 44 }, AxeBuilder);
    assert.equal(r.touchReview.length, 1);
    assert.equal(r.touchReview[0].role, "tab");
  } finally {
    await browser.close();
  }
});
test("transparent input overlay remains a touch target", async () => {
  const { auditPage } = require(script);
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.setContent(
      '<html lang="en"><title>Fixture</title><main><span style="position:relative;display:inline-block;width:16px;height:16px;background:#555"><input id="overlay" type="checkbox" aria-label="Enable" style="position:absolute;inset:0;margin:0;width:16px;height:16px;opacity:0"></span></main></html>',
    );
    const r = await auditPage(page, { touchMin: 44 }, AxeBuilder);
    assert.ok(r.touchReview.some((x) => x.id === "overlay"));
    assert.equal(r.status, "needs-review");
  } finally {
    await browser.close();
  }
});
test("transparent non-pointer form mirror is not a touch target", async () => {
  const { auditPage } = require(script);
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.setContent(
      '<html lang="en"><title>Fixture</title><main><button style="min-width:44px;height:44px">Enable</button><input type="checkbox" tabindex="-1" aria-hidden="true" style="opacity:0;pointer-events:none;width:16px;height:16px"></main></html>',
    );
    const r = await auditPage(page, { touchMin: 44 }, AxeBuilder);
    assert.deepEqual(r.touchReview, []);
  } finally {
    await browser.close();
  }
});

test("hidden ancestors cannot satisfy visible CSS expectations or non-pointer touch targets", async () => {
  const { auditPage } = require(script);
  const browser = await chromium.launch();
  try {
    const page = await (await browser.newContext({ hasTouch: true })).newPage();
    await page.setContent(
      '<html lang="en"><title>Fixture</title><main><div style="opacity:0;pointer-events:none"><button id="hidden" style="width:20px;height:20px;font-size:16px">Hidden</button></div></main></html>',
    );
    const result = await auditPage(
      page,
      {
        touchMin: 44,
        expectations: [{ selector: "#hidden", css: { fontSize: "16px" } }],
      },
      AxeBuilder,
    );
    assert.equal(result.status, "needs-work");
    assert.equal(result.expectations[0].reason, "No visible match");
    assert.deepEqual(result.touchReview, []);
  } finally {
    await browser.close();
  }
});
