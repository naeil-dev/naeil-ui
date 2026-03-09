import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { updateSession } from "./lib/supabase/middleware";

const intlMiddleware = createIntlMiddleware(routing);

// Matches /sa/reports/<id> with optional locale prefix, but NOT /sa/reports
const PROTECTED_ROUTE = /^\/(?:(?:en|ko|ja)\/)?sa\/reports\/[^/]+/;

export default async function proxy(request: NextRequest) {
  // 1. Refresh Supabase session (updates auth cookies)
  const { response: supabaseResponse, user } = await updateSession(request);

  // 2. Check protected routes — redirect to login if unauthenticated
  const { pathname } = request.nextUrl;
  if (PROTECTED_ROUTE.test(pathname) && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Run next-intl middleware for locale routing
  const intlResponse = intlMiddleware(request);

  // 4. If visiting /login with a ?next param, store it in a cookie for post-OAuth redirect
  //    (cookies().set() doesn't work in Server Components, only in middleware/route handlers)
  const loginMatch = pathname.match(/^\/(?:(?:en|ko|ja)\/)?login$/);
  const nextParam = request.nextUrl.searchParams.get("next");
  if (loginMatch && nextParam) {
    intlResponse.cookies.set("auth_redirect_to", nextParam, {
      path: "/",
      maxAge: 600,
      httpOnly: true,
      sameSite: "lax",
    });
  }

  // 5. Copy Supabase auth cookies onto the intl response
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value);
  });

  return intlResponse;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next (Next.js internals)
     * - Static files (images, fonts, etc.)
     * - favicon.ico
     * - auth/callback (handled by route handler, not locale-prefixed)
     */
    "/((?!_next|auth/callback|.*\\..*|favicon\\.ico).*)",
  ],
};
