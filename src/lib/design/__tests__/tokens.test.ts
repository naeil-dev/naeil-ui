import { spawnSync } from "node:child_process";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { generateThemeCSS } from "../../../../scripts/build-tokens";
const cssPath = "src/styles/theme.css";

describe("the CSS consumed by the public package", () => {
  it("ships the approved neutral roles and generated dimensions", () => {
    const css = readFileSync(cssPath, "utf8");
    expect(css).toContain("--primary: #292929;");
    expect(css).toContain("--primary: #e5e5e5;");
    expect(css).toContain("--surface-selected: #262626;");
    expect(css).toContain("--ui-control-height: 40px;");
    expect(css).toContain("--ui-control-height: 36px;");
    expect(css).toContain("--ui-width-reading: 640px;");
    expect(css).toContain("--ui-width-list: 1600px;");
    expect(css).toContain("--ui-width-frame: 1600px;");
    expect(css).toContain("--ui-width-workflow: 896px;");
    expect(css).toContain("--ui-frame-gutter: clamp(16px, 2.4vw, 40px);");
    expect(css).toContain("--text-base: 1rem;");
    expect(css).toContain("--ui-motion-standard: 180ms;");
  });
  it("preserves the existing project color contract", () => {
    const css = readFileSync(cssPath, "utf8");
    expect(css).toContain("--project-cc: oklch(0.704 0.140 181);");
    expect(css).toContain("--project-sa: oklch(0.723 0.219 149);");
    expect(css).toContain("--color-project-sa: var(--project-sa);");
  });
  it.each(["oklch(0 0 0) broken", "oklch(0..1 0 0)", "oklch(0 0 0 / 1..0)"])(
    "rejects malformed OKLCH: %s",
    (value) => {
      const dir = mkdtempSync(join(tmpdir(), "naeil-contrast-"));
      try {
        const file = join(dir, "broken.css");
        writeFileSync(
          file,
          readFileSync(cssPath, "utf8").replace(
            /--foreground: [^;]+;/g,
            `--foreground: ${value};`,
          ),
        );
        const result = spawnSync(
          "pnpm",
          ["exec", "tsx", "scripts/check-contrast.ts", "--css", file],
          { encoding: "utf8" },
        );
        expect(result.status).toBe(1);
        expect(result.stdout).toContain("could not parse color");
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
  );
  it("can be regenerated without changing the shipped artifact", async () => {
    const committed = readFileSync(cssPath, "utf8");
    expect(await generateThemeCSS()).toBe(committed);
    expect(readFileSync(cssPath, "utf8")).toBe(committed);
  }, 30000);
  it("rejects rendered destructive hover even when the opaque pair passes", () => {
    const dir = mkdtempSync(join(tmpdir(), "naeil-contrast-state-"));
    try {
      const file = join(dir, "hover.css");
      writeFileSync(file, readFileSync(cssPath, "utf8").replace(/--destructive: [^;]+;/g, "--destructive: #bd414b;"));
      const result = spawnSync("pnpm", ["exec", "tsx", "scripts/check-contrast.ts", "--css", file], { encoding: "utf8" });
      expect(result.status).toBe(1);
      expect(result.stdout).toContain("✅ destructive-fg on destructive: 5.22:1");
      expect(result.stdout).toContain("🔴 destructive hover text/pressed indicator over popover: 4.41:1");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("fails contrast verification when required colors are missing", () => {
    const dir = mkdtempSync(join(tmpdir(), "naeil-contrast-"));
    try {
      const file = join(dir, "broken.css");
      writeFileSync(
        file,
        ":root { --background: #ffffff; }\n.dark { --background: #000000; }",
      );
      const result = spawnSync(
        "pnpm",
        ["exec", "tsx", "scripts/check-contrast.ts", "--css", file],
        { encoding: "utf8" },
      );
      expect(result.status).toBe(1);
      expect(result.stdout).toContain("missing token");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("rejects invalid color values rather than silently skipping them", () => {
    const dir = mkdtempSync(join(tmpdir(), "naeil-contrast-"));
    try {
      const file = join(dir, "broken.css");
      writeFileSync(
        file,
        readFileSync(cssPath, "utf8").replace(
          /--foreground: [^;]+;/g,
          "--foreground: invalid-color;",
        ),
      );
      const result = spawnSync(
        "pnpm",
        ["exec", "tsx", "scripts/check-contrast.ts", "--css", file],
        { encoding: "utf8" },
      );
      expect(result.status).toBe(1);
      expect(result.stdout).toContain("could not parse color");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
