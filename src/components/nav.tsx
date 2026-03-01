"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { LocaleSwitcher } from "@/components/locale-switcher";

export function Nav() {
  const t = useTranslations("nav");

  return (
    <nav className="fixed top-0 z-50 flex w-full items-center justify-between px-6 py-4 backdrop-blur-md">
      <Link
        href="/"
        className="text-foreground text-sm font-semibold tracking-tight"
      >
        naeil
      </Link>
      <div className="flex items-center gap-6">
        <Link
          href="/projects"
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          {t("projects")}
        </Link>
        <Link
          href="/design"
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          {t("design")}
        </Link>
        <LocaleSwitcher />
      </div>
    </nav>
  );
}
