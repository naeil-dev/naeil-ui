import { createInviteHandler, inviteMethodNotAllowed } from "@/lib/auth/invite";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const handler = createInviteHandler();
export const GET = handler.GET;
export const POST = handler.POST;

export const PUT = inviteMethodNotAllowed;
export const PATCH = inviteMethodNotAllowed;
export const DELETE = inviteMethodNotAllowed;
export const OPTIONS = inviteMethodNotAllowed;
