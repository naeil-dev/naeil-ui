# Application frame and shared navigation/footer

This guide targets the **@naeil/ui 0.7.0 candidate**, including the width update approved on 2026-10-16. Use the matching registry release or tested local archive. See [consumer setup](../design/v2-migration.md) for CSS, Tailwind sources and fonts.

## Choose the shared composition first

| Application need | Use |
| --- | --- |
| The actual naeil.dev brand, project catalog and controls | `NaeilHeader` from `@naeil/ui/naeil-header` |
| A product's own menu | `Navigation` from `@naeil/ui/ui` |
| Owned naeil service footer | `NaeilFooter` from `@naeil/ui/naeil-footer` |
| Different product footer or explicit content override | `SiteFooter` from `@naeil/ui/ui` |
| An existing Next/next-intl consumer | Keep its `Nav` / `Footer` adapters |

Choose one header per application frame. Supply menu data, links, route guards, authentication and supported locale state through props/slots. Local adapters are appropriate; copies of the menu, responsive sheet, controls or footer implementation are not. Extend the shared component when a reusable behavior is missing.

## Width contract

| Region | Default | CSS contract |
| --- | --- | --- |
| Header, main, footer outer frame | Maximum 1600px, including gutters | `--ui-width-frame` |
| Inline gutters | `clamp(16px, 2.4vw, 40px)` | `--ui-frame-gutter` |
| Reading / settings | Maximum 640px | `data-ui-layout="reading"` / `"settings"` |
| Short form | Maximum 480px | `data-ui-layout="short-form"` |
| List / dashboard / table region | Available space inside the frame, capped at 1600px | `data-ui-layout="list"` |
| Intentionally unrestricted region | Available parent width | `data-ui-layout="fluid"` |

Use `.ui-app-frame` on main. Shared header/footer already apply the frame internally; **do not wrap them in another padded frame**. Put purpose-specific sections inside main. At 1920px the default frame has 1520px available after its 40px gutters. Small screens shrink the frame and reduce gutters to at least 16px. A narrow form must not constrain or move navigation.

Reserve a consistent scrollbar gutter in the consumer's global CSS when routes can alternate between short and tall content:

```css
html { scrollbar-gutter: stable; }
```

This keeps a centered frame from shifting when a classic scrollbar appears. The document scroll policy belongs to the application; the shared components do not set it implicitly. In a 1920px Chromium viewport with a 15px scrollbar, the frame starts at 152.5px with this policy in both short and tall states. Without it, the start changes from 160px to 152.5px. Overlay-scrollbar platforms may reserve no extra space.

## Canonical naeil application starter

```tsx
import type { ReactNode } from "react";
import { NaeilHeader } from "@naeil/ui/naeil-header";
import { NaeilFooter } from "@naeil/ui/naeil-footer";

// Render inside the existing next-themes ThemeProvider.
// Connect Link/onNavigate, locale and authSlot to real application state.
export function ApplicationLayout({ children }: { children: ReactNode }) {
  return <>
    <NaeilHeader locale="en" />
    <main className="ui-app-frame"
      style={{ marginTop: "calc(var(--ui-navigation-height) + 1px)" }}>
      {children}
    </main>
    <NaeilFooter locale="en" variant="compact" />
  </>;
}

<ApplicationLayout>
  <section data-ui-layout="settings">{/* Settings form */}</section>
</ApplicationLayout>
```

`NaeilHeader` is fixed; reserve its 65px height and account for it in sticky areas and focus/anchor scroll margins. Default destinations are official naeil.dev URLs. Preserve routing/unsaved-change guards using the [header contract](naeil-header.md). Only pass `onLocaleChange` when the application supports its complete language set.

For a different product menu, use the [generic Navigation composition](navigation.md) with the same main/footer structure. Generic Navigation is in document flow by default and needs no fixed-header clearance. The [standalone React example](https://github.com/naeil-dev/naeil-ui/tree/main/examples/react) exercises the installed header, narrow form and SiteFooter together.

## Deliberate overrides

Apply overrides on a common ancestor or document root so header, main and footer inherit them together. Explicit `containerClassName` overrides still work. Do not give each route its own header cap or gutter.

```css
/* Product exception: record why this cap is needed. */
.product-shell {
  --ui-width-frame: 1280px;
  --ui-frame-gutter: 24px;
}
/* An existing focused list can retain its previous content cap. */
.focused-list { --ui-width-list: 1200px; }
```

The new frame/list caps replace the previous 1280px branded header and 1200px list defaults. Remove old `max-w-7xl` or `px-6` frame overrides when adopting the new default. Shared numeric values belong in `src/tokens/ui.json`; regenerate CSS with `pnpm build:tokens`.

## Consumer agent instructions

Put this in the **consumer application's** `AGENTS.md` (or equivalent repository instructions). Installing a package does not automatically load this repository's agent rules.

```markdown
## Shared application layout
- Read the installed @naeil/ui/DESIGN.md and docs/components/application-layout.md before UI layout work.
- Use @naeil/ui/naeil-header for the canonical naeil header; use Navigation from @naeil/ui/ui for a different product menu. Use NaeilFooter from @naeil/ui/naeil-footer for owned service footers; SiteFooter remains the generic primitive. Keep existing Next Nav/Footer compatibility adapters when applicable.
- Local wrappers supply menu data, routing/guards, locale, auth and slots. Do not copy the menu, mobile sheet, controls or footer implementation. Extend the shared component for reusable missing behavior.
- Use ui-app-frame on main; navigation/footer own their internal frames. Keep reading/settings/short-form sections inside that frame. Apply frame overrides consistently across routes.
- Check the installed package version and CSS before creating a replacement for an apparently missing component.
- Verify actual shared navigation/footer rendering and stable anchors across routes, themes and supported sizes. An import alone is not adoption evidence. Record intentional route exceptions.
```

## Adoption checks

For each consumer, record its installed version, layout adapter, shared imports, CSS entrypoints and intentional exceptions. In that consumer's browser CI, check that expected application routes render `[data-slot="navigation"]` and `[data-slot="site-footer"]`, and that anchors remain stable between wide lists and narrow forms. Include narrow/zoomed screens, localized labels and tall content that introduces a scrollbar. Keep table overflow local.

A blanket ban on `<header>`, `<nav>` or `<footer>` would also reject valid section landmarks and adapters. Review the root composition and its rendered output instead. This repository checks packed React/Next examples; external applications still need their own upgrades, adapter migrations and CI. Publication and deployment are separate work.

See [canonical footer content and save interception](naeil-footer.md). 0.7.0 candidate adds package/contract identity; publication and per-service operational rollout are separate.
