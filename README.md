# @naeil/ui

React components, semantic design tokens, and shared styles for naeil products. The approved system uses a neutral light/dark palette, Pretendard, 16px controls, comfortable or compact density, purpose-specific content widths, and restrained motion. Radix supplies interaction behavior.

This repository also contains the **naeil.dev brand/example website** and an **optional agent reference workflow**. Choose the path you need:

| Path | Start here | Tools / keys |
| --- | --- | --- |
| Use the UI in an app | [Consumer guide](docs/design/v2-migration.md) | React 19, Tailwind 4, declared package peers; **no API keys** |
| Develop the shared UI | Commands below and [contributing](CONTRIBUTING.md) | Node.js 22+, pnpm; no Supabase or 21st key |
| Use frontend references with an agent | [Optional workflow setup](docs/design/frontend-tooling.md) | Supported agent; Python for bundled helpers; your own 21st key only for optional MCP |
| Develop the brand/example website | [Site setup](docs/site-development.md) | Next.js and a separate Supabase project for site authentication |

## Use the UI

The source manifest version is `0.2.0`; that alone does not prove an npm release exists. Install an available published version, or build a local tarball as described below.

```sh
pnpm add @naeil/ui
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

The [consumer guide](docs/design/v2-migration.md) covers peer dependencies, fonts, themes, density, Select versus DropdownMenu, overrides, and layout ownership. Fonts are delivered by the consumer; shared CSS does not fetch them automatically. Existing root and deep imports remain compatibility contracts; the primitive entrypoint is the starting point for ordinary UI use.

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
# In your consumer app: pnpm add /tmp/naeil-ui-0.2.0.tgz
```

| Command | Purpose |
| --- | --- |
| `pnpm build:tokens` | Generate theme CSS from `src/tokens/*.json` |
| `pnpm check:contrast` | Check declared light/dark color combinations |
| `pnpm test` / `pnpm lint` | Unit tests / lint |
| `pnpm build:storybook` / `pnpm test:browser` | Build Storybook / Chromium component checks (install Playwright Chromium first) |
| `pnpm build:pkg` / `pnpm check:package` | Build package / verify packed consumption |
| `pnpm dev` / `pnpm build` | Brand/example website development / build |

Read [DESIGN.md](DESIGN.md) before shared UI changes. Numeric values live in `src/tokens/`; generated CSS is not edited by hand. Shared styles live in `src/styles/`, site-only styles in `src/app/`. Hero art, 3D scenes, cursor effects, and site content belong to the example website.

[Documentation index](docs/README.md) separates maintained guides from dated implementation/review evidence. Historical checks describe their recorded revision and scope; publishing, merging, and site deployment are separate actions.

## Project and license

Maintained in [naeil-dev/naeil-ui](https://github.com/naeil-dev/naeil-ui). See [contributing](CONTRIBUTING.md), [security reporting](SECURITY.md), [MIT license](LICENSE), and [third-party notices](THIRD_PARTY_NOTICES.md). Third-party code, fonts, and brand assets have their own attribution and scope limits.
