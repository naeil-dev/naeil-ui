/**
 * Style Dictionary v4 build script — DTCG tokens → CSS + TypeScript
 *
 * Uses SD v4 programmatic API with usesDtcg for W3C Design Token parsing.
 * Custom formatters output:
 *   src/styles/theme.css   — @theme inline + :root (light) + .dark
 *   dist/tokens.ts   — TypeScript constants with type helpers
 */

import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";
import StyleDictionary from "style-dictionary";
import type {
  TransformedToken,
  FormatFnArguments,
} from "style-dictionary/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get the resolved value from a token, handling SD v4's $value */
function tokenValue(token: TransformedToken): string {
  const val = token.$value ?? token.value;
  if (Array.isArray(val)) {
    return val
      .map((v: string) =>
        /^(sans-serif|serif|monospace|system-ui|ui-monospace|-apple-system)$/.test(
          v,
        )
          ? v
          : `"${v}"`,
      )
      .join(", ");
  }
  return String(val);
}

/** Check if a token path starts with a prefix */
function pathStartsWith(token: TransformedToken, ...prefix: string[]): boolean {
  return prefix.every((p, i) => token.path[i] === p);
}

/** Get the last segment of a token's path */
function tokenName(token: TransformedToken): string {
  return token.path[token.path.length - 1];
}

/** Get a dash-joined path excluding given prefix segments */
function tokenNameFrom(token: TransformedToken, from: number): string {
  return token.path.slice(from).join("-");
}

// ---------------------------------------------------------------------------
// Custom Formats
// ---------------------------------------------------------------------------

