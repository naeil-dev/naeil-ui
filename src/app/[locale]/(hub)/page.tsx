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
import { HeroScene } from "@/components/hero-scene";
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
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6">
        {/* 3D Scene — background */}
        <div className="absolute inset-0 flex items-center justify-center opacity-60">
          <HeroScene />
        </div>

        {/* Content — foreground (hidden during 3D preview) */}
        {/* <div className="relative z-10 flex flex-col items-center gap-6 text-center">
          <h1 className="text-foreground text-6xl font-bold tracking-tighter md:text-8xl">
            {t("hero.title")}
          </h1>
          <p className="text-muted-foreground max-w-lg text-lg md:text-xl">
            {t("hero.subtitle")}
          </p>
          <div className="flex gap-3">
            <Button asChild size="lg">
              <Link href="/projects">{t("nav.projects")}</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <a
                href="https://github.com/jaymini1022"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
            </Button>
          </div>
        </div> */}
      </section>

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
