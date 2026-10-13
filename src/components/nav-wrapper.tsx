"use client";

import { Nav } from "./nav";
import { AuthSlot } from "./auth-slot";
import { SiteThemeControl, SiteLocaleControl } from "./site-controls";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { type Locale } from "@/i18n/config";

interface NavWrapperProps {
  user: { id: string; name?: string; email?: string } | null;
}

export function NavWrapper({ user }: NavWrapperProps) {
  const pathname = usePathname();
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("nav");

  return (
    <Nav
      Link={Link}
      usePathname={() => pathname}
      showBlog={true}
      labels={{
        navigation: t("navigation"),
        menu: t("menu"),
        close: t("closeMenu"),
      }}
      toolbarSlot={
        <>
          <SiteThemeControl />
          <SiteLocaleControl
            currentLocale={locale}
            onLocaleChange={(l) => {
              const queryAndHash = `${window.location.search}${window.location.hash}`;
              router.replace(`${pathname}${queryAndHash}`, {
                locale: l as Locale,
              });
            }}
          />
          <div aria-hidden="true" className="h-4 w-px bg-border" />
          <AuthSlot user={user} />
        </>
      }
    />
  );
}
