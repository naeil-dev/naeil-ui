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
| `header` | Only `appNavigation`, `currentHref`, `brandHref`, `authSlot`, `labels`, `resolveHref`, `onLocaleChange`, `mobileOpen`, `onMobileOpenChange`. No header DOM/ARIA attributes or ids; the shell owns the header element. Navigation `labels` supplies accessible names. Standalone `NaeilHeader` retains its id/aria/dir contract outside the shell. |
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

The package ships an executable plain Node ESM bin whose static mode uses only Node built-ins and generated icon data. Runtime mode resolves Playwright from the consuming project; it adds no DS dependency. Run the installed bin in CI before deployment:

```sh
naeil-ui-conformance --service estimate --framework next --app .
naeil-ui-conformance --service estimate --framework vite --app .
```

`--app` is the project directory; Next also accepts the actual `app/` directory. Next searches `app/`, then `src/app/`, then the supplied directory for root icons. Vite requires `index.html` and `public/` in the supplied project. Source scans cover ts/tsx/js/jsx (also mjs/cjs/mts/cts), CSS and HTML, excluding dependencies, hidden/build directories, tests, test/spec/story files and browser output. This is a static adoption gate, not a complete language interpreter; keep canonical imports/JSX explicit and retain browser checks for geometry and behavior.

Every violation prints `file:line rule message`; exit 1 means violations or invalid CLI arguments, exit 0 means the static checks pass. Rules:

| Rule | Every enforced requirement |
| --- | --- |
| `theme` | No import/re-export of `ThemeProvider` from `next-themes`, `@naeil/ui` or `@naeil/ui/components/theme-provider` (aliases/namespaces included); no document root classList/class writes or colorScheme writes. `forcedTheme`/`defaultTheme`/`storageKey` inputs are forbidden on theme-provider-like tags, including resolved object spreads. Unrelated data strings/object fields and product component props are valid. Render a reachable shared provider or shell. |
| `chrome` | Render a shell reachable from Next `app/**/layout.*` (also `src/app`) or Vite `index.html`'s main script. Resolve relative imports, baseUrl and tsconfig/jsconfig paths. Its `service` is the literal matching `--service`; unresolved/mismatched services fail. Named aliases, namespace JSX and local component aliases are recognized. No direct header/footer JSX, app `<main>`, `role="main"` or `id="main"`. Vite config `base` must be absent or `/`. |
| `rhythm` | Import `@naeil/ui/globals.css`, or both `theme.css` and `components.css`. No real `ui-app-main`/`ui-app-frame` class tokens in className strings/cn()/clsx() arguments; unrelated strings and class substrings are allowed. No PageHeader's own `style`/`className`, including expressions and resolved spreads; descendants inside actions/description may use them. No protected `--ui-*`, `--text-*`, `--spacing-*`, `--radius-*`, `--color-*` or semantic color-token redefinitions. No CSS selectors targeting `.ui-app-`, `.ui-page-`, `.ui-site-footer`, `.naeil-header`, `[data-naeil-`, `[data-slot="site-footer"]`, `[data-slot="navigation"]` or bare global main/h1/header/footer selectors (including after html/body); scoped `.article header` is valid. No font/font-size/font-family/line-height on html/body/:root. |
| `icons` | Exact three root icon SHA-256 digests. Root public aliases (including apple-touch-icon.png/favicon.svg) and static route aliases may use any canonical file's bytes. Different root aliases/automatic Next route icons fail; dynamic icon.tsx/apple-icon.tsx and directory handlers such as icon.svg/route.ts always fail. Unreferenced historical assets in nested public folders and product icon directories are valid, even with different bytes. No extra icon link declarations or Next route metadata `icons`, including referenced objects/spreads/imported helpers. Unresolved route metadata/helper reports `review-needed`. Opengraph images are independent. Vite links equal the shared attribute sets and order. |
| `titles` | Next identity roots are exported `metadata` or `generateMetadata` in app layout/page/template/route files. Inspect imported helper bodies through relative/path imports; no `serviceName` override through `localeMetadata`, aliases or object variables/spreads. Unresolvable helpers/options report `review-needed`. Ignore unrelated locals/exports named metadata outside route identity roots. Vite initial title equals `naeilServiceName(service)`. |

Static resolution is deliberately conservative: keep metadata/configuration explicit and review unresolved diagnostics instead of treating them as passes. The nearest parent tsconfig.json/jsconfig.json supplies compilerOptions.baseUrl/paths (including relative extends), so `--app src` can use a project-root config. Static reachability follows source imports, not execution: shell JSX inside an uncalled function can satisfy adoption. Runtime mode below provides the route/rendering guarantee.

For an explicitly reviewed source exception, put a comment on the line immediately above the violation:

