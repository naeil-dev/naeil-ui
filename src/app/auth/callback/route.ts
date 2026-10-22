import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { RETURN_DESTINATION_COOKIE, RETURN_LOCALE_COOKIE, isSiteSessionCookie, siteCookieOptions } from "@/lib/auth/site-session";
import { redirectCookieTarget } from "@/lib/auth/redirect";
import { loginDestination, loginErrorLocation } from "@/lib/auth/return-location";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const cookieStore = await cookies();
  const destination = loginDestination(redirectCookieTarget(cookieStore.get(RETURN_DESTINATION_COOKIE)?.value));
  const locale = cookieStore.get(RETURN_LOCALE_COOKIE)?.value;

  if (code) {
    const headerStore = await headers();
    const options = siteCookieOptions(headerStore.get("host"));
    // Exchange into a fresh session. A stale session's failed refresh makes the
    // SDK drop the PKCE verifier before the exchange; leftover chunks expire.
    const existing = cookieStore.getAll().filter(c => !isSiteSessionCookie(c.name));
    for (const { name } of cookieStore.getAll())
      if (isSiteSessionCookie(name)) cookieStore.set(name, "", { ...options, maxAge: 0 });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieOptions: options,
        cookies: {
          getAll() {
            return existing;
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options),
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
      cookieStore.set(RETURN_DESTINATION_COOKIE, "", { path: "/", maxAge: 0 });
      cookieStore.set(RETURN_LOCALE_COOKIE, "", { path: "/", maxAge: 0 });
      return NextResponse.redirect(new URL(destination, origin));
    }
  }

  // Auth error — redirect to login
  return NextResponse.redirect(loginErrorLocation(origin, destination, locale));
}
