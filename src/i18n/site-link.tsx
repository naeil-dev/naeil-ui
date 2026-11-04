"use client";

import NextLink from "next/link";
import { useLocale } from "next-intl";
import type { ComponentProps } from "react";
import { localePath, type NaeilLocale } from "@/naeil-locale";
import { useLocaleController } from "@/naeil-locale/client";

/** App-owned data adapter. All path construction belongs to the shared runtime. */
export function Link({ href, locale, onClick, ...props }: Omit<ComponentProps<typeof NextLink>, "href" | "locale"> & { href: string; locale?: NaeilLocale }) {
  const currentLocale = useLocale() as NaeilLocale;
  const controller = useLocaleController();
  const resolved = localePath("main", href, locale ?? currentLocale);
  return <NextLink {...props} href={resolved} onClick={event => {
    onClick?.(event);
    if (!locale || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey || props.target === "_blank") return;
    event.preventDefault();
    controller.changeLocale(locale, { href: resolved });
  }} />;
}
