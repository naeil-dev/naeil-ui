import { describe, it, expect } from "vitest";
import { hashUserId, ANIMALS } from "../avatar";

describe("hashUserId", () => {
  it("returns same index for same ID", () => {
    const a = hashUserId("user-abc-123");
    const b = hashUserId("user-abc-123");
    expect(a).toBe(b);
  });

  it("returns index within [0, ANIMALS.length)", () => {
    const ids = ["a", "bb", "ccc", "user-xyz-999", "00000000-0000-0000-0000-000000000000"];
    for (const id of ids) {
      const idx = hashUserId(id);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(ANIMALS.length);
    }
  });

  it("handles empty string without crashing", () => {
    const idx = hashUserId("");
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(ANIMALS.length);
  });

  it("handles short strings", () => {
    const idx = hashUserId("x");
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(ANIMALS.length);
  });

  it("respects custom size parameter", () => {
    const idx = hashUserId("test", 3);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(3);
  });
});
