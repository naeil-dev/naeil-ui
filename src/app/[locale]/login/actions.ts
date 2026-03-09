"use server";

import { redirect } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

export async function logout(locale: string) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect({ href: "/", locale });
}
