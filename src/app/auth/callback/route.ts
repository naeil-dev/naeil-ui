import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { currentSiteCookies, siteCookieOptions, siteReturnCookieNames, siteSessionBinding } from "@/lib/auth/site-session";
import { redirectCookieTarget } from "@/lib/auth/redirect";
import { loginDestination, loginErrorLocation } from "@/lib/auth/return-location";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const cookieStore = await cookies();
  const binding = siteSessionBinding(cookieStore.getAll());
  const returnCookies = binding ? siteReturnCookieNames(binding) : null;
  const destination = loginDestination(redirectCookieTarget(returnCookies ? cookieStore.get(returnCookies.destination)?.value : undefined));
  const locale = returnCookies ? cookieStore.get(returnCookies.locale)?.value : undefined;

  if (code && binding && returnCookies) {
    const headerStore = await headers();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieOptions: siteCookieOptions(headerStore.get("host"), binding),
        cookies: {
          getAll() {
            return currentSiteCookies(cookieStore.getAll(), binding);
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, { ...options, domain: undefined }),
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
      // A late response must never clear a newer login attempt's return state.
      cookieStore.set(returnCookies.destination, "", { path: "/", maxAge: 0 });
      cookieStore.set(returnCookies.locale, "", { path: "/", maxAge: 0 });
      return NextResponse.redirect(new URL(destination, origin));
    }
  }

  // Auth error — redirect to login
  return NextResponse.redirect(loginErrorLocation(origin, destination, locale));
}
