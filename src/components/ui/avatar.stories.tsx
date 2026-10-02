import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Avatar } from "./avatar";
import { AvatarUsage } from "../../stories/component-examples";
import usageGuide from "../../../docs/components/avatar.md?raw";
import { guide } from "../../stories/guide";

const meta = {
  title: "UI/Avatar", component: Avatar, tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: guide(usageGuide) } } },
} satisfies Meta<typeof Avatar>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Usage: Story = { render: () => <AvatarUsage /> };
