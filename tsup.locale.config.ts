import { defineConfig } from "tsup";

// Separate graphs preserve explicit server/client boundaries. React, next-intl
// and all host framework contexts remain external in the packed artifact.
const shared = {
  tsconfig: "tsconfig.build.json",
  format: ["esm"] as ["esm"],
  dts: true,
  splitting: false,
  clean: false,
  outDir: "dist/naeil-locale",
  external: ["react", "react-dom", "next", "next/navigation", "next/server", "next-intl", "next-intl/server", "next-intl/middleware", "@formatjs/icu-messageformat-parser", "server-only", "class-variance-authority", "clsx", "tailwind-merge", "lucide-react", "sonner", "radix-ui", "next-themes"],
};
export default defineConfig([
  // Shared JSON imports remain separate per-locale dynamic chunks. Loading one
  // application locale never statically includes the other dictionaries.
  { ...shared, entry: ["src/naeil-locale/index.ts", "src/naeil-locale/messages.ts", "src/naeil-locale/checker.ts", "src/naeil-locale/server.ts"], splitting: true },
  { ...shared, entry: ["src/naeil-locale/client.tsx", "src/naeil-locale/chrome.ts"], splitting: true, banner: { js: '"use client";' } },
]);
