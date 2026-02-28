import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

const PROJECTS = [
  {
    name: "Content Collector",
    description: "RSS·YouTube·Reddit 콘텐츠 자동 수집 + AI 요약",
    href: "/cc",
    status: "active",
  },
  {
    name: "PKM",
    description: "개인 지식 관리 — 문서 파싱, 임베딩, 시맨틱 검색",
    href: "/pkm",
    status: "active",
  },
  {
    name: "Baby Agent",
    description: "육아 전용 AI 에이전트 — LINE 기반",
    href: "#",
    status: "coming",
  },
] as const;

export default function HubPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-16 p-8">
      {/* Hero */}
      <section className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-5xl font-bold tracking-tight">naeil</h1>
        <p className="text-muted-foreground max-w-md text-lg">
          Personal projects by Jay — built with a minimal, mechanical design
          system.
        </p>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/projects">Projects</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/design">Design System</Link>
          </Button>
        </div>
      </section>

      {/* Project Cards */}
      <section className="grid w-full max-w-2xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PROJECTS.map((project) => (
          <Link key={project.name} href={project.href}>
            <Card className="h-full transition-colors hover:border-foreground/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm">{project.name}</CardTitle>
                  {project.status === "coming" && (
                    <span className="text-muted-foreground text-xs">soon</span>
                  )}
                </div>
                <CardDescription className="text-xs">
                  {project.description}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </section>
    </main>
  );
}
