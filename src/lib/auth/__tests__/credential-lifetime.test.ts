import { beforeEach, expect, it, vi } from "vitest";
import type { ReactElement, ReactNode } from "react";
import { createSiteState, type SiteStateCell } from "../site-state";
import type { CredentialDraft } from "@/components/site-session-state";

const fixture = vi.hoisted(() => ({ cell: null as unknown as SiteStateCell<CredentialDraft>, begin: vi.fn(), submit: vi.fn(), password: vi.fn(), assign: vi.fn() }));
vi.mock("react", async importOriginal => ({ ...await importOriginal<typeof import("react")>(), useRef: () => ({ current: null }), useId: () => "status" }));
vi.mock("next-intl", () => ({ useLocale: () => "ko", useTranslations: () => (key: string) => key }));
vi.mock("@/components/site-session-state", () => ({ useCredentialDraft: () => [fixture.cell.get(), fixture.cell.set, fixture.cell] }));
vi.mock("@/app/[locale]/login/credential-actions", () => ({ beginPasswordChange: fixture.begin, submitPasswordChange: fixture.submit, passwordLogin: fixture.password, emailLogin: vi.fn(), resumePasswordChange: vi.fn(), leavePasswordChange: vi.fn(), requestPasswordCode: vi.fn() }));
import { CredentialForms } from "@/app/[locale]/login/credential-forms";

function formAction(node: ReactNode): (data: FormData) => Promise<void> {
  if (!node || typeof node !== "object") throw new Error("Form missing");
  const element = node as ReactElement<{ action?: (data: FormData) => Promise<void>; children?: ReactNode }>;
  if (element.type === "form") return element.props.action!;
  for (const child of [element.props?.children].flat(Infinity) as ReactNode[]) {
    try { return formAction(child); } catch { /* Search the actual rendered children. */ }
  }
  throw new Error("Form missing");
}
let store: ReturnType<typeof createSiteState>;
beforeEach(() => {
  vi.resetAllMocks();
  store = createSiteState();
  fixture.cell = store.cell<CredentialDraft>("credential", { email: "", password: "", current_password: "", confirm: "", nonce: "", busy: false, status: "" }, "/login/change-password");
  vi.stubGlobal("window", { location: { assign: fixture.assign } });
  vi.stubGlobal("document", { documentElement: { lang: "ja" } });
});

it("does not submit a password mutation after route cleanup while begin is pending", async () => {
  let ready!: (result: { status: string }) => void;
  fixture.begin.mockReturnValue(new Promise(resolve => { ready = resolve; }));
  const pending = formAction(CredentialForms({ change: true }))(new FormData());
  store.enterRoute("/blog");
  ready({ status: "ready" });
  await pending;
  expect(fixture.submit).not.toHaveBeenCalled();
  expect(fixture.assign).not.toHaveBeenCalled();
});

it("uses the committed UI locale for a forced password page while keeping normal return destinations exact", async () => {
  fixture.password.mockResolvedValue({ status: "signedIn", authPage: "change-password", location: "/ko/login/change-password" });
  await formAction(CredentialForms({}))(new FormData());
  expect(fixture.assign).toHaveBeenLastCalledWith("/ja/login/change-password");
  fixture.password.mockResolvedValue({ status: "signedIn", location: "https://abestimate.naeil.dev/ko/calendar?view=week#entry" });
  await formAction(CredentialForms({}))(new FormData());
  expect(fixture.assign).toHaveBeenLastCalledWith("https://abestimate.naeil.dev/ko/calendar?view=week#entry");
});
