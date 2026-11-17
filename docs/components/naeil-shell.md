# NaeilServiceShell

One owned-service frame for `abstorm`, `home`, `estimate` and `jev`. Use the shell and the root `NaeilThemeProvider`; CI runs `naeil-ui-conformance`. Standalone NaeilHeader/NaeilFooter and generic Navigation/SiteFooter retain their APIs. naeil.dev uses the same shell with `service="main"`: its catalog keeps Projects/Blog and has no service suffix.

## Entries and setup

React-only applications use `@naeil/ui/naeil-shell`. Next applications already inside `NaeilLocaleProvider` use `@naeil/ui/naeil-locale/chrome`: this reuses the selected shared messages without bundling all dictionaries. Both export `NaeilServiceShell`, `NaeilThemeProvider` and `PageHeader`. Keep the locale controller above remounting locale layouts; see [locale setup](naeil-locale.md). Import shared CSS, configure Tailwind package sources and import `@naeil/ui/fonts.css` as described in [migration](../design/v2-migration.md).

```tsx
import { NaeilThemeProvider } from "@naeil/ui/naeil-shell";

// App root (Next: inside body; html uses suppressHydrationWarning).
<NaeilThemeProvider>{children}</NaeilThemeProvider>
```

The provider accepts `children` only. It sets next-themes `attribute="class"`, `defaultTheme="dark"`, `enableSystem`, `disableTransitionOnChange`, `storageKey="theme"`. A fresh profile starts dark even under OS light. A valid `naeil_theme_v1` cookie wins over origin-local `theme` storage; without it, the remembered local value wins, then dark. `system` remains supported. Only an explicit choice through shared controls writes the cookie; existing local values are never broadcast. The pre-hydration preflight strictly validates the cookie, seeds next-themes storage and applies the resolved class/color scheme atomically; CSR roots run the same initialization once. For a guarantee that includes blank pre-content backgrounds, add the head bootstrap below: a provider/body script alone is too late to prevent every streamed CSS frame. Storage denial retains dark by default, cookie denial retains local persistence. Cookies use the locale host rule: HTTPS naeil.dev and subdomains share `Domain=naeil.dev; Path=/; Max-Age=31536000; Secure; SameSite=Lax`; other hosts use host-only cookies (Secure on HTTPS), never a parent domain. Home's private-network host cannot share with naeil.dev. Another site picks up a choice on its next load; same-origin tab sync remains next-themes, with no cross-origin live sync. next-themes ignores a nested provider when a parent exists: replace the existing root provider. The shell includes the same provider for standalone use; under the root provider it is a no-op.

### First painted background (0.18.1)

Estimate's measured 0.18.0 upgrade introduced a wrong pre-content CSS background frame despite correct first contentful paint; its 0.17.0 comparison passed. The stricter packed streaming fixture also exposes an older 0.17.0 body-script timing window, so these results do not establish that the package window first existed in 0.18.0. The provider fallback now resolves and applies in one script, retaining local/default/storage-denied behavior, but it cannot control a browser paint before body scripts. **Upgrade and add the head bootstrap to remove that frame reliably.** It is additive and server-safe; keep the root provider and controls.

Next root layout, outside Suspense and before body (not a delayed client effect):

```tsx
import { NaeilThemeScript } from "@naeil/ui/theme-bootstrap";

<html suppressHydrationWarning>
  <head><NaeilThemeScript /></head>
  <body><NaeilThemeProvider>{children}</NaeilThemeProvider></body>
</html>
```

`NaeilThemeScript` accepts optional `nonce` for a consumer's existing CSP. It emits an inline classic script, not a fetched/module script. The bootstrap reads the current cookie at runtime and uses the strict allowlist; no cookie text is interpolated into source. Do not defer it or place it behind a Suspense boundary. Consumers with CSP must permit this script with their nonce or its generated hash.

React/Vite puts the identical exported string in the built HTML before styles and the module entry. Add this build plugin alongside existing plugins:

