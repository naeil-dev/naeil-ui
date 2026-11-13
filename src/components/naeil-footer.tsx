"use client";
import type { JSX } from "react";
import { NaeilFooter as Footer, type NaeilFooterProps, type NaeilServiceFooterProps } from "./naeil-footer-core";
import { NaeilStandaloneMessages } from "./naeil-standalone-messages";
export type { NaeilFooterLocale, NaeilFooterProps, NaeilServiceFooterProps } from "./naeil-footer-core";
export function NaeilFooter(props: NaeilServiceFooterProps): JSX.Element;
export function NaeilFooter(props: NaeilFooterProps): JSX.Element;
export function NaeilFooter(props: NaeilFooterProps | NaeilServiceFooterProps) {
  return <NaeilStandaloneMessages locale={props.locale}>{props.service === undefined ? <Footer {...props} /> : <Footer {...props} />}</NaeilStandaloneMessages>;
}
