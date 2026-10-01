import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Input } from "./input";
import { InputUsage } from "../../stories/component-examples";
import usageGuide from "../../../docs/components/input.md?raw";
import { guide } from "../../stories/guide";

const meta = {
  title: "UI/Input", component: Input, tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: guide(usageGuide) } } },
} satisfies Meta<typeof Input>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Usage: Story = { render: () => <InputUsage /> };
