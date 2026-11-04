import { headers } from "next/headers";
import { getRequestLocaleAccess, localeRequestKind } from "@/naeil-locale/server";
import { SiteAccessRecovery } from "@/components/site-access-boundary";
import { localePath, assertLocale } from "@/naeil-locale";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  requiresPasswordChange,
  temporaryChangeExpired,
} from "@/lib/auth/password-policy";
import { PageTitle } from "@/components/typography";
import { CredentialForms } from "../credential-forms";
import { authEmailEnabled } from "@/lib/auth/feature-gates";

export async function generateMetadata() {
  const t = await getTranslations("site.auth");
  return { title: t("changePassword") };
}
export default async function PasswordChangePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = assertLocale((await params).locale);
  const requestHeaders = await headers();
  const access = getRequestLocaleAccess(requestHeaders);
  if (access && access !== "allowed") return null;
  const {
    data: { user },
    error,
  } = await (await createClient()).auth.getUser();
  if (!user || error) {
    if (localeRequestKind({ method: "GET", headers: requestHeaders }) === "rsc")
      return <SiteAccessRecovery locale={locale} access={error ? "unavailable" : "unauthenticated"} />;
    redirect(localePath("main", "/login", locale));
  }
  if (!requiresPasswordChange(user)) redirect(localePath("main", "/", locale));
  const t = await getTranslations("site.auth"),
    locked = temporaryChangeExpired(user);
  return (
    <div className="ui-app-frame min-h-[calc(100svh-var(--ui-navigation-height))] pb-16 pt-[calc(var(--ui-navigation-height)+var(--spacing-12-value))]">
      <div className="mx-auto max-w-(--ui-width-short-form) space-y-6">
        <PageTitle>{t("changePassword")}</PageTitle>
        <p className="text-muted-foreground">
          {t(locked ? "tempExpired" : "changeRequired")}
        </p>
        {!locked && <CredentialForms change emailEnabled={authEmailEnabled()} />}
      </div>
    </div>
  );
}
