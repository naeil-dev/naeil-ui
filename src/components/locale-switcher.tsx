"use client";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "./ui/dropdown-menu";

interface LocaleSwitcherProps {
  /** Available locales */
  locales: Array<{ code: string; short: string; full: string }>;
  /** Current locale */
  currentLocale: string;
  /** Called when user selects a new locale */
  onLocaleChange: (locale: string) => void;
}

export function LocaleSwitcher({
  locales,
  currentLocale,
  onLocaleChange,
}: LocaleSwitcherProps) {
  const current = locales.find((l) => l.code === currentLocale);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm transition-colors focus:outline-none"
          aria-label={`Change language — current: ${current?.short ?? currentLocale}`}
        >
          <GlobeIcon />
          {current?.short ?? currentLocale.toUpperCase()}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px]">
        {locales.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => onLocaleChange(l.code)}
            className={l.code === currentLocale ? "font-medium" : ""}
          >
            <span className="text-muted-foreground mr-2 w-5 text-xs">
              {l.short}
            </span>
            {l.full}
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
