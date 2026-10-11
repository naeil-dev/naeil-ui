/* Canonical SVG comparisons must render the original bytes directly. */
/* eslint-disable @next/next/no-img-element */
import { useState, type ComponentPropsWithoutRef } from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { Logo } from "./logo";
import { brandVersion } from "./brand-artwork.generated";
import { Nav } from "./nav";
import { Footer } from "./footer";

const meta = {
  title: "Brand/Logo",
  component: Logo,
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: `naeil brand ${brandVersion}. Artwork is generated from the independent brand/naeil/${brandVersion} kit. The official wordmark is .naeil: an ending followed by tomorrow. Lato 400 is outlined in the logo only; the shared UI keeps Pretendard. Import from @naeil/ui/components/logo in React-only apps. size is rendered height (default 20). variant: symbol, horizontal, footer, stacked, wordmark. tone="gray" preserves island detail; legacy mono uses a single currentColor silhouette. theme="auto" follows an explicit .light/.dark or data-theme ancestor, otherwise the OS; theme="light"/"dark" works without automatic theme CSS. label=null makes a decorative logo. The same size/className/mono API and Nav brandSlot remain supported. Standalone SVG/PNG/favicon files do not require this React package. See DESIGN.md and docs/design/v2-migration.md for ownership and release rules.` } },
  },
  argTypes: {
    variant: { control: "select", options: ["symbol", "horizontal", "footer", "stacked", "wordmark"] },
    tone: { control: "select", options: ["color", "gray"] },
    theme: { control: "select", options: ["auto", "light", "dark"] },
    size: { control: "number" },
  },
  args: { size: 28, variant: "horizontal", tone: "color", theme: "auto" },
} satisfies Meta<typeof Logo>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const Usage: Story = {
  render: () => <div style={{ display: "grid", gap: 24 }}>
    {(["light", "dark"] as const).map(theme => <section key={theme} data-theme={theme} style={{ background: theme === "light" ? "#F5F6F8" : "#090B0C", color: theme === "light" ? "#263C4B" : "#F3F0E9", padding: 24 }}>
      <h2>{theme} — final artwork and shared component</h2>
      <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap", marginTop: 20 }}>
        {(["color", "gray"] as const).map(tone => <div key={tone} style={{ display: "grid", gap: 16 }}>
          <Logo data-testid={`component-${theme}-${tone}`} variant="horizontal" size={28} tone={tone} />
          {/* Original files are copied by prepare-storybook, never independently redrawn. */}
          <img data-testid={`reference-${theme}-${tone}`} src={`brand/naeil-horizontal-${tone}${theme === "dark" ? "-dark" : ""}.svg`} height={28} style={{ height: 28, width: "auto" }} alt={`Original ${tone} reference`} />
        </div>)}
        <Logo variant="footer" size={20} />
        <Logo variant="stacked" size={140} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap", marginTop: 24 }}>
        {[16,24,32,40,64].map(size => <div key={size}><Logo size={size} /><span style={{ display: "block" }}>{size}px</span></div>)}
      </div>
    </section>)}
    <section><h2>Legacy currentColor silhouette</h2><p>Compatibility fallback. Use <code>tone=&quot;gray&quot;</code> for the approved tonal logo with islands.</p><Logo mono size={40} style={{ color: "#263C4B" }} /></section>
    <section className="dark"><div data-theme="light" style={{ background: "#F5F6F8", padding: 16 }}><Logo data-testid="nested-light" variant="horizontal" size={28} /></div></section>
  </div>,
};

const messages = {
  nav: { blog: "블로그", projects: "프로젝트" }, projects: {},
  footer: { tagline: "Tomorrow starts here.", navigation: "내비게이션", projects: "프로젝트", blog: "블로그", social: "소셜" },
};
const DemoLink = ({ children, ...props }: ComponentPropsWithoutRef<"a"> & { href: string }) => <a {...props}>{children}</a>;
function ApplicationExample() {
  const [login, setLogin] = useState(false);
  return <NextIntlClientProvider locale="ko" timeZone="UTC" messages={messages}>
    <Nav Link={DemoLink} usePathname={() => login ? "/login" : "/"} showProjects={false} toolbarSlot={<span>KO</span>} authSlot={<span>로그인</span>} />
    <main style={{ minHeight: 600, maxWidth: login ? 480 : 1200, padding: "100px 24px 48px", margin: "auto" }}>
      <button type="button" onClick={() => setLogin(value => !value)} className="ui-control rounded-md border px-4">화면 전환</button>
      <div style={{ marginTop: 64, textAlign: login ? "center" : "left" }}>
        {login && <Logo size={40} style={{ display: "block", margin: "0 auto 16px" }} />}
        <h1>{login ? "로그인" : "브랜드 적용 예제"}</h1>
        <p>본문의 너비가 달라져도 내비게이션 로고와 메뉴 위치를 유지합니다.</p>
      </div>
    </main>
    <Footer />
  </NextIntlClientProvider>;
}
export const Application: Story = { parameters: { layout: "fullscreen" }, render: () => <ApplicationExample /> };
