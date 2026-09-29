# Shared UI work

- Read `DESIGN.md` before changing shared UI. The implementation scope is in `docs/superpowers/specs/2026-09-29-shared-ui-v2-design.md` and consumer guidance in `docs/design/v2-migration.md`.
- This repository contains both the shared `@naeil/ui` package and a website. Do not treat hero illustrations, 3D scenes, cursor effects, or product-specific content as shared design-system requirements.
- Numeric foundation values live in `src/tokens/*.json`. Generate `src/styles/theme.css` with `pnpm build:tokens`; do not hand-edit generated CSS. Shared globals and component behavior styles live in `src/styles/`; site-only styles stay in `src/app/`.
- Prefer existing public components and Radix behavior. Select is a value input; DropdownMenu is an action menu. Preserve public imports and consumer overrides unless a requested change explicitly revises the API.
- Verify relevant tests, contrast, the actual Storybook result, and packed consumption when changing package behavior. Do not claim external design tools were used unless they were actually run. Publishing and site deployment are separate from implementation.
