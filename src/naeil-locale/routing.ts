/** Opt-in owned-service routing. The legacy public i18n/routing entry is unchanged. */
export const naeilLocales = ["en", "ko", "ja"] as const;
export type NaeilLocale = (typeof naeilLocales)[number];
export const defaultLocale: NaeilLocale = "en";
function escapeRegExp(value: string): string { return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }
const localePrefix = new RegExp(`^/(?:${naeilLocales.map(escapeRegExp).join("|")})(?:/|$)`);
export const naeilRouting = {
  locales: naeilLocales,
  defaultLocale,
  localePrefix: "as-needed" as const,
  localeDetection: false as const,
  localeCookie: false as const,
  alternateLinks: false as const,
};

export function isNaeilLocale(value: unknown): value is NaeilLocale {
  return typeof value === "string" && (naeilLocales as readonly string[]).includes(value);
}
export function assertLocale(value: unknown): NaeilLocale {
  if (!isNaeilLocale(value)) throw new Error("Unsupported naeil locale");
  return value;
}

export type NaeilServiceId = "main" | "jev" | "estimate" | "abstorm";
export interface NaeilRoute { path: string; protected?: boolean }
export interface NaeilLocaleService {
  id: NaeilServiceId;
  origin: string;
  routes: readonly (string | NaeilRoute)[];
  protocolPrefixes?: readonly string[];
  /** Explicitly audited UI routes within an otherwise protected namespace. */
  uiProtocolExceptions?: readonly string[];
}
const origins = {
  abstorm: "https://abstorm.naeil.dev",
  main: "https://naeil.dev", jev: "https://jev.naeil.dev", estimate: "https://abestimate.naeil.dev",
} as const;
const protocolPrefixes = ["/api", "/auth", "/_next", "/_vercel", "/.well-known", "/health", "/invite", "/return", "/webhook", "/images", "/fonts"];
const protocolFiles = ["/favicon.ico", "/favicon.svg", "/icon.svg", "/apple-icon.png", "/robots.txt", "/sitemap.xml"];

