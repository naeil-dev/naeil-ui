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
  const t = await getTranslations("auth");
  return { title: `${t("changePassword")} — .naeil` };
}
export default async function PasswordChangePage() {
  const {
    data: { user },
    error,
  } = await (await createClient()).auth.getUser();
  if (!user || error) redirect("/login");
  if (!requiresPasswordChange(user)) redirect("/");
  const t = await getTranslations("auth"),
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