```js
import { naeilThemeBootstrap } from "@naeil/ui/theme-bootstrap";
const themeBootstrap = {
  name: "naeil-theme-bootstrap",
  transformIndexHtml() {
    return [{ tag: "script", attrs: { "data-naeil-theme-preference": "" },
      children: naeilThemeBootstrap, injectTo: "head-prepend" }];
  },
};
// defineConfig({ plugins: [/* existing plugins */, themeBootstrap] })
```

The bootstrap writes no cookie and stores nothing beyond the existing theme key. Cookie scope/precedence and Home's host boundary are unchanged. Without head integration the improved provider remains compatible, but **does not promise zero pre-content background frames**. `pnpm test:theme-paint` builds packed streaming Next with webpack/Turbopack and React/Vite, holding external scripts while Chromium captures every compositor frame. Firefox/WebKit provide raster checkpoints only; those do not prove every intervening frame.

```tsx
import { NaeilServiceShell, PageHeader } from "@naeil/ui/naeil-shell";
// With NaeilLocaleProvider, import all these from @naeil/ui/naeil-locale/chrome.

<NaeilServiceShell service="estimate" locale={locale}
  account={account}
  Link={GuardedLink} onNavigate={guard} mainLabel={pageTitle}
  header={{ appNavigation, currentHref, brandHref, onLocaleChange }}
  footer={{ resolveHref }}>
  <PageHeader title={pageTitle} description={description} actions={actions} />
  <section data-ui-layout="list">{children}</section>
</NaeilServiceShell>
```

`Link`, `onNavigate`, locale and service are shared by header and footer. Preserve modified clicks, absolute canonical destinations, route/save guards and session callbacks. Keep busy state and the request lock above the shell so desktop/mobile account copies share them.

## API and protected presentation

| Prop | Contract |
| --- | --- |
| `service` | Required closed lowercase service id, or `main` for the naeil.dev catalog; unknown JS/cast values throw `Error` |
| `locale` | Required `ko`, `ja` or `en` |
| `account` | Optional `NaeilHeaderAccount` in the component API (since 0.16.0); required by owned-service static CI. Signed-out: `{status:"signed-out", loginHref}`. Signed-in: `{status:"signed-in", onLogout, busy?, displayName?, email?}`. Both entries export the type. |
| `children` | Page content; start with `PageHeader` |
| `Link`, `onNavigate` | Existing header/footer routing adapter and guard |
| `header` | Only `appNavigation`, `currentHref`, `brandHref`, `labels`, `resolveHref`, `onLocaleChange`, `mobileOpen`, `onMobileOpenChange`. No header DOM/ARIA attributes or ids; the shell owns the header element. Navigation `labels` supplies accessible names. Standalone `NaeilHeader` retains its id/aria/dir contract outside the shell. |
| `footer` | `resolveHref` or recorded `false`; defaults to the canonical full footer. `meta` remains in the public compatibility API, but owned services leave it empty (no meta row). |
| `mainLabel` | Accessible label of main |

The shell renders provider → `<div className="ui-service-shell" data-naeil-shell="">` containing `.ui-skip-link` targeting `#main` → service header → `<main id="main" tabIndex={-1} className="ui-app-frame ui-app-main" aria-label={mainLabel}>` → service footer. Skip text is shared `naeil.shell.skipToContent`: 본문으로 건너뛰기 / 本文へスキップ / Skip to content. Enter on the focused skip link moves focus to main.

### Screen height and base text (0.17.0)

The frame has `min-height:100dvh` and a column layout; main grows to fill remaining height. Short-page footer bottom equals viewport bottom. On long pages content ends 96px before the footer. `footer={false}` still fills the viewport. Applications add no height/flex wrapper. Body background/foreground, font stack and 16/25px text now live in the shared `components.css` import graph, identically for globals and split imports.

Canonical chrome typography is generated in `typography.css` by `pnpm build:tokens`. Existing chrome exceptions are explicit tokens: sheet title 20/28, menu/control 16/24, account metadata 14/20; supporting/footer text remains 14/21.875 from the 1.5625 ratio. They intentionally differ from content title/body/supporting roles (20/29, 16/25, 14/22). No chrome pixels change when generating these rules.

