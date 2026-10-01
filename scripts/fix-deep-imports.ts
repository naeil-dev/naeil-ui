import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const root = resolve("dist/source");
function visit(dir: string) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) {
      visit(file);
      continue;
    }
    if (!file.endsWith(".js")) continue;
    const source = readFileSync(file, "utf8");
    // Rewrite only module specifiers, leaving strings and import assertions intact.
    const output = source.replace(
      /((?:from\s*|import\s*\(\s*|import\s*)["'])([^"']+)(["'])/g,
      (match, before, specifier: string, after) => {
        if (!specifier.startsWith("@/") && !specifier.startsWith("."))
          return match;
        const target = specifier.startsWith("@/")
          ? resolve(root, specifier.slice(2))
          : resolve(dirname(file), specifier);
        const resolved = existsSync(target + ".js")
          ? target + ".js"
          : existsSync(join(target, "index.js"))
            ? join(target, "index.js")
            : target;
        let path = relative(dirname(file), resolved).split("\\").join("/");
        if (!path.startsWith(".")) path = "./" + path;
        return before + path + after;
      },
    );
    writeFileSync(file, output);
  }
}
visit(root);
