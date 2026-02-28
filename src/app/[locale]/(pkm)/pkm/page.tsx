import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";

export default async function PKMPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <PKMContent />;
}

function PKMContent() {
  const t = useTranslations("pkm");

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground text-sm">{t("placeholder")}</p>
    </main>
  );
}
