import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import ts from "typescript";

// Inspect the artifact consumers receive, rather than the repository dependency tree.
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
  for (const name of ["next", "next-intl"]) {
    assert(
      !pkg.dependencies[name],
      `${name} must not be installed by a core consumer`,
    );
    assert(
      pkg.peerDependenciesMeta[name]?.optional,
      `${name} must be an optional compatibility peer`,
    );
  }
  const forbidden =
    /^(?:@supabase\/|@react-three\/|three$|@mdx-js\/|@next\/mdx$|gray-matter$|reading-time$|remark(?:-html)?$|pretendard$)/;
  for (const name of Object.keys(pkg.dependencies))
    assert(!forbidden.test(name), `Website dependency shipped: ${name}`);
  for (const name of ["react", "react-dom"]) {
    assert(!pkg.dependencies[name], `${name} must be provided by the host`);
    assert(pkg.peerDependencies[name], `${name} peer missing`);
  }
  const targets = (value: unknown): string[] =>
    typeof value === "string"
      ? [value]
      : Object.values(value as Record<string, unknown>).flatMap(targets);
  for (const [name, value] of Object.entries(pkg.exports)) {
    assert(!name.includes("*"), `Open-ended export: ${name}`);
    for (const target of targets(value))
      assert(
        existsSync(join(root, target)),
        `Missing packed export ${name}: ${target}`,
      );
  }
  const paths = packed.files.map(
    (file: { path: string }) => file.path,
  ) as string[];
  for (const path of paths) {
    assert(
      !/(?:^|\/)(?:app|supabase|auth|blog|__tests__|messages|public|skills|superpowers)(?:\/|$)/.test(
        path,
      ),
      `Website/test payload shipped: ${path}`,
    );
    assert(
      !/(?:hero-scene|hero-section|paraglider-cursor|project-layout|workflow-diagram|accent-picker|nav-server-wrapper|nav-wrapper|footer-wrapper|auth-slot|i18n\/request)/.test(
        path,
      ),
      `Website module shipped: ${path}`,
    );
    assert(
      !/\.(?:stories|test|spec)\./.test(path),
      `Test/story shipped: ${path}`,
    );
  }
  function checkModules(dir: string) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const file = join(dir, entry.name);
      if (entry.isDirectory()) {
        checkModules(file);
        continue;
      }
      if (!file.endsWith(".js")) continue;
      const source = ts.createSourceFile(
        file,
        readFileSync(file, "utf8"),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.JS,
      );
      function visit(node: ts.Node) {
        let specifier: string | undefined;
        if (
          (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
          node.moduleSpecifier &&
          ts.isStringLiteral(node.moduleSpecifier)
        )
          specifier = node.moduleSpecifier.text;
        if (
          ts.isCallExpression(node) &&
          node.expression.kind === ts.SyntaxKind.ImportKeyword &&
          node.arguments[0] &&
          ts.isStringLiteral(node.arguments[0])
        )
          specifier = node.arguments[0].text;
        if (specifier) {
          assert(
            !specifier.startsWith("@/"),
            `Source alias leaked into ${file}`,
          );
          assert(
            !forbidden.test(specifier),
            `Website import shipped in ${file}: ${specifier}`,
          );
          if (specifier.startsWith("."))
            assert(
              existsSync(resolve(dirname(file), specifier)),
              `Broken packed import ${file}: ${specifier}`,
            );
          else {
            const name = specifier.startsWith("@")
              ? specifier.split("/").slice(0, 2).join("/")
              : specifier.split("/")[0];
            assert(
              pkg.dependencies[name] || pkg.peerDependencies[name],
              `Undeclared runtime import ${file}: ${specifier}`,
            );
          }
        }
        ts.forEachChild(node, visit);
      }
      visit(source);
    }
  }
  checkModules(join(root, "dist"));
  assert(pkg.sideEffects.includes("**/*.css"), "CSS must survive tree shaking");
  for (const path of [
    "dist/tokens.ts",
    "DESIGN.md",
    "docs/design/v2-migration.md",
    "docs/components/README.md",
    "docs/components/common.md",
    ...["button", "input", "card", "dialog", "dropdown-menu", "badge", "avatar", "sonner", "select", "switch", "checkbox"].map(name => `docs/components/${name}.md`),
    "LICENSE",
    "THIRD_PARTY_NOTICES.md",
    "licenses/Pretendard-OFL.txt",
    "licenses/Noto-Sans-JP-OFL.txt",
  ])
    assert(existsSync(join(root, path)), `Required artifact missing: ${path}`);
  for (const path of paths.filter((path) => path.endsWith(".md"))) {
    const text = readFileSync(join(root, path), "utf8");
    for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
      const target = match[1].replace(/^<|>$/g, "").split("#")[0];
      if (!target || /^[a-z]+:/i.test(target)) continue;
      assert(
        existsSync(resolve(root, dirname(path), target)),
        `Broken packed document link in ${path}: ${target}`,
      );
    }
  }
  assert.equal(
    readFileSync(join(root, pkg.exports["./theme.css"]), "utf8"),
    readFileSync("src/styles/theme.css", "utf8"),
  );
  console.log(
    `Packed boundary: PASS (${paths.length} files, ${packed.unpackedSize} unpacked bytes)`,
  );
} finally {
  rmSync(dir, { recursive: true, force: true });
}
