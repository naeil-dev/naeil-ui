import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Logo } from "../../../components/logo";
import { Nav } from "../../../components/nav";
import { Footer } from "../../../components/footer";
import { NextIntlClientProvider } from "next-intl";

describe("Logo brand contract", () => {
  it("keeps legacy sizing/classes while exposing the approved symbol accessibly", () => {
    const html = renderToStaticMarkup(createElement(Logo, { size: 32, className: "consumer-logo" }));
    expect(html).toContain('width="32"');
    expect(html).toContain('height="32"');
    expect(html).toContain('class="consumer-logo"');
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="naeil"');
    expect(html).toContain('viewBox="24 30 208 208"');
    expect(html).not.toContain('<image');
  });

  it("isolates paint references when multiple equal-size logos share an SSR document", () => {
    const html = renderToStaticMarkup(createElement(Fragment, null,
      createElement(Logo, { size: 28 }), createElement(Logo, { size: 28 })));
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
    for (const match of html.matchAll(/url\(#([^\)]+)\)/g)) expect(ids).toContain(match[1]);
  });

  it("retains the currentColor mono contract without requiring theme styles", () => {
    const html = renderToStaticMarkup(createElement(Logo, { mono: true }));
    expect(html).toContain('fill="currentColor"');
    expect(html).not.toContain('<linearGradient');
    expect(html).toContain('viewBox="24 30 208 208"');
  });

  it("provides outlined lockups and decorative naming without external font loading", () => {
    const html = renderToStaticMarkup(createElement(Logo, { variant: "horizontal", size: 28, tone: "gray", theme: "dark", label: null }));
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('aria-label=');
    expect(html).not.toMatch(/<text|<image|font-family/);
    expect(html).toContain('height="28"');
    expect(html).toContain('viewBox="0 0 96.938776 28"');
    expect(html).toContain('#F0F0F0');
  });

  it("uses the common lockups in default navigation/footer while retaining custom brand slots", () => {
    const Link = ({ children, ...props }: React.ComponentPropsWithoutRef<"a"> & { href: string }) => createElement("a", props, children);
    // React 19 provider types require a children property even with variadic createElement children.
    // eslint-disable-next-line react/no-children-prop
    const render = (custom: boolean) => renderToStaticMarkup(createElement(NextIntlClientProvider,
      { children: null, locale: "en", timeZone: "UTC", messages: { nav: {}, projects: {}, footer: { tagline: "Tomorrow starts here.", navigation: "Navigation", projects: "Projects", blog: "Blog", social: "Social" } } },
      createElement(Fragment, null,
        createElement(Nav, { Link, usePathname: () => "/", showProjects: false, showBlog: false,
          ...(custom ? { brandSlot: createElement("span", null, "Consumer brand") } : {}) }),
        createElement(Footer, {}))));
    expect(render(false)).toContain('data-naeil-variant="horizontal"');
    expect(render(false)).toContain('data-naeil-variant="footer"');
    const custom = render(true);
    expect(custom).toContain('Consumer brand');
    expect(custom).not.toContain('data-naeil-variant="horizontal"');
  });
});
