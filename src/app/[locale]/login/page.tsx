import { Logo } from "@/components/logo";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OAuthButtons } from "./oauth-buttons";
import { PageTitle } from "@/components/typography";
import { loginDestination } from "@/lib/auth/return-location";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  await params;
  const { next, error } = await searchParams;
  const destination = loginDestination(next);

  const supabase = await createClient();
  const {
    data: { user }, error: authError,
  } = await supabase.auth.getUser();

  if (user && !authError) {
    // The validated return URL already contains its locale prefix.
    redirect(destination);
  }

  const t = await getTranslations("auth");

  return (
    <div className="flex min-h-[calc(100svh-var(--ui-navigation-height))] items-center justify-center px-6 py-16">
      <div className="w-full max-w-(--ui-width-short-form) space-y-8">
        {/* Branding */}
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <Logo size={40} />
          </div>
          <PageTitle>{t("login")}</PageTitle>
          <p className="text-muted-foreground mt-3 text-base">
            {t("loginDescription")}
          </p>
        </div>

        {/* OAuth buttons */}
        <OAuthButtons next={destination} initialError={error === "auth"} />
      </div>
    </div>
  );
}
