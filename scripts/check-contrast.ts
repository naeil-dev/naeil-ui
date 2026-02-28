/**
 * WCAG 2.1 contrast ratio checker for naeil-ui design tokens.
 *
 * Parses dist/theme.css to extract OKLCH color values from :root (light)
 * and .dark blocks, converts them to sRGB, and checks contrast ratios.
 *
 * Usage: pnpm check:contrast
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// OKLCH → sRGB conversion
// ---------------------------------------------------------------------------

/** Convert OKLCH to OKLab */
function oklchToOklab(l: number, c: number, h: number): [number, number, number] {
  const hRad = (h * Math.PI) / 180;
  return [l, c * Math.cos(hRad), c * Math.sin(hRad)];
}

/** Convert OKLab to linear sRGB */
function oklabToLinearSrgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  return [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
}

/** Linear sRGB to sRGB (gamma encode) */
function linearToSrgb(c: number): number {
  if (c <= 0.0031308) return 12.92 * c;
  return 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

/** Clamp to [0,1] */
function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

/** Parse an OKLCH value string → [r, g, b] in 0-255, plus alpha */
function parseOklch(value: string): { r: number; g: number; b: number; a: number } | null {
  // Match oklch(L C H) or oklch(L C H / A)
  const m = value.match(
    /oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)/,
  );
  if (!m) return null;

  const L = parseFloat(m[1]);
  const C = parseFloat(m[2]);
  const H = parseFloat(m[3]);
  let alpha = 1;
  if (m[4]) {
    alpha = m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
  }

  const [labL, labA, labB] = oklchToOklab(L, C, H);
  const [lr, lg, lb] = oklabToLinearSrgb(labL, labA, labB);

  return {
    r: Math.round(clamp01(linearToSrgb(lr)) * 255),
    g: Math.round(clamp01(linearToSrgb(lg)) * 255),
    b: Math.round(clamp01(linearToSrgb(lb)) * 255),
    a: alpha,
  };
}

// ---------------------------------------------------------------------------
// Relative luminance & contrast ratio (WCAG 2.1)
// ---------------------------------------------------------------------------

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r / 255, g / 255, b / 255].map((c) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4),
  );
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Composite a semi-transparent foreground color over an opaque background.
 * Both colors as {r, g, b, a} where rgb are 0-255 and a is 0-1.
 */
function compositeOver(
  fg: { r: number; g: number; b: number; a: number },
  bg: { r: number; g: number; b: number; a: number },
): { r: number; g: number; b: number; a: number } {
  const a = fg.a;
  return {
    r: Math.round(fg.r * a + bg.r * (1 - a)),
    g: Math.round(fg.g * a + bg.g * (1 - a)),
    b: Math.round(fg.b * a + bg.b * (1 - a)),
    a: 1,
  };
}

function contrastRatio(
  c1: { r: number; g: number; b: number; a: number },
  c2: { r: number; g: number; b: number; a: number },
  bgForComposite?: { r: number; g: number; b: number; a: number },
): number {
  // If either color has alpha < 1, composite over background
  let effective1 = c1;
  let effective2 = c2;

  if (bgForComposite) {
    if (c1.a < 1) effective1 = compositeOver(c1, bgForComposite);
    if (c2.a < 1) effective2 = compositeOver(c2, bgForComposite);
  }

  const l1 = relativeLuminance(effective1.r, effective1.g, effective1.b);
  const l2 = relativeLuminance(effective2.r, effective2.g, effective2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ---------------------------------------------------------------------------
// CSS Parser
// ---------------------------------------------------------------------------

interface TokenMap {
  [key: string]: string;
}

function parseBlock(css: string, selector: string): TokenMap {
  const tokens: TokenMap = {};

  // Handle both `.dark {` and `:root {` and `@media ... { :root:not(.light) {`
  let regex: RegExp;
  if (selector === ":root") {
    // Match the first :root { ... } that's NOT inside a @media block
    // We'll use a simpler approach: find :root { at the start of a line
    regex = /^:root\s*\{([^}]+)\}/m;
  } else if (selector === ".dark") {
    regex = /^\.dark\s*\{([^}]+)\}/m;
  } else {
    return tokens;
  }

  const match = css.match(regex);
  if (!match) return tokens;

  const block = match[1];
  const varRegex = /--([a-z0-9-]+)\s*:\s*([^;]+);/g;
  let m: RegExpExecArray | null;
  while ((m = varRegex.exec(block)) !== null) {
    tokens[m[1]] = m[2].trim();
  }

  return tokens;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const REQUIRED_CHECKS = [
  // [foreground, background, minRatio, description]
  ["foreground", "background", 4.5, "text on background"],
  ["primary-foreground", "primary", 4.5, "primary-foreground on primary"],
  ["secondary-foreground", "secondary", 4.5, "secondary-fg on secondary"],
  ["muted-foreground", "background", 4.5, "muted-foreground on background"],
  ["accent-foreground", "accent", 4.5, "accent-fg on accent"],
  ["destructive-foreground", "destructive", 4.5, "destructive-fg on destructive"],
  ["card-foreground", "card", 4.5, "card-fg on card"],
  ["popover-foreground", "popover", 4.5, "popover-fg on popover"],
] as const;

function main() {
  const cssPath = resolve(import.meta.dirname ?? __dirname, "../dist/theme.css");
  const css = readFileSync(cssPath, "utf-8");

  const lightTokens = parseBlock(css, ":root");
  const darkTokens = parseBlock(css, ".dark");

  let allPassed = true;
  const results: string[] = [];

  for (const mode of ["light", "dark"] as const) {
    const tokens = mode === "light" ? lightTokens : darkTokens;
    const bgTokens = mode === "light" ? lightTokens : darkTokens;

    results.push(`\n📋 ${mode.toUpperCase()} mode:`);

    for (const [fgName, bgName, minRatio, desc] of REQUIRED_CHECKS) {
      const fgVal = tokens[fgName];
      const bgVal = bgTokens[bgName];

      if (!fgVal || !bgVal) {
        results.push(`  ⚠️  ${desc}: missing token (fg=${fgName}: ${fgVal || "N/A"}, bg=${bgName}: ${bgVal || "N/A"})`);
        continue;
      }

      const fgColor = parseOklch(fgVal);
      const bgColor = parseOklch(bgVal);

      if (!fgColor || !bgColor) {
        results.push(`  ⚠️  ${desc}: could not parse color (fg=${fgVal}, bg=${bgVal})`);
        continue;
      }

      // For semi-transparent colors, composite over the mode's background
      const modeBg = parseOklch(bgTokens["background"] || "oklch(0 0 0)") || { r: 0, g: 0, b: 0, a: 1 };

      const ratio = contrastRatio(fgColor, bgColor, modeBg);
      const pass = ratio >= minRatio;

      if (!pass) allPassed = false;

      const icon = pass ? "✅" : "🔴";
      results.push(
        `  ${icon} ${desc}: ${ratio.toFixed(2)}:1 ${pass ? "" : `(FAIL: need ${minRatio}:1)`}`,
      );
    }
  }

  console.log("🎨 WCAG Contrast Check — naeil-ui design tokens");
  console.log("=".repeat(50));
  for (const line of results) console.log(line);
  console.log("\n" + "=".repeat(50));

  if (allPassed) {
    console.log("✅ All contrast checks passed!");
    process.exit(0);
  } else {
    console.log("🔴 Some contrast checks failed.");
    process.exit(1);
  }
}

main();
