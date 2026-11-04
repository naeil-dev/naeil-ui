import { beforeEach, describe, expect, it, vi } from "vitest";

const { signOut, redirect, setCookie } = vi.hoisted(() => ({ signOut: vi.fn(), redirect: vi.fn(), setCookie: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { signOut } }) }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("next/headers", () => ({ cookies: async () => ({set: setCookie, getAll: () => [], get: () => undefined}), headers: async () => new Headers({host: "naeil.dev"}) }));
const { logout, prepareLogin, updateLoginLocale } = await import("./actions");

describe("site logout action", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    redirect.mockImplementation(() => { throw new Error("NEXT_REDIRECT"); });
  });
  it("allows the client to discard root state before its successful sign-out departure", async () => {
    signOut.mockResolvedValue({ error: null });
    await expect(logout()).resolves.toBeUndefined();
    expect(signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(redirect).not.toHaveBeenCalled();
  });
  it("does not navigate when Supabase returns a logout error", async () => {
    signOut.mockResolvedValue({ error: new Error("private provider detail") });
    await expect(logout()).rejects.toThrow("Sign out failed");
    expect(redirect).not.toHaveBeenCalled();
  });
  it("does not navigate when the provider request throws", async () => {
    signOut.mockRejectedValue(new Error("network failure"));
    await expect(logout()).rejects.toThrow("network failure");
    expect(redirect).not.toHaveBeenCalled();
  });
  it("updates a pending authentication UI locale without rewriting the validated return", async () => {
    await updateLoginLocale("ja");
    expect(setCookie).toHaveBeenCalledExactlyOnceWith("auth_redirect_locale", "ja", expect.objectContaining({ httpOnly: true, secure: true, sameSite: "lax", path: "/" }));
  });
  it("captures the current locale and canonical return at the actual login click", async () => {
    await prepareLogin("/ja/blog?q=two%20words#result", "ja");
    expect(setCookie).toHaveBeenCalledWith("auth_redirect_to", "/ja/blog?q=two%20words#result", expect.objectContaining({httpOnly: true, secure: true, sameSite: "lax", path: "/"}));
    expect(setCookie).toHaveBeenCalledWith("auth_redirect_locale", "ja", expect.any(Object));
    await prepareLogin("https://abestimate.naeil.dev/estimates?x=1", "ko");
    expect(setCookie).toHaveBeenCalledWith("auth_redirect_to", "https://abestimate.naeil.dev/estimates?x=1", expect.any(Object));
    await prepareLogin("//evil.test", "other");
    expect(setCookie).toHaveBeenCalledWith("auth_redirect_to", "/", expect.any(Object));
    expect(setCookie).toHaveBeenCalledWith("auth_redirect_locale", "en", expect.any(Object));
  });
});
