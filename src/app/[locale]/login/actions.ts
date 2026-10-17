"use server";

import { redirect } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

export async function logout(locale: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error("Sign out failed");
  redirect({ href: "/", locale });
}
