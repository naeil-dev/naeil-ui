/** Shared host rule for first-party naeil preferences; never broaden other hosts. */
export function isNaeilPreferenceHost(hostname: string): boolean {
  return hostname === "naeil.dev" || hostname.endsWith(".naeil.dev");
}
