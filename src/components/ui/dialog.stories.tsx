import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Dialog } from "./dialog";
import { DialogUsage } from "../../stories/component-examples";
import usageGuide from "../../../docs/components/dialog.md?raw";
import { guide } from "../../stories/guide";

const meta = {
  title: "UI/Dialog", component: Dialog, tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: guide(usageGuide) } } },
} satisfies Meta<typeof Dialog>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Usage: Story = { render: () => <DialogUsage /> };
