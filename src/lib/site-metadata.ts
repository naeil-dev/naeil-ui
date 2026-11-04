import type { Metadata } from "next";
import { locales, type Locale } from "@/i18n/config";
import { headers } from "next/headers";
import { localeMetadata, getRequestLocaleAccess } from "@/naeil-locale/server";
import { localeHref } from "@/naeil-locale";

export const SITE_NAME = ".naeil";

/** Match next-intl's public paths, including the unprefixed default locale. */
export function siteUrl(locale: string, path = "/") {
  if (!locales.includes(locale as Locale))
    throw new Error("Unsupported site locale");
  return localeHref("main", path, locale as Locale);
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

export async function siteMetadata({
  locale,
  path = "/",
  title,
  description,
  availableLocales = locales,
  type = "website",
}: SiteMetadataOptions): Promise<Metadata> {
  if (!locales.includes(locale as Locale))
    throw new Error("Unsupported site locale");
  const currentLocale = locale as Locale;
  const access = getRequestLocaleAccess(await headers());
  if (access && access !== "allowed") return { title: SITE_NAME, robots: { index: false, follow: false }, alternates: null };
  const publicTitle = title ? `${title} — ${SITE_NAME}` : SITE_NAME;
  const shared = localeMetadata({ service: "main", route: path, locale: currentLocale, title: title ?? "", serviceName: SITE_NAME, public: true, translatedLocales: availableLocales, description });

  return {
    ...(title ? { title } : {}),
    description,
    alternates: shared.alternates,
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
