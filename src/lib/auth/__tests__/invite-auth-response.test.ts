import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  error: null as Error | null,
  redirectCookie: undefined as string | undefined,
  cookieSet: vi.fn(),
  redirect: vi.fn(),
  intl: vi.fn(),
  sessionResponse: undefined as unknown,
  unavailable: false,
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => [{ name: "naeil-site-auth-generation", value: "a".repeat(32) }],
    get: (name: string) =>
      name !== `auth_redirect_to-${"a".repeat(32)}-initial` || state.redirectCookie === undefined
        ? undefined
        : { value: state.redirectCookie },
    set: state.cookieSet,
  }),
  headers: async () => new Headers({ host: "naeil.dev" }),
}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      exchangeCodeForSession: async () => {
        if (state.error) throw state.error;
        return { error: null };
      },
    },
  }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
  }),
}));
vi.mock("@/i18n/routing", () => ({
  routing: { locales: ["en", "ko", "ja"], defaultLocale: "ko" },
  redirect: state.redirect,
}));
vi.mock("next/navigation", () => ({ redirect: state.redirect }));
vi.mock("next-intl/middleware", () => ({ default: () => state.intl }));
vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: async () => ({
    response: state.sessionResponse,
    user: state.user,
    unavailable: state.unavailable,
  }),
}));
vi.mock("@/components/logo", () => ({ Logo: () => null }));
import { GET } from "@/app/auth/callback/route";
import LoginPage from "@/app/[locale]/login/page";
import proxy from "@/proxy";
beforeEach(() => {
  vi.clearAllMocks();
  state.user = null;
  state.unavailable = false;
  state.error = null;
  state.redirectCookie = undefined;
  state.sessionResponse = NextResponse.next();
  state.intl.mockImplementation(() => NextResponse.next());
  state.redirect.mockImplementation(() => {
    throw new Error("REDIRECT");
  });
});
describe("actual auth redirect responses", () => {
  it.each([
    "%E0%A4%A",
    "%2F%2Fevil.example",
    "https://unknown.naeil.dev/",
    "https://naeil.dev:444/",
  ])("callback safely falls back for unsafe cookie %s", async (value) => {
    state.redirectCookie = value;
    const r = await GET(
      new Request("https://naeil.dev/auth/callback?code=fixture"),
    );
    expect(r.headers.get("location")).toBe("https://naeil.dev/");
    expect(state.cookieSet).toHaveBeenCalledWith(`auth_redirect_to-${"a".repeat(32)}-initial`, "", {
      path: "/",
      maxAge: 0,
    });
  });
  it("callback returns the canonical allowed URL", async () => {
    state.redirectCookie = "https://JEV.naeil.dev:443/a";
    const r = await GET(
      new Request("https://naeil.dev/auth/callback?code=fixture"),
    );
    expect(r.headers.get("location")).toBe("https://jev.naeil.dev/a");
  });
  it("provider errors never reach response or logs", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    state.error = new Error("private-provider-detail");
    const r = await GET(
      new Request("https://naeil.dev/auth/callback?code=fixture"),
    );
    expect(r.headers.get("location")).toBe("https://naeil.dev/login?error=auth");
    expect(JSON.stringify(spy.mock.calls)).not.toContain(
      "private-provider-detail",
    );
    spy.mockRestore();
  });
  it.each([
    "//evil.example",
    "https://unknown.naeil.dev/",
    "/%2f%2fevil.example",
  ])("logged-in login applies exact policy for %s", async (next) => {
    state.user = { id: "fixture" };
    await expect(
      LoginPage({
        params: Promise.resolve({ locale: "ko" }),
        searchParams: Promise.resolve({ next }),
      }),
    ).rejects.toThrow("REDIRECT");
    expect(state.redirect).toHaveBeenCalledWith("/");
  });
  it("an existing session returns to the already localized URL without duplicating its locale", async () => {
    state.user = { id: "fixture" };
    const next = "/ja/blog?q=one#results";
    await expect(LoginPage({ params: Promise.resolve({locale:"ja"}), searchParams: Promise.resolve({next}) })).rejects.toThrow("REDIRECT");
    expect(state.redirect).toHaveBeenCalledWith(next);
  });
});
describe("final proxy response cookies", () => {
  it("protects document queries with a503 during Auth failure and preserves complete login return on401", async () => {
    state.unavailable = true;
    const unavailable = await proxy(new NextRequest("https://naeil.dev/ja/sa/reports/one?tab=detail"));
    expect(unavailable.status).toBe(503);
    expect(unavailable.headers.get("location")).toBeNull();
    expect(unavailable.headers.get("cache-control")).toBe("no-store");
    state.unavailable = false;
    const expired = await proxy(new NextRequest("https://naeil.dev/ja/sa/reports/one?tab=detail"));
    expect(new URL(expired.headers.get("location")!).searchParams.get("next")).toBe("/ja/sa/reports/one?tab=detail");
  });
  function refreshed() {
    const r = NextResponse.next();
    r.cookies.set({
      name: "sb-fixture-auth-token",
      value: "fixture",
      path: "/",
      domain: ".naeil.dev",
      secure: true,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 300,
    });
    state.sessionResponse = r;
  }
  it.each(["/ko", "/sa/reports/one"])(
    "preserves every refresh cookie option on %s",
    async (path) => {
      refreshed();
      const r = await proxy(new NextRequest(`https://naeil.dev${path}`));
      const c = r.cookies.get("sb-fixture-auth-token");
      expect(c).toMatchObject({
        value: "fixture",
        path: "/",
        domain: ".naeil.dev",
        secure: true,
        httpOnly: true,
        sameSite: "lax",
        maxAge: 300,
      });
      if (path.includes("/reports/"))
        expect(r.headers.get("location")).toContain("/login");
    },
  );
  it("GET/prefetch never overwrites the return state owned by the provider-click action", async () => {
    const bad = await proxy(
      new NextRequest("https://naeil.dev/login?next=%2F%2Fevil.example"),
    );
    expect(bad.cookies.get("auth_redirect_to")).toBeUndefined();
    const good = await proxy(
      new NextRequest("https://naeil.dev/login?next=%2Freports"),
    );
    expect(good.cookies.get("auth_redirect_to")).toBeUndefined();
  });
});

it("invitation proxy supplies a fresh nonce/CSP without SSR or intl processing", async () => {
  const req = new NextRequest("http://localhost:2482/auth/invite", {
    headers: { host: "127.0.0.1:2482", "x-naeil-invite-nonce": "attacker" },
  });
  const r = await proxy(req);
  const nonce = r.headers.get("x-middleware-request-x-naeil-invite-nonce");
  expect(nonce).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(nonce).not.toBe("attacker");
  expect(r.headers.get("content-security-policy")).toContain(
    `'nonce-${nonce}'`,
  );
  expect(r.headers.get("referrer-policy")).toBe("no-referrer");
  expect(state.intl).not.toHaveBeenCalled();
  expect(r.cookies.get("sb-fixture-auth-token")).toBeUndefined();
});
