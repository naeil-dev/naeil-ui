"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "./ui/badge";
import Image from "next/image";

const PROJECTS = [
  {
    key: "cc",
    href: "/cc",
    accent: "oklch(0.704 0.140 181)",
    icon: "/images/coral.png",
    status: "active" as const,
  },
  {
    key: "pkm",
    href: "/pkm",
    accent: "oklch(0.702 0.183 293)",
    icon: "/images/jellyfish.png",
    status: "coming" as const,
  },
  {
    key: "naeilUi",
    href: "/design",
    accent: "oklch(0.623 0.214 259)",
    icon: "/images/whale.png",
    status: "active" as const,
  },
  {
    key: "sa",
    href: "/sa",
    accent: "oklch(0.723 0.219 149)",
    icon: "/images/fish.png",
    status: "active" as const,
  },
  {
    key: "babyAgent",
    href: "/baby-agent",
    accent: "oklch(0.769 0.188 70.08)",
    icon: "/images/turtle.png",
    status: "coming" as const,
  },
];

interface NavProps {
  /** Internal Link component (from consumer's next-intl routing) */
  Link: React.ComponentType<{
    href: string;
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    [key: string]: any;
  }>;
  /** Current pathname value (already resolved, not a hook) */
  usePathname: () => string;
  /** Where the .naeil logo links to. Default: "/" */
  brandHref?: string;
  /** Whether brandHref is external (renders <a>) or internal (renders Link). Default: false */
  brandExternal?: boolean;
  /** Custom brand content (replaces default Logo + ".naeil" text) */
  brandSlot?: React.ReactNode;
  /** When true, project links (except current) are rendered as external <a> to externalBaseUrl. Default: false */
  projectsExternal?: boolean;
  /** Base URL for external project links. Default: "https://naeil.dev" */
  externalBaseUrl?: string;
  /** Override href for the current project in the dropdown */
  currentProjectKey?: string;
  currentProjectHref?: string;
  /** App-specific sub-navigation items after the project dropdown */
  subNav?: Array<{ label: string; href: string }>;
  /** React node for auth UI (rendered in desktop right side + mobile bottom) */
  authSlot?: React.ReactNode;
  /** Show Projects dropdown in nav. Default: true */
  showProjects?: boolean;
  /** Show blog link in nav. Default: true */
  showBlog?: boolean;
  /** Right-side toolbar (theme toggle, locale switcher, etc.) */
  toolbarSlot?: React.ReactNode;
}

