# @naeil/ui

React components, semantic design tokens, and shared styles for naeil products. The approved system uses a neutral light/dark palette, Pretendard, 16px controls, comfortable or compact density, purpose-specific content widths, and restrained motion. Radix supplies interaction behavior.

This repository also contains the **naeil.dev brand/example website** and an **optional agent reference workflow**. Choose the path you need:

| Path | Start here | Tools / keys |
| --- | --- | --- |
| Use the UI in an app | [Consumer guide](docs/design/v2-migration.md) | React 19, Tailwind 4; **no Next.js or API keys** for `/ui` |
| Develop the shared UI | Commands below and [contributing](https://github.com/naeil-dev/naeil-ui/blob/main/CONTRIBUTING.md) | Node.js 22+, pnpm; no Supabase or 21st key |
| Use frontend references with an agent | [Optional workflow setup](https://github.com/naeil-dev/naeil-ui/blob/main/docs/design/frontend-tooling.md) | Supported agent; Python for bundled helpers; your own 21st key only for optional MCP |
| Develop the brand/example website | [Site setup](https://github.com/naeil-dev/naeil-ui/blob/main/docs/site-development.md) | Next.js and a separate Supabase project for site authentication |

## Use the UI

The prepared source version is **0.3.0, unreleased**. npm latest was **0.2.0** on 2026-10-02. UI v2 is a design generation, not npm 2.0. The v2 CSS/APIs and package boundary described here require the local 0.3.0 tarball below or a later authorized release; installing npm latest currently installs the older package.

```sh
# In your app, after building the local tarball as described below:
pnpm add /tmp/naeil-ui-0.3.0.tgz
```

Import primitives from the dedicated entrypoint:

```tsx
import { Button, Input } from '@naeil/ui/ui';

export function NameField() {
  return <label>Name <Input name="name" /></label>;
}
```

In a Tailwind 4 app, load the styles once and register the package's classes (adjust the source path relative to your CSS file):

```css
@import "@naeil/ui/globals.css";
@source "../node_modules/@naeil/ui/dist";
```

The [consumer guide](docs/design/v2-migration.md) covers peer dependencies, fonts, themes, density, Select versus DropdownMenu, overrides, and layout ownership. Fonts are delivered by the consumer; shared CSS does not fetch them automatically. `/ui` and `/utils` work without Next.js. The legacy root remains a framework compatibility entry with static Next/next-intl imports; install those optional peers when using it, Nav, Footer or i18n/routing. ThemeProvider/controls and Toaster retain the React library next-themes. Shared deep imports use the exact [allowlist and migration](docs/design/v2-migration.md#03-package-boundary); website-only paths belong in your application.

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
| `pnpm build:storybook` / `pnpm test:browser` | Build Storybook / Chromium component checks (install Playwright Chromium first) |
| `pnpm build:pkg` / `pnpm check:package` | Build package / inspect package boundary and independently install/build packed React + Next consumers |
| `pnpm dev` / `pnpm build` | Brand/example website development / build |

A [reusable React consumer example](https://github.com/naeil-dev/naeil-ui/blob/main/examples/react/README.md) shows a settings form. [Release policy](docs/package-release.md) and [changelog](CHANGELOG.md) distinguish implementation, publication and deployment. CI verifies the package and separate website/Storybook.

Read [DESIGN.md](DESIGN.md) before shared UI changes. Numeric values live in `src/tokens/`; generated CSS is not edited by hand. Shared styles live in `src/styles/`, site-only styles in `src/app/`. Hero art, 3D scenes, cursor effects, and site content belong to the example website.

[Documentation index](https://github.com/naeil-dev/naeil-ui/blob/main/docs/README.md) separates maintained guides from dated implementation/review evidence. Historical checks describe their recorded revision and scope; publishing, merging, and site deployment are separate actions.

## Project and license

Maintained in [naeil-dev/naeil-ui](https://github.com/naeil-dev/naeil-ui). See [contributing](https://github.com/naeil-dev/naeil-ui/blob/main/CONTRIBUTING.md), [security reporting](https://github.com/naeil-dev/naeil-ui/blob/main/SECURITY.md), [MIT license](LICENSE), and [third-party notices](THIRD_PARTY_NOTICES.md). Third-party code, fonts, and brand assets have their own attribution and scope limits.
