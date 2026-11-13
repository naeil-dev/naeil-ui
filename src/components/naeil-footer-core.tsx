"use client";

import { useNaeilMessages } from "./naeil-messages-context";
import { Logo } from "./logo";
import { SiteFooter, type SiteFooterProps } from "./ui/site-footer";
import type { NavigationLinkComponent } from "./ui/navigation";
import type { NaeilHeaderLocale } from "./naeil-header-data";
import { uiRelease } from "../lib/ui-release";
import { isNaeilService, type NaeilService } from "./naeil-services";
import type { JSX } from "react";

export type NaeilFooterLocale = NaeilHeaderLocale;


export interface NaeilFooterProps extends Omit<SiteFooterProps, "brand" | "description" | "groups"> {
  service?: undefined;
  locale: NaeilFooterLocale;
  /** Only localize/route canonical paths; default destinations use the official origin. */
  resolveHref?: (path: string) => string;
}

const serviceFooterProps = ["service", "locale", "resolveHref", "Link", "onNavigate", "meta"] as const;
/** Owned-service footer: always full, no frame/style/attribute overrides. `meta` holds product status. */
export type NaeilServiceFooterProps = Pick<NaeilFooterProps, Exclude<typeof serviceFooterProps[number], "service">> & { service: NaeilService };

const warnedServiceProps = new Set<string>();
function warnServiceProp(name: string, message: string) {
  let development = false;
  try { development = process.env.NODE_ENV === "development"; } catch { /* no process in the browser */ }
  if (!development || warnedServiceProps.has(name)) return;
  warnedServiceProps.add(name);
  console.warn(message);
}

/** Opt into the owned-service footer without changing the legacy composition. */
export function NaeilFooter(props: NaeilServiceFooterProps): JSX.Element;
export function NaeilFooter(props: NaeilFooterProps): JSX.Element;
export function NaeilFooter(input: NaeilFooterProps | NaeilServiceFooterProps) {
  if (input.service === undefined) return <FooterComposition {...input} />;
  if (!isNaeilService(input.service)) {
    warnServiceProp("service", "NaeilFooter: invalid service; rendering the legacy profile.");
    const legacy = { ...input } as Record<string, unknown>;
    delete legacy.service;
    return <FooterComposition {...legacy as unknown as NaeilFooterProps} />;
  }
  const props: Record<string, unknown> = {};
  for (const [name, value] of Object.entries(input)) {
    if ((serviceFooterProps as readonly string[]).includes(name)) props[name] = value;
    else warnServiceProp(name, `NaeilFooter: service profile ignores ${name}; use the shared service composition.`);
  }
  delete props.service;
  return <FooterComposition {...props as unknown as NaeilFooterProps} />;
}

const NativeLink: NavigationLinkComponent = (props) => <a {...props} />;

/** Canonical content in full/compact density. Product legal/status copy belongs in meta. */
function FooterComposition({
  locale, resolveHref = path => `https://naeil.dev/${locale}${path === "/" ? "" : path}`,
  variant = "full", Link = NativeLink, onNavigate, ...props
}: NaeilFooterProps) {
  const copy = useNaeilMessages(locale).footer;
  const home = { id: "brand", label: ".naeil", href: resolveHref("/") };
  return <SiteFooter {...props} variant={variant} Link={Link} onNavigate={onNavigate}
    data-naeil-footer data-naeil-chrome="" lang={locale} data-naeil-ui-version={uiRelease.version} data-naeil-ui-contract={uiRelease.contractVersion}
    brand={<Link href={home.href} aria-label=".naeil" data-footer-brand className="ui-focus inline-flex min-h-11 items-center"
      onClick={event => onNavigate?.(event, home)}>
      <Logo variant="footer" size={20} label={null} />
    </Link>}
    description={variant === "full" ? copy.description : undefined}
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
