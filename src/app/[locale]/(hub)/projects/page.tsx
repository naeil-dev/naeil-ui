import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ProjectsContent />;
}

function ProjectsContent() {
  const t = useTranslations();

  const PROJECTS = [
    {
      name: t("projects.cc.name"),
      description: t("projects.cc.description"),
      href: "/cc" as const,
      tags: ["Python", "RSS", "AI"],
      status: t("projects.status.active"),
      isActive: true,
    },
    {
      name: t("projects.pkm.name"),
      description: t("projects.pkm.description"),
      href: "/pkm" as const,
      tags: ["Python", "Embeddings", "Search"],
      status: t("projects.status.active"),
      isActive: true,
    },
    {
      name: t("projects.naeilUi.name"),
      description: t("projects.naeilUi.description"),
      href: "/design" as const,
      tags: ["React", "Tailwind", "Design Tokens"],
      status: t("projects.status.active"),
      isActive: true,
    },
    {
      name: t("projects.babyAgent.name"),
      description: t("projects.babyAgent.description"),
      href: "#" as const,
      tags: ["OpenClaw", "LINE", "AI"],
      status: t("projects.status.coming"),
      isActive: false,
    },
  ];

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 p-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("projects.title")}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {t("projects.subtitle")}
        </p>
      </div>

      <div className="grid gap-4">
        {PROJECTS.map((project) => {
          const card = (
            <Card
              className={
                project.isActive
                  ? "transition-colors hover:border-foreground/20"
                  : "opacity-50"
              }
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{project.name}</CardTitle>
                  <Badge
                    variant={project.isActive ? "secondary" : "outline"}
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
          );

          return project.isActive ? (
            <Link key={project.name} href={project.href}>
              {card}
            </Link>
          ) : (
            <div key={project.name}>{card}</div>
          );
        })}
      </div>
    </main>
  );
}
