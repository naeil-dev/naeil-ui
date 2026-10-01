"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Nav } from "@naeil/ui/components/nav";
import { Footer } from "@naeil/ui/components/footer";
import { ThemeToggleIcon } from "@naeil/ui/components/theme-toggle-icon";
import { LocaleSwitcher } from "@naeil/ui/components/locale-switcher";
import { Logo, PageTitle, ThemeToggle } from "@naeil/ui";
import { Button } from "@naeil/ui/ui";
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
        brandSlot={<Logo />}
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
        <PageTitle>Packed Next compatibility</PageTitle>
        <Button>Consumer action</Button>
        <ThemeToggle />
        <p>
          {locales.join(", ")} / {routing.defaultLocale}
        </p>
      </main>
      <Footer linksExternal />
    </>
  );
}
