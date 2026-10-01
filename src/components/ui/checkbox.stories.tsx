import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Checkbox } from "./checkbox";
import { CheckboxUsage, CheckboxRequiredUsage } from "../../stories/component-examples";
import usageGuide from "../../../docs/components/checkbox.md?raw";
import { guide } from "../../stories/guide";

const meta = {
  title: "UI/Checkbox", component: Checkbox, tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: guide(usageGuide) } } },
} satisfies Meta<typeof Checkbox>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Usage: Story = { render: () => <CheckboxUsage /> };

export const RequiredConsent: Story = { render: () => <CheckboxRequiredUsage /> };
