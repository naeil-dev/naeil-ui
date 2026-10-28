# Application frame and shared navigation/footer

The published registry baseline is **@naeil/ui 0.7.2**; the new Home profile is an **unpublished 0.8.0 candidate**. Install exact `@naeil/ui@0.7.2` for published consumers; hosted Docs and service activation have separate receipts. See [release identities and status](../package-release.md#publication-and-deployment) and [consumer setup](../design/v2-migration.md) for CSS, Tailwind sources and fonts.

## Choose the shared composition first

| Application need | Use |
| --- | --- |
| The actual naeil.dev brand, project catalog and controls | `NaeilHeader` from `@naeil/ui/naeil-header` |
| Owned-service login/account/logout presentation | `NaeilHeaderAccountControl` from `@naeil/ui/naeil-header` in `authSlot` |
| Owned naeil service with product menu data (0.8.0 candidate) | Complete `NaeilHeader`, with `appNavigation`, catalog/blog hidden, optional `brandSuffix` and `statusSlot` |
| A different product menu without canonical naeil chrome | `Navigation` from `@naeil/ui/ui` |
| Owned naeil service footer | `NaeilFooter` from `@naeil/ui/naeil-footer` |
| Different product footer or explicit content override | `SiteFooter` from `@naeil/ui/ui` |
| An existing Next/next-intl consumer | Keep its `Nav` / `Footer` adapters |

Choose one header per application frame. Supply menu data, links, route guards, authentication and supported locale state through props/slots. Owned services pass session state and guarded callbacks to the shared account control. Local adapters are appropriate; copies of the menu, responsive sheet, account presentation or footer implementation are not. Extend the shared component when a reusable behavior is missing.

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
import { NaeilHeader, NaeilHeaderAccountControl,
  type NaeilHeaderAccount, type NaeilHeaderProps } from "@naeil/ui/naeil-header";
import { NaeilFooter } from "@naeil/ui/naeil-footer";

// Render inside the existing next-themes ThemeProvider.
// The app owns session state, its guarded logout and pending request lock.
type ApplicationLayoutProps = {
  children: ReactNode;
  locale: NaeilHeaderProps["locale"];
  Link: NaeilHeaderProps["Link"];
  currentHref: string;
  account: NaeilHeaderAccount;
};

export function ApplicationLayout({ children, locale, Link, currentHref,
  account }: ApplicationLayoutProps) {
  return <>
    <NaeilHeader locale={locale} Link={Link} currentHref={currentHref}
      authSlot={<NaeilHeaderAccountControl locale={locale} Link={Link}
        account={account} />} />
    <main className="ui-app-frame"
      style={{ marginTop: "calc(var(--ui-navigation-height) + 1px)" }}>
      {children}
    </main>
    <NaeilFooter locale={locale} variant="compact" Link={Link} />
  </>;
}

<ApplicationLayout locale="en" Link={GuardedLink} currentHref={pathname}
  account={account}>
  <section data-ui-layout="settings">{/* Settings form */}</section>
</ApplicationLayout>
```

`GuardedLink`, `pathname` and `account` come from the consumer. Use `{ status: 'signed-out', loginHref }` or `{ status: 'signed-in', onLogout, busy, displayName, email }` for `account`; the app handles async cancellation, failure and retry. Keep pending state and the request lock above `NaeilHeader`, since desktop/mobile slot contents mount separately. See the [account contract](naeil-header.md#account-presentation).

`NaeilHeader` is fixed; reserve its 65px height and account for it in sticky areas and focus/anchor scroll margins. Default destinations are official naeil.dev URLs. Preserve routing/unsaved-change guards using the [header contract](naeil-header.md) and [footer interception contract](naeil-footer.md); a Link adapter must handle absolute official and GitHub destinations as well as local routes. Only pass `onLocaleChange` when the application supports its complete language set.

For owned naeil product navigation, keep the whole header and pass menu data through `appNavigation`; see the [Home profile and host conditions](naeil-header.md#host-typography-and-mobile-handoff-080-candidate). `mobileOpen`/`onMobileOpenChange` can coordinate the sheet with a consumer confirmation, while busy state and request locking remain above the header. For a different product menu without canonical chrome, use the [generic Navigation composition](navigation.md) with the same main/footer structure. Generic Navigation is in document flow by default and needs no fixed-header clearance. The [standalone React example](https://github.com/naeil-dev/naeil-ui/tree/main/examples/react) exercises the installed header, narrow form and SiteFooter together.

An empty desktop menu preserves B1's limitation: resizing alone leaves the sheet open; Escape/close/overlay/route change dismiss it. Controlled-mobile account callbacks wait for both closing layers and their focus handoff; desktop and uncontrolled-mobile account callbacks retain B1's selection-time behavior. A consumer confirmation owns cancellation focus, including a visible desktop account fallback after resize.

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
- Put NaeilHeaderAccountControl from @naeil/ui/naeil-header in authSlot for owned apps. Supply real session state, the busy flag and guarded logout callback. Keep pending state and the request lock above the header so desktop/mobile copies share them; do not copy account/avatar/menu markup.
- Local wrappers supply menu data, routing/guards, locale, auth and slots. Do not copy the menu, mobile sheet, controls or footer implementation. Extend the shared component for reusable missing behavior.
- Use ui-app-frame on main; navigation/footer own their internal frames. Keep reading/settings/short-form sections inside that frame. Apply frame overrides consistently across routes.
- Check the installed package version and CSS before creating a replacement for an apparently missing component.
- Verify actual shared navigation/footer rendering and stable anchors across routes, themes and supported sizes, including signed-out, signed-in, menu, busy, cancellation/failure and retry states. An import or anonymous-only check is not adoption evidence. Record intentional route exceptions.
```

## Adoption checks

For each consumer, record its installed version, layout adapter, shared imports, CSS entrypoints and intentional exceptions. In that consumer's browser CI, check that expected application routes render `[data-slot="navigation"]` and `[data-slot="site-footer"]`, and that anchors remain stable between wide lists and narrow forms. Include narrow/zoomed screens, localized labels and tall content that introduces a scrollbar. Keep table overflow local.

Owned-service checks also verify canonical header/footer destinations, rendered package/contract identity and shared account states. Inspect both signed-in and signed-out chrome, open the account menu, and exercise busy, cancel/failure and retry without duplicate requests when the mobile sheet is reopened or the viewport changes.

A blanket ban on `<header>`, `<nav>` or `<footer>` would also reject valid section landmarks and adapters. Review the root composition and its rendered output instead. This repository checks packed React/Next examples; external applications still need their own upgrades, adapter migrations and CI. Publication and deployment are separate work.

See [canonical footer content and save interception](naeil-footer.md). Version 0.7.2 includes package/contract identity; registry publication, hosted Docs and per-service operational rollout have separate receipts.

## Shared naeil.dev login (services on `*.naeil.dev`)

Live since 2026-10-22 for naeil.dev, abestimate.naeil.dev and jev.naeil.dev. A new service joins the same login instead of running its own session, relay or password. Home Console (`:2455` on the tailnet) is outside the cookie scope.

- **Session:** read the default `@supabase/ssr` 0.9.0 cookie `sb-dathsxdsaxooifnxjket-auth-token` (and its `.0`, `.1` chunks) with `Domain=.naeil.dev; Path=/; Secure; SameSite=Lax`. Write refreshed chunks with the same options; never set a host-only copy.
- **Identity and access:** on the server call `supabase.auth.getUser()`, then `rpc('access_decision', { p_service_id: '<service>' })` with that session's access token. `allowed` → continue; `not_granted` / `member_inactive` / `service_inactive` → 403 page; terminal session errors → treat as signed out; other failures → 503.
- **Signed out:** redirect (307) to `https://naeil.dev/login?next=<absolute URL>`. Add the service origin to the site's `canonicalRedirect` allowlist (`src/lib/auth/redirect.ts`).
- **Logout:** `signOut({ scope: 'local' })`, then expire every shared cookie chunk with the same Domain/Path. All services see the user as signed out on the next request.
- **Header:** `NaeilHeaderAccountControl` in `authSlot`, linked to the login URL and the logout callback.
- **Onboarding:** register the service id in the central catalog, mark it verified, and grant users from Home Console (`console_set_access`).

Reference code: Estimate `src/server/naeil-shared-session.ts`; site `src/lib/auth/site-session.ts` and `cookie-domain.ts`. Commit `c076391` handles a stale pre-2026-10-17 host-only apex cookie that otherwise breaks the OAuth callback.
