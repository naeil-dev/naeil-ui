import { NaeilThemeScript } from "@/theme-bootstrap";
import { JetBrains_Mono } from "next/font/google";
import { SiteSessionStateProvider } from "@/components/site-session-state";
import { NaeilLocaleController } from "@/naeil-locale/client";
import { getLocale } from "next-intl/server";
import "@naeil/ui/fonts.css";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  return (
    <html lang={locale} suppressHydrationWarning>
      <head><NaeilThemeScript /></head>
      <body className={`${jetbrainsMono.variable} antialiased`}>
        <NaeilLocaleController service="main" preferenceWritesEnabled={process.env.NAEIL_LOCALE_SEND_ENABLED === "1"}><SiteSessionStateProvider>{children}</SiteSessionStateProvider></NaeilLocaleController>
      </body>
    </html>
  );
}
