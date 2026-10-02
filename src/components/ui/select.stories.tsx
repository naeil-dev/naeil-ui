import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Select } from "./select";
import { SelectUsage } from "../../stories/component-examples";
import usageGuide from "../../../docs/components/select.md?raw";
import { guide } from "../../stories/guide";

const meta = {
  title: "UI/Select", component: Select, tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: guide(usageGuide) } } },
} satisfies Meta<typeof Select>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Usage: Story = { render: () => <SelectUsage /> };
