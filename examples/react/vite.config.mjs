import { consumerNotices } from "./bundled-notices.mjs";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { cpSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

let consumerConfig;

export default defineConfig({ plugins: [tailwindcss(), consumerNotices(), {
  name: "consumer-font-notices",
  configResolved(config) {
    consumerConfig = config;
  },
  closeBundle() {
    // Vite can close this fixture in a caller whose cwd is another project.
    const output = resolve(consumerConfig.root, consumerConfig.build.outDir, "licenses");
    mkdirSync(output, { recursive: true });
    cpSync(resolve(consumerConfig.root, "node_modules/pretendard/dist/LICENSE.txt"), resolve(output, "Pretendard-OFL.txt"));
    cpSync(resolve(consumerConfig.root, "node_modules/@fontsource/noto-sans-jp/LICENSE"), resolve(output, "Noto-Sans-JP-OFL.txt"));
  },
}] });
