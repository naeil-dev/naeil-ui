import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Sheet } from "./sheet";
import { SheetUsage, SheetLocalizedClose, SheetSides } from "../../stories/sheet-examples";
import usageGuide from "../../../docs/components/sheet.md?raw";
import { guide } from "../../stories/guide";

const meta = {
  title: "UI/Sheet", component: Sheet, tags: ["autodocs"],
  parameters: { layout: "padded", docs: { description: { component: guide(usageGuide) } } },
} satisfies Meta<typeof Sheet>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Usage: Story = { render: () => <SheetUsage /> };
export const LocalizedClose: Story = { render: () => <SheetLocalizedClose /> };
export const Sides: Story = { render: () => <SheetSides /> };
