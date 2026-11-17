/* eslint-disable @next/next/no-head-element -- App Router root layout fixture. */
import { Suspense } from "react";
import { NaeilThemeProvider } from "@naeil/ui/naeil-shell";
import { NaeilThemeScript } from "@naeil/ui/theme-bootstrap";
import "./globals.css";
export const dynamic = "force-dynamic";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en" suppressHydrationWarning><head><NaeilThemeScript /></head><body><NaeilThemeProvider><Suspense fallback={null}>{children}</Suspense></NaeilThemeProvider></body></html>;
}