Generic split-import consumers now receive semantic body colours, the shared font stack and 16/25 baseline where they previously inherited browser/Tailwind defaults. Zero-specificity selectors in `@layer base` let their explicit overrides win. Generic/standalone header/footer APIs and frame overrides stay available. Owned services use the baseline without overrides.

Runtime conformance measures the frame and viewport fill as described below. A short page may have more than 96px between content and footer because main fills the available height.

### Account ownership and login pages (since 0.16.0)

Pass session state through `account`; the shell renders `NaeilHeaderAccountControl` with its own locale and the shared `Link`. The header retains its existing desktop/mobile composition. Signed-out pages, including error pages, show the shared login link. Signed-in pages show the shared account menu; the consumer owns logout I/O, busy state, request locks and routing guards above the shell.

When signed out, the shell hides the login control only if `account.loginHref` is a same-app relative route and its URL pathname exactly equals `header.currentHref`'s. Queries and hashes are ignored; an absolute or protocol-relative login URL (e.g. the central `https://naeil.dev/<locale>/login?next=…`) never hides the control, even when a service route shares the pathname. Supply the real localized current path: `/ja/login` matches `/ja/login?next=/console`, while `/login` does not match `/ja/login`. Missing currentHref or an invalid URL keeps the control. Signed-in accounts are never hidden by this rule.

