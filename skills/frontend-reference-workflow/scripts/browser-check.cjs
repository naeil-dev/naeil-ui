/** Reusable measurements; callers prepare the page/state with their own authorized fixtures. */
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const { createHash } = require("node:crypto");

const checker = {
  revision: "2026-10-01.1",
  sha256: createHash("sha256")
    .update(fs.readFileSync(__filename))
    .digest("hex"),
};

class CheckError extends Error {}
let outputPath;
function knownKeys(value, allowed, label) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new CheckError(label + " must be an object");
  if (Object.keys(value).some((key) => !allowed.includes(key)))
    throw new CheckError(label + " contains unsupported keys; check spelling");
}
function validateRules(rules) {
  knownKeys(rules, ["touchMin", "expectations", "fontsLoaded"], "rules");
  if (
    rules.touchMin !== undefined &&
    (!Number.isFinite(rules.touchMin) || rules.touchMin <= 0)
  )
    throw new CheckError("touchMin must be a positive project-defined number");
  if (rules.fontsLoaded !== undefined && !Array.isArray(rules.fontsLoaded))
    throw new CheckError("fontsLoaded must be an array");
  for (const font of rules.fontsLoaded || []) {
    knownKeys(font, ["font", "text"], "font probe");
    if (
      typeof font.font !== "string" ||
      !font.font.trim() ||
      typeof font.text !== "string" ||
      !font.text.trim()
    )
      throw new CheckError(
        "Font probes require nonempty font shorthand and sample text",
      );
  }
  if (rules.expectations !== undefined && !Array.isArray(rules.expectations))
    throw new CheckError("expectations must be an array");
  for (const rule of rules.expectations || []) {
    knownKeys(rule, ["selector", "css"], "expectation");
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
  if (String(error.message).includes("strict mode violation"))
    return "Ready selector must match exactly one element";
  return "Browser or audit execution failed; inspect local setup and selectors (raw output suppressed)";
}
async function auditPage(page, rules, AxeBuilder) {
  validateRules(rules);
  await page.evaluate(() => document.fonts.ready);
  const fonts = await page.evaluate(async (probes) => {
    const results = [];
    for (const probe of probes) {
      try {
        const faces = await document.fonts.load(probe.font, probe.text);
        const loaded =
          faces.length > 0 &&
          faces.every((face) => face.status === "loaded") &&
          document.fonts.check(probe.font, probe.text);
        results.push({
          font: probe.font,
          status: loaded ? "pass" : "fail",
          faces: faces.map((face) => ({
            family: face.family,
            status: face.status,
          })),
          reason: loaded
            ? null
            : "No loaded web font faces for the requested sample",
        });
      } catch {
        results.push({
          font: probe.font,
          status: "fail",
          reason: "Web font loading failed or shorthand is invalid",
        });
      }
    }
    return results;
  }, rules.fontsLoaded || []);
  const fontReview =
    !fonts.length &&
    (rules.expectations || []).some((rule) =>
      Object.keys(rule.css).some((p) =>
        ["font", "fontFamily", "font-family"].includes(p),
      ),
    )
      ? [
          "Computed font-family is only a declaration; verify actual font loading separately or configure fontsLoaded.",
        ]
      : [];
  const measurements = await page.evaluate(
    ({ touchMin, expectations = [] }) => {
      const visible = (el, includeTransparent = false) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        if (!includeTransparent) {
          for (let node = el.parentElement; node; node = node.parentElement) {
            if (getComputedStyle(node).opacity === "0") return false;
          }
        }
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
            (getComputedStyle(el).pointerEvents === "none" && !visible(el)) ||
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
      // CSSOM View exposes the viewport through BODY in quirks mode.
      const viewportElement = document.compatMode === "BackCompat"
        ? document.body : document.documentElement;
      const scrollRoot = document.scrollingElement || viewportElement;
      return {
        documentMode: document.compatMode,
        documentLanguage: document.documentElement.lang,
        viewport: { width: innerWidth, height: innerHeight, coarse },
        scrollbarWidth: Math.max(
          0,
          innerWidth - viewportElement.clientWidth,
        ),
        scrollWidth: scrollRoot.scrollWidth,
        overflow: scrollRoot.scrollWidth > viewportElement.clientWidth + 1,
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
    fonts.some((font) => font.status === "fail") ||
    measurements.expectations.some((x) => x.status === "fail")
      ? "needs-work"
      : measurements.touchReview.length ||
          incomplete.length ||
          fontReview.length
        ? "needs-review"
        : "automated-checks-passed";
  return {
    ...measurements,
    violations,
    incomplete,
    fonts,
    fontReview,
    status,
    limits: [
      "Only the current rendered state was measured; axe contrast covers text in that state.",
      "Control boundaries, focus and selected/state indicators need separate non-text contrast checks against the project standard.",
      "Page scroll overflow only; clipped/ellipsized content and inner-region overflow require visual review.",
      "Small visual boxes need effective-hit-area review.",
      "Font probes establish web font availability for configured samples, not every rendered glyph or system font. Computed font-family alone is not loading evidence.",
      "Scrollbar width is environment-dependent; project API callers must verify their browser launch settings.",
      "Keyboard behavior, visual hierarchy, reduced motion and other states require separate checks.",
    ],
  };
}

function validateComparisons(comparisons, cases) {
  if (!Array.isArray(comparisons))
    throw new CheckError("layoutComparisons must be an array");
  const caseMap = new Map(cases.map((entry) => [entry.name, entry]));
  if (caseMap.size !== cases.length)
    throw new CheckError("Case names must be unique");
  const names = new Set();
  for (const item of comparisons) {
    knownKeys(
      item,
      ["name", "selector", "cases", "properties", "tolerance"],
      "layout comparison",
    );
    if (
      !item ||
      typeof item.name !== "string" ||
      !item.name.trim() ||
      names.has(item.name) ||
      typeof item.selector !== "string" ||
      !item.selector.trim() ||
      !Array.isArray(item.cases) ||
      item.cases.length < 2 ||
      new Set(item.cases).size !== item.cases.length ||
      item.cases.some((name) => !caseMap.has(name)) ||
      !Array.isArray(item.properties) ||
      !item.properties.length ||
      item.properties.some((p) => !["x", "y", "width", "height"].includes(p)) ||
      !Number.isFinite(item.tolerance) ||
      item.tolerance < 0
    )
      throw new CheckError(
        "Each layout comparison requires a unique name, selector, at least two distinct known cases, geometry properties and nonnegative tolerance",
      );
    names.add(item.name);
    const modes = item.cases.map((name) => {
      const entry = caseMap.get(name);
      return JSON.stringify([
        entry.viewport.width,
        entry.viewport.height,
        !!entry.touch,
        entry.colorScheme || "dark",
        entry.locale || "en-US",
      ]);
    });
    if (new Set(modes).size !== 1)
      throw new CheckError(
        "Compare cases with the same viewport, touch mode, colorScheme and locale",
      );
  }
}

async function measureLandmark(page, selector) {
  return page.locator(selector).evaluateAll((elements) => {
    const visible = elements.filter((el) => {
      const rect = el.getBoundingClientRect();
      if (
        rect.width <= 0 ||
        rect.height <= 0 ||
        rect.right <= 0 ||
        rect.bottom <= 0 ||
        rect.left >= innerWidth ||
        rect.top >= innerHeight
      )
        return false;
      for (let node = el; node; node = node.parentElement) {
        const style = getComputedStyle(node);
        if (
          style.display === "none" ||
          style.visibility === "hidden" ||
          style.opacity === "0"
        )
          return false;
      }
      return true;
    });
    if (visible.length !== 1) return { count: visible.length, rect: null };
    const { x, y, width, height } = visible[0].getBoundingClientRect();
    return { count: 1, rect: { x, y, width, height } };
  });
}

function compareLayouts(comparisons, results) {
  return comparisons.map((item) => {
    const cases = item.cases.map((name) =>
      results.find((r) => r.name === name),
    );
    const base = { ...item };
    if (cases.some((r) => !r || r.status === "blocked"))
      return {
        ...base,
        status: "blocked",
        reason: "A comparison case was not measured",
      };
    if (new Set(cases.map((r) => r.documentLanguage)).size !== 1)
      return {
        ...base,
        status: "blocked",
        reason: "Compared pages have different document languages",
      };
    const measurements = cases.map((r) => ({
      name: r.name,
      ...r.landmarks.find((m) => m.selector === item.selector),
    }));
    if (measurements.some((m) => m.count !== 1 || !m.rect))
      return {
        ...base,
        measurements,
        status: "needs-work",
        reason: "Each case must have exactly one visible landmark",
      };
    const deltas = Object.fromEntries(
      item.properties.map((property) => {
        const values = measurements.map((m) => m.rect[property]);
        return [property, Math.max(...values) - Math.min(...values)];
      }),
    );
    return {
      ...base,
      measurements,
      deltas,
      status: Object.values(deltas).some((delta) => delta > item.tolerance)
        ? "needs-work"
        : "automated-checks-passed",
    };
  });
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
  knownKeys(
    config,
    ["authority", "baseURL", "rules", "cases", "layoutComparisons"],
    "config",
  );
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
  const rules = config.rules === undefined ? {} : config.rules;
  validateRules(rules);
  for (const entry of config.cases) {
    knownKeys(
      entry,
      [
        "name",
        "path",
        "viewport",
        "touch",
        "colorScheme",
        "locale",
        "readySelector",
      ],
      "case",
    );
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
    knownKeys(entry.viewport, ["width", "height"], "viewport");
    if (entry.touch !== undefined && typeof entry.touch !== "boolean")
      throw new CheckError("Case touch must be boolean");
    if (entry.locale !== undefined) {
      try {
        if (typeof entry.locale !== "string" || !entry.locale.trim())
          throw new Error();
        Intl.getCanonicalLocales(entry.locale);
      } catch {
        throw new CheckError("Case locale must be a valid language tag");
      }
    }
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
  const comparisons =
    config.layoutComparisons === undefined ? [] : config.layoutComparisons;
  validateComparisons(comparisons, config.cases);
  const browser = await chromium.launch({
    ignoreDefaultArgs: ["--hide-scrollbars"],
  });
  const results = [];
  try {
    for (const entry of config.cases) {
      const url = new URL(entry.path, base);
      const context = await browser.newContext({
        viewport: entry.viewport,
        hasTouch: !!entry.touch,
        isMobile: !!entry.touch,
        colorScheme: entry.colorScheme || "dark",
        locale: entry.locale || "en-US",
        reducedMotion: "reduce",
      });
      const caseInfo = {
        name: entry.name,
        path: entry.path,
        colorScheme: entry.colorScheme || "dark",
        locale: entry.locale || "en-US",
        touch: !!entry.touch,
        viewportConfig: entry.viewport,
      };
      let originError, page, recordDestination;
      let navigationCount = 0;
      let auditNavigationCount = 0;
      try {
        page = await context.newPage();
        recordDestination = () => {
          const destination = new URL(page.url());
          caseInfo.finalURL = destination.origin + destination.pathname;
          if (
            destination.origin !== base.origin ||
            destination.username ||
            destination.password
          )
            originError = new CheckError(
              "Final page must remain on the preview origin without embedded credentials",
            );
        };
        // Keep departures sticky even if the page later returns to the preview.
        page.on("framenavigated", (frame) => {
          if (frame === page.mainFrame()) {
            navigationCount++;
            recordDestination();
          }
        });
        const checkDestination = () => {
          recordDestination();
          if (originError) throw originError;
        };
        const response = await page.goto(url.href, {
          waitUntil: "domcontentloaded",
          timeout: 20000,
        });
        if (!response || !response.ok())
          throw new CheckError("Preview returned a failed HTTP response");
        checkDestination();
        if (entry.readySelector)
          await page
            .locator(entry.readySelector)
            .waitFor({ state: "visible", timeout: 20000 });
        checkDestination();
        auditNavigationCount = navigationCount;
        const result = await auditPage(page, rules, AxeBuilder);
        checkDestination();
        const selectors = [
          ...new Set(
            comparisons
              .filter((c) => c.cases.includes(entry.name))
              .map((c) => c.selector),
          ),
        ];
        const landmarks = [];
        for (const selector of selectors)
          landmarks.push({
            selector,
            ...(await measureLandmark(page, selector)),
          });
        checkDestination();
        results.push({ ...caseInfo, ...result, landmarks });
      } catch (e) {
        if (page && /Execution context was destroyed|Cannot find context with specified id/.test(String(e.message))) {
          // Evaluation can fail just before the navigation event is delivered.
          // Bound diagnostic recovery; never rerun an audit on the destination.
          if (navigationCount === auditNavigationCount) {
            await page.waitForEvent("framenavigated", {
              predicate: (frame) => frame === page.mainFrame(),
              timeout: 1000,
            }).catch(() => {});
          }
          recordDestination();
          caseInfo.finalURLStatus = navigationCount > auditNavigationCount
            ? "committed" : "last-observed";
          e = new CheckError("Navigation interrupted the audit; finalURL is the last observed destination");
        }
        results.push({
          ...caseInfo,
          status: "blocked",
          reason: "Page preparation or audit failed",
          detail: safeError(originError || e),
        });
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
  const layoutComparisons = compareLayouts(comparisons, results);
  const status =
    ["blocked", "needs-work", "needs-review"].find((value) =>
      [...results, ...layoutComparisons].some((r) => r.status === value),
    ) || "automated-checks-passed";
  const report = {
    status,
    checker,
    checkedAt: new Date().toISOString(),
    authority: config.authority,
    results,
    layoutComparisons,
    scrollbarMode: "native; Playwright hide-scrollbars argument removed",
    scope:
      "Isolated browser; only configured initial states, reduced motion enabled; no mutation flows run.",
  };
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
  console.log(
    JSON.stringify({
      report: output,
      status,
      statuses: results.map((r) => ({ name: r.name, status: r.status })),
    }),
  );
  process.exitCode = status === "automated-checks-passed" ? 0 : 1;
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
              checker,
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
