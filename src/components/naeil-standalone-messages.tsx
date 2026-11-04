"use client";

import type { ReactNode } from "react";
import en from "../naeil-locale/messages/en.json";
import ko from "../naeil-locale/messages/ko.json";
import ja from "../naeil-locale/messages/ja.json";
import { NaeilMessagesProvider } from "./naeil-messages-context";
import type { NaeilHeaderLocale } from "./naeil-header-data";

const messages = { en: en.naeil, ko: ko.naeil, ja: ja.naeil };
/** Only the standalone compatibility entry includes all three small dictionaries. */
export function NaeilStandaloneMessages({ locale, children }: { locale: NaeilHeaderLocale; children: ReactNode }) {
  return <NaeilMessagesProvider locale={locale} messages={messages[locale]}>{children}</NaeilMessagesProvider>;
}
