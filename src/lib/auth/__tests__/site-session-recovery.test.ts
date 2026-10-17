import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({
  jar: undefined as unknown as CookieJar,
  requests: [] as string[],
  failLogout: false,
  failRefresh: false,
  failUser: false,
  waitToken: undefined as undefined | (() => Promise<void>),
}));
vi.mock("next/headers", () => ({
  cookies: async () => state.jar,
  headers: async () => new Headers({ host: "naeil.dev" }),
}));
vi.mock("@/i18n/routing", () => ({ redirect: () => { throw new Error("NEXT_REDIRECT"); } }));

import { clearLocalSession, logout, prepareLogin } from "@/app/[locale]/login/actions";
import { GET as callback } from "@/app/auth/callback/route";
import { updateSession } from "@/lib/supabase/middleware";
import { createClient } from "@/lib/supabase/server";
import { NavServerWrapper } from "@/components/nav-server-wrapper";

type Cookie = { name: string; value: string; options?: Record<string, unknown> };
class CookieJar {
  values = new Map<string, string>();
  writes: Cookie[] = [];
  constructor(cookies: Cookie[] = []) { for (const cookie of cookies) this.values.set(cookie.name, cookie.value); }
  get = (name: string) => this.values.has(name) ? { name, value: this.values.get(name)! } : undefined;
  getAll = () => [...this.values].map(([name, value]) => ({ name, value }));
  set = (name: string, value: string, options?: Record<string, unknown>) => {
    this.writes.push({ name, value, options });
    if (options?.maxAge === 0) this.values.delete(name); else this.values.set(name, value);
  };
  apply(cookies: Cookie[]) { for (const cookie of cookies) this.set(cookie.name, cookie.value, cookie.options); }
  header() { return this.getAll().map(({ name, value }) => `${name}=${encodeURIComponent(value)}`).join("; "); }
}
const generation = "a".repeat(32), epoch = "b".repeat(32);
const sessionName = `sb-naeil-site-auth-${generation}-${epoch}`;
const user = { id: "20000000-0000-4000-8000-000000000002", aud: "authenticated", role: "authenticated", email: "fixture@example.test", user_metadata: {}, app_metadata: {}, created_at: "2026-01-01T00:00:00Z" };
const token = (expires = 3600) => ({ access_token: "synthetic.access.token", refresh_token: "synthetic-refresh", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + expires, user });
const encode = (value: unknown) => "base64-" + Buffer.from(JSON.stringify(value)).toString("base64url");
function fixture(expires = 3600) {
  return new CookieJar([
    { name: "naeil-site-auth-generation", value: generation }, { name: "naeil-site-auth-epoch", value: epoch },
    { name: sessionName, value: encode(token(expires)) }, { name: sessionName + "-code-verifier", value: encode("fixture-verifier") },
    { name: "sb-naeil-site-auth", value: encode(token(expires)) }, { name: "sb-naeil-site-auth-code-verifier", value: encode("fixture-verifier") },
    { name: "sb-legacy-auth-token", value: "preserve-shared-scope" },
  ]);
}
function deferred() {
  let release!: () => void;
  const promise = new Promise<void>(resolve => { release = resolve; });
  return { promise, release };
}

beforeEach(() => {
  state.jar = fixture(); state.requests = []; state.failLogout = false; state.failRefresh = false; state.failUser = false; state.waitToken = undefined;
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:55431");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "fixture-anon");
  vi.stubGlobal("fetch", async (input: string | URL) => {
    const url = new URL(input); state.requests.push(url.pathname + url.search);
    if (url.pathname === "/auth/v1/logout") return new Response(state.failLogout ? JSON.stringify({ error_code: "unexpected_failure" }) : null, { status: state.failLogout ? 503 : 204, headers: { "Content-Type": "application/json" } });
    if (url.pathname === "/auth/v1/token") {
      await state.waitToken?.();
      if (state.failRefresh) return Response.json({ error_code: "invalid_api_key", message: "Synthetic project key error" }, { status: 401 });
      return Response.json(token());
    }
    if (url.pathname === "/auth/v1/user") return state.failUser ? Response.json({ error_code: "unexpected_failure" }, { status: 503 }) : Response.json(user);
    throw new Error("Unexpected synthetic transport path");
  });
});

