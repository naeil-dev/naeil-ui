import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Switch } from "./switch";
import { SwitchUsage } from "../../stories/component-examples";
import usageGuide from "../../../docs/components/switch.md?raw";
import { guide } from "../../stories/guide";

const meta = {
  title: "UI/Switch", component: Switch, tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: guide(usageGuide) } } },
} satisfies Meta<typeof Switch>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Usage: Story = { render: () => <SwitchUsage /> };
