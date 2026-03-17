import { NextResponse } from "next/server";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  return NextResponse.json({
    ok: !!supabaseUrl,
    service: "naeil-ui",
    ...(supabaseUrl ? {} : { error: "NEXT_PUBLIC_SUPABASE_URL not configured" }),
  });
}