```tsx
// naeil-conformance-ignore chrome: Temporary legacy route; tracked by migration issue 123
<NaeilHeader locale="en" />
```

CSS `/* … */`, JSX `{/* … */}` and HTML `<!-- … -->` comments work too. Use the rule names above and a nonempty reason. Every ignore is printed with file, line, rule and reason, including unused ignores; it does not globally disable the rule. File-byte failures still require the correct icons. CI owners review recorded exceptions. Static mode alone does not prove visual parity; authenticated account behavior still requires service tests.


## Runtime CI and reusable measurements

Run against the built application's origin (start its preview/server first). Install Playwright in that consuming project; the DS never downloads or installs it:

```sh
pnpm add -D @playwright/test
pnpm exec playwright install chromium
naeil-ui-conformance --service estimate --url http://127.0.0.1:4173 \
  --routes /en/estimates,/unknown,/login --no-footer /login \
  --storage-state ./playwright/.auth/session.json \
  --header 'X-Test-Session: value' --header 'X-Tenant: example' \
  --expect-status /unknown=404
```

`--app <consumer-dir>` optionally selects the project whose node_modules contains `playwright` or `@playwright/test`; by default it is the current directory. `--routes` is a comma-separated list of local paths (queries are allowed). `--no-footer` lists the exact recorded route(s) that must have no footer; each must appear in `--routes`. These are explicit route exceptions, not an inferred permission to omit footers elsewhere.

`--storage-state <file>` applies a Playwright storageState JSON to every new context, preserving cookies and other stored data. The verifier removes only localStorage entries named `theme` from every supplied origin so dark-default verification remains fresh; it does not modify the file. Repeat `--header name:value` to apply authentication/tenant headers to every context (values may contain colons).

All routes require a final 2xx HTTP response unless repeatable `--expect-status <listed-route>=<code>` specifies the exact final status, e.g. `--expect-status /unknown=404 --expect-status /access-denied=403`. Expected error responses undergo all the same geometry/identity checks. A status mismatch fails. Final URL origin/path must match the requested route; an unlocalized path may acquire a ko/ja/en prefix (including `/` → `/en` or `/en/`). Other redirects fail unless recorded with repeatable `--allow-redirect /old=/new`. Explicitly localized routes cannot silently change locale. Query strings do not change the path comparison. Status, no-footer and redirect permissions are keyed by the requested route.

For every route, the CLI creates four fresh contexts: 1440×900 and 390×844 under emulated OS light and dark. The table lists route, viewport, scheme, result and failures. It asserts:

- Exactly one main landmark and exactly one `main#main.ui-app-main`; exactly one shared header.
- Header bottom → first h1 is 48px ±0.5; h1 is 32px/42px/600.
- h1 → `.ui-page-description` is 12px ±0.5 when a description exists.
- `.ui-page-header` → next visible normal-flow sibling content is 32px ±0.5 when present (following ancestor siblings within main when the header is wrapped).
- Last visible normal-flow terminal content box → footer top is 96px ±0.5; one footer is required except explicit `--no-footer` routes, which require zero. Descend layout wrappers and use the lowest terminal element's border-box bottom (or direct trailing text's line box). A wrapper's bottom padding/border/margins remain part of the measured gap; a wrapper adding 64px to a correct 96px gap measures 160px and fails. Empty zero-height, hidden, script, absolute/fixed nodes are excluded; display:contents is transparent. Wrapper decoration does not exempt extra spacing.
- Body font-size is 16px; fresh html has `dark` under either OS scheme.
- Icon links resolve against the actual document URL, must have that same origin, and match `naeilIcons.links` by rel/href pathname/type. Next query strings and repeated sizes variants are accepted. ICO links must not list 32x32 so the canonical SVG remains preferred.
- `document.title` ends with `naeilServiceName(service)`.

Exit 0 means every requested check passed; exit 1 means violations, navigation failures or invalid arguments. Missing consumer Playwright exits 2 with an installation hint. Runtime mode does not apply source-ignore comments. It checks the supplied routes only; CI should list representative authenticated, anonymous, localized, loading and no-footer routes.

For consumer-owned Playwright tests, both shell entries export the self-contained in-page function and its result type:

```ts
import { measureNaeilPage, type NaeilPageMeasurements } from "@naeil/ui/naeil-shell";

const measurements: NaeilPageMeasurements = await page.evaluate(measureNaeilPage);
expect(measurements.headerTitle).toBeCloseTo(48, 1);
```

Call after the title is visible and fonts are ready. Missing required elements return null measurements, permitting a test to report the absent element. Results include `pageHeaderContent`, the actual document `url`, and absolute icon hrefs. The function closes over no module state and can be serialized directly by Playwright.
