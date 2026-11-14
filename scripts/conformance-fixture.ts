import { cpSync, mkdirSync } from "node:fs";
import { join } from "node:path";

/** Copy actual fixture source and immutable brand bytes; never ship the kit in npm. */
export function conformanceFixture(destination: string, framework: "next" | "vite") {
  cpSync(`scripts/fixtures/conformance/${framework}`, destination, { recursive: true });
  const icons = join(destination, framework === "next" ? "app" : "public");
  mkdirSync(icons, { recursive: true });
  for (const [name, source] of Object.entries({ "favicon.ico": "favicon.ico", "icon.svg": "favicon.svg", "apple-icon.png": "apple-touch-icon.png" }))
    cpSync(`brand/naeil/1.1.1/icons/${source}`, join(icons, name));
}
