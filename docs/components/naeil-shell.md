# NaeilServiceShell (0.15.0 candidate)

One owned-service frame for `abstorm`, `home`, `estimate` and `jev`. Use the shell and the root `NaeilThemeProvider`; CI runs `naeil-ui-conformance`. Existing header/footer, generic Navigation/SiteFooter and legacy Next adapters retain their compatibility APIs. naeil.dev itself retains its catalog composition and uses the same theme provider.

## Entries and setup

React-only applications use `@naeil/ui/naeil-shell`. Next applications already inside `NaeilLocaleProvider` use `@naeil/ui/naeil-locale/chrome`: this reuses the selected shared messages without bundling all dictionaries. Both export `NaeilServiceShell`, `NaeilThemeProvider` and `PageHeader`. Keep the locale controller above remounting locale layouts; see [locale setup](naeil-locale.md). Import shared CSS, configure Tailwind package sources and deliver Pretendard/Noto Sans JP as described in [migration](../design/v2-migration.md).

```tsx
import { NaeilThemeProvider } from "@naeil/ui/naeil-shell";

// App root (Next: inside body; html uses suppressHydrationWarning).
<NaeilThemeProvider>{children}</NaeilThemeProvider>
```

The provider accepts `children` only. It sets next-themes `attribute="class"`, `defaultTheme="dark"`, `enableSystem`, `disableTransitionOnChange`, `storageKey="theme"`. A fresh profile starts dark even under OS light. A user's remembered theme wins; system remains supported. next-themes ignores a nested provider when a parent exists: replace the existing root provider. The shell includes the same provider for standalone use; under the root provider it is a no-op.

```tsx
import { NaeilServiceShell, PageHeader } from "@naeil/ui/naeil-shell";
import { NaeilHeaderAccountControl } from "@naeil/ui/naeil-header";
// With NaeilLocaleProvider, import all these from @naeil/ui/naeil-locale/chrome.

<NaeilServiceShell service="estimate" locale={locale}
  Link={GuardedLink} onNavigate={guard} mainLabel={pageTitle}
  header={{ appNavigation, currentHref, brandHref, onLocaleChange,
    authSlot: <NaeilHeaderAccountControl locale={locale} account={account} /> }}
  footer={{ meta: version, resolveHref }}>
  <PageHeader title={pageTitle} description={description} actions={actions} />
  <section data-ui-layout="list">{children}</section>
</NaeilServiceShell>
```

`Link`, `onNavigate`, locale and service are shared by header and footer. Preserve modified clicks, absolute canonical destinations, route/save guards and session callbacks. Keep busy state and the request lock above the shell so desktop/mobile account copies share them.

## API and protected presentation

| Prop | Contract |
| --- | --- |
| `service` | Required closed lowercase service id; unknown JS/cast values throw `Error` |
| `locale` | Required `ko`, `ja` or `en` |
| `children` | Page content; start with `PageHeader` |
| `Link`, `onNavigate` | Existing header/footer routing adapter and guard |
| `header` | Only `appNavigation`, `currentHref`, `brandHref`, `authSlot`, `labels`, `resolveHref`, `onLocaleChange`, `mobileOpen`, `onMobileOpenChange`. No header DOM/ARIA attributes or ids; the shell owns the header element. |
| `footer` | Only `meta` and `resolveHref`, or `false`; defaults to the canonical full footer |
| `mainLabel` | Accessible label of main |

The shell renders provider → `.ui-skip-link` targeting `#main` → service header → `<main id="main" tabIndex={-1} className="ui-app-frame ui-app-main" aria-label={mainLabel}>` → service footer. Skip text is shared `naeil.shell.skipToContent`: 본문으로 건너뛰기 / 本文へスキップ / Skip to content. Enter on the focused skip link moves focus to main.

No root `className`, `style`, `id`, `data-*`, container classes, theme options or arbitrary extra props. Footer presentation/attributes and header compatibility escape hatches are also rejected. Strict mapped-never/exact types reject overrides including spreads; JS/cast attempts are dropped with one development-only warning per prop path. They cannot replace the fixed main id/classes or shared routing props. Do not style the shell through ancestors or reserved selectors. Product content styling belongs inside main; purpose widths use `data-ui-layout`, independently of the application frame. Generic/legacy composition overrides remain supported outside this opt-in service contract.

### Recorded screens without a footer

Use `footer={false}` for an explicitly recorded no-footer screen (for example Home login). Record the route and reason in the application's adoption evidence. Main and skip link stay intact. This does not add custom spacing or permit a replacement footer. It needs no CLI ignore: the shell still owns the frame.

