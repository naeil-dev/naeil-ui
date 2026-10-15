"use client";

import { useLocale, useTranslations } from "next-intl";
import { NaeilHeader } from "./naeil-header";
import { headerLocales } from "./naeil-header-content";
import { type NavigationLink, type NavigationLinkComponent, type NavigationProps } from "./ui/navigation";

const NativeBrandLink: NavigationLinkComponent = (props) => <a {...props} />;

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

/** Legacy Next/next-intl adapter; the complete branded composition lives in NaeilHeader. */
export function Nav({
  Link, usePathname, brandHref = "/", brandExternal = false, brandSlot,
  projectsExternal = false, externalBaseUrl = "https://naeil.dev",
  currentProjectKey, currentProjectHref, subNav, authSlot,
  showProjects = true, showBlog = true, toolbarSlot, projects,
  className, containerClassName, labels,
}: NavProps) {
  const consumerLocale = useLocale();
  const locale = headerLocales.find(value => value === consumerLocale) ?? "en";
  const t = useTranslations("nav");
  const pt = useTranslations("projects");
  const pathname = usePathname();
  return (
    <NaeilHeader
      locale={locale} Link={Link} currentHref={pathname}
      resolveHref={path => projectsExternal ? `${externalBaseUrl}${path}` : path}
      projectsExternal={projectsExternal}
      translations={{ projects: showProjects ? t("projects") : "", blog: showBlog ? t("blog") : "", project: pt }}
      brandHref={brandHref} brandSlot={brandSlot}
      brandLinkComponent={brandExternal ? NativeBrandLink : Link}
      currentProjectKey={currentProjectKey} currentProjectHref={currentProjectHref}
      subNav={subNav} projects={projects} showProjects={showProjects} showBlog={showBlog}
      toolbarSlot={<>{authSlot}{toolbarSlot}</>}
      className={className} containerClassName={containerClassName} labels={labels}
    />
  );
}
