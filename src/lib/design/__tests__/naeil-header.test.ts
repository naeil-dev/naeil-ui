import { createElement, type ComponentPropsWithoutRef, type MouseEvent } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import { Nav } from "../../../components/nav";
import type { NaeilHeaderProps } from "../../../components/naeil-header";

// A missing optional entry is a contract failure, with a useful RED assertion.
const entry = await import("../../../components/naeil-header").catch(() => null);
function header(props: NaeilHeaderProps) {
  expect(entry?.NaeilHeader, "the complete React-only header is exported").toBeTypeOf("function");
  return entry!.NaeilHeader(props);
}
const Link = ({ children, ...props }: ComponentPropsWithoutRef<"a"> & { href: string }) =>
  createElement("a", { ...props, "data-consumer-link": true }, children);

describe("complete branded header", () => {
  it("passes Home navigation data unchanged between catalog/blog and subNav", () => {
    const items = [{ id: "ai", label: "AI", columns: 1 as const, items: [{ id: "keys", label: "Keys", href: "/keys", active: true, description: "Manage", icon: createElement("svg"), badge: "New", external: true, target: "_blank" as const }] }, { id: "console", label: "Console", href: "/console" }];
    const element = header({ locale: "ko", appNavigation: items, subNav: [{ label: "Settings", href: "/settings" }] } as NaeilHeaderProps);
    expect(element.props.items.map((item: { id: string }) => item.id)).toEqual(["projects", "blog", "ai", "console", "/settings"]);
    expect(element.props.items[2]).toBe(items[0]);
    expect(element.props.items[3]).toBe(items[1]);
    const html = renderToStaticMarkup(header({ locale: "en", brandSuffix: "Home", brandSlot: createElement("span", null, "Custom") } as NaeilHeaderProps));
    expect(html).not.toContain("naeil-header-brand-suffix");
  });
  it.each([
    ["ja", "プロジェクト", "ブログ", "準備中", "https://naeil.dev/ja/blog"],
    ["ko", "프로젝트", "블로그", "준비 중", "https://naeil.dev/ko/blog"],
    ["en", "Projects", "Blog", "Coming Soon", "https://naeil.dev/en/blog"],
  ] as const)("owns the localized %s catalog and official destinations", (locale, projects, blog, coming, href) => {
    const element = header({ locale });
    const [group, blogLink] = element.props.items;
    expect(group.label).toBe(projects);
    expect(group.columns).toBe(1);
    expect(group.items.map((item: { href: string }) => item.href)).toEqual([`https://naeil.dev/${locale}/design`]);
    expect(blogLink).toMatchObject({ label: blog, href });
    expect(group.items[0].badge).toBeUndefined();
    expect(renderToStaticMarkup(header({ locale, translations: { projects, blog, project: key => key === "status.coming" ? coming : key } }))).not.toContain(coming);
    expect(group.items[0].icon.props.children.props.src.slice(0, 80)).toBe("https://naeil.dev/images/whale.png");
  });

  it("routes absolute blog and brand destinations through the consumer link", () => {
    const element = header({ locale: "ja", Link });
    const html = renderToStaticMarkup(element);
    expect(html).toMatch(/<a[^>]*href="https:\/\/naeil.dev\/ja"[^>]*data-consumer-link="true"/);
    expect(html).toMatch(/<a[^>]*href="https:\/\/naeil.dev\/ja\/blog"[^>]*data-consumer-link="true"/);
    expect(html).toContain('data-naeil-variant="horizontal"');
    expect(html).toContain('data-global-header="true"');
    expect(html).toContain('data-app-brand="true"');
    expect(html).toContain('data-app-toolbar="true"');
  });

  it("preserves explicit external project overrides while default links use the guard path", () => {
    const element = header({ locale: "ja", projects: [{ id: "external", label: "External", href: "https://example.org/project", external: true }] });
    expect(element.props.items[0].items[0]).toMatchObject({ href: "https://example.org/project", external: true });
    expect(header({ locale: "ja" }).props.items[0].items.every((item: { external?: boolean }) => !item.external)).toBe(true);
  });

  it("names the default brand destination while preserving custom accessible branding", () => {
    expect(header({ locale: "ja" }).props.brand.props["aria-label"]).toBe(".naeil");
    expect(header({ locale: "ja", brandSlot: createElement("span", null, "Consumer brand") }).props.brand.props["aria-label"]).toBeUndefined();
  });

  it("applies compatibility translations to the actual shared project composition", () => {
    const element = header({ locale: "en", translations: { projects: "Consumer tools", blog: "Consumer journal", project: key => ({ "naeilUi.name": "My design system", "naeilUi.description": "My token description" })[key] ?? key } });
    expect(element.props.items[0]).toMatchObject({ label: "Consumer tools" });
    expect(element.props.items[0].items[0]).toMatchObject({ label: "My design system", description: "My token description" });
    expect(renderToStaticMarkup(element)).toContain("Consumer journal");
  });

  it("does not require project dictionaries when the project menu is hidden", () => {
    expect(() => header({ locale: "en", showProjects: false, translations: {
      projects: "", blog: "Journal", project: () => { throw new Error("No project dictionary in this consumer"); },
    } })).not.toThrow();
  });

  it("forwards brand interception with its actual destination", () => {
    const onNavigate = vi.fn();
    const onClick = vi.fn();
    const element = header({ locale: "ko", onNavigate, brandLinkProps: { onClick, "aria-label": "Custom home" } });
    const event = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false } as MouseEvent<HTMLAnchorElement>;
    element.props.brand.props.onClick(event);
    expect(onClick).toHaveBeenCalledWith(event);
    expect(onNavigate).toHaveBeenCalledWith(event, expect.objectContaining({ href: "https://naeil.dev/ko", id: "brand" }));
    expect(element.props.brand.props["aria-label"]).toBe("Custom home");
  });

  it("renders SSR-safe theme and auth without claiming unsupported locales", () => {
    const element = header({ locale: "ja", authSlot: createElement("button", null, "Logout") });
    const html = renderToStaticMarkup(element);
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*aria-label="ダークテーマに切り替える"/);
    expect(html).not.toContain('role="combobox"');
    expect(html.indexOf("ダークテーマに切り替える")).toBeLessThan(html.indexOf("Logout"));
    const localeHtml = renderToStaticMarkup(header({ locale: "ja", onLocaleChange: () => {} }));
    expect(localeHtml).toContain('role="combobox"');
    expect(localeHtml).toContain('aria-label="言語"');
  });

  it("preserves explicit destinations, visibility, current project, labels and frame overrides", () => {
    const element = header({ locale: "en", resolveHref: path => path, currentHref: "/design/tokens", brandHref: "/home", subNav: [{ label: "Settings", href: "/settings" }], labels: { navigation: "App", menu: "Open", close: "Close" }, containerClassName: "custom-frame", className: "custom-header" });
    expect(element.props.items[0].items[0]).toMatchObject({ href: "/design", active: true });
    expect(header({ locale: "en", resolveHref: path => path, currentProjectKey: "naeilUi", currentProjectHref: "/workspace" }).props.items[0].items[0]).toMatchObject({ href: "/workspace", active: true });
    expect(element.props.items[2]).toMatchObject({ label: "Settings", href: "/settings" });
    expect(element.props.brand.props.href).toBe("/home");
    expect(element.props.labels.navigation).toBe("App");
    expect(element.props.containerClassName).toContain("custom-frame");
    expect(element.props.className).toContain("custom-header");
    expect(header({ locale: "en", showProjects: false, showBlog: false }).props.items).toEqual([]);
  });
});

