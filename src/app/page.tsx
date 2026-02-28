import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-4xl font-bold">naeil-ui</h1>
      <p className="text-muted-foreground">
        개인 디자인 시스템 — Pretendard Variable 폰트 적용 확인
      </p>
      <div className="flex gap-3">
        <Button>기본 버튼</Button>
        <Button variant="secondary">보조 버튼</Button>
        <Button variant="outline">외곽선 버튼</Button>
        <Button variant="destructive">위험 버튼</Button>
        <Button variant="ghost">고스트 버튼</Button>
      </div>
      <p className="font-mono text-sm text-muted-foreground">
        const mono = &quot;JetBrains Mono&quot;;
      </p>
    </main>
  );
}
