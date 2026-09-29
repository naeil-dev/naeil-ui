"use client";
import { useEffect, useState, type FormEvent } from "react";
import { ThemeProvider, useTheme } from "next-themes";
import { toast } from "sonner";
import { MoreHorizontal, Plus } from "lucide-react";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Avatar,
  AvatarFallback,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Switch,
  Checkbox,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Toaster,
} from "../components/ui";

function Settings() {
  const [invalid, setInvalid] = useState(false),
    [saving, setSaving] = useState(false),
    [status, setStatus] = useState(""),
    [submitted, setSubmitted] = useState("");
  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      input = form.elements.namedItem("email") as HTMLInputElement;
    setInvalid(!input.validity.valid);
    if (!input.validity.valid) {
      input.focus();
      return;
    }
    const value = JSON.stringify(Object.fromEntries(new FormData(form)));
    setSaving(true);
    setStatus("저장 중…");
    setTimeout(() => {
      setSaving(false);
      setSubmitted(value);
      setStatus("설정을 저장했습니다. (예시)");
      toast.success("설정을 저장했습니다.");
    }, 650);
  }
  return (
    <section data-ui-layout="settings" aria-labelledby="settings-title">
      <form onSubmit={save} noValidate>
        <Card>
          <CardHeader>
            <CardTitle id="settings-title">워크스페이스 설정</CardTitle>
            <CardDescription>
              팀의 기본 정보와 알림 환경을 관리합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-(--ui-field-gap)">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>N</AvatarFallback>
              </Avatar>
              <span>Naeil workspace</span>
            </div>
            <div className="space-y-2">
              <label htmlFor="workspace-name">워크스페이스 이름</label>
              <Input
                id="workspace-name"
                name="workspace"
                defaultValue="Naeil workspace"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="notification-email">알림 이메일</label>
              <Input
                id="notification-email"
                name="email"
                type="email"
                required
                defaultValue="team@naeil.dev"
                aria-invalid={invalid}
                aria-describedby="email-help email-error"
                onChange={() => setInvalid(false)}
              />
              <p id="email-help" className="text-sm text-muted-foreground">
                중요한 업데이트를 이 주소로 보내드립니다.
              </p>
              <p id="email-error" role="alert" className="text-sm text-error">
                {invalid ? "올바른 이메일 주소를 입력해 주세요." : ""}
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="language">언어</label>
              <Select name="language" defaultValue="ko">
                <SelectTrigger id="language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ko">한국어</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ja">日本語</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex min-h-11 items-center justify-between gap-6">
              <label htmlFor="weekly">주간 요약</label>
              <Switch id="weekly" name="weekly" defaultChecked />
            </div>
            <label className="ui-choice-label">
              <Checkbox name="emailNotifications" />
              이메일 알림
            </label>
          </CardContent>
          <CardFooter className="flex flex-wrap justify-between gap-4 border-t pt-5">
            <p
              data-testid="save-status"
              role="status"
              className="text-sm text-muted-foreground"
            >
              {status || "설정은 이 예시에서만 유지됩니다."}
            </p>
            <Button type="submit" disabled={saving} aria-busy={saving}>
              {saving ? "저장 중…" : "변경사항 저장"}
            </Button>
          </CardFooter>
        </Card>
      </form>
      <output data-testid="submitted" className="sr-only">
        {submitted}
      </output>
    </section>
  );
}

