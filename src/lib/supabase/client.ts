import { createBrowserClient } from "@supabase/ssr";

const COOKIE_DOMAIN =
  typeof window !== "undefined" && window.location.hostname.endsWith(".naeil.dev")
    ? ".naeil.dev"
    : undefined;

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        domain: COOKIE_DOMAIN,
      },
    },
  );
}
