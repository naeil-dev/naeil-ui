import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import test from "node:test";

test("consumer font notices stay in fixture output when Vite closes from another cwd", async () => {
  const originalCwd = process.cwd();
  const source = fileURLToPath(new URL("../examples/react/", import.meta.url));
  const scratch = mkdtempSync(join(tmpdir(), "naeil-font-notices-"));
  const fixture = join(scratch, "fixture");
  const caller = join(scratch, "caller");
  try {
    mkdirSync(fixture);
    mkdirSync(caller);
    for (const file of ["vite.config.mjs", "bundled-notices.mjs"])
      cpSync(join(source, file), join(fixture, file));
    const manifest = JSON.parse(readFileSync(join(source, "package.json"), "utf8"));
    // Use existing fixture versions, not root's transitive Storybook Vite.
    // This isolated install needs network when the npm cache is cold.
    const dependencies = Object.fromEntries(
      ["vite", "@tailwindcss/vite", "pretendard", "@fontsource/noto-sans-jp"].map(name =>
        [name, manifest.dependencies?.[name] ?? manifest.devDependencies[name]]),
    );
    writeFileSync(join(fixture, "package.json"), JSON.stringify({ private: true, type: "module", dependencies }));
    execFileSync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--package-lock=false"], { cwd: fixture, stdio: "inherit" });
    // The real repository caller also has these fonts installed. Reproduce
    // that condition entirely inside scratch so a misplaced copy can succeed.
    symlinkSync(join(fixture, "node_modules"), join(caller, "node_modules"), "dir");
    const require = createRequire(join(fixture, "package.json"));
    const { resolveConfig } = await import(pathToFileURL(require.resolve("vite")));
    process.chdir(caller);
    const config = await resolveConfig({ root: fixture, configFile: join(fixture, "vite.config.mjs") }, "build");
    const plugin = config.plugins.find(plugin => plugin.name === "consumer-font-notices");
    assert(plugin, "Actual fixture font-notices plugin must load");
    await plugin.closeBundle();
    assert(!existsSync(join(caller, "dist")), "Closing the fixture must not create caller output");
    for (const [notice, installed] of [
      ["Pretendard-OFL.txt", "pretendard/dist/LICENSE.txt"],
      ["Noto-Sans-JP-OFL.txt", "@fontsource/noto-sans-jp/LICENSE"],
    ]) {
      assert.deepEqual(readFileSync(join(fixture, "dist/licenses", notice)), readFileSync(join(fixture, "node_modules", installed)), `Exact consumer-owned OFL: ${notice}`);
    }
  } finally {
    process.chdir(originalCwd);
    rmSync(scratch, { recursive: true, force: true });
  }
});
