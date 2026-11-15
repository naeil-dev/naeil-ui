import { getLocale, getTranslations } from "next-intl/server";
import NextLink from "next/link";
import { PageHeader } from "@/components/typography";
import { localePath, assertLocale } from "@/naeil-locale";

/** LocaleLayout owns the shell even when a blog post is missing. */
export default async function NotFound() {
  const locale = assertLocale(await getLocale());
  const t = await getTranslations({ locale, namespace: "site.notFound" });
  return <section data-ui-layout="reading" data-site-not-found>
    <title>{`${t("title")} — .naeil`}</title>
    <PageHeader className="[&_h1]:text-balance" title={t("title")} description={t("description")} />
    <NextLink className="ui-focus inline-flex min-h-11 items-center underline underline-offset-4" href={localePath("main", "/", locale)}>{t("backHome")}</NextLink>
  </section>;
}
