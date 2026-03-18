import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { getCookieDomainFromHost } from "../auth/cookie-domain";

export async function createClient() {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const domain = getCookieDomainFromHost(headerStore.get("host"));

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, { ...options, domain }),
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
