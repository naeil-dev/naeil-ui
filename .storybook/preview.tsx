import type { Preview } from "@storybook/nextjs-vite"

import "../src/app/globals.css"

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: "todo",
    },
    backgrounds: {
      default: "app",
      values: [
        { name: "app", value: "hsl(var(--background))" },
        { name: "surface", value: "hsl(var(--surface))" },
        { name: "dark", value: "#020617" },
      ],
    },
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <main className="min-h-screen bg-background p-8 text-foreground antialiased">
        <div className="mx-auto max-w-3xl">
          <Story />
        </div>
      </main>
    ),
  ],
}

export default preview
