import React from "react";
import { createRoot } from "react-dom/client";
import { NaeilServiceShell, PageHeader } from "@naeil/ui/naeil-shell";

const query = new URLSearchParams(location.search);
const locale = query.get("locale") === "ja" ? "ja" : query.get("locale") === "ko" ? "ko" : "en";
document.documentElement.lang = locale;
const text = {
  ko: { title: "화면 틀", description: "짧은 페이지와 긴 페이지의 공통 틀입니다.", body: "저장한 내용이 여기에 표시됩니다." },
  ja: { title: "画面の枠", description: "短いページと長いページの共通の枠です。", body: "保存した内容がここに表示されます。" },
  en: { title: "Screen frame", description: "The shared frame for short and long pages.", body: "Your saved content appears here." },
}[locale];
const count = query.has("long") ? 60 : 1;
createRoot(document.getElementById("root")!).render(<NaeilServiceShell service="estimate" locale={locale}
  header={{ currentHref: "/estimates" }} account={{ status: "signed-out", loginHref: "/login" }}
  footer={query.has("noFooter") ? false : undefined}>
  <PageHeader title={text.title} description={text.description} />
  <section data-shell-content>
    {Array.from({ length: count }, (_, i) => <p key={i}>{text.body}</p>)}
    <p data-font-latin>Tomorrow starts here. ABC 123 café</p>
    {locale === "ja" && <p data-font-japanese>日本語の見積、カタカナ。</p>}
  </section>
</NaeilServiceShell>);
