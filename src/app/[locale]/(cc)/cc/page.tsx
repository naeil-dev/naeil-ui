import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";

export default async function CCPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <CCContent />;
}

function CCContent() {
  const t = useTranslations("cc");

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground text-sm">{t("placeholder")}</p>
    </main>
  );
}
