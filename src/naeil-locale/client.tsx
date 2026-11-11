"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { NaeilMessagesProvider } from "../components/naeil-messages-context";
import { assertLocale, localePath, resolveLocaleUrl, type LocaleServiceInput, type NaeilLocale } from "./routing";
import { createLocaleIntentGate, type LocaleIntent } from "./intent";
import { writeLocalePreference } from "./preference";
import type { LocaleMessages, SharedMessages } from "./messages";

export type LocaleTransitionError = "timeout" | "navigation-failed" | "unsupported-route";
export interface LocaleChangeOptions {
  /** A locale-neutral registered route, e.g. a translated blog listing fallback. */
  route?: string;
  /** Alternatively supply a fully built same-service canonical destination. */
  href?: string;
}
interface FocusSnapshot { attribute: "data-naeil-focus-id" | "id" | "name"; value: string; start?: number | null; end?: number | null; direction?: "forward" | "backward" | "none" | null }
function captureFocus(): FocusSnapshot | undefined {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return;
  if (active.closest("[data-naeil-locale-menu]")) return { attribute: "data-naeil-focus-id", value: "locale-control" };
  const attribute = (["data-naeil-focus-id", "id", "name"] as const).find(key => active.hasAttribute(key));
  if (!attribute) return;
  const snapshot: FocusSnapshot = { attribute, value: active.getAttribute(attribute)! };
  if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
    snapshot.start = active.selectionStart; snapshot.end = active.selectionEnd; snapshot.direction = active.selectionDirection;
  }
  return snapshot;
}
function restoreFocus(snapshot: FocusSnapshot | undefined): void {
  if (!snapshot) return;
  const element = Array.from(document.querySelectorAll<HTMLElement>(`[${snapshot.attribute}]`)).find(node => node.getAttribute(snapshot.attribute) === snapshot.value && node.getClientRects().length > 0);
  if (!element) return;
  element.focus({ preventScroll: true });
  if ((element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) && snapshot.start !== undefined && snapshot.start !== null && snapshot.end !== undefined && snapshot.end !== null) {
    try { element.setSelectionRange(snapshot.start, snapshot.end, snapshot.direction ?? undefined); } catch { /* Non-text inputs do not support selection ranges. */ }
  }
}
function browserHref(): string { return window.location.pathname + window.location.search + window.location.hash; }

export interface LocaleController {
  pending: boolean;
  intent: LocaleIntent | undefined;
  error: LocaleTransitionError | undefined;
  changeLocale: (locale: NaeilLocale, options?: LocaleChangeOptions) => boolean;
  retry: () => boolean;
  cancel: () => void;
}
interface ControllerContext extends LocaleController {
  service: LocaleServiceInput;
  arrive: (token: number | undefined, locale: NaeilLocale, pathname: string) => void;
  registerDepartureGuard: (guard: () => boolean) => () => void;
}
const LocaleControllerContext = createContext<ControllerContext | null>(null);
export interface NaeilLocaleControllerProps {
  service: LocaleServiceInput;
  children: ReactNode;
  /** Activate only after the receiver/auth rollout receipts are complete. */
  preferenceWritesEnabled?: boolean;
  transitionTimeoutMs?: number;
}

