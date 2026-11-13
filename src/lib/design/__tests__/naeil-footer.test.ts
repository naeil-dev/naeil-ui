import { createElement, type MouseEvent } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { NaeilFooter } from "../../../components/naeil-footer";
import { NaeilFooter as ProviderFooter } from "../../../naeil-locale/chrome";
import type { NaeilServiceFooterProps } from "../../../components/naeil-footer";
import type { SiteFooterProps } from "../../../components/ui/site-footer";
import type { NavigationLinkProps } from "../../../components/ui/navigation";
import { uiRelease } from "../../ui-release";
import { readFileSync } from "node:fs";

const footerCapture = vi.hoisted(() => ({ props: null as SiteFooterProps | null }));
vi.mock("../../../components/ui/site-footer", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../components/ui/site-footer")>();
  return { ...actual, SiteFooter: (props: SiteFooterProps) => {
    footerCapture.props = props;
    return createElement(actual.SiteFooter, props);
  } };
});

const { SiteFooter: actualSiteFooter } = await vi.importActual<typeof import("../../../components/ui/site-footer")>("../../../components/ui/site-footer");
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
    renderToStaticMarkup(createElement(NaeilFooter, { locale: "ko", resolveHref: path => `/ko${path}`, onNavigate: guard }));
    const brand = footerCapture.props!.brand as ReturnType<typeof createElement<{ onClick: (event: MouseEvent<HTMLAnchorElement>) => void }>>;
    brand.props.onClick(event);
    expect(guard).toHaveBeenCalledWith(event, { id: "brand", label: ".naeil", href: "/ko/" });
  });
  it("intercepts explicitly external native group anchors without breaking legacy Link bypass", () => {
    const onNavigate = vi.fn();
    const item = { id: "remote", href: "https://example.org", label: "Remote", external: true };
    const footer = actualSiteFooter({ Link, onNavigate, groups: [{ id: "links", label: "Links", links: [item] }] });
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

// createElement resolves the last overload; select the service overload explicitly.
const ServiceFooter = NaeilFooter as (props: NaeilServiceFooterProps) => ReturnType<typeof NaeilFooter>;
const ProviderServiceFooter = ProviderFooter as (props: NaeilServiceFooterProps) => ReturnType<typeof ProviderFooter>;
describe("owned service footer profile", () => {
  const legacy = renderToStaticMarkup(createElement(NaeilFooter, { locale: "ko" }));
  it.each(["abstorm", "home", "estimate", "jev"] as const)("renders the canonical full .naeil footer for %s and drops overrides", service => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const overrides = { variant: "compact", className: "app-footer", containerClassName: "x", style: { color: "red" }, "data-app-footer": "", "data-naeil-ui-version": "0", children: "extra" };
      const html = renderToStaticMarkup(createElement(ServiceFooter, { locale: "ko", service, ...overrides } as unknown as NaeilServiceFooterProps));
      expect(html).toBe(legacy);
      expect(footerCapture.props!.variant).toBe("full");
      expect(html).toContain('aria-label=".naeil"');
      expect(html).not.toContain(`.naeil ${service}`);
    } finally { warn.mockRestore(); }
  });
  it("keeps the routing adapter, guard and product meta", () => {
    const guard = vi.fn();
    const html = renderToStaticMarkup(createElement(ServiceFooter, { service: "home", locale: "en", meta: "Version 1.2.3", Link, resolveHref: (path: string) => `/en${path}`, onNavigate: guard }));
    expect(html).toContain("Version 1.2.3");
    expect(html).toContain('href="/en/projects"');
    expect(html.match(/data-guarded="true"/g)).toHaveLength(4);
    expect(footerCapture.props!.onNavigate).toBe(guard);
  });
  it("warns once per ignored prop in development and falls back to legacy for unknown services", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      vi.stubEnv("NODE_ENV", "development");
      for (let i = 0; i < 2; i++) renderToStaticMarkup(createElement(ServiceFooter, { service: "jev", locale: "en", id: "dup" } as unknown as NaeilServiceFooterProps));
      expect(warn).toHaveBeenCalledExactlyOnceWith("NaeilFooter: service profile ignores id; use the shared service composition.");
      const fallback = renderToStaticMarkup(createElement(ServiceFooter, { service: "Main", locale: "en", variant: "compact" } as unknown as NaeilServiceFooterProps));
      expect(fallback).toBe(renderToStaticMarkup(createElement(NaeilFooter, { locale: "en", variant: "compact" })));
    } finally { vi.unstubAllEnvs(); warn.mockRestore(); }
  });
  it("types reject overrides on both entries", () => {
    // @ts-expect-error service footers cannot change density
    const variant: NaeilServiceFooterProps = { locale: "en", service: "home", variant: "compact" };
    // @ts-expect-error service footers cannot add classes
    const element = createElement(ProviderServiceFooter, { locale: "en", service: "home", className: "app-footer" });
    expect([variant.service, Boolean(element)]).toEqual(["home", true]);
  });
});
