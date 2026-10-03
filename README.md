# @naeil/ui

React components, semantic design tokens, and shared styles for naeil products. The approved system uses a neutral light/dark palette, Pretendard, 16px controls, comfortable or compact density, purpose-specific content widths, and restrained motion. Radix supplies interaction behavior.

This repository also contains the **naeil.dev brand/example website** and an **optional agent reference workflow**. Choose the path you need:

| Path | Start here | Tools / keys |
| --- | --- | --- |
| Use the UI in an app | [Consumer guide](docs/design/v2-migration.md) | React 19, Tailwind 4; **no Next.js or API keys** for `/ui` |
| Develop the shared UI | Commands below and [contributing](https://github.com/naeil-dev/naeil-ui/blob/81fd395031dc5b20074c4d915a8585360ce2d28a/CONTRIBUTING.md) | Node.js 22+, pnpm; no Supabase or 21st key |
| Use frontend references with an agent | [Optional workflow setup](https://github.com/naeil-dev/naeil-ui/blob/81fd395031dc5b20074c4d915a8585360ce2d28a/docs/design/frontend-tooling.md) | Supported agent; Python for bundled helpers; your own 21st key only for optional MCP |
| Develop the brand/example website | [Site setup](https://github.com/naeil-dev/naeil-ui/blob/81fd395031dc5b20074c4d915a8585360ce2d28a/docs/site-development.md) | Next.js and a separate Supabase project for site authentication |

## Use the UI

This guide targets **@naeil/ui 0.3.0** with React 19 / ReactDOM 19 and Tailwind 4. UI v2 names the design generation, independently of npm versioning. Install the exact version in your app:

```sh
pnpm add --save-exact @naeil/ui@0.3.0
# npm install --save-exact @naeil/ui@0.3.0
```

**0.3.0 was published to npm on 2026-10-03** and verified as `latest` that day. See the [release](https://github.com/naeil-dev/naeil-ui/releases/tag/v0.3.0) and [registry/clean-consumer evidence](https://github.com/naeil-dev/naeil-ui/releases/download/v0.3.0/npm-publication-verification.json). The [changelog](CHANGELOG.md) describes this version's changes; use the local package workflow below for source-checkout validation.

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

The [13 component guides](docs/components/README.md) cover exact APIs, state composition and accessibility responsibilities. Each has a built Storybook Docs page and runnable Usage example. The [consumer guide](docs/design/v2-migration.md) covers peer dependencies, fonts, themes, density, Select versus DropdownMenu, overrides, and layout ownership. Fonts are delivered by the consumer; shared CSS does not fetch them automatically. `/ui` and `/utils` work without Next.js. The legacy root remains a framework compatibility entry with static Next/next-intl imports; install those optional peers when using it, Nav, Footer or i18n/routing. ThemeProvider/controls and Toaster retain the React library next-themes. Shared deep imports use the exact [allowlist and migration](docs/design/v2-migration.md#03-package-boundary); website-only paths belong in your application.

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
# In your consumer app: pnpm add /tmp/naeil-ui-0.3.0.tgz
```

| Command | Purpose |
| --- | --- |
| `pnpm build:tokens` | Generate theme CSS from `src/tokens/*.json` |
| `pnpm check:contrast` | Check declared light/dark color combinations |
| `pnpm test` / `pnpm check:types` / `pnpm lint` | Unit tests / types / lint |
| `pnpm build:storybook` / `pnpm test:browser` | Build Docs/examples / Chromium, Firefox and WebKit checks (install configured Playwright engines first) |
| `pnpm build:pkg` / `pnpm check:package` | Build package / inspect package boundary and independently install/build packed React + Next consumers |
| `pnpm dev` / `pnpm build` | Brand/example website development / build |

A [reusable React consumer example](https://github.com/naeil-dev/naeil-ui/blob/81fd395031dc5b20074c4d915a8585360ce2d28a/examples/react/README.md) shows a settings form. [Release policy](docs/package-release.md) and [changelog](CHANGELOG.md) distinguish implementation, publication and deployment. CI verifies the package and separate website/Storybook. Downloadable preview artifacts include notices and local fonts. [Hosted Docs](https://naeil-dev.github.io/naeil-ui/) are live: the [2026-10-02 Pages run](https://github.com/naeil-dev/naeil-ui/actions/runs/36963256014) and [release evidence](https://github.com/naeil-dev/naeil-ui/releases/tag/v0.3.0) record deployment and hosted HTTP/navigation/font checks. See [preview instructions](docs/package-release.md#storybook-preview-artifact) and [support limits](docs/design/public-ui-support.md). Native/manual platform acceptance and adoption in a real consumer product remain open.

Read [DESIGN.md](DESIGN.md) before shared UI changes. Numeric values live in `src/tokens/`; generated CSS is not edited by hand. Shared styles live in `src/styles/`, site-only styles in `src/app/`. Hero art, 3D scenes, cursor effects, and site content belong to the example website.

[Documentation index](https://github.com/naeil-dev/naeil-ui/blob/04c5b8cce145a4c387763db6f28d29e62f7664c7/docs/README.md) separates maintained guides from dated implementation/review evidence. Historical checks describe their recorded revision and scope; publishing, merging, and site deployment are separate actions.

## Project and license

Maintained in [naeil-dev/naeil-ui](https://github.com/naeil-dev/naeil-ui). See [contributing](https://github.com/naeil-dev/naeil-ui/blob/81fd395031dc5b20074c4d915a8585360ce2d28a/CONTRIBUTING.md), [security reporting](https://github.com/naeil-dev/naeil-ui/blob/81fd395031dc5b20074c4d915a8585360ce2d28a/SECURITY.md), [MIT license](LICENSE), and [third-party notices](THIRD_PARTY_NOTICES.md). Third-party code, fonts, and brand assets have their own attribution and scope limits.
