import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { fixtureDirectory } from "./chrome-fixture-config";

const require = createRequire(import.meta.url);
const { build } = createRequire(require.resolve("tsup"))("esbuild");
const postcss = createRequire(require.resolve("@tailwindcss/postcss"))("postcss");
const tailwind = require("@tailwindcss/postcss");
export const chromeOutput = resolve(fixtureDirectory);
export async function buildChromeFixtures(candidate = process.env.NAEIL_UI_CHROME_PACKAGE) {
  const baseline = join(chromeOutput, "baseline");
  mkdirSync(baseline, { recursive: true });
  const archive = join(baseline, "ui-0.7.2.tgz");
  if (!existsSync(archive)) {
    const response = await fetch("https://registry.npmjs.org/@naeil/ui/-/ui-0.7.2.tgz");
    assert(response.ok); writeFileSync(archive, Buffer.from(await response.arrayBuffer()));
  }
  assert.equal(createHash("sha512").update(readFileSync(archive)).digest("base64"), "QlFPjSZdBIDqVxRy930RlmNyztQG0SzvkOp4E64Sw950mNtH1XlyPXPh/4PJ8p4ki9CpFREbglyB5DJOEg1C4w==");
  execFileSync("tar", ["-xzf", archive, "-C", baseline]);
  const baseline08 = join(chromeOutput, "baseline08");
  mkdirSync(baseline08, { recursive: true });
  const archive08 = join(baseline08, "ui-0.8.0.tgz");
  if (!existsSync(archive08)) {
    const response = await fetch("https://registry.npmjs.org/@naeil/ui/-/ui-0.8.0.tgz");
    assert(response.ok); writeFileSync(archive08, Buffer.from(await response.arrayBuffer()));
  }
  assert.equal(createHash("sha256").update(readFileSync(archive08)).digest("hex"), "6feb5a8cd50265ace584a0855432683b4127119377e08235282eaebd27081084");
  execFileSync("tar", ["-xzf", archive08, "-C", baseline08]);
  // Separate comparison adjustment; neither extracted reference package is edited.
  const framePolicy = readFileSync(resolve(candidate || process.cwd(), "src/styles/components.css"), "utf8").split("@layer components")[0];
  writeFileSync(join(chromeOutput, "frame-policy.css"), framePolicy);
  for (const [name, root] of [["baseline", join(baseline, "package")], ["baseline08", join(baseline08, "package")], ["candidate", candidate || process.cwd()]] as const) {
    const output = join(chromeOutput, name); mkdirSync(output, { recursive: true });
    const source = !candidate && name === "candidate";
    const bundle = await build({ entryPoints: ["scripts/fixtures/chrome/app.tsx"], bundle: true, write: false, format: "iife", platform: "browser", define: { "process.env.NODE_ENV": '"production"' },
      nodePaths: [resolve("node_modules")],
      alias: Object.fromEntries(["naeil-header", "naeil-footer", "ui"].map(entry => [`@naeil/ui/${entry}`, resolve(root, source ? `src/components/${entry === "ui" ? "ui/index.ts" : `${entry}.tsx`}` : `dist/components/${entry === "ui" ? "ui/index" : entry}.js`)])),
    });
    writeFileSync(join(output, "app.js"), bundle.outputFiles[0].contents);
    for (const path of ["globals", "split"]) for (const hostile of [false, true]) {
      // An extracted archive has no node_modules. Resolve build dependencies
      // from this checker, while reading both public CSS paths from the archive.
      const dependencies = `@import "${resolve("node_modules/tailwindcss/index.css")}"; @import "${resolve("node_modules/tw-animate-css/dist/tw-animate.css")}";`;
      const imports = path === "globals" ? readFileSync(resolve(root, "src/styles/globals.css"), "utf8")
        .replace('@import "tailwindcss";', dependencies).replace('@import "tw-animate-css";', "")
        .replace('"./theme.css"', JSON.stringify(resolve(root, "src/styles/theme.css"))).replace('"./components.css"', JSON.stringify(resolve(root, "src/styles/components.css")))
        : `${dependencies} @import "${resolve(root, "src/styles/theme.css")}"; @import "${resolve(root, "src/styles/components.css")}"; @custom-variant dark (&:is(.dark *)); @layer base { * { @apply border-border; } body { @apply bg-background text-foreground font-sans text-base leading-normal antialiased; } :lang(ja) { font-family: "Noto Sans JP", var(--font-sans); } }`;
      const css = await postcss([tailwind()]).process(`${imports}\n@source "${resolve(root, source ? "src" : "dist")}";\n${hostile ? readFileSync("scripts/fixtures/chrome/host.css", "utf8") : ""}`, { from: resolve("scripts/chrome-fixture.css") });
      writeFileSync(join(output, `${path}${hostile ? "-hostile" : ""}.css`), css.css);
      if (!hostile) {
        writeFileSync(join(output, `${path}-no-correction.css`), css.css.replaceAll("@supports (scrollbar-gutter: stable)", "@supports (naeil-frame-unsupported: true)"));
        // Branch fixture only, not a claim about an actual unsupported engine.
        writeFileSync(join(output, `${path}-guard-false.css`), css.css.replaceAll("@supports (scrollbar-gutter: stable)", "@supports (naeil-frame-unsupported: true)").replaceAll("scrollbar-gutter: stable", "scrollbar-gutter: auto"));
      }
    }
    const tokens = await postcss([tailwind()]).process(`@import "${resolve("node_modules/tailwindcss/index.css")}"; @import "${resolve(root, "src/styles/theme.css")}";`, { from: resolve("scripts/chrome-fixture.css") });
    writeFileSync(join(output, "theme-only.css"), tokens.css);
    writeFileSync(join(output, "js-only.css"), "body { margin: 0; }");
    writeFileSync(join(output, "index.html"), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/fonts.css"><script>const q=new URLSearchParams(location.search);if(q.has('optout'))document.documentElement.setAttribute('data-naeil-scrollbar-gutter','auto');document.write('<link rel="stylesheet" href="'+(q.get('css')||'globals')+(q.has('hostile')?'-hostile':'')+'.css">')${name !== "candidate" ? ";document.write('<link rel=\"stylesheet\" href=\"/frame-policy.css\">')" : ""}</script></head><body><div id="root"></div><script src="app.js"></script></body></html>`);
  }
  const fontRoot = join(chromeOutput, "fonts"); mkdirSync(fontRoot, { recursive: true });
  cpSync("node_modules/pretendard/dist/web/variable/woff2/PretendardVariable.woff2", join(fontRoot, "PretendardVariable.woff2"));
  cpSync("node_modules/@fontsource/noto-sans-jp/files", join(fontRoot, "jp"), { recursive: true });
  const japanese = [400, 500, 600].map(weight => readFileSync(`node_modules/@fontsource/noto-sans-jp/${weight}.css`, "utf8").replaceAll("./files/", "/fonts/jp/")).join("\n");
  writeFileSync(join(chromeOutput, "fonts.css"), `@font-face{font-family:'Pretendard Variable';font-weight:100 900;src:url('/fonts/PretendardVariable.woff2') format('woff2')}\n${japanese}`);
  const hash = (file: string) => createHash("sha256").update(readFileSync(file)).digest("hex");
  const fontPaths = ["/fonts/PretendardVariable.woff2", ...[...japanese.matchAll(/url\(([^)]+\.woff2)\)/g)].map(match => match[1])];
  writeFileSync(join(chromeOutput, "identity.json"), JSON.stringify({
    candidate: candidate || "source", source: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(), baselineSha256: hash(archive),
    archiveSha256: process.env.NAEIL_UI_EXPECTED_ARCHIVE_SHA256 || null,
    baseline08Sha256: hash(archive08), comparisonPolicySha256: hash(join(chromeOutput, "frame-policy.css")),
    fontFiles: Object.fromEntries(fontPaths.map(file => [file, hash(join(chromeOutput, file))])),
    fixtureFiles: Object.fromEntries(["scripts/fixtures/chrome/app.tsx", "scripts/fixtures/chrome/host.css"].map(file => [file, hash(file)])),
    compiledFiles: Object.fromEntries(["candidate", "baseline", "baseline08"].flatMap(name => readdirSync(join(chromeOutput, name)).filter(file => /\.(css|js|html)$/.test(file)).map(file => [`${name}/${file}`, hash(join(chromeOutput, name, file))]))),
  }, null, 2));
}
if (process.argv[1]?.endsWith("build-chrome-fixtures.ts")) await buildChromeFixtures();
