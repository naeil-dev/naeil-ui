import "@naeil/ui/globals.css";
import { NaeilThemeProvider, NaeilServiceShell, PageHeader } from '@naeil/ui/naeil-shell';
export default function Layout({children}) {
  return <html suppressHydrationWarning><body><NaeilThemeProvider>
    <NaeilServiceShell account={{status: "signed-out", loginHref: "/login"}} service="estimate" locale="en"><PageHeader title="Estimates" />{children}</NaeilServiceShell>
  </NaeilThemeProvider></body></html>;
}
