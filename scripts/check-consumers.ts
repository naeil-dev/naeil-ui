import { conformanceFixture } from "./conformance-fixture";
import { checkConsumerBrowser } from "./check-consumer-browser";
import { checkFrameConsumer } from "./check-frame-consumer";
import { buildChromeFixtures, chromeOutput } from "./build-chrome-fixtures";
import { assertConsumerVersion } from "./consumer-version";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
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
  const files = next ? [".next/BUILD_ID", ".next/server/app/header.html", ".next/server/app/index.html", ...(existsSync(join(cwd, ".next/server/app/rsc.html")) ? [".next/server/app/rsc.html"] : []), ...(existsSync(join(cwd, ".next/static/css")) ? readdirSync(join(cwd, ".next/static/css")).map(file => `.next/static/css/${file}`) : [])]
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
    : '@import "tailwindcss"; @import "@naeil/ui/theme.css"; @import "@naeil/ui/components.css"; @custom-variant dark { &:where(.dark, .dark *) { @slot; } @media (prefers-color-scheme: dark) { &:where(:root:not(.light), :root:not(.light) *) { @slot; } } } @layer base { body { @apply bg-background text-foreground font-sans text-base leading-normal antialiased; } :lang(ja) { font-family: "Noto Sans JP", var(--font-sans); } }';
  const fonts = ['import "pretendard/dist/web/variable/pretendardvariable.css";', ...[400, 500, 600].map(weight => `import "@fontsource/noto-sans-jp/${weight}.css";`)].join("\n");
  const app = readFileSync("scripts/fixtures/chrome/app.tsx", "utf8");
  for (const control of ["", "-theme", "-js"]) {
    const folder = framework === "react" ? "src" : `app/frame${control}`;
    mkdirSync(join(cwd, folder), { recursive: true });
    const style = control === "-theme" ? '@import "@naeil/ui/theme.css"; body { margin: 0; }'
      : control === "-js" ? 'body { margin: 0; }' : `${imports}\n@source "${join(cwd, "node_modules/@naeil/ui/dist")}";`;
    writeFileSync(join(cwd, folder, `frame${control}.css`), style);
    writeFileSync(join(cwd, folder, `frame${control}-app.tsx`), `"use client";\n${fonts}\nimport "./frame${control}.css";\n${app}`);
    if (framework === "react") {
      writeFileSync(join(cwd, `frame${control}.html`), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><script>if(new URLSearchParams(location.search).has("optout"))document.documentElement.setAttribute("data-naeil-scrollbar-gutter","auto")</script></head><body><div id="root"></div><script type="module" src="/src/frame${control}-app.tsx"></script></body></html>`);
    } else {
      writeFileSync(join(cwd, folder, "page.tsx"), `"use client"; import {useEffect} from "react"; export default function Frame(){useEffect(()=>{void import("./frame${control}-app")},[]);return <div id="root"/>}`);
    }
  }
  if (framework === "react") {
    writeFileSync(join(cwd, "frame.vite.config.mjs"), 'import {mergeConfig} from "vite"; import base from "./vite.config.mjs"; export default mergeConfig(base,{build:{outDir:"frame-dist",rollupOptions:{input:["frame.html","frame-theme.html","frame-js.html"]}}});');
  } else {
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
    "sheet",
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
    "naeil-shell",
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
import { Sheet as DeepSheet, SheetTrigger as DeepSheetTrigger } from '@naeil/ui/components/ui/sheet';
import { NaeilHeader, NaeilHeaderAccountControl } from '@naeil/ui/naeil-header';
import { NaeilFooter } from '@naeil/ui/naeil-footer';
import { NaeilServiceShell, PageHeader, measureNaeilPage, type NaeilServiceShellProps, naeilIcons as shellIcons } from '@naeil/ui/naeil-shell';
import { uiRelease } from '@naeil/ui/release';
import { localeHref, resolveLocaleUrl, naeilDocumentTitle, naeilIcons } from '@naeil/ui/naeil-locale';
import { cn } from '@naeil/ui/utils';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
export const footer = renderToStaticMarkup(createElement(NaeilFooter, {locale: 'ja', variant: 'compact'}));
export const serviceFooter = renderToStaticMarkup(createElement(NaeilFooter as (props: {service: 'home'; locale: 'ja'; meta: string}) => ReturnType<typeof NaeilFooter>, {service: 'home', locale: 'ja', meta: 'Version 2'}));
export const title = naeilDocumentTitle('home', 'ダッシュボード');
export const shell = renderToStaticMarkup(createElement(NaeilServiceShell, {service: 'estimate', locale: 'en', mainLabel: 'Estimates', children: createElement(PageHeader, {title: 'Packed shell'})}));
const wrapperProps: NaeilServiceShellProps = {service: 'home', locale: 'en'};
export const TypedWrapper = () => <NaeilServiceShell {...wrapperProps}/>;
export const measure = measureNaeilPage;
export const icons = naeilIcons;
export const iconsParity = JSON.stringify(shellIcons) === JSON.stringify(naeilIcons);
export const release = uiRelease;
export const abstorm = {
  href: localeHref('abstorm', '/runs/example/report?tab=1#summary', 'ja'),
  protected: resolveLocaleUrl('abstorm', '/ko/new'),
  protocol: resolveLocaleUrl('abstorm', '/auth/session'),
  invalid: resolveLocaleUrl('abstorm', '/ko/auth/session'),
};
export const header = renderToStaticMarkup(createElement(NaeilHeader, { locale: 'ja', authSlot: createElement(NaeilHeaderAccountControl, {locale: 'ja', account: {status: 'signed-in', onLogout: () => {}}}) }));
export const home = renderToStaticMarkup(createElement(NaeilHeader, { locale: 'ko', showProjects: false, showBlog: false, appNavigation: [{id:'ai',label:'AI',items:[{id:'keys',label:'API keys',href:'/keys'}]},{id:'console',label:'Console',href:'/console'}], brandSuffix:'Home', brandLinkProps:{'aria-label':'Naeil Home'}, statusSlot:createElement('span', {'data-home-status':true}, 'Ready'), mobileOpen:false, onMobileOpenChange:()=>{} }));
export const html = renderToStaticMarkup(createElement(ui.Button, { className: 'h-8', 'aria-busy': true }, 'Consumer action'));
export const sheet = renderToStaticMarkup(createElement(ui.Sheet, null, createElement(ui.SheetTrigger, null, "Packed React Sheet")));
export const deepSheet = renderToStaticMarkup(createElement(DeepSheet, null, createElement(DeepSheetTrigger, null, "Packed React deep Sheet")));
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
  assert.match(result.shell, /class="ui-skip-link" href="#main"/);
  assert.match(result.shell, /id="main"/);
  assert.match(result.shell, /ui-app-frame ui-app-main/);
  assert.match(result.shell, /Packed shell/);
  assert.match(result.shell, /data-naeil-header/);
  assert.match(result.shell, /data-naeil-footer/);
  assert(result.iconsParity);
  assert.equal(typeof result.measure, "function");
  assert.equal(result.icons.brandVersion, "1.1.1");
  assert.equal(result.icons.links.length, 3);
  // Execute the installed package bin, with no repository source or runtime deps.
  for (const framework of ["next", "vite"] as const) {
    const app = join(dir, `conformance-${framework}`);
    conformanceFixture(app, framework);
    const cli = join(core, "node_modules/.bin/naeil-ui-conformance");
    const args = ["--service", "estimate", "--framework", framework, "--app", app];
    let checked = spawnSync(cli, args, { encoding: "utf8" });
    assert.equal(checked.status, 0, checked.stderr);
    writeFileSync(join(app, "violation.tsx"), '<NaeilHeader /><NaeilThemeProvider defaultTheme="light" />');
    checked = spawnSync(cli, args, { encoding: "utf8" });
    assert.equal(checked.status, 1);
    assert.match(checked.stderr, /violation.tsx:1 chrome/);
    assert.match(checked.stderr, /violation.tsx:1 theme/);
    const missingRuntime = spawnSync(cli, ["--service", "estimate", "--url", "http://127.0.0.1:1", "--routes", "/", "--app", app], {encoding: "utf8"});
    assert.equal(missingRuntime.status, 2, missingRuntime.stderr);
    assert.match(missingRuntime.stderr, /pnpm add -D @playwright\/test/);
  }
  console.log("Packed conformance bin: PASS (Next/Vite passing and failing fixtures)");
  assert.equal(result.abstorm.href, 'https://abstorm.naeil.dev/ja/runs/example/report?tab=1#summary');
  assert.equal(result.abstorm.protected.kind, 'ui');
  assert.equal(result.abstorm.protected.route.protected, true);
  assert.equal(result.abstorm.protocol.kind, 'protocol');
  assert.equal(result.abstorm.invalid.kind, 'invalid');
  assert.match(result.footer, /data-naeil-footer/);
  assert.match(result.footer, /https:\/\/naeil.dev\/ja\/projects/);
  assert.match(result.serviceFooter, /data-variant="full"/);
  assert.match(result.serviceFooter, /Version 2/);
  assert.equal(result.title, 'ダッシュボード — .naeil home');
  assert(result.valid, "Packed React exports failed");
  assert.match(result.sheet, /Packed React Sheet/);
  assert.match(result.deepSheet, /Packed React deep Sheet/);
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

  // Keep the live naeil.dev artwork check first: the later frame checks request the same image
  // headlessly many times, after which Vercel may challenge this runner (ORB-blocked image).
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
  let headerHtml = "";
  for (const bundler of ["webpack", "turbopack"] as const) {
    for (const route of ["frame", "frame-theme", "frame-js"]) rmSync(join(next, "app", route), { recursive: true, force: true });
    const suffix = bundler === "webpack" ? "" : "-turbopack";
    function buildNext() {
      // Clean output prevents a prior compiler's prerender from satisfying this gate.
      rmSync(join(next, ".next"), { recursive: true, force: true });
      const started = performance.now();
      run(next, "npm", ["run", bundler === "webpack" ? "build" : "build:turbopack"]);
      const rsc = readFileSync(join(next, ".next/server/app/rsc.html"), "utf8");
      assert.match(rsc, /data-rsc-cn="p-2"/);
      assert.match(rsc, /data-rsc-deep-cn="m-2"/);
      assert.match(rsc, /data-rsc-title="見積 — \.naeil estimate"/);
      assert.match(rsc, /data-rsc-icons="1.1.1"/);
      assert.match(rsc, /data-rsc-icon-href="\/icon.svg"/);
      assert.match(rsc, /class="ui-skip-link" href="#main"/);
      assert.match(rsc, /ui-app-frame ui-app-main/);
      assert.match(rsc, /data-naeil-footer/);
      const shell = readFileSync(join(next, ".next/server/app/shell.html"), "utf8");
      assert.match(shell, /Packed Next standalone shell/);
      assert.match(shell, /data-naeil-header/);
      assert.match(shell, /ui-app-frame ui-app-main/);
      assert.match(shell, /data-naeil-footer/);
      assert.match(rsc, /<a[^>]+class="[^"]*border-border-strong[^"]*"[^>]*>Server button variants<\/a>/);
      assert.match(rsc, /<span[^>]+class="[^"]*bg-success-bg[^"]*"[^>]*>Server badge variants<\/span>/);
      const prerender = JSON.parse(readFileSync(join(next, ".next/prerender-manifest.json"), "utf8"));
      assert(prerender.routes["/rsc"], "RSC helper page must be statically prerendered");
      console.log(`Clean Next ${bundler}: RSC prerender PASS (${((performance.now() - started) / 1000).toFixed(1)}s)`);
    }
    buildNext();
    const html = readFileSync(join(next, ".next/server/app/index.html"), "utf8");
    const { version: brandVersion } = JSON.parse(readFileSync("brand/current.json", "utf8"));
    assert(html.includes(`data-naeil-brand="${brandVersion}"`));
    assert.match(html, /data-naeil-variant="horizontal"/);
    assert.match(html, /data-naeil-variant="footer"/);
    headerHtml = readFileSync(join(next, ".next/server/app/header.html"), "utf8");
    assert.match(headerHtml, /data-naeil-header/);
    assert.match(headerHtml, /data-naeil-account-trigger/);
    assert.match(headerHtml, /https:\/\/naeil.dev\/ja\/blog/);
    assert.match(html, /Packed Next compatibility/);
    assert.match(html, /Consumer-owned messages/);
    assert.match(html, /Consumer action/);
    assert.match(html, /Packed multiline value/);
    assert.match(html, /Packed Next Sheet/);
    assert.match(html, /Packed Next deep Sheet/);
    assert.match(html, /role="tablist"/);
    console.log(
      "Clean Next consumer: PASS (production build, types and prerendered observed deep/root imports)",
    );
    recordBuild(`candidate-next${suffix}`, next, tarball);
    for (const css of ["globals", "split"] as const) {
      prepareFrameConsumer(next, "next", css);
      buildNext();
      await checkFrameConsumer(next, "next", css);
      recordBuild(`candidate-next-${css}${suffix}`, next, tarball);
    }
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
    // The frozen 0.7.x baseline predates the server-safe /utils contract.
    rmSync(join(baselineNext, "app/rsc"), { recursive: true, force: true });
    rmSync(join(baselineNext, "app/shell"), { recursive: true, force: true });
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
