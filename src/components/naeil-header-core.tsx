"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Logo } from "./logo";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Navigation, type NavigationItem, type NavigationLink, type NavigationLinkComponent, type NavigationLinkProps, type NavigationProps } from "./ui/navigation";
import { cn } from "../lib/utils";
import { uiRelease } from "../lib/ui-release";
import { headerLocales, headerProjects, type NaeilHeaderLocale } from "./naeil-header-data";
import { useNaeilMessages } from "./naeil-messages-context";

export type { NaeilHeaderLocale } from "./naeil-header-data";
export { NaeilHeaderAccountControl, type NaeilHeaderAccount, type NaeilHeaderAccountControlProps } from "./naeil-header-account-core";

interface LegacyHeaderProps extends Omit<NavigationProps, "brand" | "items" | "toolbar" | "mobileToolbar" | "labels"> {
  locale: NaeilHeaderLocale;
  /** Resolve canonical unlocalized paths. Defaults to the official localized site. */
  resolveHref?: (path: string) => string;
  brandHref?: string;
  /** @deprecated Owned services must use service; retained for compatibility. */
  brandSlot?: ReactNode;
  /** @deprecated Owned services must use service; retained for compatibility. Ignored with brandSlot. */
  brandSuffix?: string;
  /** @deprecated Owned services must use service with no indicator; retained for compatibility. */
  statusSlot?: ReactNode;
  /** Product menu data, after catalog/blog and before flat subNav links. */
  appNavigation?: NavigationItem[];
  brandLinkProps?: Omit<NavigationLinkProps, "href" | "children">;
  /** Omit when the application does not support changing its UI language. */
  onLocaleChange?: (locale: NaeilHeaderLocale) => void;
  /** Use NaeilHeaderAccountControl for canonical UI; the app owns auth state/I/O. */
  authSlot?: ReactNode;
  labels?: NavigationProps["labels"];
  projects?: NavigationLink[];
  /** Legacy remote-catalog mode: generated noncurrent project/blog links use native anchors. */
  projectsExternal?: boolean;
  /** Legacy next-intl copy overrides; catalog/artwork/layout remain shared. */
  translations?: {
    projects: string;
    blog: string;
    project: (key: string) => string;
  };
  showProjects?: boolean;
  showBlog?: boolean;
  /** @deprecated Owned services must use service and appNavigation; retained for compatibility. */
  subNav?: Array<{ label: string; href: string }>;
  currentProjectKey?: string;
  currentProjectHref?: string;
  /** @deprecated Owned services must use service and authSlot; retained for compatibility. */
  toolbarSlot?: ReactNode;
  /** @deprecated Owned services must use service and Link; retained for compatibility. */
  brandLinkComponent?: NavigationLinkComponent;
}

/** Canonical owned-service identifiers; their spelling is the visible brand suffix. */
export const naeilServices = Object.freeze(["abstorm", "home", "estimate", "jev"] as const);
export type NaeilService = typeof naeilServices[number];

const serviceCompatibilityProps = [
  "brandSuffix", "statusSlot", "brandSlot", "toolbarSlot", "subNav", "brandLinkComponent",
  "projects", "projectsExternal", "showProjects", "showBlog", "translations", "className",
  "containerClassName", "style", "brandLinkProps", "mobileFooter", "omitEmptyNavigation",
] as const;
type ServiceCompatibilityProp = typeof serviceCompatibilityProps[number];
export type NaeilHeaderProps =
  | (LegacyHeaderProps & { service?: undefined })
  | (Omit<LegacyHeaderProps, ServiceCompatibilityProp> & { service: NaeilService }
    & { [Prop in ServiceCompatibilityProp]?: never });

const warnedServiceProps = new Set<string>();

/** Opt into the owned-service contract without changing the legacy composition. */
export function NaeilHeader(input: NaeilHeaderProps) {
  if (input.service === undefined) return <HeaderComposition {...input} />;
  const props = { ...input } as Record<string, unknown>;
  for (const name of Object.keys(props)) {
    if (!(serviceCompatibilityProps as readonly string[]).includes(name) &&
      name !== "data-slot" && name !== "data-global-header" && !name.startsWith("data-naeil-")) continue;
    delete props[name];
    if (process.env.NODE_ENV === "development" && !warnedServiceProps.has(name)) {
      warnedServiceProps.add(name);
      console.warn(`NaeilHeader: service profile ignores ${name}; use the shared service composition.`);
    }
  }
  return <HeaderComposition {...props as unknown as LegacyHeaderProps} service={input.service} />;
}

const subscribe = () => () => {};

