import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";

const root = "storybook-static";
for (const path of ["LICENSE", "THIRD_PARTY_NOTICES.md", "licenses/Pretendard-OFL.txt", "licenses/Noto-Sans-JP-OFL.txt", "licenses/Nunito-Sans-OFL.txt"])
  assert.equal(readFileSync(`${root}/${path}`, "utf8"), readFileSync(path, "utf8"), `Preview notice drift: ${path}`);
for (const path of ["images", "svg", "coral-concepts.html", "next.svg", "vercel.svg"])
  assert(!existsSync(`${root}/${path}`), `Website asset copied into preview: ${path}`);
const index = JSON.parse(readFileSync(`${root}/index.json`, "utf8"));
for (const family of ["button", "input", "card", "dialog", "dropdownmenu", "badge", "avatar", "toaster", "select", "switch", "checkbox"]) {
  assert.equal(index.entries[`ui-${family}--docs`]?.type, "docs", `Missing actual Docs page for ${family}`);
  assert.equal(index.entries[`ui-${family}--usage`]?.type, "story", `Missing runnable example for ${family}`);
}
assert(readdirSync(`${root}/assets`).some(file => file.endsWith(".woff2")), "Bundled docs fonts missing");
console.log("Storybook artifact: PASS (11 built Docs pages + Usage stories, exact notices, fonts, no website public assets)");

const previewNotices = JSON.parse(readFileSync(`${root}/licenses/bundled-preview-code.json`, "utf8"));
const managerNotices = JSON.parse(readFileSync(`${root}/licenses/manager-dependency-notices.json`, "utf8"));
for (const entry of [...previewNotices.packages, ...managerNotices.packages]) {
  assert(entry.notices?.length, `No complete notice for ${entry.name}`);
  for (const notice of entry.notices) assert(notice.text.trim().length > 0, `Empty notice: ${entry.name}`);
}
for (const name of ["react-builtin", "react-dom-builtin", "radix-ui", "sonner", "lucide-react"])
  assert(previewNotices.packages.some((entry: { name: string }) => entry.name === name), `Bundled runtime notice missing: ${name}`);
const covered = new Set([...previewNotices.packages, ...managerNotices.packages].map(entry => entry.name));
function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`]);
}
for (const file of files(root).filter(file => file.endsWith(".js") && !file.includes("/assets/"))) {
  for (const match of readFileSync(file, "utf8").matchAll(/node_modules\/((?:@[^/]+\/)?[^/\s"']+)/g))
    if (match[1] !== ".pnpm") assert(covered.has(match[1]), `Embedded manager/addon package lacks notice: ${match[1]}`);
}
for (const path of ["licenses/bundled-preview-code.json", "licenses/manager-dependency-notices.json"])
  assert(!readFileSync(`${root}/${path}`, "utf8").includes(process.cwd()), `Private build path shipped: ${path}`);
console.log(`Bundled notice coverage: PASS (${previewNotices.packages.length} actual preview packages, ${managerNotices.packages.length} conservative manager version notices)`);
