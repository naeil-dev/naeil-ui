import type { Metadata } from "next";
import { defaultLocale, locales, type Locale } from "@/i18n/config";
import { getPathname } from "@/i18n/routing";

export const SITE_NAME = "naeil";
const SITE_ORIGIN = process.env.NEXT_PUBLIC_APP_URL || "https://naeil.dev";

/** Match next-intl's public paths, including the unprefixed default locale. */
export function siteUrl(locale: string, path = "/") {
  if (!locales.includes(locale as Locale))
    throw new Error("Unsupported site locale");
  return new URL(
    getPathname({ locale: locale as Locale, href: path }),
    SITE_ORIGIN,
  ).toString();
}

interface SiteMetadataOptions {
  locale: string;
  path?: string;
  /** A page name only; the locale layout owns the service suffix. */
  title?: string;
  description: string;
  availableLocales?: readonly Locale[];
  type?: "website" | "article";
}

export function siteMetadata({
  locale,
  path = "/",
  title,
  description,
  availableLocales = locales,
  type = "website",
}: SiteMetadataOptions): Metadata {
  if (!locales.includes(locale as Locale))
    throw new Error("Unsupported site locale");
  const currentLocale = locale as Locale;
  const publicTitle = title ? `${title} — ${SITE_NAME}` : SITE_NAME;
  const languages: Record<string, string> = Object.fromEntries(
    availableLocales.map((language) => [language, siteUrl(language, path)]),
  );
  const fallbackLocale = availableLocales.includes(defaultLocale)
    ? defaultLocale
    : (availableLocales[0] ?? locale);
  languages["x-default"] = siteUrl(fallbackLocale, path);

  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: siteUrl(locale, path), languages },
    openGraph: {
      title: publicTitle,
      description,
      url: siteUrl(locale, path),
      siteName: SITE_NAME,
      type,
      locale: { en: "en_US", ko: "ko_KR", ja: "ja_JP" }[currentLocale],
      alternateLocale: availableLocales
        .filter((language) => language !== locale)
        .map(
          (language) => ({ en: "en_US", ko: "ko_KR", ja: "ja_JP" })[language],
        ),
    },
    twitter: { card: "summary", title: publicTitle, description },
  };
}
