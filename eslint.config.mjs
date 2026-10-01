import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier";
import noHardcodedColors from "./eslint-rules/no-hardcoded-colors.cjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierConfig,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "dist/**",
    "storybook-static/**",
  ]),
  // These Node helpers are deliberately CommonJS; require is their module API.
  {
    files: ["**/*.cjs"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  // naeil-ui: no hardcoded colors in UI components
  {
    files: ["src/components/ui/**/*.{ts,tsx}"],
    plugins: {
      "naeil-ui": {
        rules: {
          "no-hardcoded-colors": noHardcodedColors,
        },
      },
    },
    rules: {
      "naeil-ui/no-hardcoded-colors": "error",
    },
  },
]);

export default eslintConfig;
