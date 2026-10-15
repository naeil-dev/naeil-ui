"use client";

import { useLocale } from "next-intl";
import { NaeilHeaderLocaleControl, NaeilHeaderThemeControl } from "./naeil-header";
import { headerLocales } from "./naeil-header-content";

/** Compatibility adapters: rendering, labels and hydration behavior live in the shared header. */
export function SiteThemeControl() {
  const locale = useLocale();
  return <NaeilHeaderThemeControl locale={headerLocales.find(value => value === locale) ?? "en"} />;
}

export function SiteLocaleControl({ currentLocale, onLocaleChange }: {
  currentLocale: string;
  onLocaleChange: (locale: string) => void;
}) {
  return <NaeilHeaderLocaleControl locale={headerLocales.find(value => value === currentLocale) ?? "en"} onLocaleChange={onLocaleChange} />;
}
