# NaeilHeader — branded whole-header composition

This guide includes the **@naeil/ui 0.7.1 candidate**, whose unchanged frame comes from published 0.6.0. See the [release record](https://github.com/naeil-dev/naeil-ui/releases/tag/v0.6.0) for archive and publication evidence. Import this opt-in React-only entry when an application inherits the actual naeil.dev header. Generic `Navigation` from `/ui` remains available for different product menus.

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

The module owns the brand, five-project catalog and header-only translations, project artwork references/status, theme/optional locale controls, toolbar order, fixed positioning, branded frame and Radix desktop/mobile behavior. Do not copy menu JSX or styles into a consumer. The website's `NavWrapper` imports this same module and supplies locale/router/auth state; estimate consumes the built package entry. Legacy `Nav` retains its Next/next-intl compatibility API.

## Consumer contract

Consumers provide an existing next-themes provider, routing/dirty-save guard, current locale and real authentication behavior. Default destinations point to `https://naeil.dev/{locale}`; the site's localized Link instead uses `resolveHref={path => path}`. A supplied `Link` handles default official destinations, including cross-origin URLs. `onNavigate` can intercept brand and menu links; honor modified clicks and target behavior. Explicit `external: true` project overrides and `projectsExternal` use native anchors, so intercept them with `onNavigate` when a dirty guard is required.

Only provide `onLocaleChange` when the application's interface supports all three canonical locales (`en`, `ko`, `ja`). Omitting it removes the locale control; the component does not create application translations or shared preferences. `authSlot` uses `NaeilHeaderAccountControl` in owned applications: a shared44px neutral account trigger and localized Radix logout menu. Consumers supply their real session state/callbacks, not alternative account markup. The legacy slot remains public for deliberate compatibility overrides. It does not integrate site SSO, share credentials or create accounts. Theme preferences remain consumer-origin state. Without a working provider, rendering alone does not establish theme switching.

| Prop | Contract |
| --- | --- |
| `locale` | Required `en`, `ko` or `ja`; selects header-only copy. |
| `resolveHref` | Resolves canonical unlocalized paths; defaults to the official localized site. |
| `Link`, `currentHref`, `onNavigate` | Routing adapter, active destination and navigation interception inherited from Navigation. |
| `onLocaleChange` | Optional supported-language callback; omit for a single-language application. |
| `authSlot` | Canonical `NaeilHeaderAccountControl`, with consumer-owned auth state/actions. Legacy arbitrary markup remains supported. |
| `brandHref`, `brandSlot`, `brandLinkProps`, `brandLinkComponent` | Explicit brand destination/content/anchor overrides; default accessible brand name is `.naeil`. |
| `projects`, `projectsExternal`, `showProjects`, `showBlog` | Legacy catalog/visibility/native-link overrides; defaults use the complete canonical catalog. |
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

## Frame and content clearance

The fixed header is 65px: the current 64px navigation token plus a 1px border. Clear it in the application's main, sticky regions and focus/anchor scroll margins with `calc(var(--ui-navigation-height) + 1px)`. The header, main and footer now share a 1600px maximum outer frame, including responsive `clamp(16px, 2.4vw, 40px)` gutters. Put `ui-app-frame` on main and reading/settings or short-form sections inside it; the header and shared footer apply their own internal frame. Do not wrap them in another padded frame. Apply deliberate `--ui-width-frame` / `--ui-frame-gutter` overrides on a common ancestor. Remove old `max-w-7xl` or `px-6` overrides to adopt the new defaults. This width update supersedes the previous 1280px/24px branded frame. See the [application layout starter](application-layout.md).

## Artwork and package boundary

The five decorative images reference `https://naeil.dev/images/{coral,jellyfish,whale,fish,turtle}.png`. Rendering those images requires network access to the official origin. Their bytes are not redistributed in npm; [third-party notices](../../THIRD_PARTY_NOTICES.md) retain unresolved artwork provenance and redistribution limits. Brand marks are not relicensed by the repository MIT license. Captions and links remain usable when images fail.

This entry requires no Next.js, next-intl, site session/auth backend, full application message catalog, hero or site public folder. Generic `/ui` imports do not import its catalog. The local Storybook provides **Brand / NaeilHeader / Docs, Usage, JapaneseApplication**; the Japanese example omits unsupported locale switching and uses a consumer-owned auth slot. Candidate examples do not establish hosted deployment.

Verify actual packed consumption, Storybook behavior and rendered comparisons at matching viewport/language/theme. Source imports alone do not prove visual parity. Native Safari, devices, assistive technology, full OAuth and unresolved accessibility observations retain the [documented support limits](../design/public-ui-support.md).

Pair owned-service headers with [NaeilFooter](naeil-footer.md). The 0.7.1 candidate emits package/contract identifiers for actual rendered validation.
