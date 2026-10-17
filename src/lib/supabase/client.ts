import { createBrowserClient } from "@supabase/ssr";
import { siteCookieOptions, type SiteSessionBinding } from "../auth/site-session";

export function createClient(binding: SiteSessionBinding) {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      isSingleton: false,
      cookieOptions: siteCookieOptions(typeof window === "undefined" ? null : window.location.host, binding),
    },
  );
}
