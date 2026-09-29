import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const build = () => execFileSync("pnpm", ["build:tokens"], { stdio: "pipe" });
const cssPath = "src/styles/theme.css";
beforeAll(build, 30000);
describe("the CSS consumed by the public package", () => {
  it("ships the approved neutral roles and generated dimensions", () => {
    const css = readFileSync(cssPath, "utf8");
    expect(css).toContain("--primary: #292929;");
    expect(css).toContain("--primary: #e5e5e5;");
    expect(css).toContain("--surface-selected: #262626;");
    expect(css).toContain("--ui-control-height: 40px;");
    expect(css).toContain("--ui-control-height: 36px;");
    expect(css).toContain("--ui-width-reading: 640px;");
    expect(css).toContain("--ui-width-list: 1200px;");
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
  it("can be regenerated without changing the shipped artifact", () => {
    const first = readFileSync(cssPath, "utf8");
    build();
    expect(readFileSync(cssPath, "utf8")).toBe(first);
  }, 30000);
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
