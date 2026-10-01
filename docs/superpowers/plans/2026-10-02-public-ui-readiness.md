# Public UI readiness — execution and verification

This is the current task record. Earlier design and workflow reports retain their original dates and scope; they do not approve this work. DESIGN.md and the shared UI v2 specification remain the visual authority.

## Baseline and boundaries

- Remote main was fetched and independently read on 2026-10-02: `d963dc5c1bbd49a1159d445edbb4c30309d96db9`.
- Work is isolated on `feat/public-ui-readiness`, based on that remote commit. Both existing checkouts are preserved. The original main checkout has 11 unrelated modified/untracked files; a private content-hash baseline is retained for a final preservation check.
- npm registry read on 2026-10-02: versions `0.1.0`, `0.2.0`; latest `0.2.0`, published 2026-03-22. No GitHub Releases were listed. Registry publication and GitHub Releases are separate actions.
- Preserve approved neutral colors, Pretendard/Japanese companion, density, content widths, restrained motion, Radix behavior and consumer overrides. Site content and agent tooling are separate products.
- GPT-6.1 Sol (`gpt-6.1-sol`) is exposed by the agent runtime and was confirmed in provider model discovery. New execution agents are used for each stage; implementation and review have different owners. The orchestrator owns this record, dependency decisions, integration, direct verification and PR preparation.

## Stages and ownership

| Stage | Owner / scope | Depends on | Acceptance / status |
| --- | --- | --- | --- |
| 1. Public entry | New Sol medium executor: README, legal/contribution/security/issue guidance, portable skill setup and public-document hygiene; package metadata only | Baseline | Three usable starting paths, accurate tools/keys/licenses/links. Pending |
| 2. Distribution | New Sol high executor: manifests/lockfile/build/exports/package checks/clean consumer/CI/release and migration guidance | Stage 1 review; import inventory and registry facts | Site-free core payload/dependencies, explicit compatibility policy, actual clean consumption and meaningful CI. Pending |
| 3. Usage and validation | New Sol high executor: 11-family guides/stories/browser coverage/preview configuration/support claims | Stage 2 reviewed structure | Independently discoverable API/state/accessibility guidance, actual Storybook and multi-engine checks; honest manual limits. Pending |
| 4. Demand-led extension | New Sol high executor: consumer/example demand audit; justified minimal implementation or composition guidance | Stage 3 review | Every addition has repeated demand and full validation; adding nothing is valid with evidence. Pending |

Source is frozen during each independent review. Findings are addressed by the executor; only affected checks are repeated after a fix. No concurrent writes to the same files. Each stage review is scoped to its diff and risk.

## Verification and unresolved items

- Directly inspect public imports and reachable consumer use before selecting the smallest package boundary. Do not drop deep imports silently.
- Re-run relevant units/types/lint, token generation drift, contrast, package build/payload and clean tarball consumption, site compatibility, Storybook build and rendered results. Add relevant Firefox/WebKit, zoom/high contrast, keyboard/state cases. Distinguish Playwright WebKit from Safari and automated checks from screen-reader use.
- Check local source and installed skill separately; install only after focused review and applicable tests, without exposing or moving credentials.
- Prepare a reviewable PR; check whether main merge and previews trigger external deployments. Do not publish npm, create a Release, merge main or deploy docs/site without applicable authorization. A deployment configuration is not a deployed site.
- Remaining decisions: third-party notices, release/deployment topology, support matrix and actual extension demand.

## Distribution decisions (inventory reviewed)

- Keep one package and the current source layout. `/ui` is the documented React core; the existing root remains the framework compatibility barrel. Next/next-intl are optional peers used by the compatibility paths; next-themes remains a React runtime dependency for existing Toaster/theme behavior.
- Use exact shared deep entries instead of wildcard compilation; preserve observed consumer imports for Nav, Footer, ThemeProvider, ThemeToggleIcon and LocaleSwitcher. Document every excluded website path and consumer-owned i18n request/messages configuration. Keep root, `/ui`, `/utils` and CSS contracts.
- Move website dependencies to development-only tooling and exclude website modules/messages/art/tooling from the npm payload. The website continues to run in this repository.
- Prepare `0.3.0` (unpublished); `v2` denotes the design generation. Registry `0.2.0` has 15 files and no files for its declared deep wildcard targets; checkout baseline pack has 115 files and includes hero/cursor/Supabase/login modules. These observations must not be confused with a completed release.
- A reachable consumer pins `0.1.0` and scans old `src` paths for Tailwind. Preserve its actual imports and document migration to compiled `dist` plus shared CSS. Copied UI in other reachable consumers is evidence for composition demand, not installed-package use. No consumer repositories are changed.
- Require real isolated tarball installs for React without Next and for the observed framework imports; the old repository-symlink fixture is insufficient evidence of clean installation.
- GitHub deployment history confirms Vercel Production deployments for recent main commits. Main merge may deploy the brand site. Private vulnerability reporting and GitHub Pages are currently disabled; documentation must not promise either is active.

## Results and evidence

Current implementation, review, direct-check and publication results will be appended here with actual commands, scope and limits. Historical test counts are not carried forward as current evidence.
