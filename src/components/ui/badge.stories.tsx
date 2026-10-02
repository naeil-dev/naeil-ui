import usageGuide from "../../../docs/components/badge.md?raw";
import { guide } from "../../stories/guide";
import { BadgeUsage } from "../../stories/component-examples";
import type { Meta, StoryObj } from "@storybook/nextjs-vite"

import { Badge } from "./badge"

const meta = {
  title: "UI/Badge",
  component: Badge,
  parameters: {
    layout: "padded",
    docs: { description: { component: guide(usageGuide) } },
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "outline", "destructive", "success", "warning", "error", "info"],
    },
  },
  args: {
    children: "Badge",
    variant: "default",
  },
} satisfies Meta<typeof Badge>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-3">
      <Badge>Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="destructive">Destructive</Badge>
    </div>
  ),
}

export const Usage: Story = { render: () => <BadgeUsage /> };
