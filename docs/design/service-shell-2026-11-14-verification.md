# Service shell implementation — 2026-11-14

Scope: additive unpublished 0.15.0 owned-service shell, theme policy, server-safe icon metadata, static conformance CLI, naeil.dev provider switch, docs and packaged/browser verification. Source starts at `70c8222`; stale freeze withdrawn in `fcf819c`. Work stays on `feat/page-frame-20261114`; no main merge, publication, tag, workflow dispatch or service deployment.

Authority: [approved spec](../superpowers/specs/2026-11-14-naeil-service-shell.md), DESIGN.md page rhythm, existing header/footer service profiles, brand 1.1.1 checksums. Existing neutral/Pretendard/Noto Sans JP, 1600px application frame, responsive 16–40px gutters and purpose-specific widths remain. The shell owns fixed-header clearance, 48px page top/96px bottom; PageHeader owns 32/42/600, 12px description gap and 32px content gap. Product content stays inside main. No new external visual reference or artwork needed.

Reuse: actual `naeil-header-core`, `naeil-footer-core`, shared messages, next-themes, PageHeader and existing shared CSS. Standalone `/naeil-shell` supplies three tiny locale dictionaries; provider `/naeil-locale/chrome` reuses the selected dictionary/context. Next metadata calls use server-safe `/naeil-locale`. No shared frame CSS copied into the consumer.

Frame/cases: four owned services, matching localized sparse content at 1440/390 × ko/ja/en × OS light/dark, fresh contexts and no stored preference. Shell Storybook stories are separate from the unchanged frozen B1 chrome fixtures. Browser spec also checks skip focus, persisted theme, shared signed-in account/logout and recorded Home login footer=false. Existing broader frame/service/header/footer tests cover dense/long content, nested locks, responsive menus and state behavior. Inherited signed-in Home production acceptance and artwork redistribution limits remain outside this local implementation.

Evidence commands and results are appended after completion. Functional, shared-rule and composition results are recorded separately; package and browser outputs are local verification, not registry/production receipts.

## Instructions actually read

Repository frontend workflow 2026-10-02.1; installed workflow 2026-10-05.1; installed Impeccable context/craft-floor. This is an extension of the existing system, with no visual direction change.

| Source | SHA-256 |
| --- | --- |
| `skills/frontend-reference-workflow/SKILL.md` | `ecada9f24d5ebbce5ac207d5225200ca2d76d08ea9f9f1d3b46d4e956a17d7b8` |
| `skills/frontend-reference-workflow/references/layout.md` | `40eb129fcdf1871fcc3cef9c0d0e062c207aeca35f14eb61c00b36a121802d1a` |
| `/Users/jaymini/.agents/skills/frontend-reference-workflow/SKILL.md` | `0fff5fb30befa108e21e04ecad045fa8524f34692454a96445bfe32690ddc1b5` |
| `/Users/jaymini/.agents/skills/frontend-reference-workflow/references/layout.md` | `40eb129fcdf1871fcc3cef9c0d0e062c207aeca35f14eb61c00b36a121802d1a` |
| `/Users/jaymini/.agents/skills/frontend-reference-workflow/references/verification.md` | `b504804320724354584885782fe5522ca002028e647b3e146743649cb0a50efe` |
| `/Users/jaymini/.agents/skills/impeccable/SKILL.md` | `6eeec6ef2028388a17de9f17a56c9cb7dbc7c8e7e1a8c15b831b0ba3e42168ac` |
| `/Users/jaymini/.agents/skills/impeccable/reference/new-work.md` | `af95e45318c9235de676cf1075840518cdd3a924b8bde952b5161d72caf3b290` |
| `/Users/jaymini/.agents/skills/impeccable/reference/craft-floor.md` | `e802e4f7bdc89050a9c0f2ca506e1d493a2316e6e810c0336c57aa073717ef3e` |
| `/Users/jaymini/.agents/skills/impeccable/reference/document.md` | `3673248740bcdd1122ccc610093ba2fe52f3943a61ce0b7170b74dc49e5b6098` |

## Impeccable documentation handoff

