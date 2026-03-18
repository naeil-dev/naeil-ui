export function getCookieDomainFromHost(
  host: string | null | undefined,
): string | undefined {
  if (!host) return undefined;
  return host.endsWith(".naeil.dev") || host === "naeil.dev"
    ? ".naeil.dev"
    : undefined;
}
