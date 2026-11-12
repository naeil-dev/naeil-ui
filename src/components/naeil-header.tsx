"use client";

import { NaeilHeader as Header, NaeilHeaderThemeControl as ThemeControl, NaeilHeaderLocaleControl as LocaleControl, type NaeilHeaderProps, type NaeilServiceHeaderProps } from "./naeil-header-core";
import type { NaeilHeaderLocale } from "./naeil-header-data";
import { NaeilStandaloneMessages } from "./naeil-standalone-messages";
export { naeilServices } from "./naeil-header-core";
export type { NaeilHeaderProps, NaeilHeaderLocale, NaeilService, NaeilServiceHeaderProps } from "./naeil-header-core";
export { NaeilHeaderAccountControl, type NaeilHeaderAccount, type NaeilHeaderAccountControlProps } from "./naeil-header-account";

export function NaeilHeader(props: NaeilHeaderProps | NaeilServiceHeaderProps) {
  return <NaeilStandaloneMessages locale={props.locale}><Header {...props} /></NaeilStandaloneMessages>;
}
export function NaeilHeaderThemeControl(props: { locale: NaeilHeaderLocale }) {
  return <NaeilStandaloneMessages locale={props.locale}><ThemeControl {...props} /></NaeilStandaloneMessages>;
}
export function NaeilHeaderLocaleControl(props: { locale: NaeilHeaderLocale; onLocaleChange: (locale: NaeilHeaderLocale) => void }) {
  return <NaeilStandaloneMessages locale={props.locale}><LocaleControl {...props} /></NaeilStandaloneMessages>;
}
