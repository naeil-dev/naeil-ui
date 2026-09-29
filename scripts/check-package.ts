import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "tsup";

const dir = mkdtempSync(join(tmpdir(), "naeil-package-"));
try {
  const packed = JSON.parse(
    execFileSync(
      "npm",
      ["pack", "--ignore-scripts", "--json", "--pack-destination", dir],
      { encoding: "utf8" },
    ),
  )[0];
  execFileSync("tar", ["-xzf", join(dir, packed.filename), "-C", dir]);
  const root = join(dir, "package");
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const targets = (value: unknown): string[] =>
    typeof value === "string"
      ? [value]
      : Object.values(value as Record<string, unknown>).flatMap(targets);
  for (const [name, value] of Object.entries(pkg.exports)) {
    if (!name.includes("*"))
      for (const target of targets(value))
        assert(
          existsSync(join(root, target)),
          `Missing packed export ${name}: ${target}`,
        );
  }
  for (const [name, file] of [
    ["components", "ui/select"],
    ["components", "typography"],
    ["lib", "utils"],
    ["i18n", "config"],
  ]) {
    const actual = file;
    for (const target of targets(pkg.exports[`./${name}/*`]))
      assert(
        existsSync(join(root, target.replace("*", actual))),
        `Missing deep export: ${name}/${actual}`,
      );
  }
  const serverWrapper = targets(pkg.exports["./components/*"]).find((p) =>
    p.endsWith(".js"),
  )!;
  assert(
    !/^['\"]use client['\"]/.test(
      readFileSync(
        join(root, serverWrapper.replace("*", "nav-server-wrapper")),
        "utf8",
      ),
    ),
    "Server wrapper must not become a client component",
  );
  function checkRelativeImports(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = join(dir, entry.name);
      if (entry.isDirectory()) {
        checkRelativeImports(file);
        continue;
      }
      if (!file.endsWith(".js")) continue;
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(
        /(?:from\s*|import\s*\(\s*)["']([^"']+)["']/g,
      )) {
        const specifier = match[1];
        assert(!specifier.startsWith("@/"), `Source alias leaked into ${file}`);
        if (specifier.startsWith("."))
          assert(
            existsSync(resolve(dirname(file), specifier)),
            `Broken packed import ${file}: ${specifier}`,
          );
      }
    }
  }
  checkRelativeImports(join(root, "dist"));
  assert(pkg.sideEffects.includes("**/*.css"), "CSS must survive tree shaking");
  assert(
    existsSync(join(root, "dist/tokens.ts")),
    "Token artifact removed by package build",
  );
  assert(
    existsSync(join(root, "DESIGN.md")),
    "Design guidance absent from package",
  );
  assert(
    existsSync(join(root, "docs/design/v2-migration.md")),
    "Migration guidance absent from package",
  );
  assert.equal(
    readFileSync(join(root, pkg.exports["./theme.css"]), "utf8"),
    readFileSync("src/styles/theme.css", "utf8"),
  );
  mkdirSync(join(dir, "node_modules/@naeil"), { recursive: true });
  symlinkSync(root, join(dir, "node_modules/@naeil/ui"), "dir");
  // Resolve runtime peers without installing or publishing anything outside the fixture.
  for (const name of Object.keys({
    ...pkg.dependencies,
    ...pkg.peerDependencies,
    tailwindcss: "^4",
  })) {
    const source = resolve("node_modules", name),
      target = join(dir, "node_modules", name);
    if (existsSync(source)) {
      mkdirSync(dirname(target), { recursive: true });
      symlinkSync(source, target, "dir");
    }
  }
  // Only runtime dependencies/peers and the documented Tailwind host are visible.
  const require = createRequire(import.meta.url);
  const postcss = createRequire(require.resolve("@tailwindcss/postcss"))(
    "postcss",
  );
  const tailwind = require("@tailwindcss/postcss");
  const cssEntry = join(dir, "consumer.css");
  writeFileSync(
    cssEntry,
    '@import "@naeil/ui/globals.css";\n@source "./consumer.html";',
  );
  writeFileSync(
    join(dir, "consumer.html"),
    '<button class="ui-control h-8 bg-primary">Consumer</button>',
  );
  const cssResult = await postcss([tailwind({ base: dir })]).process(
    readFileSync(cssEntry, "utf8"),
    { from: cssEntry },
  );
  assert.match(cssResult.css, /\.h-8\s*\{/);
  assert.match(cssResult.css, /--primary: #292929/);
  assert.match(cssResult.css, /\.ui-control/);
  assert(
    !cssResult.css.includes("@import"),
    "Consumer CSS has unresolved imports",
  );
  writeFileSync(join(dir, "package.json"), '{"type":"module"}');
  writeFileSync(
    join(dir, "consumer.ts"),
    `
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Button, Select, Switch, Checkbox } from '@naeil/ui/ui';
import { Button as DeepButton } from '@naeil/ui/components/ui/button';
import { cn } from '@naeil/ui/utils';
export const html = renderToStaticMarkup(createElement(Button, null, 'Consumer action'));
export const valid = !!Select && !!Switch && !!Checkbox && typeof DeepButton === 'function' && cn('a', 'b') === 'a b';
`,
  );
  await build({
    entry: [join(dir, "consumer.ts")],
    outDir: join(dir, "out"),
    format: ["esm"],
    dts: false,
    splitting: false,
    config: false,
    silent: true,
    noExternal: ["@naeil/ui"],
    external: Object.keys({ ...pkg.dependencies, ...pkg.peerDependencies }),
  });
  const consumer = await import(
    pathToFileURL(join(dir, "out/consumer.js")).href
  );
  assert(consumer.valid, "External consumer imports do not agree");
  assert.match(consumer.html, /Consumer action/);
  console.log(
    "Packed exports, token/CSS artifacts, external CSS build, and React consumer: PASS",
  );
} finally {
  rmSync(dir, { recursive: true, force: true });
}
