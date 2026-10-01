import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DropdownMenu } from "./dropdown-menu";
import { DropdownMenuUsage, OverlayResilienceUsage } from "../../stories/component-examples";
import usageGuide from "../../../docs/components/dropdown-menu.md?raw";
import { guide } from "../../stories/guide";

const meta = {
  title: "UI/DropdownMenu", component: DropdownMenu, tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: guide(usageGuide) } } },
} satisfies Meta<typeof DropdownMenu>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Usage: Story = { render: () => <DropdownMenuUsage /> };

export const OverlayResilience: Story = { render: () => <OverlayResilienceUsage /> };
