import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { PageTitle } from "@/components/typography";
import Image from "next/image";

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
    <>
      <section className="mx-auto max-w-4xl px-6 pb-16">
        <div className="flex flex-col-reverse items-start gap-8 md:flex-row md:items-start md:justify-between">
          <div className="flex-1">
            <PageTitle className="mb-3">{t("title")}</PageTitle>
            <p className="text-muted-foreground mb-5 max-w-lg text-lg leading-relaxed">
              {t("subtitle")}
            </p>
            <div className="mb-6 flex flex-wrap gap-2">
              {[
                "Deep Dive",
                "Research",
                "Build Logs",
              ].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border-subtle px-2.5 py-1 text-[11px] text-zinc-500"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="flex-shrink-0">
            <Image
              src="/images/diver.png"
              alt=""
              width={220}
              height={220}
              className="animate-float object-contain"
              style={{
                filter:
                  "drop-shadow(0 4px 12px color-mix(in oklch, var(--project-naeilUi) 15%, transparent))",
              }}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-24">
        <div className="rounded-2xl border border-dashed border-border-subtle p-12 text-center">
          <p className="text-muted-foreground text-sm">{t("comingSoon")}</p>
        </div>
      </section>
    </>
  );
}
