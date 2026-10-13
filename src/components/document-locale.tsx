"use client";

import { useEffect } from "react";

/** Root layouts persist across client navigation; the application owns document language. */
export function DocumentLocale({ locale }: { locale: string }) {
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  return null;
}
