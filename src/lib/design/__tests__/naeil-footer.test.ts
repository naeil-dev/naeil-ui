import { createElement, type MouseEvent } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { NaeilFooter } from "../../../components/naeil-footer";
import { SiteFooter } from "../../../components/ui/site-footer";
import type { NavigationLinkProps } from "../../../components/ui/navigation";
import { uiRelease } from "../../ui-release";
import { readFileSync } from "node:fs";

const Link = (props: NavigationLinkProps) => createElement("a", { ...props, "data-guarded": true });
describe("canonical footer", () => {
  it.each(["en", "ko", "ja"] as const)("keeps canonical destinations in both %s variants and forwards every link adapter", locale => {
    for (const variant of ["full", "compact"] as const) {
      const html = renderToStaticMarkup(createElement(NaeilFooter, { locale, variant, Link }));
      for (const href of [`https://naeil.dev/${locale}`, `https://naeil.dev/${locale}/projects`, `https://naeil.dev/${locale}/blog`, "https://github.com/naeil-dev"])
        expect(html).toContain(`href="${href}"`);
      expect(html.match(/data-guarded="true"/g)).toHaveLength(4);
      expect(html).toContain('rel="noopener noreferrer"');
      expect(html).toContain(`data-naeil-ui-version="${uiRelease.version}"`);
      expect(html.includes("Tomorrow starts here.")).toBe(variant === "full");
    }
  });
  it("passes the original event and exact brand destination to the application guard", () => {
    const guard = vi.fn();
    const event = { metaKey: true } as MouseEvent<HTMLAnchorElement>;
    const footer = NaeilFooter({ locale: "ko", resolveHref: path => `/ko${path}`, onNavigate: guard });
    footer.props.brand.props.onClick(event);
    expect(guard).toHaveBeenCalledWith(event, { id: "brand", label: ".naeil", href: "/ko/" });
  });
  it("intercepts explicitly external native group anchors without breaking legacy Link bypass", () => {
    const onNavigate = vi.fn();
    const item = { id: "remote", href: "https://example.org", label: "Remote", external: true };
    const footer = SiteFooter({ Link, onNavigate, groups: [{ id: "links", label: "Links", links: [item] }] });
    const anchor = footer.props.children.props.children[1][0].props.children[1][0];
    expect(anchor.type).toBe("a");
    const event = { ctrlKey: true } as MouseEvent<HTMLAnchorElement>;
    anchor.props.onClick(event);
    expect(onNavigate).toHaveBeenCalledWith(event, item);
  });
  it("binds rendered package identity to the release manifest and independently versioned contract", () => {
    expect(uiRelease.version).toBe(JSON.parse(readFileSync("package.json", "utf8")).version);
    expect(uiRelease.contractVersion).toBe(JSON.parse(readFileSync("contracts/naeil-chrome.v1.json", "utf8")).contractVersion);
  });
});
