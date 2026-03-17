export function isAllowedRedirect(url: string): boolean {
  if (url.startsWith("/")) return true;
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === "naeil.dev" ||
      parsed.hostname.endsWith(".naeil.dev")
    );
  } catch {
    return false;
  }
}
