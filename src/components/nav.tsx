"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Logo } from "@/components/logo";

export function Nav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const linkClass = (href: string) => {
    const isActive = pathname === href;
    return [
      "text-sm font-medium transition-colors",
      isActive
        ? "text-foreground"
        : "text-muted-foreground hover:text-foreground",
    ].join(" ");
  };

  return (
    <nav
      className={[
        "fixed top-0 z-50 w-full transition-[background-color,border-color] duration-300",
        scrolled
          ? "border-b border-border/40 bg-background/80 backdrop-blur-md"
          : "border-b border-transparent bg-transparent",
      ].join(" ")}
    >
      <div className="mx-auto flex h-[58px] max-w-7xl items-center px-6">
        {/* Left: Logo — fixed width like Resend's w-[225px] */}
        <div className="flex w-[200px] shrink-0 items-center">
          <Link
            href="/"
            className="text-foreground flex items-center gap-3 text-xl font-semibold tracking-tight"
          >
            <Logo size={28} />
            naeil
          </Link>
        </div>

        {/* Center: Nav links */}
        <div className="flex flex-1 items-center gap-6">
          <Link href="/projects" className={linkClass("/projects")}>
            {t("projects")}
          </Link>
          <Link href="/design" className={linkClass("/design")}>
            {t("design")}
          </Link>
        </div>

        {/* Right: Locale switcher */}
        <LocaleSwitcher />
      </div>
    </nav>
  );
}
