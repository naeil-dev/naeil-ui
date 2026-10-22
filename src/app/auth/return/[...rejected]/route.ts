import { serviceReturnHeaders } from "@/lib/auth/service-return";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Rejection only: even a normalized canonical-looking request that reaches
// this fallback must never select a service, consume fields or create a relay.
function reject(_request: Request): Response {
  return new Response(null, { status: 404, headers: serviceReturnHeaders() });
}

export const GET = reject;
export const HEAD = reject;
export const POST = reject;
export const PUT = reject;
export const PATCH = reject;
export const DELETE = reject;
export const OPTIONS = reject;
