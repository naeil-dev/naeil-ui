"use client";
import { NaeilFooter as Footer, type NaeilFooterProps } from "./naeil-footer-core";
import { NaeilStandaloneMessages } from "./naeil-standalone-messages";
export type { NaeilFooterLocale, NaeilFooterProps } from "./naeil-footer-core";
export function NaeilFooter(props: NaeilFooterProps) {
  return <NaeilStandaloneMessages locale={props.locale}><Footer {...props} /></NaeilStandaloneMessages>;
}