## Browser identity

Import `naeilIcons`, `naeilDocumentTitle` and `naeilServiceName` from server-safe `@naeil/ui/naeil-locale` in server/metadata code. The standalone shell also re-exports them for React consumers. Use `localeMetadata` without `serviceName`, or `naeilDocumentTitle(service, page)`; named pages read `Page — .naeil <service>` and a landing may use `.naeil <service>`.

`naeilIcons.brandVersion` is `1.1.1`; `naeilIcons.files` holds exact SHA-256 digests. `pnpm build:brand` generates the data from checksum-verified brand-kit bytes and `pnpm check:brand` rejects drift. Do not edit the generated modules. Copy these released kit files without conversion:

| Kit `brand/naeil/1.1.1/icons/` | Next file convention | Vite static file |
| --- | --- | --- |
| `favicon.ico` | `app/favicon.ico` | `public/favicon.ico` |
| `favicon.svg` | `app/icon.svg` | `public/icon.svg` |
| `apple-touch-icon.png` | `app/apple-icon.png` | `public/apple-icon.png` |

`src/app/` is supported for Next too. Next emits its declarations from files; do not add metadata `icons` or extra icon links. Vite `index.html` uses exactly `naeilIcons.links`, in this order (attribute order within a link does not matter):

```html
<link rel="icon" href="/favicon.ico" type="image/x-icon" sizes="16x16">
<link rel="icon" href="/icon.svg" type="image/svg+xml" sizes="any">
<link rel="apple-touch-icon" href="/apple-icon.png" type="image/png" sizes="180x180">
```

The kit and high-resolution PNGs stay outside npm. Consumers acquire the [verified brand kit](https://github.com/naeil-dev/naeil-ui/releases/download/v0.4.0/naeil-brand-1.1.1.zip), serve the files at root paths and own their deployment.

## CI conformance CLI

The package ships an executable plain Node ESM bin with only Node built-ins and generated icon data. Run the installed bin in CI before deployment:

```sh
naeil-ui-conformance --service estimate --framework next --app .
naeil-ui-conformance --service estimate --framework vite --app .
```

`--app` is the project directory; Next also accepts the actual `app/` directory. Next searches `app/`, then `src/app/`, then the supplied directory for root icons. Vite requires `index.html` and `public/` in the supplied project. Source scans cover ts/tsx/js/jsx (also mjs/cjs/mts/cts), CSS and HTML, excluding dependencies, hidden/build directories, tests, test/spec/story files and browser output. This is a static adoption gate, not a complete language interpreter; keep canonical imports/JSX explicit and retain browser checks for geometry and behavior.

Every violation prints `file:line rule message`; exit 1 means violations or invalid CLI arguments, exit 0 means the static checks pass. Rules:

| Rule | Every enforced requirement |
| --- | --- |
| `theme` | No `ThemeProvider` import from `next-themes` or `@naeil/ui/components/theme-provider`; no `defaultTheme=`, `forcedTheme=` or `storageKey=` props; at least one `NaeilThemeProvider` or shell usage |
| `chrome` | No direct `NaeilHeader` or `NaeilFooter` JSX; at least one `NaeilServiceShell` usage (named aliases are recognized) |
| `rhythm` | No app use of `ui-app-main`/`ui-app-frame`; no CSS selectors targeting `.ui-app-`, `.ui-page-`, `.ui-site-footer`, `.naeil-header`, `[data-naeil-`, `[data-slot="site-footer"]`, `[data-slot="navigation"]`; no font-size/font-family declarations on html/body/:root |
| `icons` | All three root icon files have exact generated SHA-256 digests; Next has no metadata `icons:` or extra icon link declarations; Vite icon links equal the shared attribute sets and order with no extra icon declarations |
| `titles` | No `serviceName:` override in `localeMetadata`; Vite initial title equals `naeilServiceName(service)` |

For an explicitly reviewed source exception, put a comment on the line immediately above the violation:

```tsx
// naeil-conformance-ignore chrome: Temporary legacy route; tracked by migration issue 123
<NaeilHeader locale="en" />
```

CSS `/* … */`, JSX `{/* … */}` and HTML `<!-- … -->` comments work too. Use the rule names above and a nonempty reason. Every ignore is printed with file, line, rule and reason, including unused ignores; it does not globally disable the rule. File-byte failures still require the correct icons. CI owners review recorded exceptions; a passing CLI does not prove visual parity or authenticated behavior.
