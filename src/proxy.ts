import { type NextRequest, NextResponse } from "next/server";
import { createNaeilLocaleProxy } from "./naeil-locale/server";
import { localePath } from "./naeil-locale";
import { requiresPasswordChange, passwordChangePath } from "./lib/auth/password-policy";
import { updateSession } from "./lib/supabase/middleware";
import { invitationProxyResponse } from "./lib/auth/invite-proxy";
import { actionRequestBoundary } from "./lib/auth/action-request-boundary";
import { isCanonicalServiceReturnPath, isServiceReturnPath, serviceReturnHandler, serviceReturnHeaders } from "./lib/auth/service-return";

async function protocol(request: NextRequest) {
  const rawPathname = new URL(request.url).pathname;
  if (isServiceReturnPath(rawPathname)) {
    // Pass canonical GETs to their static public route. That route validates
    // its delivered URL; neither boundary promises original wire spelling.
    if (isCanonicalServiceReturnPath(rawPathname) && request.method === "GET" && request.headers.get("host") === "naeil.dev") {
      return NextResponse.next({ headers: serviceReturnHeaders() });
    }
    const relay = serviceReturnHandler(request);
    return new NextResponse(relay.body, { status: relay.status, headers: relay.headers });
  }
  if (["/auth/invite", "/auth/invite/"].includes(request.nextUrl.pathname)) {
    return invitationProxyResponse(request);
  }
  const actionRejection = await actionRequestBoundary(request);
  if (actionRejection) return actionRejection;
  // Existing public files are assets, outside the user-page locale inventory.
  if (rawPathname.startsWith("/console-invite/") || rawPathname.startsWith("/svg/") || ["/window.svg", "/globe.svg", "/next.svg", "/vercel.svg", "/file.svg", "/coral-concepts.html"].includes(rawPathname)) return NextResponse.next();
  return undefined;
}

export default createNaeilLocaleProxy({
  service: "main",
  protocol,
  async authorize({ request, route }) {
    const { response, user, unavailable } = await updateSession(request);
    const cookiesFrom = response;
    const requestHeaders = new Headers(request.headers);
    if (requiresPasswordChange(user) && route.logicalPath !== "/login/change-password") {
      const target = new URL(passwordChangePath(route.locale), request.url);
      return { access: "forbidden", response: NextResponse.redirect(target, 303), cookiesFrom, requestHeaders };
    }
    if (route.route.protected && !user) {
      const target = new URL(localePath("main", "/login", route.locale), request.url);
      target.searchParams.set("next", route.canonicalPath);
      return {
        access: unavailable ? "unavailable" : "unauthenticated",
        response: unavailable ? undefined : NextResponse.redirect(target),
        cookiesFrom,
        requestHeaders,
      };
    }
    return { access: "allowed", cookiesFrom, requestHeaders };
  },
});

export const config = { matcher: ["/:path*"] };
