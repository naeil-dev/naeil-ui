import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getCookieDomainFromHost } from "../auth/cookie-domain";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const domain = getCookieDomainFromHost(request.headers.get("host"));

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, { ...options, domain }),
          );
        },
      },
    },
  );

  // Refresh the session — this calls Supabase Auth to validate/refresh tokens
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // If refresh token is invalid/expired, clear stale auth cookies
  // so they don't interfere with new login attempts (PKCE flow)
  if (error && !user) {
    const cookiePrefix = "sb-" + (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/^https?:\/\//, "").split(".")[0] + "-auth-token";
    request.cookies.getAll().forEach(({ name }) => {
      if (name.startsWith(cookiePrefix)) {
        supabaseResponse.cookies.delete({
          name,
          path: "/",
          domain: domain ?? undefined,
        });
      }
    });
  }

  return { response: supabaseResponse, user };
}
