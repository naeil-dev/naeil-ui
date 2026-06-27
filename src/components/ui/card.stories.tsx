import type { Meta, StoryObj } from "@storybook/nextjs-vite"

import { Badge } from "./badge"
import { Button } from "./button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardElevated,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card"

const meta = {
  title: "UI/Card",
  component: Card,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
} satisfies Meta<typeof Card>

export default meta

type Story = StoryObj<typeof meta>

export const Basic: Story = {
  render: () => (
    <Card className="w-[360px]">
      <CardHeader>
        <CardTitle>Project snapshot</CardTitle>
        <CardDescription>Shared UI library component baseline.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Use this card story as a compact smoke check for spacing, borders, text color, and nested content.
        </p>
      </CardContent>
      <CardFooter>
        <Button size="sm">Open</Button>
      </CardFooter>
    </Card>
  ),
}

export const WithAction: Story = {
  render: () => (
    <CardElevated className="w-[420px]">
      <CardHeader>
        <CardTitle>naeil.dev design system</CardTitle>
        <CardDescription>Local Storybook baseline before MCP or visual-regression work.</CardDescription>
        <CardAction>
          <Badge variant="secondary">M5-lite</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 text-sm">
          <div className="flex items-center justify-between rounded-md border border-border-subtle px-3 py-2">
            <span className="text-muted-foreground">Theme tokens</span>
            <Badge variant="outline">Loaded</Badge>
          </div>
          <div className="flex items-center justify-between rounded-md border border-border-subtle px-3 py-2">
            <span className="text-muted-foreground">Core components</span>
            <Badge>Ready</Badge>
          </div>
        </div>
      </CardContent>
      <CardFooter className="gap-2">
        <Button size="sm">Review</Button>
        <Button size="sm" variant="outline">
          Docs
        </Button>
      </CardFooter>
    </CardElevated>
  ),
}
