import { createClient } from "@/lib/supabase/server";
import { NavWrapper } from "./nav-wrapper";

export async function NavServerWrapper() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const authUser = user
    ? {
        id: user.id,
        name:
          (user.user_metadata?.full_name as string) ||
          (user.user_metadata?.name as string) ||
          undefined,
        email: user.email,
      }
    : null;

  return <NavWrapper user={authUser} />;
}
