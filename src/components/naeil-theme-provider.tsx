"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "next-themes";

/** Owned-service theme policy. Install once at the application root. */
export function NaeilThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeProvider attribute="class" defaultTheme="dark" enableSystem
    disableTransitionOnChange storageKey="theme">{children}</ThemeProvider>;
}
