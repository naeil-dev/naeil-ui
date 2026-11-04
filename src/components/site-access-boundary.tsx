import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { getRequestLocaleAccess } from "@/naeil-locale/server";
import { localePath, assertLocale, type NaeilLocale } from "@/naeil-locale";
import { PageTitle } from "./typography";

/** A display boundary only. Protected pages independently authenticate before reading data. */
export async function SiteAccessBoundary({ children }: { children: React.ReactNode }) {
  const access = getRequestLocaleAccess(await headers());
  if (!access || access === "allowed") return children;
  const locale = assertLocale(await getLocale());
  return <SiteAccessRecovery locale={locale} access={access} />;
}

export async function SiteAccessRecovery({ locale, access }: { locale: NaeilLocale; access: "unauthenticated" | "forbidden" | "unavailable" }) {
  const t = await getTranslations({ locale, namespace: "site.auth" });
  const change = access === "forbidden";
  return <section className="ui-app-frame py-24" data-naeil-access={access}>
    <div className="mx-auto max-w-(--ui-width-short-form) space-y-4">
      <PageTitle>{t(change ? "changePassword" : "login")}</PageTitle>
      <p role="alert">{t(change ? "changeRequired" : "credentialError")}</p>
      <a className="ui-focus inline-flex min-h-11 items-center underline" href={localePath("main", change ? "/login/change-password" : "/login", locale)} target="_blank" rel="noopener noreferrer">{t(change ? "changePassword" : "login")}</a>
    </div>
  </section>;
}
