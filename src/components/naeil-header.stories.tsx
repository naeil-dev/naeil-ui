import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NaeilHeader, NaeilHeaderAccountControl, type NaeilHeaderLocale } from "./naeil-header";
import { NaeilFooter } from "./naeil-footer";

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

function HeaderExample({ locale: initialLocale, japaneseOnly = false, variant = "compact", reference = false }: {
  locale: NaeilHeaderLocale; japaneseOnly?: boolean; variant?: "full" | "compact"; reference?: boolean;
}) {
  const [locale, setLocale] = useState(initialLocale);
  const [href, setHref] = useState("/");
  const [notice, setNotice] = useState("");
  useEffect(() => { setLocale(initialLocale); }, [initialLocale]);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  return <>
    <NaeilHeader locale={locale} currentHref={href} resolveHref={path => path}
      onLocaleChange={japaneseOnly || reference ? undefined : setLocale}
      authSlot={reference ? undefined : <NaeilHeaderAccountControl locale={locale}
        account={{ status: "signed-in", onLogout: () => setNotice("Application session callback") }} />}
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
    <NaeilFooter locale={locale} variant={variant} resolveHref={reference ? undefined : path => path}
      onNavigate={(event, item) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || item.target === "_blank") return;
        event.preventDefault(); setNotice(item.href);
      }} />
  </>;
}

export const Usage: Story = { render: args => <HeaderExample locale={args.locale} /> };
export const JapaneseApplication: Story = { render: () => <HeaderExample locale="ja" japaneseOnly /> };
export const ReferenceFull: Story = { render: args => <HeaderExample locale={args.locale} variant="full" reference /> };
export const ReferenceCompact: Story = { render: args => <HeaderExample locale={args.locale} variant="compact" reference /> };
// Fixed-locale reference entries avoid relying on manager-only URL args in static iframes.
export const ReferenceFullEn: Story = { render: () => <HeaderExample locale="en" variant="full" reference /> };
export const ReferenceCompactEn: Story = { render: () => <HeaderExample locale="en" variant="compact" reference /> };
export const ReferenceFullKo: Story = { render: () => <HeaderExample locale="ko" variant="full" reference /> };
export const ReferenceCompactKo: Story = { render: () => <HeaderExample locale="ko" variant="compact" reference /> };

function AccountExample() {
  useEffect(() => { document.documentElement.lang = "ja"; }, []);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("ready");
  const [authenticated, setAuthenticated] = useState(true);
  return <>
    <NaeilHeader locale="ja" authSlot={<NaeilHeaderAccountControl locale="ja" account={authenticated ? {
      status: "signed-in", busy, displayName: "Example account with a very long display name", email: "long-example-address@example.invalid",
      onLogout: () => { setBusy(true); setResult("pending"); },
    } : { status: "signed-out", loginHref: "/login?next=%2Feditor" }} />} />
    <main className="ui-app-frame pt-28">
      <button onClick={() => { setBusy(false); setResult("cancelled"); }}>Cancel guarded action</button>
      <button onClick={() => { setBusy(false); setResult("failed"); }}>Fail session action</button>
      <button onClick={() => { setBusy(false); setAuthenticated(false); setResult("signed out"); }}>Complete session action</button>
      <p role="status">{result}</p>
    </main>
  </>;
}
export const AccountStates: Story = { render: () => <AccountExample /> };
