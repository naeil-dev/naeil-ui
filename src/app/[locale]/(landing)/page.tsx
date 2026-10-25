import { setRequestLocale } from "next-intl/server";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Badge } from "@/components/ui/badge";
import { HeroSection } from "@/components/hero-section";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { SectionTitle } from "@/components/typography";
import styles from "@/app/home-blog.module.css";

export default async function HubPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HubContent />;
}

// Retired project pages live in src/app/_archive; restore an entry with its page.
const PROJECTS = [
  {
    key: "naeilUi" as const,
    href: "/design" as const,
    icon: "/images/whale.png",
    accent: "var(--project-naeilUi)",
    tags: ["React", "Tailwind", "OKLCH"],
    status: "active" as "active" | "coming",
    featured: true,
  },
] as const;

function HubContent() {
  const t = useTranslations();

  return (
    <>
      <h1 className="sr-only">naeil</h1>
      {/* Hero */}
      <HeroSection />

      <section id="projects" className={styles.projects} aria-labelledby="projects-title">
        <SectionTitle id="projects-title" className="mb-2">
          {t("projects.title")}
        </SectionTitle>
        <p className={styles.sectionDescription}>
          {t("projects.subtitle")}
        </p>

        <div className={styles.projectGrid}>
          {PROJECTS.map((project) => (
            <Link
              key={project.key}
              href={project.href}
              className={`${styles.projectLink} ${project.featured ? styles.featuredProject : ""}`}
            >
              {/* Icon */}
              <div
                className={styles.projectIcon}
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
              <div className={styles.projectCopy}>
                <div className={styles.projectHeading}>
                  <h3>
                  {t(`projects.${project.key}.name`)}
                  </h3>
                  {project.status === "coming" && (
                    <Badge
                      variant="outline"
                    >
                      {t("projects.status.coming")}
                    </Badge>
                  )}
                </div>
                <p className={styles.projectDescription}>
                  {t(`projects.${project.key}.description`)}
                </p>
                <div className={styles.badges}>
                  {project.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Arrow */}
              <ArrowUpRight className={styles.projectArrow} size={16} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

    </>
  );
}
