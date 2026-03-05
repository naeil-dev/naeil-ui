"use client";

import { useTranslations } from "next-intl";

interface FooterProps {
  /** Link component from consumer */
  Link?: React.ComponentType<{
    href: string;
    children: React.ReactNode;
    className?: string;
  }>;
  /** Whether links go to naeil.dev (external) or are internal. Default: false */
  linksExternal?: boolean;
}

export function Footer({ Link, linksExternal = false }: FooterProps) {
  const t = useTranslations("footer");

  // Render a navigation link — external <a> or internal Link
  const NavLink = ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => {
    if (linksExternal) {
      return (
        <a
          href={`https://naeil.dev${href}`}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
        >
          {children}
        </a>
      );
    }
    if (Link) {
      return (
        <Link href={href} className={className}>
          {children}
        </Link>
      );
    }
    return (
      <a href={href} className={className}>
        {children}
      </a>
    );
  };

  return (
    <footer className="border-border/40 border-t">
      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-16 sm:flex-row sm:justify-between">
        {/* Left: Brand */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Logo size={20} />
            <span className="text-foreground text-sm font-semibold tracking-tight">
              .naeil
            </span>
          </div>
          <p className="text-muted-foreground max-w-[240px] text-sm leading-relaxed">
            {t("tagline")}
          </p>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/naeil-dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="GitHub"
            >
              <GitHubIcon />
            </a>
            <a
              href="https://x.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="X"
            >
              <XIcon />
            </a>
          </div>
        </div>

        {/* Right: Links */}
        <div className="flex gap-10 sm:gap-16">
          <div className="flex flex-col gap-3">
            <span className="text-foreground text-xs font-medium uppercase tracking-wider">
              {t("navigation")}
            </span>
            <NavLink
              href="/projects"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              {t("projects")}
            </NavLink>
            <NavLink
              href="/blog"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              {t("blog")}
            </NavLink>
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-foreground text-xs font-medium uppercase tracking-wider">
              {t("social")}
            </span>
            <a
              href="https://github.com/naeil-dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              GitHub ↗
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ── Inline Logo (pure SVG) ── */
function Logo({ size = 20 }: { size?: number }) {
  const id = `naeil-footer-logo-${size}`;
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
      <circle
        cx="15"
        cy="16"
        r="3.5"
        fill={`url(#${id}-grad)`}
        mask={`url(#${id})`}
      />
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