/** CSS format: @theme inline { } + :root { } + .dark { } */
function formatThemeCSS({ dictionary }: FormatFnArguments): string {
  const allTokens = dictionary.allTokens;
  const lines: string[] = ["/* Generated from src/tokens — DO NOT EDIT. */"];

  // Semantic token names that map to --color-* in @theme inline
  const semanticNames: string[] = [];
  const lightTokens = allTokens.filter((t) =>
    pathStartsWith(t, "semantic", "light"),
  );
  for (const t of lightTokens) {
    semanticNames.push(tokenNameFrom(t, 2));
  }

  // --- @theme inline ---
  lines.push("@theme inline {");

  // Color semantic vars
  for (const name of semanticNames) {
    lines.push(`  --color-${name}: var(--${name});`);
  }
  lines.push("");

  // Project accent colors (theme-independent)
  const projectTokens = allTokens.filter((t) =>
    pathStartsWith(t, "color", "project"),
  );
  for (const t of projectTokens) {
    lines.push(
      `  --color-project-${tokenName(t)}: var(--project-${tokenName(t)});`,
    );
  }
  lines.push("");

  // Font families
  const fontSans = allTokens.find((t) =>
    pathStartsWith(t, "font", "family", "sans"),
  );
  const fontMono = allTokens.find((t) =>
    pathStartsWith(t, "font", "family", "mono"),
  );
  if (fontSans) lines.push(`  --font-sans: ${tokenValue(fontSans)};`);
  if (fontMono) lines.push(`  --font-mono: ${tokenValue(fontMono)};`);
  lines.push("");

  for (const t of allTokens.filter((t) => pathStartsWith(t, "font", "size")))
    lines.push(`  --text-${tokenName(t)}: ${tokenValue(t)};`);
  for (const t of allTokens.filter((t) => pathStartsWith(t, "font", "sizeLineHeight")))
    lines.push(`  --text-${tokenName(t)}--line-height: ${tokenValue(t)};`);
  for (const t of allTokens.filter((t) => pathStartsWith(t, "font", "weight")))
    lines.push(`  --font-weight-${tokenName(t)}: ${tokenValue(t)};`);
  for (const t of allTokens.filter((t) =>
    pathStartsWith(t, "font", "lineHeight"),
  ))
    lines.push(`  --leading-${tokenName(t)}: ${tokenValue(t)};`);
  for (const t of allTokens.filter((t) => pathStartsWith(t, "shadow")))
    lines.push(`  --shadow-${tokenName(t)}: ${tokenValue(t)};`);

  // Radius
  const radiusTokens = allTokens.filter((t) => pathStartsWith(t, "radius"));
  for (const t of radiusTokens) {
    lines.push(
      `  --radius-${tokenName(t)}: var(--radius-${tokenName(t)}-value);`,
    );
  }
  lines.push("");

  // Spacing
  const spacingTokens = allTokens.filter((t) => pathStartsWith(t, "spacing"));
  for (const t of spacingTokens) {
    lines.push(
      `  --spacing-${tokenName(t)}: var(--spacing-${tokenName(t)}-value);`,
    );
  }

  lines.push("}");
  lines.push("");

  // --- :root (light mode) ---
  lines.push(":root {");
  for (const t of lightTokens) {
    const name = tokenNameFrom(t, 2);
    lines.push(`  --${name}: ${tokenValue(t)};`);
  }
  lines.push("");
  for (const t of allTokens.filter((t) => pathStartsWith(t, "ui")))
    lines.push(`  --ui-${tokenName(t)}: ${tokenValue(t)};`);
  // Project colors (same in light/dark)
  for (const t of projectTokens) {
    lines.push(`  --project-${tokenName(t)}: ${tokenValue(t)};`);
  }
  lines.push("");
  for (const t of radiusTokens) {
    lines.push(`  --radius-${tokenName(t)}-value: ${tokenValue(t)};`);
  }
  lines.push("");
  for (const t of spacingTokens) {
    lines.push(`  --spacing-${tokenName(t)}-value: ${tokenValue(t)};`);
  }
  lines.push("}");
  lines.push("");

  // --- .dark ---
  lines.push(".dark {");
  const darkTokens = allTokens.filter((t) =>
    pathStartsWith(t, "semantic", "dark"),
  );
  for (const t of darkTokens) {
    const name = tokenNameFrom(t, 2);
    lines.push(`  --${name}: ${tokenValue(t)};`);
  }
  lines.push("}");
  lines.push("");

  // --- @media (prefers-color-scheme: dark) fallback ---
  // Root .light opts out of OS dark; otherwise :root defaults to light.
  lines.push("@media (prefers-color-scheme: dark) {");
  lines.push("  :root:not(.light) {");
  for (const t of darkTokens) {
    const name = tokenNameFrom(t, 2);
    lines.push(`    --${name}: ${tokenValue(t)};`);
  }
  lines.push("  }");
  lines.push("}");
  lines.push("");

  lines.push(':root[data-ui-density="compact"] {');
  for (const name of [
    "control-height",
    "row-height",
    "panel-padding",
    "field-gap",
  ]) {
    const token = allTokens.find(
      (t) => t.path.join(".") === `ui.${name}-compact`,
    );
    if (token) lines.push(`  --ui-${name}: ${tokenValue(token)};`);
  }
  lines.push("}");
  lines.push("@media (max-width: 560px), (pointer: coarse) {");
  const rowHeight = allTokens.find((t) => t.path.join(".") === "ui.row-height");
  if (!rowHeight) throw new Error("Missing ui.row-height token");
  lines.push(
    `  :root, :root[data-ui-density="compact"] { --ui-control-height: var(--ui-touch-target); --ui-row-height: ${tokenValue(rowHeight)}; }`,
  );
  lines.push("}");
  return lines.join("\n");
}

