"use client";

import { NaeilHeader } from "./naeil-header";
import { useAuthSlot } from "./auth-slot";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { type Locale } from "@/i18n/config";

interface NavWrapperProps {
  user: { id: string; name?: string; email?: string } | null;
  sessionPresent?: boolean;
}

export function NavWrapper({ user, sessionPresent = false }: NavWrapperProps) {
  const pathname = usePathname();
  const locale = useLocale() as Locale;
  const router = useRouter();
  const authSlot = useAuthSlot(user, sessionPresent);
  return (
    <NaeilHeader locale={locale} Link={Link} currentHref={pathname}
      resolveHref={path => path} authSlot={authSlot}
      onLocaleChange={nextLocale => {
        const queryAndHash = `${window.location.search}${window.location.hash}`;
        router.replace(`${pathname}${queryAndHash}`, { locale: nextLocale });
      }}
    />
  );
}
