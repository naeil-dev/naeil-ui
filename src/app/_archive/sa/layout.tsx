import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/config";
import { siteMetadata } from "@/lib/site-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "sa" });
  const description = await getTranslations({ locale, namespace: "sa" });
  return siteMetadata({
    locale: locale as Locale,
    path: "/sa",
    title: t("name"),
    description: description("description"),
  });
}

export default function PageMetadataLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
