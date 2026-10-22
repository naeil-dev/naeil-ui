import { getCookieDomainFromHost } from "./cookie-domain";

/**
 * One Supabase session (default `sb-<ref>-auth-token` cookie) shared by
 * naeil.dev and its *.naeil.dev services through Domain=.naeil.dev.
 */
export const RETURN_DESTINATION_COOKIE = "auth_redirect_to";
export const RETURN_LOCALE_COOKIE = "auth_redirect_locale";
type NamedCookie = { name: string; value: string };

export function siteCookieOptions(host: string | null | undefined) {
  const hostname = host?.toLowerCase().replace(/:\d+$/, "");
  const loopback = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  return { path: "/", sameSite: "lax" as const, secure: !loopback, domain: getCookieDomainFromHost(hostname) };
}

/** Session chunks only. Never a pending PKCE verifier. */
export function isSiteSessionCookie(name: string) {
  return /^sb-[a-z0-9]+-auth-token(?:\.\d+)?$/.test(name);
}

// Host-only cookies written by the 2026-10-17..22 per-site session namespace.
const LEGACY_SITE_COOKIE = /^(?:sb-naeil-site-auth\S*|naeil-site-auth-(?:generation|epoch))$/;

/** Logout drops the shared session and pending PKCE, plus legacy host-only site cookies. */
export function siteAuthCookiesToClear(names: string[], host: string | null | undefined) {
  const shared = siteCookieOptions(host);
  const hostOnly = { ...shared, domain: undefined };
  return names.flatMap(name =>
    /^sb-[a-z0-9]+-auth-token(?:-code-verifier)?(?:\.\d+)?$/.test(name) ? [{ name, options: shared }]
      : LEGACY_SITE_COOKIE.test(name) || isOwnedSiteReturnCookie(name) ? [{ name, options: hostOnly }]
      : []);
}

export function isOwnedSiteReturnCookie(name: string) {
  return /^auth_redirect_(?:to|locale)(?:-[a-f0-9]{32}-(?:initial|[a-f0-9]{32}))?$/.test(name);
}

export function hasSiteSession(cookies: NamedCookie[]) {
  return cookies.some(cookie => !!cookie.value && isSiteSessionCookie(cookie.name));
}

export function isTerminalSessionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { name, code, status } = error as { name?: string; code?: string; status?: number };
  if (name === "AuthSessionMissingError") return true;
  return ((status === 401 || status === 403) && ["bad_jwt", "session_not_found", "session_expired", "user_not_found", "user_banned"].includes(code || "")) ||
    (status === 400 && ["refresh_token_not_found", "refresh_token_already_used"].includes(code || ""));
}
