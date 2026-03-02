import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HeroSection } from "@/components/hero-section";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

export default async function HubPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HubContent />;
}

const PROJECT_ACCENTS = {
  cc: "oklch(0.723 0.219 149)", // green
  pkm: "oklch(0.702 0.183 293)", // purple
  babyAgent: "oklch(0.769 0.188 70.08)", // warm amber
  naeilUi: "oklch(0.623 0.214 259)", // default accent blue
} as const;

function HubContent() {
  const t = useTranslations();

  const PROJECTS = [
    {
      key: "cc" as const,
      name: t("projects.cc.name"),
      description: t("projects.cc.description"),
      href: "/cc" as const,
      tags: ["Python", "RSS", "AI"],
      status: "active" as const,
    },
    {
      key: "pkm" as const,
      name: t("projects.pkm.name"),
      description: t("projects.pkm.description"),
      href: "/pkm" as const,
      tags: ["Python", "Embeddings", "Search"],
      status: "active" as const,
    },
    {
      key: "naeilUi" as const,
      name: t("projects.naeilUi.name"),
      description: t("projects.naeilUi.description"),
      href: "/design" as const,
      tags: ["React", "Tailwind", "OKLCH"],
      status: "active" as const,
    },
    {
      key: "babyAgent" as const,
      name: t("projects.babyAgent.name"),
      description: t("projects.babyAgent.description"),
      href: "#" as const,
      tags: ["OpenClaw", "LINE", "AI"],
      status: "coming" as const,
    },
  ];

  return (
    <>
      <Nav />

      {/* Hero */}
      <HeroSection />

      {/* Projects */}
      <section className="mx-auto max-w-4xl px-6 py-24">
        <h2 className="text-foreground mb-2 text-2xl font-bold tracking-tight">
          {t("projects.title")}
        </h2>
        <p className="text-muted-foreground mb-10 text-sm">
          {t("projects.subtitle")}
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {PROJECTS.map((project) => (
            <Link key={project.key} href={project.href}>
              <Card
                className="group h-full transition-colors"
                style={
                  {
                    "--project-accent":
                      PROJECT_ACCENTS[project.key],
                  } as React.CSSProperties
                }
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm group-hover:text-[var(--project-accent)] transition-colors">
                      {project.name}
                    </CardTitle>
                    <Badge
                      variant={
                        project.status === "active" ? "secondary" : "outline"
                      }
                      className="text-[10px]"
                    >
                      {t(`projects.status.${project.status}`)}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    {project.description}
                  </CardDescription>
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {project.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="text-[10px]"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* Stack */}
      <section className="border-border/40 border-t px-6 py-16 text-center">
        <p className="text-muted-foreground text-sm tracking-wide">
          {t("stack.label")}
        </p>
        <p className="text-foreground/70 mt-2 font-mono text-xs tracking-wider">
          React · Next.js · Tailwind · TypeScript · Python · SQLite · Playwright
        </p>
      </section>

      <Footer />
    </>
  );
}
