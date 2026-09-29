import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("exports shared CSS without site-only animation and preserves CSS side effects", () => {
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  expect(pkg.exports["./globals.css"]).toBe("./src/styles/globals.css");
  expect(pkg.sideEffects).toContain("**/*.css");
  const shared = readFileSync(pkg.exports["./globals.css"], "utf8");
  expect(shared).not.toContain("float");
  expect(shared).toContain("./theme.css");
  expect(shared).toContain("./components.css");
});
