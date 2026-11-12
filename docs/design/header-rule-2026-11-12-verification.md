# Owned-service header rule — 2026-11-12 verification

Stage 1 on `feat/header-rule-20261112`, based on `4c53543` (PR #47). Local implementation only; no push, merge, tag, publication, deployment or consumer upgrade. Frozen archives, baseline normalizations, tokens and generated sources are unchanged.

## Contract and decisions

- `NaeilHeaderProps` remains an exported legacy interface with `service?: undefined`, preserving interface extension and `Omit` behavior. The separate exported `NaeilServiceHeaderProps` type requires `service: NaeilService` and types forbidden compatibility props as `never`. Both component entries accept `NaeilHeaderProps | NaeilServiceHeaderProps`. `NaeilService` derives from the frozen readonly `naeilServices` tuple (`abstorm`, `home`, `estimate`, `jev`). Both public header entries export them; provider chrome continues re-exporting the core.
- The service profile supplies its lowercase suffix and `.naeil <id>` accessible name, defaults the brand to `/`, omits catalog/Blog and keeps only `appNavigation`. `brandHref`, routing/guards, locale, auth, labels, root accessible attributes and controlled mobile state remain available.
- Besides the requested forbidden props, inline `style`, `brandLinkProps`, `mobileFooter` and the empty-navigation policy override are blocked because they bypass the approved presentation. Runtime attempts are stripped; each prop name warns once in development, never in production. Root `data-slot`, `data-global-header` and `data-naeil-*` cannot be overridden.
- Generic Navigation's additive `omitEmptyNavigation` defaults to false. Service headers enable it: an empty desktop center uses a neutral container, the mobile sheet omits empty navigation and observes the desktop toolbar to dismiss on resize. Legacy empty-menu resize behavior and markup remain unchanged.
- Existing suffix CSS and the fixed desktop brand column are reused. Tabs align after that column, independent of visible suffix width. No service styles or numeric token changes were introduced.
- The new 24-case matrix covers canonical, flat Home, grouped Estimate and empty Jev at 390/1440px, ko/ja/en, light/dark and signed-in/out. Inspected CI uses `other` plus `pairs-1/2/3` per browser (current 40-minute job limit), and Playwright defaults to one worker. CI runs the new matrix in Chromium's `other` suite; the existing costly paired file keeps its three shards. Firefox/WebKit use the same matrix locally with `NAEIL_UI_SERVICE_ALL_BROWSERS=1`.

## Local implementation commits and files

- `eb86320` — `feat(header): add strict owned-service profiles with canonical branding`
- `4c17f63` — `docs(header): record owned-service rule and add service stories`
- `92b6fd9` — `test(header): compare service profiles across matching chrome states`

Runtime: `src/components/naeil-header-core.tsx`, `src/components/naeil-header.tsx`, `src/components/ui/navigation.tsx`. Examples/tests: `src/components/naeil-header.stories.tsx`, `src/lib/design/__tests__/naeil-header.test.ts`, `src/lib/design/__tests__/service-header-sheet.test.ts`, `scripts/fixtures/chrome/app.tsx`, `e2e/service-header.spec.ts`. Guidance/evidence: `DESIGN.md`, `CHANGELOG.md`, `docs/components/naeil-header.md`, `docs/components/application-layout.md`, `docs/design/frontend-sources.md` and this receipt. `src/naeil-locale/chrome.ts` already re-exports the core; its public export flow is tested without changing that file.

## Initial stage-1 commands and outcomes

The initial stage-1 commands completed successfully; their initial failures and fixes are retained below. Review follow-up results are recorded separately at the end. Local logs are `/tmp/header-rule-*.log`; browser JSON/trace artifacts are under ignored `test-results/fixture-6107`, `fixture-6113` and `fixture-6115`.

| Command | Outcome |
| --- | --- |
| `pnpm install --frozen-lockfile` | PASS |
| `pnpm test` | PASS: 924 tests; 6 existing production-invite opt-in skips, 55 files passed / 1 skipped |
| `pnpm lint` | PASS: no errors; 3 pre-existing warnings in unchanged files |
| `pnpm check:types` | PASS |
| `pnpm check:contrast` | PASS: 98 pairs |
| `pnpm build:pkg` | PASS, including locale/package boundary checks |
| `pnpm check:package` | PASS: 172-file boundary; clean React and Next webpack/Turbopack builds, SSR/RSC/types, live artwork before frame matrix, globals/split frame/lock checks |
| `pnpm build:storybook` | PASS: runnable Brand stories, Docs and notices |
| `pnpm test:rollout` | PASS: 351 passed, 1 existing pinned-pnpm opt-in skip |
| Chromium regression command below | PASS: 181 tests (12.8 minutes) |
| WebKit service matrix command below | PASS: 24 cases |
| Firefox service retry command below | PASS: 24 cases |
| Extracted-archive Chromium service command below | PASS: 24 cases |
| Extracted-archive standalone/provider exports + SSR smoke | PASS: all 4 services |

```sh
NAEIL_UI_STORYBOOK_PORT=6106 NAEIL_UI_FIXTURE_PORT=6107 pnpm exec playwright test e2e/service-header.spec.ts e2e/chrome-pairs.spec.ts e2e/naeil-header.spec.ts e2e/canonical-chrome.spec.ts e2e/navigation.spec.ts --project=chromium --workers=3 --fully-parallel

NAEIL_UI_STORYBOOK_PORT=6112 NAEIL_UI_FIXTURE_PORT=6113 NAEIL_UI_CHROME_ONLY=1 NAEIL_UI_SERVICE_ALL_BROWSERS=1 pnpm exec playwright test e2e/service-header.spec.ts --project=firefox --project=webkit --workers=2 --fully-parallel

PLAYWRIGHT_BROWSERS_PATH="$PWD/test-results/playwright-browsers" NAEIL_UI_STORYBOOK_PORT=6112 NAEIL_UI_FIXTURE_PORT=6113 NAEIL_UI_CHROME_ONLY=1 NAEIL_UI_SERVICE_ALL_BROWSERS=1 pnpm exec playwright test e2e/service-header.spec.ts --project=firefox --workers=2 --fully-parallel

NAEIL_UI_CHROME_PACKAGE="$PWD/test-results/service-packed/package" NAEIL_UI_STORYBOOK_PORT=6114 NAEIL_UI_FIXTURE_PORT=6115 NAEIL_UI_CHROME_ONLY=1 pnpm exec playwright test e2e/service-header.spec.ts --project=chromium --workers=2 --fully-parallel
```

The extra archive was produced with `npm pack --ignore-scripts --json --pack-destination test-results/service-packed` and extracted with `tar -xzf test-results/service-packed/naeil-ui-0.12.0.tgz -C test-results/service-packed`. Its SHA-256 is `aa958b4558d4e1222136ece3308164baaec07690179e18acc75ce429811ed298`, identical to the `check:package` archive (172 files). A Node ESM assertion loaded both extracted standalone/provider catalogs, verified the frozen four-id tuple and rendered each standalone service through SSR, checking its accessible name/suffix and absence of catalog/empty nav.

The combined optional-engine run passed all 24 WebKit cases; all 24 Firefox cases failed before test execution because its required binary was absent. Installed it inside ignored worktree artifacts with `PLAYWRIGHT_BROWSERS_PATH="$PWD/test-results/playwright-browsers" pnpm exec playwright install firefox`, then ran the Firefox retry above.

Focused checks: `pnpm test src/lib/design/__tests__/naeil-header.test.ts` (24 passed), `pnpm test src/lib/design/__tests__/service-header-sheet.test.ts` (2 passed). Final lint/type checks were repeated after the e2e assertion update and passed. Initial type checks caught the dynamic desktop element ref and a deliberate invalid-prop test cast; both were corrected before the final successful type check. The first service probe (`NAEIL_UI_STORYBOOK_PORT=6106 NAEIL_UI_FIXTURE_PORT=6107 NAEIL_UI_CHROME_ONLY=1 pnpm exec playwright test e2e/service-header.spec.ts --project=chromium --grep '1440/en/light/in'`) failed because its assertion measured from the visible link instead of the fixed brand column. Corrected the test; the same command with `--grep 'en/light/in'` passed both widths. No B1 fixture or comparison normalization was changed.

Impeccable context/craft-floor and one `detect --json src/components/naeil-header-core.tsx src/components/naeil-header.stories.tsx src/components/ui/navigation.tsx` pass (`[]`); Ego TaskSpace 74 inspected actual built Storybook Home desktop and Jev dark mobile sheet and was closed. Existing shared visual authority was preserved; no external reference or generated artwork was used.

## Limits

Legacy consumers can continue using `interface extends NaeilHeaderProps` and `Omit<NaeilHeaderProps, ...>`; service consumers can use `NaeilServiceHeaderProps` or infer the component union with `ComponentProps<typeof NaeilHeader>`. The required legacy suites run in Chromium; Firefox/WebKit additionally exercise the new service matrix. Existing native-device/assistive-technology/hosted-auth limits remain. CI placement is based on inspected shard configuration, not a new hosted CI timing receipt. Publication, hosted Docs, main integration and consumer rollout need their own execution/receipts.


## Review follow-up — public type compatibility and consumer guidance

New commits preserve the public `NaeilHeaderProps` interface, export `NaeilServiceHeaderProps` and accept their discriminated union on both component entries. Type-level tests cover interface extension, legacy keys through `Omit`, and service rejection in object literals and JSX through both public entries. Vitest now includes `.test.tsx` so it executes those JSX cases alongside the `tsc` checks. The starter takes `service: NaeilService` from the consumer; Navigation's opt-in `omitEmptyNavigation` is documented in its guide and the Unreleased header entry.

- `2d80481` — `fix(header): preserve extensible legacy props interface`
- `470067f` — `docs(header): parameterize service starter and explain empty navigation`

| Rerun command | Outcome |
| --- | --- |
| `pnpm check:types` | PASS |
| `pnpm test` | PASS: 927 tests, 6 existing production-invite opt-in skips |
| `pnpm lint` | PASS: no errors, 3 existing warnings in unchanged files |
| `pnpm build:pkg` | PASS; both public declaration entries expose the interface, strict service type and union component parameter |
| `pnpm check:package` | FAIL / external blocker after 3 unchanged attempts: live whale image gets a Vercel 403 challenge. Package boundary and clean React build/types/SSR passed; later frame/Next phases were not reached. The second attempt passed 5 of 6 artwork cases before failing. |
| Extracted-archive declaration compatibility check below | PASS: legacy interface extension/Omit and strict service props on both entries |
| Chromium command below | PASS: 126 tests (9.5 minutes) |

```sh
NAEIL_UI_STORYBOOK_PORT=6106 NAEIL_UI_FIXTURE_PORT=6107 pnpm exec playwright test e2e/service-header.spec.ts e2e/chrome-pairs.spec.ts e2e/naeil-header.spec.ts --project=chromium --workers=3 --fully-parallel
```

The same JSX/object-literal compatibility test was compiled against both public declaration files extracted from the npm archive, using:

```sh
npm pack --ignore-scripts --json --pack-destination test-results/header-review-package
# Extracted to test-results/header-review-package/package; test imports point at its dist entries.
pnpm exec tsc --noEmit --strict --skipLibCheck --jsx react-jsx --esModuleInterop --module esnext --moduleResolution bundler --target es2017 test-results/header-review-package/types.test.tsx
```

Archive SHA-256: `f53ae7c2b7fe7828906cd1343ee47ba44c6879a24f34bceb51e25ae23897d4a9`, matching all three package attempts. Logs: `/tmp/header-rule-review-{types,test,lint,build-pkg,package,browser,packed-types}.log`. The initial `pnpm test` run still used the prior `.test.ts` pattern and passed 924 tests; after enabling the `.tsx` pattern it passed 927. Package retries used the same `pnpm check:package` command, first after the Chromium batch completed and again after an idle pause. Their logs are `/tmp/header-rule-review-package-retry.log` and `/tmp/header-rule-review-package-retry-2.log`. A direct HTTP HEAD probe returned 200/image/png; a separate headless Chromium probe from a local HTML page confirmed the relevant browser failure:

```json
{"status":403,"contentType":"text/html; charset=utf-8","mitigated":"challenge"}
{"failure":{"errorText":"net::ERR_BLOCKED_BY_ORB"}}
{"complete":true,"naturalWidth":0}
```

Probe evidence: `/tmp/header-rule-review-image-probe-retry.log`. The initial standalone probe omitted an HTML Content-Type and timed out finding its image; the corrected probe above supplied `text/html` and captured the response through CDP. The probes did not alter any package/test code or mock the official image.

The live artwork gate remains before the frame matrix, unchanged. No history rewrite or remote action was performed. The three review fixes are implemented; a successful current package gate remains pending external artwork availability. Earlier stage-1 frame/Next results above do not stand in for this rerun.