/** The actual header theme control; reads only the consumer's theme provider. */
export function NaeilHeaderThemeControl({ locale }: { locale: NaeilHeaderLocale }) {
  const copy = useNaeilMessages(locale);
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const dark = mounted && resolvedTheme === "dark";
  return (
    <Button variant="ghost" size="icon" className="size-11 shrink-0" disabled={!mounted}
      aria-label={copy.header.theme[dark ? "switchToLight" : "switchToDark"]}
      onClick={() => setTheme(dark ? "light" : "dark")}>
      {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </Button>
  );
}

/** Shared rendering used by the whole header and legacy site control adapters. */
export function NaeilHeaderLocaleControl({ locale, onLocaleChange }: {
  locale: NaeilHeaderLocale;
  onLocaleChange: (locale: NaeilHeaderLocale) => void;
}) {
  const copy = useNaeilMessages(locale);
  return (
    <Select value={locale} onValueChange={(value) => onLocaleChange(value as NaeilHeaderLocale)}>
      <SelectTrigger data-naeil-focus-id="locale-control" className="h-11 w-auto min-w-20 border-transparent bg-transparent px-2"
        aria-label={copy.header.locale.switchLabel}>
        <SelectValue>{locale.toUpperCase()}</SelectValue>
      </SelectTrigger>
      <SelectContent align="end" data-naeil-chrome="" data-naeil-locale-menu="" lang={locale}>
        {headerLocales.map((value) => (
          <SelectItem key={value} value={value} className="min-h-11" lang={value}>{copy.locale.names[value]}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const NativeLink: NavigationLinkComponent = (props) => <a {...props} />;

/** One complete, opt-in branded composition shared by naeil.dev and applications. */
function HeaderComposition({
  service, locale, resolveHref = path => `https://naeil.dev/${locale}${path === "/" ? "" : path}`,
  brandHref, brandSlot, brandSuffix, statusSlot, appNavigation, brandLinkProps, brandLinkComponent,
  onLocaleChange, authSlot, toolbarSlot, projects, projectsExternal = false, translations, showProjects = true, showBlog = true,
  subNav, currentProjectKey, currentProjectHref, labels, Link = NativeLink,
  currentHref, onNavigate, className, containerClassName, ...props
}: LegacyHeaderProps & { service?: NaeilService }) {
  if (service) { brandSuffix = service; showProjects = false; showBlog = false; }
  const content = useNaeilMessages(locale).header;
  const projectLinks: NavigationLink[] = !showProjects ? [] : projects ?? headerProjects.map(project => {
    const current = project.key === currentProjectKey;
    return {
      id: project.key,
      label: translations?.project(`${project.key}.name`) ?? content.projects[project.key].name,
      description: translations?.project(`${project.key}.description`) ?? content.projects[project.key].description,
      href: current ? currentProjectHref || "/" : resolveHref(project.href),
      external: !current && projectsExternal,
      active: current || currentHref === project.href || currentHref?.startsWith(`${project.href}/`) || currentHref === resolveHref(project.href),
      icon: <span className="naeil-header-project-icon" style={{
        borderColor: `color-mix(in oklch, ${project.accent} 30%, transparent)`,
        backgroundColor: `color-mix(in oklch, ${project.accent} 8%, transparent)`,
      }}>
        {/* Official decorative artwork is referenced, never redistributed by this package. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`https://naeil.dev/images/${project.icon}.png`} alt="" width={24} height={24} />
      </span>,
      badge: project.status === "coming" ? <Badge variant="outline">{translations?.project("status.coming") ?? content.projects.status.coming}</Badge> : undefined,
    };
  });
  const brandDestination = brandHref ?? (service ? "/" : resolveHref("/"));
  const BrandLink = brandLinkComponent ?? Link;
  const { onClick: onBrandClick, ...brandProps } = brandLinkProps ?? {};
  const toolbar = <div data-app-toolbar className="naeil-header-controls"
    data-naeil-chrome={toolbarSlot === undefined ? "" : undefined} lang={toolbarSlot === undefined ? locale : undefined}>
    {toolbarSlot !== undefined ? toolbarSlot : <>
      <NaeilHeaderThemeControl locale={locale} />
      {onLocaleChange && <NaeilHeaderLocaleControl locale={locale} onLocaleChange={onLocaleChange} />}
      {authSlot && <><div aria-hidden="true" className="naeil-header-separator" />{authSlot}</>}
    </>}
  </div>;
  const logo = <Logo variant="horizontal" size={28} className="block" label={null} />;
  const brand = <BrandLink href={brandDestination} data-app-brand aria-label={service ? `.naeil ${service}` : brandSlot == null ? ".naeil" : undefined} {...brandProps}
    onClick={event => {
      onBrandClick?.(event);
      onNavigate?.(event, { id: "brand", href: brandDestination, label: service ? `.naeil ${service}` : ".naeil" });
    }}>
    {brandSlot ?? (brandSuffix ? <>{logo}<span className="naeil-header-brand-suffix">{brandSuffix}</span></> : logo)}
  </BrandLink>;
  return (
    <Navigation {...props} {...(service ? { "data-slot": "navigation", omitEmptyNavigation: true } : {})} data-global-header data-naeil-header data-naeil-chrome="" lang={locale}
      data-naeil-ui-version={uiRelease.version} data-naeil-ui-contract={uiRelease.contractVersion}
      Link={Link} currentHref={currentHref} onNavigate={onNavigate}
      brand={statusSlot != null ? <div className="naeil-header-brand-row">{brand}{statusSlot}</div> : brand}
      items={[
        ...(showProjects ? [{ id: "projects", label: translations?.projects ?? content.nav.projects, items: projectLinks, columns: projectLinks.length > 1 ? 2 as const : 1 as const }] : []),
        ...(showBlog ? [{ id: "blog", label: translations?.blog ?? content.nav.blog, href: resolveHref("/blog"), external: projectsExternal }] : []),
        ...(appNavigation ?? []),
        ...(subNav ?? []).map(item => ({ ...item, id: item.href })),
      ]}
      labels={labels ?? { navigation: content.nav.navigation, menu: content.nav.menu, close: content.nav.closeMenu }}
      toolbar={toolbar} mobileToolbar={toolbar}
      className={cn("naeil-header fixed top-0 w-full", className)}
      containerClassName={cn("naeil-header-frame", containerClassName)}
    />
  );
}
