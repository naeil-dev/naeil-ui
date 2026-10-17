"use client";

import { NaeilFooter, type NaeilFooterLocale } from "./naeil-footer";
import { Link } from "@/i18n/routing";
import { useLocale } from "next-intl";

export function FooterWrapper() {
  const locale = useLocale() as NaeilFooterLocale;
  return <NaeilFooter locale={locale} Link={Link} resolveHref={path => path} />;
}
