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
import { PageTitle } from "@/components/typography";

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
      coming: false,
    },
    {
      name: t("projects.pkm.name"),
      description: t("projects.pkm.description"),
      href: "/pkm" as const,
      tags: ["Python", "Embeddings", "Search"],
      status: t("projects.status.coming"),
      coming: true,
    },
    {
      name: t("projects.naeilUi.name"),
      description: t("projects.naeilUi.description"),
      href: "/design" as const,
      tags: ["React", "Tailwind", "Design Tokens"],
      status: t("projects.status.active"),
      coming: false,
    },
    {
      name: t("projects.babyAgent.name"),
      description: t("projects.babyAgent.description"),
      href: "/baby-agent" as const,
      tags: ["OpenClaw", "LINE", "AI"],
      status: t("projects.status.coming"),
      coming: true,
    },
  ];

  return (
    <section className="mx-auto max-w-4xl px-6 pb-24">
      <div className="mb-10">
        <PageTitle className="mb-3">{t("projects.title")}</PageTitle>
        <p className="text-muted-foreground text-lg">
          {t("projects.subtitle")}
        </p>
      </div>

      <div className="grid gap-4">
        {PROJECTS.map((project) => (
          <Link key={project.name} href={project.href}>
            <Card className="transition-colors hover:border-foreground/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{project.name}</CardTitle>
                  <Badge variant={project.coming ? "outline" : "secondary"}>
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
    </section>
  );
}
