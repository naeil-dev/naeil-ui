import { requiresPasswordChange, passwordChangePath, type AuthUser } from "@/lib/auth/password-policy";
import { NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
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
    // Hide the stale session: a failed refresh would make the SDK drop the PKCE
    // verifier before exchange. Stage writes so a bad code cannot clear a session.
    const original = cookieStore.getAll();
    const existing = original.filter(c => !isSiteSessionCookie(c.name));
    const pending: { name: string; value: string; options: CookieOptions }[] = [];

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
            pending.push(...cookiesToSet);
          },
        },
      },
    );

    let failed = false;
    let target = destination;
    try {
      const result = await supabase.auth.exchangeCodeForSession(code);
      failed = !!result.error;
      const user = result.data?.user as AuthUser | undefined;
      if (user && requiresPasswordChange(user)) target = passwordChangePath(locale);
    } catch {
      failed = true;
    }

    if (!failed) {
      // Expire old chunks before writing the replacement, which may be shorter.
      for (const { name } of original)
        if (isSiteSessionCookie(name)) cookieStore.set(name, "", { ...options, maxAge: 0 });
      for (const { name, value, options } of pending) cookieStore.set(name, value, options);
      cookieStore.set(RETURN_DESTINATION_COOKIE, "", { path: "/", maxAge: 0 });
      cookieStore.set(RETURN_LOCALE_COOKIE, "", { path: "/", maxAge: 0 });
      return NextResponse.redirect(new URL(target, origin));
    }
  }

  // Auth error — redirect to login
  return NextResponse.redirect(loginErrorLocation(origin, destination, locale));
}
