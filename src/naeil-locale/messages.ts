import { assertLocale, type NaeilLocale } from "./routing";

export interface LocaleMessages { [key: string]: string | LocaleMessages }
export type MessageModule = LocaleMessages | { default: LocaleMessages };
export type LocaleMessageLoaders = Record<NaeilLocale, () => Promise<MessageModule>>;
export type SharedMessages = typeof import("./messages/en.json");

// Only validated keys index this static map. Application dictionaries are
// supplied by their own build; no service dictionaries enter this package.
const sharedLoaders: LocaleMessageLoaders = {
  en: () => import("./messages/en.json"),
  ko: () => import("./messages/ko.json"),
  ja: () => import("./messages/ja.json"),
};
function unwrap(value: MessageModule): LocaleMessages {
  return "default" in value && typeof value.default === "object" ? value.default : value as LocaleMessages;
}
export async function loadSharedMessages(locale: NaeilLocale): Promise<SharedMessages> {
  return unwrap(await sharedLoaders[assertLocale(locale)]()) as SharedMessages;
}
function validateNamespace(namespace: string): void {
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(namespace) || ["naeil", "constructor", "prototype"].includes(namespace)) throw new Error("Application message namespace conflicts with the shared namespace");
}
/** Every application dictionary has exactly its declared top-level namespace. */
export function mergeLocaleMessages(shared: LocaleMessages, application: LocaleMessages, namespace: string): LocaleMessages {
  validateNamespace(namespace);
  if (Object.keys(application).length !== 1 || !Object.hasOwn(application, namespace) || !application[namespace] || typeof application[namespace] !== "object") throw new Error(`Messages must contain only the ${namespace} namespace`);
  if (Object.hasOwn(shared, namespace)) throw new Error(`Duplicate message namespace: ${namespace}`);
  return { ...shared, ...application };
}
export function createLocaleMessageLoader(options: { namespace: string; messages: LocaleMessageLoaders }) {
  validateNamespace(options.namespace);
  return async function loadMessages(locale: NaeilLocale): Promise<LocaleMessages> {
    assertLocale(locale);
    const [shared, application] = await Promise.all([loadSharedMessages(locale), options.messages[locale]().then(unwrap)]);
    return mergeLocaleMessages(shared, application, options.namespace);
  };
}

/** Runtime fallback is observable and is not a substitute for the build checker. */
export function recoverMissingMessages(selected: LocaleMessages, english: LocaleMessages, onMissing: (key: string) => void, prefix = ""): LocaleMessages {
  const result: LocaleMessages = { ...selected };
  for (const [key, value] of Object.entries(english)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (!Object.hasOwn(result, key) || (typeof value === "string" && (typeof result[key] !== "string" || !result[key]))) { onMissing(path); result[key] = value; }
    else if (typeof value === "object") {
      result[key] = recoverMissingMessages(typeof result[key] === "object" ? result[key] : {}, value, onMissing, path);
    }
  }
  return result;
}
