import { checkConsumerBrowser } from "./check-consumer-browser";
import { checkFrameConsumer } from "./check-frame-consumer";
import { buildChromeFixtures, chromeOutput } from "./build-chrome-fixtures";
import { assertConsumerVersion } from "./consumer-version";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));
for (const source of ["examples/react", "scripts/fixtures/next"]) {
  assertConsumerVersion(JSON.parse(readFileSync(join(source, "package.json"), "utf8")), version, source);
}

const dir = mkdtempSync(join(tmpdir(), "naeil-clean-consumers-"));
const env = { ...process.env, NEXT_TELEMETRY_DISABLED: "1" };
function run(cwd: string, command: string, args: string[]) {
  execFileSync(command, args, { cwd, env, stdio: "inherit" });
}
function fixture(name: string, source: string, tarball: string) {
  const cwd = join(dir, name);
  cpSync(source, cwd, {
    recursive: true,
    filter: (path) =>
      !/(?:^|\/)(?:node_modules|dist|\.next)(?:\/|$)/.test(path) &&
      !path.endsWith(".tsbuildinfo"),
  });
  const pkg = JSON.parse(readFileSync(join(cwd, "package.json"), "utf8"));
  pkg.dependencies["@naeil/ui"] = `file:${tarball}`;
  writeFileSync(join(cwd, "package.json"), JSON.stringify(pkg, null, 2));
  // No repository node_modules symlinks, ambient Next types, or website credentials.
  run(cwd, "npm", [
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    "--package-lock=false",
  ]);
  return cwd;
}
function recordBuild(name: string, cwd: string, tarball: string) {
  const output = process.env.NAEIL_UI_CONSUMER_EVIDENCE;
  if (!output) return;
  mkdirSync(output, { recursive: true });
  const next = existsSync(join(cwd, ".next/BUILD_ID"));
  const files = next ? [".next/BUILD_ID", ".next/server/app/header.html", ".next/server/app/index.html", ...(existsSync(join(cwd, ".next/static/css")) ? readdirSync(join(cwd, ".next/static/css")).map(file => `.next/static/css/${file}`) : [])]
    : readdirSync(join(cwd, "dist/assets")).filter(file => /\.(css|js|woff2)$/.test(file)).map(file => `dist/assets/${file}`);
  if (!next && existsSync(join(cwd, "frame-dist/assets"))) files.push(...readdirSync(join(cwd, "frame-dist/assets")).filter(file => /\.(css|js|woff2)$/.test(file)).map(file => `frame-dist/assets/${file}`));
  const consumerRequire = createRequire(join(cwd, "package.json"));
  const radixRequire = createRequire(consumerRequire.resolve("radix-ui"));
  const dialogRequire = createRequire(radixRequire.resolve("@radix-ui/react-dialog"));
  const removeRequire = createRequire(dialogRequire.resolve("react-remove-scroll"));
  const hash = (file: string) => createHash("sha256").update(readFileSync(file)).digest("hex");
  writeFileSync(join(output, `${name}.json`), JSON.stringify({
    source: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    archiveSha256: hash(tarball), node: process.version,
    buildId: next ? readFileSync(join(cwd, ".next/BUILD_ID"), "utf8").trim() : "Vite content-addressed assets below",
    packages: Object.fromEntries(["@naeil/ui", "react", "react-dom", "radix-ui", ...(next ? ["next", "next-intl"] : [])].map(pkg => [pkg, JSON.parse(readFileSync(join(cwd, "node_modules", pkg, "package.json"), "utf8")).version])),
    lockDependencies: { removeScroll: dialogRequire("react-remove-scroll/package.json").version, removeScrollBar: removeRequire("react-remove-scroll-bar/package.json").version },
    files: Object.fromEntries(files.map(file => [file, hash(join(cwd, file))])),
    svgIds: next ? [...readFileSync(join(cwd, ".next/server/app/header.html"), "utf8").matchAll(/(?:id|clip-path)="(naeil-[^"]+|url\(#naeil-[^"]+)"/g)].map(match => match[1]) : undefined,
  }, null, 2));
}

// Build in each independently installed consumer, using that consumer's toolchain.
function prepareFrameConsumer(cwd: string, framework: "react" | "next", css: "globals" | "split") {
  const base = framework === "react" ? "src" : "app/frame";
  mkdirSync(join(cwd, base), { recursive: true });
  const imports = css === "globals" ? '@import "@naeil/ui/globals.css";'
    : '@import "tailwindcss"; @import "tw-animate-css"; @import "@naeil/ui/theme.css"; @import "@naeil/ui/components.css"; @custom-variant dark (&:is(.dark *)); @layer base { body { @apply bg-background text-foreground font-sans text-base leading-normal antialiased; } :lang(ja) { font-family: "Noto Sans JP", var(--font-sans); } }';
  writeFileSync(join(cwd, base, "frame.css"), `${imports}\n@source "${join(cwd, "node_modules/@naeil/ui/dist")}";`);
  const fonts = ['import "pretendard/dist/web/variable/pretendardvariable.css";', ...[400, 500, 600].map(weight => `import "@fontsource/noto-sans-jp/${weight}.css";`)].join("\n");
  writeFileSync(join(cwd, base, "frame-app.tsx"), `"use client";\n${fonts}\nimport "./frame.css";\n${readFileSync("scripts/fixtures/chrome/app.tsx", "utf8")}`);
  if (framework === "react") {
    writeFileSync(join(cwd, "frame.html"), '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><script>if(new URLSearchParams(location.search).has("optout"))document.documentElement.setAttribute("data-naeil-scrollbar-gutter","auto")</script></head><body><div id="root"></div><script type="module" src="/src/frame-app.tsx"></script></body></html>');
    writeFileSync(join(cwd, "frame.vite.config.mjs"), 'import {mergeConfig} from "vite"; import base from "./vite.config.mjs"; export default mergeConfig(base,{build:{outDir:"frame-dist",rollupOptions:{input:"frame.html"}}});');
  } else {
    writeFileSync(join(cwd, base, "page.tsx"), '"use client"; import {useEffect} from "react"; export default function Frame(){useEffect(()=>{void import("./frame-app")},[]);return <div id="root"/>}');
    writeFileSync(join(cwd, "postcss.config.mjs"), 'export default {plugins:{"@tailwindcss/postcss":{}}};');
  }
}
try {
  const packed = JSON.parse(
    execFileSync(
      "npm",
      ["pack", "--ignore-scripts", "--json", "--pack-destination", dir],
      { encoding: "utf8" },
    ),
  )[0];
  const tarball = join(dir, packed.filename);
  const archiveSha256 = createHash("sha256").update(readFileSync(tarball)).digest("hex");
  console.log(`Packed archive SHA-256: ${archiveSha256}`);
  const expectedArchiveSha256 = process.env.NAEIL_UI_EXPECTED_ARCHIVE_SHA256;
  if (expectedArchiveSha256 !== undefined) {
    assert.match(expectedArchiveSha256, /^[0-9a-f]{64}$/, "NAEIL_UI_EXPECTED_ARCHIVE_SHA256 must be a full lowercase SHA-256 digest");
    assert.equal(archiveSha256, expectedArchiveSha256, "Packed archive SHA-256 does not match the expected candidate");
  }
  const core = fixture("react", resolve("examples/react"), tarball);
  for (const name of [
    "next",
    "next-intl",
    "@supabase/ssr",
    "@supabase/supabase-js",
    "@react-three/fiber",
    "three",
    "@next/mdx",
    "gray-matter",
  ])
    assert(
      !existsSync(join(core, "node_modules", name)),
      `Unexpected React consumer dependency: ${name}`,
    );
  const corePaths = [
    "avatar",
    "badge",
    "button",
    "card",
    "checkbox",
    "dialog",
    "dropdown-menu",
    "input",
    "select",
    "sonner",
    "switch",
    "tabs",
    "textarea",
    "navigation",
    "site-footer",
  ].map((name) => `components/ui/${name}`);
  corePaths.push(
    "naeil-header",
    "naeil-footer",
    "release",
    "components/ui/index",
    "components/typography",
    "components/logo",
    "components/theme-provider",
    "components/theme-toggle",
    "components/theme-toggle-icon",
    "components/locale-switcher",
    "lib/utils",
    "i18n/config",
  );
  const imports = corePaths
    .map((path, index) => `import * as deep${index} from '@naeil/ui/${path}';`)
    .join("\n");
  writeFileSync(
    join(core, "src/packed-contract.tsx"),
    `${imports}
import * as ui from '@naeil/ui/ui';
import { NaeilHeader, NaeilHeaderAccountControl } from '@naeil/ui/naeil-header';
import { NaeilFooter } from '@naeil/ui/naeil-footer';
import { uiRelease } from '@naeil/ui/release';
import { cn } from '@naeil/ui/utils';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
export const footer = renderToStaticMarkup(createElement(NaeilFooter, {locale: 'ja', variant: 'compact'}));
export const release = uiRelease;
export const header = renderToStaticMarkup(createElement(NaeilHeader, { locale: 'ja', authSlot: createElement(NaeilHeaderAccountControl, {locale: 'ja', account: {status: 'signed-in', onLogout: () => {}}}) }));
export const home = renderToStaticMarkup(createElement(NaeilHeader, { locale: 'ko', showProjects: false, showBlog: false, appNavigation: [{id:'ai',label:'AI',items:[{id:'keys',label:'API keys',href:'/keys'}]},{id:'console',label:'Console',href:'/console'}], brandSuffix:'Home', brandLinkProps:{'aria-label':'Naeil Home'}, statusSlot:createElement('span', {'data-home-status':true}, 'Ready'), mobileOpen:false, onMobileOpenChange:()=>{} }));
export const html = renderToStaticMarkup(createElement(ui.Button, { className: 'h-8', 'aria-busy': true }, 'Consumer action'));
export const valid = [${corePaths.map((_, index) => `deep${index}`).join(", ")}].every(module => Object.keys(module).length > 0) && cn('p-6', 'p-2') === 'p-2' && !!ui.Select && !!ui.Switch && !!ui.Checkbox && !!ui.Tabs && !!ui.Textarea;
`,
  );
  run(core, "npm", ["run", "build"]);
  run(core, join(core, "node_modules/.bin/esbuild"), [
    "src/packed-contract.tsx",
    "--bundle",
    "--platform=node",
    "--format=esm",
    "--packages=external",
    "--outfile=contract.mjs",
  ]);
  const result = await import(pathToFileURL(join(core, "contract.mjs")).href);
  assert.equal(result.release.version, version);
  assert.match(result.footer, /data-naeil-footer/);
  assert.match(result.footer, /https:\/\/naeil.dev\/ja\/projects/);
  assert(result.valid, "Packed React exports failed");
  assert.match(result.header, /data-naeil-header/);
  assert.match(result.header, /https:\/\/naeil.dev\/ja\/blog/);
  assert.match(result.header, /プロジェクト/);
  assert.match(result.header, /data-naeil-account-trigger/);
  assert.match(result.home, /naeil-header-brand-suffix/);
  assert.match(result.home, /aria-label="Naeil Home"/);
  assert.match(result.home, /data-home-status/);
  assert.match(result.home, /href="\/console"/);
  assert.match(result.home, /data-naeil-chrome/);
  assert.match(result.html, /Consumer action/);
  assert.match(result.html, /aria-busy="true"/);
  assert.match(result.html, /h-8/);
  const css = readdirSync(join(core, "dist/assets"))
    .filter((file) => file.endsWith(".css"))
    .map((file) => readFileSync(join(core, "dist/assets", file), "utf8"))
    .join("\n");
  assert.match(css, /\.ui-control/);
  assert.match(css, /--primary:\s*#292929/);
  assert.match(css, /\.h-8/);
  assert(!/@import\s/.test(css), "Unresolved consumer CSS import");
  console.log(
    "Clean React consumer: PASS (types, Vite production JS/CSS, SSR, deep imports; Next absent)",
  );

  await checkConsumerBrowser(core);
  recordBuild("candidate-react", core, tarball);
  for (const css of ["globals", "split"] as const) {
    prepareFrameConsumer(core, "react", css);
    run(core, join(core, "node_modules/.bin/tsc"), ["--noEmit"]);
    run(core, join(core, "node_modules/.bin/vite"), ["build", "--config", "frame.vite.config.mjs"]);
    await checkFrameConsumer(core, "react", css);
    recordBuild(`candidate-react-${css}`, core, tarball);
  }

  const next = fixture("next", resolve("scripts/fixtures/next"), tarball);
  for (const name of [
    "@supabase/ssr",
    "@supabase/supabase-js",
    "three",
    "@next/mdx",
  ])
    assert(
      !existsSync(join(next, "node_modules", name)),
      `Unexpected framework consumer dependency: ${name}`,
    );
  run(next, "npm", ["run", "build"]);
  const html = readFileSync(join(next, ".next/server/app/index.html"), "utf8");
  const { version: brandVersion } = JSON.parse(readFileSync("brand/current.json", "utf8"));
  assert(html.includes(`data-naeil-brand="${brandVersion}"`));
  assert.match(html, /data-naeil-variant="horizontal"/);
  assert.match(html, /data-naeil-variant="footer"/);
  const headerHtml = readFileSync(join(next, ".next/server/app/header.html"), "utf8");
  assert.match(headerHtml, /data-naeil-header/);
  assert.match(headerHtml, /data-naeil-account-trigger/);
  assert.match(headerHtml, /https:\/\/naeil.dev\/ja\/blog/);
  assert.match(html, /Packed Next compatibility/);
  assert.match(html, /Consumer-owned messages/);
  assert.match(html, /Consumer action/);
  assert.match(html, /Packed multiline value/);
  assert.match(html, /role="tablist"/);
  console.log(
    "Clean Next consumer: PASS (production build, types and prerendered observed deep/root imports)",
  );
  recordBuild("candidate-next", next, tarball);
  for (const css of ["globals", "split"] as const) {
    prepareFrameConsumer(next, "next", css);
    run(next, "npm", ["run", "build"]);
    await checkFrameConsumer(next, "next", css);
    recordBuild(`candidate-next-${css}`, next, tarball);
  }
  if (process.env.NAEIL_UI_BASELINE_CONSUMERS === "1") {
    // Use the existing fixtures unchanged for B1, rather than inventing a
    // second compatibility app. buildChromeFixtures verifies the pinned SRI.
    await buildChromeFixtures();
    const baselineArchive = join(chromeOutput, "baseline/ui-0.7.2.tgz");
    const baselineReact = fixture("react-baseline", resolve("examples/react"), baselineArchive);
    run(baselineReact, "npm", ["run", "build"]);
    await checkConsumerBrowser(baselineReact);
    recordBuild("baseline-react", baselineReact, baselineArchive);
    const baselineNext = fixture("next-baseline", resolve("scripts/fixtures/next"), baselineArchive);
    run(baselineNext, "npm", ["run", "build"]);
    recordBuild("baseline-next", baselineNext, baselineArchive);
    const baselineHeader = readFileSync(join(baselineNext, ".next/server/app/header.html"), "utf8");
    const normalize = (html: string) => html.match(/<header\b[\s\S]*?<\/header>/)![0]
      .replace(/\s(?:data-naeil-chrome|lang|data-naeil-ui-version)="[^"]*"/g, "")
      .replace(/radix-(?:_r_[\w]+_|_R_[\w]+_)/g, "GENERATED_ID");
    assert.equal(normalize(headerHtml), normalize(baselineHeader), "Next packed header DOM differs from B1 after contract normalization");
    console.log("B1 React/Next registry-archive fixtures: PASS (clean production builds, React browser, normalized Next header DOM; paired geometry is in e2e/chrome-pairs.spec.ts)");
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