/** Low-specificity document baseline and resolved, host-resistant chrome typography. */
function formatTypographyCSS({ dictionary }: FormatFnArguments): string {
  const value = (path: string) => {
    const token = dictionary.allTokens.find(t => t.path.join(".") === path);
    if (!token) throw new Error(`Missing typography token: ${path}`);
    return tokenValue(token);
  };
  // Canonical chrome intentionally stays in px even when the host changes rem.
  const size = (name: string) => `${parseFloat(value(`font.size.${name}`)) * 16}px`;
  const sans = value("font.family.sans"), japanese = value("font.family.japanese");
  const supportingLineHeight = `${parseFloat(size("sm")) * Number(value("font.lineHeight.normal"))}px`;
  return `/* Generated from src/tokens — DO NOT EDIT. */
@layer base {
  :where(body) {
    background: var(--background);
    color: var(--foreground);
    font-family: ${sans};
    font-size: ${value("font.size.base")};
    line-height: ${value("font.lineHeight.normal")};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  :where(:lang(ja)) {
    font-family: ${japanese};
  }
}

/* Canonical chrome owns final typography. These marker-scoped, unlayered
   rules retain the existing protection against supported hostile host rules. */
html:root [data-naeil-chrome][lang] {
  /* Keep the base :lang(ja) fallback local while slot font utilities still win. */
  --font-sans: ${sans};
  --naeil-chrome-font: ${sans};
  font-family: var(--naeil-chrome-font);
  font-size: ${size("base")};
  font-weight: ${value("font.weight.normal")};
  line-height: ${value("font.lineHeight.normal")};
  letter-spacing: normal;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
html:root [data-naeil-chrome][lang] .ui-navigation-link:not([data-app-toolbar] *):not([data-app-brand]),
html:root [data-naeil-chrome][lang] .naeil-header-login,
html:root [data-naeil-chrome][lang] .naeil-header-account-trigger,
html:root [data-naeil-chrome][lang] .ui-navigation-title,
html:root [data-naeil-chrome][lang][data-app-toolbar] > [data-slot="button"]:first-child,
html:root [data-naeil-chrome][lang][data-app-toolbar] > [data-slot="select-trigger"]:nth-child(2) {
  font-family: var(--naeil-chrome-font);
  font-size: ${size("base")};
  font-weight: ${value("font.weight.normal")};
  line-height: ${value("font.lineHeight.normal")};
  letter-spacing: normal;
}
html:root [data-naeil-chrome][lang] :is(.ui-navigation-title, .naeil-header-login) {
  font-weight: ${value("font.weight.medium")};
}
html:root [data-naeil-chrome][lang] .ui-navigation-entry[aria-current="page"] .ui-navigation-title {
  font-weight: ${value("font.weight.semibold")};
}
html:root [data-naeil-chrome][lang] :is(.ui-navigation-description, .ui-navigation-group-label, .ui-site-footer-description, .ui-site-footer-label, .ui-site-footer-link, .ui-site-footer-meta) {
  font-family: var(--naeil-chrome-font);
  font-size: ${size("sm")};
  font-weight: ${value("font.weight.normal")};
  line-height: ${value("font.lineHeight.normal")};
  letter-spacing: normal;
}
html:root [data-naeil-chrome][lang] :is(.ui-navigation-group-label, .ui-site-footer-label) {
  font-weight: ${value("font.weight.semibold")};
}
html:root [data-naeil-chrome][lang] .ui-navigation-sheet-heading > h2 {
  font-family: var(--naeil-chrome-font);
  font-size: ${size("xl")};
  font-weight: ${value("font.weight.semibold")};
  line-height: ${value("font.chrome.lineHeight.sheet")};
  letter-spacing: normal;
}
html:root [data-naeil-chrome][lang] :is([data-slot="select-item"], [data-slot="dropdown-menu-item"]) {
  font-family: var(--naeil-chrome-font);
  font-size: ${size("base")};
  font-weight: ${value("font.weight.normal")};
  line-height: ${value("font.chrome.lineHeight.menu")};
  letter-spacing: normal;
}
html:root [data-naeil-chrome][lang] [data-slot="dropdown-menu-label"] {
  font-family: var(--naeil-chrome-font);
  font-size: ${size("sm")};
  font-weight: ${value("font.weight.normal")};
  line-height: ${value("font.chrome.lineHeight.account")};
  letter-spacing: normal;
}
html:root [data-naeil-chrome][lang] [data-slot="dropdown-menu-label"] > .text-base {
  font-family: var(--naeil-chrome-font);
  font-size: ${size("base")};
  font-weight: ${value("font.weight.medium")};
  line-height: ${value("font.chrome.lineHeight.menu")};
  letter-spacing: normal;
}
html:root [data-naeil-chrome][lang] [data-slot="dropdown-menu-label"] > .text-sm {
  font-family: var(--naeil-chrome-font);
  font-size: ${size("sm")};
  font-weight: ${value("font.weight.normal")};
  line-height: ${value("font.chrome.lineHeight.account")};
  letter-spacing: normal;
}
html:root [data-naeil-chrome][lang][data-app-toolbar] > [data-slot="button"]:first-child {
  font-weight: ${value("font.weight.medium")};
  line-height: ${value("font.chrome.lineHeight.menu")};
}
html:root [data-naeil-chrome][lang]:lang(ja),
html:root [data-naeil-locale-menu][lang] :lang(ja) {
  --naeil-chrome-font: ${japanese};
  font-family: var(--naeil-chrome-font);
}

html:root [data-naeil-chrome][lang] .naeil-header-brand-suffix {
  font-family: var(--naeil-chrome-font);
  font-size: ${size("sm")};
  font-weight: ${value("font.weight.normal")};
  line-height: ${supportingLineHeight};
  letter-spacing: normal;
}
`;
}

