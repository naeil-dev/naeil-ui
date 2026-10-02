import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Textarea } from "./textarea";
import { TextareaUsage } from "../../stories/extension-examples";
import usageGuide from "../../../docs/components/textarea.md?raw";
import { guide } from "../../stories/guide";

const meta = {
  title: "UI/Textarea", component: Textarea, tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: guide(usageGuide) } } },
} satisfies Meta<typeof Textarea>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Usage: Story = { render: () => <TextareaUsage /> };
