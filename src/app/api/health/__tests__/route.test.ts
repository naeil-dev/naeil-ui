import { afterEach, expect, it, vi } from "vitest";
import { GET } from "../route";

afterEach(() => vi.unstubAllEnvs());
it.each([
  [undefined, "public-key", ["NEXT_PUBLIC_SUPABASE_URL"]],
  ["https://fixture.supabase.co", undefined, ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]],
  ["", "", ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"]],
  ["https://fixture.supabase.co", "public-key", []],
] as const)("requires both public auth variables (%s, %s)", async (url, key, missing) => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", key);
  const response = await GET();
  expect(response.status).toBe(missing.length ? 503 : 200);
  const body = await response.json();
  expect(body).toEqual({ ok: !missing.length, service: "naeil-ui", ...(missing.length ? { error: `${missing.join(", ")} not configured` } : {}) });
  expect(JSON.stringify(body)).not.toContain("public-key");
  expect(JSON.stringify(body)).not.toContain("https://fixture.supabase.co");
});
