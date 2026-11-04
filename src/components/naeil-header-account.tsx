"use client";
import { NaeilHeaderAccountControl as AccountControl, type NaeilHeaderAccountControlProps } from "./naeil-header-account-core";
import { NaeilStandaloneMessages } from "./naeil-standalone-messages";
export type { NaeilHeaderAccount, NaeilHeaderAccountControlProps } from "./naeil-header-account-core";
export function NaeilHeaderAccountControl(props: NaeilHeaderAccountControlProps) {
  return <NaeilStandaloneMessages locale={props.locale}><AccountControl {...props} /></NaeilStandaloneMessages>;
}
