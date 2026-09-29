import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { UiV2Demo } from "./ui-v2-demo";
const meta = {
  title: "UI v2",
  component: UiV2Demo,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof UiV2Demo>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Workspace: Story = {};
