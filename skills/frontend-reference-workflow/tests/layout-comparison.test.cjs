const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { spawn } = require("node:child_process");
const projectRoot = path.resolve(__dirname, "../../..");
const script = path.resolve(__dirname, "../scripts/browser-check.cjs");

async function fixture(check) {
  const tmp = fs.mkdtempSync(
    path.join(require("node:os").tmpdir(), "layout-check-"),
  );
  let requests = 0;
  const server = http.createServer((req, res) => {
    requests++;
    if (req.url === "/redirect") {
      res.writeHead(302, {
        Location: "http://localhost:" + server.address().port + "/",
      });
      return res.end();
    }
    if (req.url === "/delayed" || req.url === "/same-origin-delayed") {
      const host = req.url === "/delayed" ? "localhost" : "127.0.0.1";
      res.writeHead(200, { "Content-Type": "text/html" });
      return res.end(`<html lang="en"><title>Loading</title><script>setTimeout(() => location.href = 'http://${host}:${server.address().port}/?secret=omit#omit', 150)</script><p>Loading</p></html>`);
    }
    if (req.url === "/bounce" || req.url === "/away") {
      const next = req.url === "/bounce"
        ? `http://localhost:${server.address().port}/away`
        : `http://127.0.0.1:${server.address().port}/?secret=omit#omit`;
      res.writeHead(200, { "Content-Type": "text/html" });
      return res.end(`<html lang="en"><title>Loading</title><script>setTimeout(() => location.href = ${JSON.stringify(next)}, 50)</script><p>Loading</p></html>`);
    }
    if (req.url === "/audit-navigation") {
      const next = `http://localhost:${server.address().port}/?secret=omit#omit`;
      res.writeHead(200, { "Content-Type": "text/html" });
      // Trigger navigation at the helper's font-readiness measurement, not on a timer.
      return res.end(`<!doctype html><html lang="en"><title>Fixture</title><main>Ready</main><script>
        Object.defineProperty(document.fonts, 'ready', { get() {
          location.href = ${JSON.stringify(next)};
          return new Promise(() => {});
        }});
      </script></html>`);
    }
    if (req.url === "/font.woff2") {
      res.writeHead(200, { "Content-Type": "font/woff2" });
      return res.end(
        fs.readFileSync(
          path.join(
            projectRoot,
            "node_modules/pretendard/dist/web/static/woff2/Pretendard-Regular.woff2",
          ),
        ),
      );
    }
    if (req.url === "/missing.woff2") {
      res.writeHead(404);
      return res.end();
    }
    res.writeHead(req.url === "/error" ? 503 : 200, {
      "Content-Type": "text/html",
    });
    const left = req.url === "/shifted" ? 400 : req.url === "/edge" ? 49 : 48;
    const nav = '<nav aria-label="Main"><a href="/">Overview</a></nav>';
    const extra =
      {
        "/quirks-root": "html{width:2000px}main{height:5000px}",
        "/standard-root": "html{width:2000px}main{height:5000px}",
        "/small-overflow": "main{height:5000px;width:calc(100% + 8px);max-width:none;margin:0}",
        "/vw-overflow": "main{height:5000px;width:100vw;max-width:none;margin:0}",
        "/tall": "header{margin:0 auto;max-width:800px} main{height:5000px}",
        "/short": "header{margin:0 auto;max-width:800px}",
        "/offscreen": "header{position:absolute;left:-9999px}",
        "/hidden": "header{opacity:0}",
        "/font-ok":
          "@font-face{font-family:FixtureFont;src:url(/font.woff2)}body{font-family:FixtureFont,sans-serif}",
        "/font-fail":
          "@font-face{font-family:FixtureFont;src:url(/missing.woff2)}body{font-family:FixtureFont,sans-serif}",
      }[req.url] || "";
    res.end(`${req.url.startsWith("/standard") ? "<!doctype html>" : ""}<html lang="${req.url === "/ko" ? "ko" : "en"}"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Fixture</title>
      <style>body{margin:0;background:#fff;color:#111;font:16px Arial}header{margin-left:${left}px}nav{display:inline-block}main{max-width:600px;margin:auto}${extra}</style>
      <header>${req.url === "/absent" ? "" : nav}${req.url === "/duplicate" ? nav : ""}</header><main><h1>Accounts</h1><p>Three records</p></main></html>`);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const config = {
    authority: "Fixture: navigation position stays stable across routes",
    baseURL: `http://127.0.0.1:${server.address().port}`,
    cases: ["overview", "settings"].map((name) => ({
      name,
      path: "/",
      viewport: { width: 1440, height: 900 },
      locale: "en-US",
      colorScheme: "light",
      readySelector: "main",
    })),
    layoutComparisons: [
      {
        name: "shared navigation",
        cases: ["overview", "settings"],
        selector: "header nav",
        properties: ["x", "y", "height"],
        tolerance: 1,
      },
    ],
  };
  async function run(runConfig = config) {
    const cfg = path.join(tmp, "config.json"),
      out = path.join(tmp, "report.json");
    fs.writeFileSync(cfg, JSON.stringify(runConfig));
    const code = await new Promise((resolve, reject) => {
      const child = spawn(
        process.execPath,
        [script, "--config", cfg, "--project", projectRoot, "--out", out],
        { stdio: "ignore" },
      );
      child.on("error", reject);
      child.on("close", resolve);
    });
    return { code, report: JSON.parse(fs.readFileSync(out)) };
  }
  try {
    await check({ config, run, requestCount: () => requests });
  } finally {
    await new Promise((resolve) => server.close(resolve));
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

test("detects route navigation shift even when each page passes its own audit", async () => {
  await fixture(async ({ config, run }) => {
    config.cases[1].path = "/shifted";
    const { code, report } = await run();
    assert.ok(
      report.results.every((r) => r.status === "automated-checks-passed"),
    );
    assert.equal(code, 1);
    assert.equal(report.status, "needs-work");
    assert.equal(report.layoutComparisons[0].status, "needs-work");
    assert.equal(report.layoutComparisons[0].deltas.x, 352);
  });
});

test("accepts stable geometry and records locale and exact checker provenance", async () => {
  await fixture(async ({ run }) => {
    const { code, report } = await run();
    assert.equal(code, 0);
    assert.equal(report.layoutComparisons[0].status, "automated-checks-passed");
    assert.equal(report.results[0].locale, "en-US");
    assert.equal(report.results[0].documentLanguage, "en");
    assert.equal(
      report.checker.sha256,
      require("node:crypto")
        .createHash("sha256")
        .update(fs.readFileSync(script))
        .digest("hex"),
    );
  });
});

test("missing or ambiguous landmarks cannot silently pass a comparison", async () => {
  await fixture(async ({ config, run }) => {
    for (const route of ["/absent", "/duplicate"]) {
      config.cases[1].path = route;
      const { code, report } = await run();
      assert.equal(code, 1);
      assert.equal(report.layoutComparisons[0].status, "needs-work");
      assert.match(report.layoutComparisons[0].reason, /exactly one visible/);
    }
  });
});

test("rejects invalid comparisons before navigating any page", async () => {
  await fixture(async ({ config, run, requestCount }) => {
    const original = structuredClone(config);
    const mutations = [
      (c) => {
        c.layoutComparison = c.layoutComparisons;
        delete c.layoutComparisons;
      },
      (c) => {
        c.rules = null;
      },
      (c) => {
        c.rules = false;
      },
      (c) => {
        c.rules = 0;
      },
      (c) => {
        c.rules = { touchmin: 44 };
      },
      (c) => {
        c.rules = { touchMin: -1 };
      },
      (c) => {
        c.cases[0].theme = "light";
      },
      (c) => {
        c.cases[0].viewport.wdith = 800;
      },
      (c) => {
        c.layoutComparisons[0].tolerence = 1;
      },
      (c) => {
        c.rules = {
          expectations: [
            { selector: "body", css: { fontSize: "16px" }, cs: {} },
          ],
        };
      },
      (c) => {
        c.rules = { fontsLoaded: [{ font: "16px FixtureFont", typo: "text" }] };
      },
      (c) => {
        c.layoutComparisons = null;
      },
      (c) => {
        c.layoutComparisons[0].cases = ["overview"];
      },
      (c) => {
        c.layoutComparisons[0].cases[1] = "unknown";
      },
      (c) => {
        c.layoutComparisons[0].properties = ["leftt"];
      },
      (c) => {
        c.layoutComparisons[0].properties = [];
      },
      (c) => {
        c.layoutComparisons[0].tolerance = -1;
      },
      (c) => {
        c.cases[1].viewport.width = 1024;
      },
      (c) => {
        c.cases[1].locale = "ko-KR";
      },
      (c) => {
        c.cases[1].colorScheme = "dark";
      },
      (c) => {
        c.cases[1].touch = true;
      },
      (c) => {
        c.cases[1].name = "overview";
      },
    ];
    for (const mutate of mutations) {
      const isolated = structuredClone(original);
      mutate(isolated);
      const { code, report } = await run(isolated);
      assert.equal(code, 2);
      assert.equal(report.status, "blocked");
      assert.equal(requestCount(), 0);
    }
  });
});

test("an unavailable comparison page leaves overall verification blocked", async () => {
  await fixture(async ({ config, run }) => {
    config.cases[1].path = "/error";
    const { code, report } = await run();
    assert.equal(code, 1);
    assert.equal(report.status, "blocked");
    assert.equal(report.layoutComparisons[0].status, "blocked");
  });
});

test("classic scrollbar changes are measured across short and tall content", async () => {
  await fixture(async ({ config, run }) => {
    config.cases[0].path = "/short";
    config.cases[1].path = "/tall";
    const { code, report } = await run();
    assert.equal(code, 1);
    assert.ok(report.results[1].scrollbarWidth > 0);
    assert.ok(report.layoutComparisons[0].deltas.x > 1);
  });
});

test("landmarks need to be onscreen and visible through ancestors", async () => {
  await fixture(async ({ config, run }) => {
    for (const route of ["/hidden", "/offscreen"]) {
      config.cases.forEach((c) => {
        c.path = route;
      });
      const { code, report } = await run();
      assert.equal(code, 1);
      assert.equal(report.layoutComparisons[0].status, "needs-work");
    }
  });
});

test("rendered languages and tolerance boundary are enforced", async () => {
  await fixture(async ({ config, run }) => {
    config.cases[1].path = "/ko";
    assert.equal((await run()).report.layoutComparisons[0].status, "blocked");
    config.cases[1].path = "/edge";
    assert.equal((await run()).code, 0);
    config.layoutComparisons[0].tolerance = 0.5;
    assert.equal((await run()).code, 1);
  });
});

test("font availability is checked independently from the CSS declaration", async () => {
  await fixture(async ({ config, run }) => {
    config.cases = [config.cases[0]];
    delete config.layoutComparisons;
    config.cases[0].path = "/font-fail";
    config.rules = {
      expectations: [
        { selector: "body", css: { fontFamily: "FixtureFont, sans-serif" } },
      ],
    };
    const declaration = await run();
    assert.equal(declaration.report.status, "needs-review");
    config.rules.fontsLoaded = [
      { font: '16px "FixtureFont"', text: "한글 Hello" },
    ];
    const failed = await run();
    assert.equal(failed.report.status, "needs-work");
    assert.equal(failed.report.results[0].fonts[0].status, "fail");
    config.cases[0].path = "/font-ok";
    const loaded = await run();
    assert.equal(loaded.code, 0);
    assert.equal(loaded.report.results[0].fonts[0].status, "pass");
    config.rules.fontsLoaded = [
      { font: '16px "NeverDeclared"', text: "Hello" },
    ];
    assert.equal((await run()).report.status, "needs-work");
  });
});

test("cross-origin redirect is blocked and final location is recorded", async () => {
  await fixture(async ({ config, run }) => {
    config.cases = [config.cases[0]];
    delete config.layoutComparisons;
    config.cases[0].path = "/redirect";
    const { code, report } = await run();
    assert.equal(code, 1);
    assert.equal(report.status, "blocked");
    assert.match(report.results[0].detail, /origin/);
    assert.match(report.results[0].finalURL, /localhost/);
  });
});

test("ambiguous ready selector reports a safe actionable reason", async () => {
  await fixture(async ({ config, run }) => {
    config.cases = [config.cases[0]];
    delete config.layoutComparisons;
    config.cases[0].readySelector = "header, main";
    const { code, report } = await run();
    assert.equal(code, 1);
    assert.equal(report.status, "blocked");
    assert.match(report.results[0].detail, /exactly one/);
  });
});


test("page overflow includes widths smaller than the native scrollbar", async () => {
  await fixture(async ({ config, run }) => {
    config.cases = [config.cases[0]];
    delete config.layoutComparisons;
    for (const route of ["/small-overflow", "/vw-overflow"]) {
      config.cases[0].path = route;
      const { code, report } = await run();
      assert.ok(report.results[0].scrollbarWidth > 8);
      assert.equal(report.results[0].overflow, true, route);
      assert.equal(report.status, "needs-work");
      assert.equal(code, 1);
    }
  });
});

test("navigation during readiness checks the actual origin and records the destination", async () => {
  await fixture(async ({ config, run }) => {
    config.cases = [config.cases[0]];
    delete config.layoutComparisons;
    config.cases[0].path = "/delayed";
    const blocked = await run();
    assert.equal(blocked.code, 1);
    assert.equal(blocked.report.status, "blocked");
    assert.match(blocked.report.results[0].detail, /origin/);
    assert.equal(blocked.report.results[0].finalURL, config.baseURL.replace("127.0.0.1", "localhost") + "/");
    config.cases[0].path = "/same-origin-delayed";
    const allowed = await run();
    assert.equal(allowed.code, 0);
    assert.equal(allowed.report.results[0].finalURL, config.baseURL + "/");
  });
});


test("origin departure remains blocked after returning to the preview", async () => {
  await fixture(async ({ config, run }) => {
    config.cases = [config.cases[0]];
    delete config.layoutComparisons;
    config.cases[0].path = "/bounce";
    const { code, report } = await run();
    assert.equal(code, 1);
    assert.equal(report.status, "blocked");
    assert.match(report.results[0].detail, /origin/);
    assert.equal(report.results[0].finalURL, config.baseURL + "/");
  });
});

test("audit navigation failure reports the committed destination and origin reason", async () => {
  await fixture(async ({ config, run }) => {
    config.cases = [config.cases[0]];
    delete config.layoutComparisons;
    config.cases[0].path = "/audit-navigation";
    const { code, report } = await run();
    assert.equal(code, 1);
    assert.equal(report.status, "blocked");
    assert.match(report.results[0].detail, /origin/);
    assert.equal(report.results[0].finalURL, config.baseURL.replace("127.0.0.1", "localhost") + "/");
  });
});

test("root width overflow uses the viewport in standard and quirks documents", async () => {
  await fixture(async ({ config, run }) => {
    config.cases = [config.cases[0]];
    delete config.layoutComparisons;
    for (const route of ["/quirks-root", "/standard-root", "/", "/standard"]) {
      config.cases[0].path = route;
      const { code, report } = await run();
      const overflowing = route.endsWith("-root");
      assert.equal(report.results[0].overflow, overflowing, route);
      assert.equal(code, overflowing ? 1 : 0, route);
      if (overflowing) assert.ok(report.results[0].scrollbarWidth > 0);
    }
  });
});
