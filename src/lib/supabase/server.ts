import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { currentSiteCookies, hasSiteSession, siteCookieOptions, siteSessionBinding } from "../auth/site-session";

export async function hasLocalSession() {
  const values = (await cookies()).getAll();
  return hasSiteSession(values, siteSessionBinding(values));
}

export async function createClient({ writeCookies = true }: { writeCookies?: boolean } = {}) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const binding = siteSessionBinding(cookieStore.getAll());

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: siteCookieOptions(headerStore.get("host"), binding),
      cookies: {
        getAll() {
          return currentSiteCookies(cookieStore.getAll(), binding);
        },
        setAll(cookiesToSet) {
          // Logout decides whether to clear only after the SDK's final result.
          // Failed refresh can otherwise delete recoverable cookies too early.
          if (!writeCookies) return;
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, { ...options, domain: undefined }),
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
