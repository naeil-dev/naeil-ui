import { previewNoticePlugin } from "../scripts/bundled-notices";
import type { StorybookConfig } from "@storybook/nextjs-vite"

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx|mdx)"],
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs"],
  framework: {
    name: "@storybook/nextjs-vite",
    options: {},
  },
  staticDirs: ["./.generated"],
  viteFinal: async (config) => ({ ...config, publicDir: false, plugins: [...(config.plugins || []), previewNoticePlugin()] }),
}

export default config
