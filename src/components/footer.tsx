"use client";

import { useTranslations } from "next-intl";
import { Logo } from "./logo";
import { SiteFooter, type SiteFooterProps } from "./ui/site-footer";

export interface FooterProps {
  Link?: React.ComponentType<{
    href: string;
    children: React.ReactNode;
    className?: string;
  }>;
  linksExternal?: boolean;
  brandSlot?: React.ReactNode;
  description?: React.ReactNode;
  groups?: SiteFooterProps["groups"];
  socialSlot?: React.ReactNode;
  meta?: React.ReactNode;
  variant?: SiteFooterProps["variant"];
  className?: string;
  containerClassName?: string;
}

export function Footer({
  Link,
  linksExternal = false,
  brandSlot,
  description,
  groups,
  socialSlot,
  meta,
  variant,
  className,
  containerClassName,
}: FooterProps) {
  const t = useTranslations("footer");
  const destinations = [
    { id: "projects", label: t("projects"), href: "/projects" },
    { id: "blog", label: t("blog"), href: "/blog" },
  ];
  return (
    <SiteFooter
      Link={Link as SiteFooterProps["Link"]}
      className={className}
      containerClassName={containerClassName}
      variant={variant}
      brand={brandSlot ?? <Logo variant="footer" size={20} className="block" />}
      description={description === undefined ? t("tagline") : description}
      groups={
        groups ?? [
          {
            id: "navigation",
            label: t("navigation"),
            links: destinations.map((item) => ({
              ...item,
              href: linksExternal ? `https://naeil.dev${item.href}` : item.href,
              external: linksExternal,
              target: linksExternal ? "_blank" : undefined,
            })),
          },
          {
            id: "social",
            label: t("social"),
            links: [
              {
                id: "github",
                label: "GitHub",
                href: "https://github.com/naeil-dev",
                external: true,
                target: "_blank",
              },
            ],
          },
        ]
      }
      meta={meta}
    >
      {socialSlot === undefined ? (
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/naeil-dev"
            target="_blank"
            rel="noopener noreferrer"
            className="ui-navigation-link ui-focus"
            aria-label="GitHub"
          >
            <GitHubIcon />
          </a>
          <a
            href="https://x.com"
            target="_blank"
            rel="noopener noreferrer"
            className="ui-navigation-link ui-focus"
            aria-label="X"
          >
            <XIcon />
          </a>
        </div>
      ) : (
        socialSlot
      )}
    </SiteFooter>
  );
}

function GitHubIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}
