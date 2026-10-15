# Navigation and SiteFooter

This guide targets the **0.5.0 release candidate**; final archive verification and publication are pending. These are generic product-menu primitives. Applications inheriting the actual naeil.dev brand/catalog/control composition use the canonical opt-in [NaeilHeader](naeil-header.md) from `@naeil/ui/naeil-header`, with its fixed 65px/1280px frame and official artwork URL dependency.

`Navigation` and `SiteFooter` are React-only exports from `@naeil/ui/ui` (also `@naeil/ui/components/ui/navigation` and `@naeil/ui/components/ui/site-footer`). They require shared theme/components CSS and the normal consumer font/Tailwind setup. They do not import Next, next-intl, authentication, product routes or message dictionaries.

```tsx
import { Navigation, SiteFooter } from "@naeil/ui/ui";

<Navigation
  brand={<a href="/">My product</a>}
  labels={{ navigation: "Main navigation", menu: "Menu", close: "Close menu" }}
  items={[{ id: "ai", label: "AI", items: [
    { id: "dashboard", label: "Dashboard", href: "/", description: "Usage and balance" },
    { id: "keys", label: "API keys", href: "/keys" },
  ] }]}
  currentHref={pathname}
  containerClassName="product-frame"
  toolbar={<ProductControls />}
  onNavigate={(event, item) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    guardedNavigate(item.href);
  }}
/>
<main className="product-frame">
  <section data-ui-layout="settings">{/* narrow form inside stable frame */}</section>
</main>
<SiteFooter
  brand={<ProductBrand />}
  variant="compact"
  meta="Product information"
  containerClassName="product-frame"
/>
```

These are composition snippets: `pathname`, controls, brand, frame and `guardedNavigate` belong to the application. Keep its unsaved-change guard and modified-click behavior. Alternatively supply a `Link` adapter which forwards anchor props, `onClick`, `aria-current`, `className`, target and children. Links explicitly marked `external: true` render native anchors; an absolute URL alone does not bypass the supplied `Link`. `active` overrides exact `currentHref` matching when a route family needs custom matching.

`Navigation` accepts links and one level of labeled groups, optional description/icon/badge, `toolbar`, `mobileToolbar` and `mobileFooter`. Brand is a slot; the component does not invent a home destination or label. Groups use Radix Popover with actual links (Tab navigation, Escape and focus return); they are not action menus. Mobile uses a modal Radix Dialog with scroll locking, trapped focus and a labeled close control. The sheet closes on destination selection, currentHref changes or a return to desktop.

Desktop groups open on mouse hover without moving keyboard focus. Leaving both the trigger and panel closes the hover preview after the standard 180ms token duration, allowing travel across the portal gap. Entering the panel cancels the pending close. Mouse clicks keep the menu open while the pointer remains in the trigger/panel and do not pin it: leaving still dismisses it. Keyboard-activating a hovered trigger takes over the open menu and focuses its first link; subsequent keyboard activation, Escape, outside interaction or navigation dismisses it. A menu being used with keyboard focus remains open when the pointer leaves. Mouse dismissal preserves the previous focus; keyboard activation retains Radix focus return. Touch uses click/tap, and the mobile sheet behavior is unchanged. Reduced motion disables visual transitions while retaining pointer travel tolerance.

Container queries select desktop layout at 48rem of available header content width. Product frame classes control max width and gutters. Header height uses `ui.navigation-height` (64px); toolbar controls should remain short, with volatile counts in the content area. Navigation itself is in document flow; `className` can make it sticky or fixed. Fixed consumers must reserve its height in page composition. A narrow form must not constrain the header. Explicit className/style remain consumer overrides.

`SiteFooter` supports `brand`, `description`, `groups: [{ id, label, links }]`, `meta`, children, `Link`, `containerClassName` and `variant="full|compact"`. Each link group is a labeled navigation landmark. Translated titles, destinations, legal/version text and social links belong to the consumer. A product may place a compact footer in its mobile sheet; a full marketing footer is not mandatory in a dashboard.

Desktop reserves `ui.navigation-brand-width` (160px) for the brand, followed by the existing 16px row gap. With matching frame, viewport and font conditions, `.naeil` and `.naeil Home` therefore start their first menu at the same position. Mobile keeps intrinsic brand width. For a larger custom brand, override `--ui-navigation-brand-width` on the header or shared product frame; use the same value across related compositions and ensure the brand fits the reserved area.

## Compatibility

Menu groups accept `columns?: 1 | 2` (default 1). The candidate sample uses 2 for the website project catalog and 1 for Home's functional menu; the mobile sheet remains one column. Menu widths use `ui.navigation-menu-width` (320px) and `ui.navigation-menu-wide-width` (640px), capped by available space. Group links share a 40px icon area, 16px icon-to-copy gap, title/description hierarchy and badges beside the title. Supply decorated brand artwork through `icon`; the shared package does not own product illustrations. Current group links use background, semibold title and a check indicator, retaining `aria-current` and keyboard focus without underlining descriptions.

Existing `Nav` and `Footer` imports and props remain. `Nav` adapts the canonical NaeilHeader, which renders this generic core; `Footer` composes SiteFooter. `Nav` retains its fixed positioning and max-w-7xl site frame; menus gain keyboard/focus support, an opaque shared surface, 16px labels and a 64px minimum row. Its `projects` prop replaces the old default inventory; the old naeil projects remain the fallback for existing consumers. Optional `labels`, `className` and `containerClassName` support localization and frame overrides.

`Footer` adds `brandSlot`, `description`, `groups`, `socialSlot`, `meta`, `variant`, `className` and `containerClassName`. Use empty groups or null description/socialSlot to omit defaults. Existing linksExternal behavior remains for the default naeil links. Custom groups define their own absolute destinations and external/target settings.

`Nav`/`Footer` continue to need Next/next-intl as documented. React-only services use this core for their own product menus or `/naeil-header` for the canonical branded composition. ThemeProvider, ThemeToggleIcon, LocaleSwitcher and Logo remain available through their existing React-safe deep imports. Reusing controls does not synchronize theme/language/authentication between origins.

Storybook: `UI/Navigation` (website, Home composition, long labels), `UI/SiteFooter` (full and compact). Naeil Home is a synthetic composition based on the inspected live menu, not proof of a deployed migration. The repository task note `docs/design/navigation-footer-integration.md` tracks rollout; it is not included in the npm package.
