"use client";

import { useRef, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { unstable_rethrow } from "next/navigation";
import { toast } from "sonner";
import { Link, usePathname } from "@/i18n/routing";
import { NaeilHeaderAccountControl, type NaeilHeaderLocale } from "./naeil-header";
import { logout } from "@/app/[locale]/login/actions";

interface AuthUser {
  id: string;
  name?: string;
  email?: string;
}

/** Call above the header: Navigation renders its auth slot in two locations. */
export function useAuthSlot(user: AuthUser | null) {
  const locale = useLocale() as NaeilHeaderLocale;
  const pathname = usePathname();
  const t = useTranslations("auth");
  const [busy, startTransition] = useTransition();
  const inFlight = useRef(false);
  return <NaeilHeaderAccountControl locale={locale} Link={Link} account={user ? {
    status: "signed-in", displayName: user.name || user.email?.split("@")[0], email: user.email,
    busy, onLogout: () => {
      if (inFlight.current || busy) return;
      inFlight.current = true;
      startTransition(async () => {
        try { await logout(locale); }
        catch (error) {
          unstable_rethrow(error); // Next's redirect remains framework-owned.
          toast.error(t("logoutFailed"));
        }
        finally { inFlight.current = false; }
      });
    },
  } : { status: "signed-out", loginHref: `/login?next=${encodeURIComponent(pathname)}` }} />;
}

/** Compatibility for a standalone account control outside the shared header. */
export function AuthSlot({ user }: { user: AuthUser | null }) {
  return useAuthSlot(user);
}
