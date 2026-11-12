import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Button } from "../../../components/ui/button";
import { CardTitle } from "../../../components/ui/card";
import { PageTitle } from "../../../components/typography";

describe("shared defaults preserve consumer overrides", () => {
  it.each(["default", "destructive", "outline", "secondary", "ghost", "link"] as const)("%s has a persistent pressed indicator", variant => {
    const html = renderToStaticMarkup(createElement(Button, { variant, "aria-pressed": true }, "Toggle"));
    expect(html).toContain(`aria-pressed:inset-ring-${["default", "destructive"].includes(variant) ? 4 : 2}`);
    const override = renderToStaticMarkup(createElement(Button, { variant, className: "aria-pressed:inset-ring-0" }, "Toggle"));
    expect(override).not.toMatch(/aria-pressed:inset-ring-[24]/);
    expect(override).toContain("aria-pressed:inset-ring-0");
  });
  it("uses approved typography and permits explicit consumer leading", () => {
    expect(renderToStaticMarkup(createElement(CardTitle, null, "Title"))).not.toContain("leading-none");
    expect(renderToStaticMarkup(createElement(PageTitle, null, "Title"))).not.toContain("leading-tight");
    expect(renderToStaticMarkup(createElement(CardTitle, { className: "leading-loose" }, "Title"))).toContain("leading-loose");
    const css = readFileSync("src/styles/theme.css", "utf8");
    for (const [size, lineHeight] of [["xs", "1.25rem"], ["sm", "1.375rem"], ["base", "1.5625rem"], ["xl", "1.8125rem"], ["3xl", "2.625rem"]]) {
      expect(css).toContain(`--text-${size}--line-height: ${lineHeight};`);
    }
  });
});
