import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { LocaleSwitcher } from "../../../components/locale-switcher";

const locales = [
  { code: "ko", short: "KO", full: "한국어" },
  { code: "ja", short: "JA", full: "日本語" },
  { code: "en", short: "EN", full: "English" },
];
it.each([
  ["ko", "언어 변경 — 현재: KO"],
  ["ja", "言語を変更 — 現在: JA"],
  ["en", "Change language — current: EN"],
])("localizes the generic switcher's accessible name in %s without a provider", (currentLocale, label) => {
  const html = renderToStaticMarkup(<LocaleSwitcher locales={locales} currentLocale={currentLocale} onLocaleChange={() => {}} />);
  expect(html).toContain(`aria-label="${label}"`);
});
it("retains the generic locale API and English fallback for other locale codes", () => {
  const html = renderToStaticMarkup(<LocaleSwitcher locales={[{ code: "fr", short: "FR", full: "Français" }]} currentLocale="fr" onLocaleChange={() => {}} />);
  expect(html).toContain('aria-label="Change language — current: FR"');
});
