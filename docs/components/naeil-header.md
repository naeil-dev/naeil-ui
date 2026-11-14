# NaeilHeader — branded whole-header composition

Product navigation and controlled mobile APIs are available since 0.8.0; shared root reservation is available since 0.9.0. See [release identities and publication status](../package-release.md#publication-and-deployment) for the current published release; hosted Docs and service activation have separate receipts.

For new owned-service adoption, use [NaeilServiceShell with root NaeilThemeProvider](naeil-shell.md); the shell composes this header and the canonical footer. Pass product menu/auth/locale state through `header` and shared routing guards through the shell. naeil.dev keeps its direct no-service catalog composition. The examples and API below document the supported standalone/legacy header as well as the service-header profile reused by the shell.

```tsx
import { NaeilHeader, NaeilHeaderAccountControl } from '@naeil/ui/naeil-header';
import '@naeil/ui/globals.css';

// Standalone catalog example under the root NaeilThemeProvider:
<NaeilHeader locale="ja" Link={GuardedLink} currentHref={pathname}
  authSlot={<NaeilHeaderAccountControl locale="ja" Link={GuardedLink}
    account={authenticated
      ? { status: 'signed-in', onLogout: () => { void guardedLogout(); }, busy: leaving }
      : { status: 'signed-out', loginHref: '/login' }} />} />
```

Load shared styles once. Apps that already own their Tailwind/base styles may import both `@naeil/ui/theme.css` and `@naeil/ui/components.css` instead of globals. Tailwind 4 consumers must register the installed `dist` with `@source`; see [setup](../design/v2-migration.md#시작하기).

The module owns the brand, single-project naeil-ui catalog and header-only translations, project artwork references/status, theme/optional locale controls, toolbar order, fixed positioning, branded frame and Radix desktop/mobile behavior. Do not copy menu JSX or styles into a consumer. The website's `NavWrapper` imports this same module and supplies locale/router/auth state; estimate consumes the built package entry. Legacy `Nav` retains its Next/next-intl compatibility API.

## Consumer contract

Owned services and naeil.dev replace the existing root provider with `NaeilThemeProvider`; nesting it inside another next-themes provider does not apply its policy. Existing standalone/legacy next-themes integration remains compatible. Consumers supply routing/dirty-save guards, current locale and real authentication behavior. Default destinations point to `https://naeil.dev/{locale}`; the site's localized Link instead uses `resolveHref={path => path}`. A supplied `Link` handles default official destinations, including cross-origin URLs. `onNavigate` can intercept brand and menu links; honor modified clicks and target behavior. Explicit `external: true` project overrides and `projectsExternal` use native anchors, so intercept them with `onNavigate` when a dirty guard is required.

Only provide `onLocaleChange` when the application's interface supports all three canonical locales (`en`, `ko`, `ja`). Omitting it removes the locale control; the component does not create application translations or shared preferences. `authSlot` uses `NaeilHeaderAccountControl` in owned applications: a shared 44px neutral account trigger and localized Radix logout menu. Consumers supply their real session state/callbacks, not alternative account markup. The legacy slot remains public for deliberate compatibility overrides. It does not integrate site SSO, share credentials or create accounts. Theme preferences remain consumer-origin state. Without a working provider, rendering alone does not establish theme switching.

| Prop | Contract |
| --- | --- |
| `service` | Opt-in `NaeilService`: `abstorm`, `home`, `estimate`, `jev`; exported readonly `naeilServices` lists these ids. Owns lowercase suffix/name, local `/` brand default and product-only tabs. The same entries export `naeilServiceName(service?)` (`.naeil` / `.naeil <service>`) and `naeilDocumentTitle(service?, page?)` (`Page — .naeil <service>`) for browser titles (0.14.0); `/naeil-header` and `/naeil-locale/chrome` are client modules, so Next server code imports them from `@naeil/ui/naeil-locale` instead. |
| `locale` | Required `en`, `ko` or `ja`; selects header-only copy. |
| `resolveHref` | Resolves canonical unlocalized paths; defaults to the official localized site. |
| `Link`, `currentHref`, `onNavigate` | Routing adapter, active destination and navigation interception inherited from Navigation. |
| `onLocaleChange` | Optional supported-language callback; omit for a single-language application. |
| `authSlot` | Canonical `NaeilHeaderAccountControl`, with consumer-owned auth state/actions. Legacy arbitrary markup remains supported. |
| `brandHref`, `brandSlot`, `brandLinkProps`, `brandLinkComponent` | Explicit brand destination/content/anchor overrides; default accessible brand name is `.naeil`. |
| `projects`, `projectsExternal`, `showProjects`, `showBlog` | Legacy catalog/visibility/native-link overrides; defaults use the complete canonical catalog. |
| `appNavigation` (0.8.0) | `NavigationItem[]` passed unchanged after catalog/blog and before flat `subNav`. The service profile supplies only product tabs; owned services pass them as the shell's `header.appNavigation`. |
| `brandSuffix` (0.8.0) | Product qualifier inside the brand link; the package owns its 14px type, 4px gap and optical alignment. Ignored when `brandSlot` replaces the complete content. Set `brandLinkProps["aria-label"]` for a product name. |
| `statusSlot` (0.8.0) | Exactly once, outside and 8px after the brand link at every width. The consumer owns the content and accessible status. No wrapper is added when omitted. |
| `mobileOpen`, `onMobileOpenChange` (0.8.0) | Controlled/uncontrolled sheet state, also on generic Navigation. Omit `mobileOpen` for internal state; a callback alone observes it. Accepted transitions notify once. In controlled mode callbacks request a change against the committed prop, so another close request is reported if the parent rejects or delays the previous one; an external prop update emits no request. Route changes, ordinary links, close/overlay/Escape dismiss. Desktop crossing dismisses when the desktop navigation gains width; without `service`, an empty menu retains B1's open sheet until Escape/close/overlay/route change. Modified/middle clicks preserve it; nested menus consume the first Escape. |
| `subNav`, `currentProjectKey`, `currentProjectHref` | Legacy extra links and current-project destination. |
| `translations`, `labels` | Legacy header/project lookup overrides and navigation/menu/close accessible labels. |
| `toolbarSlot` | Replaces the complete default theme/locale/auth toolbar. |
| `mobileFooter`, `className`, `containerClassName` | Inherited mobile slot and style overrides; recheck frame/behavior after changes. |

Standard header attributes and appropriate inherited [Navigation props](navigation.md) remain available. Omitting `service` preserves all legacy overrides and output.

## Owned-service profiles

| Profile | Left brand | Center | Brand default |
| --- | --- | --- | --- |
| naeil.dev (no `service`) | Logo + `.naeil` | Projects / Blog | Official localized site |
| `service="abstorm"` | Logo + `.naeil` + `abstorm` | Service's own tabs | `/` |
| `service="home"` | Logo + `.naeil` + `home` | Service's own tabs | `/` |
| `service="estimate"` | Logo + `.naeil` + `estimate` | Service's own flat/grouped tabs | `/` |
| `service="jev"` | Logo + `.naeil` + `jev` | Empty for this single-screen service | `/` |

The accessible brand name is `.naeil <id>`. `brandHref` can override the local destination. No status dot or extra brand indicator is allowed. The DS fixes tab shape, position, size, spacing and all interaction states. Theme / locale / account retain the canonical presentation; the app supplies routing/guards, locale and shared account state.

`NaeilHeaderProps` remains an extensible legacy interface with `service?: undefined`; `NaeilServiceHeaderProps` is the strict service type. Both are exported from the standalone and provider chrome entries. The component overloads accept the strict service type first and the legacy interface last, so `ComponentProps<typeof NaeilHeader>` remains `NaeilHeaderProps` for existing wrappers. Type service props explicitly as `NaeilServiceHeaderProps`.

The `service` discriminated branch rejects `brandSuffix`, `statusSlot`, `brandSlot`, `toolbarSlot`, `subNav`, `brandLinkComponent`, `projects`, `projectsExternal`, `showProjects`, `showBlog`, `translations`, `className` and `containerClassName`. It also rejects inline `style`, `brandLinkProps`, `mobileFooter` and the inherited empty-navigation policy override. JavaScript/cast attempts are ignored, with one warning per prop name in development and none in production. Root `data-slot`, `data-global-header` and `data-naeil-*` markers cannot be replaced. Root attributes such as `id`, `aria-*` and `dir`, plus the consumer `Link` and `authSlot` markup, remain consumer-owned and must not be used to restyle shared chrome. Labels, currentHref/onNavigate, brandHref, appNavigation, locale callbacks and controlled mobile state remain available. Unknown, empty or null runtime service values fall back to the legacy profile without a `service` attribute or stripped legacy props, with one development-only warning.

`statusSlot`, `brandSuffix`, `brandSlot`, `toolbarSlot`, `subNav` and `brandLinkComponent` are deprecated for owned services and retained for legacy compatibility. They remain functional without `service`.

With no `appNavigation`, the desktop center stays empty and the toolbar remains right-aligned. The mobile menu button stays available; its sheet contains the toolbar without an empty navigation landmark/list. Desktop crossing restores focus to a visible toolbar control when the center has no links/buttons. Resizing to desktop dismisses a service sheet by observing the desktop toolbar, including an empty-center profile. Legacy empty-menu headers retain the B1 resize exception described below.

## Standalone theme and locale controls

`NaeilHeaderThemeControl` and `NaeilHeaderLocaleControl` are public exports from `@naeil/ui/naeil-header` and `@naeil/ui/naeil-locale/chrome`. The latter uses the shared provider’s selected messages; the standalone entry supplies its own common dictionaries. Prefer the complete header’s default toolbar.

- `NaeilHeaderThemeControl({ locale })` accepts `en | ko | ja`, reads the consumer’s next-themes provider and toggles its resolved light/dark theme. The localized 44px icon button is disabled until mount.
- `NaeilHeaderLocaleControl({ locale, onLocaleChange })` requires the same locale union and a `(locale) => void` callback. It renders the shared three-language Select; routing, persistence and supported application translations belong to the consumer.

See [the locale runtime](naeil-locale.md) before using provider-backed chrome in an owned Next service.

## Account presentation

`NaeilHeaderAccountControl` accepts `locale`, optional routing `Link`, and `account`:

- `{ status: 'signed-out', loginHref }` renders the shared login link through that adapter.
- `{ status: 'signed-in', onLogout, busy?, displayName?, email? }` renders the same account icon in every app; optional identity appears only inside its menu. There is no shared identity or avatar fetch.
- `onLogout` starts the app's guarded action; the app handles async errors, cancellation, session endpoints and redirects. `busy` disables the menu action while keeping the trigger available, with `aria-busy`, for inspection and focus restoration. Cancel/failure clears busy and permits retry.
- Desktop and uncontrolled-mobile account controls retain B1: `onLogout` runs during selection, then Radix closes the account menu and restores its trigger; the mobile sheet may remain open during a failed action. A controlled mobile sheet instead defers the callback until its account menu and sheet finish closing, focuses a surviving visible header control, and invokes the callback once. Reopening the sheet or account menu, a new sheet dismissal request, or unmounting the header cancels the queued action. The account menu uses the existing Radix overlay/inert implementation.

While a controlled parent keeps `mobileOpen=true`, its rejection and delayed acceptance are indistinguishable. A later `false` prop without an intervening cancellation accepts the queued selection; assigning `true` when it is already `true` creates no observable reopen transition.

Keep errors visible in the consumer's recovery UI or toast. The package never calls an authentication endpoint. Compare signed-in and signed-out render states separately; anonymous-only acceptance cannot establish authenticated parity. `AccountStates` is a synthetic Storybook example for pending/cancel/error/retry.

Own pending state and the in-flight request lock above the shell (or the standalone `NaeilHeader`). Navigation mounts desktop and mobile slot contents separately, and closing the mobile sheet unmounts its copy. Pass the same controller to both through `header.authSlot` (standalone: `authSlot`); test reopening the sheet and changing viewport during a pending request. State inside an independently mounted slot component can enable duplicate requests.

## Frame and content clearance

The fixed header is 65px: the current 64px navigation token plus a 1px border. The owned-service shell supplies main's clearance, frame classes and page rhythm; do not add them in app source or override the frame through ancestors/reserved selectors. Put purpose-specific `data-ui-layout` sections inside its main. Consumer sticky regions and focus/anchor scroll margins still account for the fixed header.

Standalone/legacy compositions clear main with `calc(var(--ui-navigation-height) + 1px)` and apply `ui-app-frame` themselves. Header, main and footer share a 1600px maximum outer frame with responsive `clamp(16px, 2.4vw, 40px)` gutters; header/footer apply their internal frames, so do not wrap them in another padded frame. Deliberate `--ui-width-frame` / `--ui-frame-gutter` overrides remain available to generic/legacy compositions on a common ancestor. Remove old `max-w-7xl` or `px-6` overrides to adopt the defaults. This width update supersedes the previous 1280px/24px branded frame. See the [application layout starter](application-layout.md).

## Artwork and package boundary

The 0.7.2 default catalog contains naeil-ui and references only `https://naeil.dev/images/whale.png`. Rendering that decorative image requires network access to the official origin. Its bytes are not redistributed in npm; [third-party notices](../../THIRD_PARTY_NOTICES.md) retain unresolved artwork provenance and redistribution limits. Brand marks are not relicensed by the repository MIT license. Captions and links remain usable when images fail.

This entry requires no Next.js, next-intl, site session/auth backend, full application message catalog, hero or site public folder. Generic `/ui` imports do not import its catalog. Storybook provides **Brand / NaeilHeader / Docs, Usage, JapaneseApplication, AccountStates, Abstorm, Home, Estimate, Jev, ReferenceFull, ReferenceCompact**; the Japanese example omits unsupported locale switching and supplies application state to the shared account control. Local examples do not establish hosted deployment.

Verify actual packed consumption, Storybook behavior and rendered comparisons at matching viewport/language/theme. Source imports alone do not prove visual parity. Native Safari, devices, assistive technology, full OAuth and unresolved accessibility observations retain the [documented support limits](../design/public-ui-support.md).

The owned-service [shell](naeil-shell.md) pairs this header with the full [NaeilFooter](naeil-footer.md); standalone pairing remains supported for compatibility. The 0.7.2 source is `40a3928e24cd2f0141be3e605eed0a75260938fd`. Both 0.7.2 and 0.8.0 emit package version and chrome contract `1`; archive identities, maintained guidance and hosted Docs remain separate evidence.


## Host typography and mobile handoff (0.8.0)

Import either `globals.css` or `theme.css` plus `components.css`, and register the installed `dist` with Tailwind `@source`. Header/footer roots and the actual navigation popover, sheet, account menu and locale menu Content elements carry `data-naeil-chrome` and `lang=locale`; the locale Select Content also carries `data-naeil-locale-menu`. Generic Navigation/Select/DropdownMenu do not acquire these markers. Do not identify chrome by option text or by the presence of a Japanese body option.

Marker-and-language-scoped final typography uses a package-local font stack and explicit sizes, weights, line heights, letter spacing and smoothing. It supports a host `@theme` / `@theme inline` with different text tokens/font stacks and unlayered element/role rules at Home's specificity, including `(0,3,0)` `:root[attr] [role="menuitem"]` and Home's `[role="dialog"] p` rules. Host rules can load before or after either supported package CSS entry; owned text declarations outrank them. Rules with `!important` or IDs aimed at chrome are outside this guarantee. Ordinary body Select/menu/dialog typography remains host-owned; custom slot content remains consumer-owned. Font files are still consumer-supplied; Japanese chrome and portals use Noto Sans JP even when the document language differs.

A controlled mobile sheet defers its shared account action until the account menu and sheet finish closing and restore a surviving header control. The consumer still owns dirty state, confirmation, logout, busy state and the request lock; `onLogout` must tolerate this asynchronous handoff. When a confirmation saves its opener, its restoration policy must also handle a viewport change hiding that opener. Verify normal and reduced motion, cancellation after a desktop transition, pending requests, reopen and retry in the actual application; package verification does not replace actual product acceptance.

Without `service`, the empty-menu desktop exception is intentional B1 compatibility: a zero-width desktop navigation cannot signal the crossing, so the sheet stays open. Escape, its close button, the overlay or a `currentHref` change still close it. Home owns the confirmation's desktop cancel fallback to the visible row account trigger; the package supplies a visible, focusable control and does not implement the confirmation's restoration policy.

```tsx
// Standalone API; owned apps use shell service/locale/Link and header menu/account options.
<NaeilHeader service="home" locale={locale} currentHref={pathname} Link={GuardedLink}
  appNavigation={navigationItems}
  mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen}
  onLocaleChange={changeLanguage}
  authSlot={<NaeilHeaderAccountControl locale={locale} account={account} />} />
```

Keep the shared theme/locale/separator/account toolbar; the service profile rejects toolbar replacement. Omitting all new props preserves the 0.7.2 canonical profile, apart from markers, language correction, release identity and Radix-generated IDs. SVG/Logo IDs and consumer-supplied IDs are not normalized away. See the `docs/superpowers/specs/2026-10-28-canonical-home-chrome.md` acceptance contract for gates and the four allowed Home differences.

## Page-root frame policy (since 0.9.0)

Both supported CSS paths obtain the stable root rule and scoped Radix duplicate-compensation correction from `components.css`. Theme-only and JS-only imports do not set document scrolling. Declare `<html data-naeil-scrollbar-gutter="auto">` before first paint to disable both pieces for a custom policy. See [application layout](application-layout.md) for custom-body/scroller/helper-class limits, fallback and the [adopted contract](https://github.com/naeil-dev/naeil-ui/blob/434b7d07235316097ca3a55265ee02c1422b0cfd/docs/superpowers/specs/2026-10-29-page-root-scrollbar-gutter.md) for required probes and capture ordering.

Keep frame/toolbar tokens unchanged. The Japanese signed-out canonical login toolbar at 320px is 104px tall under a 15px classic reservation and 44px with overlay. The owner's F3 decision accepts this wrap on naeil.dev itself. Home Workspace uses the shared account control/full footer; its signed-out LoginGate omits the auth slot/separator and footer (F1/F2). Neither Home profile is required to wrap. D1–D4 and the exact F3 auth-composition boundary remain; compare matching roots and auth-slot compositions before applying tolerances.
