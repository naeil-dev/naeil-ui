"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Nav } from "@naeil/ui/components/nav";
import { Footer } from "@naeil/ui/components/footer";
import { ThemeToggleIcon } from "@naeil/ui/components/theme-toggle-icon";
import { LocaleSwitcher } from "@naeil/ui/components/locale-switcher";
import { Logo, PageTitle, ThemeToggle } from "@naeil/ui";
import { Sheet, SheetTrigger, Button, Tabs, TabsList, TabsTrigger, TabsContent, Textarea } from "@naeil/ui/ui";
import { Sheet as DeepSheet, SheetTrigger as DeepSheetTrigger } from "@naeil/ui/components/ui/sheet";
import { locales } from "@naeil/ui/i18n/config";
import { routing } from "@naeil/ui/i18n/routing";

export default function Page() {
  return (
    <>
      <Nav
        Link={Link}
        usePathname={usePathname}
        showProjects={false}
        showBlog={false}
        toolbarSlot={
          <>
            <ThemeToggleIcon />
            <LocaleSwitcher
              locales={[{ code: "en", short: "EN", full: "English" }]}
              currentLocale="en"
              onLocaleChange={() => {}}
            />
          </>
        }
      />
      <main>
        <Logo variant="horizontal" size={28} />
        <PageTitle>Packed Next compatibility</PageTitle>
        <Button>Consumer action</Button>
        <Sheet><SheetTrigger>Packed Next Sheet</SheetTrigger></Sheet>
        <DeepSheet><DeepSheetTrigger>Packed Next deep Sheet</DeepSheetTrigger></DeepSheet>
        <Tabs defaultValue="notes">
          <TabsList aria-label="Compatibility sections"><TabsTrigger value="notes">Notes</TabsTrigger></TabsList>
          <TabsContent value="notes"><label>Compatibility notes<Textarea name="notes" defaultValue="Packed multiline value" /></label></TabsContent>
        </Tabs>
        <ThemeToggle />
        <p>
          {locales.join(", ")} / {routing.defaultLocale}
        </p>
      </main>
      <Footer linksExternal />
    </>
  );
}
