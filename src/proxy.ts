import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { updateSession } from "./lib/supabase/middleware";
import { isProtectedReportRoute } from "./lib/auth/routes";
import { canonicalRedirect } from "./lib/auth/redirect";
import { invitationProxyResponse } from "./lib/auth/invite-proxy";

const intlMiddleware = createIntlMiddleware(routing);

export default async function proxy(request: NextRequest) {
  if (["/auth/invite", "/auth/invite/"].includes(request.nextUrl.pathname)) {
    return invitationProxyResponse(request);
  }
  // 1. Refresh Supabase session (updates auth cookies)
  const { response: supabaseResponse, user } = await updateSession(request);

  // 2. Capture URL info BEFORE intl middleware (which may mutate request.nextUrl)
  const { pathname } = request.nextUrl;
  const nextParam = request.nextUrl.searchParams.get("next");

  // 3. Check protected routes — redirect to login if unauthenticated
  if (isProtectedReportRoute(pathname) && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    const response = NextResponse.redirect(loginUrl);
    supabaseResponse.cookies
      .getAll()
      .forEach((cookie) => response.cookies.set(cookie));
    return response;
  }

  // 4. Run next-intl middleware for locale routing
  const intlResponse = intlMiddleware(request);

  // 5. If visiting /login with a ?next param, store it in a cookie for post-OAuth redirect
  //    Skip if next points back to /login itself (RSC refetch sends next=/login which overwrites the real value)
  const loginMatch = pathname.match(/^\/(?:(?:en|ko|ja)\/)?login$/);
  const isLoginSelf = nextParam?.replace(/^\/(?:en|ko|ja)\//, "/") === "/login";
  const destination = canonicalRedirect(nextParam);
  if (loginMatch && destination && !isLoginSelf) {
    intlResponse.cookies.set("auth_redirect_to", destination, {
      path: "/",
      maxAge: 600,
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
    });
  }

  // 6. Copy Supabase auth cookies onto the intl response
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie);
  });

  return intlResponse;
}

export const config = {
  matcher: [
    "/auth/invite",
    "/auth/invite/",
    /*
     * Match all paths except:
     * - _next (Next.js internals)
     * - Static files (images, fonts, etc.)
     * - favicon.ico
     * - auth/callback (handled by route handler, not locale-prefixed)
     */
    "/((?!_next|api/|auth/|.*\\..*|favicon\\.ico).*)",
  ],
};
