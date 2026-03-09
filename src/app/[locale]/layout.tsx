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
import { locales, type Locale } from "@/i18n/config";

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common" });
  return {
    title: t("appName"),
    description: "Personal projects by Jay",
    alternates: {
      canonical: `https://naeil.dev/${locale}`,
      languages: {
        en: "https://naeil.dev/en",
        ko: "https://naeil.dev/ko",
        ja: "https://naeil.dev/ja",
        "x-default": "https://naeil.dev/en",
      },
    },
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
    <NextIntlClientProvider messages={messages}>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <NavServerWrapper />
        <main>{children}</main>
        <FooterWrapper />
        <Toaster />
      </ThemeProvider>
    </NextIntlClientProvider>
  );
}
