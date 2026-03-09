import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";

function getCookieDomain(headerStore: Headers): string | undefined {
  const host = headerStore.get("host") || "";
  return host.endsWith(".naeil.dev") || host === "naeil.dev"
    ? ".naeil.dev"
    : undefined;
}

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
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const cookieStore = await cookies();
    const headerStore = await headers();
    const domain = getCookieDomain(headerStore);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, { ...options, domain }),
              );
            } catch {
              // Ignore — cookies can only be set in Server Actions or Route Handlers
            }
          },
        },
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    // Debug: log all cookies received by callback
    const allCookieNames = cookieStore.getAll().map(c => c.name);
    const redirectCookie = cookieStore.get("auth_redirect_to");
    console.log("[callback] code exchange error:", error?.message || "none");
    console.log("[callback] all cookies:", allCookieNames);
    console.log("[callback] auth_redirect_to:", redirectCookie?.value || "NOT FOUND");
    
    if (!error) {
      const next = redirectCookie?.value || "/";

      // Clear the redirect cookie
      cookieStore.set("auth_redirect_to", "", { path: "/", maxAge: 0, domain });

      console.log("[callback] redirecting to:", next, "isAllowed:", isAllowedRedirect(next));

      // Redirect to original page
      if (isAllowedRedirect(next)) {
        const redirectUrl = next.startsWith("http") ? next : `${origin}${next}`;
        console.log("[callback] final redirect URL:", redirectUrl);
        return NextResponse.redirect(redirectUrl);
      }
      return NextResponse.redirect(origin);
    }
  }

  // Auth error — redirect to login
  return NextResponse.redirect(`${origin}/login`);
}
