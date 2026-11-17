"use client";

import { useState, type ReactNode } from "react";
import { ThemeProvider, useTheme } from "next-themes";
import { prepareThemeStorage, readThemePreference, themePreflightScript, writeThemePreference } from "../lib/theme/preference";

// A document marker keeps opt-in consistent across standalone/provider-backed
// package graphs; separate bundled React contexts would lose that signal.
/** Shared controls commit cookies only for explicit choices under the owned provider. */
export function useNaeilTheme() {
  const theme = useTheme();
  return { ...theme, setTheme: (value: Parameters<typeof theme.setTheme>[0]) => {
    const next = typeof value === "function" ? value(theme.theme ?? "dark") : value;
    if (typeof document !== "undefined" && document.querySelector("script[data-naeil-theme-preference]") && (next === "light" || next === "dark" || next === "system")) writeThemePreference(next);
    theme.setTheme(next);
  } };
}

function RootThemeProvider({ children }: { children: ReactNode }) {
  // CSR roots do not execute inserted script tags. SSR runs the identical
  // preflight before next-themes' script and before its hydration initializer.
  // A body script cannot guarantee pre-content paint timing in streamed HTML;
  // use NaeilThemeScript in head for that guarantee.
  useState(() => { if (typeof window !== "undefined") prepareThemeStorage(readThemePreference); return null; });
  return <>
    <script data-naeil-theme-preference="" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: themePreflightScript }} />
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem
      disableTransitionOnChange storageKey="theme">{children}</ThemeProvider>
  </>;
}

/** Owned-service theme policy. Nested shells reuse the root without a preflight. */
export function NaeilThemeProvider({ children }: { children: ReactNode }) {
  const { themes } = useTheme();
  return themes.length ? <>{children}</> : <RootThemeProvider>{children}</RootThemeProvider>;
}
