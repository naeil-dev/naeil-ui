"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggleIcon } from "@/components/theme-toggle-icon";
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
    status: "coming" as const,
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
    href: "/baby-agent" as const,
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setProjectsOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  const linkClass = (href: string) => {
    const isActive = pathname === href;
    return [
      "text-sm font-medium transition-colors",
      isActive
        ? "text-foreground"
        : "text-muted-foreground hover:text-foreground",
    ].join(" ");
  };

  const isProjectActive =
    pathname.startsWith("/projects") ||
    pathname.startsWith("/cc") ||
    pathname.startsWith("/pkm") ||
    pathname.startsWith("/design");

  return (
    <>
      <nav
        className={[
          "fixed top-0 z-50 w-full transition-[background-color,border-color] duration-300",
          scrolled || mobileOpen
            ? "border-b border-border/40 bg-background/80 backdrop-blur-md"
            : "border-b border-transparent bg-transparent",
        ].join(" ")}
      >
        <div className="mx-auto flex h-[58px] max-w-7xl items-center px-6">
          {/* Logo */}
          <div className="flex shrink-0 items-center md:w-[200px]">
            <Link
              href="/"
              className="text-foreground flex items-center gap-3 text-xl font-semibold tracking-tight"
            >
              <Logo size={28} />
              .naeil
            </Link>
          </div>

          {/* Desktop: Nav links */}
          <div className="hidden flex-1 items-center gap-6 md:flex">
            {/* Projects dropdown */}
            <div className="group relative">
              <button
                className={[
                  "text-sm font-medium transition-colors",
                  isProjectActive
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

          {/* Desktop: Theme + Locale */}
          <div className="hidden items-center gap-4 md:flex">
            <ThemeToggleIcon />
            <LocaleSwitcher />
          </div>

          {/* Mobile: Hamburger */}
          <button
            className="text-muted-foreground hover:text-foreground ml-auto transition-colors md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </nav>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="bg-background/95 fixed inset-0 z-40 overflow-y-auto pt-[58px] backdrop-blur-md md:hidden">
          <div className="flex flex-col px-6 py-6">
            {/* Projects accordion */}
            <button
              className="text-foreground flex items-center justify-between py-3 text-base font-medium"
              onClick={() => setProjectsOpen(!projectsOpen)}
            >
              {t("projects")}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={[
                  "transition-transform duration-200",
                  projectsOpen ? "rotate-180" : "",
                ].join(" ")}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {projectsOpen && (
              <div className="mb-2 flex flex-col gap-1 pl-1">
                {PROJECTS.map((project) => (
                  <Link
                    key={project.key}
                    href={project.href}
                    className="hover:bg-muted/50 flex items-center gap-3 rounded-lg px-3 py-3 transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border"
                      style={{
                        borderColor: `color-mix(in oklch, ${project.accent} 30%, transparent)`,
                        backgroundColor: `color-mix(in oklch, ${project.accent} 8%, transparent)`,
                      }}
                    >
                      <Image
                        src={project.icon}
                        alt=""
                        width={20}
                        height={20}
                        className="object-contain"
                      />
                    </div>
                    <div>
                      <span className="text-foreground text-sm font-medium">
                        {pt(`${project.key}.name`)}
                      </span>
                      {project.status === "coming" && (
                        <Badge
                          variant="outline"
                          className="text-muted-foreground ml-2 px-1 py-0 text-[9px]"
                        >
                          {pt("status.coming")}
                        </Badge>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Blog */}
            <Link
              href="/blog"
              className="text-foreground border-border/40 border-t py-3 text-base font-medium"
              onClick={() => setMobileOpen(false)}
            >
              {t("blog")}
            </Link>

            {/* Theme + Locale */}
            <div className="border-border/40 flex items-center gap-4 border-t pt-4">
              <ThemeToggleIcon />
              <LocaleSwitcher />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MenuIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}
