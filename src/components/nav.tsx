"use client";

import { useTranslations, useLocale } from "next-intl";
import Image from "next/image";
import { Logo } from "./logo";
import { Badge } from "./ui/badge";
import {
  Navigation,
  type NavigationItem,
  type NavigationLink,
  type NavigationProps,
} from "./ui/navigation";
import { cn } from "../lib/utils";

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

export interface NavProps {
  /** Internal Link component (from consumer's next-intl routing) */
  Link: React.ComponentType<
    React.ComponentPropsWithoutRef<"a"> & { href: string }
  >;
  /** Current pathname value (already resolved, not a hook) */
  usePathname: () => string;
  /** Where the naeil logo links to. Default: "/" */
  brandHref?: string;
  /** Whether brandHref is external (renders <a>) or internal (renders Link). Default: false */
  brandExternal?: boolean;
  /** Custom brand content (replaces the default naeil wordmark lockup) */
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
  /** Replace the legacy naeil project inventory with application-owned links. */
  projects?: NavigationLink[];
  className?: string;
  containerClassName?: string;
  labels?: NavigationProps["labels"];
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
  projects,
  className,
  containerClassName,
  labels,
}: NavProps) {
  const t = useTranslations("nav");
  const pt = useTranslations("projects");
  const locale = useLocale();
  const pathname = usePathname();
  const BrandLink = brandExternal ? "a" : Link;
  const projectLinks: NavigationLink[] =
    projects ??
    (showProjects
      ? PROJECTS.map((project) => {
          const current = project.key === currentProjectKey;
          return {
            id: project.key,
            label: pt(`${project.key}.name`),
            description: pt(`${project.key}.description`),
            href: current
              ? currentProjectHref || "/"
              : projectsExternal
                ? `${externalBaseUrl}${project.href}`
                : project.href,
            external: !current && projectsExternal,
            active:
              current ||
              pathname === project.href ||
              pathname.startsWith(`${project.href}/`),
            icon: (
              <span
                className="flex size-10 items-center justify-center rounded-lg border"
                style={{
                  borderColor: `color-mix(in oklch, ${project.accent} 30%, transparent)`,
                  backgroundColor: `color-mix(in oklch, ${project.accent} 8%, transparent)`,
                }}
              >
                <Image src={project.icon} alt="" width={24} height={24} />
              </span>
            ),
            badge:
              project.status === "coming" ? (
                <Badge variant="outline">{pt("status.coming")}</Badge>
              ) : undefined,
          };
        })
      : []);
  const items: NavigationItem[] = [
    ...(showProjects
      ? [
          {
            id: "projects",
            label: t("projects"),
            items: projectLinks,
            columns: 2 as const,
          },
        ]
      : []),
    ...(showBlog
      ? [
          {
            id: "blog",
            label: t("blog"),
            href: projectsExternal ? `${externalBaseUrl}/blog` : "/blog",
            external: projectsExternal,
          },
        ]
      : []),
    ...(subNav ?? []).map((item) => ({ ...item, id: item.href })),
  ];
  const defaultLabels =
    locale === "ko"
      ? { navigation: "주요 메뉴", menu: "메뉴", close: "메뉴 닫기" }
      : locale === "ja"
        ? {
            navigation: "メインナビゲーション",
            menu: "メニュー",
            close: "メニューを閉じる",
          }
        : { navigation: "Main navigation", menu: "Menu", close: "Close menu" };
  return (
    <Navigation
      Link={Link}
      items={items}
      currentHref={pathname}
      brand={
        <BrandLink href={brandHref}>
          {brandSlot ?? (
            <Logo variant="horizontal" size={28} className="block" />
          )}
        </BrandLink>
      }
      labels={labels ?? defaultLabels}
      toolbar={
        <>
          {authSlot}
          {toolbarSlot}
        </>
      }
      className={cn("fixed top-0 w-full", className)}
      containerClassName={cn("max-w-7xl", containerClassName)}
    />
  );
}
