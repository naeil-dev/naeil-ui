import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";

it("keeps destructive text out of components, examples and guides", () => {
  const violations: string[] = [];
  for (const root of ["src/components", "src/stories", "src/app", "docs/components"]) {
    for (const file of readdirSync(root, { recursive: true }) as string[]) {
      if (!/\.(?:[cm]?[jt]sx?|mdx?|css)$/.test(file)) continue;
      const path = join(root, file);
      readFileSync(path, "utf8").split("\n").forEach((line, index) => {
        // Permit the guide's prohibition, never examples or the foreground companion.
        const text = path === "docs/components/common.md"
          ? line.replace("Never use `text-destructive` (or destructive as text on canvas/card)", "")
          : line;
        if (/\btext-destructive(?![\w-])/.test(text)) violations.push(`${path}:${index + 1}`);
      });
    }
  }
  expect(violations, "Use text-error; see docs/components/common.md#feedback-and-destructive-color-roles").toEqual([]);
});
