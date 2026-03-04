"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardElevated,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarBadge,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar";
import { AccentPicker } from "@/components/accent-picker";
import {
  PageTitle,
  SectionTitle,
  pageTitleClass,
  sectionTitleClass,
} from "@/components/typography";
import { toast } from "sonner";

/* ─── Token Data (for showcase display) ─── */

const GRAY_SCALE = [
  { step: "50", oklch: "oklch(0.985 0 0)" },
  { step: "100", oklch: "oklch(0.970 0 0)" },
  { step: "200", oklch: "oklch(0.922 0 0)" },
  { step: "300", oklch: "oklch(0.870 0 0)" },
  { step: "400", oklch: "oklch(0.708 0 0)" },
  { step: "500", oklch: "oklch(0.556 0 0)" },
  { step: "600", oklch: "oklch(0.439 0 0)" },
  { step: "700", oklch: "oklch(0.371 0 0)" },
  { step: "800", oklch: "oklch(0.269 0 0)" },
  { step: "900", oklch: "oklch(0.205 0 0)" },
  { step: "950", oklch: "oklch(0.145 0 0)" },
];

const ACCENT_SCALE = [
  { step: "50", oklch: "oklch(0.970 0.014 254)" },
  { step: "100", oklch: "oklch(0.932 0.032 255)" },
  { step: "200", oklch: "oklch(0.882 0.059 254)" },
  { step: "300", oklch: "oklch(0.809 0.105 254)" },
  { step: "400", oklch: "oklch(0.707 0.165 254)" },
  { step: "500", oklch: "oklch(0.623 0.214 259)" },
  { step: "600", oklch: "oklch(0.546 0.245 263)" },
  { step: "700", oklch: "oklch(0.488 0.243 264.376)" },
  { step: "800", oklch: "oklch(0.424 0.199 265)" },
  { step: "900", oklch: "oklch(0.379 0.146 265)" },
  { step: "950", oklch: "oklch(0.282 0.091 267)" },
];

const DESTRUCTIVE_SCALE = [
  { step: "50", oklch: "oklch(0.971 0.013 17)" },
  { step: "100", oklch: "oklch(0.936 0.032 17)" },
  { step: "200", oklch: "oklch(0.885 0.062 18)" },
  { step: "300", oklch: "oklch(0.808 0.114 19)" },
  { step: "400", oklch: "oklch(0.704 0.191 22.216)" },
  { step: "500", oklch: "oklch(0.637 0.237 25)" },
  { step: "600", oklch: "oklch(0.577 0.245 27.325)" },
  { step: "700", oklch: "oklch(0.505 0.213 27)" },
  { step: "800", oklch: "oklch(0.444 0.177 26)" },
  { step: "900", oklch: "oklch(0.396 0.141 25)" },
  { step: "950", oklch: "oklch(0.258 0.092 26)" },
];

const SEMANTIC_TOKENS = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "primary",
  "primary-foreground",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "destructive",
  "destructive-foreground",
  "border",
  "border-subtle",
  "border-subtle-hover",
  "surface-subtle",
  "input",
  "ring",
];

const PROJECT_COLORS = [
  { name: "CC", token: "--project-cc", oklch: "oklch(0.723 0.219 149)" },
  { name: "PKM", token: "--project-pkm", oklch: "oklch(0.627 0.265 303)" },
  { name: "naeil-ui", token: "--project-naeilUi", oklch: "oklch(0.623 0.214 259)" },
  { name: "Baby Agent", token: "--project-baby", oklch: "oklch(0.769 0.188 70.08)" },
];

const TYPE_SIZES = [
  { name: "xs", class: "text-xs" },
  { name: "sm", class: "text-sm" },
  { name: "base", class: "text-base" },
  { name: "lg", class: "text-lg" },
  { name: "xl", class: "text-xl" },
  { name: "2xl", class: "text-2xl" },
  { name: "3xl", class: "text-3xl" },
  { name: "4xl", class: "text-4xl" },
];

const SPACING_STEPS = [
  { name: "0", px: "0" },
  { name: "1", px: "4" },
  { name: "2", px: "8" },
  { name: "3", px: "12" },
  { name: "4", px: "16" },
  { name: "5", px: "20" },
  { name: "6", px: "24" },
  { name: "8", px: "32" },
  { name: "10", px: "40" },
  { name: "12", px: "48" },
  { name: "16", px: "64" },
];

