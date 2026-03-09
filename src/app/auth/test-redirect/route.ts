import { NextResponse } from "next/server";
import { cookies } from "next/headers";

// Temporary test endpoint — simulates callback redirect logic without OAuth
// DELETE after testing
function isAllowedRedirect(url: string): boolean {
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

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const cookieStore = await cookies();
  const redirectCookie = cookieStore.get("auth_redirect_to");

  const rawValue = redirectCookie?.value || "/";
  const next = decodeURIComponent(rawValue);

  // Return JSON showing the logic instead of redirecting
  return NextResponse.json({
    rawCookieValue: rawValue,
    decodedValue: next,
    isAllowed: isAllowedRedirect(next),
    wouldRedirectTo: isAllowedRedirect(next)
      ? next.startsWith("http")
        ? next
        : `${origin}${next}`
      : origin,
  });
}
