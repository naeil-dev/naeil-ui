"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/routing";
import { locales, type Locale } from "@/i18n/config";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

const localeLabels: Record<Locale, { short: string; full: string }> = {
  en: { short: "EN", full: "English" },
  ko: { short: "KO", full: "한국어" },
  ja: { short: "JA", full: "日本語" },
};

export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  function onSelectLocale(nextLocale: Locale) {
    router.replace(pathname, { locale: nextLocale });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm transition-colors focus:outline-none"
          aria-label="Change language"
        >
          <GlobeIcon />
          {localeLabels[locale].short}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px]">
        {locales.map((l) => (
          <DropdownMenuItem
            key={l}
            onClick={() => onSelectLocale(l)}
            className={l === locale ? "font-medium" : ""}
          >
            <span className="text-muted-foreground mr-2 w-5 text-xs">
              {localeLabels[l].short}
            </span>
            {localeLabels[l].full}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function GlobeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}
