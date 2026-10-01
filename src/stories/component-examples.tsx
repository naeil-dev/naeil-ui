"use client";
import { useCallback, useEffect, useId, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import {
  Avatar, AvatarImage, AvatarFallback, AvatarBadge, AvatarGroup, AvatarGroupCount,
  Badge, Button, Card, CardElevated, CardHeader, CardTitle, CardDescription,
  CardContent, CardFooter, CardAction, Checkbox, Dialog, DialogTrigger,
  DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
  DialogClose, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuGroup, DropdownMenuLabel, DropdownMenuItem, DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator,
  DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubTrigger,
  DropdownMenuPortal, DropdownMenuSubContent, Input, Select, SelectTrigger,
  SelectValue, SelectContent, SelectGroup, SelectLabel, SelectItem,
  SelectSeparator, Switch, Toaster,
} from "../components/ui";

export const localized = [
  ["ko", "긴 워크스페이스 이름과 알림 환경을 확인하고 변경사항을 안전하게 저장합니다"],
  ["en", "Review the long workspace name and notification preferences before saving your changes"],
  ["ja", "長いワークスペース名と通知設定を確認してから変更内容を安全に保存します"],
];

export function ButtonUsage() {
  const [saving, setSaving] = useState(false), [status, setStatus] = useState("");
  return <div className="grid w-full min-w-0 max-w-xl gap-6 [&_button]:h-auto [&_button]:min-h-11 [&_button]:max-w-full [&_button]:whitespace-normal">
    <div className="flex flex-wrap gap-3">
      <Button type="button" disabled={saving} aria-busy={saving} onClick={() => {
        setSaving(true); setStatus("Saving settings…");
        setTimeout(() => { setSaving(false); setStatus("Settings saved. (Example)"); }, 650);
      }}>{saving ? "Saving…" : "Save settings"}</Button>
      <Button type="button" variant="outline">Secondary action</Button>
      <Button disabled>Unavailable</Button>
      <Button type="button" size="icon" aria-label="Add item"><Plus /></Button>
      <Button asChild variant="link"><a href="#button-destination">Read details</a></Button>
    </div>
    <p role="status">{status}</p>
    {localized.map(([lang, label]) => <Button key={lang} lang={lang} type="button" variant="secondary"
      className="h-auto min-h-11 whitespace-normal py-2 text-left">{label}</Button>)}
    <p id="button-destination">A native anchor destination.</p>
  </div>;
}

export function InputUsage() {
  const prefix = useId();
  const [invalid, setInvalid] = useState(false), [saving, setSaving] = useState(false), [status, setStatus] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem("email") as HTMLInputElement;
    setInvalid(!input.validity.valid);
    if (!input.validity.valid) { input.focus(); return; }
    setSaving(true); setStatus("Saving…");
    setTimeout(() => { setSaving(false); setStatus("Email saved. (Example)"); }, 650);
  }
  return <form noValidate onSubmit={submit} className="grid w-full max-w-xl gap-6">
    <div className="grid gap-2">
      <label htmlFor={`${prefix}-email`}>Notification email</label>
      <Input id={`${prefix}-email`} name="email" type="email" required autoComplete="email"
        placeholder="you@example.com" aria-invalid={invalid} aria-describedby={`${prefix}-help ${prefix}-error`}
        onChange={() => setInvalid(false)} />
      <p id={`${prefix}-help`} className="text-sm text-muted-foreground">Keep your address when correcting an error.</p>
      <p id={`${prefix}-error`} role="alert" className="text-sm text-error">{invalid ? "Enter a valid email address." : ""}</p>
    </div>
    <label className="grid gap-2">Read-only reference<Input readOnly value="REF-1042" /></label>
    <label className="grid gap-2">Unavailable field<Input disabled defaultValue="Managed by your team" /></label>
    {localized.map(([lang, label]) => <label key={lang} lang={lang} className="grid gap-2">{label}<Input defaultValue={label} /></label>)}
    <Button type="submit" disabled={saving} aria-busy={saving}>{saving ? "Saving…" : "Save email"}</Button>
    <p role="status">{status}</p>
  </form>;
}