export function defineLocaleService(service: NaeilLocaleService): NaeilLocaleService {
  if (origins[service.id] !== service.origin) throw new Error("Service origin must match the exact owned origin");
  const paths = service.routes.map(route => typeof route === "string" ? route : route.path);
  if (!paths.length || new Set(paths).size !== paths.length) throw new Error("Route inventory is empty or duplicated");
  for (const path of paths) {
    if (!/^\/(?:[A-Za-z0-9._~-]+|\[[A-Za-z][A-Za-z0-9_]*\])(?:\/(?:[A-Za-z0-9._~-]+|\[[A-Za-z][A-Za-z0-9_]*\]))*$/.test(path) && path !== "/") throw new Error(`Invalid registered route: ${path}`);
    if (localePrefix.test(path) || (isProtocolPath(path, service) && !service.uiProtocolExceptions?.includes(path)) || path.split("/").some(segment => segment === "." || segment === "..")) throw new Error(`Locale/protocol path cannot be a UI route: ${path}`);
  }
  for (const exception of service.uiProtocolExceptions ?? []) if (exception.includes("[") || !paths.includes(exception)) throw new Error("Protocol UI exceptions must be exact registered routes");
  return Object.freeze({ ...service, routes: Object.freeze(service.routes.map(route => typeof route === "string" ? route : Object.freeze({ ...route }))), protocolPrefixes: Object.freeze([...(service.protocolPrefixes ?? [])]), uiProtocolExceptions: Object.freeze([...(service.uiProtocolExceptions ?? [])]) });
}
const main = defineLocaleService({ id: "main", origin: origins.main, routes: ["/", "/projects", "/design", "/blog", "/blog/[slug]", "/login", { path: "/login/change-password", protected: true }] });
export const naeilServices = {
  abstorm: defineLocaleService({
    id: "abstorm", origin: origins.abstorm,
    routes: ["/", "/new", "/runs/[id]", "/runs/[id]/report", "/experts"]
      .map(path => ({ path, protected: true })),
  }),
  main,
  site: main,
  jev: defineLocaleService({ id: "jev", origin: origins.jev, routes: [{ path: "/", protected: true }, "/login"] }),
  estimate: defineLocaleService({ id: "estimate", origin: origins.estimate, uiProtocolExceptions: ["/auth/complete"], routes: ["/", "/estimates", "/estimates/[id]", "/compare", "/settings", "/calendar", "/calendar-preview", "/calendar-preview/estimates", "/calendar-preview/estimates/[id]"].map(path => ({ path, protected: true })).concat([{ path: "/login", protected: false }, { path: "/access-denied", protected: false }, { path: "/auth/complete", protected: false }]) }),
} as const;
export type LocaleServiceInput = NaeilLocaleService | NaeilServiceId;
export function getLocaleService(service: LocaleServiceInput): NaeilLocaleService {
  return typeof service === "string" ? naeilServices[service] : service;
}
function isProtocolPath(path: string, service: NaeilLocaleService): boolean {
  return [...protocolPrefixes, ...(service.protocolPrefixes ?? [])].some(prefix => path === prefix || path.startsWith(prefix + "/")) || protocolFiles.includes(path);
}
function matchRoute(service: NaeilLocaleService, pathname: string): NaeilRoute | undefined {
  const segments = pathname.split("/");
  for (const route of service.routes) {
    const record = typeof route === "string" ? { path: route } : route;
    const expected = record.path.split("/");
    if (expected.length === segments.length && expected.every((part, index) => part === segments[index] || (/^\[[A-Za-z][A-Za-z0-9_]*\]$/.test(part) && !!segments[index]))) return record;
  }
}
export interface ResolvedLocaleRoute {
  kind: "ui";
  locale: NaeilLocale;
  logicalPath: string;
  route: NaeilRoute;
  /** Canonical same-origin path, preserving non-language query and fragment. */
  canonicalPath: string;
  originalPath: string;
  alias: boolean;
}
export type LocaleUrlResolution = ResolvedLocaleRoute | { kind: "protocol"; pathname: string } | { kind: "invalid"; status: 400 | 404; reason: string; locale?: NaeilLocale };