describe("site local logout recovery using the real SSR Auth SDK", () => {
  it("retains the shared account control during an outage without rendering an unverified identity", async () => {
    state.failUser = true;
    const view = await NavServerWrapper();
    expect(view.props.user).toBeNull();
    expect(view.props.sessionPresent).toBe(true);
    state.jar.values.set("naeil-site-auth-generation", "c".repeat(32));
    expect((await NavServerWrapper()).props.sessionPresent).toBe(false);
  });

  it("keeps recoverable cookies when logout refresh fails with an ambiguous credential error", async () => {
    state.jar = fixture(-60); state.failRefresh = true;
    await expect(logout("ja")).rejects.toThrow("Sign out failed");
    expect(state.jar.get(sessionName)).toBeDefined();
    expect(state.jar.writes).toEqual([]);
  });

  it("retains a failed normal logout, then deliberately clears only site-owned state without a dependency call", async () => {
    state.failLogout = true;
    await expect(logout("ja")).rejects.toThrow("Sign out failed");
    expect(state.jar.get(sessionName)).toBeDefined();
    const before = state.requests.length;
    await clearLocalSession();
    expect(state.requests).toHaveLength(before);
    expect(state.jar.getAll().filter(cookie => cookie.name.startsWith("sb-naeil-site-auth"))).toEqual([]);
    expect(state.jar.get("sb-legacy-auth-token")?.value).toBe("preserve-shared-scope");
    expect(state.jar.get("naeil-site-auth-epoch")?.value).toMatch(/^[a-f0-9]{32}$/);
    expect(state.jar.get("naeil-site-auth-epoch")?.value).not.toBe(epoch);
    expect(state.jar.writes.find(cookie => cookie.name === "naeil-site-auth-epoch")?.options).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", path: "/" });
  });

  it("does not authenticate from a refreshed cookie response that arrives after local clear", async () => {
    const browser = fixture(-60);
    const entered = deferred(), waiting = deferred();
    state.waitToken = async () => { entered.release(); await waiting.promise; };
    const pending = updateSession(new NextRequest("https://naeil.dev/ja", { headers: { host: "naeil.dev", cookie: browser.header() } }));
    await entered.promise;
    state.jar = new CookieJar(browser.getAll());
    await clearLocalSession(); browser.apply(state.jar.writes);
    waiting.release();
    const old = await pending;
    browser.apply(old.response.cookies.getAll().map(({ name, value, ...options }) => ({ name, value, options })));
    state.jar = new CookieJar(browser.getAll());
    expect((await (await createClient()).auth.getUser()).data.user).toBeNull();
    expect(browser.get("naeil-site-auth-epoch")?.value).not.toBe(epoch);
  });

  it("does not authenticate from an exchanged callback response that arrives after local clear", async () => {
    const browser = fixture();
    const callbackJar = new CookieJar(browser.getAll()); state.jar = callbackJar;
    const entered = deferred(), waiting = deferred();
    state.waitToken = async () => { entered.release(); await waiting.promise; };
    const pending = callback(new Request("https://naeil.dev/auth/callback?code=fixture-code"));
    await entered.promise;
    state.jar = new CookieJar(browser.getAll()); await clearLocalSession(); browser.apply(state.jar.writes);
    waiting.release(); await pending;
    browser.apply(callbackJar.writes);
    state.jar = new CookieJar(browser.getAll());
    expect((await (await createClient()).auth.getUser()).data.user).toBeNull();
  });

  it("a delayed login preparation cannot overwrite the epoch advanced by local clear", async () => {
    const browser = fixture(); state.jar = new CookieJar(browser.getAll());
    await prepareLogin("/ja/blog", "ja");
    const oldPreparation = [...state.jar.writes];
    state.jar = new CookieJar(browser.getAll()); await clearLocalSession(); browser.apply(state.jar.writes);
    const clearedEpoch = browser.get("naeil-site-auth-epoch")?.value;
    browser.apply(oldPreparation);
    expect(browser.get("naeil-site-auth-epoch")?.value).toBe(clearedEpoch);
    expect(clearedEpoch).not.toBe(epoch);
    state.jar = new CookieJar(browser.getAll());
    expect((await (await createClient()).auth.getUser()).data.user).toBeNull();
  });

  it("a fresh explicit provider login authenticates under the new epoch after local clear", async () => {
    await clearLocalSession();
    const binding = await prepareLogin("/ja/blog", "ja");
    expect(binding.generation).not.toBe(generation);
    expect(binding.epoch).not.toBe(epoch);
    const current = `sb-naeil-site-auth-${binding.generation}-${binding.epoch}`;
    state.jar.set(current + "-code-verifier", encode("fixture-new-verifier"));
    const result = await callback(new Request("https://naeil.dev/auth/callback?code=fresh-fixture-code"));
    expect(result.headers.get("location")).toBe("https://naeil.dev/ja/blog");
    expect((await (await createClient()).auth.getUser()).data.user?.id).toBe(user.id);
  });

  it("keeps the new return location when an earlier callback completes after logout and a fresh login click", async () => {
    const browser = fixture();
    const oldCallbackJar = new CookieJar(browser.getAll()); state.jar = oldCallbackJar;
    const entered = deferred(), waiting = deferred();
    state.waitToken = async () => { entered.release(); await waiting.promise; };
    const oldCallback = callback(new Request("https://naeil.dev/auth/callback?code=old-code"));
    await entered.promise;

    state.jar = new CookieJar(browser.getAll()); await clearLocalSession(); browser.apply(state.jar.writes);
    state.jar = new CookieJar(browser.getAll());
    const binding = await prepareLogin("/ja/blog?attempt=new#new", "ja"); browser.apply(state.jar.writes);
    browser.set(`sb-naeil-site-auth-${binding.generation}-${binding.epoch}-code-verifier`, encode("new-verifier"));

    waiting.release(); await oldCallback; browser.apply(oldCallbackJar.writes);
    state.jar = new CookieJar(browser.getAll());
    const newCallback = await callback(new Request("https://naeil.dev/auth/callback?code=new-code"));
    expect((await (await createClient()).auth.getUser()).data.user?.id).toBe(user.id);
    expect(newCallback.headers.get("location")).toBe("https://naeil.dev/ja/blog?attempt=new#new");
  });

  it("normalizes an invalid epoch cookie without letting preparation overwrite a valid clear epoch", async () => {
    state.jar.values.set("naeil-site-auth-epoch", "malformed-cookie-value");
    const binding = await prepareLogin("/ja/blog", "ja");
    expect(binding.epoch).toBe("initial");
    expect(state.jar.writes.some(cookie => cookie.name === "naeil-site-auth-epoch")).toBe(false);
    state.jar.set(`sb-naeil-site-auth-${binding.generation}-initial-code-verifier`, encode("fixture-verifier"));
    await callback(new Request("https://naeil.dev/auth/callback?code=fresh-fixture-code"));
    expect((await (await createClient()).auth.getUser()).data.user?.id).toBe(user.id);
  });

  it("successful normal logout advances the epoch even after a required SDK refresh", async () => {
    state.jar = fixture(-60);
    await expect(logout("ja")).rejects.toThrow("NEXT_REDIRECT");
    expect(state.requests).toContain("/auth/v1/token?grant_type=refresh_token");
    expect(state.requests).toContain("/auth/v1/logout?scope=local");
    expect(state.jar.getAll().filter(cookie => cookie.name.startsWith("sb-naeil-site-auth"))).toEqual([]);
    expect(state.jar.get("naeil-site-auth-epoch")?.value).not.toBe(epoch);
  });
});
