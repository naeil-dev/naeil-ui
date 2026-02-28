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

export default async function HubPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HubContent />;
}

function HubContent() {
  const t = useTranslations();

  const PROJECTS = [
    {
      name: t("projects.cc.name"),
      description: t("projects.cc.description"),
      href: "/cc" as const,
      status: "active" as const,
    },
    {
      name: t("projects.pkm.name"),
      description: t("projects.pkm.description"),
      href: "/pkm" as const,
      status: "active" as const,
    },
    {
      name: t("projects.babyAgent.name"),
      description: t("projects.babyAgent.description"),
      href: "#" as const,
      status: "coming" as const,
    },
  ];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-16 p-8">
      {/* Hero */}
      <section className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-5xl font-bold tracking-tight">
          {t("hero.title")}
        </h1>
        <p className="text-muted-foreground max-w-md text-lg">
          {t("hero.subtitle")}
        </p>
        <div className="flex gap-3">
          <Button asChild>
            <Link href="/projects">{t("nav.projects")}</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/design">{t("nav.design")}</Link>
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
                    <span className="text-muted-foreground text-xs">
                      {t("projects.status.coming")}
                    </span>
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
