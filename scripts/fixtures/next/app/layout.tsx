import { ThemeProvider } from "@naeil/ui/components/theme-provider";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
          <ThemeProvider attribute="class">{children}</ThemeProvider>
      </body>
    </html>
  );
}
