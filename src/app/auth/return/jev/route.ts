import { createServiceReturnRouteHandler } from "@/lib/auth/service-return";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const relay = createServiceReturnRouteHandler("jev");

function handle(request: Request): Response {
  return relay(request);
}

export const GET = handle;
export const HEAD = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
