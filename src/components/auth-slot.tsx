"use client";

import { useRef, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { unstable_rethrow } from "next/navigation";
import { toast } from "sonner";
import { getPathname, Link } from "@/i18n/routing";
import { useReturnLocation } from "./use-return-location";
import { NaeilHeaderAccountControl, type NaeilHeaderLocale } from "./naeil-header";
import { clearLocalSession, logout } from "@/app/[locale]/login/actions";

interface AuthUser {
  id: string;
  name?: string;
  email?: string;
}

/** Call above the header: Navigation renders its auth slot in two locations. */
export function useAuthSlot(user: AuthUser | null, sessionPresent = false) {
  const locale = useLocale() as NaeilHeaderLocale;
  const returnLocation = useReturnLocation();
  const t = useTranslations("auth");
  const [busy, startTransition] = useTransition();
  const inFlight = useRef(false);
  const leaveLocally = () => {
    if (inFlight.current || busy) return;
    inFlight.current = true;
    startTransition(async () => {
      try {
        await clearLocalSession();
        // Discard old RSC responses and browser Auth objects with the document.
        window.location.assign(getPathname({ href: "/", locale }));
      } catch {
        toast.error(t("localLogoutFailed"));
        inFlight.current = false;
      }
    });
  };
  return <NaeilHeaderAccountControl locale={locale} Link={Link} account={user || sessionPresent ? {
    status: "signed-in", displayName: user?.name || user?.email?.split("@")[0], email: user?.email,
    busy, onLogout: () => {
      if (inFlight.current || busy) return;
      inFlight.current = true;
      startTransition(async () => {
        try { await logout(locale); }
        catch (error) {
          unstable_rethrow(error); // Next's redirect remains framework-owned.
          toast.error(t("logoutFailed"), {
            description: t("localLogoutDescription"),
            action: { label: t("localLogout"), onClick: leaveLocally },
            // Long translated recovery text stays readable on narrow screens.
            style: { display: "grid", gridTemplateColumns: "auto minmax(0, 1fr)" },
            actionButtonStyle: { gridColumn: 2, marginLeft: 0, minHeight: 44, height: "auto", width: "100%", justifyContent: "center", whiteSpace: "normal" },
            duration: 15000,
          });
        }
        finally { inFlight.current = false; }
      });
    },
  } : { status: "signed-out", loginHref: `/login?next=${encodeURIComponent(returnLocation)}` }} />;
}

/** Compatibility for a standalone account control outside the shared header. */
export function AuthSlot({ user }: { user: AuthUser | null }) {
  return useAuthSlot(user);
}
