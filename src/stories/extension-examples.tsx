"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { Button, Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
  Tabs, TabsList, TabsTrigger, TabsContent, Textarea } from "../components/ui";
import { localized } from "./component-examples";

export function TabsUsage() {
  const [selected, setSelected] = useState("profile");
  const [retained, setRetained] = useState("draft");
  return <div className="grid min-w-0 w-full max-w-xl gap-6">
    <Tabs defaultValue="overview">
      <TabsList aria-label="Workspace details">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="unavailable" disabled>Unavailable</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="grid gap-2">
        <p>Overview content. Inactive panel children unmount by default.</p>
        <label className="grid gap-2">Temporary panel draft<Input defaultValue="Initial draft" /></label>
      </TabsContent>
      <TabsContent value="history"><p>No history yet. (Example)</p></TabsContent>
    </Tabs>
    <Tabs value={selected} onValueChange={setSelected} activationMode="manual" orientation="vertical">
      <TabsList aria-label="Manual preferences" loop={false}>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="alerts">Alerts</TabsTrigger>
      </TabsList>
      <TabsContent value="profile"><p>Profile preferences. Arrow keys move focus; Enter or Space activates.</p></TabsContent>
      <TabsContent value="alerts"><p>Alert preferences.</p></TabsContent>
    </Tabs>
    <Tabs defaultValue="ko">
      <TabsList aria-label="Localized sections">
        {localized.map(([lang, text]) => <TabsTrigger key={lang} value={lang} lang={lang}>{text}</TabsTrigger>)}
      </TabsList>
      {localized.map(([lang, text]) => <TabsContent key={lang} value={lang}><p lang={lang} className="break-words">{text}</p></TabsContent>)}
    </Tabs>
    <Tabs value={retained} onValueChange={setRetained}>
      <TabsList aria-label="Retained panels">
        <TabsTrigger value="draft">Draft</TabsTrigger>
        <TabsTrigger value="preview">Preview</TabsTrigger>
      </TabsList>
      <TabsContent value="draft" forceMount hidden={retained !== "draft"}>
        <label className="grid gap-2">Retained panel draft<Input defaultValue="Keep this draft" /></label>
      </TabsContent>
      <TabsContent value="preview" forceMount hidden={retained !== "preview"}><p>Consumer-owned hidden state retains drafts.</p></TabsContent>
    </Tabs>
  </div>;
}

export function TextareaUsage() {
  const prefix = useId(), notes = useRef<HTMLTextAreaElement>(null);
  const [invalid, setInvalid] = useState(false), [saving, setSaving] = useState(false), [status, setStatus] = useState("");
  const [pinned, setPinned] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const control = notes.current!;
    setInvalid(!control.validity.valid);
    if (!control.validity.valid) { control.focus(); return; }
    const values = new FormData(event.currentTarget);
    setSaving(true); setStatus("Saving notes…");
    setTimeout(() => { setSaving(false); setStatus(`Saved ${values.get("delivery")} / ${values.get("language")}. (Example)`); }, 650);
  }
  return <form noValidate onSubmit={submit} className="grid w-full min-w-0 max-w-xl gap-6">
    <div className="grid gap-2">
      <label htmlFor={`${prefix}-notes`}>Workspace notes</label>
      <Textarea ref={notes} id={`${prefix}-notes`} name="notes" required maxLength={200}
        placeholder="Describe the workspace" aria-invalid={invalid}
        aria-describedby={`${prefix}-help ${prefix}-error`} onChange={() => { setInvalid(false); setStatus(""); }} />
      <p id={`${prefix}-help`} className="text-sm text-muted-foreground">Up to 200 characters. Enter inserts a new line.</p>
      <p id={`${prefix}-error`} role="alert" className="text-sm text-error">{invalid ? "Enter workspace notes before saving." : ""}</p>
    </div>
    <label className="grid gap-2">Read-only notes<Textarea name="reference" readOnly value={"Reference notes\nKeep this value"} /></label>
    <label className="grid gap-2">Unavailable notes<Textarea name="unavailable" disabled defaultValue="Managed by your team" /></label>
    <label className="grid gap-2">Four-row notes<Textarea rows={4} defaultValue="Consumer chooses rows and resizing." className="resize-none" /></label>
    <fieldset className="grid gap-2">
      <legend className="mb-2 font-medium">Delivery channel</legend>
      <label className="ui-choice-label"><input type="radio" name="delivery" value="instant" defaultChecked required className="ui-focus accent-primary" />Instant delivery</label>
      <label className="ui-choice-label"><input type="radio" name="delivery" value="digest" className="ui-focus accent-primary" />Daily digest</label>
    </fieldset>
    <div className="grid gap-2">
      <label htmlFor={`${prefix}-language`}>Language</label>
      <Select name="language" defaultValue="en">
        <SelectTrigger id={`${prefix}-language`}><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="en">English</SelectItem><SelectItem value="ko">한국어</SelectItem><SelectItem value="ja">日本語</SelectItem></SelectContent>
      </Select>
    </div>
    <div className="flex flex-wrap gap-3">
      <Button type="button" variant="outline" aria-pressed={pinned} onClick={() => setPinned(!pinned)}>Pin preview</Button>
      <Button type="button" variant="outline" onClick={() => { if (notes.current) notes.current.value = ""; setInvalid(false); setStatus(""); }}>Clear draft</Button>
      <Button type="submit" disabled={saving} aria-busy={saving}>{saving ? "Saving…" : "Save notes"}</Button>
    </div>
    <p role="status">{status}</p>
    {localized.map(([lang, text]) => <label key={lang} lang={lang} className="grid gap-2">{text}<Textarea readOnly defaultValue={`${text}\n${text}`} /></label>)}
  </form>;
}
