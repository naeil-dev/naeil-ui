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

    // DEBUG: log all cookies to trace PKCE code_verifier
    const allCookies = cookieStore.getAll();
    console.log("[auth/callback] cookies received:", allCookies.map(c => `${c.name}=${c.value.slice(0, 20)}...`));
    console.log("[auth/callback] code:", code.slice(0, 20) + "...");

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            console.log("[auth/callback] setAll called with:", cookiesToSet.map(c => c.name));
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, { ...options, domain }),
              );
            } catch (e) {
              console.error("[auth/callback] setAll error:", e);
            }
          },
        },
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[auth/callback] session exchange failed:", error.message, error);
    }

    const redirectCookie = cookieStore.get("auth_redirect_to");
    console.log("[auth/callback] exchange result:", { error: error?.message, redirectCookie: redirectCookie?.value });

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
