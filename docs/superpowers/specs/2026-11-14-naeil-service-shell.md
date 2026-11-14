# NaeilServiceShell — one shared service frame (0.15.0)

Owner decision 2026-11-14 ("권장하는대로 진행해줘"). Root cause of the drift found on 2026-11-14: only the header/footer *components* were shared, and even they accepted presentation overrides until 0.14.0; theme provider, main region, page title markup, base text and favicon declarations were rebuilt by every service from written rules, with nothing detecting divergence. Result: abstorm forced light, header→title 32–92px, Home 14px text, Home ICO favicon, etc.

Goal: services *use* the same parts instead of *re-implementing* the same look, and CI rejects divergence.

## 1. `NaeilThemeProvider`
- `({ children })` only. next-themes with `attribute="class"`, `defaultTheme="dark"`, `enableSystem`, `disableTransitionOnChange`, `storageKey="theme"`. Dark is the owner's choice (naeil.dev reference).
- Exported from the standalone shell entry and `/naeil-locale/chrome`. naeil.dev's site layout switches to it.
- next-themes ignores a nested provider when a parent exists, so the app root must use this provider and no other (enforced by §5).

## 2. `NaeilServiceShell`
Standalone entry `@naeil/ui/naeil-shell` (new package export, React-only like `/naeil-header`) and provider-backed export from `/naeil-locale/chrome`.

```tsx
<NaeilServiceShell
  service="estimate" locale={locale}
  Link={GuardedLink} onNavigate={guard}            // shared by header and footer
  header={{ appNavigation, currentHref, authSlot, brandHref, labels, resolveHref, onLocaleChange, mobileOpen, onMobileOpenChange }}
  footer={{ meta, resolveHref }}                    // or footer={false} for recorded no-footer screens (Home login)
  mainLabel="견적 목록">
  <PageHeader title=… description=… actions=… />
  …page content (purpose width via data-ui-layout)…
</NaeilServiceShell>
```

Renders, in order: `NaeilThemeProvider` (no-op under the root one), a skip link (`.ui-skip-link`, shared message `naeil.shell.skipToContent`: ko 본문으로 건너뛰기 / ja 本文へスキップ / en Skip to content) targeting `#main`, `NaeilHeader service=…`, `<main id="main" tabIndex={-1} className="ui-app-frame ui-app-main" aria-label={mainLabel}>`, `NaeilFooter service=…` unless `footer={false}`.

- `header` accepts only `appNavigation`, `currentHref`, `brandHref`, `authSlot`, `labels`, `resolveHref`, `onLocaleChange`, `mobileOpen`, `onMobileOpenChange`. The shell owns the header element; navigation `labels` supplies accessible names. No header id/aria/dir DOM attributes pass through the shell. Standalone `NaeilHeader` retains those compatibility semantics for non-shell use. `footer` accepts only `meta` and `resolveHref`.
- Strict types reject `className`, `style`, `id`, `data-*`-style overrides, `containerClassName`, theme props, and anything else (mapped `never` like the header/footer service profiles, including spreads). JS/cast attempts are ignored with one development-only warning per prop. An unknown `service` throws an Error (a shell without an owned service is meaningless; there is no legacy profile to fall back to).
- `PageHeader` remains the page start; re-exported from `/naeil-shell`.