describe("legacy Nav compatibility", () => {
  const messages = {
    nav: { projects: "Consumer tools", blog: "Consumer journal" },
    projects: { ...Object.fromEntries(["cc", "pkm", "naeilUi", "sa", "babyAgent"].map(key => [key, { name: `Consumer ${key}`, description: `Description ${key}` }])), status: { coming: "Later" } },
  };
  function legacy(locale: string, external = false) {
    const InternalOnlyLink = ({ href, ...props }: ComponentPropsWithoutRef<"a"> & { href: string }) => {
      if (href.startsWith("https://")) throw new Error("External destination reached internal-only Link");
      return createElement("a", { href, ...props, "data-internal-link": true });
    };
    // eslint-disable-next-line react/no-children-prop
    return renderToStaticMarkup(createElement(NextIntlClientProvider, { locale, messages, timeZone: "UTC", children: createElement(Nav, { Link: InternalOnlyLink, usePathname: () => "/", projectsExternal: external }) }));
  }
  it("uses consumer next-intl menu labels", () => {
    expect(legacy("en")).toContain("Consumer tools");
    expect(legacy("en")).toContain("Consumer journal");
  });
  it("supports consumer locales outside the canonical header catalog", () => {
    expect(() => legacy("fr")).not.toThrow();
    expect(legacy("fr")).toContain("Consumer journal");
  });
  it("keeps legacy external blog destinations away from an internal-only Link", () => {
    expect(() => legacy("en", true)).not.toThrow();
    expect(legacy("en", true)).toContain('href="https://naeil.dev/blog"');
    const element = header({ locale: "en", resolveHref: path => `https://naeil.dev${path}`, projectsExternal: true });
    expect(element.props.items[0].items[0].external).toBe(true);
    expect(header({ locale: "en", projectsExternal: true, currentProjectKey: "naeilUi" }).props.items[0].items[0].external).toBe(false);
  });
});