export function CardUsage() {
  const [state, setState] = useState("normal");
  return <div className="grid w-full max-w-xl gap-6">
    <div role="group" aria-label="Card content state" className="flex flex-wrap gap-2">
      {["normal", "loading", "empty", "error"].map(value => <Button key={value} type="button" variant="outline"
        aria-pressed={value === state} onClick={() => setState(value)}>{value}</Button>)}
    </div>
    <Card aria-busy={state === "loading"}>
      <CardHeader><CardTitle><h2>Workspace details</h2></CardTitle>
        <CardDescription>Related information grouped in one surface.</CardDescription>
        <CardAction><Badge variant="info">Example</Badge></CardAction></CardHeader>
      <CardContent>
        {state === "normal" ? localized.map(([lang, text]) => <p key={lang} lang={lang} className="mb-3 break-words">{text}</p>) :
          <p role="status">{state === "loading" ? "Loading workspace…" : state === "empty" ? "No description yet. Add your first note." : "Could not load workspace. Try again."}</p>}
      </CardContent>
      <CardFooter><Button type="button" variant="outline" onClick={() => setState("normal")}>{state === "error" ? "Retry" : "Show details"}</Button></CardFooter>
    </Card>
    <CardElevated><CardContent><h2 className="font-semibold">Raised surface</h2><p>Static content stays outside the tab sequence.</p></CardContent></CardElevated>
  </div>;
}

export function DialogUsage() {
  const prefix = useId(), [open, setOpen] = useState(false);
  const [name, setName] = useState(""), [invalid, setInvalid] = useState(false), [saving, setSaving] = useState(false), [status, setStatus] = useState("");
  return <div className="grid gap-4">
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button type="button">Edit workspace</Button></DialogTrigger>
      <DialogContent showCloseButton={false} className="max-h-[calc(100%-2rem)] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit workspace</DialogTitle>
          <DialogDescription>Update the name. This example keeps failed input for correction.</DialogDescription></DialogHeader>
        <form noValidate className="grid gap-5" onSubmit={event => {
          event.preventDefault(); setInvalid(!name.trim());
          if (!name.trim()) { event.currentTarget.querySelector("input")?.focus(); return; }
          setSaving(true); setStatus("Saving workspace…");
          setTimeout(() => { setSaving(false); setOpen(false); setStatus("Workspace saved. (Example)"); }, 650);
        }}>
          <label htmlFor={`${prefix}-name`}>Workspace name</label>
          <Input id={`${prefix}-name`} value={name} onChange={event => { setName(event.target.value); setInvalid(false); }}
            aria-invalid={invalid} aria-describedby={`${prefix}-error`} />
          <p id={`${prefix}-error`} role="alert" className="text-error">{invalid ? "Enter a workspace name." : ""}</p>
          {localized.map(([lang, text]) => <p key={lang} lang={lang}>{text}</p>)}
          <DialogFooter><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
            <Button type="submit" disabled={saving} aria-busy={saving}>{saving ? "Saving…" : "Save workspace"}</Button></DialogFooter>
        </form>
        <DialogClose asChild><Button type="button" variant="ghost" size="icon" className="absolute right-2 top-2" aria-label="닫기 / Close / 閉じる"><X /></Button></DialogClose>
      </DialogContent>
    </Dialog>
    <p role="status">{status}</p>
    <Button disabled type="button">Editing unavailable</Button>
  </div>;
}

export function DropdownMenuUsage() {
  const [checked, setChecked] = useState<boolean | "indeterminate">("indeterminate"), [sort, setSort] = useState("recent"), [status, setStatus] = useState("");
  return <div className="grid gap-4">
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button type="button" variant="outline">Workspace actions</Button></DropdownMenuTrigger>
      <DropdownMenuContent className="max-w-[calc(100vw-2rem)]">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuGroup><DropdownMenuItem onSelect={() => setStatus("Reference copied. (Example)")}>Copy reference<DropdownMenuShortcut aria-hidden="true">⌘C</DropdownMenuShortcut></DropdownMenuItem>
          <DropdownMenuItem disabled>Archive unavailable</DropdownMenuItem></DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem checked={checked} onCheckedChange={setChecked}>Show completed</DropdownMenuCheckboxItem>
        <DropdownMenuRadioGroup value={sort} onValueChange={setSort}>
          <DropdownMenuRadioItem value="recent">Recent first</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="name">Name first</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSub><DropdownMenuSubTrigger>More actions</DropdownMenuSubTrigger>
          <DropdownMenuPortal><DropdownMenuSubContent className="max-w-[calc(100vw-2rem)]">
            <DropdownMenuItem onSelect={() => setStatus("Export prepared. (Example)")}>Export details</DropdownMenuItem>
          </DropdownMenuSubContent></DropdownMenuPortal>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        {localized.map(([lang, label]) => <DropdownMenuItem key={lang} lang={lang} onSelect={() => setStatus(label)}>{label}</DropdownMenuItem>)}
        <DropdownMenuItem variant="destructive" onSelect={() => setStatus("Deletion requires confirmation in your app.")}>Delete…</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    <p role="status">{status}</p><p>Sort: {sort}; completed: {String(checked)}</p>
  </div>;
}

