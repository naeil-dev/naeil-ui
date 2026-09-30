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
    res.writeHead(req.url === "/error" ? 503 : 200, {
      "Content-Type": "text/html",
    });
    const left = req.url === "/shifted" ? 400 : 48;
    const nav = '<nav aria-label="Main"><a href="/">Overview</a></nav>';
    res.end(`<html lang="en"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Fixture</title>
      <style>body{margin:0;background:#fff;color:#111;font:16px Arial}header{margin-left:${left}px}nav{display:inline-block}main{max-width:600px;margin:auto}</style>
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
  async function run() {
    const cfg = path.join(tmp, "config.json"),
      out = path.join(tmp, "report.json");
    fs.writeFileSync(cfg, JSON.stringify(config));
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
      Object.assign(config, structuredClone(original));
      mutate(config);
      const { code, report } = await run();
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
