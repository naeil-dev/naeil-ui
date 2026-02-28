import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { AccentPicker } from "@/components/accent-picker";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <h1 className="text-4xl font-bold">naeil-ui</h1>
      <p className="text-muted-foreground">
        개인 디자인 시스템 — Pretendard Variable 폰트 적용 확인
      </p>

      {/* Theme toggle */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">테마:</span>
        <ThemeToggle />
      </div>

      {/* Button variants */}
      <div className="flex flex-wrap gap-3">
        <Button>기본 버튼</Button>
        <Button variant="secondary">보조 버튼</Button>
        <Button variant="outline">외곽선 버튼</Button>
        <Button variant="destructive">위험 버튼</Button>
        <Button variant="ghost">고스트 버튼</Button>
      </div>

      {/* Accent override demo */}
      <div className="flex flex-col items-center gap-3">
        <span className="text-sm text-muted-foreground">악센트 오버라이드:</span>
        <AccentPicker />
      </div>

      {/* Semantic tokens demo */}
      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div className="rounded-md bg-background p-3 text-foreground border">
          background
        </div>
        <div className="rounded-md bg-card p-3 text-card-foreground border">
          card
        </div>
        <div className="rounded-md bg-muted p-3 text-muted-foreground">
          muted
        </div>
        <div className="rounded-md bg-accent p-3 text-accent-foreground">
          accent
        </div>
        <div className="rounded-md bg-primary p-3 text-primary-foreground">
          primary
        </div>
        <div className="rounded-md bg-secondary p-3 text-secondary-foreground">
          secondary
        </div>
        <div className="rounded-md bg-destructive p-3 text-destructive-foreground">
          destructive
        </div>
        <div className="rounded-md bg-popover p-3 text-popover-foreground border">
          popover
        </div>
      </div>

      <p className="font-mono text-sm text-muted-foreground">
        const mono = &quot;JetBrains Mono&quot;;
      </p>
    </main>
  );
}
