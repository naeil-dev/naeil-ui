import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { hasSiteSession, siteCookieOptions } from "../auth/site-session";

export async function hasLocalSession() {
  return hasSiteSession((await cookies()).getAll());
}

export async function createClient({ writeCookies = true }: { writeCookies?: boolean } = {}) {
  const cookieStore = await cookies();
  const headerStore = await headers();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: siteCookieOptions(headerStore.get("host")),
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // Logout decides whether to clear only after the SDK's final result.
          // Failed refresh can otherwise delete recoverable cookies too early.
          if (!writeCookies) return;
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    },
  );
}