function Tasks() {
  const [scenario, setScenario] = useState("normal"),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState("팀 워크스페이스 설정"),
    [open, setOpen] = useState(false);
  const [tasks, setTasks] = useState([
    "팀 워크스페이스 설정",
    "주간 리포트 정리",
    "새로운 멤버의 초대 및 참여 흐름 검토",
    "通知設定を確認する · 알림 설정 검토",
    "Review project organization and ownership",
  ]);
  const filtered = tasks.filter((t) =>
    t.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <section
      data-ui-layout="list"
      aria-labelledby="tasks-title"
      className="space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="tasks-title" className="text-xl font-semibold">
          목록과 상세
        </h2>
        <div
          role="group"
          aria-label="상태 예시"
          className="flex flex-wrap gap-2"
        >
          {[
            ["normal", "정상 상태"],
            ["loading", "로딩 상태"],
            ["empty", "빈 화면"],
            ["error", "오류 상태"],
          ].map(([value, label]) => (
            <Button
              key={value}
              variant="ghost"
              aria-pressed={scenario === value}
              onClick={() => setScenario(value)}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>
      <Card className="gap-0 overflow-hidden py-0">
        <div className="flex items-center justify-between border-b p-5">
          <h3 className="font-semibold">이번 주 작업</h3>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus />새 작업
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>새 작업 만들기</DialogTitle>
                <DialogDescription>
                  이번 주에 진행할 작업을 추가합니다.
                </DialogDescription>
              </DialogHeader>
              <form
                className="space-y-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  const title = String(
                    new FormData(e.currentTarget).get("title"),
                  ).trim();
                  if (!title) return;
                  setTasks((t) => [...t, title]);
                  setSelected(title);
                  setQuery("");
                  setScenario("normal");
                  setOpen(false);
                  toast.success("작업을 추가했습니다.");
                }}
              >
                <div className="space-y-2">
                  <label htmlFor="new-task-title">작업 이름</label>
                  <Input
                    id="new-task-title"
                    name="title"
                    required
                    maxLength={160}
                  />
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      취소
                    </Button>
                  </DialogClose>
                  <Button type="submit">작업 만들기</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
        {scenario === "normal" ? (
          <div className="grid md:grid-cols-[minmax(0,1fr)_300px]">
            <div>
              <div className="border-b p-4">
                <label htmlFor="search" className="sr-only">
                  작업 검색
                </label>
                <Input
                  id="search"
                  placeholder="작업 검색…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div role="group" aria-label="작업 선택">
                {filtered.map((title, i) => (
                  <button
                    type="button"
                    key={title}
                    aria-pressed={selected === title}
                    onClick={() => setSelected(title)}
                    className="ui-focus flex min-h-(--ui-row-height) w-full items-center justify-between gap-3 border-b border-l-2 border-l-transparent px-5 py-3 text-left transition-colors duration-(--ui-motion-fast) hover:bg-surface-subtle aria-pressed:border-l-foreground aria-pressed:bg-surface-selected"
                  >
                    <span className="min-w-0 break-words">
                      <span>{title}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">
                        N-{24 + i} · 워크스페이스
                      </span>
                    </span>
                    <Badge variant={i === 1 ? "success" : "secondary"}>
                      {i === 1 ? "완료" : "진행 중"}
                    </Badge>
                  </button>
                ))}
              </div>
              {!filtered.length && (
                <p
                  role="status"
                  className="p-8 text-center text-muted-foreground"
                >
                  검색 결과가 없습니다.
                </p>
              )}
            </div>
            <aside
              aria-label="선택한 작업"
              className="space-y-5 border-t bg-background p-6 md:border-t-0 md:border-l"
            >
              <div className="flex items-center justify-between">
                <Badge variant="secondary">선택한 작업</Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="작업 메뉴">
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() => toast("작업 번호: N-024")}
                    >
                      작업 번호 복사
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled>
                      보관함으로 이동
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <h3 className="text-xl leading-normal font-semibold break-words">
                {selected}
              </h3>
              <p className="text-sm text-muted-foreground">
                필요한 정보를 한곳에 정리하고 다음 행동을 확인합니다.
              </p>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">담당자</dt>
                  <dd>Jay</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">마감일</dt>
                  <dd>10월 2일</dd>
                </div>
              </dl>
              <label className="ui-choice-label text-sm">
                <Checkbox defaultChecked />
                기본 정보 설정
              </label>
              <label className="ui-choice-label text-sm">
                <Checkbox />
                알림 환경 검토
              </label>
            </aside>
          </div>
        ) : (
          <div className="space-y-4 px-6 py-16 text-center">
            <div role="status">
              <h3
                className={
                  scenario === "error"
                    ? "text-xl font-semibold text-error"
                    : "text-xl font-semibold"
                }
              >
                {scenario === "loading"
                  ? "작업을 불러오는 중…"
                  : scenario === "empty"
                    ? "아직 등록된 작업이 없습니다."
                    : "작업을 불러오지 못했습니다."}
              </h3>
              <p className="mt-3 text-sm text-muted-foreground">
                {scenario === "loading"
                  ? "예시 화면에서는 정상 상태 버튼으로 돌아갈 수 있습니다."
                  : scenario === "empty"
                    ? "첫 작업을 추가하고 팀의 진행 상황을 정리해 보세요."
                    : "입력 내용은 유지됩니다. 잠시 후 다시 시도해 주세요."}
              </p>
            </div>
            {scenario === "error" && (
              <Button variant="outline" onClick={() => setScenario("normal")}>
                다시 불러오기
              </Button>
            )}
            {scenario === "empty" && (
              <Button onClick={() => setOpen(true)}>첫 작업 만들기</Button>
            )}
          </div>
        )}
      </Card>
    </section>
  );
}

