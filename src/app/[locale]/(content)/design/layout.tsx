import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/config";
import { siteMetadata } from "@/lib/site-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common" });
  const description = await getTranslations({ locale, namespace: "design" });
  return siteMetadata({
    locale: locale as Locale,
    path: "/design",
    title: t("design"),
    description: description("subtitle"),
  });
}

export default function PageMetadataLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
