"use client";

import { useCallback, useEffect } from "react";
import { useSiteState, useSiteSession, useSiteStore } from "./site-session-state";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import Link from "next/link";
import { assertLocale, localePath } from "@/naeil-locale";
import { useReturnLocation } from "./use-return-location";
import { NaeilHeaderAccountControl, type NaeilHeaderLocale } from "@/naeil-locale/chrome";
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
  const t = useTranslations("site.auth");
  const store = useSiteStore();
  useSiteSession(user?.id ?? (sessionPresent ? undefined : null));
  const [state, setState, request] = useSiteState<{ busy: boolean; error: "remote" | "local" | null }>("account-request", { busy: false, error: null });
  const signOut = useCallback(async (local: boolean) => {
    if (!request.active || request.get().busy) return;
    setState({ busy: true, error: null });
    try {
      if (local) await clearLocalSession(); else await logout();
      if (!request.active) return;
      const target = localePath("main", "/", assertLocale(document.documentElement.lang));
      store.resetSession();
      // Explicit logout discards credentials and pending work before navigation.
      window.location.assign(target);
    } catch {
      if (request.active) setState({ busy: false, error: local ? "local" : "remote" });
    }
  }, [request, setState, store]);
  const leaveLocally = useCallback(() => { void signOut(true); }, [signOut]);
  useEffect(() => {
    if (!state.error) return;
    const id = "site-account-error";
    if (state.error === "local") toast.error(t("localLogoutFailed"), { id });
    else toast.error(t("logoutFailed"), {
      id,
      description: t("localLogoutDescription"),
      action: { label: t("localLogout"), onClick: leaveLocally },
      style: { display: "grid", gridTemplateColumns: "auto minmax(0, 1fr)" },
      actionButtonStyle: { gridColumn: 2, marginLeft: 0, minHeight: 44, height: "auto", width: "100%", justifyContent: "center", whiteSpace: "normal" },
      duration: 15000,
    });
    return () => { toast.dismiss(id); };
  }, [state.error, t, leaveLocally]);
  return <NaeilHeaderAccountControl locale={locale} Link={Link} account={user || sessionPresent ? {
    status: "signed-in", displayName: user?.name || user?.email?.split("@")[0], email: user?.email,
    busy: state.busy, onLogout: () => { void signOut(false); },
  } : { status: "signed-out", loginHref: localePath("main", `/login?next=${encodeURIComponent(returnLocation)}`, locale) }} />;
}

/** Compatibility for a standalone account control outside the shared header. */
export function AuthSlot({ user }: { user: AuthUser | null }) {
  return useAuthSlot(user);
}
