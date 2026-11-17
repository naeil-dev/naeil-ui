import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { expect, it, vi } from "vitest";
import { Nav } from "../../../components/nav";
import { Footer } from "../../../components/footer";

it("preserves legacy rendering in production and warns once per adapter only in development", () => {
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
  const Link = (props: React.ComponentPropsWithoutRef<"a"> & {href:string}) => <a {...props}/>;
  const render = () => renderToStaticMarkup(<NextIntlClientProvider locale="en" timeZone="UTC" messages={{nav:{projects:"Projects",blog:"Blog"},projects:{},footer:{tagline:"Tagline",navigation:"Navigation",projects:"Projects",blog:"Blog",social:"Social"}}}>
    <Nav Link={Link} usePathname={() => "/"}/><Footer/>
  </NextIntlClientProvider>);
  try {
    vi.stubEnv("NODE_ENV", "production");
    const production = render();
    expect(warning).not.toHaveBeenCalled();
    expect(production).toContain('data-naeil-header');
    expect(production).toContain('data-slot="site-footer"');
    vi.stubEnv("NODE_ENV", "development");
    // Radix-generated ids can differ per render; compare the actual landmarks/content.
    expect(render().replace(/radix-[^" ]+/g,"ID")).toBe(production.replace(/radix-[^" ]+/g,"ID"));
    render();
    expect(warning).toHaveBeenCalledTimes(2);
    expect(warning.mock.calls.map(([message]) => message)).toEqual([
      expect.stringContaining("Nav: deprecated"), expect.stringContaining("Footer: deprecated"),
    ]);
    for (const [message] of warning.mock.calls) expect(message).toContain("next minor that removes deprecated APIs");
  } finally { vi.unstubAllEnvs(); warning.mockRestore(); }
});
