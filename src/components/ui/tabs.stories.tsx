import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Tabs } from "./tabs";
import { TabsUsage } from "../../stories/extension-examples";
import usageGuide from "../../../docs/components/tabs.md?raw";
import { guide } from "../../stories/guide";

const meta = {
  title: "UI/Tabs", component: Tabs, tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: guide(usageGuide) } } },
} satisfies Meta<typeof Tabs>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Usage: Story = { render: () => <TabsUsage /> };
