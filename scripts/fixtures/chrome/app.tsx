/* eslint-disable @next/next/no-html-link-for-pages -- React-only packed fixture. */
import React, { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Dialog } from "radix-ui";
import { ThemeProvider } from "next-themes";
import { KeyRound, LayoutDashboard, Network, Shuffle } from "lucide-react";
import { NaeilHeader, NaeilHeaderAccountControl, type NaeilHeaderLocale } from "@naeil/ui/naeil-header";
import { NaeilFooter } from "@naeil/ui/naeil-footer";
import { Navigation, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@naeil/ui/ui";

const query = new URLSearchParams(location.search);
const initialLocale = (query.get("locale") || "ko") as NaeilHeaderLocale;
document.documentElement.lang = query.get("documentLang") || initialLocale;
document.documentElement.className = query.get("theme") || "light";
if (query.has("hostile")) document.documentElement.setAttribute("data-dashboard-v2", "");

const appNavigation = [{ id: "ai", label: "AI", columns: 1 as const, items: [
  { id: "dashboard", label: "대시보드", href: "/", description: "계정과 사용량", icon: <LayoutDashboard size={20} /> },
  { id: "keys", label: "API 키", href: "/keys", description: "키 관리", icon: <KeyRound size={20} /> },
  { id: "connections", label: "모델 연결", href: "/connections", description: "모델 관리", icon: <Network size={20} /> },
  { id: "auto", label: "Auto", href: "/auto", description: "자동 선택", icon: <Shuffle size={20} /> },
] }, { id: "console", label: "Console", href: "/console" }];

function App() {
  const [locale, setLocale] = useState(initialLocale);
  const [href, setHref] = useState(query.get("current") || "/absent");
  const [open, setOpen] = useState(false);
  const [transitions, setTransitions] = useState<boolean[]>([]);
  const [guard, setGuard] = useState(false);
  const [busy, setBusy] = useState(false);
  const [requests, setRequests] = useState(0);
  const [notice, setNotice] = useState("draft retained");
  const locked = useRef(false);
  const opener = useRef<HTMLElement | null>(null);
  const home = query.get("profile") === "home";
  const mode = query.get("mode") || "controlled";
  const signedOut = query.get("auth") === "out";
  const profile = query.get("profile");
  const account = <NaeilHeaderAccountControl locale={locale} account={signedOut ? { status: "signed-out", loginHref: "/login" } : {
    status: "signed-in", displayName: "Example account", email: "account@example.invalid", busy: busy || query.get("auth") === "busy",
    onLogout: () => {
      if (!home) return;
      setOpen(false);
      setGuard(true);
    },
  }} />;
  const sheetProps = home ? {
    ...(mode === "controlled" ? { mobileOpen: open } : {}),
    ...(mode === "uncontrolled" ? {} : { onMobileOpenChange: (next: boolean) => { setOpen(next); setTransitions(values => [...values, next]); } }),
  } : {};
  const navigate = (event: React.MouseEvent<HTMLAnchorElement>, item: { href: string }) => {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault(); setHref(item.href);
  };
  const submit = () => {
    if (locked.current) return;
    locked.current = true; setGuard(false); setBusy(true); setRequests(value => value + 1); setNotice("pending");
  };
  return <>
    {profile === "generic" ? <Navigation brand={<a href="/">Generic</a>} items={appNavigation} labels={{ menu: "Menu", close: "Close", navigation: "Navigation" }} /> :
      <NaeilHeader locale={locale} currentHref={href} onNavigate={navigate} onLocaleChange={setLocale} authSlot={account}
        {...(home ? { showProjects: false, showBlog: false, appNavigation, brandSuffix: "Home", brandHref: "/", brandLinkProps: { "aria-label": "Naeil Home" }, statusSlot: <span data-testid="readiness" role="status" aria-label="Ready" style={{ display: "block", width: 8, height: 8, borderRadius: "50%", background: "green" }} /> } : {})}
        {...sheetProps}
        {...(profile === "estimate" ? { currentProjectKey: "naeilUi", currentProjectHref: "/workspace", projectsExternal: true, subNav: [{ label: "Settings", href: "/settings" }] } : {})}
        {...(profile === "jev" ? { projects: [{ id: "custom", label: "Custom project", href: "/custom", description: "Consumer description", badge: <span>Badge</span>, active: true, target: "_blank" as const, external: true }], translations: { projects: "Tools", blog: "Journal", project: (key: string) => key }, resolveHref: (path: string) => `/local${path}`, brandSlot: <span>Consumer brand</span>, brandLinkProps: { "aria-label": "Consumer home" }, brandLinkComponent: (props: React.ComponentProps<"a"> & { href: string }) => <a data-custom-brand {...props} />, toolbarSlot: <button>Consumer toolbar</button> } : {})}
      />}
    <main className="ui-app-frame" style={{ paddingTop: 100, minHeight: 360 }}>
      <button data-testid="route" onClick={() => setHref("/route-change")}>Route change</button>
      <button data-testid="fail" onClick={() => { locked.current = false; setBusy(false); setNotice("failed; retry allowed"); }}>Fail request</button>
      <output data-testid="transitions">{JSON.stringify(transitions)}</output>
      <output data-testid="requests">{requests}</output><p data-testid="notice">{notice}</p>
      <Select defaultValue="ko"><SelectTrigger aria-label="Body language"><SelectValue /></SelectTrigger><SelectContent data-testid="body-select">
        <SelectItem value="ko" lang="ko">한국어</SelectItem><SelectItem value="en" lang="en">English</SelectItem><SelectItem value="ja" lang="ja">日本語</SelectItem>
      </SelectContent></Select>
      <DropdownMenu><DropdownMenuTrigger>Body menu</DropdownMenuTrigger><DropdownMenuContent data-testid="body-menu"><DropdownMenuItem>Body action</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
      <Dialog.Root><Dialog.Trigger>Body dialog</Dialog.Trigger><Dialog.Portal><Dialog.Content data-testid="body-dialog" aria-describedby={undefined}><Dialog.Title>Body title</Dialog.Title><p>Body paragraph</p><Dialog.Close>Close body</Dialog.Close></Dialog.Content></Dialog.Portal></Dialog.Root>
    </main>
    <NaeilFooter locale={locale} onNavigate={navigate} meta={home ? "Version 1.0" : undefined} />
    {/* Home modal's exact opener capture/restore behavior, without package hooks. */}
    <Dialog.Root open={guard} onOpenChange={setGuard}><Dialog.Portal><Dialog.Overlay style={{ position: "fixed", inset: 0, zIndex: 80, background: "#0008" }} />
      <Dialog.Content data-testid="guard" aria-describedby={undefined} style={{ position: "fixed", inset: "25% 16px auto", zIndex: 81, background: "white", padding: 24 }}
        onOpenAutoFocus={() => { opener.current = document.activeElement as HTMLElement; }}
        onCloseAutoFocus={event => { event.preventDefault(); opener.current?.focus(); }}>
        <Dialog.Title>Discard draft?</Dialog.Title><Dialog.Close>Cancel</Dialog.Close><button onClick={submit}>Discard</button>
      </Dialog.Content></Dialog.Portal></Dialog.Root>
  </>;
}
createRoot(document.getElementById("root")!).render(<ThemeProvider attribute="class" forcedTheme={query.get("theme") || "light"}><App /></ThemeProvider>);
