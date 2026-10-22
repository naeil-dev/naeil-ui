import { createBrowserClient } from "@supabase/ssr";
import { siteCookieOptions } from "../auth/site-session";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: siteCookieOptions(typeof window === "undefined" ? null : window.location.host),
    },
  );
}
