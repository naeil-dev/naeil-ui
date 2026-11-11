import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { Toaster } from "../../../components/ui/sonner";

const state = vi.hoisted(() => ({ theme: "system", forcedTheme: undefined as string | undefined }));
vi.mock("next-themes", () => ({ useTheme: () => state }));
vi.mock("sonner", () => ({ Toaster: ({ theme }: { theme: string }) => createElement("ol", { "data-theme": theme }) }));
describe("Toaster theme forwarding", () => {
  it("respects a forced theme while keeping explicit consumer overrides", () => {
    state.forcedTheme = "dark";
    expect(renderToStaticMarkup(createElement(Toaster))).toContain('data-theme="dark"');
    expect(renderToStaticMarkup(createElement(Toaster, { theme: "light" }))).toContain('data-theme="light"');
  });
  it("retains system preference when no theme is forced", () => {
    state.forcedTheme = undefined;
    expect(renderToStaticMarkup(createElement(Toaster))).toContain('data-theme="system"');
  });
});
