import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NaeilHeader, type NaeilHeaderLocale } from "./naeil-header";
import { Button } from "./ui/button";
import { SiteFooter } from "./ui/site-footer";
import { Logo } from "./logo";

const meta = {
  title: "Brand/NaeilHeader",
  component: NaeilHeader,
  tags: ["autodocs"],
  args: { locale: "ja" },
  argTypes: { locale: { control: "select", options: ["en", "ko", "ja"] } },
  parameters: {
    layout: "fullscreen",
    docs: { description: { component: "The actual complete React-only naeil header: localized project catalog, official artwork URLs, theme/language controls and shared responsive navigation. Routing, theme provider and authentication are supplied by the consumer. This example intercepts destinations locally." } },
  },
} satisfies Meta<typeof NaeilHeader>;
export default meta;
type Story = StoryObj<typeof meta>;

function HeaderExample({ locale: initialLocale, japaneseOnly = false }: { locale: NaeilHeaderLocale; japaneseOnly?: boolean }) {
  const [locale, setLocale] = useState(initialLocale);
  const [href, setHref] = useState("/");
  const [notice, setNotice] = useState("");
  useEffect(() => { setLocale(initialLocale); }, [initialLocale]);
  return <>
    <NaeilHeader locale={locale} currentHref={href} resolveHref={path => path}
      onLocaleChange={japaneseOnly ? undefined : setLocale}
      authSlot={<Button className="min-h-11" variant="ghost" onClick={() => setNotice("Application session callback")}>Example session</Button>}
      onNavigate={(event, item) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || item.target === "_blank") return;
        event.preventDefault();
        setHref(item.href);
        setNotice(item.href);
      }}
    />
    <main className="ui-app-frame min-h-[420px] pb-12 pt-28">
      <h1 className="text-3xl font-semibold">.naeil</h1>
      <p className="mt-4 text-muted-foreground">{japaneseOnly ? "Japanese-only application adapter" : "Shared website header"}</p>
      <p role="status" className="mt-4">{notice}</p>
    </main>
    <SiteFooter variant="compact" brand={<Logo variant="footer" size={20} />} meta="Shared application frame" />
  </>;
}

export const Usage: Story = { render: args => <HeaderExample locale={args.locale} /> };
export const JapaneseApplication: Story = { render: () => <HeaderExample locale="ja" japaneseOnly /> };