/* ─── Helper Components ─── */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <SectionTitle>{children}</SectionTitle>;
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
      {children}
    </h3>
  );
}

function ColorScale({
  name,
  colors,
}: {
  name: string;
  colors: { step: string; oklch: string }[];
}) {
  return (
    <div className="flex flex-col gap-2">
      <SubHeading>{name}</SubHeading>
      <div className="flex gap-1">
        {colors.map((c) => (
          <div key={c.step} className="flex flex-col items-center gap-1 flex-1">
            <div
              className="w-full aspect-square rounded-md border border-border"
              style={{ backgroundColor: c.oklch }}
            />
            <span className="text-[10px] text-muted-foreground font-mono">
              {c.step}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SemanticTokenGrid() {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
      {SEMANTIC_TOKENS.map((token) => (
        <div key={token} className="flex flex-col items-center gap-1">
          <div
            className="w-full aspect-square rounded-md border border-border"
            style={{ backgroundColor: `var(--${token})` }}
          />
          <span className="text-[10px] text-muted-foreground font-mono text-center leading-tight">
            {token}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── Main Page ─── */

export default function Home() {
  const t = useTranslations("design");

  return (
    <>
      {/* Hero — matches ProjectLayout */}
      <section className="mx-auto max-w-4xl px-6 pb-16">
        <div className="flex flex-col-reverse items-start gap-8 md:flex-row md:items-start md:justify-between">
          <div className="flex-1">
            <PageTitle className="mb-3">{t("title")}</PageTitle>
            <p className="text-muted-foreground mb-5 max-w-lg text-lg leading-relaxed">
              {t("subtitle")}
            </p>
            <div className="mb-6 flex flex-wrap gap-2">
              {["React", "Tailwind v4", "OKLCH", "shadcn/ui"].map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-black/[0.08] px-2.5 py-1 text-[11px] text-zinc-400 dark:border-white/[0.08]"
                >
                  {tag}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href="https://github.com/jaymini1022/design-system"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
                style={{
                  background: "oklch(0.623 0.214 259)",
                  color: "var(--background)",
                }}
              >
                GitHub →
              </a>
            </div>
          </div>
          <div className="flex-shrink-0">
            <Image
              src="/images/whale.png"
              alt=""
              width={220}
              height={220}
              className="animate-float object-contain"
              style={{
                filter: "drop-shadow(0 4px 12px color-mix(in oklch, oklch(0.623 0.214 259) 15%, transparent))",
              }}
            />
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-16 pb-24 max-w-4xl mx-auto px-6">

      {/* ════════════════════════════════════════════
          T45: Accent Demo
          ════════════════════════════════════════════ */}
      <section className="flex flex-col gap-4">
        <SectionHeading>Accent</SectionHeading>
        <p className="text-sm text-muted-foreground">
          프로젝트별 악센트 색상 주입. 아래 프리셋을 선택하면 모든 accent 토큰이 즉시 변경됩니다.
        </p>
        <AccentPicker />
      </section>

      {/* ════════════════════════════════════════════
          T43: Token Showcase
          ════════════════════════════════════════════ */}

      {/* Colors — Primitive */}
      <section className="flex flex-col gap-6">
        <SectionHeading>Colors — Primitive</SectionHeading>
        <ColorScale name="Gray" colors={GRAY_SCALE} />
        <ColorScale name="Accent (Blue default)" colors={ACCENT_SCALE} />
        <ColorScale name="Destructive" colors={DESTRUCTIVE_SCALE} />
      </section>

      {/* Colors — Semantic */}
      <section className="flex flex-col gap-4">
        <SectionHeading>Colors — Semantic</SectionHeading>
        <p className="text-sm text-muted-foreground">
          현재 테마(다크/라이트)에 따라 매핑이 변경됩니다.
        </p>
        <SemanticTokenGrid />
      </section>

      {/* Colors — Project Accents */}
      <section className="flex flex-col gap-4">
        <SectionHeading>Colors — Project</SectionHeading>
        <p className="text-sm text-muted-foreground">
          프로젝트별 악센트 색상. 라이트/다크 동일.
        </p>
        <div className="flex gap-4">
          {PROJECT_COLORS.map((c) => (
            <div key={c.name} className="flex flex-col items-center gap-2 flex-1">
              <div
                className="w-full aspect-square rounded-md border border-border"
                style={{ backgroundColor: c.oklch }}
              />
              <span className="text-[11px] text-muted-foreground font-mono text-center leading-tight">
                {c.name}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Heading Primitives */}
      <section className="flex flex-col gap-4">
        <SectionHeading>Heading Primitives</SectionHeading>
        <p className="text-sm text-muted-foreground">
          공통 헤딩 컴포넌트로 모든 페이지의 제목 스케일을 통합 관리.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border-subtle bg-surface-subtle p-5">
            <p className="mb-2 text-xs font-mono text-muted-foreground">PageTitle</p>
            <p className={pageTitleClass}>System-level page heading</p>
            <p className="mt-2 text-xs text-muted-foreground">text-4xl → lg:text-5xl</p>
          </div>

          <div className="rounded-xl border border-border-subtle bg-surface-subtle p-5">
            <p className="mb-2 text-xs font-mono text-muted-foreground">SectionTitle</p>
            <p className={sectionTitleClass}>Section heading baseline</p>
            <p className="mt-2 text-xs text-muted-foreground">text-lg</p>
          </div>
        </div>
      </section>

      {/* Typography */}
      <section className="flex flex-col gap-6">
        <SectionHeading>Typography</SectionHeading>

        <div className="flex flex-col gap-1">
          <SubHeading>Sans (Pretendard)</SubHeading>
          <div className="flex flex-col gap-2">
            {TYPE_SIZES.map((t) => (
              <div key={t.name} className="flex items-baseline gap-4">
                <span className="text-xs text-muted-foreground font-mono w-10 shrink-0 text-right">
                  {t.name}
                </span>
                <span className={`${t.class} font-normal`}>
                  가나다라 ABCabc 012
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <SubHeading>Mono (JetBrains Mono)</SubHeading>
          <div className="flex flex-col gap-2">
            {TYPE_SIZES.slice(0, 5).map((t) => (
              <div key={t.name} className="flex items-baseline gap-4">
                <span className="text-xs text-muted-foreground font-mono w-10 shrink-0 text-right">
                  {t.name}
                </span>
                <span className={`${t.class} font-mono`}>
                  const x = 42; // →
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <SubHeading>Weights</SubHeading>
          <div className="flex flex-col gap-2">
            <span className="text-lg font-normal">
              400 Regular — 기본 텍스트 본문
            </span>
            <span className="text-lg font-medium">
              500 Medium — 강조 라벨
            </span>
            <span className="text-lg font-bold">
              700 Bold — 제목 헤딩
            </span>
          </div>
        </div>
      </section>

      {/* Spacing */}
      <section className="flex flex-col gap-4">
        <SectionHeading>Spacing</SectionHeading>
        <div className="flex flex-col gap-2">
          {SPACING_STEPS.map((s) => (
            <div key={s.name} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground font-mono w-8 text-right shrink-0">
                {s.name}
              </span>
              <div
                className="h-3 rounded-sm bg-primary"
                style={{ width: `${s.px}px` }}
              />
              <span className="text-xs text-muted-foreground font-mono">
                {s.px}px
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Radius */}
      <section className="flex flex-col gap-4">
        <SectionHeading>Radius</SectionHeading>
        <div className="flex gap-6">
          {[
            { name: "none", class: "rounded-none", px: "0px" },
            { name: "sm", class: "rounded-sm", px: "2px" },
            { name: "md", class: "rounded-md", px: "4px" },
            { name: "lg", class: "rounded-lg", px: "8px" },
          ].map((r) => (
            <div key={r.name} className="flex flex-col items-center gap-2">
              <div
                className={`size-16 bg-primary ${r.class}`}
              />
              <span className="text-xs text-muted-foreground font-mono">
                {r.name} ({r.px})
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Shadow */}
      <section className="flex flex-col gap-4">
        <SectionHeading>Shadow</SectionHeading>
        <div className="flex gap-6">
          <div className="flex flex-col items-center gap-2">
            <div className="size-24 rounded-md bg-card border border-border shadow-sm" />
            <span className="text-xs text-muted-foreground font-mono">
              shadow-sm
            </span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="size-24 rounded-md bg-card border border-border shadow-md" />
            <span className="text-xs text-muted-foreground font-mono">
              shadow-md
            </span>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════
          T44: Component Showcase
          ════════════════════════════════════════════ */}

      {/* Button */}
      <section className="flex flex-col gap-4">
        <SectionHeading>Button</SectionHeading>
        <SubHeading>Variants</SubHeading>
        <div className="flex flex-wrap gap-3">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
        <SubHeading>Sizes</SubHeading>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="xs">XS</Button>
          <Button size="sm">SM</Button>
          <Button size="default">Default</Button>
          <Button size="lg">LG</Button>
        </div>
        <SubHeading>States</SubHeading>
        <div className="flex flex-wrap gap-3">
          <Button disabled>Disabled</Button>
          <Button variant="outline" disabled>
            Outline Disabled
          </Button>
        </div>
      </section>

      {/* Input */}
      <section className="flex flex-col gap-4">
        <SectionHeading>Input</SectionHeading>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="기본 입력" />
          <Input type="email" placeholder="이메일" />
          <Input disabled placeholder="비활성화" />
          <Input aria-invalid="true" placeholder="에러 상태" />
        </div>
      </section>

      {/* Card */}
      <section className="flex flex-col gap-4">
        <SectionHeading>Card</SectionHeading>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>시스템 상태</CardTitle>
              <CardDescription>현재 시스템 운영 정보</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">모든 서비스가 정상 운영 중입니다.</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm">
                상세 보기
              </Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>배포 로그</CardTitle>
              <CardDescription>최근 배포 히스토리</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-1">
                <p className="text-sm font-mono text-muted-foreground">
                  v0.6.0 — Phase 6 Demo
                </p>
                <p className="text-sm font-mono text-muted-foreground">
                  v0.5.0 — Core Components
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Dialog */}
      <section className="flex flex-col gap-4">
        <SectionHeading>Dialog</SectionHeading>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">다이얼로그 열기</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>확인</DialogTitle>
              <DialogDescription>
                이 작업을 계속 진행하시겠습니까?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">취소</Button>
              </DialogClose>
              <Button>확인</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>

      {/* Dropdown Menu */}
      <section className="flex flex-col gap-4">
        <SectionHeading>Dropdown Menu</SectionHeading>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">메뉴 열기</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>작업</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>프로필</DropdownMenuItem>
            <DropdownMenuItem>설정</DropdownMenuItem>
            <DropdownMenuItem>팀 관리</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">
              로그아웃
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </section>

      {/* Sonner */}
      <section className="flex flex-col gap-4">
        <SectionHeading>Sonner (Toast)</SectionHeading>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => toast.success("배포가 완료되었습니다.")}
          >
            Success
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.error("배포에 실패했습니다.")}
          >
            Error
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.info("새로운 업데이트가 있습니다.")}
          >
            Info
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.warning("디스크 용량이 부족합니다.")}
          >
            Warning
          </Button>
        </div>
      </section>

      {/* Badge */}
      <section className="flex flex-col gap-4">
        <SectionHeading>Badge</SectionHeading>
        <div className="flex flex-wrap gap-3">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>
      </section>

      {/* Avatar */}
      <section className="flex flex-col gap-6">
        <SectionHeading>Avatar</SectionHeading>

        <div>
          <SubHeading>Sizes</SubHeading>
          <div className="flex items-center gap-4 mt-2">
            <Avatar size="sm">
              <AvatarFallback>S</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarImage
                src="https://github.com/shadcn.png"
                alt="shadcn"
              />
              <AvatarFallback>SC</AvatarFallback>
            </Avatar>
            <Avatar size="lg">
              <AvatarFallback>LG</AvatarFallback>
            </Avatar>
          </div>
        </div>

        <div>
          <SubHeading>With Badge</SubHeading>
          <div className="flex items-center gap-4 mt-2">
            <Avatar>
              <AvatarImage
                src="https://github.com/shadcn.png"
                alt="shadcn"
              />
              <AvatarFallback>SC</AvatarFallback>
              <AvatarBadge />
            </Avatar>
            <Avatar size="lg">
              <AvatarFallback>JM</AvatarFallback>
              <AvatarBadge />
            </Avatar>
          </div>
        </div>

        <div>
          <SubHeading>Group</SubHeading>
          <div className="mt-2">
            <AvatarGroup>
              <Avatar>
                <AvatarImage
                  src="https://github.com/shadcn.png"
                  alt="1"
                />
                <AvatarFallback>A</AvatarFallback>
              </Avatar>
              <Avatar>
                <AvatarFallback>B</AvatarFallback>
              </Avatar>
              <Avatar>
                <AvatarFallback>C</AvatarFallback>
              </Avatar>
              <AvatarGroupCount>+5</AvatarGroupCount>
            </AvatarGroup>
          </div>
        </div>
      </section>

      </div>
    </>
  );
}
