import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Expose the real sheet content during SSR; only the DOM portal is substituted.
vi.mock("radix-ui", async importOriginal => {
  const actual = await importOriginal<typeof import("radix-ui")>();
  return { ...actual, Dialog: { ...actual.Dialog, Portal: ({ children }: { children: ReactNode }) => children } };
});
import { NaeilHeader } from "../../../components/naeil-header";

describe("service toolbar-only sheet", () => {
  it("keeps menu and controls without an empty navigation landmark/list", () => {
    const html = renderToStaticMarkup(createElement(NaeilHeader, { service: "jev", locale: "en", mobileOpen: true, onLocaleChange: () => {} }));
    expect(html).toContain('data-slot="navigation-sheet"');
    expect(html).toContain('aria-label="Menu"');
    expect(html).toContain('class="ui-navigation-mobile-toolbar"');
    expect(html).toContain('role="combobox"');
    expect(html).not.toContain('<nav');
    expect(html).not.toContain('<ul');
    expect(html).not.toContain('class="ui-navigation-mobile-links"');
  });
  it("retains the legacy empty sheet landmark", () => {
    const html = renderToStaticMarkup(createElement(NaeilHeader, { locale: "en", showProjects: false, showBlog: false, mobileOpen: true }));
    expect(html).toContain('class="ui-navigation-mobile-links"');
  });
});
