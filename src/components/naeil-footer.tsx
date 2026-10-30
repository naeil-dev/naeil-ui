"use client";

import { Logo } from "./logo";
import { SiteFooter, type SiteFooterProps } from "./ui/site-footer";
import type { NavigationLinkComponent } from "./ui/navigation";
import type { NaeilHeaderLocale } from "./naeil-header-content";
import { uiRelease } from "../lib/ui-release";

export type NaeilFooterLocale = NaeilHeaderLocale;

const content = {
  en: { navigation: "Navigation", projects: "Projects", blog: "Blog", social: "Social" },
  ko: { navigation: "네비게이션", projects: "프로젝트", blog: "블로그", social: "소셜" },
  ja: { navigation: "ナビゲーション", projects: "プロジェクト", blog: "ブログ", social: "ソーシャル" },
} as const;

export interface NaeilFooterProps extends Omit<SiteFooterProps, "brand" | "description" | "groups"> {
  locale: NaeilFooterLocale;
  /** Only localize/route canonical paths; default destinations use the official origin. */
  resolveHref?: (path: string) => string;
}

const NativeLink: NavigationLinkComponent = (props) => <a {...props} />;

/** Canonical content in full/compact density. Product legal/status copy belongs in meta. */
export function NaeilFooter({
  locale, resolveHref = path => `https://naeil.dev/${locale}${path === "/" ? "" : path}`,
  variant = "full", Link = NativeLink, onNavigate, ...props
}: NaeilFooterProps) {
  const copy = content[locale];
  const home = { id: "brand", label: ".naeil", href: resolveHref("/") };
  return <SiteFooter {...props} variant={variant} Link={Link} onNavigate={onNavigate}
    data-naeil-footer data-naeil-chrome="" lang={locale} data-naeil-ui-version={uiRelease.version} data-naeil-ui-contract={uiRelease.contractVersion}
    brand={<Link href={home.href} aria-label=".naeil" data-footer-brand className="ui-focus inline-flex min-h-11 items-center"
      onClick={event => onNavigate?.(event, home)}>
      <Logo variant="footer" size={20} label={null} />
    </Link>}
    description={variant === "full" ? "Tomorrow starts here." : undefined}
    groups={[
      { id: "navigation", label: copy.navigation, links: [
        { id: "projects", label: copy.projects, href: resolveHref("/projects") },
        { id: "blog", label: copy.blog, href: resolveHref("/blog") },
      ] },
      { id: "social", label: copy.social, links: [
        // All canonical destinations use the consumer Link, including this absolute URL.
        { id: "github", label: "GitHub", href: "https://github.com/naeil-dev", target: "_blank" },
      ] },
    ]}
  />;
}
