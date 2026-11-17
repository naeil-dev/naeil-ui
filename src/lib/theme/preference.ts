import { isNaeilPreferenceHost } from "../preference-cookie";

export const themePreferenceCookie = "naeil_theme_v1";
export type NaeilThemePreference = "light" | "dark" | "system";

// Self-contained: also serialized into the pre-hydration script. No cookie text
// is interpolated into HTML or executable code, and duplicates fail closed.
export function readThemePreference(cookie: string): NaeilThemePreference | undefined {
  const matches = cookie.split(";").map(item => item.trim()).filter(item => item.split("=", 1)[0] === "naeil_theme_v1");
  if (matches.length !== 1) return;
  const value = matches[0].slice("naeil_theme_v1=".length);
  return value === "light" || value === "dark" || value === "system" ? value : undefined;
}

export function themeCookieWrites(value: NaeilThemePreference, location: { hostname: string; protocol: string }): string[] {
  if (value !== "light" && value !== "dark" && value !== "system") return [];
  if (isNaeilPreferenceHost(location.hostname)) {
    if (location.protocol !== "https:") return [];
    return [
      `${themePreferenceCookie}=; Path=/; Max-Age=0; Secure; SameSite=Lax`,
      `${themePreferenceCookie}=${value}; Domain=naeil.dev; Path=/; Max-Age=31536000; Secure; SameSite=Lax`,
    ];
  }
  return [`${themePreferenceCookie}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`];
}

export function writeThemePreference(value: NaeilThemePreference): void {
  try { for (const cookie of themeCookieWrites(value, window.location)) document.cookie = cookie; }
  catch { /* Cookie denial must not prevent next-themes from remembering locally. */ }
}

/** Called before next-themes reads storage, on SSR first paint and CSR roots. */
export function prepareThemeStorage(readPreference: typeof readThemePreference): void {
  let preference;
  try { preference = readPreference(document.cookie); } catch { /* Cookies denied. */ }
  try {
    localStorage.getItem("theme");
    if (preference) localStorage.setItem("theme", preference);
  } catch {
    const root = document.documentElement;
    root.classList.remove("light"); root.classList.add("dark"); root.style.colorScheme = "dark";
  }
}

export const themePreflightScript = `(${prepareThemeStorage.toString()})(${readThemePreference.toString()})`;
