import { defineConfig } from "tsup";

// Preserve source module boundaries and their own client/server directives.
// Deep imports historically point to these modules, including server helpers.
export default defineConfig({
  tsconfig: "tsconfig.build.json",
  entry: [
    "src/components/**/*.tsx",
    "src/components/index.ts",
    "src/components/ui/index.ts",
    "!src/**/*.stories.tsx",
    "src/lib/**/*.ts",
    "!src/**/*.test.ts",
    "src/i18n/*.ts",
    "src/app/**/actions.ts",
  ],
  format: ["esm"],
  bundle: false,
  splitting: false,
  dts: true,
  clean: false,
  outDir: "dist/source",
});
