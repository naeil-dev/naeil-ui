import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import ts from "typescript";
function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((f) =>
    f.isDirectory()
      ? files(resolve(dir, f.name))
      : /\.tsx?$/.test(f.name) && !f.name.endsWith(".test.ts")
        ? [resolve(dir, f.name)]
        : [],
  );
}
describe("client module graph private-key boundary", () => {
  it("cannot reach the admin/config modules across a client import (server actions are isolated)", () => {
    const visited = new Set<string>();
    function walk(file: string) {
      if (visited.has(file)) return;
      visited.add(file);
      const source = readFileSync(file, "utf8");
      if (/^["']use server["'];/.test(source)) return;
      expect(
        file.endsWith("password-server.ts") ||
          file.endsWith("invite-config.ts") ||
          file.endsWith("feature-gates.ts"),
      ).toBe(false);
      expect(
        source.includes("serviceRoleKey") ||
          source.includes("NAEIL_INVITE_CONFIG"),
      ).toBe(false);
      for (const { fileName: spec } of ts.preProcessFile(source, true, true)
        .importedFiles) {
        if (spec && (spec.startsWith(".") || spec.startsWith("@/"))) {
          const base = spec.startsWith("@/")
            ? resolve("src", spec.slice(2))
            : resolve(dirname(file), spec);
          const target = [
            base + ".ts",
            base + ".tsx",
            resolve(base, "index.ts"),
            resolve(base, "index.tsx"),
          ].find(existsSync);
          if (target) walk(target);
        }
      }
    }
    for (const f of files(resolve("src")))
      if (/^["']use client["'];/.test(readFileSync(f, "utf8"))) walk(f);
    expect(visited.size).toBeGreaterThan(10);
    expect(
      readFileSync("src/lib/auth/password-server.ts", "utf8").startsWith(
        'import "server-only"',
      ),
    ).toBe(true);
  });
});
