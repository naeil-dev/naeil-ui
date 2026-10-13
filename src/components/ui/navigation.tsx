"use client";

import * as React from "react";
import { Dialog, Popover } from "radix-ui";
import { Check, ChevronDown, Menu, X } from "lucide-react";
import { cn } from "../../lib/utils";

export type NavigationLinkProps = React.ComponentPropsWithoutRef<"a"> & {
  href: string;
};
export type NavigationLinkComponent = React.ComponentType<NavigationLinkProps>;
export interface NavigationLink {
  id: string;
  label: string;
  href: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  external?: boolean;
  target?: React.HTMLAttributeAnchorTarget;
  active?: boolean;
}
export interface NavigationGroup {
  id: string;
  label: string;
  items: NavigationLink[];
  /** Desktop menu layout; the mobile sheet always uses one column. */
  columns?: 1 | 2;
}
export type NavigationItem = NavigationLink | NavigationGroup;

export interface NavigationProps extends Omit<
  React.ComponentPropsWithoutRef<"header">,
  "children" | "onSelect"
> {
  brand: React.ReactNode;
  items: NavigationItem[];
  /** Translated landmark/dialog/close labels are supplied by the application. */
  labels: { navigation: string; menu: string; close: string };
  Link?: NavigationLinkComponent;
  currentHref?: string;
  toolbar?: React.ReactNode;
  mobileToolbar?: React.ReactNode;
  mobileFooter?: React.ReactNode;
  /** Use the same product-owned frame class on header, footer and main. */
  containerClassName?: string;
  /** Preserve modified clicks; applications may preventDefault for client routing/guards. */
  onNavigate?: (
    event: React.MouseEvent<HTMLAnchorElement>,
    item: NavigationLink,
  ) => void;
}

const NativeLink = React.forwardRef<HTMLAnchorElement, NavigationLinkProps>(
  function NativeLink(props, ref) {
    return <a ref={ref} {...props} />;
  },
);

