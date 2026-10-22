import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { isSiteSessionCookie, isTerminalSessionError, siteAuthCookiesToClear, siteCookieOptions } from "../site-session";

const sessionName = "sb-dathsxdsaxooifnxjket-auth-token";

const state = vi.hoisted(() => ({ error: null as unknown, clientOptions: undefined as unknown }));
vi.mock("@supabase/ssr", () => ({
  createServerClient: (_url: unknown, _key: unknown, options: unknown) => {
    state.clientOptions = options;
    return { auth: { getUser: async () => {
      // Model the SDK's own early session removal during failed refresh.
      if (state.error) (options as {cookies:{setAll:(cookies:unknown[])=>void}}).cookies.setAll([{name:'sb-dathsxdsaxooifnxjket-auth-token.0',value:'',options:{path:'/',maxAge:0}}]);
      return { data: { user: null }, error: state.error };
    } } };
  },
}));
import { updateSession } from "@/lib/supabase/middleware";

beforeEach(() => { state.error = null; state.clientOptions = undefined; });
describe("website-only SSR session", () => {
  it("shares one secure .naeil.dev session cookie, with local HTTP fixtures supported", () => {
    expect(siteCookieOptions("naeil.dev")).toEqual({ path: "/", secure: true, sameSite: "lax", domain: ".naeil.dev" });
    expect(siteCookieOptions("abestimate.naeil.dev:443").domain).toBe(".naeil.dev");
    expect(siteCookieOptions("evilnaeil.dev").domain).toBeUndefined();
    expect(siteCookieOptions("127.0.0.1:2482")).toMatchObject({ secure: false, domain: undefined });
    expect(siteCookieOptions("localhost:2482").secure).toBe(false);
    expect(isSiteSessionCookie(sessionName + ".0")).toBe(true);
    expect(isSiteSessionCookie(sessionName + "-code-verifier")).toBe(false);
  });

  it("logout clears the shared session on .naeil.dev and legacy site cookies host-only", () => {
    const cleared = siteAuthCookiesToClear([sessionName + ".0", sessionName + "-code-verifier", "sb-naeil-site-auth-" + "a".repeat(32) + "-initial.0", "naeil-site-auth-epoch", "auth_redirect_to", "NEXT_LOCALE"], "naeil.dev");
    expect(cleared.map(c => [c.name, c.options.domain])).toEqual([
      [sessionName + ".0", ".naeil.dev"], [sessionName + "-code-verifier", ".naeil.dev"],
      ["sb-naeil-site-auth-" + "a".repeat(32) + "-initial.0", undefined], ["naeil-site-auth-epoch", undefined], ["auth_redirect_to", undefined],
    ]);
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
      host: "naeil.dev", cookie: `${sessionName}.0=fixture; ${sessionName}-code-verifier=pkce; NEXT_LOCALE=ja`,
    } });
    const result = await updateSession(request);
    expect(result.unavailable).toBe(true);
    expect(result.response.cookies.getAll()).toHaveLength(0);
    expect(state.clientOptions).toMatchObject({ cookieOptions: { domain: ".naeil.dev", secure: true } });
  });

  it("terminal expiry clears only shared session chunks on .naeil.dev and keeps pending PKCE", async () => {
    state.error = { status: 400, code: "refresh_token_not_found" };
    const request = new NextRequest("https://naeil.dev/ko", { headers: {
      host: "naeil.dev", cookie: `${sessionName}.0=fixture; ${sessionName}.1=fixture; ${sessionName}-code-verifier=pkce; NEXT_LOCALE=ja`,
    } });
    const result = await updateSession(request);
    expect(result.unavailable).toBe(false);
    expect(result.response.cookies.getAll().map(c => c.name)).toEqual([`${sessionName}.0`, `${sessionName}.1`]);
    for (const cookie of result.response.cookies.getAll()) expect(cookie).toMatchObject({ value: "", path: "/", maxAge: 0, secure: true, domain: ".naeil.dev" });
  });

  it("does not treat a matching semantic code under the wrong HTTP status as expiry", () => {
    expect(isTerminalSessionError({ status: 503, code: "session_not_found" })).toBe(false);
  });
});
