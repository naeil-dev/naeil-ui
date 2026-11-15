import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  jar: new Map<string, string>(),
  set: vi.fn(),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => state.jar.has(name) ? { value: state.jar.get(name) } : undefined,
    getAll: () => [...state.jar].map(([name, value]) => ({ name, value })),
    set: state.set,
  }),
  headers: async () => new Headers({ host: "naeil.dev" }),
}));
import { GET } from "@/app/auth/callback/route";

const session = "sb-fixture-auth-token";
const verifier = `${session}-code-verifier`;
const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://fixture.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-test-fixture");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  state.jar = new Map([
    [`${session}.0`, "old-session-chunk-0"],
    [`${session}.1`, "old-session-chunk-1"],
    [verifier, "test-pkce-verifier"],
    ["auth_redirect_to", "https://jev.naeil.dev/"],
  ]);
  state.set.mockReset().mockImplementation((name: string, value: string) => state.jar.set(name, value));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("OAuth callback session replacement with the real Supabase SDK", () => {
  it("leaves the pre-existing session untouched when a bad code is rejected", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ error: "invalid_grant", error_description: "Bad code" }), { status: 400 }));
    const response = await GET(new Request("https://naeil.dev/auth/callback?code=bad"));
    expect(response.headers.get("location")).toContain("/login?");
    expect(state.jar.get(`${session}.0`)).toBe("old-session-chunk-0");
    expect(state.jar.get(`${session}.1`)).toBe("old-session-chunk-1");
    expect(state.set).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ code_verifier: "test-pkce-verifier", auth_code: "bad" });
  });

  it("writes a fresh session and expires every stale chunk only after successful exchange", async () => {
    fetchMock.mockImplementation(async () => {
      expect(state.set).not.toHaveBeenCalled();
      return new Response(JSON.stringify({
        access_token: "fresh-access-token", refresh_token: "fresh-refresh-token",
        token_type: "bearer", expires_in: 3600,
        user: { id: "fixture-user", app_metadata: {}, user_metadata: {} },
      }), { status: 200 });
    });
    const response = await GET(new Request("https://naeil.dev/auth/callback?code=good"));
    expect(response.headers.get("location")).toBe("https://jev.naeil.dev/");
    expect(fetchMock).toHaveBeenCalledTimes(1); // No attempted refresh of the hidden stale session.
    for (const name of [`${session}.0`, `${session}.1`]) {
      expect(state.set).toHaveBeenCalledWith(name, "", expect.objectContaining({ maxAge: 0, domain: ".naeil.dev" }));
      expect(state.jar.get(name)).toBe("");
    }
    const fresh = state.jar.get(session)!;
    expect(fresh).toMatch(/^base64-/);
    expect(JSON.parse(Buffer.from(fresh.slice(7), "base64url").toString())).toMatchObject({ access_token: "fresh-access-token" });
    expect(state.jar.get(verifier)).toBe("");
  });

  it("also leaves a session intact when there is no code", async () => {
    await GET(new Request("https://naeil.dev/auth/callback"));
    expect(state.set).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
