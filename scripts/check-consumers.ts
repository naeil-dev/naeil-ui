import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

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
try {
  const packed = JSON.parse(
    execFileSync(
      "npm",
      ["pack", "--ignore-scripts", "--json", "--pack-destination", dir],
      { encoding: "utf8" },
    ),
  )[0];
  const tarball = join(dir, packed.filename);
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
  ].map((name) => `components/ui/${name}`);
  corePaths.push(
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
import { cn } from '@naeil/ui/utils';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
export const html = renderToStaticMarkup(createElement(ui.Button, { className: 'h-8', 'aria-busy': true }, 'Consumer action'));
export const valid = [${corePaths.map((_, index) => `deep${index}`).join(", ")}].every(module => Object.keys(module).length > 0) && cn('p-6', 'p-2') === 'p-2' && !!ui.Select && !!ui.Switch && !!ui.Checkbox;
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
  assert(result.valid, "Packed React exports failed");
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
  assert.match(html, /Packed Next compatibility/);
  assert.match(html, /Consumer-owned messages/);
  assert.match(html, /Consumer action/);
  console.log(
    "Clean Next consumer: PASS (production build, types and prerendered observed deep/root imports)",
  );
} finally {
  rmSync(dir, { recursive: true, force: true });
}