function DesktopGroup({
  item,
  active,
  open,
  anotherGroupOpen,
  onOpenChange,
  children,
}: {
  item: NavigationGroup;
  active: boolean;
  open: boolean;
  anotherGroupOpen: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}) {
  const hoverOpened = React.useRef(false);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const panel = React.useRef<HTMLDivElement>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const pointerType = React.useRef("");
  const cancelClose = React.useCallback(() => {
    clearTimeout(closeTimer.current);
  }, []);

  React.useEffect(() => {
    // Also cancel on route changes, responsive dismissal and unmount.
    return cancelClose;
  }, [open, cancelClose]);

  const leave = (event: React.PointerEvent) => {
    if (event.pointerType !== "mouse") return;
    cancelClose();
    // A short grace bridges the space between the trigger and portalled panel.
    // This is interaction tolerance, retained when reduced motion is enabled.
    const duration = getComputedStyle(event.currentTarget)
      .getPropertyValue("--ui-motion-standard")
      .trim();
    closeTimer.current = setTimeout(
      () => {
        if (hoverOpened.current) onOpenChange(false);
      },
      parseFloat(duration) * (duration.endsWith("ms") ? 1 : 1000),
    );
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        cancelClose();
        if (next) hoverOpened.current = false;
        onOpenChange(next);
      }}
    >
      <Popover.Trigger
        ref={trigger}
        className="ui-navigation-link ui-focus"
        data-active={active || undefined}
        onPointerEnter={(event) => {
          if (event.pointerType !== "mouse") return;
          cancelClose();
          if (!open) {
            hoverOpened.current = true;
            onOpenChange(true);
          }
        }}
        onPointerLeave={leave}
        onPointerDown={(event) => {
          pointerType.current = event.pointerType;
        }}
        onClick={(event) => {
          if (event.detail > 0 && pointerType.current === "mouse") {
            // Clicking does not pin a mouse menu. Keep its leave-to-dismiss
            // behavior, including a click after Escape without pointer re-entry.
            event.preventDefault();
            cancelClose();
            hoverOpened.current = true;
            onOpenChange(true);
            return;
          }
          if (open && hoverOpened.current) {
            // Keyboard/touch activation takes over a hover preview.
            event.preventDefault();
            hoverOpened.current = false;
            cancelClose();
            panel.current?.querySelector<HTMLAnchorElement>("a[href]")?.focus();
          }
        }}
      >
        {item.label}
        <ChevronDown size={16} aria-hidden="true" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          ref={panel}
          data-slot="navigation-popover"
          className="ui-navigation-popover ui-popup"
          data-columns={item.columns ?? 1}
          align="start"
          sideOffset={8}
          aria-label={item.label}
          onPointerEnter={cancelClose}
          onPointerLeave={leave}
          onFocusCapture={() => {
            hoverOpened.current = false;
            cancelClose();
          }}
          onOpenAutoFocus={(event) => {
            if (hoverOpened.current) event.preventDefault();
          }}
          onCloseAutoFocus={(event) => {
            if (hoverOpened.current || anotherGroupOpen) event.preventDefault();
          }}
          onInteractOutside={(event) => {
            // The trigger belongs to this interaction. Radix otherwise records
            // its pointerdown as an outside dismissal and skips focus return.
            if (trigger.current?.contains(event.target as Node))
              event.preventDefault();
          }}
        >
          <nav aria-label={item.label} className="ui-navigation-menu-grid">
            {children}
          </nav>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function Navigation({
  brand,
  items,
  labels,
  Link = NativeLink,
  currentHref,
  toolbar,
  mobileToolbar,
  mobileFooter,
  containerClassName,
  onNavigate,
  className,
  ...props
}: NavigationProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [openGroup, setOpenGroup] = React.useState<string | null>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const desktop = React.useRef<HTMLElement>(null);
  React.useEffect(() => {
    setMobileOpen(false);
    setOpenGroup(null);
  }, [currentHref]);
  // Container width, rather than viewport width, determines which navigation is visible.
  React.useEffect(() => {
    const element = desktop.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (element.getBoundingClientRect().width > 0) setMobileOpen(false);
      else setOpenGroup(null);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const active = (item: NavigationLink) =>
    item.active ?? (!item.external && item.href === currentHref);
  function link(item: NavigationLink, close?: () => void, entry = false) {
    const Component = item.external ? NativeLink : Link;
    return (
      <Component
        key={item.id}
        href={item.href}
        target={item.target}
        rel={item.target === "_blank" ? "noopener noreferrer" : undefined}
        aria-current={active(item) ? "page" : undefined}
        className={cn(
          "ui-navigation-link ui-focus",
          entry && "ui-navigation-entry",
        )}
        onClick={(event) => {
          onNavigate?.(event, item);
          if (
            event.button === 0 &&
            !event.metaKey &&
            !event.ctrlKey &&
            !event.shiftKey &&
            !event.altKey
          )
            close?.();
        }}
      >
        {item.icon && (
          <span className="ui-navigation-icon" aria-hidden="true">
            {item.icon}
          </span>
        )}
        <span className="ui-navigation-copy">
          <span className="ui-navigation-title">
            <span>{item.label}</span>
            {item.badge}
            {entry && active(item) && (
              <Check size={16} className="shrink-0" aria-hidden="true" />
            )}
          </span>
          {item.description && (
            <span className="ui-navigation-description">
              {item.description}
            </span>
          )}
        </span>
      </Component>
    );
  }

  return (
    <header
      data-slot="navigation"
      className={cn("ui-navigation", className)}
      {...props}
    >
      <div className={cn("ui-navigation-frame", containerClassName)}>
        <div className="ui-navigation-row">
          <div className="ui-navigation-brand">{brand}</div>
          <nav
            ref={desktop}
            aria-label={labels.navigation}
            className="ui-navigation-desktop"
          >
            {items.map((item) =>
              "items" in item ? (
                <DesktopGroup
                  key={item.id}
                  item={item}
                  active={item.items.some(active)}
                  open={openGroup === item.id}
                  anotherGroupOpen={openGroup !== null && openGroup !== item.id}
                  onOpenChange={(open) =>
                    setOpenGroup((current) =>
                      open ? item.id : current === item.id ? null : current,
                    )
                  }
                >
                  {item.items.map((child) =>
                    link(child, () => setOpenGroup(null), true),
                  )}
                </DesktopGroup>
              ) : (
                link(item)
              ),
            )}
          </nav>
          <div className="ui-navigation-toolbar">{toolbar}</div>
          <Dialog.Root open={mobileOpen} onOpenChange={setMobileOpen}>
            <Dialog.Trigger
              ref={trigger}
              className="ui-navigation-toggle ui-navigation-link ui-focus"
              aria-label={labels.menu}
            >
              <Menu aria-hidden="true" size={20} />
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay
                data-slot="navigation-overlay"
                className="ui-navigation-overlay ui-popup"
              />
              <Dialog.Content
                data-slot="navigation-sheet"
                className="ui-navigation-sheet ui-popup"
                aria-describedby={undefined}
                onCloseAutoFocus={(event) => {
                  if (
                    trigger.current &&
                    trigger.current.getBoundingClientRect().width === 0
                  ) {
                    event.preventDefault();
                    desktop.current
                      ?.querySelector<HTMLElement>("button, a")
                      ?.focus();
                  }
                }}
              >
                <div className="ui-navigation-sheet-heading">
                  <Dialog.Title className="text-xl font-semibold">
                    {labels.menu}
                  </Dialog.Title>
                  <Dialog.Close
                    className="ui-navigation-link ui-focus"
                    aria-label={labels.close}
                  >
                    <X size={20} aria-hidden="true" />
                  </Dialog.Close>
                </div>
                <nav
                  aria-label={labels.navigation}
                  className="ui-navigation-mobile-links"
                >
                  {items.map((item) =>
                    "items" in item ? (
                      <section key={item.id} aria-label={item.label}>
                        <h3 className="ui-navigation-group-label">
                          {item.label}
                        </h3>
                        {item.items.map((child) =>
                          link(child, () => setMobileOpen(false), true),
                        )}
                      </section>
                    ) : (
                      link(item, () => setMobileOpen(false))
                    ),
                  )}
                </nav>
                {(mobileToolbar ?? toolbar) && (
                  <div className="ui-navigation-mobile-toolbar">
                    {mobileToolbar ?? toolbar}
                  </div>
                )}
                {mobileFooter && (
                  <div className="ui-navigation-mobile-footer">
                    {mobileFooter}
                  </div>
                )}
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      </div>
    </header>
  );
}
