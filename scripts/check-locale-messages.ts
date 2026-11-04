import { readFile } from "node:fs/promises";
import { assertLocaleMessages } from "../src/naeil-locale/checker";
import { naeilLocales } from "../src/naeil-locale/routing";
import type { LocaleMessages } from "../src/naeil-locale/messages";

const directory = process.argv[2] ?? "src/naeil-locale/messages";
const namespace = process.argv[3] ?? "naeil";
const dictionaries = Object.fromEntries(await Promise.all(naeilLocales.map(async locale => [locale, JSON.parse(await readFile(`${directory}/${locale}.json`, "utf8"))]))) as Record<(typeof naeilLocales)[number], LocaleMessages>;
assertLocaleMessages(dictionaries, { namespace });
console.log(`Messages PASS: ${namespace}, en/ko/ja`);
