import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";

export function consumerNotices() {
  return { name: "consumer-code-notices", generateBundle(_options, bundle) {
    const roots = new Set();
    for (const chunk of Object.values(bundle)) {
      if (chunk.type !== "chunk") continue;
      for (const id of Object.keys(chunk.modules)) {
        if (!id.includes("/node_modules/") || id.startsWith("\0")) continue;
        let dir = dirname(id.split("?")[0]);
        while (dir !== dirname(dir)) {
          if (existsSync(join(dir, "package.json"))) {
              const manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
              if (manifest.name && manifest.version) { roots.add(dir); break; }
            }
          dir = dirname(dir);
        }
      }
    }
    const packages = [...roots].map(root => {
      const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
      const files = readdirSync(root).filter(file => /^(license|licence|notice|copying)([._-].*)?$/i.test(file) && statSync(join(root, file)).isFile());
      if (existsSync(join(root, "dist/LICENSE.txt"))) files.push("dist/LICENSE.txt");
      if (pkg.name === "@naeil/ui") files.push("THIRD_PARTY_NOTICES.md");
      const notices = files.map(file => ({ file, text: readFileSync(join(root, file), "utf8") }));
      if (!notices.length && pkg.name.startsWith("@radix-ui/"))
        notices.push({ file: "Radix-MIT.txt", text: readFileSync("node_modules/radix-ui/LICENSE", "utf8") });
      if (!notices.length && pkg.name === "react-remove-scroll-bar")
        notices.push({ file: "react-remove-scroll-bar-MIT.txt", text: readFileSync("node_modules/@naeil/ui/licenses/react-remove-scroll-bar-MIT.txt", "utf8") });
      if (!notices.length) throw new Error(`Missing complete consumer code notice: ${pkg.name}`);
      return { name: pkg.name, version: pkg.version, notices };
    }).sort((a, b) => a.name.localeCompare(b.name));
    this.emitFile({ type: "asset", fileName: "licenses/bundled-consumer-code.json", source: JSON.stringify({ scope: "Actual independent Vite consumer chunk packages", packages }, null, 2) + "\n" });
  } };
}
