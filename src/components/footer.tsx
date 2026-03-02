"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Logo } from "@/components/logo";

export function Footer() {
  const t = useTranslations("footer");

  return (
    <footer className="border-border/40 border-t">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-16 sm:flex-row sm:justify-between">
        {/* Left: Brand */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Logo size={20} />
            <span className="text-foreground text-sm font-semibold tracking-tight">
              .naeil
            </span>
          </div>
          <p className="text-muted-foreground max-w-[240px] text-sm leading-relaxed">
            {t("tagline")}
          </p>

        </div>

        {/* Right: Links */}
        <div className="flex gap-10 sm:gap-16">
          <div className="flex flex-col gap-3">
            <span className="text-foreground text-xs font-medium uppercase tracking-wider">
              {t("navigation")}
            </span>
            <Link
              href="/projects"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              {t("projects")}
            </Link>
            <Link
              href="/blog"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              {t("blog")}
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-foreground text-xs font-medium uppercase tracking-wider">
              {t("social")}
            </span>
            <a
              href="https://github.com/jaymini1022"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              GitHub ↗
            </a>
          </div>
        </div>
      </div>

      {/* Copyright — integrated at bottom of main area */}
      <div className="text-muted-foreground/50 mx-auto max-w-7xl px-6 pb-8 text-xs">
        © 2026 Jay
      </div>
    </footer>
  );
}
