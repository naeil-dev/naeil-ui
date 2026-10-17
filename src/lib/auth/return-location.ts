import { canonicalRedirect } from "./redirect";
import { defaultLocale, locales, type Locale } from "@/i18n/config";

export function loginDestination(value: unknown): string {
  const destination = canonicalRedirect(value);
  if (!destination) return "/";
  const url = new URL(destination, "https://naeil.dev");
  if (url.origin === "https://naeil.dev" && /^\/(?:(?:ko|ja|en)\/)?(?:login|auth)(?:\/|$)/.test(url.pathname)) return "/";
  return destination;
}

export function authLocale(value: unknown): Locale {
  return locales.includes(value as Locale) ? value as Locale : defaultLocale;
}

export function loginErrorLocation(origin: string, destination: string, locale: unknown): URL {
  const language = authLocale(locale);
  const url = new URL(language === defaultLocale ? "/login" : `/${language}/login`, origin);
  url.searchParams.set("error", "auth");
  if (destination !== "/") url.searchParams.set("next", loginDestination(destination));
  return url;
}
