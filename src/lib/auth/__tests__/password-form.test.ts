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
import { CredentialForms } from "@/app/[locale]/login/credential-forms";
it.each([false, true])(
  "keeps a persistent status region linked to the inputs (change=%s)",
  (change) => {
    const html = renderToStaticMarkup(
      createElement(CredentialForms, { change }),
    );
    const id = html.match(/<p id="([^"]+)" role="status"/)?.[1];
    expect(id).toBeTruthy();
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain(`aria-describedby="${id}"`);
    if (change) expect(html).toContain("requestCode");
  },
);
