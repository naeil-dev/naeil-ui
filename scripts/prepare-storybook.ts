import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { uiRelease } from "../src/lib/ui-release";

// Only documentation assets with explicit notices. Never copy website public/.
const target = ".storybook/.generated";
rmSync(target, { recursive: true, force: true });
mkdirSync(`${target}/licenses`, { recursive: true });
writeFileSync(`${target}/naeil-release.json`, JSON.stringify({
  schemaVersion: 1, ui: uiRelease,
  sourceRevision: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
  frozen: !execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim(),
}));
for (const file of ["LICENSE", "THIRD_PARTY_NOTICES.md"])
  cpSync(file, `${target}/${file}`);
for (const file of ["Pretendard-OFL.txt", "Noto-Sans-JP-OFL.txt", "Nunito-Sans-OFL.txt", "Lato-OFL.txt"])
  cpSync(`licenses/${file}`, `${target}/licenses/${file}`);

cpSync(".storybook/manager-notices.json", `${target}/licenses/manager-dependency-notices.json`);
cpSync("licenses/Storybook-MIT.txt", `${target}/licenses/Storybook-MIT.txt`);

// Approved brand assets are separate from website illustrations.
const { version: brandVersion } = JSON.parse(readFileSync("brand/current.json", "utf8"));
cpSync(`brand/naeil/${brandVersion}/svg`, `${target}/brand`, { recursive: true });
