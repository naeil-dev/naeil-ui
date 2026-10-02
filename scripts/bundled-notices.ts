import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";

export type PackageNotice = { name: string; version: string; source: string; notices: { file: string; text: string }[] };
export function installedNotice(root: string): PackageNotice {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const files = readdirSync(root).filter(file => /^(license|licence|notice|copying)([._-].*)?$/i.test(file) && statSync(join(root, file)).isFile());
  const notices = files.map(file => ({ file, text: readFileSync(join(root, file), "utf8") }));
  if (!notices.length && existsSync(join(root, "dist/LICENSE.txt")))
    notices.push({ file: "dist/LICENSE.txt", text: readFileSync(join(root, "dist/LICENSE.txt"), "utf8") });
  if (!notices.length && pkg.name.startsWith("@radix-ui/"))
    notices.push({ file: "Radix-MIT.txt", text: readFileSync("node_modules/radix-ui/LICENSE", "utf8") });
  if (!notices.length && (pkg.name === "storybook" || pkg.name.startsWith("@storybook/")))
    notices.push({ file: "Storybook-MIT.txt", text: readFileSync("licenses/Storybook-MIT.txt", "utf8") });
  if (!notices.length && pkg.name === "react-remove-scroll-bar")
    notices.push({ file: "react-remove-scroll-bar-MIT.txt", text: readFileSync("licenses/react-remove-scroll-bar-MIT.txt", "utf8") });
  if (!notices.length && pkg.name === "client-only" && pkg.version === "0.0.1") {
    // This marker ships no LICENSE or author field; its homepage/bugs identify
    // React. Preserve its exact metadata and the original React MIT notice.
    notices.push({ file: "provided-package-licensing-metadata.json", text: JSON.stringify({ name: pkg.name, version: pkg.version, license: pkg.license, author: pkg.author, repository: pkg.repository, homepage: pkg.homepage, bugs: pkg.bugs }, null, 2) });
    notices.push({ file: "React-MIT.txt", text: readFileSync("licenses/React-MIT.txt", "utf8") });
  }
  if (!notices.length) throw new Error(`Complete notice missing for bundled ${pkg.name}@${pkg.version}`);
  const embedded = !pkg.version;
  return { name: pkg.name, version: pkg.version || "embedded-version-unspecified",
    source: embedded ? "Embedded in next@16.1.7; original vendored notice, manifest omits version" : `https://registry.npmjs.org/${pkg.name}/${pkg.version}`, notices };
}

export function previewNoticePlugin() {
  return {
    name: "naeil-bundled-preview-notices",
    generateBundle(this: { emitFile: (file: { type: "asset"; fileName: string; source: string }) => unknown }, _options: unknown,
      bundle: Record<string, { type: string; modules?: Record<string, unknown> }>) {
      const roots = new Set<string>();
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== "chunk") continue;
        for (const id of Object.keys(chunk.modules || {})) {
          if (!id.includes("/node_modules/") || id.startsWith("\0")) continue;
          let dir = dirname(id.split("?")[0]);
          while (dir !== dirname(dir)) {
            if (existsSync(join(dir, "package.json"))) {
              const manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
              if (manifest.name) { roots.add(dir); break; }
            }
            dir = dirname(dir);
          }
        }
      }
      const packages = [...roots].map(installedNotice).sort((a, b) => `${a.name}@${a.version}`.localeCompare(`${b.name}@${b.version}`));
      this.emitFile({ type: "asset", fileName: "licenses/bundled-preview-code.json", source: JSON.stringify({ scope: "Actual Vite preview chunk module packages; full installed notices, with pinned original-source fallbacks.", packages }, null, 2) + "\n" });
    },
  };
}