export function BadgeUsage() {
  return <div className="grid w-full max-w-xl gap-6">
    <div className="flex flex-wrap gap-3">{(["default", "secondary", "outline", "destructive", "success", "warning", "error", "info"] as const).map(variant =>
      <Badge key={variant} variant={variant}>{variant}</Badge>)}</div>
    <p role="status"><Badge variant="warning">Review required</Badge> Check the project before publishing.</p>
    {localized.map(([lang, label]) => <Badge key={lang} lang={lang} variant="info" className="max-w-full whitespace-normal break-words">{label}</Badge>)}
    <Badge asChild variant="outline"><a href="#badge-details">View activity</a></Badge>
    <p id="badge-details">Use text to explain status; a badge does not register announcements by itself.</p>
  </div>;
}

// Consumer-owned original geometric sample, not a website/brand asset.
const portrait = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="#e5e5e5"/><circle cx="20" cy="15" r="6" fill="#292929"/><path d="M8 36a12 12 0 0 1 24 0" fill="#292929"/></svg>')}`;
export function AvatarUsage() {
  return <div className="grid gap-6">
    <div className="flex items-center gap-3"><Avatar size="lg"><AvatarImage src={portrait} alt="" />
      <AvatarFallback aria-hidden="true">AL</AvatarFallback><AvatarBadge aria-label="Available" role="img" /></Avatar><span>Alex Lee — available</span></div>
    <div className="flex items-center gap-3"><Avatar><AvatarImage src="data:image/png;base64,broken" alt="" /><AvatarFallback aria-hidden="true">KM</AvatarFallback></Avatar><span>김민서 — image unavailable</span></div>
    <AvatarGroup aria-label="Team members"><Avatar><AvatarFallback role="img" aria-label="Alex Lee">AL</AvatarFallback></Avatar>
      <Avatar size="sm"><AvatarFallback role="img" aria-label="田中 遥">田</AvatarFallback></Avatar>
      <AvatarGroupCount aria-label="3 additional members">+3</AvatarGroupCount></AvatarGroup>
    {localized.map(([lang, label]) => <div key={lang} lang={lang} className="flex items-center gap-3"><Avatar><AvatarFallback aria-hidden="true">N</AvatarFallback></Avatar><p className="min-w-0 break-words">{label}</p></div>)}
  </div>;
}

export function ToasterUsage() {
  useEffect(() => () => { toast.dismiss(); }, []);
  const [loadingId, setLoadingId] = useState<string | number>();
  return <div className="grid w-full max-w-xl gap-6">
    <div className="flex flex-wrap gap-3">
      <Button type="button" onClick={() => toast.success("Settings saved.", { action: { label: "Undo", onClick: () => toast.info("Change undone.") } })}>Show success</Button>
      <Button type="button" variant="outline" onClick={() => toast.error("Could not save. Your input is preserved; retry on this page.")}>Show error</Button>
      <Button type="button" variant="outline" onClick={() => toast.warning("Review changes before continuing.")}>Show warning</Button>
      <Button type="button" variant="outline" disabled={loadingId !== undefined} onClick={() => setLoadingId(toast.loading("Saving workspace…"))}>Start loading</Button>
      <Button type="button" variant="outline" disabled={loadingId === undefined} onClick={() => {
        toast.success("Workspace saved.", { id: loadingId }); setLoadingId(undefined);
      }}>Finish loading</Button>
      {localized.map(([lang, label]) => <Button key={lang} type="button" lang={lang} variant="secondary"
        className="h-auto min-h-11 w-full max-w-full whitespace-normal py-2" onClick={() => toast.info(<span lang={lang}>{label}</span>)}>{label}</Button>)}
    </div>
    <p>Alt+T focuses notifications. Persistent errors belong beside the affected form.</p>
    <Toaster closeButton duration={10000} containerAriaLabel="Notifications" toastOptions={{ closeButtonAriaLabel: "Dismiss notification" }} />
  </div>;
}

