import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/config";
import { siteMetadata, SITE_NAME } from "@/lib/site-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "site.auth" });
  return {
    ...await siteMetadata({
      locale: locale as Locale,
      path: "/login",
      title: t("login"),
      description: t("loginDescription"),
    }),
    title: { default: t("login"), template: `%s — ${SITE_NAME}` },
    robots: { index: false, follow: false },
    alternates: null,
  };
}

export default function LoginMetadataLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
