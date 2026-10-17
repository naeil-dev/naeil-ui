import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect as nextRedirect } from "next/navigation";
import { siteReturnCookieNames } from "@/lib/auth/site-session";

const { signOut, redirect, setCookie } = vi.hoisted(() => ({ signOut: vi.fn(), redirect: vi.fn(), setCookie: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { signOut } }) }));
vi.mock("@/i18n/routing", () => ({ redirect }));
vi.mock("next/headers", () => ({ cookies: async () => ({set: setCookie, getAll: () => [], get: () => undefined}), headers: async () => new Headers({host: "naeil.dev"}) }));
const { logout, prepareLogin } = await import("./actions");

describe("site logout action", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    redirect.mockImplementation(({ locale, href }) => nextRedirect(`/${locale}${href}`));
  });
  it("preserves the localized framework redirect after a successful sign-out", async () => {
    signOut.mockResolvedValue({ error: null });
    await expect(logout("ja")).rejects.toThrow("NEXT_REDIRECT");
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(redirect).toHaveBeenCalledWith({ href: "/", locale: "ja" });
  });
  it("does not navigate when Supabase returns a logout error", async () => {
    signOut.mockResolvedValue({ error: new Error("private provider detail") });
    await expect(logout("ja")).rejects.toThrow("Sign out failed");
    expect(redirect).not.toHaveBeenCalled();
  });
  it("does not navigate when the provider request throws", async () => {
    signOut.mockRejectedValue(new Error("network failure"));
    await expect(logout("ko")).rejects.toThrow("network failure");
    expect(redirect).not.toHaveBeenCalled();
  });
  it("captures the current locale and canonical return at the actual login click", async () => {
    const first = siteReturnCookieNames(await prepareLogin("/ja/blog?q=two%20words#result", "ja"));
    expect(setCookie).toHaveBeenCalledWith(first.destination, "/ja/blog?q=two%20words#result", expect.objectContaining({httpOnly: true, secure: true, sameSite: "lax", path: "/"}));
    expect(setCookie).toHaveBeenCalledWith(first.locale, "ja", expect.any(Object));
    const second = siteReturnCookieNames(await prepareLogin("//evil.test", "other"));
    expect(setCookie).toHaveBeenCalledWith(second.destination, "/", expect.any(Object));
    expect(setCookie).toHaveBeenCalledWith(second.locale, "en", expect.any(Object));
  });
});
