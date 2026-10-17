import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { updateSession } from "./lib/supabase/middleware";
import { isProtectedReportRoute } from "./lib/auth/routes";
import { invitationProxyResponse } from "./lib/auth/invite-proxy";

const intlMiddleware = createIntlMiddleware(routing);

export default async function proxy(request: NextRequest) {
  if (["/auth/invite", "/auth/invite/"].includes(request.nextUrl.pathname)) {
    return invitationProxyResponse(request);
  }
  // 1. Refresh Supabase session (updates auth cookies)
  const { response: supabaseResponse, user, unavailable } = await updateSession(request);

  // 2. Capture URL info BEFORE intl middleware (which may mutate request.nextUrl)
  const { pathname } = request.nextUrl;

  // 3. Check protected routes — redirect to login if unauthenticated
  if (isProtectedReportRoute(pathname) && !user) {
    if (unavailable) return new NextResponse("Authentication is temporarily unavailable. Please retry.", {
      status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "30", "Content-Type": "text/plain; charset=utf-8" },
    });
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    const response = NextResponse.redirect(loginUrl);
    supabaseResponse.cookies
      .getAll()
      .forEach((cookie) => response.cookies.set(cookie));
    return response;
  }

  // 4. Run next-intl middleware for locale routing
  const intlResponse = intlMiddleware(request);

  // Login return state is written only by prepareLogin on the provider click.
  // A background link prefetch must not replace an active callback destination.

  // 5. Copy Supabase auth cookies onto the intl response
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
