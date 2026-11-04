import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
const state = vi.hoisted(() => ({
  user: null as null | { id: string; app_metadata?: Record<string, unknown> },
  auth: vi.fn(),
  intl: vi.fn(),
  set: vi.fn(),
}));
vi.mock("@/lib/supabase/middleware", () => ({ updateSession: state.auth }));
vi.mock("@/i18n/routing", () => ({
  routing: { locales: ["en", "ko", "ja"], defaultLocale: "en" },
}));
vi.mock("next-intl/middleware", () => ({ default: () => state.intl }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => ({
      value: name === "auth_redirect_locale" ? "ja" : "https://jev.naeil.dev/",
    }),
    getAll: () => [],
    set: state.set,
  }),
  headers: async () => new Headers({ host: "naeil.dev" }),
}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      exchangeCodeForSession: async () => ({
        data: { user: state.user },
        error: null,
      }),
    },
  }),
}));
import proxy from "@/proxy";
import { GET } from "@/app/auth/callback/route";
beforeEach(() => {
  vi.clearAllMocks();
  state.user = {
    id: "user",
    app_metadata: { console_temp: { must_change: true } },
  };
  state.auth.mockImplementation(async () => {
    const response = NextResponse.next();
    response.cookies.set("fixture-refresh", "value");
    return { response, user: state.user, unavailable: false };
  });
  state.intl.mockImplementation(() => NextResponse.next());
});
describe("minimal site must-change gates", () => {
  it.each([
    "/ko/blog?next=https://jev.naeil.dev/",
    "/ja/login",
    "/projects",
  ])("blocks %s and copies refreshed cookies", async (path) => {
    const r = await proxy(
      new NextRequest("https://naeil.dev" + path, {
        headers: { host: "naeil.dev" },
      }),
    );
    expect(
      new URL(r.headers.get("location")!).pathname.endsWith(
        "/login/change-password",
      ),
    ).toBe(true);
    expect(new URL(r.headers.get("location")!).search).toBe("");
    expect(r.cookies.has("fixture-refresh")).toBe(true);
    expect(state.intl).not.toHaveBeenCalled();
  });
  it("keeps unprefixed English authoritative over the old locale cookie", async () => {
    const r = await proxy(
      new NextRequest("https://naeil.dev/projects", {
        headers: { cookie: "NEXT_LOCALE=ja" },
      }),
    );
    expect(r.headers.get("location")).toBe(
      "https://naeil.dev/login/change-password",
    );
  });
  it("rejects archived routes without starting auth", async () => {
    expect((await proxy(new NextRequest("https://naeil.dev/ja/sa/reports/123"))).status).toBe(404);
    expect(state.auth).not.toHaveBeenCalled();
  });
  it("keeps the change page reachable and preserves normal sessions", async () => {
    expect(
      (
        await proxy(
          new NextRequest("https://naeil.dev/ja/login/change-password"),
        )
      ).status,
    ).toBe(200);
    state.user = { id: "ordinary" };
    expect(
      (await proxy(new NextRequest("https://naeil.dev/ko/blog"))).status,
    ).toBe(200);
    expect(state.intl).toHaveBeenCalledTimes(2);
  });
  it("blocks external next on actual OAuth/OTP callback", async () => {
    const r = await GET(
      new Request("https://naeil.dev/auth/callback?code=fictional"),
    );
    expect(r.headers.get("location")).toBe(
      "https://naeil.dev/ja/login/change-password",
    );
    state.user = { id: "ordinary" };
    expect(
      (
        await GET(new Request("https://naeil.dev/auth/callback?code=fictional"))
      ).headers.get("location"),
    ).toBe("https://jev.naeil.dev/");
  });
  it("keeps invitation isolation ahead of site auth", async () => {
    await proxy(new NextRequest("https://naeil.dev/auth/invite"));
    expect(state.auth).not.toHaveBeenCalled();
  });
});
