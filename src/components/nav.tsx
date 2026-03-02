"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";

const PROJECTS = [
  {
    key: "cc",
    href: "/cc" as const,
    accent: "oklch(0.723 0.219 149)",
    tags: ["Python", "RSS", "AI"],
    status: "active" as const,
  },
  {
    key: "pkm",
    href: "/pkm" as const,
    accent: "oklch(0.702 0.183 293)",
    tags: ["Python", "Embeddings"],
    status: "active" as const,
  },
  {
    key: "naeilUi",
    href: "/design" as const,
    accent: "oklch(0.623 0.214 259)",
    tags: ["React", "Tailwind"],
    status: "active" as const,
  },
  {
    key: "babyAgent",
    href: "#" as const,
    accent: "oklch(0.769 0.188 70.08)",
    tags: ["LINE", "AI"],
    status: "coming" as const,
  },
] as const;

export function Nav() {
  const t = useTranslations("nav");
  const pt = useTranslations("projects");
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const linkClass = (href: string) => {
    const isActive = pathname === href;
    return [
      "text-sm font-medium transition-colors",
      isActive
        ? "text-foreground"
        : "text-muted-foreground hover:text-foreground",
    ].join(" ");
  };

  return (
    <nav
      className={[
        "fixed top-0 z-50 w-full transition-[background-color,border-color] duration-300",
        scrolled
          ? "border-b border-border/40 bg-background/80 backdrop-blur-md"
          : "border-b border-transparent bg-transparent",
      ].join(" ")}
    >
      <div className="mx-auto flex h-[58px] max-w-7xl items-center px-6">
        {/* Left: Logo */}
        <div className="flex w-[200px] shrink-0 items-center">
          <Link
            href="/"
            className="text-foreground flex items-center gap-3 text-xl font-semibold tracking-tight"
          >
            <Logo size={28} />
            .naeil
          </Link>
        </div>

        {/* Center: Nav links */}
        <div className="flex flex-1 items-center gap-6">
          {/* Projects dropdown */}
          <div className="group relative">
            <Link href="/projects" className={linkClass("/projects")}>
              {t("projects")}
            </Link>

            {/* Hover dropdown */}
            <div className="pointer-events-none absolute left-0 top-full pt-2 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
              <div className="border-border/40 bg-background/95 w-[280px] rounded-lg border p-2 shadow-lg backdrop-blur-md">
                {PROJECTS.map((project) => (
                  <Link
                    key={project.key}
                    href={project.href}
                    className="hover:bg-muted/50 flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors"
                  >
                    <div
                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: project.accent }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground text-sm font-medium">
                          {pt(`${project.key}.name`)}
                        </span>
                        {project.status === "coming" && (
                          <Badge
                            variant="outline"
                            className="text-muted-foreground text-[9px] px-1 py-0"
                          >
                            {pt("status.coming")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground mt-0.5 text-xs leading-snug">
                        {pt(`${project.key}.description`)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <Link href="/blog" className={linkClass("/blog")}>
            {t("blog")}
          </Link>
        </div>

        {/* Right: Locale switcher */}
        <LocaleSwitcher />
      </div>
    </nav>
  );
}
