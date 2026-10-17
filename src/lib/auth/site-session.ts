/** Website SSR namespace only. Console/Estimate/Jev own separate opaque sessions. */
export const SITE_AUTH_COOKIE = "sb-naeil-site-auth";
export const SITE_AUTH_GENERATION = "naeil-site-auth-generation";
export const SITE_AUTH_EPOCH = "naeil-site-auth-epoch";
// prepareLogin alone writes generation; successful/explicit-local logout alone
// advances epoch. Refresh/callback only write their captured token namespace.
// Keeping these independent prevents a delayed preparation from undoing logout.
const ID = /^[a-f0-9]{32}$/;
export type SiteSessionBinding = { generation: string; epoch: string };
type NamedCookie = { name: string; value: string };

export function siteSessionEpoch(cookies: NamedCookie[]) {
  const epoch = cookies.find(cookie => cookie.name === SITE_AUTH_EPOCH)?.value;
  return epoch && ID.test(epoch) ? epoch : "initial";
}

export function siteSessionBinding(cookies: NamedCookie[]): SiteSessionBinding | null {
  const generation = cookies.find(cookie => cookie.name === SITE_AUTH_GENERATION)?.value;
  return generation && ID.test(generation) ? { generation, epoch: siteSessionEpoch(cookies) } : null;
}

export function siteSessionName(binding: SiteSessionBinding | null) {
  return binding ? `${SITE_AUTH_COOKIE}-${binding.generation}-${binding.epoch}` : `${SITE_AUTH_COOKIE}-inactive`;
}

/** Callback cleanup is confined to the login attempt captured by its request. */
export function siteReturnCookieNames(binding: SiteSessionBinding) {
  const suffix = `${binding.generation}-${binding.epoch}`;
  return { destination: `auth_redirect_to-${suffix}`, locale: `auth_redirect_locale-${suffix}` };
}

export function isOwnedSiteReturnCookie(name: string) {
  return /^auth_redirect_(?:to|locale)(?:-[a-f0-9]{32}-(?:initial|[a-f0-9]{32}))?$/.test(name);
}

export function siteCookieOptions(host: string | null | undefined, binding: SiteSessionBinding | null = null) {
  const hostname = host?.toLowerCase().replace(/:\d+$/, "");
  const loopback = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
  return { name: siteSessionName(binding), path: "/", sameSite: "lax" as const, secure: !loopback };
}

/** Only delete this site's session chunks. Never delete a pending PKCE verifier. */
export function isSiteSessionCookie(name: string, binding: SiteSessionBinding | null) {
  const storage = siteSessionName(binding);
  return !!binding && (name === storage || new RegExp(`^${storage}\\.\\d+$`).test(name));
}

/** Deliberate site logout also drops pending PKCE, but never shared/other-app cookies. */
export function isOwnedSiteAuthCookie(name: string) {
  return new RegExp(`^${SITE_AUTH_COOKIE}(?:-[a-f0-9]{32}-(?:initial|[a-f0-9]{32}))?(?:-code-verifier)?(?:\\.\\d+)?$`).test(name);
}

export function currentSiteCookies(cookies: NamedCookie[], binding: SiteSessionBinding | null) {
  if (!binding) return [];
  const name = siteSessionName(binding);
  return cookies.filter(cookie => isSiteSessionCookie(cookie.name, binding) || cookie.name === `${name}-code-verifier` || new RegExp(`^${name}-code-verifier\\.\\d+$`).test(cookie.name));
}

export function hasSiteSession(cookies: NamedCookie[], binding: SiteSessionBinding | null) {
  return cookies.some(cookie => !!cookie.value && isSiteSessionCookie(cookie.name, binding));
}

export function isTerminalSessionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { name, code, status } = error as { name?: string; code?: string; status?: number };
  if (name === "AuthSessionMissingError") return true;
  return ((status === 401 || status === 403) && ["bad_jwt", "session_not_found", "session_expired", "user_not_found", "user_banned"].includes(code || "")) ||
    (status === 400 && ["refresh_token_not_found", "refresh_token_already_used"].includes(code || ""));
}