function Workspace() {
  const { setTheme } = useTheme();
  const [density, setDensity] = useState("comfortable");
  useEffect(() => {
    document.documentElement.dataset.uiDensity = density;
    return () => {
      delete document.documentElement.dataset.uiDensity;
    };
  }, [density]);
  return (
    <main
      id="ui-v2-demo"
      className="mx-auto w-full max-w-[1272px] space-y-10 px-4 py-8 text-base sm:px-9"
    >
      <header className="space-y-5 border-b pb-6">
        <p className="text-sm text-muted-foreground">
          naeil / 공통 디자인 시스템 · 실제 컴포넌트
        </p>
        <h1 className="text-3xl font-semibold">공통 UI v2</h1>
        <p className="text-muted-foreground">
          무채색, 읽기 편한 글씨, 용도에 맞는 폭. 예시 데이터는 새로고침하면
          초기화됩니다.
        </p>
        <div className="flex flex-wrap gap-3">
          <div role="group" aria-label="테마" className="flex gap-2">
            <Button variant="outline" onClick={() => setTheme("light")}>
              라이트
            </Button>
            <Button variant="outline" onClick={() => setTheme("dark")}>
              다크
            </Button>
          </div>
          <div role="group" aria-label="밀도" className="flex gap-2">
            <Button
              variant="secondary"
              aria-pressed={density === "comfortable"}
              onClick={() => setDensity("comfortable")}
            >
              기본
            </Button>
            <Button
              variant="secondary"
              aria-pressed={density === "compact"}
              onClick={() => setDensity("compact")}
            >
              촘촘하게
            </Button>
          </div>
        </div>
      </header>
      <Settings />
      <Tasks />
      <section
        data-ui-layout="reading"
        aria-labelledby="reading-title"
        className="space-y-4"
      >
        <h2 id="reading-title" className="text-xl font-semibold">
          팀과 함께 일하는 작은 원칙
        </h2>
        <p>
          좋은 도구는 해야 할 일을 쉽게 찾게 해줍니다. 오늘의 작업과 다음에 할
          일을 나누고, 필요한 정보가 가까이에 있도록 정리해 보세요. 화면이
          넓다고 해서 문장까지 끝없이 길어질 필요는 없습니다.
        </p>
        <p lang="en">
          Keep your team’s work clear and organized. Describe the context and
          the result you expect, so a new teammate can understand the next step.
        </p>
        <p lang="ja">
          チームの作業を整理して、次の一歩を確認しましょう。必要な情報を読みやすくまとめることで、安心して作業を進められます。
        </p>
      </section>
      <section
        aria-labelledby="states-title"
        className="space-y-5 border-t pt-6"
      >
        <h2 id="states-title" className="text-xl font-semibold">
          상태와 기본 요소
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <Badge variant="success">완료</Badge>
          <Badge variant="warning">검토 필요</Badge>
          <Badge variant="error">오류</Badge>
          <Badge variant="info">안내</Badge>
          <Button disabled>비활성</Button>
          <Button
            variant="destructive"
            onClick={() => toast.error("삭제 동작의 스타일 예시입니다.")}
          >
            삭제 예시
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-8">
          <label className="ui-choice-label">
            <Checkbox checked="indeterminate" />
            일부 선택 예시
          </label>
          <label className="ui-choice-label">
            <Switch disabled />
            비활성 예시
          </label>
        </div>
      </section>
      <Toaster />
    </main>
  );
}
export function UiV2Demo() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <Workspace />
    </ThemeProvider>
  );
}
