import { createElement, type ComponentProps, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "../../../components/ui/dialog";

// Node SSR has no portal container; keep the real Radix root/content/close.
vi.mock("radix-ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("radix-ui")>();
  return { ...actual, Dialog: { ...actual.Dialog, Portal: ({ children }: { children: ReactNode }) => children } };
});

function renderContent(props: ComponentProps<typeof DialogContent> = {}, footer?: ReactNode) {
  return renderToStaticMarkup(createElement(Dialog, { open: true },
    createElement(DialogContent, { "aria-describedby": undefined, ...props },
      createElement(DialogTitle, null, "Example"), footer)));
}

describe("Dialog close labels", () => {
  it("preserves the default Close label", () => {
    expect(renderContent()).toContain('<span class="sr-only">Close</span>');
  });

  it("replaces the built-in X label without forwarding it to the DOM", () => {
    const html = renderContent({ closeLabel: "닫기" });
    expect(html).toContain('<span class="sr-only">닫기</span>');
    expect(html).not.toContain(">Close<");
    expect(html).not.toMatch(/closelabel/i);
  });

  it("omits the built-in close when disabled", () => {
    expect(renderContent({ showCloseButton: false })).not.toContain('data-slot="dialog-close"');
  });

  it("localizes the optional footer close and preserves its defaults", () => {
    const renderFooter = (props: ComponentProps<typeof DialogFooter>) =>
      renderContent({ showCloseButton: false }, createElement(DialogFooter, props));
    expect(renderFooter({ showCloseButton: true, closeLabel: "닫기" })).toMatch(/<button\b[^>]*>닫기<\/button>/);
    expect(renderFooter({ showCloseButton: true })).toContain(">Close</button>");
    expect(renderFooter({})).not.toContain("<button");
  });
});
