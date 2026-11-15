import { NextResponse } from "next/server";

export async function GET() {
  const missing = [
    !process.env.NEXT_PUBLIC_SUPABASE_URL && "NEXT_PUBLIC_SUPABASE_URL",
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ].filter(Boolean);

  return NextResponse.json({
    ok: missing.length === 0,
    service: "naeil-ui",
    ...(missing.length ? { error: `${missing.join(", ")} not configured` } : {}),
  }, { status: missing.length ? 503 : 200 });
}
