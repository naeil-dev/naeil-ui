# @naeil/ui

React components, semantic design tokens, and shared styles for naeil products. The approved system uses a neutral light/dark palette, Pretendard, 16px controls, comfortable or compact density, purpose-specific content widths, and restrained motion. Radix supplies interaction behavior.

**Version 0.9.0 adds the shared page-root scrollbar reservation and scroll-lock correction.** Use an exact version with verified registry publication and archive identity. At the 2026-10-29 verification, the published 0.8.0 archive matched frozen SHA-256 `6feb5a8cd50265ace584a0855432683b4127119377e08235282eaebd27081084` (139 files, source `3f708e27d05212af7f7a5be769f13f871e8d10c7`); tags were `latest=0.7.2`, `next=0.8.0`. Current publication, hosted Docs and per-service deployment have separate receipts in the [release policy](docs/package-release.md#publication-and-deployment).

This repository also contains the **naeil.dev brand/example website** and an **optional agent reference workflow**. Choose the path you need:

| Path | Start here | Tools / keys |
| --- | --- | --- |
| Use the UI in an app | [Consumer guide](docs/design/v2-migration.md) | React 19, Tailwind 4; **no Next.js or API keys** for shared React entries |
| Develop the shared UI | Commands below and [contributing](https://github.com/naeil-dev/naeil-ui/blob/81fd395031dc5b20074c4d915a8585360ce2d28a/CONTRIBUTING.md) | Node.js 22+, pnpm; no Supabase or 21st key |
| Use frontend references with an agent | [Optional workflow setup](https://github.com/naeil-dev/naeil-ui/blob/81fd395031dc5b20074c4d915a8585360ce2d28a/docs/design/frontend-tooling.md) | Supported agent; Python for bundled helpers; your own 21st key only for optional MCP |
| Develop the brand/example website | [Site setup](https://github.com/naeil-dev/naeil-ui/blob/81fd395031dc5b20074c4d915a8585360ce2d28a/docs/site-development.md) | Next.js and a separate Supabase project for site authentication |

## Use the UI

Use React 19 / ReactDOM 19 and Tailwind 4. UI v2 names the design generation independently of npm versioning. The installation example targets 0.9.0; run it after verifying that exact version's registry publication:

```sh
pnpm add --save-exact @naeil/ui@0.9.0
```

The [npm 0.8.0 archive](https://registry.npmjs.org/@naeil/ui/-/ui-0.8.0.tgz) is byte-identical to its frozen release archive. Bundled guides record the preparation snapshot; maintained guides record later publication outcomes. For local development, `pnpm build:pkg` and `npm pack --ignore-scripts --pack-destination /tmp` produce `/tmp/naeil-ui-0.9.0.tgz` from the checked-out source. Use the exact reviewed archive for release verification; later source or guide changes require a new freeze. The [0.6.0 release record](https://github.com/naeil-dev/naeil-ui/releases/tag/v0.6.0) retains its archive, publication and deployment evidence.

The preceding [0.5.0 release](https://github.com/naeil-dev/naeil-ui/releases/tag/v0.5.0) was published on 2026-10-15 and introduced the whole shared header. Version 0.6.0 adds the shared 1600px frame; existing applications must upgrade and adopt its layout composition.

Version 0.4.0 was published to npm on 2026-10-11 and verified as `latest`; it adds the approved `.naeil` brand 1.1.1. The [release](https://github.com/naeil-dev/naeil-ui/releases/tag/v0.4.0) retains the byte-verified archive and fresh registry-consumer evidence. Download the [independent brand kit](https://github.com/naeil-dev/naeil-ui/releases/download/v0.4.0/naeil-brand-1.1.1.zip) for SVG/PNG/icons and non-React usage. See the [changelog](CHANGELOG.md), [brand usage](docs/design/v2-migration.md#brand-logo-integration-040) and [publication report](https://github.com/naeil-dev/naeil-ui/blob/main/docs/design/naeil-brand-0.4.0-publication.md).

Choose the shared application composition before building a header or footer:

| Application need | Shared component |
| --- | --- |
| Actual naeil.dev brand, project catalog and controls | `NaeilHeader` from `@naeil/ui/naeil-header` |
| Owned-service login, account and logout presentation (0.7.1) | `NaeilHeaderAccountControl` from `@naeil/ui/naeil-header`, passed in `authSlot` |
| Owned naeil service footer (0.7.1) | `NaeilFooter` from `@naeil/ui/naeil-footer` |
| A different product without canonical naeil chrome | `Navigation` from `@naeil/ui/ui` |
| Different product footer or deliberate content override | `SiteFooter` from `@naeil/ui/ui` |
| Existing Next/next-intl integration | Preserve `Nav` / `Footer` compatibility adapters |

Pair the complete `NaeilHeader` and `NaeilFooter` in owned services, including product menus via `appNavigation`. Supply application routing, guards, authentication and menu data through adapters and slots. `NaeilHeaderAccountControl` receives session state, a busy flag and the guarded logout callback; keep pending state and its request lock above the header so desktop/mobile copies share them. Keep the shared menu, mobile sheet, account presentation and footer implementation in the package. The [application layout guide](docs/components/application-layout.md) provides a starter and consumer-agent instructions. Header, main and footer share a 1600px maximum frame with `clamp(16px, 2.4vw, 40px)` gutters; use `ui-app-frame` on main and keep 640px reading/settings or 480px short-form sections inside it.

Import primitives from the dedicated entrypoint:

```tsx
import { Input } from '@naeil/ui/ui';

export function NameField() {
  return <label>Name <Input name="name" /></label>;
}
```

In a Tailwind 4 app, load the styles once and register the package's classes (adjust the source path relative to your CSS file):

```css
@import "@naeil/ui/globals.css";
@source "../node_modules/@naeil/ui/dist";
```

If your app already owns its Tailwind/base styles, import both `@naeil/ui/theme.css` and `@naeil/ui/components.css` instead of globals, and keep the same `@source` registration.

Fonts are consumer-owned. One locally bundled option is:

```sh
pnpm add --save-exact pretendard@1.3.9 @fontsource/noto-sans-jp@5.3.0
```

```tsx
// In the app entrypoint; choose the faces your content needs.
import 'pretendard/dist/web/static/pretendard.css';
import '@fontsource/noto-sans-jp/400.css';
import '@fontsource/noto-sans-jp/500.css';
import '@fontsource/noto-sans-jp/600.css';
```

Mark Japanese content with `lang="ja"`. Keep font OFL notices with redistributed builds; shared CSS uses system fallbacks when fonts fail. The package adds no font runtime dependency.

Shared CSS follows the OS theme unless the document root has `class="light"` or `class="dark"`. For compact spacing, set `data-ui-density="compact"` on that root; omit it for comfortable spacing. Density changes spacing while retaining 16px control text and minimum mobile touch sizes. React apps can also use `ThemeProvider` from `@naeil/ui/components/theme-provider` with `attribute="class"`.

The [component guides](docs/components/README.md) cover exact APIs, state composition and accessibility responsibilities, with matching Storybook Docs and runnable examples. Canonical footer and account examples live in the existing NaeilHeader/SiteFooter stories. The [consumer guide](docs/design/v2-migration.md) covers peer dependencies, fonts, themes, density, Select versus DropdownMenu, overrides, and layout ownership. Fonts are delivered by the consumer; shared CSS does not fetch them automatically. `/ui`, `/utils`, `/naeil-header`, `/naeil-footer` and `/release` work without Next.js; the last two are included in 0.7.1. The legacy root remains a framework compatibility entry with static Next/next-intl imports; install those optional peers when using it, Nav, Footer or i18n/routing. ThemeProvider/controls and Toaster retain the React library next-themes. Shared deep imports use the exact [allowlist and migration](docs/design/v2-migration.md#03-package-boundary); website-only paths belong in your application.

For the actual naeil.dev branded header, import `NaeilHeader` and `NaeilHeaderAccountControl` from `@naeil/ui/naeil-header`; generic `Navigation` from `/ui` remains available for different product menus. The whole header owns its catalog, header translations, controls and responsive styles. Supply routing/dirty guards, an existing next-themes provider and real authentication state/actions through its props. Its five decorative project images reference official `naeil.dev` URLs and require network access; their bytes are excluded and unresolved redistribution provenance remains in [third-party notices](THIRD_PARTY_NOTICES.md). See [NaeilHeader](docs/components/naeil-header.md) for fixed positioning, the shared frame, supported locales and adapter contract, and [NaeilFooter](docs/components/naeil-footer.md) for canonical destinations and save interception.

## Develop the shared UI

From the repository root:

```sh
pnpm install --frozen-lockfile
pnpm storybook
# http://localhost:6006 — UI v2 / Workspace
```

Storybook uses the actual public components with simulated example data. It needs no Supabase project or external design API. For local package consumption:

```sh
pnpm build:pkg
pnpm pack --pack-destination /tmp
# In your consumer app: pnpm add /tmp/naeil-ui-0.7.1.tgz
# This development pack does not replace the frozen release archive.
```

| Command | Purpose |
| --- | --- |
| `pnpm build:tokens` | Generate theme CSS from `src/tokens/*.json` |
| `pnpm check:contrast` | Check declared light/dark color combinations |
| `pnpm test` / `pnpm check:types` / `pnpm lint` | Unit tests / types / lint |
| `pnpm build:storybook` / `pnpm test:browser` | Build Docs/examples / Chromium, Firefox and WebKit checks (install configured Playwright engines first) |
| `pnpm build:pkg` / `pnpm check:package` | Build package / inspect package boundary and independently install/build packed React + Next consumers |
| `pnpm dev` / `pnpm build` | Brand/example website development / build |

A [reusable React consumer example](https://github.com/naeil-dev/naeil-ui/tree/main/examples/react) composes the packaged header, a settings form and footer. [Release policy](docs/package-release.md) and [changelog](CHANGELOG.md) distinguish implementation, publication and deployment. CI verifies the package and separate website/Storybook. Downloadable preview artifacts include notices and local fonts. The current Storybook source defines 17 Docs pages (15 UI families and Brand / Logo plus NaeilHeader), including Usage, JapaneseApplication, ReferenceFull, ReferenceCompact and AccountStates examples. This does not establish a new hosted deployment. [Hosted Docs](https://naeil-dev.github.io/naeil-ui/) have recorded [0.5.0 verification](https://github.com/naeil-dev/naeil-ui/releases/download/v0.5.0/hosted-docs-verification.json); subsequent deployments require their own source and HTTP checks. The same approved brand is live on [naeil.dev](https://naeil.dev/). See [preview instructions](docs/package-release.md#storybook-preview-artifact) and [support limits](docs/design/public-ui-support.md). Native/manual platform acceptance retains its documented limits; service adoption and continuous rollout have separate [dated records](https://github.com/naeil-dev/naeil-ui/tree/main/docs/rollout).

Read [DESIGN.md](DESIGN.md) before shared UI changes. Numeric values live in `src/tokens/`; generated CSS is not edited by hand. Shared styles live in `src/styles/`, site-only styles in `src/app/`. Hero art, 3D scenes, cursor effects, and site content belong to the example website.

[Documentation index](https://github.com/naeil-dev/naeil-ui/blob/main/docs/README.md) separates maintained guides from dated implementation/review evidence. Historical checks describe their recorded revision and scope; publishing, merging, and site deployment are separate actions.

## Project and license

Maintained in [naeil-dev/naeil-ui](https://github.com/naeil-dev/naeil-ui). See [contributing](https://github.com/naeil-dev/naeil-ui/blob/81fd395031dc5b20074c4d915a8585360ce2d28a/CONTRIBUTING.md), [security reporting](https://github.com/naeil-dev/naeil-ui/blob/81fd395031dc5b20074c4d915a8585360ce2d28a/SECURITY.md), [MIT license](LICENSE), and [third-party notices](THIRD_PARTY_NOTICES.md). Third-party code, fonts, and brand assets have their own attribution and scope limits.
