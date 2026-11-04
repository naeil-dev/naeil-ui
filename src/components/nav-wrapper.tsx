"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { NaeilHeader } from "@/naeil-locale/chrome";
import { localePath, resolveLocaleUrl, type NaeilLocale } from "@/naeil-locale";
import { useLocaleController } from "@/naeil-locale/client";
import { useAuthSlot } from "./auth-slot";

interface NavWrapperProps {
  user: { id: string; name?: string; email?: string } | null;
  sessionPresent?: boolean;
  translatedBlogLocales?: Record<string, NaeilLocale[]>;
}

export function NavWrapper({ user, sessionPresent = false, translatedBlogLocales = {} }: NavWrapperProps) {
  const pathname = usePathname();
  const locale = useLocale() as NaeilLocale;
  const controller = useLocaleController();
  const t = useTranslations("naeil.locale");
  const authSlot = useAuthSlot(user, sessionPresent);
  return <>
    <NaeilHeader locale={locale} Link={NextLink} currentHref={pathname}
      resolveHref={path => localePath("main", path, locale)} authSlot={authSlot}
      aria-busy={controller.pending || undefined}
      onLocaleChange={nextLocale => {
        const route = resolveLocaleUrl("main", pathname);
        const slug = route.kind === "ui" && route.logicalPath.match(/^\/blog\/([^/]+)$/)?.[1];
        const fallback = slug && !translatedBlogLocales[slug]?.includes(nextLocale)
          ? localePath("main", `/blog?original=${encodeURIComponent(slug)}&originalLocale=${locale}`, nextLocale)
          : undefined;
        controller.changeLocale(nextLocale, fallback ? { href: fallback } : undefined);
      }} />
    {controller.pending && <span className="sr-only" role="status">{t("pending")}</span>}
    {controller.error && <div className="fixed left-4 right-4 top-20 z-50 rounded-md border bg-background p-4" role="alert">
      <p>{t("failed")}</p>
      <button type="button" className="ui-focus min-h-11 underline" onClick={() => controller.retry()}>{t("retry")}</button>
    </div>}
  </>;
}
