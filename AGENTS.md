# Shared UI work

- Read `DESIGN.md` before changing shared UI. The implementation scope is in `docs/superpowers/specs/2026-09-29-shared-ui-v2-design.md` and consumer guidance in `docs/design/v2-migration.md`.
- This repository contains both the shared `@naeil/ui` package and a website. Do not treat hero illustrations, 3D scenes, cursor effects, or product-specific content as shared design-system requirements.
- Numeric foundation values live in `src/tokens/*.json`. Generate `src/styles/theme.css` with `pnpm build:tokens`; do not hand-edit generated CSS. Shared globals and component behavior styles live in `src/styles/`; site-only styles stay in `src/app/`.
- Prefer existing public components and Radix behavior. Select is a value input; DropdownMenu is an action menu. Preserve public imports and consumer overrides unless a requested change explicitly revises the API.
- Verify relevant tests, contrast, the actual Storybook result, and packed consumption when changing package behavior. Do not claim external design tools were used unless they were actually run. Publishing and site deployment are separate from implementation.

## Frontend references

- For a new frontend page, a substantial design improvement, or an explicit mention of Refero, awesome-design-md, 21st.dev, Component Gallery, Kinetics, or Impeccable, read `skills/frontend-reference-workflow/SKILL.md` and follow its relevant route. Small copy/spacing/bug fixes use the existing system directly unless reference/tool use is explicitly requested.
- `DESIGN.md` remains the visual authority. External references fill identified gaps; generic Impeccable advice must not replace the approved neutral palette, Pretendard, purpose-specific widths, or restrained motion.
- Record adopted sources and actual tool usage in `docs/design/frontend-sources.md`. Environment/install status lives in `docs/design/frontend-tooling.md`; an installed/configured tool is not proof it was executed or authenticated.
