"use server";

import { redirect } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { cookies, headers } from "next/headers";
import { authLocale, loginDestination } from "@/lib/auth/return-location";
import { RETURN_DESTINATION_COOKIE, RETURN_LOCALE_COOKIE, siteAuthCookiesToClear, siteCookieOptions } from "@/lib/auth/site-session";

/** Clears the shared .naeil.dev session, so every naeil.dev service is signed out. */
async function clearSiteCookies() {
  const cookieStore = await cookies();
  const host = (await headers()).get("host");
  for (const { name, options } of siteAuthCookiesToClear(cookieStore.getAll().map(c => c.name), host))
    cookieStore.set(name, "", { ...options, maxAge: 0 });
}

/** Next server actions enforce same-origin POST; capture return state at the login click. */
export async function prepareLogin(next: string, locale: string) {
  const cookieStore = await cookies();
  const { secure } = siteCookieOptions((await headers()).get("host"));
  const options = { path: "/", httpOnly: true, sameSite: "lax" as const, secure, maxAge: 600 };
  cookieStore.set(RETURN_DESTINATION_COOKIE, loginDestination(next), options);
  cookieStore.set(RETURN_LOCALE_COOKIE, authLocale(locale), options);
}

/** Explicit browser-local recovery only; this does not claim remote revocation. */
export async function clearLocalSession() {
  await clearSiteCookies();
}

export async function logout(locale: string) {
  const supabase = await createClient({ writeCookies: false });
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw new Error("Sign out failed");
  await clearSiteCookies();
  redirect({ href: "/", locale: authLocale(locale) });
}
