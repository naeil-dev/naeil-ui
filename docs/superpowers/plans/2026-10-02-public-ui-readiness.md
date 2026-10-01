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
| 1. Public entry | Sol medium executor; separate Sol high reviewer | Baseline | Complete at `27aea4a`; three starting paths, notices/support, portable setup and historical hygiene. Independent review found no actionable defects; registry/version wording receives the final structure update in Stage 2 |
| 2. Distribution | New Sol high executor: manifests/lockfile/build/exports/package checks/clean consumer/CI/release and migration guidance | Stage 1 reviewed; import inventory and registry facts | Implemented; frozen source awaiting independent review. Site-free core payload/dependencies, explicit compatibility policy, actual clean consumption and meaningful CI |
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

- Stage 2 scope extension: DESIGN.md link destinations may be changed to stable repository URLs for packed-guide usability; approved prose and numeric rules must be preserved.
- Keep one package and the current source layout. `/ui` is the documented React core; the existing root remains the framework compatibility barrel. Next/next-intl are optional peers used by the compatibility paths; next-themes remains a React runtime dependency for existing Toaster/theme behavior.
- Use exact shared deep entries instead of wildcard compilation; preserve observed consumer imports for Nav, Footer, ThemeProvider, ThemeToggleIcon and LocaleSwitcher. Document every excluded website path and consumer-owned i18n request/messages configuration. Keep root, `/ui`, `/utils` and CSS contracts.
- Move website dependencies to development-only tooling and exclude website modules/messages/art/tooling from the npm payload. The website continues to run in this repository.
- Prepare `0.3.0` (unpublished); `v2` denotes the design generation. Registry `0.2.0` has 15 files and no files for its declared deep wildcard targets; checkout baseline pack has 115 files and includes hero/cursor/Supabase/login modules. These observations must not be confused with a completed release.
- A reachable consumer pins `0.1.0` and scans old `src` paths for Tailwind. Preserve its actual imports and document migration to compiled `dist` plus shared CSS. Copied UI in other reachable consumers is evidence for composition demand, not installed-package use. No consumer repositories are changed.
- Require real isolated tarball installs for React without Next and for the observed framework imports; the old repository-symlink fixture is insufficient evidence of clean installation.
- GitHub deployment history confirms Vercel Production deployments for recent main commits. Main merge may deploy the brand site. Private vulnerability reporting and GitHub Pages are currently disabled; documentation must not promise either is active.

## Results and evidence

### Stage 1 — implemented and independently reviewed

- Frozen source: `27aea4a05ef83c23b28955e10915d947d4d4240b`; review compared against the fetched baseline. Public README/docs, MIT/full shadcn notice/OFL copies, support templates, metadata and portable explicit 21st command selection are implemented. Past evidence is anonymized without changing reviewed source hashes or numeric outcomes.
- Separate Sol high reviewer ran Python 8/8, local Chromium/axe helper 28/28, seven independent CLI probes (legacy Python launcher, spaced paths, explicit command, missing/empty executable and timeout), Markdown target and historical JSON preservation checks. No actionable findings. The orchestrator directly reran Python 8/8 and Node 28/28, baseline package units 37/37 and 40 contrast pairs, and the existing TypeScript check.
- Detailed dated scope/limits: [onboarding validation](../../design/public-onboarding-validation.md). Live 21st API/auth, native discovery, external generation and Supabase were not exercised. This focused current review does not retroactively approve all older workflow changes or external product quality.
- Carry forward: unknown website-art provenance, fetched site font notice, disabled private vulnerability reporting, final packed notice inclusion and source/npm version distinction. Original checkouts remain untouched.
- Local installation integration: backed up the existing user skill, copied the seven reviewed delivery files for revision `2026-10-02.1`, verified every file byte-for-byte and the existing Claude symlink, and passed skill-creator structural validation. The orchestrator reran Python 8/8 against the installed executable and Node 28/28 against the installed browser checker using temporary copies of the same tests with only project/target paths changed. Credentials, MCP configuration and unrelated skill files were untouched. Fresh native agent discovery and real API connection are separate unverified states.

### Browser availability probe

Chromium 153.0.8010.12 and Playwright WebKit 26.6 launched and rendered a local button. Installed Playwright Firefox 155.0 failed to launch on this Mac with `Could not find profile folder`, including an explicit temporary-profile probe. This is an environment failure, not a passing application check or Safari certification. Stage 3 will run available engines and retain a Firefox CI path and the local limitation.

### Deployment-boundary source lookup

The orchestrator used research-router capture/offline inspection to read Vercel's official [Git configuration](https://vercel.com/docs/project-configuration/git-configuration#git.deploymentenabled), updated 2026-08-25, accessed 2026-10-02 (relevant body range 8000–16000; retained full-body SHA-256 `aa659bde4ecfdcf3fcdea6ab5efffba8f2b2e4a7c71d862046379bd2bd3f0825`). A branch map can disable this review branch while leaving unspecified branches unchanged. Any matching true rule enables deployment, so do not add a wildcard true rule. Executor will add the branch-specific guard and public source record before any remote push. This documents intended behavior; actual no-deployment status must still be checked after pushing.

Further implementation, review, direct-check and publication results will be appended here with actual commands, scope and limits. Historical test counts are not carried forward as current evidence.

### Stage 3 carry-forward checks

- Storybook currently copies the website public directory. Documentation output must avoid redistributing unrelated site art with unknown provenance; use only necessary documentation assets and ship font/component notices with preview output.
- Keep the 11 existing families individually discoverable and document exact wrapper defaults and consumer responsibilities; native Radix behavior is not proof of assistive-technology testing.
- Test real zoom/reflow and forced-colors behavior where supported, without relabelling viewport shrinking as all browser zoom or emulation as Windows/Safari/screen-reader certification.

### Stage 3 inspection authority

The orchestrator read the installed Impeccable 4.4.0 skill and its audit/harden/craft guidance and executed its context loader against `.storybook/preview.tsx`. It found an existing approved design and no PRODUCT.md; this scoped documentation/accessibility work uses the incumbent DESIGN/tokens and does not require a new visual-world interview. The accepted brief overrides generic motion, type and palette advice. This is context loading and playbook inspection; the later browser/state work supplies execution evidence, not a blanket accessibility score.

### Stage 2 — implementation frozen; review pending

Executor reports fresh passing units 37, contrast 40, types, lint (one inherited site warning), token drift, package/site/Storybook builds, Chromium Workspace 8, helper Node 28/Python 8 and frozen installation. The actual archive contains 70 files / 284,492 unpacked bytes with 24 explicit deep entries and eight runtime dependencies. Both isolated npm tarball consumers build (React without Next; separate Next compatibility fixture). Root independently ran `pnpm check:package:boundary`, inspected the manifest/entry/import/consumer/CI/migration diffs and the actual dark Workspace screenshot. Root requested and executor reconciled stale migration claims about peers, dependency reduction and wildcard retention. DESIGN prose/tokens/component APIs remain unchanged; only two DESIGN link targets changed.

Prepared version 0.3.0 remains unpublished. The Vercel review-branch guard and verification-only GitHub workflow are implemented but not remotely exercised. Final expanded support claims and documentation assets are Stage 3. This implementation report is not independent review approval.
