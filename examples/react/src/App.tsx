import { useEffect, useRef, useState } from "react";
import { Button, Input, Switch, Tabs, TabsList, TabsTrigger, TabsContent, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@naeil/ui/ui";
import { Textarea } from "@naeil/ui/components/ui/textarea";
import * as DeepTabs from "@naeil/ui/components/ui/tabs";
import * as DeepMenu from "@naeil/ui/components/ui/dropdown-menu";
import { PageTitle } from "@naeil/ui/components/typography";
import { ThemeProvider } from "@naeil/ui/components/theme-provider";

export function App() {
  const [saved, setSaved] = useState(false);
  const notes = useRef<HTMLTextAreaElement>(null);
  return (
    <ThemeProvider attribute="class">
      <main className="mx-auto p-6" data-ui-layout="settings">
        <PageTitle>Profile preferences</PageTitle>
        <p lang="ko">내 프로필과 알림 환경을 설정합니다.</p>
        <p lang="ja">プロフィールと通知設定を確認します。</p>
        <form
          className="mt-6 grid gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            setSaved(true);
          }}
          onChange={() => setSaved(false)}
        >
          <div className="grid gap-2">
            <label htmlFor="display-name">Display name</label>
            <Input
              id="display-name"
              name="displayName"
              defaultValue="Alex"
              required
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor="profile-notes">Profile notes</label>
            <Textarea ref={notes} id="profile-notes" name="notes" defaultValue="Initial notes" required />
          </div>
          <div className="ui-choice-label">
            <Switch id="notifications" name="notifications" defaultChecked />
            <label htmlFor="notifications">Email notifications</label>
          </div>
          <Button type="submit" className="justify-self-start">
            Save preferences
          </Button>
          <p role="status">
            {saved ? "Preferences saved for this example." : ""}
          </p>
        </form>
        <ExtensionSpecimen />
        <MixedImportOverlays />
      </main>
    </ThemeProvider>
  );
}

function ExtensionSpecimen() {
  const rootRef = useRef<HTMLDivElement>(null), listRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null), panelRef = useRef<HTMLDivElement>(null);
  const [refs, setRefs] = useState("");
  return <section className="mt-8 grid gap-3" aria-label="Related preferences">
    <Tabs ref={rootRef} defaultValue="details">
      <TabsList ref={listRef} aria-label="Preference sections">
        <TabsTrigger ref={triggerRef} value="details" className="px-6">Details</TabsTrigger>
        <TabsTrigger value="disabled" disabled>Unavailable</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>
      <TabsContent ref={panelRef} value="details"><p>Current preferences.</p></TabsContent>
      <TabsContent value="history"><p>No earlier preferences.</p></TabsContent>
    </Tabs>
    <Button type="button" variant="outline" onClick={() => setRefs([rootRef.current, listRef.current, triggerRef.current, panelRef.current].map(element => element?.dataset.slot || "null").join("/"))}>Inspect extension refs</Button>
    <p data-testid="extension-refs">{refs}</p>
    <DeepTabs.Tabs dir="rtl" defaultValue="start">
      <DeepTabs.TabsList aria-label="RTL sections">
        <DeepTabs.TabsTrigger value="start">Start</DeepTabs.TabsTrigger>
        <DeepTabs.TabsTrigger value="next">Next</DeepTabs.TabsTrigger>
      </DeepTabs.TabsList>
      <DeepTabs.TabsContent value="start"><p>First section.</p></DeepTabs.TabsContent>
      <DeepTabs.TabsContent value="next"><p>Second section.</p></DeepTabs.TabsContent>
    </DeepTabs.Tabs>
  </section>;
}

// Consumer regression specimen: bundled and deep import modules coexist under
// StrictMode. Controlled overlap simulates app-owned state/route transitions.
function MixedImportOverlays() {
  const [first, setFirst] = useState(false), [second, setSecond] = useState(false);
  const firstRef = useRef<HTMLDivElement>(null), secondRef = useRef<HTMLDivElement>(null);
  const [refResult, setRefResult] = useState("unchecked");
  const specimen = useRef<HTMLElement>(null), effectSetups = useRef(0);
  useEffect(() => { specimen.current?.setAttribute("data-effect-setups", String(++effectSetups.current)); }, []);
  return <section ref={specimen} data-testid="mixed-specimen" className="mt-8 grid gap-3" aria-label="Packed overlay regression">
    <Button type="button" onClick={() => setSecond(true)}>Open deep layer</Button>
    <Button type="button" onClick={() => setFirst(false)}>Remove bundled layer</Button>
    <Button type="button" onClick={() => { setFirst(false); setSecond(false); }}>Remove all layers</Button>
    <Button type="button" onClick={() => setRefResult(`${firstRef.current?.dataset.slot || "null"}/${secondRef.current?.dataset.slot || "null"}`)}>Inspect object refs</Button>
    <p data-testid="mixed-object-refs">{refResult}</p>
    <Button type="button" data-testid="mixed-background">Overlay background action</Button>
    <div inert data-testid="mixed-original-inert">Originally inert background</div>
    <DropdownMenu open={first} onOpenChange={setFirst}>
      <DropdownMenuTrigger asChild><Button type="button">Bundled actions</Button></DropdownMenuTrigger>
      <DropdownMenuContent ref={firstRef}><DropdownMenuItem onSelect={event => event.preventDefault()}>Bundled keep open</DropdownMenuItem></DropdownMenuContent>
    </DropdownMenu>
    <DeepMenu.DropdownMenu open={second} onOpenChange={setSecond}>
      <DeepMenu.DropdownMenuTrigger asChild><Button type="button">Deep actions</Button></DeepMenu.DropdownMenuTrigger>
      <DeepMenu.DropdownMenuContent ref={secondRef}><DeepMenu.DropdownMenuItem onSelect={event => event.preventDefault()}>Deep keep open</DeepMenu.DropdownMenuItem></DeepMenu.DropdownMenuContent>
    </DeepMenu.DropdownMenu>
  </section>;
}
