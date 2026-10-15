# Shared naeil header implementation plan

> **For agentic workers:** Use superpowers:executing-plans; bounded implementation/test delegation with a separate final reviewer is already authorized. Track the checks below.

**Goal:** Both naeil.dev and estimate consume the actual whole header from one versioned package module.
**Architecture:** Extract existing branded composition into a React-only optional package entry. Keep framework/auth/guard adapters small; migrate estimate from copied sources to the exact packed candidate.
**Tech Stack:** React19, Radix, next-themes, TypeScript, tsup, Next16, Vitest, Playwright, pnpm10.
**Spec:** docs/superpowers/specs/2026-10-15-shared-naeil-header.md

## Global constraints

Preserve DESIGN.md foundations and current business/auth/raw/save/snapshot contracts. Preserve 1600px product body; header uses the actual site 1280px frame. No generated-token edits, production business test writes, credential access, unrelated worktree cleanup or unverified public release. The owner's explicit external authorization is recorded below.

## Review focus

Absolute external destinations must pass the guard; modifier clicks retain native behavior. Fixed header must clear sticky summaries/first focused fields. SSR theme snapshots must hydrate without wrong enabled state. JA-only estimate must not imply nonexistent locale/SSO support. Packed React-only consumers must load official decorative images without Next/local site assets or backend imports.

### Task1: Extract and test complete shared header

Files: src/components/naeil-header*.tsx/ts, nav.tsx, nav-wrapper.tsx, site-controls.tsx, src/styles/components.css, explicit tsup/package entries, Storybook and targeted tests.
Interface: NaeilHeader exports the approved props in the spec; consumer theme provider remains external; Navigation /ui API stays stable.

- [x] Write/run failing rendering and destination/locale/SSR tests; preserve RED output in `docs/evidence/shared-naeil-header-2026-10-15/shared-rendering-red.log`, `official-artwork-url-red.log` and `compatibility-red.log`.
- [x] Extract current catalog/art references/control/toolbar/frame and preserve Nav compatibility; reviewed in `docs/evidence/shared-naeil-header-2026-10-15/independent-review.md`.
- [x] Add actual Storybook example and interaction checks; preserve generic stories. `docs/evidence/shared-naeil-header-2026-10-15/storybook/recheck2/RESULTS.md`: 62/62 Chromium/WebKit cases, including 26 whole-header and 36 existing cases; Firefox launch remains blocked.
- [x] Verify working-source units/types/lint/contrast/package/site/Storybook and provisional clean packed React/Next consumption; exact logs and limitations are in `docs/evidence/shared-naeil-header-2026-10-15/verification.md` (65 units; 0 lint errors/1 historical warning; 62 browser cases).
- [ ] Reconcile final frozen archive digest with boundary and clean packed React/Next checks after documentation completion; provisional packs are not the final identity.

### Task2: Integrate estimate and verify guard/focus behavior

Files: estimate app-frame.tsx/globals.css, copied naeil sources/images, package/lock/vendor archive, sticky/focus CSS, relevant tests and design/source docs.
Consumes: exact reviewed @naeil/ui 0.5.0 archive, NaeilHeader/SiteFooter exports.

- [x] Add/run RED header frame/fixed/focus regression against old build; the retained geometry RED and passing targeted assertions are assessed in `docs/evidence/shared-naeil-header-2026-10-15/verification.md` and `independent-review.md`.
- [x] Replace copied chrome with package header/footer while preserving GuardedLink/logout/notices; `docs/evidence/shared-naeil-header-2026-10-15/independent-review.md` confirms shared composition, about 800 copied lines removed and unchanged guard/logout behavior. Final archive install reconciliation remains below.
- [x] Adjust fixed-header clearance and stable scroll anchors; independent source/image review records 65px chrome, separate 1600px body/footer, sticky/focus offsets and no product-body redesign.
- [x] Reconcile recorded product browser run and corrected test selection: `docs/evidence/shared-naeil-header-2026-10-15/release-independent-review.md` records 295/301 original passes and six stale `.theme-toggle` timeouts, followed by 12/12 in the three corrected files. Navigation covers 401/409/503, invalid/held saves and modified clicks. This is not a new full-suite pass.
- [ ] Reconcile final frozen-source product types/lint/serial units/build and required standalone checks with the final installed archive.

### Task3: Actual composition and independent review

- [x] Capture matching live-site/shared-site images: JA/KO × 390/768/1440/2560 × light/dark, 16 conditions each. `docs/evidence/shared-naeil-header-2026-10-15/independent-review.md` enumerates the actual site/contact-sheet and estimate shell/dense images opened; the release supplement closes missing navigation/login image inspection.
- [x] Check recorded working-source anchors/fonts/controls/contrast, focus, hover/touch/Escape, reduced motion, overflow and clearance within automated/image scope. `live-candidate-comparison.json` records no anchor difference over 1px and no root overflow; Storybook and independent reports retain manual and raw-incomplete limits.
- [x] Separate reviewers inspect working source and actual images; `independent-review.md` and `release-independent-review.md` report no required source/visual corrections and reconcile the selector-only rerun. Product raw incomplete datasets remain open: 256 route-matrix, 8 shell-menu and 24 navigation nodes.
- [ ] Separate reviewer checks final frozen source/archive and identity reconciliation; fix any required findings and rerun affected checks.

### Task4: Freeze, package and install reviewable local candidate

- [ ] Commit/freeze shared and estimate source; retain exact archive/source/lock/assets identity.
- [ ] Package standalone, 61 smoke/16 integrity plus explicit tested-app/source/archive identity checks.
- [ ] Fresh 2470 ownership/main/all-backups baseline; graceful owned replacement and preservation/read-only acceptance; do not reload user tabs.
- [x] Normalize shared candidate README/agent/component/release/migration guidance for intended 0.5.0, canonical whole-header use and official artwork limits; preserve dated release history.
- [ ] Finalize both STATUS/frontend-source/release/restart/evidence docs with actual frozen/installed/external outcomes. Shared publication and site deployment are authorized but pending; do not request the same authorization again.


## Latest external release authorization

The owner answered the explicit scope question with “공유 패키지 공개·naeil.dev 배포까지 진행”. Shared npm 0.5.0 publication and naeil.dev deployment are now authorized, including the required reviewed branch/PR/main integration. Estimate public release remains authorized from earlier session instructions. Preserve source/archive identity, actual CI/site validation and fresh local/public business baselines. Authentication is required separately from authorization: `npm whoami` returned 401; official web login requested without asking for credentials. Hosted Docs/GitHub Release remain distinct from real-site deployment; package-release procedure applies.
