// Server-safe owned-service identity: no "use client", so metadata code may call it.

/** Canonical owned-service identifiers; their spelling is the visible brand suffix. */
export const naeilServices = Object.freeze(["abstorm", "home", "estimate", "jev"] as const);
export type NaeilService = typeof naeilServices[number];

export function isNaeilService(value: unknown): value is NaeilService {
  return (naeilServices as readonly unknown[]).includes(value);
}

/** `.naeil` for naeil.dev (no service), otherwise `.naeil <service>`. */
export function naeilServiceName(service?: NaeilService): string {
  if (service === undefined) return ".naeil";
  if (!isNaeilService(service)) throw new Error(`Unknown naeil service: ${String(service)}`);
  return `.naeil ${service}`;
}

/** Browser title `Page — .naeil <service>`; omit the page on a service home/landing. */
export function naeilDocumentTitle(service?: NaeilService, page?: string): string {
  const name = naeilServiceName(service);
  return page ? `${page} — ${name}` : name;
}
