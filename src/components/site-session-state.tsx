"use client";

import { createContext, useContext, useLayoutEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { resolveLocaleUrl } from "@/naeil-locale";
import { useLocaleBeforeUnload } from "@/naeil-locale/client";
import { createSiteState } from "@/lib/auth/site-state";

const Context = createContext<ReturnType<typeof createSiteState> | null>(null);

/** Root lifetime, above [locale]. A language remount keeps fields and request locks. */
export function SiteSessionStateProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createSiteState);
  const pathname = usePathname();
  const route = resolveLocaleUrl("main", pathname);
  const logicalPath = route.kind === "ui" ? route.logicalPath : pathname;
  useLayoutEffect(() => { store.enterRoute(logicalPath); }, [logicalPath, store]);
  useLocaleBeforeUnload(() => store.unsafeToLeave());
  return <Context.Provider value={store}>{children}</Context.Provider>;
}

export function useSiteStore() {
  const store = useContext(Context);
  if (!store) throw new Error("SiteSessionStateProvider must be above locale routes");
  return store;
}

export function useSiteState<T>(key: string, initial: T, route?: string, unsafe?: (value: T) => boolean, scope?: string) {
  const store = useSiteStore();
  const cell = store.cell(key, initial, route, unsafe, scope);
  useLayoutEffect(() => { if (route !== undefined && scope !== undefined) store.enterScope(route, scope); }, [route, scope, store]);
  const value = useSyncExternalStore(cell.subscribe, cell.get, cell.get);
  return [value, cell.set, cell] as const;
}

export function useSiteSession(identity: string | null | undefined) {
  const store = useContext(Context);
  if (!store) throw new Error("SiteSessionStateProvider must be above locale routes");
  // A temporary auth dependency failure is not an account change.
  useLayoutEffect(() => { if (identity !== undefined) store.observeSession(identity); }, [identity, store]);
}

export interface CredentialDraft {
  email: string;
  password: string;
  current_password: string;
  confirm: string;
  nonce: string;
  busy: boolean;
  status: string;
}
export function useCredentialDraft(change: boolean, destination: string) {
  const route = change ? "/login/change-password" : "/login";
  const state = useSiteState<CredentialDraft>(`credentials:${route}:${destination}`, {
    email: "", password: "", current_password: "", confirm: "", nonce: "", busy: false, status: "",
  }, route, value => value.busy || !!(value.email || value.password || value.current_password || value.confirm || value.nonce), destination);
  const [draft, , cell] = state;
  return [draft, state[1], cell] as const;
}
