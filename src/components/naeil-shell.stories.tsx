import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NaeilServiceShell, PageHeader, naeilDocumentTitle, naeilIcons, type NaeilService } from "./naeil-shell";
import { NaeilHeaderAccountControl, type NaeilHeaderLocale } from "./naeil-header";
import { Button } from "./ui/button";

const meta = {
  title: "Brand/NaeilServiceShell",
  component: NaeilServiceShell,
  args: { service: "estimate", locale: "en" },
  parameters: { layout: "fullscreen", docs: { description: { component: "The complete owned-service frame with its own dark-default provider. No Storybook theme provider surrounds these stories." } } },
} satisfies Meta<typeof NaeilServiceShell>;
export default meta;
type Story = StoryObj<typeof meta>;
const copy = {
  ko: { title: "견적 목록", description: "저장한 견적을 확인하고 새 견적을 작성하세요.", action: "새 견적", content: "아직 저장한 견적이 없습니다." },
  ja: { title: "見積一覧", description: "保存した見積を確認して、新しい見積を作成できます。", action: "新しい見積", content: "保存した見積はまだありません。" },
  en: { title: "Estimates", description: "Review your saved estimates and create a new estimate.", action: "New estimate", content: "You have no saved estimates yet." },
};
function Example({ service }: { service: NaeilService }) {
  const params = new URLSearchParams(window.location.search);
  const initial = params.get("shellLocale");
  const [locale, setLocale] = useState<NaeilHeaderLocale>(initial === "ko" || initial === "ja" ? initial : "en");
  const [notice, setNotice] = useState("");
  const [signedIn, setSignedIn] = useState(params.get("shellAuth") !== "out");
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = naeilDocumentTitle(service, copy[locale].title);
    // Story-specific document identity, just as a consuming application's metadata owns it.
    const links = naeilIcons.links.map(attrs => {
      const link = document.createElement("link");
      Object.entries(attrs).forEach(([key, value]) => link.setAttribute(key, value));
      document.head.append(link); return link;
    });
    return () => links.forEach(link => link.remove());
  }, [locale, service]);
  const text = copy[locale];
  return <NaeilServiceShell service={service} locale={locale} mainLabel={text.title}
    footer={params.has("noFooter") ? false : { meta: ".naeil service shell" }}
    onNavigate={(event, item) => {
      if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || item.target === "_blank") return;
      event.preventDefault(); setNotice(item.href);
    }}
    header={{ onLocaleChange: setLocale, authSlot: <NaeilHeaderAccountControl locale={locale} account={signedIn
      ? { status: "signed-in", onLogout: () => { setSignedIn(false); setNotice("Signed out"); } }
      : { status: "signed-out", loginHref: "/login" }} /> }}>
    <PageHeader title={text.title} description={text.description} actions={<Button onClick={() => setNotice(text.action)}>{text.action}</Button>} />
    <section data-ui-layout="list" data-shell-content><p>{text.content}</p><p role="status">{notice}</p></section>
  </NaeilServiceShell>;
}
export const Abstorm: Story = { render: () => <Example service="abstorm" /> };
export const Home: Story = { render: () => <Example service="home" /> };
export const Estimate: Story = { render: () => <Example service="estimate" /> };
export const Jev: Story = { render: () => <Example service="jev" /> };
// Deliberate failing runtime fixture; never used by consuming applications.
export const RuntimeViolation: Story = { render: () => <><Example service="estimate" /><style>{'body { font-size: 14px !important; }'}</style></> };
