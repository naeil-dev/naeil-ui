import { defineConfig } from "tsup";
import path from "path";

export default defineConfig({
  tsconfig: "tsconfig.build.json",
  entry: [
    "src/components/ui/index.ts",
    "src/components/index.ts",
    "src/lib/utils.ts",
  ],
  format: ["esm"],
  dts: true,
  splitting: true,
  clean: true,
  outDir: "dist",
  external: [
    "react",
    "react-dom",
    "next",
    "next/image",
    "next/link",
    "next-intl",
    "next-intl/routing",
    "next-intl/navigation",
    "next-themes",
    "@supabase/ssr",
    "@supabase/supabase-js",
    "three",
    "@react-three/fiber",
    "@react-three/drei",
    // Peer dependencies
    "class-variance-authority",
    "clsx",
    "tailwind-merge",
    "lucide-react",
    "sonner",
    "radix-ui",
  ],
  esbuildOptions(options) {
    options.alias = {
      "@": path.resolve(__dirname, "src"),
    };
    // Preserve "use client" directives in output
    options.banner = {
      js: '"use client";',
    };
  },
});
