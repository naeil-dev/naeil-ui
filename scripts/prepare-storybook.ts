import { cpSync, mkdirSync, readFileSync, rmSync } from "node:fs";

// Only documentation assets with explicit notices. Never copy website public/.
const target = ".storybook/.generated";
rmSync(target, { recursive: true, force: true });
mkdirSync(`${target}/licenses`, { recursive: true });
for (const file of ["LICENSE", "THIRD_PARTY_NOTICES.md"])
  cpSync(file, `${target}/${file}`);
for (const file of ["Pretendard-OFL.txt", "Noto-Sans-JP-OFL.txt", "Nunito-Sans-OFL.txt", "Lato-OFL.txt"])
  cpSync(`licenses/${file}`, `${target}/licenses/${file}`);

cpSync(".storybook/manager-notices.json", `${target}/licenses/manager-dependency-notices.json`);
cpSync("licenses/Storybook-MIT.txt", `${target}/licenses/Storybook-MIT.txt`);

// Approved brand assets are separate from website illustrations.
const { version: brandVersion } = JSON.parse(readFileSync("brand/current.json", "utf8"));
cpSync(`brand/naeil/${brandVersion}/svg`, `${target}/brand`, { recursive: true });
