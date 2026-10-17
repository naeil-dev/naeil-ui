const BASE = "https://naeil.dev";
const ORIGINS = new Set([
  BASE,
  "https://esg.naeil.dev",
  "https://work.naeil.dev",
  "https://jev.naeil.dev",
  "https://abestimate.naeil.dev",
]);
const UNSAFE = /[\s\\\x00-\x1f\x7f]/;

/** Validate and return one canonical value, so callers never reconstruct unchecked input. */
export function canonicalRedirect(value: unknown): string | null {
  if (
    typeof value !== "string" ||
    !value ||
    value.length > 2048 ||
    UNSAFE.test(value)
  )
    return null;
  const relative = value.startsWith("/");
  if (relative ? value.startsWith("//") : !/^https:\/\//i.test(value))
    return null;
  try {
    // Validate the original URI encoding once. Further passes below inspect
    // encoded authority/control bytes, without treating a decoded literal % as
    // another required URI escape or changing the returned query/fragment.
    decodeURIComponent(value);
    let decoded = value;
    for (let depth = 0; depth < 8; depth++) {
      if (
        /[\\\x00-\x1f\x7f]/.test(decoded) ||
        (relative && (!decoded.startsWith("/") || decoded.startsWith("//")))
      )
        return null;
      const check = new URL(decoded, BASE);
      if (
        check.username ||
        check.password ||
        !ORIGINS.has(check.origin) ||
        (relative && (check.origin !== BASE || check.pathname.startsWith("//")))
      )
        return null;
      const next = decoded.replace(/%([0-9a-f]{2})/gi, (_, byte: string) =>
        String.fromCharCode(parseInt(byte, 16)));
      if (next === decoded) break;
      if (depth === 7) return null;
      decoded = next;
    }
    const parsed = new URL(value, BASE);
    return relative
      ? `${parsed.pathname}${parsed.search}${parsed.hash}`
      : parsed.href;
  } catch {
    return null;
  }
}

export function isAllowedRedirect(value: string): boolean {
  return canonicalRedirect(value) !== null;
}

export function redirectCookieTarget(value: string | undefined): string {
  if (!value) return "/";
  // Next's cookie reader has already decoded the cookie transport. Keep URI
  // escapes inside the return URL intact; decoding again changes query data.
  const canonical = canonicalRedirect(value);
  if (canonical) return canonical;
  try {
    // Compatibility for an older client that encoded the entire cookie value.
    return canonicalRedirect(decodeURIComponent(value)) || "/";
  } catch {
    return "/";
  }
}