export function SelectUsage() {
  const prefix = useId(), [value, setValue] = useState(""), [state, setState] = useState("normal"), [submitted, setSubmitted] = useState(""), [invalid, setInvalid] = useState(false);
  return <form noValidate className="grid w-full max-w-xl gap-5" onSubmit={event => { event.preventDefault(); setInvalid(!value); setSubmitted(value ? String(new FormData(event.currentTarget).get("language")) : "Choose a language."); }}>
    <label htmlFor={`${prefix}-language`}>Language</label>
    <Select name="language" value={value} onValueChange={next => { setValue(next); setInvalid(false); }} disabled={state !== "normal"}>
      <SelectTrigger id={`${prefix}-language`} aria-invalid={invalid} aria-describedby={`${prefix}-help`}>
        <SelectValue placeholder="Choose language" /></SelectTrigger>
      <SelectContent><SelectGroup><SelectLabel>Available languages</SelectLabel>
        <SelectItem value="ko">한국어</SelectItem><SelectItem value="en">English</SelectItem><SelectItem value="ja">日本語</SelectItem>
        <SelectItem value="unavailable" disabled>Unavailable language</SelectItem>
      </SelectGroup><SelectSeparator />
        {localized.map(([lang, label]) => <SelectItem key={lang} lang={lang} value={`long-${lang}`}>{label}</SelectItem>)}
      </SelectContent>
    </Select>
    <p id={`${prefix}-help`} role="status">{state === "normal" ? "Choose one value. Options are example data." : state === "loading" ? "Loading languages…" : "No languages available. Retry to restore the example."}</p>
    <div className="flex flex-wrap gap-3"><Button type="submit">Submit value</Button><Button type="button" variant="outline" onClick={() => { setValue(""); setSubmitted(""); }}>Clear</Button>
      <Button type="button" variant="outline" onClick={() => setState("loading")}>Loading options</Button>
      <Button type="button" variant="outline" onClick={() => setState("empty")}>Empty options</Button>
      <Button type="button" variant="outline" onClick={() => setState("normal")}>Retry options</Button></div>
    <output aria-live="polite">{submitted ? `Submitted: ${submitted}` : ""}</output>
  </form>;
}

export function SwitchUsage() {
  const prefix = useId(), [checked, setChecked] = useState(false), [saved, setSaved] = useState("");
  return <form className="grid w-full max-w-xl gap-6" onSubmit={event => { event.preventDefault(); setSaved(new FormData(event.currentTarget).has("summary") ? "Summary enabled." : "Summary disabled."); }}>
    <div className="ui-choice-label"><Switch id={`${prefix}-summary`} name="summary" checked={checked} onCheckedChange={setChecked} /><label htmlFor={`${prefix}-summary`}>Weekly summary</label></div>
    <label className="ui-choice-label"><Switch disabled defaultChecked />Managed preference (unavailable)</label>
    {localized.map(([lang, label]) => <label key={lang} lang={lang} className="ui-choice-label"><Switch />{label}</label>)}
    <p>Changes apply when you save.</p><Button type="submit">Save preferences</Button><p role="status">{saved}</p>
  </form>;
}

export function CheckboxUsage() {
  const [selected, setSelected] = useState([true, false]), [submitted, setSubmitted] = useState("");
  const checked = selected.every(Boolean) ? true : selected.some(Boolean) ? "indeterminate" : false;
  return <form className="grid w-full max-w-xl gap-6" onSubmit={event => { event.preventDefault(); setSubmitted(new FormData(event.currentTarget).getAll("channel").join(", ") || "none"); }}>
    <fieldset className="grid gap-3"><legend className="mb-3 font-medium">Notification channels</legend>
      <label className="ui-choice-label"><Checkbox checked={checked} onCheckedChange={value => setSelected([value === true, value === true])} />Select all channels</label>
      {["Email", "Desktop"].map((label, index) => <label key={label} className="ui-choice-label"><Checkbox name="channel" value={label.toLowerCase()} checked={selected[index]}
        onCheckedChange={value => setSelected(values => values.map((entry, i) => i === index ? value === true : entry))} />{label}</label>)}
      <label className="ui-choice-label"><Checkbox disabled name="channel" value="managed" defaultChecked />Managed channel (unavailable)</label>
    </fieldset>
    {localized.map(([lang, label]) => <label key={lang} lang={lang} className="ui-choice-label"><Checkbox />{label}</label>)}
    <Button type="submit">Save channels</Button><output aria-live="polite">{submitted ? `Submitted: ${submitted}` : ""}</output>
  </form>;
}

