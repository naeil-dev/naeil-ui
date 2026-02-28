import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PROJECTS = [
  {
    name: "Content Collector",
    description: "RSS·YouTube·Reddit 콘텐츠 자동 수집 + AI 요약",
    href: "/cc",
    tags: ["Python", "RSS", "AI"],
    status: "Active",
  },
  {
    name: "PKM",
    description: "개인 지식 관리 — 문서 파싱, 임베딩, 시맨틱 검색",
    href: "/pkm",
    tags: ["Python", "Embeddings", "Search"],
    status: "Active",
  },
  {
    name: "naeil-ui",
    description: "미니멀 디자인 시스템 — OKLCH 토큰, Tailwind v4, shadcn",
    href: "/design",
    tags: ["React", "Tailwind", "Design Tokens"],
    status: "Active",
  },
  {
    name: "Baby Agent",
    description: "육아 전용 AI 에이전트 — LINE 기반 Q&A, 기록, 알림",
    href: "#",
    tags: ["OpenClaw", "LINE", "AI"],
    status: "Coming Soon",
  },
] as const;

export default function ProjectsPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Jay&apos;s personal projects — all built with naeil-ui.
        </p>
      </div>

      <div className="grid gap-4">
        {PROJECTS.map((project) => (
          <Link key={project.name} href={project.href}>
            <Card className="transition-colors hover:border-foreground/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{project.name}</CardTitle>
                  <Badge
                    variant={
                      project.status === "Active" ? "secondary" : "outline"
                    }
                  >
                    {project.status}
                  </Badge>
                </div>
                <CardDescription>{project.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {project.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
