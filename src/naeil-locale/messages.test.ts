import { describe, expect, it, vi } from "vitest";
import { assertLocaleMessages, checkLocaleMessages } from "./checker";
import { createLocaleMessageLoader, loadSharedMessages, mergeLocaleMessages, recoverMissingMessages } from "./messages";
import en from "./messages/en.json";
import ko from "./messages/ko.json";
import ja from "./messages/ja.json";

describe("JSON message contracts", () => {
  it("checks the actual small shared dictionaries", () => {
    expect(() => assertLocaleMessages({ en, ko, ja }, { namespace: "naeil" })).not.toThrow();
  });
  it("loads only the requested application dictionary", async () => {
    const messages = { en: vi.fn(async () => ({ app: { save: "Save" } })), ko: vi.fn(async () => ({ default: { app: { save: "저장" } } })), ja: vi.fn(async () => ({ app: { save: "保存" } })) };
    const load = createLocaleMessageLoader({ namespace: "app", messages });
    expect(await load("ko")).toEqual({ ...ko, app: { save: "저장" } });
    expect(messages.en).not.toHaveBeenCalled(); expect(messages.ja).not.toHaveBeenCalled();
    await expect(loadSharedMessages("xx" as "en")).rejects.toThrow("Unsupported");
  });
  it("rejects namespace overwrites and leaked service dictionaries", () => {
    expect(() => mergeLocaleMessages(en, { naeil: {} }, "naeil")).toThrow();
    expect(() => mergeLocaleMessages(en, { app: {}, other: {} }, "app")).toThrow();
    expect(() => mergeLocaleMessages(en, { save: "Save" }, "app")).toThrow();
  });
  it("permits language-specific plural categories while requiring other", () => {
    const dictionaries = { en: { app: { count: "{n, plural, one {# item} other {# items}}" } }, ko: { app: { count: "{n, plural, other {#개}}" } }, ja: { app: { count: "{n, plural, other {#個}}" } } };
    expect(checkLocaleMessages(dictionaries, { namespace: "app" })).toEqual([]);
    dictionaries.ja.app.count = "{n, plural, one {1個}}";
    expect(checkLocaleMessages(dictionaries, { namespace: "app" })).toEqual(expect.arrayContaining([expect.objectContaining({ locale: "ja", reason: expect.stringContaining("Invalid ICU") })]));
  });
  it("checks key sets, blanks, ICU syntax and variable names/types", () => {
    const base = { app: { save: "Save {name}", total: "{amount, number}", nested: { label: "Label" } } };
    const issues = checkLocaleMessages({ en: base, ko: { app: { save: "저장 {person}", total: "{amount, date}", extra: "" } }, ja: { app: { save: "保存 {", total: "{amount, number}", nested: { label: "ラベル" } } } }, { namespace: "app" });
    expect(issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ locale: "ko", key: "app.save", reason: expect.stringContaining("variable") }),
      expect.objectContaining({ locale: "ko", key: "app.total", reason: expect.stringContaining("types") }),
      expect.objectContaining({ locale: "ko", key: "app.extra", reason: "Empty message" }),
      expect.objectContaining({ locale: "ko", key: "app.nested.label", reason: "Missing key" }),
      expect.objectContaining({ locale: "ja", key: "app.save", reason: expect.stringContaining("Invalid ICU") }),
    ]));
  });
  it("observes every runtime English fallback without overwriting valid selected copy", () => {
    const missing = vi.fn();
    expect(recoverMissingMessages({ app: { save: "저장" } }, { app: { save: "Save", cancel: "Cancel" } }, missing)).toEqual({ app: { save: "저장", cancel: "Cancel" } });
    expect(missing).toHaveBeenCalledWith("app.cancel");
  });
});
