"use client";

import { useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { localeNames, locales } from "@/i18n/config";

const subscribe = () => () => {};

/** Product labels stay here; the shared Button and Select own behavior and style. */
export function SiteThemeControl() {
  const { resolvedTheme, setTheme } = useTheme();
  const t = useTranslations("theme");
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  // next-themes reads stored preferences only in the browser. Keep the hydration
  // snapshot identical to SSR, then expose the resolved theme after mounting.
  const dark = mounted && resolvedTheme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-11 shrink-0"
      disabled={!mounted}
      aria-label={t(dark ? "switchToLight" : "switchToDark")}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </Button>
  );
}

export function SiteLocaleControl({
  currentLocale,
  onLocaleChange,
}: {
  currentLocale: string;
  onLocaleChange: (locale: string) => void;
}) {
  const t = useTranslations("locale");
  return (
    <Select value={currentLocale} onValueChange={onLocaleChange}>
      <SelectTrigger
        className="h-11 w-auto min-w-20 border-transparent bg-transparent px-2"
        aria-label={t("switchLabel")}
      >
        <SelectValue>{currentLocale.toUpperCase()}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end">
        {locales.map((locale) => (
          <SelectItem
            key={locale}
            value={locale}
            className="min-h-11"
            lang={locale}
          >
            {localeNames[locale]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
