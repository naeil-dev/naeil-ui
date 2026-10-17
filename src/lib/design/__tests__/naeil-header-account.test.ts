import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import * as entry from "../../../components/naeil-header";

describe("canonical header account control", () => {
  it("exposes a signed-in account menu instead of a consumer logout button", () => {
    expect(entry).toHaveProperty("NaeilHeaderAccountControl");
    const html = renderToStaticMarkup(createElement(entry.NaeilHeaderAccountControl, {
      locale: "ja", account: { status: "signed-in", onLogout: () => {}, displayName: "Example", email: "example@example.invalid" },
    }));
    expect(html).toContain('data-naeil-account-trigger="true"');
    expect(html).toContain('aria-label="アカウントメニュー"');
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).not.toContain("example@example.invalid");
    expect(html).not.toContain("ログアウト");
  });

  it("uses the consumer login destination and adapter without inventing auth", () => {
    expect(entry).toHaveProperty("NaeilHeaderAccountControl");
    const html = renderToStaticMarkup(createElement(entry.NaeilHeaderAccountControl, {
      locale: "ko", account: { status: "signed-out", loginHref: "/login?next=%2Feditor" },
      Link: props => createElement("a", { ...props, "data-guard-adapter": true }),
    }));
    expect(html).toContain('href="/login?next=%2Feditor"');
    expect(html).toContain('data-guard-adapter="true"');
    expect(html).toContain("로그인");
    expect(html).not.toContain('aria-haspopup="menu"');
  });
});
