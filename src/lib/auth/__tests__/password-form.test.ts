import { expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
vi.mock("next-intl", () => ({
  useLocale: () => "ko",
  useTranslations: () => (key: string) => key,
}));
vi.mock("@/app/[locale]/login/credential-actions", () => ({
  passwordLogin: vi.fn(),
  emailLogin: vi.fn(),
  beginPasswordChange: vi.fn(),
  submitPasswordChange: vi.fn(),
  resumePasswordChange: vi.fn(),
  leavePasswordChange: vi.fn(),
  requestPasswordCode: vi.fn(),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/ko/login" }));
vi.mock("@/naeil-locale/client", () => ({ useLocaleBeforeUnload: () => {} }));
import { SiteSessionStateProvider } from "@/components/site-session-state";
import { CredentialForms } from "@/app/[locale]/login/credential-forms";
it.each([false, true])(
  "defaults to paused mail controls while keeping the primary action (change=%s)",
  (change) => {
    const html = renderToStaticMarkup(
      createElement(SiteSessionStateProvider, null, createElement(CredentialForms, { change })),
    );
    expect(html).toContain(change ? "reauthMailPaused" : "emailLoginPaused");
    expect(html).toContain(change ? "changePassword" : "passwordSignIn");
    expect(html).not.toContain("emailLoginLink");
    expect(html).not.toContain("requestCode");
    expect(html).not.toContain('name="nonce"');
    expect(html).toContain('name="password"');
  },
);
it.each([false, true])(
  "keeps a persistent status region linked to the inputs (change=%s)",
  (change) => {
    const html = renderToStaticMarkup(
      createElement(SiteSessionStateProvider, null, createElement(CredentialForms, { change, emailEnabled: true })),
    );
    const id = html.match(/<p id="([^"]+)" role="status"/)?.[1];
    expect(id).toBeTruthy();
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain(`aria-describedby="${id}"`);
    if (change) expect(html).toContain("requestCode");
  },
);
