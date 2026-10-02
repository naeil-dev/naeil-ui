import { cpSync, mkdirSync, rmSync } from "node:fs";

// Only documentation assets with explicit notices. Never copy website public/.
const target = ".storybook/.generated";
rmSync(target, { recursive: true, force: true });
mkdirSync(`${target}/licenses`, { recursive: true });
for (const file of ["LICENSE", "THIRD_PARTY_NOTICES.md"])
  cpSync(file, `${target}/${file}`);
for (const file of ["Pretendard-OFL.txt", "Noto-Sans-JP-OFL.txt", "Nunito-Sans-OFL.txt"])
  cpSync(`licenses/${file}`, `${target}/licenses/${file}`);

cpSync(".storybook/manager-notices.json", `${target}/licenses/manager-dependency-notices.json`);
cpSync("licenses/Storybook-MIT.txt", `${target}/licenses/Storybook-MIT.txt`);
