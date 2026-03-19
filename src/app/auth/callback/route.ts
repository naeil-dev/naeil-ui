import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { getCookieDomainFromHost } from "@/lib/auth/cookie-domain";
import { isAllowedRedirect } from "@/lib/auth/redirect";

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

    let error: Error | null = null;
    try {
      const result = await supabase.auth.exchangeCodeForSession(code);
      error = result.error;
    } catch (e) {
      error = e instanceof Error ? e : new Error(String(e));
      console.error("[auth/callback] exchangeCodeForSession threw:", error.message);
    }

    if (error) {
      console.error("[auth/callback] session exchange failed:", error.message);
    }

    const redirectCookie = cookieStore.get("auth_redirect_to");

    if (!error) {
      // decodeURIComponent required: Next.js cookies.set() URL-encodes values,
      // but cookies.get() returns them raw (still encoded)
      const next = decodeURIComponent(redirectCookie?.value || "/");

      // Clear the redirect cookie
      cookieStore.set("auth_redirect_to", "", { path: "/", maxAge: 0, domain });

      // Redirect to original page
      if (isAllowedRedirect(next)) {
        const redirectUrl = next.startsWith("http") ? next : `${origin}${next}`;
        return NextResponse.redirect(redirectUrl);
      }
      console.warn("[auth/callback] blocked redirect to disallowed destination");
      return NextResponse.redirect(origin);
    }
  }

  // Auth error — redirect to login
  return NextResponse.redirect(`${origin}/login`);
}
