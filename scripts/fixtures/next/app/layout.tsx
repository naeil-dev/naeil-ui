import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "@naeil/ui/components/theme-provider";

const messages = {
  nav: { projects: "Projects", blog: "Blog" },
  projects: {},
  footer: {
    tagline: "Consumer-owned messages",
    navigation: "Navigation",
    projects: "Projects",
    blog: "Blog",
    social: "Social",
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
          <ThemeProvider attribute="class">{children}</ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
