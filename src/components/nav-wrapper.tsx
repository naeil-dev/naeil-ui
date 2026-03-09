"use client";

import { Nav } from "./nav";
import { ThemeToggleIcon } from "./theme-toggle-icon";
import { LocaleSwitcher } from "./locale-switcher";
import { AuthSlot } from "./auth-slot";
import { Link, usePathname, useRouter } from "@/i18n/routing";
import { useLocale } from "next-intl";
import { type Locale } from "@/i18n/config";

const LOCALE_LIST = [
  { code: "en", short: "EN", full: "English" },
  { code: "ko", short: "KO", full: "한국어" },
  { code: "ja", short: "JA", full: "日本語" },
];

interface NavWrapperProps {
  user: { id: string; name?: string; email?: string } | null;
}

export function NavWrapper({ user }: NavWrapperProps) {
  const pathname = usePathname();
  const locale = useLocale();
  const router = useRouter();

  const authElement = <AuthSlot user={user} />;

  return (
    <Nav
      Link={Link}
      usePathname={() => pathname}
      showBlog={true}
      authSlot={authElement}
      toolbarSlot={
        <>
          <ThemeToggleIcon />
          <LocaleSwitcher
            locales={LOCALE_LIST}
            currentLocale={locale}
            onLocaleChange={(l) => router.replace(pathname, { locale: l as Locale })}
          />
        </>
      }
    />
  );
}
