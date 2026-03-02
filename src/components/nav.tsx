"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

const PROJECTS = [
  {
    key: "cc",
    href: "/cc" as const,
    accent: "oklch(0.723 0.219 149)",
    icon: "/images/fish.png",
    status: "active" as const,
  },
  {
    key: "pkm",
    href: "/pkm" as const,
    accent: "oklch(0.702 0.183 293)",
    icon: "/images/jellyfish.png",
    status: "active" as const,
  },
  {
    key: "naeilUi",
    href: "/design" as const,
    accent: "oklch(0.623 0.214 259)",
    icon: "/images/whale.png",
    status: "active" as const,
  },
  {
    key: "babyAgent",
    href: "#" as const,
    accent: "oklch(0.769 0.188 70.08)",
    icon: "/images/turtle.png",
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
            <button
              className={[
                "text-sm font-medium transition-colors",
                pathname.startsWith("/projects") ||
                pathname.startsWith("/cc") ||
                pathname.startsWith("/pkm") ||
                pathname.startsWith("/design")
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              {t("projects")}
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="ml-1 inline-block transition-transform group-hover:rotate-180"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {/* Hover mega-dropdown */}
            <div className="pointer-events-none absolute left-0 top-full pt-3 opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100">
              <div className="border-border/40 bg-background/95 w-[520px] rounded-xl border p-4 shadow-xl backdrop-blur-md">
                <div className="grid grid-cols-2 gap-1">
                  {PROJECTS.map((project) => (
                    <Link
                      key={project.key}
                      href={project.href}
                      className="hover:bg-muted/50 flex items-start gap-3.5 rounded-lg px-3 py-3 transition-colors"
                    >
                      {/* Icon container — Vercel style */}
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border"
                        style={{
                          borderColor: `color-mix(in oklch, ${project.accent} 30%, transparent)`,
                          backgroundColor: `color-mix(in oklch, ${project.accent} 8%, transparent)`,
                        }}
                      >
                        <Image
                          src={project.icon}
                          alt=""
                          width={24}
                          height={24}
                          className="object-contain"
                        />
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-foreground text-sm font-medium">
                            {pt(`${project.key}.name`)}
                          </span>
                          {project.status === "coming" && (
                            <Badge
                              variant="outline"
                              className="text-muted-foreground px-1 py-0 text-[9px]"
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
