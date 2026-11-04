import { copyFile, mkdir } from "node:fs/promises";
import { naeilLocales } from "../src/naeil-locale/routing";

await mkdir("dist/source/naeil-locale/messages", { recursive: true });
for (const locale of naeilLocales) await copyFile(`src/naeil-locale/messages/${locale}.json`, `dist/source/naeil-locale/messages/${locale}.json`);
