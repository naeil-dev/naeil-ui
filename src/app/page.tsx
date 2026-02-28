"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
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
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { toast } from "sonner";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center gap-12 p-8 pb-20">
      <div className="flex flex-col items-center gap-2">
        <h1 className="text-4xl font-bold tracking-tight">naeil-ui</h1>
        <p className="text-muted-foreground text-sm">
          Phase 5 — 핵심 컴포넌트 쇼케이스
        </p>
        <ThemeToggle />
      </div>

      {/* 1. Button */}
      <section className="flex w-full max-w-2xl flex-col gap-4">
        <h2 className="text-lg font-semibold">Button</h2>
        <div className="flex flex-wrap gap-3">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="destructive">Destructive</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button size="xs">XS</Button>
          <Button size="sm">SM</Button>
          <Button size="default">Default</Button>
          <Button size="lg">LG</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      {/* 2. Input */}
      <section className="flex w-full max-w-2xl flex-col gap-4">
        <h2 className="text-lg font-semibold">Input</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="기본 입력" />
          <Input type="email" placeholder="이메일" />
          <Input disabled placeholder="비활성화" />
          <Input aria-invalid="true" placeholder="에러 상태" />
        </div>
      </section>

      {/* 3. Card */}
      <section className="flex w-full max-w-2xl flex-col gap-4">
        <h2 className="text-lg font-semibold">Card</h2>
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
              <p className="text-sm font-mono text-muted-foreground">
                v0.5.0 — 2026-02-28 15:00
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 4. Dialog */}
      <section className="flex w-full max-w-2xl flex-col gap-4">
        <h2 className="text-lg font-semibold">Dialog</h2>
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

      {/* 5. Dropdown Menu */}
      <section className="flex w-full max-w-2xl flex-col gap-4">
        <h2 className="text-lg font-semibold">Dropdown Menu</h2>
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

      {/* 6. Sonner (Toast) */}
      <section className="flex w-full max-w-2xl flex-col gap-4">
        <h2 className="text-lg font-semibold">Sonner (Toast)</h2>
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

      {/* 7. Badge */}
      <section className="flex w-full max-w-2xl flex-col gap-4">
        <h2 className="text-lg font-semibold">Badge</h2>
        <div className="flex flex-wrap gap-3">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
      </section>

      {/* 8. Avatar */}
      <section className="flex w-full max-w-2xl flex-col gap-4">
        <h2 className="text-lg font-semibold">Avatar</h2>
        <div className="flex items-center gap-4">
          <Avatar>
            <AvatarImage
              src="https://github.com/shadcn.png"
              alt="shadcn"
            />
            <AvatarFallback>SC</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>JM</AvatarFallback>
          </Avatar>
          <Avatar size="sm">
            <AvatarFallback>S</AvatarFallback>
          </Avatar>
          <Avatar size="lg">
            <AvatarFallback>LG</AvatarFallback>
          </Avatar>
        </div>
      </section>
    </main>
  );
}
