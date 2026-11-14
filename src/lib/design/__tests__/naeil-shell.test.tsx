import { createElement, type ComponentProps, type MouseEvent } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { NaeilServiceShell, NaeilThemeProvider, PageHeader, naeilIcons, type NaeilServiceShellProps } from "../../../components/naeil-shell";
import { NaeilServiceShell as ProviderShell, NaeilThemeProvider as ProviderTheme } from "../../../naeil-locale/chrome";
import { NaeilMessagesProvider } from "../../../components/naeil-messages-context";
import { loadSharedMessages } from "../../../naeil-locale/messages";
import { naeilIcons as serverIcons } from "../../../naeil-locale";
import type { NavigationLinkProps } from "../../../components/ui/navigation";

const render = (props: NaeilServiceShellProps) => renderToStaticMarkup(createElement(NaeilServiceShell, props));
describe("owned service shell", () => {
  it.each(["abstorm", "home", "estimate", "jev"] as const)("renders ordered canonical regions for %s", service => {
    const html = render({ service, locale: "en", mainLabel: "Estimates", children: <PageHeader title="Estimates" description="Your estimates" /> });
    expect(html).toContain('<a class="ui-skip-link" href="#main">Skip to content</a>');
    expect(html).toMatch(/<main id="main" tabindex="-1" class="ui-app-frame ui-app-main" aria-label="Estimates">/);
    expect(html.indexOf('class="ui-skip-link"')).toBeLessThan(html.indexOf("<header"));
    expect(html.indexOf("</header>")).toBeLessThan(html.indexOf("<main"));
    expect(html.indexOf("</main>")).toBeLessThan(html.indexOf("<footer"));
    expect(html).toContain(`aria-label=".naeil ${service}"`);
    expect(html).toContain('data-variant="full"');
    expect(html).toContain('"theme","dark"');
  });
  it("allows recorded footer-less screens and preserves the main", () => {
    const html = render({ service: "home", locale: "ja", footer: false, children: "Login" });
    expect(html).toContain("本文へスキップ");
    expect(html).toContain('id="main"');
    expect(html).not.toContain("<footer");
  });
  it.each(["ko", "ja", "en"] as const)("matches provider-backed output in %s", async locale => {
    const props = { service: "estimate", locale, children: "Content" } as const;
    const messages = await loadSharedMessages(locale);
    const provider = renderToStaticMarkup(<NaeilMessagesProvider locale={locale} messages={messages.naeil}><ProviderShell {...props} /></NaeilMessagesProvider>);
    expect(provider).toBe(render(props));
    expect(ProviderTheme).toBe(NaeilThemeProvider);
  });
  it("passes one Link and guard to both chrome regions", () => {
    const guard = vi.fn();
    const links: NavigationLinkProps[] = [];
    const Link = (props: NavigationLinkProps) => { links.push(props); return <a {...props} data-guarded="" />; };
    const html = render({ service: "estimate", locale: "ko", Link, onNavigate: guard,
      header: { brandHref: "/estimates", appNavigation: [{ id: "list", href: "/list", label: "List" }], currentHref: "/list", authSlot: <button>Account</button> },
      footer: { meta: "Version 1", resolveHref: path => `/ko${path}` } });
    expect(html).toContain("Version 1");
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("Account");
    const event = { ctrlKey: true } as MouseEvent<HTMLAnchorElement>;
    for (const href of ["/estimates", "/ko/projects", "https://github.com/naeil-dev"]) {
      const link = links.find(link => link.href === href)!;
      expect(link).toBeDefined();
      link.onClick!(event);
      expect(guard).toHaveBeenLastCalledWith(event, expect.objectContaining({ href }));
    }
  });
  it("drops cast/JS overrides at every level, warning once per prop only in development", () => {
    const base = { service: "jev", locale: "en" } as const;
    const overrides = { className: "wrong", style: { margin: 500 }, id: "wrong", "data-naeil-ui-version": "wrong", defaultTheme: "light", unknownRoot: true,
      header: { service: "home", locale: "ja", className: "wrong", Link: () => null, unknownHeader: true, "data-slot": "wrong" },
      footer: { variant: "compact", style: { padding: 9 }, Link: () => null, unknownFooter: true } };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      vi.stubEnv("NODE_ENV", "development");
      const expected = render(base);
      for (let i = 0; i < 2; i++) expect(render({ ...base, ...overrides } as unknown as NaeilServiceShellProps)).toBe(expected);
      expect(warn).toHaveBeenCalledTimes(16);
      expect(new Set(warn.mock.calls.map(([message]) => message)).size).toBe(16);
      vi.stubEnv("NODE_ENV", "production"); warn.mockClear();
      render({ ...base, anotherUnknown: true } as unknown as NaeilServiceShellProps);
      expect(warn).not.toHaveBeenCalled();
    } finally { vi.unstubAllEnvs(); warn.mockRestore(); }
  });
  it.each([undefined, null, "Home", "site"])("throws for unknown service %s", service => {
    expect(() => render({ service, locale: "en" } as unknown as NaeilServiceShellProps)).toThrow("Unknown naeil service");
  });
  it("retains root theme policy and ignores cast provider overrides", () => {
    const provider = NaeilThemeProvider({ children: "Child", defaultTheme: "light", storageKey: "custom" } as unknown as ComponentProps<typeof NaeilThemeProvider>);
    expect(provider.props).toEqual({ attribute: "class", defaultTheme: "dark", enableSystem: true, disableTransitionOnChange: true, storageKey: "theme", children: "Child" });
  });
  it("keeps icons server-safe and matches every released brand byte", () => {
    expect(serverIcons).toBe(naeilIcons);
    expect(naeilIcons.brandVersion).toBe("1.1.1");
    const kit = { "favicon.ico": "favicon.ico", "icon.svg": "favicon.svg", "apple-icon.png": "apple-touch-icon.png" } as const;
    for (const [name, source] of Object.entries(kit)) expect(naeilIcons.files[name as keyof typeof kit]).toBe(createHash("sha256").update(readFileSync(`brand/naeil/1.1.1/icons/${source}`)).digest("hex"));
    expect(naeilIcons.links.map(link => link.href)).toEqual(["/favicon.ico", "/icon.svg", "/apple-icon.png"]);
  });
  it("rejects override props including unknown spreads on both entries", () => {
    expectTypeOf<ComponentProps<typeof ProviderShell>>().toEqualTypeOf<ComponentProps<typeof NaeilServiceShell>>();
    const base = { service: "home", locale: "en" } as const;
    // @ts-expect-error shell root has no class override
    const cls: NaeilServiceShellProps = { ...base, className: "wrong" };
    const extra = { id: "other", style: { margin: 9 } };
    // @ts-expect-error known root overrides rejected in spreads
    const spread: NaeilServiceShellProps = { ...base, ...extra };
    // @ts-expect-error shell root has no data attributes
    const data = <NaeilServiceShell {...base} {...{ "data-hello": "bad" }} />;
    // @ts-expect-error literal data attributes cannot override shell identity
    const literalData = <ProviderShell {...base} data-slot="other" />;
    // @ts-expect-error arbitrary spread keys rejected too
    const unknown = <NaeilServiceShell {...base} {...{ surprise: true }} />;
    // @ts-expect-error provider entry shares strict root props
    const provider = <ProviderShell {...base} {...{ defaultTheme: "light" }} />;
    // @ts-expect-error nested header overrides rejected
    const header = <NaeilServiceShell {...base} header={{ className: "bad" }} />;
    // @ts-expect-error nested unknown header spread rejected
    const unknownHeader = <ProviderShell {...base} header={{ ...{ unexpected: 1 } }} />;
    // @ts-expect-error header cannot replace shared guard
    const guard = <NaeilServiceShell {...base} header={{ onNavigate: () => {} }} />;
    // @ts-expect-error footer cannot replace frame/density
    const footer = <ProviderShell {...base} footer={{ ...{ variant: "compact" } }} />;
    // @ts-expect-error arbitrary nested footer keys rejected
    const unknownFooter = <NaeilServiceShell {...base} footer={{ meta: "Version 1", ...{ surprise: 1 } }} />;
    // @ts-expect-error service is required and uses canonical ids
    const invalid = <NaeilServiceShell locale="en" service="Home" />;
    // @ts-expect-error provider accepts children only
    const theme = <NaeilThemeProvider defaultTheme="light">Child</NaeilThemeProvider>;
    expect([cls, spread, data, unknown, provider, header, unknownHeader, guard, footer, unknownFooter, invalid, theme, literalData]).toHaveLength(13);
  });
});
