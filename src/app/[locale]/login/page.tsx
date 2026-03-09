import { getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { cookies } from "next/headers";
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

  // Store return URL in cookie for post-OAuth redirect
  if (next) {
    const cookieStore = await cookies();
    cookieStore.set("auth_redirect_to", next, {
      path: "/",
      maxAge: 600,
      httpOnly: true,
      sameSite: "lax",
    });
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

function Logo({ size = 40 }: { size?: number }) {
  const id = "login-logo";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="naeil"
    >
      <path
        d="M6 4 L6 16 L20 16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <circle
        cx="15"
        cy="16"
        r="3.5"
        fill={`url(#${id}-grad)`}
        mask={`url(#${id})`}
      />
      <defs>
        <linearGradient id={`${id}-grad`} x1="15" y1="12.5" x2="15" y2="16">
          <stop stopColor="#eab308" />
          <stop offset="1" stopColor="#dc2626" />
        </linearGradient>
        <mask id={id}>
          <rect x="0" y="0" width="24" height="16" fill="white" />
        </mask>
      </defs>
    </svg>
  );
}
