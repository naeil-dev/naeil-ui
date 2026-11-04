"use client";

import NextLink from "next/link";
import { NaeilFooter, type NaeilFooterLocale } from "@/naeil-locale/chrome";
import { localePath } from "@/naeil-locale";
import { useLocale } from "next-intl";

export function FooterWrapper() {
  const locale = useLocale() as NaeilFooterLocale;
  return <NaeilFooter locale={locale} Link={NextLink} resolveHref={path => localePath("main", path, locale)} />;
}
