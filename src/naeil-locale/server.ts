import "server-only";
import { NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { getRequestConfig } from "next-intl/server";
import { assertLocale, getLocaleService, localeHref, localePath, naeilLocales, naeilRouting, resolveLocaleUrl, type LocaleServiceInput, type NaeilLocale, type ResolvedLocaleRoute } from "./routing";
import { createLocaleMessageLoader, recoverMissingMessages, loadSharedMessages, type LocaleMessageLoaders } from "./messages";
export { naeilRouting } from "./routing";
export { createLocaleMessageLoader } from "./messages";

export const localeRequestHeader = "x-naeil-locale";
export const accessRequestHeader = "x-naeil-locale-access";
export const pathRequestHeader = "x-naeil-locale-path";
const privateHeaders = [localeRequestHeader, accessRequestHeader, pathRequestHeader, "x-next-intl-locale"];
export type LocaleRequestKind = "document" | "rsc" | "action" | "other";
export function localeRequestKind(request: Pick<NextRequest, "method" | "headers">): LocaleRequestKind {
  if (request.headers.has("next-action")) return "action";
  if (request.headers.get("rsc") === "1" || request.headers.has("next-router-state-tree") || request.headers.has("next-router-prefetch")) return "rsc";
  // Next16 removes Flight headers before invoking proxy, then restores them
  // for rendering. Browser fetch metadata survives. This chooses a recovery
  // transport only; route authorization and server data checks still run.
  const mode = request.headers.get("sec-fetch-mode");
  if ((request.method === "GET" || request.method === "HEAD") && request.headers.get("sec-fetch-dest") === "empty" && (mode === "cors" || mode === "same-origin")) return "rsc";
  return request.method === "GET" || request.method === "HEAD" ? "document" : "other";
}
/** Only read after createNaeilLocaleProxy has replaced external marker headers. */
export function getRequestLocale(headers: Pick<Headers, "get">, fallback: NaeilLocale = "en"): NaeilLocale {
  const locale = headers.get(localeRequestHeader);
  return locale === null ? assertLocale(fallback) : assertLocale(locale);
}
/** A rendering hint, never authorization. Pages must still check data access. */
export function getRequestLocaleAccess(headers: Pick<Headers, "get">): "allowed" | "unauthenticated" | "forbidden" | "unavailable" | undefined {
  const value = headers.get(accessRequestHeader);
  if (value === "allowed" || value === "unauthenticated" || value === "forbidden" || value === "unavailable") return value;
}

export function createNaeilRequestConfig(options: { namespace: string; messages: LocaleMessageLoaders; onMessageError?: (error: Error) => void }) {
  const load = createLocaleMessageLoader(options);
  return getRequestConfig(async ({ requestLocale }) => {
    const locale = assertLocale((await requestLocale) ?? "en");
    const selected = await load(locale);
    const messages = locale === "en" ? selected : recoverMissingMessages(selected, await load("en"), key => {
      const error = new Error(`Missing ${locale} translation: ${key}`);
      if (options.onMessageError) options.onMessageError(error); else console.error(error.message);
    });
    return { locale, messages, timeZone: "UTC" };
  });
}

export interface LocaleProxyAuthorization {
  access: "allowed" | "unauthenticated" | "forbidden" | "unavailable";
  /** Document denial/redirect only. RSC denials render the app access boundary. */
  response?: NextResponse;
  /** Existing refreshed auth response; its Set-Cookie values are retained. */
  cookiesFrom?: NextResponse;
  /** Updated request cookies/headers from the app's existing auth refresh. */
  requestHeaders?: Headers;
}
export interface NaeilLocaleProxyOptions {
  service: LocaleServiceInput;
  /** Existing app-validated origin, e.g. a local proxy behind a trusted ingress.
   * Never return an unvalidated forwarded Host. This is not an auth allowlist. */
  requestOrigin?: (request: NextRequest) => string;
  /** Runs first for exact existing protocol/security boundaries. */
  protocol?: (request: NextRequest) => NextResponse | null | undefined | Promise<NextResponse | null | undefined>;
  authorize?: (context: { request: NextRequest; route: ResolvedLocaleRoute; kind: LocaleRequestKind; locale: NaeilLocale; logicalPath: string }) => LocaleProxyAuthorization | Promise<LocaleProxyAuthorization>;
}
function copyCookies(from: NextResponse | undefined, to: NextResponse): NextResponse {
  from?.cookies.getAll().forEach(cookie => to.cookies.set(cookie));
  return to;
}
function stripMarkers(headers: Headers): Headers {
  const sanitized = new Headers(headers);
  for (const key of privateHeaders) sanitized.delete(key);
  return sanitized;
}
function sanitizeProtocolPassThrough(response: NextResponse, requestHeaders: Headers): NextResponse {
  if (response.headers.get("x-middleware-next") !== "1" && !response.headers.has("x-middleware-rewrite")) return response;
  const overrides = response.headers.get("x-middleware-override-headers");
  // Next's override list is the complete resulting request header set, including
  // deletions. Only a response without overrides inherits the incoming headers.
  const forwarded = new Headers(overrides === null ? requestHeaders : undefined);
  for (const key of (overrides ?? "").split(",").map(name => name.trim())) {
    if (!key) continue;
    const value = response.headers.get(`x-middleware-request-${key}`);
    if (value !== null) forwarded.set(key, value);
  }
  for (const key of privateHeaders) { forwarded.delete(key); response.headers.delete(`x-middleware-request-${key}`); }
  const names: string[] = [];
  for (const [key, value] of forwarded) { names.push(key); response.headers.set(`x-middleware-request-${key}`, value); }
  response.headers.set("x-middleware-override-headers", names.join(","));
  return response;
}
function markPrivate(response: NextResponse): NextResponse { response.headers.set("Cache-Control", "private, no-store"); return response; }
function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!); }
async function invalidResponse(status: number, service: LocaleServiceInput, kind: LocaleRequestKind, locale: NaeilLocale = "en"): Promise<NextResponse> {
  if (kind !== "document") return markPrivate(new NextResponse(null, { status }));
  const copy = (await loadSharedMessages(locale)).naeil.locale;
  const message = copy.errors[status === 400 ? "badRequest" : status === 401 ? "unauthenticated" : status === 403 ? "forbidden" : status === 503 ? "unavailable" : "notFound"];
  const id = getLocaleService(service).id;
  const identity = { abstorm: { name: "abstorm", icon: null }, main: { name: ".naeil", icon: "/icon.svg" }, jev: { name: "Jev", icon: null }, estimate: { name: "AB Estimate", icon: "/favicon.svg" } }[id];
  const links = naeilLocales.map(language => `<li><a lang="${language}" href="${escapeHtml(localePath(service, "/", language))}">${escapeHtml(copy.names[language])}</a></li>`).join("");
  return markPrivate(new NextResponse(`<!doctype html><html lang="${locale}"><head><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1">${identity.icon ? `<link rel="icon" href="${identity.icon}">` : ""}<title>${escapeHtml(message)} — ${identity.name}</title></head><body><h1>${status}</h1><p>${escapeHtml(message)}</p><ul>${links}</ul></body></html>`, { status, headers: { "Content-Type": "text/html; charset=utf-8" } }));
}

