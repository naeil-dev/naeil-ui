import { beforeEach, describe, expect, it, vi } from "vitest";
import { redirect as nextRedirect } from "next/navigation";

const { signOut, redirect } = vi.hoisted(() => ({ signOut: vi.fn(), redirect: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { signOut } }) }));
vi.mock("@/i18n/routing", () => ({ redirect }));
const { logout } = await import("./actions");

describe("site logout action", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    redirect.mockImplementation(({ locale, href }) => nextRedirect(`/${locale}${href}`));
  });
  it("preserves the localized framework redirect after a successful sign-out", async () => {
    signOut.mockResolvedValue({ error: null });
    await expect(logout("ja")).rejects.toThrow("NEXT_REDIRECT");
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
});
