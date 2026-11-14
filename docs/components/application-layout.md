# Application frame and shared navigation/footer

Product navigation and controlled mobile APIs are available since 0.8.0; shared root reservation is available since 0.9.0. See [release identities and publication status](../package-release.md#publication-and-deployment) for the current published release; hosted Docs and service activation have separate receipts. See [consumer setup](../design/v2-migration.md) for CSS, Tailwind sources and fonts.

## Choose the shared composition first

| Application need | Use |
| --- | --- |
| The actual naeil.dev brand, project catalog and controls | `NaeilHeader` from `@naeil/ui/naeil-header` |
| Owned-service login/account/logout presentation | `NaeilHeaderAccountControl` from `@naeil/ui/naeil-header` in `authSlot` |
| Owned naeil service (0.15.0) | `NaeilServiceShell` + root `NaeilThemeProvider` from `/naeil-shell` or `/naeil-locale/chrome` |
| A different product menu without canonical naeil chrome | `Navigation` from `@naeil/ui/ui` |
| Owned naeil service footer | Included by `NaeilServiceShell`; recorded no-footer screens use `footer={false}` |
| Different product footer or explicit content override | `SiteFooter` from `@naeil/ui/ui` |
| An existing Next/next-intl consumer | Keep its `Nav` / `Footer` adapters |

Choose one composition per application frame. Owned services use the shell; naeil.dev keeps its direct catalog header/footer composition without a `service` and switches its root provider to `NaeilThemeProvider`. Supply menu data, links, route guards, authentication and supported locale state through props/slots. Owned services pass session state and guarded callbacks to the shared account control. Local adapters are appropriate; copies of the menu, responsive sheet, account presentation or footer implementation are not. Extend the shared component when a reusable behavior is missing.

## Width contract

| Region | Default | CSS contract |
| --- | --- | --- |
| Header, main, footer outer frame | Maximum 1600px, including gutters | `--ui-width-frame` |
| Inline gutters | `clamp(16px, 2.4vw, 40px)` | `--ui-frame-gutter` |
| Reading / settings | Maximum 640px | `data-ui-layout="reading"` / `"settings"` |
| Short form | Maximum 480px | `data-ui-layout="short-form"` |
| Multi-step / card-choice input (workflow) | Maximum 896px; fields inside stay within 640/480px | `data-ui-layout="workflow"` |
| List / dashboard / table region | Available space inside the frame, capped at 1600px | `data-ui-layout="list"` |
| Intentionally unrestricted region | Available parent width | `data-ui-layout="fluid"` |

Owned services use the shell, which applies `.ui-app-frame ui-app-main` to main. Generic compositions use `.ui-app-frame` on main. Shared header/footer already apply the frame internally; **do not wrap them in another padded frame**. Put purpose-specific sections inside main. At 1920px the default frame has 1520px available after its 40px gutters. Small screens shrink the frame and reduce gutters to at least 16px. A narrow form must not constrain or move navigation.

Since 0.9.0, the package supplies `html { scrollbar-gutter: stable }` once in `components.css`, reached by `globals.css` or `theme.css + components.css`. Classic mode reserves one browser-sized gutter on short and long pages; overlay mode reserves none. The shared lock correction removes duplicate Radix body right-margin/gap compensation and retains its scroll prevention, focus and nested cleanup. Keep header/main/footer and their ordinary content horizontally stable. Compare matching root policies and measure before any fullPage capture. See the [adopted acceptance contract](https://github.com/naeil-dev/naeil-ui/blob/434b7d07235316097ca3a55265ee02c1422b0cfd/docs/superpowers/specs/2026-10-29-page-root-scrollbar-gutter.md).

For a different document policy, declare this on the root **before first paint**:

```html
<html data-naeil-scrollbar-gutter="auto">
```

This sets `scrollbar-gutter: auto` and disables the shared lock correction together. Apply custom root/scroller CSS only after opting out; changing only gutter CSS leaves an unsupported compensation combination. The default full-page profile has zero body margin/outer padding; no new body reset is supplied. Nonzero body edge spacing, custom scroll locks and react-remove-scroll-bar helper classes need consumer integration or opt-out. Theme-only and JS-only imports do not set root policy. Unsupported engines keep Radix's original compensation.

Import `globals.css`, or the split `theme.css` and `components.css`, without an enclosing named layer (`@import "@naeil/ui/components.css";`, not `@import "@naeil/ui/components.css" layer(ui);`). The package already declares its own layers. Wrapping the import in a named layer lets the dependency's unlayered `--removed-body-scroll-bar-size` win: it can remain 15px in classic mode even though the important margin correction still wins. Elements using that variable can then shift.

After opting out, a plain `@layer base { html { scrollbar-gutter: stable; } }` loses to the package's more specific root attribute selector in the same layer. Write the custom rule outside any layer, for example:

```css
/* The root has data-naeil-scrollbar-gutter="auto"; this policy owns its lock integration. */
html[data-naeil-scrollbar-gutter="auto"] { scrollbar-gutter: stable; }
```

Alternatively, use that attribute selector in `@layer base` after the package import, so equal specificity resolves to the later consumer rule. The shared lock correction stays disabled in either case; the consumer owns matching compensation.

In classic mode, a fixed modal scrim covers the page's available width, leaving the reserved gutter strip undimmed (15px in the measured macOS Chromium profile). This is expected with a reserved root; 0.9.0 leaves the scrim styles unchanged. Overlay mode has no reserved strip. A full-viewport scrim redesign is outside this release.

Frame and control tokens stay unchanged. At 1920px with a 15px classic gutter the centered 1600px frame starts at 152.5px on both short and long pages (overlay: 160px). Japanese signed-out canonical login content at width 320 has 257px inside the 305px classic sheet; its 261px toolbar wraps to 104px. Overlay remains 44px. Preserve all labels, 44px targets and keyboard access. Home Workspace/account and LoginGate/no-login-slot retain their 44px toolbars; this specific F3 profile difference is documented, not a new Home chrome exception.

## Canonical naeil application starter

Owned Next services under `NaeilLocaleProvider` import shell/provider/account chrome from `@naeil/ui/naeil-locale/chrome`. Standalone React uses `/naeil-shell` and `/naeil-header` for account UI. See [the shell API and every CI rule](naeil-shell.md) and [locale setup](naeil-locale.md).

```tsx
import type { ReactNode } from "react";
import { NaeilServiceShell, NaeilThemeProvider, PageHeader,
  type NaeilService, type NaeilServiceShellProps } from "@naeil/ui/naeil-shell";
import { NaeilHeaderAccountControl, type NaeilHeaderAccount } from "@naeil/ui/naeil-header";

// At the application root: <NaeilThemeProvider>{children}</NaeilThemeProvider>.
// Replace the old root theme provider; a nested next-themes provider is ignored.
type ApplicationLayoutProps = {
  children: ReactNode;
  service: NaeilService;
  locale: NaeilServiceShellProps["locale"];
  Link: NaeilServiceShellProps["Link"];
  guard: NaeilServiceShellProps["onNavigate"];
  currentHref: string;
  account: NaeilHeaderAccount;
};
export function ApplicationLayout({ children, service, locale, Link, guard,
  currentHref, account }: ApplicationLayoutProps) {
  return <NaeilServiceShell service={service} locale={locale} Link={Link} onNavigate={guard}
    header={{ currentHref, authSlot: <NaeilHeaderAccountControl locale={locale}
      Link={Link} account={account} /> }}>
    {children}
  </NaeilServiceShell>;
}

<ApplicationLayout service={service} locale="en" Link={GuardedLink} guard={guard}
  currentHref={pathname} account={account}>
  <PageHeader title="Settings" description="Manage your preferences." />
  <section data-ui-layout="settings">{/* Settings form */}</section>
</ApplicationLayout>
```

Run `naeil-ui-conformance --service <id> --framework next|vite --app .` in CI. The shell owns skip link, canonical chrome, fixed main identity and spacing. `footer` accepts only `meta`/`resolveHref` or `false` for recorded screens. No shell class/style/id/data/theme overrides. Use server-safe `naeilIcons` and `naeilDocumentTitle` from `/naeil-locale`; Next `localeMetadata` omits `serviceName`. Serve the three exact brand files; do not rebuild the icon declarations.

`service`, `GuardedLink`, `pathname` and `account` come from the consumer. Use `{ status: 'signed-out', loginHref }` or `{ status: 'signed-in', onLogout, busy, displayName, email }` for `account`; the app handles async cancellation, failure and retry. Keep pending state and the request lock above the shell, since desktop/mobile slot contents mount separately. See the [account contract](naeil-header.md#account-presentation).

`NaeilHeader` is fixed at 65px; the shell supplies main's clearance. Account for that height in consumer sticky areas and focus/anchor scroll margins without adding page padding. The service brand defaults to `/`; footer destinations remain official naeil.dev URLs. Preserve routing/unsaved-change guards using the [header contract](naeil-header.md) and [footer interception contract](naeil-footer.md); a Link adapter must handle absolute official and GitHub destinations as well as local routes. Only pass `onLocaleChange` when the application supports its complete language set.

For owned naeil product navigation, set the shell's matching `service` id and pass only product menu data through `header.appNavigation`; see the [Home profile and host conditions](naeil-header.md#host-typography-and-mobile-handoff-080). `header.mobileOpen`/`header.onMobileOpenChange` can coordinate the sheet with a consumer confirmation, while busy state and request locking remain above the shell. For a different product menu without canonical chrome, use the [generic Navigation composition](navigation.md) with its own main and SiteFooter. Generic Navigation is in document flow by default and needs no fixed-header clearance. The [standalone React example](https://github.com/naeil-dev/naeil-ui/tree/main/examples/react) exercises the compatible standalone header/account/footer APIs; the shell starter above is the owned-service composition.

Without `service`, an empty desktop menu preserves B1's limitation: resizing alone leaves the sheet open; Escape/close/overlay/route change dismiss it. Service profiles dismiss on desktop crossing even with an empty center; the mobile sheet omits empty navigation. Controlled-mobile account callbacks wait for both closing layers and their focus handoff; desktop and uncontrolled-mobile account callbacks retain B1's selection-time behavior. A consumer confirmation owns cancellation focus, including a visible desktop account fallback after resize.

## Deliberate overrides

The owned-service shell prohibits presentation overrides and reserved-selector CSS; request shared changes or record a narrowly reviewed conformance exception. The examples below are for generic/legacy compositions: apply their overrides on a common ancestor or document root so header, main and footer inherit them together. Legacy (no `service`) `containerClassName` overrides still work; the owned-service profile rejects header class/style overrides. Do not give each route its own header cap or gutter.

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
- Owned services use NaeilServiceShell + root NaeilThemeProvider from @naeil/ui/naeil-shell; replace the old root provider. The shell owns header, main, skip link and full footer. naeil.dev keeps its direct catalog composition without service and also uses the root NaeilThemeProvider. Navigation/SiteFooter remain for a different product menu; standalone NaeilHeader/NaeilFooter and Next Nav/Footer compatibility APIs remain available.
- Put NaeilHeaderAccountControl from @naeil/ui/naeil-header in the shell's header.authSlot. Supply real session state, the busy flag and guarded logout callback. Keep pending state and the request lock above the shell so desktop/mobile copies share them; do not copy account/avatar/menu markup.
- For owned Next services under NaeilLocaleProvider, import shell/provider/PageHeader/account from @naeil/ui/naeil-locale/chrome. Read docs/components/naeil-locale.md for the root controller, provider, server routing, message loading and checker. /naeil-header and /naeil-footer remain standalone React adapters.
- Owned services must set the shell's service="abstorm" / "home" / "estimate" / "jev". The DS renders logo → .naeil → lowercase id; no statusSlot, status dot or extra indicator beside the brand.
- Supply only the service's own header.appNavigation tabs; never copy naeil.dev Projects/Blog. Single-screen services leave appNavigation empty; the mobile menu still exposes theme/locale/account without empty navigation.
- No header escape hatches: brandSuffix/brandSlot/toolbarSlot/subNav/brandLinkComponent, catalog/translations overrides, brandLinkProps/mobileFooter, className/containerClassName/style or data-slot/data-naeil-* marker overrides. Keep the shared tab and toolbar styles/states.
- Local wrappers supply menu data, routing/guards, locale and shared auth state. Do not copy the menu, mobile sheet, controls or footer implementation. Extend the shared component for reusable missing behavior.
- Since 0.9.0, shared CSS reserves a stable root gutter through globals or theme+components; opt out on html with data-naeil-scrollbar-gutter="auto" before first paint to disable both root reservation and lock correction. Compare classic/overlay and short/long body content through menus/dialogs; measure before fullPage screenshots.
- Owned-service pages start with PageHeader. CI runs naeil-ui-conformance --service <id> --framework next|vite --app .; follow docs/components/naeil-shell.md for every rule and recorded exceptions. Do not apply ui-app-main/ui-app-frame or shared chrome selectors in app source. Keep purpose widths inside main. footer accepts only meta/resolveHref or false for a recorded no-footer screen; this screen needs no CLI ignore.
- Check the installed package version and CSS before creating a replacement for an apparently missing component.
- Verify actual shared navigation/footer rendering and stable anchors across routes, themes and supported sizes, including signed-out, signed-in, menu, busy, cancellation/failure and retry states. An import or anonymous-only check is not adoption evidence. Record intentional route exceptions.
```

## Adoption checks

For each consumer, record its installed version, layout adapter, shared imports, CSS entrypoints and intentional exceptions. In that consumer's browser CI, check that expected application routes render `[data-slot="navigation"]` and, on footer-bearing routes, `[data-slot="site-footer"]`, and that anchors remain stable between wide lists and narrow forms. For a recorded owned-service `footer={false}` screen, verify the footer is omitted while main and skip link remain. Include narrow/zoomed screens, localized labels and tall content that introduces a scrollbar. Keep table overflow local.

Owned-service checks also verify canonical header/footer destinations, rendered package/contract identity and shared account states. Inspect both signed-in and signed-out chrome, open the account menu, and exercise busy, cancel/failure and retry without duplicate requests when the mobile sheet is reopened or the viewport changes.

A blanket ban on `<header>`, `<nav>` or `<footer>` would also reject valid section landmarks and adapters. Review the root composition and its rendered output instead. This repository checks packed React/Next examples; external applications still need their own upgrades, adapter migrations and CI. Publication and deployment are separate work.

See [canonical footer content and save interception](naeil-footer.md). Version 0.7.2 includes package/contract identity; registry publication, hosted Docs and per-service operational rollout have separate receipts.
