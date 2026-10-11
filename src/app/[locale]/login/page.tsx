import { Logo } from "@/components/logo";
import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { OAuthButtons } from "./oauth-buttons";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale } = await params;
  const { next } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect({ href: next || "/", locale });
  }

  const t = await getTranslations("auth");

  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Branding */}
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <Logo size={40} />
          </div>
          <h1 className="text-foreground text-2xl font-semibold tracking-tight">
            {t("login")}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {t("loginDescription")}
          </p>
        </div>

        {/* OAuth buttons */}
        <OAuthButtons next={next} />
      </div>
    </div>
  );
}
