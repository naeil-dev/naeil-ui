import { beforeEach, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
const state = vi.hoisted(() => ({
  user: null as null | { id: string; app_metadata: Record<string, unknown> },
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: state.user }, error: null }),
    },
  }),
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));
vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
vi.mock("@/app/[locale]/login/credential-forms", () => ({
  CredentialForms: () => createElement("form", { "data-change": "true" }),
}));
vi.mock("@/app/[locale]/login/oauth-buttons", () => ({
  OAuthButtons: () => null,
}));
vi.mock("@/components/logo", () => ({ Logo: () => null }));
import LoginPage from "@/app/[locale]/login/page";
import PasswordChangePage from "@/app/[locale]/login/change-password/page";
beforeEach(() => {
  state.user = {
    id: "user",
    app_metadata: {
      console_temp: {
        must_change: true,
        locked: false,
        generation: 1,
        issued_at: new Date().toISOString(),
        operation_id: "a2000000-0000-0000-0000-000000000001",
      },
    },
  };
});
it("login page blocks next even without proxy execution", async () => {
  await expect(
    LoginPage({
      params: Promise.resolve({ locale: "ko" }),
      searchParams: Promise.resolve({ next: "https://jev.naeil.dev/" }),
    }),
  ).rejects.toThrow("redirect:/ko/login/change-password");
});
it.each([false, true])(
  "change page renders an input form only before expiry (%s)",
  async (expired) => {
    if (expired)
      (
        state.user!.app_metadata.console_temp as Record<string, unknown>
      ).issued_at = new Date(Date.now() - 8 * 86400_000).toISOString();
    const html = renderToStaticMarkup(await PasswordChangePage());
    expect(html.includes('data-change="true"')).toBe(!expired);
    expect(html.includes("tempExpired")).toBe(expired);
  },
);
