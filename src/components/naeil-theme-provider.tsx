"use client";

import type { ReactNode } from "react";
import { ThemeProvider, useTheme } from "next-themes";

// Nested shells reuse the root provider and must not run another preflight.
function StorageFallback() {
  const { themes } = useTheme();
  if (themes.length) return null;
  return <script dangerouslySetInnerHTML={{ __html: `(function(){try{localStorage.getItem('theme')}catch(e){var d=document.documentElement;d.classList.remove('light');d.classList.add('dark');d.style.colorScheme='dark'}})()` }} />;
}

/** Owned-service theme policy. Install once at the application root. */
export function NaeilThemeProvider({ children }: { children: ReactNode }) {
  return <><StorageFallback /><ThemeProvider attribute="class" defaultTheme="dark" enableSystem
    disableTransitionOnChange storageKey="theme">{children}</ThemeProvider></>;
}
