# Final CI correction follow-up — 2026-10-02

This follow-up starts from `bcf99fca3467ae2b1cd29d54fa24f2569fb6001c` and covers the bounded test-harness and React-fixture corrections. Stage 4 independent review at that baseline does not approve these later changes. The corrected source requires its own scoped review and Linux CI acceptance. No publication or deployment was performed.

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

Local verification uses macOS arm64, Node 22.23.2, Playwright 1.63.0, Chromium 153.0.8010.12 and WebKit 26.6, Storybook 10.4.6 and axe Playwright 4.13.0. A fresh installed Firefox launch still failed before the application with `Could not find profile folder`; local Firefox acceptance remains blocked. Corrected Linux CI results are pending root freeze and branch push. No successful future run URL or tested commit SHA is invented here.

## Artifact identity and limits

At baseline, an isolated package build/boundary check recorded **103 files / 412,826 unpacked bytes**. After the old clean-consumer development-server close hook, the package archive recorded **105 files / 421,559 unpacked bytes**, SHA-256 `ffcf3dbbcd3854f8214780ff307c842f3c2148eadfc70b724306e90920149736`, identical to the prior link-only archive. The extra files were exactly the duplicate `dist/licenses/Pretendard-OFL.txt` and `dist/licenses/Noto-Sans-JP-OFL.txt`; root-level notices existed in both. Storybook/site build order alone did not explain them. These baseline artifacts are retained, not relabeled as correction artifacts.

The corrected package is built fresh through the normal package build, then checked before and after clean consumers. Its archive retains root-level notices, omits the accidental duplicate dist notices and includes this new report plus maintained CI-state documentation. Exact correction archive manifests and SHA-256 are frozen alongside the verification logs, separately from the archive contents; an archive cannot embed its own final checksum. The corrected archive has **104 files**: the package build removes the two accidental duplicate files through its normal clean operation, and the approved manifest includes one new verification report. Maintained documentation also changes unpacked bytes; this archive must not be assigned the baseline checksum. Final byte counts and SHA-256 are frozen in the external artifact manifest after the consumer gate, without a circular self-checksum in this packed report.

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