/** Outside-React locale fallback: the package's dark palette and type tokens. */
function formatErrorStyles({ dictionary }: FormatFnArguments): string {
  const value = (path: string) => tokenValue(dictionary.allTokens.find(t => t.path.join(".") === path)!);
  const css = `html { color-scheme: dark; background: ${value("semantic.dark.background")}; color: ${value("semantic.dark.foreground")}; }
body { margin: ${value("spacing.6")}; font-family: ${value("font.family.sans")}; font-size: ${value("font.size.base")}; line-height: ${value("font.lineHeight.normal")}; }
:lang(ja) { font-family: ${value("font.family.japanese")}; }
a { color: inherit; }`;
  return `// Generated from src/tokens — DO NOT EDIT.\nexport const naeilErrorDocumentStyles = ${JSON.stringify(css)};\n`;
}

/** TypeScript format: typed constants with autocomplete support */
function formatTokensTS({ dictionary }: FormatFnArguments): string {
  const allTokens = dictionary.allTokens;
  const lines: string[] = [];

  lines.push("/**");
  lines.push(" * Auto-generated by build-tokens.ts — DO NOT EDIT");
  lines.push(" */");
  lines.push("");

  // --- Color primitives ---
  lines.push("export const color = {");
  for (const group of ["gray", "accent", "destructive"]) {
    const groupTokens = allTokens.filter(
      (t) => pathStartsWith(t, "color", group) && t.path.length === 3,
    );
    if (groupTokens.length === 0) continue;
    lines.push(`  ${group}: {`);
    for (const t of groupTokens) {
      lines.push(`    "${tokenName(t)}": "${tokenValue(t)}",`);
    }
    lines.push("  },");
  }
  // Project accent colors
  const projectTkns = allTokens.filter((t) =>
    pathStartsWith(t, "color", "project"),
  );
  if (projectTkns.length > 0) {
    lines.push("  project: {");
    for (const t of projectTkns) {
      lines.push(`    ${tokenName(t)}: "${tokenValue(t)}",`);
    }
    lines.push("  },");
  }
  const white = allTokens.find((t) => t.path.join(".") === "color.white");
  const black = allTokens.find((t) => t.path.join(".") === "color.black");
  if (white) lines.push(`  white: "${tokenValue(white)}",`);
  if (black) lines.push(`  black: "${tokenValue(black)}",`);
  lines.push("} as const;");
  lines.push("");

  // --- Font ---
  lines.push("export const font = {");
  lines.push("  family: {");
  const fontSans = allTokens.find((t) =>
    pathStartsWith(t, "font", "family", "sans"),
  );
  const fontMono = allTokens.find((t) =>
    pathStartsWith(t, "font", "family", "mono"),
  );
  if (fontSans) {
    const val = fontSans.$value ?? fontSans.value;
    lines.push(`    sans: ${JSON.stringify(val)},`);
  }
  if (fontMono) {
    const val = fontMono.$value ?? fontMono.value;
    lines.push(`    mono: ${JSON.stringify(val)},`);
  }
  lines.push("  },");

  lines.push("  size: {");
  for (const t of allTokens.filter((t) => pathStartsWith(t, "font", "size"))) {
    lines.push(`    "${tokenName(t)}": "${tokenValue(t)}",`);
  }
  lines.push("  },");

  lines.push("  weight: {");
  for (const t of allTokens.filter((t) =>
    pathStartsWith(t, "font", "weight"),
  )) {
    lines.push(`    ${tokenName(t)}: ${tokenValue(t)},`);
  }
  lines.push("  },");

  lines.push("  lineHeight: {");
  for (const t of allTokens.filter((t) =>
    pathStartsWith(t, "font", "lineHeight"),
  )) {
    lines.push(`    ${tokenName(t)}: ${tokenValue(t)},`);
  }
  lines.push("  },");
  lines.push("} as const;");
  lines.push("");

  // --- Spacing ---
  lines.push("export const spacing = {");
  for (const t of allTokens.filter((t) => pathStartsWith(t, "spacing"))) {
    lines.push(`  "${tokenName(t)}": "${tokenValue(t)}",`);
  }
  lines.push("} as const;");
  lines.push("");

  // --- Radius ---
  lines.push("export const radius = {");
  for (const t of allTokens.filter((t) => pathStartsWith(t, "radius"))) {
    lines.push(`  ${tokenName(t)}: "${tokenValue(t)}",`);
  }
  lines.push("} as const;");
  lines.push("");

  // --- Shadow ---
  lines.push("export const shadow = {");
  for (const t of allTokens.filter((t) => pathStartsWith(t, "shadow"))) {
    lines.push(`  ${tokenName(t)}: "${tokenValue(t)}",`);
  }
  lines.push("} as const;");
  lines.push("");

  // --- Semantic (light + dark) ---
  lines.push("export const semantic = {");
  lines.push("  light: {");
  for (const t of allTokens.filter((t) =>
    pathStartsWith(t, "semantic", "light"),
  )) {
    lines.push(`    "${tokenNameFrom(t, 2)}": "${tokenValue(t)}",`);
  }
  lines.push("  },");
  lines.push("  dark: {");
  for (const t of allTokens.filter((t) =>
    pathStartsWith(t, "semantic", "dark"),
  )) {
    lines.push(`    "${tokenNameFrom(t, 2)}": "${tokenValue(t)}",`);
  }
  lines.push("  },");
  lines.push("} as const;");
  lines.push("");

  // --- Type helpers ---
  lines.push("export type ColorScale = keyof typeof color.gray;");
  lines.push("export type AccentScale = keyof typeof color.accent;");
  lines.push("export type SemanticToken = keyof typeof semantic.dark;");
  lines.push("export type SpacingToken = keyof typeof spacing;");
  lines.push("export type RadiusToken = keyof typeof radius;");
  lines.push("export type FontSize = keyof typeof font.size;");
  lines.push("export type FontWeight = keyof typeof font.weight;");
  lines.push("");

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

function createDictionary() {
  // Register custom formats
  StyleDictionary.registerFormat({
    name: "custom/theme-css",
    format: formatThemeCSS,
  });

  StyleDictionary.registerFormat({
    name: "custom/tokens-ts",
    format: formatTokensTS,
  });

  StyleDictionary.registerFormat({ name: "custom/typography-css", format: formatTypographyCSS });
  StyleDictionary.registerFormat({ name: "custom/error-styles", format: formatErrorStyles });

  return new StyleDictionary({
    source: ["src/tokens/*.json"],
    usesDtcg: true,
    log: { verbosity: "verbose" },
    platforms: {
      css: {
        transformGroup: "css",
        buildPath: "src/styles/",
        files: [
          {
            destination: "theme.css",
            format: "custom/theme-css",
          },
          { destination: "typography.css", format: "custom/typography-css" },
          { destination: "../naeil-locale/error-style.generated.ts", format: "custom/error-styles" },
        ],
      },
      ts: {
        transformGroup: "js",
        buildPath: "dist/",
        files: [
          {
            destination: "tokens.ts",
            format: "custom/tokens-ts",
          },
        ],
      },
    },
  });
}

/** Format in memory: never writes the committed CSS or dist artifacts. */
export async function generateThemeCSS(): Promise<string> {
  const files = await createDictionary().formatPlatform("css");
  return String(files[0].output);
}

export async function generateTypographyCSS(): Promise<string> {
  const files = await createDictionary().formatPlatform("css");
  return String(files[1].output);
}

async function main() {
  await createDictionary().buildAllPlatforms();
  console.log("\n🎨 Token build complete!");
}

// Compare real paths: a symlinked checkout must not turn the generator into a silent no-op.
if (process.argv[1] && realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1])) {
  main().catch((err) => {
    console.error("❌ Build failed:", err);
    process.exit(1);
  });
}
