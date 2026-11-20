# @naeil/ui

React components, semantic design tokens, and shared styles for naeil products. The approved system uses a neutral light/dark palette, Pretendard, 16px controls, comfortable or compact density, purpose-specific content widths, and restrained motion. Radix supplies interaction behavior.

Publication, hosted Docs and service adoption status live in [STATUS.md](https://github.com/naeil-dev/naeil-ui/blob/main/STATUS.md#current-state). See the [release procedure](docs/package-release.md), [changelog](CHANGELOG.md) and [shell/CI guide](docs/components/naeil-shell.md).

This repository also contains the **naeil.dev brand/example website** and an **optional agent reference workflow**. Choose the path you need:

| Path | Start here | Tools / keys |
| --- | --- | --- |
| Use the UI in an app | [Consumer guide](docs/design/v2-migration.md) | React 19, Tailwind 4; **no Next.js or API keys** for shared React entries |
| Develop the shared UI | Commands below and [contributing](https://github.com/naeil-dev/naeil-ui/blob/main/CONTRIBUTING.md) | Node.js 22+, pnpm; no Supabase or 21st key |
| Use frontend references with an agent | [Optional workflow setup](https://github.com/naeil-dev/naeil-ui/blob/main/docs/design/frontend-tooling.md) | Supported agent; Python for bundled helpers; your own 21st key only for optional MCP |
| Develop the brand/example website | [Site setup](https://github.com/naeil-dev/naeil-ui/blob/main/docs/site-development.md) | Next.js and a separate Supabase project for site authentication |

## Use the UI

Use React 19 / ReactDOM 19 and Tailwind 4. UI v2 names the design generation independently of npm versioning. Choose an exact published version from [STATUS.md](https://github.com/naeil-dev/naeil-ui/blob/main/STATUS.md#current-state) and the registry, and follow the [required migration checklist](docs/design/v2-migration.md#0170-required-consumer-migration):

```sh
pnpm add --save-exact @naeil/ui@VERSION
# Replace VERSION with the reviewed published version.
```

For local development, `pnpm build:pkg` and `npm pack --ignore-scripts --pack-destination /tmp` produce `/tmp/naeil-ui-VERSION.tgz`, with `VERSION` from `package.json`. Development packs do not replace frozen release archives. The [independent brand kit](https://github.com/naeil-dev/naeil-ui/releases/download/v0.4.0/naeil-brand-1.1.1.zip) provides SVG/PNG/icons for non-React usage; see [brand usage](docs/design/v2-migration.md#brand-logo-integration-040).

Choose the shared application composition before building a header or footer:

| Application need | Shared component |
| --- | --- |
| Actual naeil.dev brand, project catalog and controls | `NaeilServiceShell service="main"`; standalone `NaeilHeader` remains a compatibility API |
| Owned-service login, account and logout presentation (since 0.16.0) | Shell `account`; standalone headers retain `NaeilHeaderAccountControl` in `authSlot` |
| Owned service frame (since 0.15.0) | `NaeilServiceShell` + root `NaeilThemeProvider` from `/naeil-shell` or provider-backed `/naeil-locale/chrome` |
| Owned naeil service footer | Included by the shell; recorded no-footer screens use `footer={false}` |
| A different product without canonical naeil chrome | `Navigation` from `@naeil/ui/ui` |
| Different product footer or deliberate content override | `SiteFooter` from `@naeil/ui/ui` |

Owned services use `NaeilServiceShell` and the root `NaeilThemeProvider`, start pages with `PageHeader`, and run `naeil-ui-conformance` in CI. Supply product menu/auth/locale state through `header`, and shared routing/save guards through the shell's `Link`/`onNavigate`. `NaeilHeaderAccountControl` receives session state, a busy flag and the guarded logout callback; keep pending state and its request lock above the shell so desktop/mobile copies share them. The shell owns skip link, header, focusable main, 1600px frame/gutters, page spacing and full footer. Keep 640px reading/settings or 480px short-form sections inside main through `data-ui-layout`. See [the shell API and every conformance rule](docs/components/naeil-shell.md) and [application starter](docs/components/application-layout.md). Standalone header/footer and generic Navigation/SiteFooter remain supported compatibility compositions.

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

Import the package's fonts once; applications do not install or import Pretendard/Noto themselves:

```css
@import "@naeil/ui/fonts.css";
```

Mark Japanese content with `lang="ja"`. Latin letters and digits use Pretendard in every language; Japanese glyphs use Noto Sans JP. Keep the packaged OFL notices with redistributed builds. See the [screen frame contract](DESIGN.md#screen-frame-contract).

Shared CSS follows the OS theme unless the document root has `class="light"` or `class="dark"`. For compact spacing, set `data-ui-density="compact"` on that root; omit it for comfortable spacing. Density changes spacing while retaining 16px control text and minimum mobile touch sizes. React apps can also use `ThemeProvider` from `@naeil/ui/components/theme-provider` with `attribute="class"`.

The [component guides](docs/components/README.md) cover exact APIs, state composition and accessibility responsibilities, with matching Storybook Docs and runnable examples. Canonical footer and account examples live in the existing NaeilHeader/SiteFooter stories. The [consumer guide](docs/design/v2-migration.md) covers peer dependencies, fonts, themes, density, Select versus DropdownMenu, overrides, and layout ownership. Fonts are delivered by the package through the explicit `fonts.css` import. `/ui`, `/utils`, `/naeil-header`, `/naeil-footer`, `/naeil-shell` and `/release` work without Next.js; footer/release entries were included in 0.7.1, and the shell entry was added in 0.15.0. Root and `components/index` exports are React-only. The `i18n/routing` compatibility path still requires the optional Next/next-intl peers. ThemeProvider/controls and Toaster retain the React library next-themes. Shared deep imports use the exact [allowlist and migration](docs/design/v2-migration.md#03-package-boundary); website-only paths belong in your application.

For the actual naeil.dev branded header, import `NaeilHeader` and `NaeilHeaderAccountControl` from `@naeil/ui/naeil-header`; generic `Navigation` from `/ui` remains available for different product menus. The whole header owns its catalog, header translations, controls and responsive styles. Supply routing/dirty guards and real authentication state/actions through its props; naeil.dev uses the same fixed root `NaeilThemeProvider`. Owned services use the shell composition above. Its single decorative project image (`whale.png`) references an official `naeil.dev` URL and require network access; their bytes are excluded and unresolved redistribution provenance remains in [third-party notices](THIRD_PARTY_NOTICES.md). See [NaeilHeader](docs/components/naeil-header.md) for fixed positioning, the shared frame, supported locales and adapter contract, and [NaeilFooter](docs/components/naeil-footer.md) for canonical destinations and save interception.

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
# In your consumer app: pnpm add /tmp/naeil-ui-VERSION.tgz (VERSION from package.json)
# This development pack does not replace the frozen release archive.
```

| Command | Purpose |
| --- | --- |
| `pnpm build:tokens` | Generate theme CSS from `src/tokens/*.json` |
| `pnpm check:contrast` | Check declared light/dark color combinations |
| `pnpm test` / `pnpm check:types` / `pnpm lint` | Unit tests (includes 9 Chromium tests; run `pnpm exec playwright install chromium` first) / types / lint |
| `pnpm build:storybook` / `pnpm test:browser` | Build Docs/examples / Chromium, Firefox and WebKit checks (install configured Playwright engines first) |
| `pnpm build:pkg` / `pnpm check:package` | Build package / inspect package boundary and independently install/build packed React + Next consumers |
| `pnpm check:package:boundary` | Inspect the built package without rebuilding consumer applications |
| `pnpm dev` / `pnpm build` | Brand/example website development / build |

The retired 0.7.x rollout runner and its verifier are preserved at [archive/rollout-runner-20261118](https://github.com/naeil-dev/naeil-ui/tree/archive/rollout-runner-20261118/); current service deployment and rollback use the [service runbooks](https://github.com/naeil-dev/naeil-ui/blob/main/docs/rollout/auto-update.md#service-deployment-and-rollback-runbooks).

A [reusable React consumer example](https://github.com/naeil-dev/naeil-ui/tree/main/examples/react) composes the packaged header, a settings form and footer. [Release policy](docs/package-release.md) and [changelog](CHANGELOG.md) distinguish implementation, publication and deployment. CI verifies the package and separate website/Storybook. Downloadable preview artifacts include notices and local fonts. Storybook includes the public component Docs and runnable examples; canonical footer and account examples live in NaeilHeader/SiteFooter stories. [STATUS.md](https://github.com/naeil-dev/naeil-ui/blob/main/STATUS.md#current-state) records hosted Docs and service adoption. See [preview instructions](docs/package-release.md#storybook-preview-artifact) and [support limits](docs/design/public-ui-support.md) for verification scope and native/manual limits.

Read [DESIGN.md](DESIGN.md) before shared UI changes. Numeric values live in `src/tokens/`; generated CSS is not edited by hand. Shared styles live in `src/styles/`, site-only styles in `src/app/`. Hero art, 3D scenes, cursor effects, and site content belong to the example website.

[Documentation index](https://github.com/naeil-dev/naeil-ui/blob/main/docs/README.md) separates maintained guides from dated implementation/review evidence. Historical checks describe their recorded revision and scope; publishing, merging, and site deployment are separate actions.

## Project and license

Maintained in [naeil-dev/naeil-ui](https://github.com/naeil-dev/naeil-ui). See [contributing](https://github.com/naeil-dev/naeil-ui/blob/main/CONTRIBUTING.md), [security reporting](https://github.com/naeil-dev/naeil-ui/blob/main/SECURITY.md), [MIT license](LICENSE), and [third-party notices](THIRD_PARTY_NOTICES.md). Third-party code, fonts, and brand assets have their own attribution and scope limits.
