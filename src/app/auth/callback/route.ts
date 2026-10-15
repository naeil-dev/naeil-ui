import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { getCookieDomainFromHost } from "@/lib/auth/cookie-domain";
import { redirectCookieTarget } from "@/lib/auth/redirect";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const cookieStore = await cookies();
    const headerStore = await headers();
    const domain = getCookieDomainFromHost(headerStore.get("host"));

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, { ...options, domain }),
              );
            } catch {
              // Ignore — cookies can only be set in Server Actions or Route Handlers
            }
          },
        },
      },
    );

    let failed = false;
    try {
      const result = await supabase.auth.exchangeCodeForSession(code);
      failed = !!result.error;
    } catch {
      failed = true;
    }

    if (!failed) {
      const next = redirectCookieTarget(
        cookieStore.get("auth_redirect_to")?.value,
      );
      // Match the host-only scope used when the return cookie is created.
      cookieStore.set("auth_redirect_to", "", { path: "/", maxAge: 0 });
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  // Auth error — redirect to login
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
