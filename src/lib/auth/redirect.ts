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
    let decoded = value;
    for (let depth = 0; depth < 8; depth++) {
      if (
        UNSAFE.test(decoded) ||
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
      const next = decodeURIComponent(decoded);
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
  try {
    return canonicalRedirect(decodeURIComponent(value)) || "/";
  } catch {
    return "/";
  }
}
