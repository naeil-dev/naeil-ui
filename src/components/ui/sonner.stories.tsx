import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Toaster } from "./sonner";
import { ToasterUsage } from "../../stories/component-examples";
import usageGuide from "../../../docs/components/sonner.md?raw";
import { guide } from "../../stories/guide";

const meta = {
  title: "UI/Toaster", component: Toaster, tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: guide(usageGuide) } } },
} satisfies Meta<typeof Toaster>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Usage: Story = { render: () => <ToasterUsage /> };
