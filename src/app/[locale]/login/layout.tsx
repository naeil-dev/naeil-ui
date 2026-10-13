import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/config";
import { siteMetadata } from "@/lib/site-metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return {
    ...siteMetadata({
      locale: locale as Locale,
      path: "/login",
      title: t("login"),
      description: t("loginDescription"),
    }),
    robots: { index: false, follow: false },
  };
}

export default function LoginMetadataLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
