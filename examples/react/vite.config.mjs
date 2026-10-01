import { consumerNotices } from "./bundled-notices.mjs";
import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { cpSync, mkdirSync } from "node:fs";

export default defineConfig({ plugins: [tailwindcss(), consumerNotices(), {
  name: "consumer-font-notices",
  closeBundle() {
    mkdirSync("dist/licenses", { recursive: true });
    cpSync("node_modules/pretendard/dist/LICENSE.txt", "dist/licenses/Pretendard-OFL.txt");
    cpSync("node_modules/@fontsource/noto-sans-jp/LICENSE", "dist/licenses/Noto-Sans-JP-OFL.txt");
  },
}] });