/** Auth decisions precede alias canonicalization; no locale rewrite reaches protocol handlers. */
export function createNaeilLocaleProxy(options: NaeilLocaleProxyOptions) {
  const service = getLocaleService(options.service);
  const intl = createIntlMiddleware(naeilRouting);
  return async function naeilLocaleProxy(original: NextRequest): Promise<NextResponse> {
    const sanitized = stripMarkers(original.headers);
    const request = new NextRequest(original, { headers: sanitized });
    const protocol = await options.protocol?.(request);
    if (protocol) return sanitizeProtocolPassThrough(protocol, sanitized);
    const kind = localeRequestKind(request);
    // Keep the raw pathname spelling; NextURL's locale-normalized view is not authority.
    const raw = new URL(request.url);
    const origin = options.requestOrigin?.(request) ?? raw.origin;
    const parsedOrigin = new URL(origin);
    if (parsedOrigin.origin !== origin || !["https:", "http:"].includes(parsedOrigin.protocol)) throw new Error("Expected a validated HTTP request origin");
    const result = resolveLocaleUrl(service, raw.pathname + raw.search);
    if (result.kind === "protocol") return NextResponse.next({ request: { headers: sanitized } });
    if (result.kind === "invalid") return invalidResponse(result.status, service, kind, result.locale);

    const authorization = options.authorize ? await options.authorize({ request, route: result, kind, locale: result.locale, logicalPath: result.logicalPath }) : { access: result.route.protected ? "unavailable" as const : "allowed" as const };
    const authHeaders = stripMarkers(authorization.requestHeaders ?? sanitized);
    if (authorization.access !== "allowed" && kind === "document") {
      return copyCookies(authorization.cookiesFrom, markPrivate(authorization.response ?? await invalidResponse(authorization.access === "unauthenticated" ? 401 : authorization.access === "forbidden" ? 403 : 503, service, kind, result.locale)));
    }
    if (authorization.access !== "allowed" && kind !== "rsc") return copyCookies(authorization.cookiesFrom, markPrivate(new NextResponse(null, { status: authorization.access === "unauthenticated" ? 401 : authorization.access === "forbidden" ? 403 : 503 })));
    if (result.alias && kind === "document") return copyCookies(authorization.cookiesFrom, NextResponse.redirect(new URL(result.canonicalPath, origin), 307));
    // Do not issue a document redirect for Action/RSC alias input. Unsafe alias
    // mutation requests are rejected; canonical RSC uses a valid Flight boundary.
    if (result.alias && kind !== "document") return copyCookies(authorization.cookiesFrom, await invalidResponse(400, service, kind, result.locale));

    authHeaders.set(localeRequestHeader, result.locale);
    authHeaders.set("x-next-intl-locale", result.locale);
    authHeaders.set(pathRequestHeader, result.logicalPath);
    authHeaders.set(accessRequestHeader, authorization.access);
    const response = intl(new NextRequest(request, { headers: authHeaders }));
    // Preserve the app's validated authority through the internal rewrite.
    // Next16 consumers also set skipProxyUrlNormalize:true, otherwise its
    // adapter can normalize loopback hosts and reenter this proxy externally.
    const rewrite = response.headers.get("x-middleware-rewrite");
    if (rewrite && options.requestOrigin) {
      const target = new URL(rewrite);
      target.host = parsedOrigin.host;
      target.protocol = parsedOrigin.protocol;
      response.headers.set("x-middleware-rewrite", target.href);
    }
    // next-intl forwards its validated headers via Next middleware overrides.
    // Explicitly merge all app refresh/validated headers so RSC sees fresh cookies.
    const forwarded = new Set((response.headers.get("x-middleware-override-headers") ?? "").split(",").filter(Boolean));
    for (const [key, value] of authHeaders) { forwarded.add(key); response.headers.set(`x-middleware-request-${key}`, value); }
    response.headers.set("x-middleware-override-headers", [...forwarded].join(","));
    response.headers.delete("link");
    if (result.route.protected || authorization.access !== "allowed") markPrivate(response);
    return copyCookies(authorization.cookiesFrom, response);
  };
}

export function localeMetadata(options: { service: LocaleServiceInput; route: string; locale: NaeilLocale; title: string; serviceName: string; public?: boolean; translatedLocales?: readonly NaeilLocale[]; description?: string }) {
  const locale = assertLocale(options.locale);
  const title = options.title ? `${options.title} — ${options.serviceName}` : options.serviceName;
  if (!options.public) return { title, description: options.description, robots: { index: false, follow: false } };
  const translated = options.translatedLocales ?? naeilLocales;
  if (!translated.includes(locale)) throw new Error("Cannot advertise untranslated page");
  const languages = Object.fromEntries(translated.map(language => [language, localeHref(options.service, options.route, language)]));
  if (translated.includes("en")) languages["x-default"] = localeHref(options.service, options.route, "en");
  return { title, description: options.description, alternates: { canonical: localeHref(options.service, options.route, locale), languages } };
}