export function Nav({
  Link,
  usePathname,
  brandHref = "/",
  brandExternal = false,
  brandSlot,
  projectsExternal = false,
  externalBaseUrl = "https://naeil.dev",
  currentProjectKey,
  currentProjectHref,
  subNav,
  authSlot,
  showProjects = true,
  showBlog = true,
  toolbarSlot,
}: NavProps) {
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
    return () => {
      document.body.style.overflow = "";
    };
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
    pathname.startsWith("/sa") ||
    pathname.startsWith("/design");

  // Resolve project href and whether it's external
  function getProjectLink(project: (typeof PROJECTS)[number]) {
    if (currentProjectKey && project.key === currentProjectKey) {
      return { href: currentProjectHref || "/", external: false };
    }
    if (projectsExternal) {
      return { href: `${externalBaseUrl}${project.href}`, external: true };
    }
    return { href: project.href, external: false };
  }

  // Brand logo element
  const brandContent = brandSlot ?? (
    <span className="text-foreground flex items-center gap-3 text-xl font-semibold tracking-tight">
      <Logo size={28} />
      .naeil
    </span>
  );

  const brandElement = brandExternal ? (
    <a href={brandHref}>{brandContent}</a>
  ) : (
    <Link href={brandHref}>{brandContent}</Link>
  );

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
            {brandElement}
          </div>

          {/* Desktop: Nav links */}
          <div className="hidden flex-1 items-center gap-6 md:flex">
            {/* Projects dropdown */}
            {showProjects && <div className="group relative">
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
                    {PROJECTS.map((project) => {
                      const { href, external } = getProjectLink(project);
                      const inner = (
                        <div className="hover:bg-muted/50 flex items-start gap-3.5 rounded-lg px-3 py-3 transition-colors">
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
                        </div>
                      );

                      if (external) {
                        return (
                          <a key={project.key} href={href}>
                            {inner}
                          </a>
                        );
                      }
                      return (
                        <Link key={project.key} href={href}>
                          {inner}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>}

            {/* Blog link (conditional) */}
            {showBlog && (
              <>
                {projectsExternal ? (
                  <a
                    href={`${externalBaseUrl}/blog`}
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {t("blog")}
                  </a>
                ) : (
                  <Link href="/blog" className={linkClass("/blog")}>
                    {t("blog")}
                  </Link>
                )}
              </>
            )}

            {/* Divider before sub-nav */}
            {subNav && subNav.length > 0 && (
              <>
                <div className="h-4 w-px bg-border/40" />
                {subNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={linkClass(item.href)}
                  >
                    {item.label}
                  </Link>
                ))}
              </>
            )}
          </div>

          {/* Desktop: Auth + Toolbar */}
          <div className="hidden items-center gap-3 md:flex">
            {authSlot}
            {authSlot && toolbarSlot && (
              <div className="h-4 w-px bg-border/40" />
            )}
            {toolbarSlot && (
              <div className="flex items-center gap-4">{toolbarSlot}</div>
            )}
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
            {showProjects && (
              <>
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
                    {PROJECTS.map((project) => {
                      const { href, external } = getProjectLink(project);
                      const inner = (
                        <div className="hover:bg-muted/50 flex items-center gap-3 rounded-lg px-3 py-3 transition-colors">
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
                        </div>
                      );

                      if (external) {
                        return (
                          <a
                            key={project.key}
                            href={href}
                            onClick={() => setMobileOpen(false)}
                          >
                            {inner}
                          </a>
                        );
                      }
                      return (
                        <Link
                          key={project.key}
                          href={href}
                          onClick={() => setMobileOpen(false)}
                        >
                          {inner}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {/* Blog link (conditional) */}
            {showBlog && (
              <>
                {projectsExternal ? (
                  <a
                    href={`${externalBaseUrl}/blog`}
                    className="text-foreground border-border/40 border-t py-3 text-base font-medium"
                    onClick={() => setMobileOpen(false)}
                  >
                    {t("blog")}
                  </a>
                ) : (
                  <Link
                    href="/blog"
                    className="text-foreground border-border/40 border-t py-3 text-base font-medium"
                    onClick={() => setMobileOpen(false)}
                  >
                    {t("blog")}
                  </Link>
                )}
              </>
            )}

            {/* Sub-nav items (mobile) */}
            {subNav && subNav.length > 0 && (
              <div className="border-border/40 border-t">
                {subNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="text-foreground block py-3 text-base font-medium"
                    onClick={() => setMobileOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}

            {/* Auth section mobile */}
            {authSlot && (
              <div className="border-border/40 border-t pt-4">
                {authSlot}
              </div>
            )}

            {/* Toolbar (Theme + Locale) */}
            {toolbarSlot && (
              <div className="border-border/40 flex items-center gap-4 border-t pt-4 mt-2">
                {toolbarSlot}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* ── Inline Logo (pure SVG, no external deps) ── */
function Logo({
  size = 20,
}: {
  size?: number;
}) {
  const id = `naeil-nav-logo-${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-label="naeil"
    >
      <path
        d="M6 4 L6 16 L20 16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
      <circle cx="15" cy="16" r="3.5" fill={`url(#${id}-grad)`} mask={`url(#${id})`} />
      <defs>
        <linearGradient id={`${id}-grad`} x1="15" y1="12.5" x2="15" y2="16">
          <stop stopColor="#eab308" />
          <stop offset="1" stopColor="#dc2626" />
        </linearGradient>
        <mask id={id}>
          <rect x="0" y="0" width="24" height="16" fill="white" />
        </mask>
      </defs>
    </svg>
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
