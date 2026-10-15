# Independent bounded release supplement — 2026-10-15

Reviewer: separate `/root/header_release_review` agent. Scope: the three supplements in `release-review-brief.md`. This is a pre-freeze source/evidence review, not authorization or attestation of publication, deployment, immutable inputs or installed preservation.

## Verdict

Spec compliance: PASS within the bounded reviewed scope, with later frozen-input and runtime gates explicitly open. Quality: PASS within that same scope. No new Critical or Important correction found. All three Important findings in the product's `operations-independent-review.md` are ADDRESSED by the exact corrected helper bytes below.

The prior whole-header source conclusion remains supported: every one of the 18 entries in `review-source-hashes.json` was recomputed and matches current source, including the corrected Storybook fixture. The newly opened navigation/login screenshots require no visual correction. The original product full test invocation remains a failed invocation; its six failures are reconciled by the separate successful selector-only rerun, not relabeled as a new full-suite pass.

Read-only work performed: read shared/product AGENTS and DESIGN guidance, current shared-header spec/plan, the prior independent report/hash inventory, tooling reports/diffs/logs, actual full/recheck results and logs, operations review/fix report, all nine corrected helper/test files, and relevant deployment guidance. Opened the 16 actual PNGs listed below. Recomputed source/evidence hashes with standalone parsing code. Did not import operational helpers, run tests/builds/installations/servers, access actual business data or credential/key/env bytes, signal services, publish/push/merge/deploy, or spawn subagents. Only this supplement was written.

## Source, tests and visual conclusions

### Source continuity

All 12 shared and six product inventory entries match the prior independent review exactly. This includes the whole composition/catalog, site adapters, styles, Storybook provider/story, package/build definitions, product AppFrame/fixed-header styles and standalone packager. The earlier report's identity table remains valid for these source bytes. This is continuity with its reviewed implementation, not a fresh frozen-archive attestation. Shared tooling changes below are additional and separately reviewed.

The product diff in `tests/e2e/calendar-preview-acceptance.spec.ts`, `interaction.spec.ts` and `weekly-accessibility.spec.ts` replaces removed `.theme-toggle` selectors with the shared header's localized accessible theme-button selector; the reduced-motion collection is updated correspondingly. Assertions for actual normal/reduced transitions remain. No runtime file in the prior inventory changed for this correction.

### Actual recorded tests

- `full/results.json`: 301 tests, 295 expected passes, six unexpected timeouts, zero skipped/flaky. Read `full-run.log`; all six failures wait for `locator('.theme-toggle')`: one calendar-preview acceptance, one interaction and all four saved-calendar accessibility conditions.
- `selector-recheck1/results.json` and `selector-recheck1.log`: 12/12 passed, zero unexpected/skipped/flaky, across all tests in those three affected files. This covers the original six failures plus the other six tests in those files. It supports the corrected test selection and preserved behavior without claiming another 301-test invocation.
- `full/navigation_evidence_dir/checks.json`: eight light/dark × 390/768/1440/2560 menu conditions, zero violations, **24 raw incomplete nodes** (4/2/3/3 per theme). An incomplete node is not a passing accessibility check.

The prior independent report already assesses the actual Storybook recheck2 62/62, packed React/Next checks, shared units/types/contrast and matching JA/KO site evidence. Since the inventoried source is unchanged, this supplement carries those conclusions forward with their original attribution; it did not rerun those checks or reopen all their images.

### Actual images opened in this supplement

All paths below are relative to product evidence root `/Users/jaymini/.paseo/worktrees/1bnldk74/estimate-v1/docs/evidence/shared-naeil-header-2026-10-15/`. Each is an individual PNG opened through the image viewer, not an inferred or contact-sheet-only inspection.

1. `full/navigation_evidence_dir/menu-light-390.png`
2. `full/navigation_evidence_dir/menu-dark-390.png`
3. `full/navigation_evidence_dir/menu-light-768.png`
4. `full/navigation_evidence_dir/menu-dark-768.png`
5. `full/navigation_evidence_dir/menu-light-1440.png`
6. `full/navigation_evidence_dir/menu-dark-1440.png`
7. `full/navigation_evidence_dir/menu-light-2560.png`
8. `full/navigation_evidence_dir/menu-dark-2560.png`
9. `full/layout_evidence_dir/login-light-390.png`
10. `full/layout_evidence_dir/login-dark-390.png`
11. `full/layout_evidence_dir/login-light-768.png`
12. `full/layout_evidence_dir/login-dark-768.png`
13. `full/layout_evidence_dir/login-light-1440.png`
14. `full/layout_evidence_dir/login-dark-1440.png`
15. `full/layout_evidence_dir/login-light-2560.png`
16. `full/layout_evidence_dir/login-dark-2560.png`

