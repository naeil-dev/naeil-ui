import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import * as ui from "../../../components/ui";

it("provides the approved extension through the React core", () => {
  for (const name of ["Tabs", "TabsList", "TabsTrigger", "TabsContent", "Textarea"])
    expect(ui).toHaveProperty(name);
});

it("preserves native multiline form props and consumer classes", () => {
  const html = renderToStaticMarkup(createElement(ui.Textarea, {
    id: "notes", name: "notes", rows: 4, defaultValue: "한글\n日本語",
    required: true, readOnly: true, maxLength: 200, "aria-invalid": true,
    "aria-describedby": "help error", className: "resize-none px-6",
  }));
  for (const attribute of ['name="notes"', 'rows="4"', 'required=""', 'readOnly=""',
    'maxLength="200"', 'aria-invalid="true"', 'aria-describedby="help error"'])
    expect(html).toContain(attribute);
  expect(html).toContain("한글\n日本語");
  expect(html).toContain("resize-none");
  expect(html).not.toContain("resize-y");
  expect(html).not.toContain("px-3");
});

it("keeps Radix panel relationships and unmounts inactive children by default", () => {
  const html = renderToStaticMarkup(createElement(ui.Tabs, { defaultValue: "overview" },
    createElement(ui.TabsList, { "aria-label": "Details" },
      createElement(ui.TabsTrigger, { value: "overview" }, "Overview"),
      createElement(ui.TabsTrigger, { value: "history", disabled: true }, "History")),
    createElement(ui.TabsContent, { value: "overview" }, "Active content"),
    createElement(ui.TabsContent, { value: "history" }, "Inactive content")));
  expect(html).toContain('role="tablist"');
  expect(html).toContain('aria-orientation="horizontal"');
  expect(html).toContain('aria-selected="true"');
  expect(html).toContain('aria-controls=');
  expect(html).toContain('aria-labelledby=');
  expect(html).toContain('disabled=""');
  expect(html).toContain("Active content");
  expect(html).not.toContain("Inactive content");
});

it("does not invent an initial tab and preserves explicit forceMount", () => {
  const html = renderToStaticMarkup(createElement(ui.Tabs, { orientation: "vertical", activationMode: "manual" },
    createElement(ui.TabsList, { "aria-label": "Details", loop: false },
      createElement(ui.TabsTrigger, { value: "one" }, "One")),
    createElement(ui.TabsContent, { value: "one", forceMount: true, hidden: true }, "Retained draft")));
  expect(html).toContain('aria-orientation="vertical"');
  expect(html).not.toContain('aria-selected="true"');
  expect(html).toContain("Retained draft");
  expect(html).toContain('hidden=""');
});
