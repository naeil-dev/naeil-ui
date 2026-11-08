import { createElement, type ComponentProps, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import * as ui from "../../../components/ui";

// SSR has no portal destination. Keep the real Radix content/semantics;
// Playwright verifies the real portal, focus trap, dismissal and restoration.
vi.mock("radix-ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("radix-ui")>();
  return { ...actual, Dialog: { ...actual.Dialog, Portal: ({ children }: { children: ReactNode }) => children } };
});

function opened(props: ComponentProps<typeof ui.SheetContent> = {}) {
  return renderToStaticMarkup(createElement(ui.Sheet, { open: true },
    createElement(ui.SheetContent, props,
      createElement(ui.SheetHeader, null,
        createElement(ui.SheetTitle, null, "Evidence"),
        createElement(ui.SheetDescription, null, "Review sources")))));
}

it("exports every Sheet composition part", () => {
  for (const name of ["Sheet", "SheetTrigger", "SheetClose", "SheetPortal", "SheetOverlay", "SheetContent", "SheetHeader", "SheetFooter", "SheetTitle", "SheetDescription"])
    expect(ui).toHaveProperty(name);
});

it("opens with an accessible default close and right side", () => {
  const html = opened();
  expect(html).toContain('role="dialog"');
  expect(html).toContain('data-state="open"');
  expect(html).toContain('class="sr-only">Close</span>');
  expect(html).toContain('data-side="right"');
  expect(html).toContain("right-0");
  expect(html).toContain("overflow-y-auto");
});

it.each(["닫기", "閉じる", "Close"])("uses the supplied close name %s", closeLabel => {
  const html = opened({ closeLabel });
  expect(html).toContain(`class="sr-only">${closeLabel}</span>`);
  expect(html).not.toContain("closeLabel=");
});

it("allows a consumer-owned close affordance", () => {
  expect(opened({ showCloseButton: false })).not.toContain('data-slot="sheet-close"');
});

it.each(["right", "left", "top", "bottom"] as const)("anchors to %s", side => {
  const html = opened({ side });
  expect(html).toContain(`data-side="${side}"`);
  expect(html).toContain(`${side}-0`);
});

it("preserves consumer width overrides", () => {
  const html = opened({ className: "w-80 p-2" });
  expect(html).toContain("w-80");
  expect(html).not.toContain("w-[min(100%,var(--ui-width-short-form))]");
  expect(html).not.toContain("p-[var(--ui-panel-padding)]");
});