## 3. Icons
`naeilIcons` (server-safe module, exported from `/naeil-locale` and `/naeil-shell`):
- `links`: `[{ rel: "icon", href: "/favicon.ico", type: "image/x-icon", sizes: "16x16" }, { rel: "icon", href: "/icon.svg", type: "image/svg+xml", sizes: "any" }, { rel: "apple-touch-icon", href: "/apple-icon.png", type: "image/png", sizes: "180x180" }]` (naeil.dev's emitted declarations).
- `files`: `{ "favicon.ico": <sha256 of brand/naeil/1.1.1/icons/favicon.ico>, "icon.svg": <sha256 of icons/favicon.svg>, "apple-icon.png": <sha256 of icons/apple-touch-icon.png> }`, `brandVersion: "1.1.1"`. Generated/verified by `pnpm build:brand`/`check:brand` from the kit; never hand-edited.
- Every site serves the three files at the root paths above (Next file convention `app/favicon.ico`, `app/icon.svg`, `app/apple-icon.png`; Vite `public/` root). The kit and hi-res PNGs stay out of npm.

## 4. Titles
Unchanged from 0.14.0: `localeMetadata` without `serviceName`, or `naeilDocumentTitle(service, page)`. Vite `index.html` initial `<title>` equals `naeilServiceName(service)`.

## 5. Conformance check (CI)
Package bin `naeil-ui-conformance` (plain Node ESM, no dependencies, shipped in the npm files list). Services add `naeil-ui-conformance --service <id> --framework next|vite --app <dir>` to CI. Static checks over the app source (ts/tsx/js/jsx/css/html, excluding node_modules, build output, tests):
1. Theme: reject import/re-export of ThemeProvider from next-themes, @naeil/ui or @naeil/ui/components/theme-provider (aliases/namespaces included), any forcedTheme token, document root class/classList and colorScheme writes. defaultTheme/storageKey prop checks apply only to provider-like tags. Require reachable NaeilThemeProvider or shell.
2. Chrome: require shell JSX reachable through relative imports from Next app/**/layout.* or Vite index.html → main script, with literal service matching --service. Recognize named/namespace/local aliases. Reject direct NaeilHeader/NaeilFooter, app main JSX/role=main/id=main. Vite config base must be / or absent.
3. Rhythm: require shared globals CSS (or theme + components CSS); reject actual ui-app-main/frame class tokens in className/cn/clsx and CSS selectors, reserved chrome selectors, global main/h1/header/footer selectors, PageHeader style/className, protected --ui-/--text-/--spacing-/--radius-/--color-/semantic color declarations, font/font-size/font-family/line-height on html/body/:root. Unrelated data strings/class substrings/storage props are valid.
4. Icons: exact three generated root file digests; reject nested/static/dynamic icon/apple-icon/favicon files and public duplicates (opengraph images unaffected). Next metadata object variables/spreads cannot include icons; unresolved metadata requires review. Vite index links equal naeilIcons.links, with no extra declarations.
5. Titles: localeMetadata aliases and same-file object variables/spreads cannot include serviceName; unresolved options require review. Vite title equals naeilServiceName(service).
- Escape hatch: `naeil-conformance-ignore <rule>: <reason>` comment on the line above; the report lists every ignore with its reason. Exit 1 on any violation; print `file:line rule message`.
- Tests with passing and failing fixture apps for each rule. A review-needed diagnostic fails the gate; static graph resolution is limited to relative imports.
- Runtime mode: `naeil-ui-conformance --service <id> --url <origin> --routes /a,/b [--no-footer /login] [--app <consumer-dir>]`. Resolve playwright or @playwright/test from consumer node_modules only; no new dependency. Missing dependency exits 2 with installation hint. For each route create fresh 1440×900/390×844 contexts under OS light/dark; print a result table and exit 1 for failures. Verify one main#main.ui-app-main, one header, 48 ±0.5 header→h1, 32/42/600 title, optional description gap 12 ±0.5, final content→footer 96 ±0.5, body 16, fresh dark, canonical icon rel/path/type (Next sizes variants allowed, ICO must not list 32x32), and title suffix naeilServiceName(service). Footer is absent only for exact --no-footer routes. Export self-contained `measureNaeilPage` from /naeil-shell and /naeil-locale/chrome for consumer tests.

## 6. Verification
- Unit/type tests for shell (structure, footer=false, override rejection incl. spreads and casts, provider entry parity), icons digests vs kit, conformance fixtures.
- Browser: a Storybook story / chrome fixture page using the shell; Playwright asserts header→h1 48, h1 32/42/600, h1→description 12, PageHeader→content 32, last block→footer 96, body 16px, fresh profile dark under emulated light and dark, at 1440 and 390, ko/ja/en. B1 chrome-pairs unchanged.
- naeil.dev itself: `NaeilThemeProvider`; content pages already on `.ui-app-frame .ui-app-main` + PageHeader rhythm.
