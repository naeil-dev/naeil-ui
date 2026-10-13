import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import {
  getMessages,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";
import { notFound } from "next/navigation";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { NavServerWrapper } from "@/components/nav-server-wrapper";
import { FooterWrapper } from "@/components/footer-wrapper";
import { DocumentLocale } from "@/components/document-locale";
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
  const t = await getTranslations({ locale, namespace: "common" });
  return {
    ...siteMetadata({
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
  const t = await getTranslations("common");

  return (
    <NextIntlClientProvider messages={messages}>
      <DocumentLocale locale={locale} />
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <a
          href="#main-content"
          className="ui-focus fixed -top-24 left-6 z-[100] rounded-md bg-background px-4 py-3 text-base text-foreground focus:top-3"
        >
          {t("skipToContent")}
        </a>
        <NavServerWrapper />
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <FooterWrapper />
        <Toaster />
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
