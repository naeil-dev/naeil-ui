import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { CookieOptions } from "@supabase/ssr";
import { isSiteSessionCookie, isTerminalSessionError, siteCookieOptions } from "../auth/site-session";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });
  const pending = new Map<string, { name: string; value: string; options: CookieOptions }>();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: siteCookieOptions(request.headers.get("host")),
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // The SDK may remove a session before returning a non-retryable
          // gateway error. Commit only after classifying the actual outcome.
          cookiesToSet.forEach(cookie => pending.set(cookie.name, cookie));
        },
      },
    },
  );

  // Refresh the session — this calls Supabase Auth to validate/refresh tokens
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (!error || isTerminalSessionError(error)) {
    for (const { name, value } of pending.values()) request.cookies.set(name, value);
    supabaseResponse = NextResponse.next({ request });
    for (const { name, value, options } of pending.values())
      supabaseResponse.cookies.set(name, value, options);
  }

  // Temporary provider/gateway failures must not erase a recoverable session.
  if (isTerminalSessionError(error) && !user) {
    request.cookies.getAll().forEach(({ name }) => {
      if (isSiteSessionCookie(name)) {
        supabaseResponse.cookies.set(name, "", { ...siteCookieOptions(request.headers.get("host")), maxAge: 0 });
      }
    });
  }

  return { response: supabaseResponse, user: error ? null : user, unavailable: !!error && !isTerminalSessionError(error) };
}
