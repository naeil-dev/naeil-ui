import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Badge } from "@/components/ui/badge";
import { HeroSection } from "@/components/hero-section";
import Image from "next/image";

export default async function HubPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HubContent />;
}

const PROJECTS = [
  {
    key: "cc" as const,
    href: "/cc" as const,
    icon: "/images/fish.png",
    accent: "oklch(0.723 0.219 149)",
    tags: ["Python", "RSS", "AI"],
    status: "active" as const,
    featured: true,
  },
  {
    key: "pkm" as const,
    href: "/pkm" as const,
    icon: "/images/jellyfish.png",
    accent: "oklch(0.702 0.183 293)",
    tags: ["Python", "Embeddings", "Search"],
    status: "coming" as const,
    featured: false,
  },
  {
    key: "naeilUi" as const,
    href: "/design" as const,
    icon: "/images/whale.png",
    accent: "oklch(0.623 0.214 259)",
    tags: ["React", "Tailwind", "OKLCH"],
    status: "active" as const,
    featured: false,
  },
  {
    key: "babyAgent" as const,
    href: "/baby-agent" as const,
    icon: "/images/turtle.png",
    accent: "oklch(0.769 0.188 70.08)",
    tags: ["LINE", "AI"],
    status: "coming" as const,
    featured: false,
  },
] as const;

function HubContent() {
  const t = useTranslations();

  return (
    <>
      {/* Hero */}
      <HeroSection />

      {/* Projects — Bento Grid */}
      <section className="mx-auto max-w-4xl px-6 py-24">
        <h2 className="text-foreground mb-2 text-2xl font-bold tracking-tight">
          {t("projects.title")}
        </h2>
        <p className="text-muted-foreground mb-10 text-sm">
          {t("projects.subtitle")}
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PROJECTS.map((project) => (
            <Link
              key={project.key}
              href={project.href}
              className={[
                "group relative rounded-2xl border border-border-subtle bg-surface-subtle p-7 transition-all duration-250",
                "hover:-translate-y-0.5 hover:border-border-subtle-hover hover:shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)]",
                project.featured ? "sm:col-span-2 sm:flex sm:items-center sm:gap-8" : "",
              ].join(" ")}
              style={{ "--accent": project.accent } as React.CSSProperties}
            >
              {/* Icon */}
              <div
                className={[
                  "flex shrink-0 items-center justify-center rounded-[14px]",
                  project.featured
                    ? "mb-5 h-14 w-14 sm:mb-0 sm:h-20 sm:w-20"
                    : "mb-5 h-14 w-14",
                ].join(" ")}
                style={{
                  background: `color-mix(in oklch, ${project.accent} 8%, transparent)`,
                  border: `1px solid color-mix(in oklch, ${project.accent} 20%, transparent)`,
                }}
              >
                <Image
                  src={project.icon}
                  alt=""
                  width={project.featured ? 52 : 36}
                  height={project.featured ? 52 : 36}
                  className="object-contain"
                />
              </div>

              {/* Text */}
              <div className={project.featured ? "flex-1" : ""}>
                <div className="text-foreground mb-1.5 text-[15px] font-semibold">
                  {t(`projects.${project.key}.name`)}
                  {project.status === "coming" && (
                    <Badge
                      variant="outline"
                      className="text-muted-foreground ml-2 px-1.5 py-0 text-[9px] align-middle"
                    >
                      {t("projects.status.coming")}
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground mb-3 text-[13px] leading-relaxed">
                  {t(`projects.${project.key}.description`)}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border-subtle px-2 py-0.5 text-[10px] text-zinc-500"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Arrow */}
              <span className="text-muted-foreground/40 group-hover:text-foreground absolute right-6 top-6 text-sm transition-colors">
                ↗
              </span>
            </Link>
          ))}
        </div>
      </section>

    </>
  );
}
