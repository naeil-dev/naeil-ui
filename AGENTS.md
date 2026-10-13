# Shared UI work

- Read `DESIGN.md` before changing shared UI. The implementation scope is in `docs/superpowers/specs/2026-09-29-shared-ui-v2-design.md` and consumer guidance in `docs/design/v2-migration.md`.
- This repository contains both the shared `@naeil/ui` package and a website. Do not treat hero illustrations, 3D scenes, cursor effects, or product-specific content as shared design-system requirements.
- Numeric foundation values live in `src/tokens/*.json`. Generate `src/styles/theme.css` with `pnpm build:tokens`; do not hand-edit generated CSS. Shared globals and component behavior styles live in `src/styles/`; site-only styles stay in `src/app/`.
- Prefer existing public components and Radix behavior. Select is a value input; DropdownMenu is an action menu. Preserve public imports and consumer overrides unless a requested change explicitly revises the API.
- Shared navigation and footer use `Navigation` and `SiteFooter` from `@naeil/ui/ui`; `Nav` and `Footer` are the Next/next-intl compatibility adapters. New consumers (including the Naeil Home migration) supply menu data, routing, translations, auth and product frame widths instead of copying an independent header/footer. See `docs/components/navigation.md` and `docs/design/navigation-footer-integration.md` for the contract and rollout status.
- For layout changes, separate the product's application frame from purpose-specific content widths. Compare affected routes under matching viewport/language/theme conditions; shared component imports do not prove stable navigation. Follow the composition guidance in `docs/design/v2-migration.md` and retain unresolved prior findings until rechecked.
- Verify relevant tests, contrast, the actual Storybook result, and packed consumption when changing package behavior. Do not claim external design tools were used unless they were actually run. Publishing and site deployment are separate from implementation.
- Browser titles follow `Page name — Service name` (home/landing may use the service name alone). Use canonical `.naeil` / `Naeil Home`, localize page names only, and retain the service favicon across routes. Follow DESIGN.md's Browser identity and `docs/design/v2-migration.md`; metadata belongs to the consumer application, not implicit Navigation/Logo behavior.

## Frontend references

- For a new frontend page, a substantial design improvement, or an explicit mention of Refero, awesome-design-md, 21st.dev, Component Gallery, Kinetics, or Impeccable, read `skills/frontend-reference-workflow/SKILL.md` and follow its relevant route. Small copy/spacing/bug fixes use the existing system directly unless reference/tool use is explicitly requested.
- `DESIGN.md` remains the visual authority. External references fill identified gaps; generic Impeccable advice must not replace the approved neutral palette, Pretendard, purpose-specific widths, or restrained motion.
- Record adopted sources and actual tool usage in `docs/design/frontend-sources.md`. Environment/install status lives in `docs/design/frontend-tooling.md`; an installed/configured tool is not proof it was executed or authenticated.