This is an ordinary extension of the accepted neutral/Pretendard/Noto Sans JP system and page rhythm, not a new visual world or an approved visual-system change. The documenter read `DESIGN.md`, `AGENTS.md`, the approved service-shell spec, `docs/components/naeil-shell.md`, `docs/components/application-layout.md`, `docs/design/v2-migration.md`, this report, and Impeccable's `reference/new-work.md` and `reference/document.md`. Implementation cross-checks covered the standalone shell entry, shell core, theme provider, PageHeader, shared frame/page-rhythm CSS and naeil.dev locale layout. The existing token source and numeric values were preserved.

Reviewed and changed scope:

- `docs/components/application-layout.md`: aligned composition selection, routing/menu/account adapters and copyable consumer-agent rules with shell ownership; replaced the old root provider, scoped frame overrides to generic/legacy APIs and made recorded `footer={false}` adoption checks explicit.
- `docs/design/v2-migration.md`: removed contradictory direct owned-service header/footer and existing-provider guidance; distinguished shell-owned frame classes from the generic example, retained compatible overrides outside the shell and aligned icon instructions with the approved API.
- `DESIGN.md` and `AGENTS.md`: reconciled maintained pre-shell composition, provider, frame and footer guidance. naeil.dev keeps its no-service catalog header and existing footer; only its root theme provider switches. Historical publication identities and frozen release evidence were not revised.
- `docs/components/README.md`, `naeil-header.md`, `naeil-footer.md` and `common.md`: pointed new owned-service adoption to the shell/root provider and scoped standalone examples, frame classes and presentation overrides to their compatible APIs. Added the actual `Brand / NaeilServiceShell / Abstorm, Home, Estimate, Jev` story row. The footer guide now documents shell `footer={false}` while retaining main/skip link and distinguishes the shell's unknown-service error from standalone fallback.
- This report: recorded the documentation review and the finish-review outcome. No code, tokens, generated CSS, screenshots, frozen release files, other worktrees or commits were changed by the documenter.

The fresh finish reviewer returned **`ship`**, with **no material findings at the local service-shell extension scope**. The supplied review reports independently passing 17 shell unit tests and the contrast gate. The documenter opened both evidence files and confirmed they show loaded Korean Estimate dark-mode content, canonical header/footer and the responsive PageHeader: [desktop, 1440×900](service-shell-2026-11-14-evidence/desktop.png) and [mobile, 390×900](service-shell-2026-11-14-evidence/mobile.png). The supplied detector result is an empty finding array. This records the review's scope; publication, hosted Docs, external service adoption and signed-in Home production acceptance remain separate results.

At the documentation follow-up, the main implementation thread reported a full unit run of **1042 passed / 6 skipped**, including **18 shell tests**, a passing type check, and rollout checks of **351 passed / 1 skipped**. These later results are distinct from the reviewer's independent 17-test run. Final package/browser verification was still in progress at this handoff.

Documentation validation: `git diff --check` passed for the tracked guide changes; the new verification log's no-index whitespace check also reported no findings. The shell API/spec, provider source, rendered captures and maintained guidance were cross-checked; this documentation pass did not rerun implementation tests or claim the full language/theme/browser matrix from the two screenshots.

The previously recorded component index/header/footer guide findings were resolved within the expanded documentation boundary; the common usage guide received the same scope clarification. Remaining pre-existing format/sidecar gap:

- The incumbent `DESIGN.md` is a project-specific design brief without token-bearing YAML frontmatter, and `.impeccable/design.json` is absent. This pre-existing format/sidecar gap was not migrated; the approved numeric authority remains `src/tokens/*.json`. No sidecar or new design rules were invented for this extension.

## Final verification

Runtime/CLI source is committed in `3f8f7c4`; packed/browser tests and nested-provider regression coverage are in `6a24968`. The maintained documentation was completed afterward; its final changes receive the packed-boundary and guide-link rechecks below. Exact checked source hashes are in `service-shell-2026-11-14-evidence/source-sha256.json`; compressed command output is retained beside it. Package version remains 0.15.0 and the old freeze remains withdrawn.