export function CheckboxRequiredUsage() {
  const prefix = useId(), [accepted, setAccepted] = useState(false), [invalid, setInvalid] = useState(false), [saving, setSaving] = useState(false), [status, setStatus] = useState("");
  return <form noValidate className="grid w-full max-w-xl gap-5" onSubmit={event => {
    event.preventDefault(); setInvalid(!accepted);
    if (!accepted) { event.currentTarget.querySelector<HTMLButtonElement>('[role="checkbox"]')?.focus(); return; }
    setSaving(true); setStatus("Confirming consent…");
    setTimeout(() => { setSaving(false); setStatus("Consent confirmed. (Example)"); }, 650);
  }}>
    <label className="ui-choice-label"><Checkbox required name="consent" checked={accepted} onCheckedChange={value => { setAccepted(value === true); setInvalid(false); }}
      aria-invalid={invalid} aria-describedby={`${prefix}-error`} />I agree to the terms</label>
    <p id={`${prefix}-error`} role="alert" className="text-error">{invalid ? "Agree to the terms before continuing." : ""}</p>
    <Button type="submit" disabled={saving} aria-busy={saving}>{saving ? "Confirming…" : "Confirm consent"}</Button>
    <p role="status">{status}</p>
  </form>;
}

export function OverlayResilienceUsage() {
  const [menu, setMenu] = useState(false), [mode, setMode] = useState(true), [mount, setMount] = useState(true);
  const [events, setEvents] = useState<string[]>([]), [reference, setReference] = useState("none");
  const contentRef = useMemoRef(setReference);
  return <div className="grid max-w-xl gap-5">
    <Button type="button" onClick={() => setMode(value => !value)}>{mode ? "Use nonmodal menu" : "Use modal menu"}</Button>
    <Button type="button" onClick={() => setMount(value => !value)}>{mount ? "Unmount menu" : "Mount menu"}</Button>
    <Button type="button">Background action</Button>
    <div inert data-testid="preexisting-inert"><Button type="button">Previously inert action</Button></div>
    {mount && <DropdownMenu modal={mode} open={menu} onOpenChange={setMenu}>
      <DropdownMenuTrigger asChild><Button type="button">Resilience actions</Button></DropdownMenuTrigger>
      <DropdownMenuContent ref={contentRef} onCloseAutoFocus={() => setEvents(values => [...values, "menu close handler"])}>
        <DropdownMenuItem onSelect={event => event.preventDefault()}>Keep open</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>}
    <Dialog><DialogTrigger asChild><Button type="button">Open nested dialog</Button></DialogTrigger>
      <DialogContent onOpenAutoFocus={() => setEvents(values => [...values, "dialog open handler"])}>
        <DialogHeader><DialogTitle>Nested value selection</DialogTitle><DialogDescription>Choose a value without losing modal focus.</DialogDescription></DialogHeader>
        <label htmlFor="nested-language">Nested language</label>
        <Select defaultValue="en"><SelectTrigger id="nested-language"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="en">English</SelectItem><SelectItem value="ja">日本語</SelectItem></SelectContent></Select>
        <DialogClose asChild><Button type="button">Close nested dialog</Button></DialogClose>
      </DialogContent>
    </Dialog>
    <p data-testid="overlay-ref">Consumer ref: {reference}</p><p data-testid="overlay-events">{events.join(", ")}</p>
  </div>;
}
function useMemoRef(setReference: (value: string) => void) {
  return useCallback((node: HTMLDivElement | null) => {
    if (!node) { setReference("cleared"); return; }
    setReference(node.dataset.slot || "mounted");
    return () => setReference("cleanup");
  }, [setReference]);
}
