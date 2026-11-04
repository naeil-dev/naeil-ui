"use client";

import { createContext, useContext, type ReactNode } from "react";
import type en from "../naeil-locale/messages/en.json";
import type { NaeilHeaderLocale } from "./naeil-header-data";

export type NaeilCommonMessages = typeof en.naeil;
const NaeilMessages = createContext<{ locale: NaeilHeaderLocale; messages: NaeilCommonMessages } | null>(null);

/** React-only bridge: the locale runtime supplies its already selected JSON. */
export function NaeilMessagesProvider({ locale, messages, children }: {
  locale: NaeilHeaderLocale; messages: NaeilCommonMessages; children: ReactNode;
}) {
  return <NaeilMessages.Provider value={{ locale, messages }}>{children}</NaeilMessages.Provider>;
}

export function useNaeilMessages(locale: NaeilHeaderLocale): NaeilCommonMessages {
  const value = useContext(NaeilMessages);
  if (!value || value.locale !== locale) throw new Error("Naeil chrome requires messages for its current locale");
  return value.messages;
}
