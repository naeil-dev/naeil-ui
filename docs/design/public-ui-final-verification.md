# Final CI correction follow-up — 2026-10-02

This follow-up starts from `bcf99fca3467ae2b1cd29d54fa24f2569fb6001c` and covers the bounded test-harness and React-fixture corrections. Stage 4 independent review at that baseline does not approve these later changes. At the initial local freeze, the corrected source still required its own scoped review and Linux CI acceptance; the completed results at `9f90493abb4fb1186c948084026c3f4c04074013` are appended below. No publication or deployment was performed.

## Baseline and causal evidence

The actual [push run 36945564443](https://github.com/naeil-dev/naeil-ui/actions/runs/36945564443) passed package-and-site; its browser job recorded 207 passed, 4 skipped and 2 failed: Chromium workspace axe concurrency and WebKit Avatar Docs text ambiguity. The actual [PR run 36945943651](https://github.com/naeil-dev/naeil-ui/actions/runs/36945943651) passed package-and-site; its browser job recorded 208 passed, 4 skipped and 1 failed: the same Avatar Docs ambiguity. Firefox application tests passed in both Linux baseline runs. Neither overall run was green.

Root's separate local baseline verification at that SHA recorded 140 Chromium/WebKit passes and 2 expected WebKit forced-colors skips; actual built 13-family Docs/Usage/notices, the independent packed React/Next consumers and both-engine packed extensions, website compatibility build with dummy public configuration, 21 pinned HTTP targets returning 200, and both-engine `/naeil-ui/` Docs-to-Usage/font/network checks passed. Those are historical baseline results, not results for this correction patch.

The baseline focused rerun passed 18 cases; that alone did not reproduce the intermittent Linux race. A deterministic rendered probe waited for both the guide code and real Avatar group, then reproduced the original strict-mode assertion failure in both engines: the snippet's token and the group's screen-reader count both match `3 additional members`.

A separate diagnostic probe instrumented only the served axe module in temporary browser contexts. It preserved the real addon `axe.run` and invoked real `runPartial` immediately after that run started, reproducing the exact concurrent-scan exception in Chromium and WebKit. This is a diagnostic overlap probe, not an unmodified acceptance run. Storybook 10.4.6's actual URL parser uses dot notation for objects: the earlier `a11y:(manual:!true)` URLs left the rendered `a11y.manual` **false**. Those spellings did not establish manual scan ownership. With `a11y.manual:!true`, the actual global is **true**, the diagnostic records zero automatic addon runs, and controlled workspace axe scans finish with zero violations in both engines after finite transitions settle.

The React fixture's old `closeBundle` copied font notices relative to process cwd. The existing clean-consumer checker starts and closes the fixture's Vite development server in the repository process; that close hook wrote duplicate notices into package `dist/licenses`. A scratch caller/fixture probe reproduced both misplaced OFLs. The persistent regression gate loads a copied unchanged real fixture config/helper through the scratch-installed Vite, executes only the named font-notices plugin from another cwd, and asserts exact installed font notice bytes in fixture output with no caller output. It failed on the old configuration with `Closing the fixture must not create caller output`, then passed after correcting paths to Vite's resolved root/output directory. Scratch cleanup restores cwd and runs on failure. No real consumer or caller output is deleted to pass the test.

## Changes and verification

- Workspace, component Usage and extension test URLs use the verified `a11y.manual:!true` global. Storybook's default addon configuration remains unchanged, and every existing controlled axe scan remains in place.
- Avatar Docs separately checks the displayed group/count code, the actual named group's accessibility snapshot, and visual `+3` shorthand. Mobile Avatar snapshots, accessible counts and axe checks remain in place.
- The React fixture resolves both notice inputs and output from Vite's actual resolved configuration. Both original font OFLs remain delivered in standalone consumer output.
- `node --test scripts/consumer-font-notices.test.mjs` is an explicit package-and-site CI gate. It installs only versions already declared by the fixture for Vite, the Tailwind Vite plugin and the two font packages; transitive peers are installed by npm. It does not add root dependencies, install the application package, or use root's transitive Storybook Vite as a substitute. As with clean-consumer checks, a cold npm cache requires network; installation uses `--ignore-scripts --no-audit --no-fund` without a lockfile.
- This report is included in the tarball so maintained support/release links resolve in packed consumption. No other manifest contract changes.

Correction verification commands and results are recorded separately from the baseline:

| Command / probe | Result |
| --- | --- |
| Focused workspace light/dark axe + Avatar Docs, Chromium/WebKit, three repetitions | 18 passed |
| Full `pnpm test:browser --project=chromium --project=webkit` | 140 passed / 2 expected WebKit forced-colors skips |
| `node --test scripts/consumer-font-notices.test.mjs` | Old configuration red; corrected configuration 1 passed |
| `pnpm test` | 8 files / 41 tests passed |
| `pnpm check:types` | Passed |
| Scoped ESLint for the three specs, fixture config and regression gate | Passed |
| `pnpm lint` | No errors; existing unused `locale` website warning retained |
| `pnpm check:contrast` | All token contrast combinations passed |
| `pnpm build:pkg` + generated-token drift check | Passed; generated CSS unchanged |
| `pnpm check:package` | Packed boundary and clean React/Next consumers passed; both-engine packed extensions and exact consumer font notices passed |

Local verification uses macOS arm64, Node 22.23.2, Playwright 1.63.0, Chromium 153.0.8010.12 and WebKit 26.6, Storybook 10.4.6 and axe Playwright 4.13.0. A fresh installed Firefox launch still failed before the application with `Could not find profile folder`; local Firefox acceptance remains blocked. At this initial local freeze, corrected Linux CI results were pending root freeze and branch push. The subsequent exact-commit acceptance is recorded below without extending it to a future documentation commit.

## Artifact identity and limits

At baseline, an isolated package build/boundary check recorded **103 files / 412,826 unpacked bytes**. After the old clean-consumer development-server close hook, the package archive recorded **105 files / 421,559 unpacked bytes**, SHA-256 `ffcf3dbbcd3854f8214780ff307c842f3c2148eadfc70b724306e90920149736`, identical to the prior link-only archive. The extra files were exactly the duplicate `dist/licenses/Pretendard-OFL.txt` and `dist/licenses/Noto-Sans-JP-OFL.txt`; root-level notices existed in both. Storybook/site build order alone did not explain them. These baseline artifacts are retained, not relabeled as correction artifacts.

The initial corrected package was built fresh through the normal package build, then checked before and after clean consumers. Its archive retained root-level notices, omitted the accidental duplicate dist notices and included this new report plus maintained CI-state documentation. That historical correction archive had **104 files / 424,537 unpacked bytes**, SHA-256 `65daffadb65aa2635fdb48b9340642a22d4cf7ba1d0faaca10d96da43e2351ee`: the package build removed the two accidental duplicate files through its normal clean operation, and the approved manifest included one new verification report. This identity remains the original freeze evidence. Later prose changes produce a different archive checksum; their exact manifests and SHA-256 are frozen separately, without a circular self-checksum in the packed report.

Root inspected 94 baseline broad-suite axe attachments: zero violations, with incomplete rules **aria-hidden-focus, aria-valid-attr-value, bypass and color-contrast**. Dialog hidden backgrounds/focus guards and DropdownMenu submenu `aria-controls` occur in those incomplete records. They remain manual/diagnostic obligations; this report does not label every incomplete as verified or suppress rules. Stage 4's narrower extension result remains a separate scope. Independent extraction of the corrected HTML report inspected all **94** axe attachments: **zero violations**, with the same four incomplete rule IDs retained. Existing keyboard/focus tests passed, but those results do not resolve every incomplete. The separate workspace axe assertions also passed. The clean-consumer development StrictMode probe produced the same 34 Vite font allow-list warnings as the baseline; its pass covers overlay ownership/replay, while loaded-font claims come from the production consumer probes.

Automated snapshots, keyboard/focus tests, media emulation and axe do not certify screen-reader announcements, physical devices, native Safari, native zoom or Windows high contrast. No runtime/API/style/token/export/guide-base change was made. Earlier dated evidence and prior findings remain intact.

## Frozen implementation source identities

These SHA-256 identities identify the correction files tested locally on top of the baseline, not a future commit. The bounded source and artifact manifests are frozen separately for scoped review.

| File | SHA-256 |
| --- | --- |
| `e2e/ui-v2.spec.ts` | `2ab2032eea88a52c752f1ec153c217d3eb8f59e8d833e4f6564c6a382c233de8` |
| `e2e/component-usage.spec.ts` | `787784da3ec6c896944096a20d50c486fbc96ab1b6dce256bfd2a2dc55bf4fd4` |
| `e2e/extension.spec.ts` | `fbdb377fe6f64f2675370825beb228dda85e21f50cefe0703cac074a0543eb68` |
| `examples/react/vite.config.mjs` | `48ffb3e5052c6f4e47f8668842a61574ed09b856c38596b2212e253ea56e4ef4` |
| `scripts/consumer-font-notices.test.mjs` | `3f858428c734634b3524a14e42231f95717a4c41640d03478728de5f4eb8e0cf` |
| `.github/workflows/verify.yml` | `e9d0c393c3b7cd461ae374c9526b46ba7187bd8d70070bca19c8bc7fe7233590` |

## Post-freeze review and Linux acceptance — source `9f90493`

The exact correction commit `9f90493abb4fb1186c948084026c3f4c04074013` received independent scoped review approval with no actionable findings. The reviewer freshly checked 8 focused browser cases, the font-notice gate, types, scoped lint, clean packed React/Next consumers and both-engine packed extensions; inspected the actual red/manual-true probes, ten frozen source hashes, archive identity and all 94 local axe attachments. This approval covers the correction source at that commit. It does not approve publication or complete the manual platform checks.

Both actual Linux workflows completed successfully at that exact source: [push run 36948276767](https://github.com/naeil-dev/naeil-ui/actions/runs/36948276767) and [PR run 36948280881](https://github.com/naeil-dev/naeil-ui/actions/runs/36948280881). The PR browser job recorded **209 passed / 4 expected forced-colors skips** across Chromium, Firefox and WebKit: 71 Chromium passes, 69 Firefox passes and 69 WebKit passes, with two skipped forced-colors cases in each of Firefox/WebKit. Package-and-site passed, including 41 unit tests, 46 token contrast combinations, types, lint, generated-token drift, package/site builds, clean consumers and the font-notice gate. Optional helper regressions also passed: Node suites of 12 and 16 tests, and 8 Python tests. These results certify the tested source and configured environments, not every browser/peer version or any later commit. The unchanged local Firefox profile launch block remains a separate limitation.

The actual PR [Storybook artifact 11202888717](https://github.com/naeil-dev/naeil-ui/actions/runs/36948280881/artifacts/11202888717) was downloaded and checked: 838 files, all 13 Docs/Usage families, and exact repository/font notice bodies. Root served that downloaded artifact under `/naeil-ui/` and exercised Docs-to-Usage navigation and locally loaded Pretendard/Japanese fonts in Chromium and WebKit, with zero failed requests/errors. This is verification of the downloaded CI artifact, not hosted Pages publication. No Vercel deployment record exists for this source; main remains `d963dc5c1bbd49a1159d445edbb4c30309d96db9`.

This result append changes only this report, the maintained support matrix and release guidance. Packed boundary/relative-link checks, unchanged implementation/runtime hashes and exact notice-byte comparisons verify the documentation update; no browser, consumer or Storybook rebuild is needed solely for this prose. Its three replacement hashes and new archive identity are frozen in a separate external manifest. The original six implementation-source hash rows, failed baseline counts, red/green evidence and historical archive identities remain intact. Root will commit/push the documentation update for the latest-head automatic checks; no future-head CI pass is claimed here. [Live PR checks](https://github.com/naeil-dev/naeil-ui/pull/1/checks) show that later status. Main merge, npm publication, tags, Releases and hosted documentation remain separate authorization decisions.

## Forced-colors keyboard timing follow-up — 2026-10-02

At exact source `e171f4b03b4afe9d2b645ecd4c4aa52c242a1052`, [PR run 36950041237](https://github.com/naeil-dev/naeil-ui/actions/runs/36950041237) succeeded with **209 passed / 4 expected forced-colors skips**, while the identical-head [push run 36950036947](https://github.com/naeil-dev/naeil-ui/actions/runs/36950036947) failed with **208 passed / 4 expected skips / 1 Chromium forced-colors failure**. The failed trace and screenshot show History selected and outlined while the test expected Overview's outline. The original `9f90493` review, green results and six source hash rows above remain historical evidence for that source.

The causal diagnostics used real compiled Storybook assets in an isolated scratch server, without rebuilding or changing component behavior. The downloaded `9f90493` CI artifact was retained byte-for-byte for replay; the e171 trace's captured HTML/CSS/fonts matched it. The local iframe assets also matched; differences in project metadata and two manager bundles were outside this iframe replay. Installed Radix Tabs 1.1.13 delegates directional movement to Roving Focus 1.1.11, whose key handler schedules `focusFirst(candidateNodes)` with `setTimeout`. Tabs selects automatically on focus.

An ungated instrumented replay recorded both ArrowRight and ArrowLeft targeting Overview before either directional callback ran. With two enabled tabs, both callbacks computed History as their first candidate; the second callback found History already focused and returned. A deterministic diagnostic gate held only the real directional callbacks: the old sequence ended with History focused/selected and Overview's outline `none`, failing the original solid-outline requirement. Releasing ArrowRight's callback and verifying History focus/selection before ArrowLeft made the reverse key target History; releasing that callback returned Overview focus/selection with a solid outline, 2px selected border and nontransparent border color. These are causal diagnostics, not additional platform acceptance or a change to production scheduling.

Only the existing forced-colors test block now asserts initial Overview focus/selection, then History focus/selection after ArrowRight, then Overview focus/selection after the real ArrowLeft key. All original outline, selected-border width/color and invalid-Textarea outline/alert assertions remain. No arbitrary delay, retry, skip, direct selection or runtime/Storybook configuration change was added.

Fresh scoped verification on macOS arm64 with Node 22.23.2 and Playwright 1.63.0:

| Command / probe | Result |
| --- | --- |
| Diagnostic directional callback gate, old sequence versus state barrier | Old sequence red; state barrier green; zero page errors |
| `pnpm exec playwright test e2e/extension.spec.ts --project=chromium --grep 'Extensions forced-colors' --repeat-each=10` | 10 passed |
| `pnpm exec playwright test e2e/extension.spec.ts --project=chromium --project=webkit --grep 'Tabs automatic\|Tabs controlled'` | 4 passed |
| `pnpm check:types` and `pnpm exec eslint e2e/extension.spec.ts` | Passed |
| `git diff --check` | Passed |
| `pnpm check:package:boundary` and fresh `npm pack --ignore-scripts --json` comparison | Passed; packed relative links resolve; only this report's tar entry changed |

The package comparison retains every other tar entry and exact legal notice bytes, with separate before/after archive identities in the external freeze manifest. The two-file patch, source hashes, failed trace and key/focus timelines are preserved for independent focused review. No broad suite, clean-consumer or Storybook rebuild was repeated for this test/report correction. At this local two-file freeze, independent review and corrected exact-head Linux CI were pending; [live PR checks](https://github.com/naeil-dev/naeil-ui/pull/1/checks) show subsequent status, without claiming a future commit identity or CI approval here. Existing local Firefox and manual platform limitations remain unchanged.
