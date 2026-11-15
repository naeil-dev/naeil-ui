import { headers } from "next/headers";
import { getRequestLocaleAccess } from "@/naeil-locale/server";
import type { Metadata } from "next";
import { NaeilLocaleProvider } from "@/naeil-locale/client";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { notFound } from "next/navigation";
import { NaeilThemeProvider } from "@/naeil-locale/chrome";
import { Toaster } from "@/components/ui/sonner";
import { SiteAccessBoundary } from "@/components/site-access-boundary";
import { NavServerWrapper } from "@/components/nav-server-wrapper";
import { locales, type Locale } from "@/i18n/config";
import { siteMetadata, SITE_NAME } from "@/lib/site-metadata";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();
  const t = await getTranslations({ locale, namespace: "site.common" });
  const access = getRequestLocaleAccess(await headers());
  if (access && access !== "allowed") return {
    title: { default: SITE_NAME, template: `%s — ${SITE_NAME}` },
    robots: { index: false, follow: false },
    alternates: null,
  };
  return {
    ...await siteMetadata({
      locale: locale as Locale,
      description: t("description"),
    }),
    title: { default: SITE_NAME, template: `%s — ${SITE_NAME}` },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NaeilLocaleProvider locale={locale as Locale} messages={messages}>
      <NaeilThemeProvider>
        <NavServerWrapper>
          <SiteAccessBoundary>{children}</SiteAccessBoundary>
        </NavServerWrapper>
        <Toaster />
      </NaeilThemeProvider>
    </NaeilLocaleProvider>
  );
}