Observed: mobile menus show a complete one-column five-project catalog with wrapping Japanese descriptions, readable badges, Blog, theme and actual logout; tablet sheets retain separation from the dimmed product. Desktop menus use the shared two-column catalog under the stable branded header, while wider product content/footer retain their independent frame. The signed-out login form retains a purpose-specific centered width, fixed-header clearance and shared brand/footer, with no fabricated locale or SSO control. No clipping, overlapping labels or apparent header/body alignment regression was found in these images. Screenshot inspection is not exhaustive rendered contrast/device acceptance.

This closes the prior report's missing navigation/login image inspection and pending final-result reconciliation. Its already inspected JA/KO live/candidate 16-condition alignment and dense/weekly/sidebar comparisons remain attributed to that earlier report, not re-performed here.

## Shared tooling supplement

No required correction found.

- `eslint.config.mjs:22`: the global `docs/evidence/**/trace/**` ignore is restricted to the preserved generated third-party Playwright viewer subtree. No runtime source path or lint rule is suppressed. Read `lint-final-recheck1.log`: zero errors and the one documented existing logo-study warning. Historical failed lint output remains separate.
- `scripts/check-package.ts:25` and `scripts/check-consumers.ts:53`: hash the actual fresh npm-pack bytes, print SHA256, and when `NAEIL_UI_EXPECTED_ARCHIVE_SHA256` is defined require a complete lowercase digest and exact equality. The gate precedes extraction in the package check and precedes fixture/install calls in consumers. An empty or malformed defined value fails; unset preserves existing behavior. Existing header-consumer assertions remain intact.
- Read `archive-digest-rejection.log`, `archive-digest-format-rejection.log` and `archive-default-boundary.log`: wrong expected digest and invalid format reject, default boundary passes 124 files. The report also records the initial RED and scoped types/lint checks. The logged `4e1482…85e0e` archive is explicitly diagnostic. Expected-final-digest GREEN and clean consumers using the final frozen archive remain later gates.

Reviewed tooling SHA256:

| File | SHA256 |
| --- | --- |
| `eslint.config.mjs` | `523f4f72d32e46c55d57f2138bcaf9e508aa736109a9004898fcd3858f6bf83e` |
| `scripts/check-package.ts` | `35cacdda75ca6fa949294a1c8c662683b10a500ce0ce59f4a1e3c70e9fda4164` |
| `scripts/check-consumers.ts` | `3839f9774a3d33ae80ff6e1e399ca78967eaafd70b18c155f3616a43d8eb8c17` |

## Operations findings recheck

Paths in this section are relative to the product's `docs/evidence/shared-naeil-header-2026-10-15/`.

### 1. UI-only dependency exception — ADDRESSED

`operations_safeguards.py:26` compares the complete parsed package.json with exactly the allowed dependency replacement, including dev dependencies and all other metadata. It replaces exactly one importer, package and snapshot UI entry with position-preserving placeholders; all remaining decoded lockfile bytes must match. Importer peers, package peers and snapshot dependencies stay exact. Candidate UI SHA512 integrity is derived from the actual archive bytes. Unexpected additional/moved entries and formatting changes outside the allowed entries fail closed rather than bypass review. This is substantially stronger than the old packageVersions-only comparison.

The actual archive must equal `candidate.json.uiArchiveSHA256`. `operations_safeguards.py:62` requires the independent dependency receipt's exact prior/candidate package/lock hashes, archive digest, helper and independent-review digest, `ok`, scope and non-UI unchanged result. Neither validator invents that independent receipt. `operations.py:170`, `local-preview.py:129` and `verify-private.mts:94` feed packaged bytes to the same validator and bind the receipt/review/helper identities. Local stop repeats it immediately before SIGTERM (`local-preview.py:326`); public activation revalidates releases and gates before bootout (`operations.py:432`) and its gate binds compatibility/dependency receipt hashes. The prepared receipt now reports `nonUIDependenciesUnchanged` and `uiDependencyDeltaReviewed` (`operations.py:307`).

The exact final archive/packaged package/lock review is still open: `candidate.json`, `dependency-review.json` and `dependency-independent-review.md` are absent at this checkpoint. Source safeguards do not prove those future inputs correct.

### 2. Failed final state/cleanup can emit success — ADDRESSED

`check-local.mjs:76` performs the final condition state comparison before a condition returns; context closure in `finally` must succeed before returning the record with state/context flags (`:77–78`). `acceptance-safeguards.mjs:7` appends only returned records. Its explicit `ok` starts false and becomes true only after all conditions, cleanup and blocked-write/count assertions succeed (`:4–18`). Cleanup closes the browser and rechecks all candidate/checker/baseline/after-start/helper bytes (`check-local.mjs:80`). A captured callback/cleanup/assertion failure emits false then rethrows, preserving nonzero exit. Receipt identity fields bind the exact candidate, baseline, after-start, checker and both helper files; exclusive private file creation and fsync are retained (`check-local.mjs:85`).

The original last-state/context-close false-success route is eliminated. Test fixtures exercise both, browser cleanup, blocked write and a child-process nonzero failure. Actual installed acceptance remains absent and is not inferred from fixtures.

