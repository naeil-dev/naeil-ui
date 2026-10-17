"use client";

import { useSyncExternalStore } from "react";
import { useLocale } from "next-intl";
import { usePathname } from "@/i18n/routing";
import { defaultLocale } from "@/i18n/config";
import { loginDestination } from "@/lib/auth/return-location";

function subscribe(listener: () => void) {
  window.addEventListener("popstate", listener);
  window.addEventListener("hashchange", listener);
  return () => {
    window.removeEventListener("popstate", listener);
    window.removeEventListener("hashchange", listener);
  };
}

/** Real localized URL, including query/hash and native modified-click hrefs. */
export function useReturnLocation() {
  const pathname = usePathname();
  const locale = useLocale();
  return useSyncExternalStore(subscribe,
    () => loginDestination(`${window.location.pathname}${window.location.search}${window.location.hash}`),
    () => loginDestination(locale === defaultLocale ? pathname : `/${locale}${pathname === "/" ? "" : pathname}`));
}