| Check | Final result | Retained log |
| --- | --- | --- |
| `pnpm test` | 60 suites passed, 1 skipped; 1,042 tests passed, 6 skipped (18 shell + 55 CLI tests included) | `unit.log.gz` |
| `pnpm test:rollout` | 351 passed, 1 skipped, 0 failed | `rollout.log.gz` |
| `pnpm check:types` | Passed; ignored reproduction directories checked/removed before the final run | `types.log.gz` |
| `pnpm lint` | 0 errors; 3 pre-existing warnings in old evidence scripts and the auth rejection route | `lint.log.gz` |
| `pnpm check:contrast` | Passed; text and control/state combinations | `contrast.log.gz` |
| `pnpm build:pkg` | Passed, including `check:messages`, `check:brand`, tokens, declarations and locale graph checks | `package-build.log.gz` |
| `NAEIL_UI_STORYBOOK_PORT=6107 NAEIL_UI_FIXTURE_PORT=6108 pnpm check:package` | Passed: React SSR/Vite, Next webpack/Turbopack RSC/SSR, globals/split frames, installed CLI passing/failing Next/Vite fixtures | `package-consumers.log.gz` |
| `pnpm build:storybook` | Passed, including notices/fonts and existing Docs contract; four shell stories available | `storybook.log.gz` |
| Final packed boundary + guide tests after maintained doc changes | Passed, 194 archive members and 4 guide/package tests | `package-boundary-final.log.gz`, `doc-tests.log.gz` |
| Requested Chromium browser suite | 342 passed, 0 failed (3 workers, fully parallel, 8.2 minutes) | `browser.log.gz` |

Exact browser command:

```sh
NAEIL_UI_STORYBOOK_PORT=6107 NAEIL_UI_FIXTURE_PORT=6108 pnpm exec playwright test e2e/chrome-pairs.spec.ts e2e/service-header.spec.ts e2e/naeil-footer.spec.ts e2e/page-frame.spec.ts e2e/frame.spec.ts e2e/shared-defaults.spec.ts e2e/naeil-shell.spec.ts --project=chromium --workers=3 --fully-parallel
```

Functional result: skip link focuses main; remembered light persists across reload; shared account/logout and anonymous mobile chrome work; recorded Home login omits only the footer. Standalone/provider output and root/nested theme-provider behavior pass unit tests. Type tests reject literal/spread root data attributes, presentation/theme props and unknown/nested overrides. Runtime casts are dropped with development warnings once per prop path; invalid services throw.

Shared-rule result: all 48 service/locale/viewport/OS-theme measurements match 48px header→h1, 32/42/600 h1, 12px description gap, 32px header→content, 96px content→footer and 16px body. Every fresh context is dark under both OS preferences, with no stored theme and no overflow. Raw rows: `service-shell-2026-11-14-evidence/shell-measurements.json`. The unchanged B1 test source passed its full paired comparisons, and the existing frame/lock contracts passed in the requested suite and packed consumers.

Composition result: the primary agent and independent finish reviewer opened the desktop/mobile captures; reviewer disposition is `ship`, no material findings at that scope. Detector ran once and returned `[]`. No visual corrections or extra review rounds were needed. Shell source/CSS did not change after those captures. The documenter reconciled maintained starter, migration, agent/design and component-index/header/footer/common guidance; the primary agent also updated the root README. The pre-existing sidecar format gap remains outside scope.

Resolved setup/implementation findings: current Playwright browser binaries were missing; installed Chromium and WebKit (also Firefox) and reran the affected checks successfully. The first packed-bin help check exposed the macOS /tmp realpath / npm symlink entrypoint difference; fixed main detection with `realpathSync`, added a symlink regression, and passed extracted/installed bin checks. No naeil.dev 403 occurred in the final consumer run. These are resolved, not skipped checks.

No functional deviations from the approved spec. Additional maintained-doc pointer cleanup prevents contradictory direct-composition guidance. No registry publication, tag, main merge, workflow dispatch, hosted Docs or service deployment occurred. Native devices/assistive technology, external auth and the prior signed-in Home production acceptance retain their previous scope; local shell checks do not close them. A development tarball is produced in `/tmp/shell-pack/naeil-ui-shell-dev.tgz` after the candidate-branch push; it is not a new release freeze.
