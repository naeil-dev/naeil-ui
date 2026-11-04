import { parse, TYPE, type MessageFormatElement } from "@formatjs/icu-messageformat-parser";
import { naeilLocales, type NaeilLocale } from "./routing";
import type { LocaleMessages } from "./messages";

export interface MessageIssue { locale: NaeilLocale; key: string; reason: string }
function leaves(value: unknown, locale: NaeilLocale, issues: MessageIssue[], prefix = ""): Map<string, string> {
  const found = new Map<string, string>();
  if (!value || typeof value !== "object" || Array.isArray(value)) { issues.push({ locale, key: prefix, reason: "Dictionary must be a JSON object" }); return found; }
  for (const [key, child] of Object.entries(value)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (!key || key.includes(".") || ["__proto__", "constructor", "prototype"].includes(key)) issues.push({ locale, key: path, reason: "Unsafe or dotted message key" });
    if (typeof child === "string") {
      found.set(path, child);
      if (!child.trim()) issues.push({ locale, key: path, reason: "Empty message" });
    } else if (!child || typeof child !== "object" || Array.isArray(child)) issues.push({ locale, key: path, reason: "Message must be a string or nested object" });
    else {
      if (!Object.keys(child).length) issues.push({ locale, key: path, reason: "Empty namespace" });
      for (const [nested, text] of leaves(child, locale, issues, path)) found.set(nested, text);
    }
  }
  return found;
}
function argumentsOf(nodes: MessageFormatElement[]): string {
  const args = new Map<string, Set<string>>();
  const add = (name: string, type: string) => { const types = args.get(name) ?? new Set<string>(); types.add(type); args.set(name, types); };
  const visit = (items: MessageFormatElement[]) => {
    for (const item of items) {
      if (item.type === TYPE.argument) add(item.value, "argument");
      if (item.type === TYPE.number || item.type === TYPE.plural) add(item.value, "number");
      if (item.type === TYPE.date || item.type === TYPE.time) add(item.value, "date");
      if (item.type === TYPE.select) add(item.value, "select");
      if (item.type === TYPE.tag) { add(item.value, "tag"); visit(item.children); }
      if (item.type === TYPE.select || item.type === TYPE.plural) {
        if (!item.options.other) throw new Error("Missing other branch");
        for (const option of Object.values(item.options)) visit(option.value);
      }
    }
  };
  visit(nodes);
  return JSON.stringify([...args].sort(([a], [b]) => a.localeCompare(b)).map(([name, types]) => [name, [...types].sort()]));
}
/** ICU categories may differ by language; variables, types and keys may not. */
export function checkLocaleMessages(dictionaries: Record<NaeilLocale, LocaleMessages>, options: { namespace: string }): MessageIssue[] {
  const issues: MessageIssue[] = [];
  const keys = new Map<NaeilLocale, Map<string, string>>();
  const signatures = new Map<NaeilLocale, Map<string, string>>();
  for (const locale of naeilLocales) {
    const dictionary = dictionaries[locale];
    if (!dictionary || Object.keys(dictionary).length !== 1 || !Object.hasOwn(dictionary, options.namespace)) issues.push({ locale, key: "", reason: `Expected only ${options.namespace} namespace` });
    const all = leaves(dictionary, locale, issues); keys.set(locale, all);
    const shapes = new Map<string, string>(); signatures.set(locale, shapes);
    for (const [key, value] of all) {
      try { shapes.set(key, argumentsOf(parse(value, { requiresOtherClause: true }))); }
      catch (error) { issues.push({ locale, key, reason: `Invalid ICU: ${error instanceof Error ? error.message : "parse failed"}` }); }
    }
  }
  const reference = keys.get("en")!;
  for (const locale of naeilLocales) {
    for (const key of new Set([...reference.keys(), ...keys.get(locale)!.keys()])) {
      if (!keys.get(locale)!.has(key)) issues.push({ locale, key, reason: "Missing key" });
      else if (!reference.has(key)) issues.push({ locale, key, reason: "Unexpected key" });
      else if (signatures.get(locale)!.has(key) && signatures.get("en")!.has(key) && signatures.get(locale)!.get(key) !== signatures.get("en")!.get(key)) issues.push({ locale, key, reason: "ICU variable names or types differ from English" });
    }
  }
  return issues;
}
export function assertLocaleMessages(dictionaries: Record<NaeilLocale, LocaleMessages>, options: { namespace: string }): void {
  const issues = checkLocaleMessages(dictionaries, options);
  if (issues.length) throw new Error(issues.map(issue => `${issue.locale}:${issue.key}: ${issue.reason}`).join("\n"));
}
