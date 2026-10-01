import type { Preview } from "@storybook/nextjs-vite";
import { useEffect } from "react";
import { ThemeProvider } from "next-themes";
import "../src/styles/globals.css";
import "pretendard/dist/web/static/pretendard.css";
import "@fontsource/noto-sans-jp/400.css";
import "@fontsource/noto-sans-jp/500.css";
import "@fontsource/noto-sans-jp/600.css";

const preview: Preview = {
  initialGlobals: { theme: "light", density: "comfortable" },
  globalTypes: {
    theme: { description: "Document theme", toolbar: { icon: "circlehollow", items: ["light", "dark"] } },
    density: { description: "Document spacing density", toolbar: { icon: "component", items: ["comfortable", "compact"] } },
  },
  decorators: [function Foundation(Story, context) {
    const workspace = context.title === "UI v2";
    const density = context.globals.density;
    useEffect(() => {
      if (workspace) return;
      document.documentElement.dataset.uiDensity = density;
      return () => { delete document.documentElement.dataset.uiDensity; };
    }, [density, workspace]);
    // Workspace keeps its explicit theme/density controls for composition checks.
    return workspace ? <Story /> : <ThemeProvider attribute="class" forcedTheme={context.globals.theme}><Story /></ThemeProvider>;
  }],
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    a11y: { test: "error" },
    layout: "padded",
  },
};
export default preview;
