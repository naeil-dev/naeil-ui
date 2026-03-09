import { type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { updateSession } from "./lib/supabase/middleware";

const intlMiddleware = createIntlMiddleware(routing);

export default async function proxy(request: NextRequest) {
  // 1. Refresh Supabase session (updates auth cookies)
  const supabaseResponse = await updateSession(request);

  // 2. Run next-intl middleware for locale routing
  const intlResponse = intlMiddleware(request);

  // 3. Copy Supabase auth cookies onto the intl response
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
