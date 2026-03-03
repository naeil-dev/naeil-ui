import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { PageTitle } from "@/components/typography";

export default async function BlogPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <BlogContent />;
}

function BlogContent() {
  const t = useTranslations("blogPage");

  return (
    <section className="mx-auto max-w-4xl px-6 pb-24">
      <div className="mb-10">
        <PageTitle className="mb-3">{t("title")}</PageTitle>
        <p className="text-muted-foreground text-lg">{t("subtitle")}</p>
      </div>

      <div className="rounded-2xl border border-dashed border-border-subtle p-12 text-center">
        <p className="text-muted-foreground text-sm">{t("comingSoon")}</p>
      </div>
    </section>
  );
}