/** Lives in app/layout above [locale] and above remounting presentation. */
export function NaeilLocaleController({ service, children, preferenceWritesEnabled = false, transitionTimeoutMs = 20000 }: NaeilLocaleControllerProps) {
  const router = useRouter();
  const pathname = usePathname();
  // The controller belongs to one service for its root-layout lifetime. A new
  // serialized inventory object from RSC must not reset an in-flight token.
  const [gate] = useState(() => createLocaleIntentGate(service));
  const [intent, setIntent] = useState<LocaleIntent>();
  const [error, setError] = useState<LocaleTransitionError>();
  const lastRequest = useRef<{ locale: NaeilLocale; options?: LocaleChangeOptions } | undefined>(undefined);
  const timedOutIntent = useRef<LocaleIntent | undefined>(undefined);
  const focus = useRef<FocusSnapshot | undefined>(undefined);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const guards = useRef(new Set<() => boolean>());
  const clearTimer = useCallback(() => { if (timer.current !== undefined) clearTimeout(timer.current); timer.current = undefined; }, []);
  const cancel = useCallback(() => { gate.cancel(); timedOutIntent.current = undefined; clearTimer(); setIntent(undefined); setError(undefined); focus.current = undefined; }, [gate, clearTimer]);
  const fail = useCallback((token: number, reason: LocaleTransitionError) => {
    if (gate.current()?.token !== token) return;
    // Releasing the request lock cannot cancel Next's in-flight navigation.
    timedOutIntent.current = reason === "timeout" ? gate.current() : undefined;
    gate.cancel(token); clearTimer(); setIntent(undefined); setError(reason);
  }, [gate, clearTimer]);
  const changeLocale = useCallback((language: NaeilLocale, options?: LocaleChangeOptions): boolean => {
    const locale = assertLocale(language);
    if (gate.current()) return false;
    lastRequest.current = { locale, options: options ? { ...options } : undefined };
    timedOutIntent.current = undefined;
    const current = resolveLocaleUrl(service, browserHref());
    if (current.kind !== "ui") { setError("unsupported-route"); return false; }
    if (current.locale === locale && !options?.route && !options?.href) { setError(undefined); return false; }
    const suffix = current.canonicalPath.slice(localePath(service, current.logicalPath, current.locale).length);
    let href: string;
    try {
      if (options?.href) {
        if (options.route) throw new Error("Use either route or href");
        const supplied = resolveLocaleUrl(service, options.href);
        if (supplied.kind !== "ui" || supplied.locale !== locale || supplied.alias) throw new Error("Invalid locale destination");
        href = supplied.canonicalPath;
      } else href = localePath(service, options?.route ?? current.logicalPath + suffix, locale);
    }
    catch { setError("unsupported-route"); return false; }
    const request = gate.begin(href, locale);
    if (!request) return false;
    focus.current = captureFocus();
    setIntent(request); setError(undefined);
    timer.current = setTimeout(() => fail(request.token, "timeout"), transitionTimeoutMs);
    try {
      // A fully built URL goes directly to Next. Never pass a locale option or
      // mutate history/refresh the route separately.
      router.replace(href, { scroll: false });
      return true;
    } catch { fail(request.token, "navigation-failed"); return false; }
  }, [service, gate, router, fail, transitionTimeoutMs]);
  const retry = useCallback(() => {
    const request = lastRequest.current;
    if (!request || gate.current()) return false;
    const current = resolveLocaleUrl(service, browserHref());
    if (current.kind === "ui" && current.locale === request.locale) { setError(undefined); return false; }
    return changeLocale(request.locale, request.options);
  }, [service, gate, changeLocale]);
  const arrive = useCallback((token: number | undefined, locale: NaeilLocale, committedPathname: string) => {
    if (committedPathname !== window.location.pathname) return;
    let committed = token === undefined ? undefined : gate.arrive(token, browserHref(), locale);
    const late = timedOutIntent.current;
    if (!committed && !gate.current() && late && (token === undefined || token === late.token)) {
      const current = resolveLocaleUrl(service, browserHref());
      if (late.locale === locale && current.kind === "ui" && !current.alias && current.locale === locale && current.canonicalPath === late.href) committed = late;
    }
    if (!committed) return;
    timedOutIntent.current = undefined;
    clearTimer(); setIntent(undefined); setError(undefined);
    writeLocalePreference(locale, { location: window.location, writeCookie: cookie => { document.cookie = cookie; } }, preferenceWritesEnabled);
    const savedFocus = focus.current; focus.current = undefined;
    requestAnimationFrame(() => restoreFocus(savedFocus));
  }, [service, gate, clearTimer, preferenceWritesEnabled]);
  const registerDepartureGuard = useCallback((guard: () => boolean) => { guards.current.add(guard); return () => { guards.current.delete(guard); }; }, []);

  useEffect(() => {
    const onPopState = () => cancel();
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if ([...guards.current].some(guard => { try { return guard(); } catch { return true; } })) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("popstate", onPopState);
    window.addEventListener("beforeunload", beforeUnload);
    return () => { window.removeEventListener("popstate", onPopState); window.removeEventListener("beforeunload", beforeUnload); gate.cancel(); clearTimer(); };
  }, [cancel, gate, clearTimer]);
  useEffect(() => {
    const pending = gate.current() ?? timedOutIntent.current;
    if (!pending) return;
    const target = pending.href.split(/[?#]/, 1)[0];
    const current = resolveLocaleUrl(service, pathname ?? "/");
    const destination = resolveLocaleUrl(service, target);
    if (current.kind !== "ui" || destination.kind !== "ui" || current.logicalPath !== destination.logicalPath) cancel();
  }, [pathname, service, gate, cancel]);

  const context = useMemo(() => ({ pending: !!intent, intent, error, changeLocale, retry, cancel, service, arrive, registerDepartureGuard }), [intent, error, changeLocale, retry, cancel, service, arrive, registerDepartureGuard]);
  return <LocaleControllerContext.Provider value={context}>{children}</LocaleControllerContext.Provider>;
}
export function useLocaleController(): LocaleController {
  const controller = useContext(LocaleControllerContext);
  if (!controller) throw new Error("NaeilLocaleController is required above the locale route");
  return controller;
}

export interface NaeilLocaleProviderProps {
  locale: NaeilLocale;
  messages: LocaleMessages;
  children: ReactNode;
  timeZone?: string;
  now?: Date;
}
/** Mounted in app/[locale]/layout with messages for only the requested service. */
export function NaeilLocaleProvider({ locale: input, messages, children, timeZone = "UTC", now }: NaeilLocaleProviderProps) {
  const locale = assertLocale(input);
  const controller = useContext(LocaleControllerContext);
  const pathname = usePathname();
  const token = controller?.intent?.token;
  const arrive = controller?.arrive;
  useEffect(() => {
    document.documentElement.lang = locale;
    if (pathname) arrive?.(token, locale, pathname);
  }, [locale, pathname, token, arrive]);
  if (!messages.naeil || typeof messages.naeil !== "object") throw new Error("NaeilLocaleProvider requires the shared naeil namespace");
  return <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone} now={now}>
    <NaeilMessagesProvider locale={locale} messages={messages.naeil as SharedMessages["naeil"]}>{children}</NaeilMessagesProvider>
  </NextIntlClientProvider>;
}

/** Keep active through locale navigation, including failed-RSC document fallback. */
export function useLocaleBeforeUnload(unsafeToLeave: boolean | (() => boolean)): void {
  const controller = useContext(LocaleControllerContext);
  if (!controller) throw new Error("NaeilLocaleController is required for departure protection");
  const current = useRef(unsafeToLeave);
  useLayoutEffect(() => { current.current = unsafeToLeave; }, [unsafeToLeave]);
  const register = controller.registerDepartureGuard;
  useEffect(() => register(() => typeof current.current === "function" ? current.current() : current.current), [register]);
}