### 3. Preservation/public gate lacks local acceptance prerequisite — ADDRESSED

`local-preview.py:362` now opens and validates the exact successful `local-acceptance.json` before ownership/preservation work. `operations_safeguards.py:71` requires all six current identities, a matching successful after-start receipt, the exact eight unique theme/width conditions, state/context flags, final cleanup, a state digest and no blocked business writes. After preservation checks the local helper rechecks acceptance/after-start bytes and writes the accepted receipt hash (`local-preview.py:371`). Missing, false, stale or duplicate acceptance cannot create this preservation receipt.

`operations.py:342` validates the current accepted-local pair and candidate/baseline identity; `operations_safeguards.py:87` requires the matching preservation stage, six identities, acceptance digest and all four preservation booleans. `operations.py:357` additionally binds the local/helper/checker/after-start/acceptance/preservation bytes in `review-gate.json`, invokes this prerequisite, and is called before bootout and again after natural release. This directly enforces the deployment ordering instead of trusting a stage filename.

No new Critical/Important regression was found within these corrections. Pure validators are definition-only and explicitly reject optimized Python; operational modules remain guarded by `__main__`. Their broader ownership/data/config safeguards remain as described by the earlier operations review; no real stage was executed here.

### Test evidence and exact corrected bytes

Read all three fixture test files. Dependency tests include transitive/dev/integrity/additional/moved-entry/archive/snapshot changes and every receipt field. Acceptance tests cover state/context/browser/blocked-write failures and explicit nonzero exit. Integration tests call actual prerequisite functions against temporary synthetic receipts, with prohibited ownership/receipt callbacks proving rejection precedes operational boundaries. Legacy adapters reproduce the reviewed unsafe assertions/predicate as negative controls, not alternate production paths.

`operations-fix-report.md` records final Python 17/17 and 4/4, Node 6/6, syntax/AST passes; legacy controls record Python failures=18/skipped=2 and Node 2 pass/4 fail. These fixture outcomes are author-recorded in that report; no standalone raw fixture output logs were present in the inspected evidence tree, and this reviewer did not rerun tests. The code and matching hashes support the correction conclusions independently of treating those reported outcomes as a new reviewer execution.

All nine current files were recomputed and match the fix report exactly:

| File | SHA256 |
| --- | --- |
| `operations.py` | `219008011ab7c3ccd2630d7e58dcb2c0686f6b034f7ee91bd22d5e5258c567aa` |
| `local-preview.py` | `02a193d09e3e6316cdafc715bead4769303f552f364f7791c8660fe6953579de` |
| `verify-private.mts` | `d96eb1d320bc8eae76069ff1e0929534da7040629bf457ca781a8d9e71b796f7` |
| `check-local.mjs` | `6cfdbb21991414451edc6ceb2e79d4946b6eadb43d64122b932d54f9b72fac14` |
| `operations_safeguards.py` | `46bf6d91e01384177b5c24800f842b3cb72584b24939edbe86dd515ba8e9ecda` |
| `acceptance-safeguards.mjs` | `047b80c263b351fef4c6f124a3837821b87df9b2e829bcdb3fdcb2726977b719` |
| `operations-safeguards.test.py` | `95291b74f021d6481512b6a7ed034fffac25226cd4bd82b2d47c1e84cf73a518` |
| `operations-integration.test.py` | `f344b5487feb80a6f5796727e05af1bb86498e9a23b335c6bdcd446c7a3e29f2` |
| `acceptance-safeguards.test.mjs` | `11e627733180e072e0fade522387dda9161c2c21fec7701afc25a102c4c01861` |

## Explicit later gates and retained limits

Frozen committed shared source/archive identity; expected-final-digest packed checks/clean consumers; exact packaged product package/lock/archive independent review and receipt; candidate source/manifest/BUILD/app/source/archive equality to the tested artifact; smoke/integrity and fresh private compatibility; fresh complete local/public baselines and ownership; actual local stop/start/eight-condition acceptance/preservation; and the exact final public review gate remain open. At this checkpoint candidate, dependency receipt/review, actual local acceptance and final public gate JSON are absent. Main must supply those exact immutable bytes for a later supplement. This report does not certify shared-main integration, npm publication, real-site deployment, local/public replacement or installed acceptance.

Retain the prior product 48-route **256 raw incomplete nodes**, shell-menu **8 raw incomplete nodes**, and this navigation audit's **24 raw incomplete nodes** as distinct observed datasets, plus prior unresolved accessibility/manual/touch findings until specifically rechecked. Retain Firefox profile-launch environment block, native Safari/hardware/assistive technology/zoom/virtual keyboard, exhaustive manual rendered contrast, real OAuth/SSO and fresh public-owner edit/save limits. Signed-out dummy-config site evidence and read-only acceptance do not establish real owner writes. Artwork remains an official network reference with unresolved redistribution provenance. Installed rollback/reboot and uninterrupted protected-service behavior between samples are unproven. No external design tool was run by this reviewer.
