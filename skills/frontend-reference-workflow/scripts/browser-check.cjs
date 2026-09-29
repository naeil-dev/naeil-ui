/** Reusable measurements; callers prepare the page/state with their own authorized fixtures. */
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");

class CheckError extends Error {}
let outputPath;
function validateRules(rules) {
  if (!rules || typeof rules !== "object" || Array.isArray(rules))
    throw new CheckError("rules must be an object");
  if (rules.expectations !== undefined && !Array.isArray(rules.expectations))
    throw new CheckError("expectations must be an array");
  for (const rule of rules.expectations || []) {
    if (
      !rule ||
      typeof rule.selector !== "string" ||
      !rule.selector.trim() ||
      !rule.css ||
      typeof rule.css !== "object" ||
      Array.isArray(rule.css) ||
      !Object.keys(rule.css).length ||
      Object.values(rule.css).some((v) => typeof v !== "string")
    ) {
      throw new CheckError(
        "Each expectation requires a selector and nonempty css with string values",
      );
    }
  }
}
function safeError(error) {
  if (error instanceof CheckError) return error.message;
  if (error.code === "MODULE_NOT_FOUND")
    return "Required Playwright or axe dependency is missing in --project";
  if (error.code === "ENOENT") return "A configured input file is missing";
  if (error instanceof SyntaxError) return "Invalid JSON configuration";
  if (error.name === "TimeoutError")
    return "Timed out preparing the page or ready selector";
  return "Browser or audit execution failed; inspect local setup and selectors (raw output suppressed)";
}
async function auditPage(page, rules, AxeBuilder) {
  validateRules(rules);
  if (
    rules.touchMin !== undefined &&
    (!Number.isFinite(rules.touchMin) || rules.touchMin <= 0)
  ) {
    throw new CheckError("touchMin must be a positive project-defined number");
  }
  await page.evaluate(() => document.fonts.ready);
  const measurements = await page.evaluate(
    ({ touchMin, expectations = [] }) => {
      const visible = (el, includeTransparent = false) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return (
          r.width > 0 &&
          r.height > 0 &&
          s.visibility !== "hidden" &&
          s.display !== "none" &&
          (includeTransparent || s.opacity !== "0") &&
          !(
            r.width <= 1 &&
            r.height <= 1 &&
            (s.clip !== "auto" || s.clipPath !== "none")
          )
        );
      };
      const describe = (el) => ({
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        role: el.getAttribute("role"),
        slot: el.getAttribute("data-slot"),
      });
      const touchReview = [];
      const coarse = matchMedia("(pointer: coarse)").matches;
      if (coarse && touchMin) {
        for (const el of document.querySelectorAll(
          'button,a[href],input,select,textarea,[role="button"],[role="switch"],[role="checkbox"],[role="tab"],[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"],[role="option"],[role="link"],[role="radio"],[role="slider"],[role="spinbutton"],[tabindex]:not([tabindex="-1"])',
        )) {
          if (
            !visible(el, true) ||
            (getComputedStyle(el).opacity === "0" &&
              getComputedStyle(el).pointerEvents === "none") ||
            el.matches(':disabled,[aria-disabled="true"],[inert],[inert] *') ||
            el.getAttribute("type") === "hidden"
          )
            continue;
          const r = el.getBoundingClientRect();
          if (r.width + 0.5 < touchMin || r.height + 0.5 < touchMin) {
            const before = getComputedStyle(el, "::before"),
              after = getComputedStyle(el, "::after");
            touchReview.push({
              ...describe(el),
              width: r.width,
              height: r.height,
              associatedLabel: !!el.labels?.length,
              pseudoElement: [before, after].some(
                (s) => s.content !== "none" && s.content !== "normal",
              ),
              reason:
                "Visible box below project target; inspect actual label/pseudo-element hit area and overlap.",
            });
          }
        }
      }
      const checked = [];
      for (const rule of expectations) {
        const els = [...document.querySelectorAll(rule.selector)].filter((el) =>
          visible(el),
        );
        if (!els.length) {
          checked.push({
            selector: rule.selector,
            status: "fail",
            reason: "No visible match",
          });
          continue;
        }
        for (const el of els) {
          const style = getComputedStyle(el);
          for (const [property, expected] of Object.entries(rule.css || {})) {
            const actual = style[property] || style.getPropertyValue(property);
            checked.push({
              selector: rule.selector,
              property,
              expected,
              actual,
              status: actual === expected ? "pass" : "fail",
            });
          }
        }
      }
      return {
        viewport: { width: innerWidth, height: innerHeight, coarse },
        scrollWidth: document.documentElement.scrollWidth,
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        touchStatus: touchMin
          ? coarse
            ? "measured"
            : "not-applicable-fine-pointer"
          : "not-configured",
        touchReview,
        expectations: checked,
      };
    },
    rules,
  );
  const configuredViewport = page.viewportSize();
  measurements.viewportMismatch =
    !!configuredViewport &&
    Math.abs(measurements.viewport.width - configuredViewport.width) > 1;
  const axe = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  const pack = (v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    helpUrl: v.helpUrl,
    nodes: v.nodes.map((n) => ({
      target: n.target,
      summary: n.failureSummary || null,
    })),
  });
  const violations = axe.violations.map(pack);
  const incomplete = axe.incomplete.map(pack);
  const status =
    violations.length ||
    measurements.overflow ||
    measurements.viewportMismatch ||
    measurements.expectations.some((x) => x.status === "fail")
      ? "needs-work"
      : measurements.touchReview.length || incomplete.length
        ? "needs-review"
        : "automated-checks-passed";
  return {
    ...measurements,
    violations,
    incomplete,
    status,
    limits: [
      "Only the current rendered state was measured; axe contrast covers text in that state.",
      "Control boundaries, focus and selected/state indicators need separate non-text contrast checks against the project standard.",
      "Page scroll overflow only; clipped/ellipsized content and inner-region overflow require visual review.",
      "Small visual boxes need effective-hit-area review.",
      "Keyboard behavior, visual hierarchy, reduced motion and other states require separate checks.",
    ],
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help")) {
    console.log(
      "node browser-check.cjs --config <project-checks.json> --project <dependency-root> --out <report.json>\nUses existing @playwright/test (or playwright) and @axe-core/playwright; installs nothing. See references/verification.md.",
    );
    return;
  }
  const value = (name) => {
    const i = args.indexOf(name);
    if (i < 0 || !args[i + 1]) throw new CheckError(`Missing ${name}`);
    return args[i + 1];
  };
  outputPath = path.resolve(value("--out"));
  const configPath = path.resolve(value("--config"));
  const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const output = outputPath;
  if (!config || typeof config.baseURL !== "string" || !config.baseURL.trim())
    throw new CheckError("Provide a valid baseURL");
  let base;
  try {
    base = new URL(config.baseURL);
  } catch {
    throw new CheckError("Provide a valid absolute baseURL");
  }
  if (
    !["http:", "https:"].includes(base.protocol) ||
    base.username ||
    base.password
  )
    throw new CheckError(
      "Use an HTTP(S) preview URL without embedded credentials",
    );
  const req = createRequire(
    path.join(path.resolve(value("--project")), "package.json"),
  );
  let chromium;
  try {
    ({ chromium } = req("@playwright/test"));
  } catch {
    ({ chromium } = req("playwright"));
  }
  const AxeBuilder = req("@axe-core/playwright").default;
  if (!config.authority || !Array.isArray(config.cases) || !config.cases.length)
    throw new CheckError("Provide authority and nonempty cases");
  validateRules(config.rules || {});
  for (const entry of config.cases) {
    if (
      !entry ||
      typeof entry.name !== "string" ||
      !entry.name.trim() ||
      typeof entry.path !== "string" ||
      !entry.viewport ||
      !Number.isInteger(entry.viewport.width) ||
      !Number.isInteger(entry.viewport.height) ||
      entry.viewport.width <= 0 ||
      entry.viewport.height <= 0
    )
      throw new CheckError(
        "Each case requires name, path and positive integer viewport width/height",
      );
    if (entry.touch !== undefined && typeof entry.touch !== "boolean")
      throw new CheckError("Case touch must be boolean");
    if (
      entry.colorScheme !== undefined &&
      !["dark", "light", "no-preference"].includes(entry.colorScheme)
    )
      throw new CheckError("Invalid case colorScheme");
    let caseURL;
    try {
      caseURL = new URL(entry.path, base);
    } catch {
      throw new CheckError("Invalid case URL");
    }
    if (caseURL.origin !== base.origin)
      throw new CheckError("Each case must use the preview origin");
    if (caseURL.username || caseURL.password)
      throw new CheckError("Case URLs must not contain embedded credentials");
    if (typeof entry.readySelector !== "string" || !entry.readySelector.trim())
      throw new CheckError(
        "Each CLI case requires readySelector; prepare complex states in project tests",
      );
  }
  const browser = await chromium.launch();
  const results = [];
  try {
    for (const entry of config.cases) {
      const url = new URL(entry.path, base);
      const context = await browser.newContext({
        viewport: entry.viewport,
        hasTouch: !!entry.touch,
        isMobile: !!entry.touch,
        colorScheme: entry.colorScheme || "dark",
        reducedMotion: "reduce",
      });
      const caseInfo = {
        name: entry.name,
        path: entry.path,
        colorScheme: entry.colorScheme || "dark",
        touch: !!entry.touch,
        viewportConfig: entry.viewport,
      };
      try {
        const page = await context.newPage();
        const response = await page.goto(url.href, {
          waitUntil: "domcontentloaded",
          timeout: 20000,
        });
        if (!response || !response.ok())
          throw new CheckError("Preview returned a failed HTTP response");
        if (entry.readySelector)
          await page
            .locator(entry.readySelector)
            .waitFor({ state: "visible", timeout: 20000 });
        const result = await auditPage(page, config.rules || {}, AxeBuilder);
        results.push({ ...caseInfo, ...result });
      } catch (e) {
        results.push({
          ...caseInfo,
          status: "blocked",
          reason: "Page preparation or audit failed",
          detail: safeError(e),
        });
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
  const status =
    ["blocked", "needs-work", "needs-review"].find((value) =>
      results.some((r) => r.status === value),
    ) || "automated-checks-passed";
  const report = {
    status,
    checkedAt: new Date().toISOString(),
    authority: config.authority,
    results,
    scope:
      "Isolated browser; only configured initial states, reduced motion enabled; no mutation flows run.",
  };
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
  console.log(
    JSON.stringify({
      report: output,
      statuses: results.map((r) => ({ name: r.name, status: r.status })),
    }),
  );
  process.exitCode = results.some((r) => r.status !== "automated-checks-passed")
    ? 1
    : 0;
}
module.exports = { auditPage };
if (require.main === module)
  main().catch((error) => {
    const reason = safeError(error);
    console.error(`Browser check blocked: ${reason}. No checks claimed.`);
    if (outputPath) {
      try {
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(
          outputPath,
          JSON.stringify(
            {
              checkedAt: new Date().toISOString(),
              status: "blocked",
              reason,
              results: [],
            },
            null,
            2,
          ) + "\n",
        );
      } catch {}
    }
    process.exitCode = 2;
  });
