import { createClient, hasLocalSession } from "@/lib/supabase/server";
import { isTerminalSessionError } from "@/lib/auth/site-session";
import { NavWrapper } from "./nav-wrapper";

export async function NavServerWrapper() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  const display = (value: unknown, limit: number) => typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, limit) || undefined
    : undefined;

  const authUser = user && !error
    ? {
        id: user.id,
        name:
          display(user.user_metadata?.full_name, 160) ||
          display(user.user_metadata?.name, 160),
        email: display(user.email, 254),
      }
    : null;

  const sessionPresent = !!error && !isTerminalSessionError(error) && await hasLocalSession();
  return <NavWrapper user={authUser} sessionPresent={sessionPresent} />;
}
