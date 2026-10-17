"use client";

import * as React from "react";
import { cn } from "../../lib/utils";
import type { NavigationLink, NavigationLinkComponent, NavigationProps } from "./navigation";

export interface SiteFooterProps extends React.ComponentPropsWithoutRef<"footer"> {
  brand?: React.ReactNode;
  description?: React.ReactNode;
  groups?: Array<{ id: string; label: string; links: NavigationLink[] }>;
  Link?: NavigationLinkComponent;
  meta?: React.ReactNode;
  containerClassName?: string;
  variant?: "full" | "compact";
  /** Called for every group link, including native external anchors. Preserve modified clicks. */
  onNavigate?: NavigationProps["onNavigate"];
}

/** Product content and translations belong to the consumer, including legal copy. */
export function SiteFooter({
  brand,
  description,
  groups = [],
  Link,
  meta,
  children,
  containerClassName,
  className,
  variant = "full",
  onNavigate,
  ...props
}: SiteFooterProps) {
  return (
    <footer
      data-slot="site-footer"
      data-variant={variant}
      className={cn("ui-site-footer", className)}
      {...props}
    >
      <div className={cn("ui-site-footer-frame", containerClassName)}>
        <div className="ui-site-footer-brand">
          {brand}
          {description && (
            <div className="ui-site-footer-description">{description}</div>
          )}
          {children}
        </div>
        {groups.map((group) => (
          <nav key={group.id} aria-label={group.label}>
            <h2 className="ui-site-footer-label">{group.label}</h2>
            {group.links.map((item) => {
              const Component = !item.external && Link ? Link : "a";
              return (
                <Component
                  key={item.id}
                  href={item.href}
                  target={item.target}
                  rel={
                    item.target === "_blank" ? "noopener noreferrer" : undefined
                  }
                  className="ui-site-footer-link ui-focus"
                  onClick={(event) => onNavigate?.(event, item)}
                >
                  {item.label}
                </Component>
              );
            })}
          </nav>
        ))}
        {meta && <div className="ui-site-footer-meta">{meta}</div>}
      </div>
    </footer>
  );
}
