import { assertLocale, isNaeilLocale, type NaeilLocale } from "./routing";

export const localePreferenceCookie = "naeil_locale_v1";
export const developmentPreferenceCookie = "naeil_locale_dev_v1";
export function readLocalePreference(cookie: string, development = false): NaeilLocale | undefined {
  const name = development ? developmentPreferenceCookie : localePreferenceCookie;
  const matches = cookie.split(";").map(item => item.trim()).filter(item => item.split("=", 1)[0] === name);
  if (matches.length !== 1) return;
  const value = matches[0].slice(name.length + 1);
  return isNaeilLocale(value) ? value : undefined;
}
export function preferenceCookieWrites(locale: NaeilLocale, location: { hostname: string; protocol: string }): string[] {
  assertLocale(locale);
  const production = location.hostname === "naeil.dev" || location.hostname.endsWith(".naeil.dev");
  if (production) {
    if (location.protocol !== "https:") return [];
    return [
      `${localePreferenceCookie}=; Path=/; Max-Age=0; Secure; SameSite=Lax`,
      `${localePreferenceCookie}=${locale}; Domain=naeil.dev; Path=/; Max-Age=31536000; Secure; SameSite=Lax`,
    ];
  }
  // Development/test hosts never write the shared production cookie.
  return [`${developmentPreferenceCookie}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`];
}
export function writeLocalePreference(locale: NaeilLocale, environment: { location: { hostname: string; protocol: string }; writeCookie: (cookie: string) => void }, enabled = false): boolean {
  if (!enabled) return false;
  try {
    const writes = preferenceCookieWrites(locale, environment.location);
    for (const cookie of writes) environment.writeCookie(cookie);
    return writes.length > 0;
  } catch { return false; }
}
export function browserLocaleHint(languages: readonly string[]): NaeilLocale | undefined {
  for (const language of languages) {
    try {
      const base = new Intl.Locale(language).language;
      if (isNaeilLocale(base)) return base;
    } catch { /* Malformed hints are never authoritative. */ }
  }
}
/** Legacy reads are hint-only and expire against the recorded activation date. */
export function legacyLocaleHint(options: { activatedAt: number | undefined; now: number; values: readonly (string | null | undefined)[] }): NaeilLocale | undefined {
  if (options.activatedAt === undefined || options.now >= options.activatedAt + 90 * 86400000 || options.now < options.activatedAt) return;
  return options.values.find(isNaeilLocale);
}
