import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PageHeader } from "../../../components/typography";

describe("shared page rhythm", () => {
  it("renders the shared title, description and actions structure", () => {
    const html = renderToStaticMarkup(createElement(PageHeader, { title: "견적 목록", description: "회사별 견적", actions: createElement("button", null, "새 견적"), titleId: "page-title" }));
    expect(html).toContain('class="ui-page-header"');
    expect(html).toMatch(/<h1 class="text-foreground text-3xl font-semibold" id="page-title">견적 목록<\/h1>/);
    expect(html).toContain('<p class="ui-page-description">회사별 견적</p>');
    expect(html).toContain('<div class="ui-page-header-actions"><button>새 견적</button></div>');
    expect(renderToStaticMarkup(createElement(PageHeader, { title: "Jev" }))).not.toContain("ui-page-description");
  });
  it("binds page spacing to the naeil.dev reference tokens", () => {
    const theme = readFileSync("src/styles/theme.css", "utf8");
    for (const [name, value] of [["page-top", "48px"], ["page-title-gap", "12px"], ["page-header-gap", "32px"], ["page-bottom", "96px"]])
      expect(theme).toContain(`--ui-${name}: ${value};`);
    const css = readFileSync("src/styles/components.css", "utf8");
    expect(css).toMatch(/\.ui-page-header:last-child \{\s*margin-bottom: 0;/);
    expect(css).toMatch(/\.ui-app-main \{\s*padding-top: calc\(var\(--ui-navigation-height\) \+ 1px \+ var\(--ui-page-top\)\);\s*padding-bottom: var\(--ui-page-bottom\);/);
  });
});