Shell `header.authSlot` is removed in 0.19.0. Pass session state through `account` instead; types reject the old input, including spreads, and JavaScript/cast extras are ignored. Standalone `NaeilHeader` retains its `authSlot` contract. See [0.19.0 consumer migration](../design/v2-migration.md#0190-consumer-migration).

No root `className`, `style`, `id`, `data-*`, container classes, theme options or arbitrary extra props. Footer presentation/attributes and header compatibility escape hatches are also rejected. Strict mapped-never/exact types reject overrides including spreads; JS/cast attempts are dropped with one development-only warning per prop path. They cannot replace the fixed main id/classes or shared routing props. Do not style the shell through ancestors or reserved selectors. Product content styling belongs inside main; purpose widths use `data-ui-layout`, independently of the application frame. Generic/standalone composition overrides remain supported outside this opt-in service contract.

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

The package ships a plain Node ESM bin. Static mode checks adoption only; runtime mode resolves consumer-installed Playwright.

```sh
naeil-ui-conformance --service estimate --framework next --app .
naeil-ui-conformance --service estimate --framework vite --app .
```

`--app` is the project directory (Next also accepts its app directory). Source scans exclude dependencies, hidden/build directories, tests, test/spec/story files and browser output. There are only two source requirements, both under `chrome`:

- Import and use `NaeilServiceShell` from `/naeil-shell` or `/naeil-locale/chrome` in a source module reachable from a Next layout or Vite index script.
- Pass explicit `account=` on each detected shell. Expressions are allowed; spread-only account input is insufficient evidence.

The existing lexical import/JSX reader recognizes named aliases and namespaces and follows relative and tsconfig path imports. It is not a module interpreter: reachability is existential, uncalled JSX can satisfy adoption, and account presence does not establish a value or visibility. Type checking remains required. No additional regex policy is added in 0.17.0.

Removed checks: theme providers/root writes/options, literal service matching, direct header/footer/main JSX, Vite base, CSS imports/selectors/tokens/frame classes/body typography, PageHeader presentation, icon files/metadata/links and document titles. Static PASS no longer claims any of those properties. Inert theme-write strings, nested plugin `base` options and unrelated locally named `NaeilHeader` components no longer fail. Geometry, identity and first-theme assertions belong to runtime; component props belong to types; pixel parity and icon HTTP/hash checks belong to live comparison.

Every violation prints `file:line rule message`. Exit 1 means violations or invalid arguments; exit 0 means adoption evidence only. Reviewable next-line exceptions remain supported:

```tsx
import { NaeilServiceShell } from "@naeil/ui/naeil-shell";
// naeil-conformance-ignore chrome: Recorded migration exception
<NaeilServiceShell />
```

A known rule and nonempty reason are required (`config` errors otherwise). Existing theme/rhythm/icons/titles ignore comments remain readable and printed for compatibility but suppress no active policy. Static PASS does not prove route coverage or visual parity.

The audit's five valid-syntax bypasses are deliberately not addressed by more static rules:

| Former bypass | Rendered coverage |
| --- | --- |
| Fake canonical shell binding | Runtime rejects missing shared frame/main/header/footer and spacing. Static now also requires a package import, without claiming module identity analysis. |
| `var` alias of a direct header | Runtime catches duplicate/missing chrome if rendered; equivalent standalone chrome is not proof of shell ownership. |
| Later mutation of metadata icons | Runtime checks declarations/origin/type and ICO preference; live comparison checks actual HTTP and hashes. |
| Ignore text inside a template string | Not an execution guarantee. Runtime ignores source comments and checks the supplied page; an unrendered source branch remains unmeasured. |
| Frame class in a variable | Runtime catches resulting title/gap/fill changes. Width/gutter changes and overrides with no measured effect require browser/live comparison. |

Imported/computed PageHeader styles, missing reachable CSS and aliased root-theme writes are likewise checked only where their rendered effect changes a measured metric. Short-page extra blank spacing can be absorbed by flex fill and is not independently attributable to a CSS override. Authenticated behavior, per-glyph font policy, all routes, continued monitoring after measurement and interactions are not established by the numeric gate.

## Runtime CI and reusable measurements

Run against the built application's origin (start its preview/server first). Install Playwright in that consuming project; the DS never downloads or installs it:

```sh
pnpm add -D @playwright/test
pnpm exec playwright install chromium
naeil-ui-conformance --service estimate --url http://127.0.0.1:4173 \
  --routes /en/estimates,/unknown,/login --no-footer /login --no-account /login \
  --storage-state ./playwright/.auth/session.json \
  --header 'X-Test-Session: value' --header 'X-Tenant: example' \
  --expect-status /unknown=404
```

`--app <consumer-dir>` optionally selects the project whose node_modules contains `playwright` or `@playwright/test`; by default it is the current directory. `--routes` is a comma-separated list of local paths (queries are allowed). `--no-footer` lists the exact recorded route(s) that must have no footer; each must appear in `--routes`. These are explicit route exceptions, not an inferred permission to omit footers elsewhere.

At 1440px the runtime requires at least one `[data-naeil-account-state]` inside the shared header. `accountCount` counts all such elements, including CSS-hidden desktop/mobile copies, and ignores markers outside the header. Repeatable `--no-account /login,/gate` records exact requested-route exceptions; all listed routes must appear in --routes. The option permits absence rather than requiring zero. Use it for a recorded login page where the shell intentionally suppresses the redundant login link. Mobile measurements report the count but do not require a marker. Neither exception changes the static account= requirement.

`--storage-state <file>` applies a Playwright storageState JSON to every new context, preserving cookies and other stored data. The verifier removes only the `naeil_theme_v1` preference cookie and localStorage entries named `theme` from every supplied origin so dark-default verification remains fresh; it does not modify the file. Repeat `--header name:value` to apply authentication/tenant headers to requests at the configured origin only, including same-origin redirect hops (values may contain colons). Cross-origin resources and redirects receive none of these headers.

All routes require a final 2xx HTTP response unless repeatable `--expect-status <listed-route>=<code>` specifies the exact final status, e.g. `--expect-status /unknown=404 --expect-status /access-denied=403`. Expected error responses undergo all the same geometry/identity checks. A status mismatch fails. Final URL origin/path must match the requested route; an unlocalized path may acquire a ko/ja/en prefix (including `/` → `/en` or `/en/`). Other redirects fail unless recorded with repeatable `--allow-redirect /old=/new`. Explicitly localized routes cannot silently change locale. Query strings do not change the path comparison. Status, no-footer and redirect permissions are keyed by the requested route.

For every route, the CLI creates four fresh contexts: 1440×900 and 390×844 under emulated OS light and dark. The table lists route, viewport, scheme, result and failures. It asserts:

- Exactly one `.ui-service-shell[data-naeil-shell]` frame; exactly one main landmark and exactly one `main#main.ui-app-main`; exactly one shared header.
- At 1440px, header accountCount is at least 1 unless the route is recorded with --no-account.
- Header bottom → first h1 is 48px ±0.5; h1 is 32px/42px/600.
- h1 → `.ui-page-description` is 12px ±0.5 when a description exists.
- `.ui-page-header` → next visible normal-flow sibling content is 32px ±0.5 when present (following ancestor siblings within main when the header is wrapped).
- If content bottom + 96px + footer height fits the viewport, footer bottom must equal viewport bottom (±0.5px) and visible content edge → footer top must be at least 96px (±0.5px). Otherwise that gap must be exactly 96px ±0.5; one footer is required except explicit `--no-footer` routes, which require zero and main bottom at least at viewport bottom. Classification uses the content’s natural minimum, independently of actual footer position, so removing fill fails on short pages. The edge is found from main by following, at each level, the visible child whose box ends lowest: transparent block wrappers are entered (their bottom padding/border-less spacing/margins stay in the gap, so on a long page a wrapper adding 64px measures 160px and fails); the search stops at the first box that is painted (border, background, shadow), clips (overflow ≠ visible), is not block-level, is a replaced/form element (img, svg, canvas, video, iframe, pre, table, input, select, textarea, button), carries text directly, or holds only inline content — that box's border-box bottom is the edge. Hidden content (display none, visibility hidden, opacity 0, closed `<details>` except its summary, `checkVisibility()` false), scripts and absolute/fixed boxes are ignored; display:contents is transparent. Example: a bordered card or panel ending 96px above the footer passes regardless of its inner padding; on a long page an unbordered closed `<details>` with 16px bottom padding below its summary shows 16px of extra empty space and fails.
- Measurement starts after the page settles: load, best-effort network idle (≤15s), no `aria-busy="true"` in main, and any `--wait-for <route>=<selector>`.
- Owned-service shell footer meta is absent or empty; non-empty text fails and is retained as `footerMetaTexts`. Standalone/generic meta rendering remains compatible.
- Body font-size is 16px and line-height is 25px; fresh html has `dark` under either OS scheme.
- Icon links resolve against the actual document URL, must have that same origin, and match `naeilIcons.links` by rel/href pathname/type. Next query strings and repeated sizes variants are accepted. ICO links must not list 32x32 so the canonical SVG remains preferred.
- `document.title` ends with `naeilServiceName(service)`.

`measureNaeilPage` also records viewport height, terminal content bottom, footer height/bottom/viewport gap, owned-shell `footerMetaTexts`, main bottom, configured body family and `renderedFonts`. In-page execution returns `renderedFonts.status="not measured"`: computed font-family does not identify the drawn face. The Chromium CLI fills a visible existing baseline body-text sample’s CDP `CSS.getPlatformFontsForNode` family/glyph/custom-font evidence and reports its status separately. Firefox/WebKit callers retain "not measured"; it is never fabricated as a font pass. The sample selector/text are retained. This aggregate font record is diagnostic, not a per-script font assertion; the live comparison and Chromium frame-font tests isolate Latin/digit/Japanese samples.

Exit 0 means every requested check passed; exit 1 means violations, navigation failures or invalid arguments. Missing consumer Playwright exits 2 with an installation hint. Runtime mode does not apply source-ignore comments. It checks the supplied routes only; CI should list representative authenticated, anonymous, localized, loading and no-footer routes.

For consumer-owned Playwright tests, both shell entries export the self-contained in-page function and its result type:

```ts
import { measureNaeilPage, type NaeilPageMeasurements } from "@naeil/ui/naeil-shell";

const measurements: NaeilPageMeasurements = await page.evaluate(measureNaeilPage);
expect(measurements.headerTitle).toBeCloseTo(48, 1);
```

Call after the title is visible and fonts are ready. Missing required elements return null measurements, permitting a test to report the absent element. Results include `accountCount`, `pageHeaderContent`, the actual document `url`, and absolute icon hrefs. The function closes over no module state and can be serialized directly by Playwright.
