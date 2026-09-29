import type { Preview } from "@storybook/nextjs-vite";
import "../src/styles/globals.css";
import "pretendard/dist/web/static/pretendard.css";
import "@fontsource/noto-sans-jp/400.css";
import "@fontsource/noto-sans-jp/500.css";
import "@fontsource/noto-sans-jp/600.css";
const preview: Preview = {
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    a11y: { test: "error" },
    layout: "padded",
  },
};
export default preview;
