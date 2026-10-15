import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { inviteCanonicalResponse, inviteResponseHeaders } from "./invite";

export function invitationProxyResponse(request: NextRequest): NextResponse {
  if (request.nextUrl.pathname === "/auth/invite/") {
    const canonical = inviteCanonicalResponse(request);
    return new NextResponse(canonical.body, {
      status: canonical.status,
      headers: canonical.headers,
    });
  }
  const nonce = randomBytes(32).toString("base64url");
  const requestHeaders = new Headers(request.headers);
  // Always replace the public header; callers cannot select the effective nonce.
  requestHeaders.set("x-naeil-invite-nonce", nonce);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  inviteResponseHeaders(nonce).forEach((value, key) =>
    response.headers.set(key, value),
  );
  return response;
}
