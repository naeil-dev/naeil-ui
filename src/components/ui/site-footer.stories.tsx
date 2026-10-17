import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SiteFooter } from "./site-footer";
import { Logo } from "../logo";
import { useState } from "react";
import { NaeilFooter } from "../naeil-footer";

const meta = {
  title: "UI/SiteFooter",
  component: SiteFooter,
  tags: ["autodocs"],
  parameters: { layout: "fullscreen" },
  args: {
    brand: <Logo variant="footer" size={20} />,
    description: "내일을 위한 도구를 만듭니다.",
    groups: [
      {
        id: "links",
        label: "둘러보기",
        links: [
          { id: "docs", label: "디자인 시스템", href: "/design" },
          {
            id: "github",
            label: "GitHub",
            href: "https://github.com/naeil-dev",
            external: true,
            target: "_blank",
          },
        ],
      },
    ],
  },
} satisfies Meta<typeof SiteFooter>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Usage: Story = {};
export const Compact: Story = {
  args: {
    variant: "compact",
    description: undefined,
    groups: [],
    meta: "Naeil Home",
  },
};

function GuardedFooterExample() {
  const [destination, setDestination] = useState("Draft retained");
  const guard: NonNullable<React.ComponentProps<typeof SiteFooter>["onNavigate"]> = (event, item) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || item.target === "_blank") return;
    event.preventDefault();
    setDestination(`Blocked unsaved navigation: ${item.href}`);
  };
  return <>
    <p role="status">{destination}</p>
    <NaeilFooter locale="en" variant="compact" onNavigate={guard} />
    <SiteFooter aria-label="Native external guard" onNavigate={guard}
      groups={[{ id: "native", label: "Explicit external override", links: [{ id: "native", label: "External same-tab destination", href: "https://example.org/leave", external: true }] }]} />
  </>;
}
export const GuardedLinks: Story = { render: () => <GuardedFooterExample /> };
