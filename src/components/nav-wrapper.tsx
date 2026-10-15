"use client";

import { NaeilHeader } from "./naeil-header";
import { AuthSlot } from "./auth-slot";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { type Locale } from "@/i18n/config";

interface NavWrapperProps {
  user: { id: string; name?: string; email?: string } | null;
}

export function NavWrapper({ user }: NavWrapperProps) {
  const pathname = usePathname();
  const locale = useLocale() as Locale;
  const router = useRouter();
  return (
    <NaeilHeader locale={locale} Link={Link} currentHref={pathname}
      resolveHref={path => path} authSlot={<AuthSlot user={user} />}
      onLocaleChange={nextLocale => {
        const queryAndHash = `${window.location.search}${window.location.hash}`;
        router.replace(`${pathname}${queryAndHash}`, { locale: nextLocale });
      }}
    />
  );
}
