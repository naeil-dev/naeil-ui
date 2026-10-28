# NaeilHeader — branded whole-header composition

The published registry baseline is **@naeil/ui 0.7.2**. This guide also describes the **unpublished 0.8.0 candidate** APIs below. Install exact `@naeil/ui@0.7.2` for the published API; the new Home props require the reviewed 0.8.0 archive. Hosted Docs and service activation have separate receipts. See [release identities and publication status](../package-release.md#publication-and-deployment). Import this opt-in React-only entry when an application inherits the actual naeil.dev header. Generic `Navigation` from `/ui` remains available for different product menus.

```tsx
import { NaeilHeader, NaeilHeaderAccountControl } from '@naeil/ui/naeil-header';
import '@naeil/ui/globals.css';

// Inside the consumer's existing next-themes ThemeProvider:
<NaeilHeader locale="ja" Link={GuardedLink} currentHref={pathname}
  authSlot={<NaeilHeaderAccountControl locale="ja" Link={GuardedLink}
    account={authenticated
      ? { status: 'signed-in', onLogout: () => { void guardedLogout(); }, busy: leaving }
      : { status: 'signed-out', loginHref: '/login' }} />} />
```

Load shared styles once. Apps that already own their Tailwind/base styles may import both `@naeil/ui/theme.css` and `@naeil/ui/components.css` instead of globals. Tailwind 4 consumers must register the installed `dist` with `@source`; see [setup](../design/v2-migration.md#시작하기).

The module owns the brand, single-project naeil-ui catalog and header-only translations, project artwork references/status, theme/optional locale controls, toolbar order, fixed positioning, branded frame and Radix desktop/mobile behavior. Do not copy menu JSX or styles into a consumer. The website's `NavWrapper` imports this same module and supplies locale/router/auth state; estimate consumes the built package entry. Legacy `Nav` retains its Next/next-intl compatibility API.

## Consumer contract

Consumers provide an existing next-themes provider, routing/dirty-save guard, current locale and real authentication behavior. Default destinations point to `https://naeil.dev/{locale}`; the site's localized Link instead uses `resolveHref={path => path}`. A supplied `Link` handles default official destinations, including cross-origin URLs. `onNavigate` can intercept brand and menu links; honor modified clicks and target behavior. Explicit `external: true` project overrides and `projectsExternal` use native anchors, so intercept them with `onNavigate` when a dirty guard is required.

Only provide `onLocaleChange` when the application's interface supports all three canonical locales (`en`, `ko`, `ja`). Omitting it removes the locale control; the component does not create application translations or shared preferences. `authSlot` uses `NaeilHeaderAccountControl` in owned applications: a shared 44px neutral account trigger and localized Radix logout menu. Consumers supply their real session state/callbacks, not alternative account markup. The legacy slot remains public for deliberate compatibility overrides. It does not integrate site SSO, share credentials or create accounts. Theme preferences remain consumer-origin state. Without a working provider, rendering alone does not establish theme switching.

| Prop | Contract |
| --- | --- |
| `locale` | Required `en`, `ko` or `ja`; selects header-only copy. |
| `resolveHref` | Resolves canonical unlocalized paths; defaults to the official localized site. |
| `Link`, `currentHref`, `onNavigate` | Routing adapter, active destination and navigation interception inherited from Navigation. |
| `onLocaleChange` | Optional supported-language callback; omit for a single-language application. |
| `authSlot` | Canonical `NaeilHeaderAccountControl`, with consumer-owned auth state/actions. Legacy arbitrary markup remains supported. |
| `brandHref`, `brandSlot`, `brandLinkProps`, `brandLinkComponent` | Explicit brand destination/content/anchor overrides; default accessible brand name is `.naeil`. |
| `projects`, `projectsExternal`, `showProjects`, `showBlog` | Legacy catalog/visibility/native-link overrides; defaults use the complete canonical catalog. |
| `appNavigation` (0.8.0) | `NavigationItem[]` passed unchanged after catalog/blog and before flat `subNav`. Owned product menus use this with `showProjects={false} showBlog={false}`. |
| `brandSuffix` (0.8.0) | Product qualifier inside the brand link; the package owns its 14px type, 4px gap and optical alignment. Ignored when `brandSlot` replaces the complete content. Set `brandLinkProps["aria-label"]` for a product name. |
| `statusSlot` (0.8.0) | Exactly once, outside and 8px after the brand link at every width. The consumer owns the content and accessible status. No wrapper is added when omitted. |
| `mobileOpen`, `onMobileOpenChange` (0.8.0) | Controlled/uncontrolled sheet state, also on generic Navigation. Omit `mobileOpen` for internal state; a callback alone observes it. One callback per transition; route/desktop changes, ordinary links, close/overlay/Escape dismiss. Modified/middle clicks preserve it; nested menus consume the first Escape. |
| `subNav`, `currentProjectKey`, `currentProjectHref` | Legacy extra links and current-project destination. |
| `translations`, `labels` | Legacy header/project lookup overrides and navigation/menu/close accessible labels. |
| `toolbarSlot` | Replaces the complete default theme/locale/auth toolbar. |
| `mobileFooter`, `className`, `containerClassName` | Inherited mobile slot and style overrides; recheck frame/behavior after changes. |

Standard header attributes and the remaining inherited [Navigation props](navigation.md) remain available. Compatibility overrides preserve existing consumers; new applications normally use the canonical composition.

## Account presentation

`NaeilHeaderAccountControl` accepts `locale`, optional routing `Link`, and `account`:

- `{ status: 'signed-out', loginHref }` renders the shared login link through that adapter.
- `{ status: 'signed-in', onLogout, busy?, displayName?, email? }` renders the same account icon in every app; optional identity appears only inside its menu. There is no shared identity or avatar fetch.
- `onLogout` starts the app's guarded action; the app handles async errors, cancellation, session endpoints and redirects. `busy` disables the menu action while keeping the trigger available, with `aria-busy`, for inspection and focus restoration. Cancel/failure clears busy and permits retry.
- Callback invocation closes the menu and returns focus to the trigger. Mobile navigation may remain open during a failed action. The account menu uses the existing Radix overlay/inert implementation.

Keep errors visible in the consumer's recovery UI or toast. The package never calls an authentication endpoint. Compare signed-in and signed-out render states separately; anonymous-only acceptance cannot establish authenticated parity. `AccountStates` is a synthetic Storybook example for pending/cancel/error/retry.

Own pending state and the in-flight request lock above `NaeilHeader`. Navigation mounts desktop and mobile slot contents separately, and closing the mobile sheet unmounts its copy. Pass the same controller to both through `authSlot`; test reopening the sheet and changing viewport during a pending request. State inside an independently mounted slot component can enable duplicate requests.

## Frame and content clearance

The fixed header is 65px: the current 64px navigation token plus a 1px border. Clear it in the application's main, sticky regions and focus/anchor scroll margins with `calc(var(--ui-navigation-height) + 1px)`. The header, main and footer now share a 1600px maximum outer frame, including responsive `clamp(16px, 2.4vw, 40px)` gutters. Put `ui-app-frame` on main and reading/settings or short-form sections inside it; the header and shared footer apply their own internal frame. Do not wrap them in another padded frame. Apply deliberate `--ui-width-frame` / `--ui-frame-gutter` overrides on a common ancestor. Remove old `max-w-7xl` or `px-6` overrides to adopt the new defaults. This width update supersedes the previous 1280px/24px branded frame. See the [application layout starter](application-layout.md).

## Artwork and package boundary

The 0.7.2 default catalog contains naeil-ui and references only `https://naeil.dev/images/whale.png`. Rendering that decorative image requires network access to the official origin. Its bytes are not redistributed in npm; [third-party notices](../../THIRD_PARTY_NOTICES.md) retain unresolved artwork provenance and redistribution limits. Brand marks are not relicensed by the repository MIT license. Captions and links remain usable when images fail.

This entry requires no Next.js, next-intl, site session/auth backend, full application message catalog, hero or site public folder. Generic `/ui` imports do not import its catalog. Storybook provides **Brand / NaeilHeader / Docs, Usage, JapaneseApplication, AccountStates, ReferenceFull, ReferenceCompact**; the Japanese example omits unsupported locale switching and supplies application state to the shared account control. Local examples do not establish hosted deployment.

Verify actual packed consumption, Storybook behavior and rendered comparisons at matching viewport/language/theme. Source imports alone do not prove visual parity. Native Safari, devices, assistive technology, full OAuth and unresolved accessibility observations retain the [documented support limits](../design/public-ui-support.md).

Pair owned-service headers with [NaeilFooter](naeil-footer.md). The 0.7.2 source is `40a3928e24cd2f0141be3e605eed0a75260938fd`. Both 0.7.2 and the 0.8.0 candidate emit package version and chrome contract `1`; archive identities, maintained guidance and hosted Docs remain separate evidence.


## Host typography and mobile handoff (0.8.0 candidate)

Import either `globals.css` or `theme.css` plus `components.css`, and register the installed `dist` with Tailwind `@source`. Header/footer roots and the actual navigation popover, sheet, account menu and locale menu Content elements carry `data-naeil-chrome` and `lang=locale`; the locale Select Content also carries `data-naeil-locale-menu`. Generic Navigation/Select/DropdownMenu do not acquire these markers. Do not identify chrome by option text or by the presence of a Japanese body option.

Marker-scoped final typography uses the package font stack and explicit sizes, weights, line heights, letter spacing and smoothing. It supports a host `@theme` / `@theme inline` with different text tokens/font stacks and unlayered element/role rules at Home's specificity (`:root[attr] [role="menuitem"]`, `[role="dialog"] p`). Rules with `!important` or IDs aimed at chrome are outside this guarantee. Ordinary body Select/menu/dialog typography remains host-owned. Font files are still consumer-supplied; Japanese chrome and portals use Noto Sans JP even when the document language differs.

A controlled mobile sheet defers its shared account action until the account menu and sheet finish closing and restore a surviving header control. The consumer still owns dirty state, confirmation, logout, busy state and the request lock; `onLogout` must tolerate this asynchronous handoff. When a confirmation saves its opener, its restoration policy must also handle a viewport change hiding that opener. Verify normal and reduced motion, cancellation after a desktop transition, pending requests, reopen and retry in the actual application; the candidate's unresolved acceptance gates are not a production guarantee.

```tsx
<NaeilHeader locale={locale} currentHref={pathname} Link={GuardedLink}
  showProjects={false} showBlog={false} appNavigation={navigationItems}
  brandHref="/" brandSuffix="Home" brandLinkProps={{ 'aria-label': 'Naeil Home' }}
  statusSlot={readinessStatus} mobileOpen={mobileOpen} onMobileOpenChange={setMobileOpen}
  onLocaleChange={changeLanguage}
  authSlot={<NaeilHeaderAccountControl locale={locale} account={account} />} />
```

Keep the default theme/locale/separator/account toolbar for this profile; `toolbarSlot` is a compatibility override, not the Home migration path. Omitting all new props preserves the 0.7.2 canonical profile, apart from markers, language correction, release identity and generated IDs. See the `docs/superpowers/specs/2026-10-28-canonical-home-chrome.md` acceptance contract for gates and the four allowed Home differences.