function invalid(reason: string, status: 400 | 404 = 404, locale?: NaeilLocale): LocaleUrlResolution { return { kind: "invalid", status, reason, ...(locale ? { locale } : {}) }; }
function splitInput(input: string, origin: string): { pathname: string; search: string; hash: string } | undefined {
  if (!input || /[\u0000-\u0020\u007f]/.test(input)) return;
  let path = input;
  if (!path.startsWith("/")) {
    if (!path.startsWith(origin + "/") && path !== origin) return;
    path = path.slice(origin.length) || "/";
  }
  if (path.startsWith("//")) return;
  const hashAt = path.indexOf("#");
  const hash = hashAt < 0 ? "" : path.slice(hashAt);
  const withoutHash = hashAt < 0 ? path : path.slice(0, hashAt);
  const queryAt = withoutHash.indexOf("?");
  return { pathname: queryAt < 0 ? withoutHash : withoutHash.slice(0, queryAt), search: queryAt < 0 ? "" : withoutHash.slice(queryAt), hash };
}
function safePath(path: string, service: NaeilLocaleService): boolean {
  if (!path.startsWith("/") || path.includes("//")) return false;
  const reserved = new Set<string>([...naeilLocales, ...[...protocolPrefixes, ...(service.protocolPrefixes ?? [])].flatMap(prefix => prefix.split("/").filter(Boolean))]);
  return path.split("/").every(segment => {
    try {
      const decoded = decodeURIComponent(segment);
      return !/[\u0000-\u001f\u007f/\\%?#]/.test(decoded) && decoded !== "." && decoded !== ".." && (!reserved.has(decoded) || decoded === segment);
    } catch { return false; }
  });
}
function stripLegacyLang(search: string): string {
  const retained = search.slice(1).split("&").filter(part => {
    try { return decodeURIComponent(part.split("=")[0].replace(/\+/g, " ")) !== "lang"; } catch { return true; }
  });
  return retained.length && retained.join("&") ? "?" + retained.join("&") : "";
}
function prefixPath(path: string, locale: NaeilLocale): string { return locale === "en" ? path : `/${locale}${path === "/" ? "" : path}`; }

/** Strict UI classification is not an auth/return validator. Call existing security validators separately. */
export function resolveLocaleUrl(inputService: LocaleServiceInput, input: string): LocaleUrlResolution {
  const service = getLocaleService(inputService);
  const parts = splitInput(input, service.origin);
  if (!parts || !safePath(parts.pathname, service)) return invalid("Malformed or encoded path");
  const rawPathname = parts.pathname;
  const pathname = rawPathname !== "/" && rawPathname.endsWith("/") ? rawPathname.slice(0, -1) : rawPathname;
  if (isProtocolPath(pathname, service) && !service.uiProtocolExceptions?.includes(pathname)) return { kind: "protocol", pathname };
  const segments = pathname.split("/");
  const explicit = isNaeilLocale(segments[1]);
  const pathLocale = explicit ? segments[1] as NaeilLocale : undefined;
  const logicalPath = explicit ? "/" + segments.slice(2).join("/") : pathname;
  if (localePrefix.test(logicalPath) || (isProtocolPath(logicalPath, service) && !service.uiProtocolExceptions?.includes(logicalPath))) return invalid("Nested locale or localized protocol path", 404, pathLocale);
  const route = matchRoute(service, logicalPath);
  if (!route) return invalid("Unregistered UI route", 404, pathLocale);
  const legacy = service.id !== "main";
  const languages = new URLSearchParams(parts.search).getAll("lang");
  if (legacy && languages.length && (languages.length !== 1 || !isNaeilLocale(languages[0]))) return invalid("Invalid legacy language", 400, pathLocale);
  const locale = pathLocale ?? (legacy && languages.length ? languages[0] as NaeilLocale : "en");
  const search = legacy ? stripLegacyLang(parts.search) : parts.search;
  const canonicalPath = prefixPath(logicalPath, locale) + search + parts.hash;
  const originalPath = rawPathname + parts.search + parts.hash;
  return { kind: "ui", locale, logicalPath, route, canonicalPath, originalPath, alias: canonicalPath !== originalPath };
}

/** Input must be an unlocalized registered UI route. Does not validate login return destinations. */
export function localePath(inputService: LocaleServiceInput, unlocalizedRoute: string, locale: NaeilLocale): string {
  assertLocale(locale);
  const service = getLocaleService(inputService);
  const parts = splitInput(unlocalizedRoute, service.origin);
  if (!parts || localePrefix.test(parts.pathname)) throw new Error("localePath requires an unlocalized route");
  const result = resolveLocaleUrl(service, parts.pathname);
  if (result.kind !== "ui") throw new Error("Unregistered UI destination");
  return prefixPath(result.logicalPath, locale) + (service.id === "main" ? parts.search : stripLegacyLang(parts.search)) + parts.hash;
}
export function localeHref(service: LocaleServiceInput, unlocalizedRoute: string, locale: NaeilLocale): string {
  return getLocaleService(service).origin + localePath(service, unlocalizedRoute, locale);
}
export function sameLogicalRoute(service: LocaleServiceInput, left: string, right: string): boolean {
  const a = resolveLocaleUrl(service, left), b = resolveLocaleUrl(service, right);
  if (a.kind !== "ui" || b.kind !== "ui") return false;
  // Query and hash belong to application state, so different values are a real navigation.
  return a.logicalPath === b.logicalPath && a.canonicalPath.slice(prefixPath(a.logicalPath, a.locale).length) === b.canonicalPath.slice(prefixPath(b.logicalPath, b.locale).length);
}
