import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { SITE_AUTH_COOKIE, isSiteSessionCookie, isTerminalSessionError, siteCookieOptions } from "../site-session";

const binding = { generation: "a".repeat(32), epoch: "b".repeat(32) };
const sessionName = `${SITE_AUTH_COOKIE}-${binding.generation}-${binding.epoch}`;
const boundCookies = `naeil-site-auth-generation=${binding.generation}; naeil-site-auth-epoch=${binding.epoch}; `;

const state = vi.hoisted(() => ({ error: null as unknown, clientOptions: undefined as unknown }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: unknown, _key: unknown, options: unknown) => {
    state.clientOptions = options;
    return { auth: { getUser: async () => {
      // Model the SDK's own early session removal during failed refresh.
      if (state.error) (options as {cookies:{setAll:(cookies:unknown[])=>void}}).cookies.setAll([{name:(options as {cookieOptions:{name:string}}).cookieOptions.name+'.0',value:'',options:{path:'/',maxAge:0}}]);
      return { data: { user: null }, error: state.error };
    } } };
  },
}));
import { updateSession } from "@/lib/supabase/middleware";

beforeEach(() => { state.error = null; state.clientOptions = undefined; });
describe("website-only SSR session", () => {
  it("uses a distinct secure host-only namespace, with local HTTP fixtures supported", () => {
    expect(siteCookieOptions("naeil.dev", binding)).toEqual({ name: sessionName, path: "/", secure: true, sameSite: "lax" });
    expect(siteCookieOptions("127.0.0.1:2482").secure).toBe(false);
    expect(siteCookieOptions("localhost:2482").secure).toBe(false);
    expect(isSiteSessionCookie(sessionName + ".0", binding)).toBe(true);
    expect(isSiteSessionCookie(sessionName + "-code-verifier", binding)).toBe(false);
    expect(isSiteSessionCookie("sb-other-auth-token", binding)).toBe(false);
  });

  it.each([
    { status: 503, code: "unexpected_failure" },
    { status: 401, code: "invalid_api_key" },
    { status: 401 },
    { status: 403, code: "session_not_found_wrong" },
    { name: "AuthRetryableFetchError", status: 0 },
  ])("retains recoverable cookies on ambiguous dependency failure %j", async error => {
    state.error = error;
    const request = new NextRequest("https://naeil.dev/ko", { headers: {
      host: "naeil.dev", cookie: boundCookies + `${sessionName}.0=fixture; ${sessionName}-code-verifier=pkce; sb-legacy-auth-token=legacy`,
    } });
    const result = await updateSession(request);
    expect(result.unavailable).toBe(true);
    expect(result.response.cookies.getAll()).toHaveLength(0);
    expect(state.clientOptions).toMatchObject({ cookieOptions: { name: sessionName, secure: true } });
  });

  it("terminal expiry clears only session chunks and keeps pending PKCE and legacy scopes untouched", async () => {
    state.error = { status: 400, code: "refresh_token_not_found" };
    const request = new NextRequest("https://naeil.dev/ko", { headers: {
      host: "naeil.dev", cookie: boundCookies + `${sessionName}.0=fixture; ${sessionName}.1=fixture; ${sessionName}-code-verifier=pkce; sb-legacy-auth-token=legacy`,
    } });
    const result = await updateSession(request);
    expect(result.unavailable).toBe(false);
    expect(result.response.cookies.getAll().map(c => c.name)).toEqual([`${sessionName}.0`, `${sessionName}.1`]);
    for (const cookie of result.response.cookies.getAll()) expect(cookie).toMatchObject({ value: "", path: "/", maxAge: 0, secure: true });
  });

  it("does not treat a matching semantic code under the wrong HTTP status as expiry", () => {
    expect(isTerminalSessionError({ status: 503, code: "session_not_found" })).toBe(false);
  });
});
