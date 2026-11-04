"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
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
  return useSyncExternalStore(subscribe,
    () => loginDestination(`${window.location.pathname}${window.location.search}${window.location.hash}`),
    () => loginDestination(pathname));
}
