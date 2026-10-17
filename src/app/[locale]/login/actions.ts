"use server";

import { redirect } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";
import { cookies, headers } from "next/headers";
import { authLocale, loginDestination } from "@/lib/auth/return-location";
import { SITE_AUTH_EPOCH, SITE_AUTH_GENERATION, isOwnedSiteAuthCookie, isOwnedSiteReturnCookie, siteCookieOptions, siteReturnCookieNames, siteSessionEpoch } from "@/lib/auth/site-session";

const freshId = () => crypto.randomUUID().replaceAll("-", "");

async function clearSiteCookies(advanceEpoch: boolean) {
  const cookieStore = await cookies();
  const { secure, path, sameSite } = siteCookieOptions((await headers()).get("host"));
  for (const { name } of cookieStore.getAll()) {
    if (isOwnedSiteAuthCookie(name) || isOwnedSiteReturnCookie(name))
      cookieStore.set(name, "", { secure, path, sameSite, maxAge: 0 });
  }
  if (advanceEpoch) cookieStore.set(SITE_AUTH_EPOCH, freshId(), { secure, path, sameSite, httpOnly: true, maxAge: 34560000 });
}

/** Next server actions enforce same-origin POST; capture return state at the login click. */
export async function prepareLogin(next: string, locale: string) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const { secure } = siteCookieOptions(headerStore.get("host"));
  const epoch = siteSessionEpoch(cookieStore.getAll());
  const generation = freshId();
  const binding = { generation, epoch };
  const returnCookies = siteReturnCookieNames(binding);
  await clearSiteCookies(false);
  cookieStore.set(SITE_AUTH_GENERATION, generation, { path: "/", httpOnly: true, sameSite: "lax", secure, maxAge: 34560000 });
  const options = { path: "/", httpOnly: true, sameSite: "lax" as const, secure, maxAge: 600 };
  cookieStore.set(returnCookies.destination, loginDestination(next), options);
  cookieStore.set(returnCookies.locale, authLocale(locale), options);
  return binding;
}

/** Explicit browser-local recovery only; this does not claim remote revocation. */
export async function clearLocalSession() {
  await clearSiteCookies(true);
}

export async function logout(locale: string) {
  const supabase = await createClient({ writeCookies: false });
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw new Error("Sign out failed");
  await clearSiteCookies(true);
  redirect({ href: "/", locale: authLocale(locale) });
}
