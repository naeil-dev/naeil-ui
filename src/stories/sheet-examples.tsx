"use client";

import { Button, Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from "../components/ui";
import { localized } from "./component-examples";

const labels = {
  ko: { trigger: "근거 보기", title: "근거", description: "보고서에 사용한 자료를 확인합니다.", close: "닫기" },
  ja: { trigger: "根拠を表示", title: "根拠", description: "レポートに使った資料を確認します。", close: "閉じる" },
  en: { trigger: "View evidence", title: "Evidence", description: "Review the sources used in this report.", close: "Close" },
};

export function SheetLocalizedClose() {
  return <div className="flex flex-wrap gap-3">
    {Object.entries(labels).map(([locale, text]) => <Sheet key={locale}>
      <SheetTrigger asChild><Button lang={locale} type="button">{text.trigger}</Button></SheetTrigger>
      <SheetContent closeLabel={text.close} lang={locale}>
        <SheetHeader><SheetTitle>{text.title}</SheetTitle><SheetDescription>{text.description}</SheetDescription></SheetHeader>
        <p>{localized.find(([lang]) => lang === locale)?.[1]}</p>
      </SheetContent>
    </Sheet>)}
  </div>;
}

export function SheetUsage() {
  return <Sheet>
    <SheetTrigger asChild><Button type="button">View evidence</Button></SheetTrigger>
    <SheetContent closeLabel="Close" lang="en">
      <SheetHeader><SheetTitle>Evidence</SheetTitle><SheetDescription>Review the sources used in this report.</SheetDescription></SheetHeader>
      {localized.map(([lang, text]) => <p key={lang} lang={lang}>{text}</p>)}
    </SheetContent>
  </Sheet>;
}

export function SheetSides() {
  return <div className="flex flex-wrap gap-3">
    {(["right", "left", "top", "bottom"] as const).map(side => <Sheet key={side}>
      <SheetTrigger asChild><Button type="button">Open {side} sheet</Button></SheetTrigger>
      <SheetContent side={side} showCloseButton={false}>
        <SheetHeader><SheetTitle>Evidence — {side}</SheetTitle><SheetDescription>Long evidence stays inside the viewport.</SheetDescription></SheetHeader>
        {Array.from({ length: 12 }, (_, index) => <p key={index}>{index + 1}. {localized[index % localized.length][1]}</p>)}
        <SheetFooter><SheetClose asChild><Button type="button" variant="outline">Close evidence</Button></SheetClose></SheetFooter>
      </SheetContent>
    </Sheet>)}
  </div>;
}
