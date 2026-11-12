# 0.13.0 release candidate

Not published. The frozen package source is `08ee159909c93a6dfd9f18da1b68e9c74f66f672`; the later evidence-only commit does not replace that source. The archive is `naeil-ui-0.13.0.tgz`, SHA-256 `bbb123d9c07fa58534e7c3e1f8f71207b1ec1ac3a14e076976ea893b96fc762e`, 172 regular files, 248044 compressed bytes and 1327680 unpacked bytes. `archive.json` retains SHA-1, SRI and every regular member's SHA-256, using the 0.12.0 receipt schema.

PR #47 supplies the 2026-11-12 design-system audit fixes: server-safe utility imports, locale request/protocol hardening, pressed/theme/typography/accessibility fixes, package payload cleanup and CI gates. PR #48 (`3e24950`) adds opt-in owned-service headers for `abstorm`, `home`, `estimate` and `jev`: lowercase branding, own tabs only, shared controls, empty-center mobile sheets and desktop toolbar focus restoration. Strict service props, legacy inference overloads and runtime service validation are covered by source and packed checks on that branch.

Package version, generated `/release` and clean React/Next fixture versions are 0.13.0. Chrome contract 1 stays unchanged: the service profile is additive and omitted-service legacy output remains byte-identical to B1. Existing public imports and legacy overrides remain; brand/status/toolbar escape hatches are deprecated for owned services and functional without `service`. Audit visual defaults change pressed Buttons, role line heights, popup/toast behavior and dark utility matching. Apps using removed transitive `tw-animate-css` utilities must install it explicitly. See [the frozen-source changelog](https://github.com/naeil-dev/naeil-ui/blob/08ee159909c93a6dfd9f18da1b68e9c74f66f672/CHANGELOG.md) for the full compatibility list. Historical releases, archives, receipts and the 0.7.x runner are untouched.

## Local verification

The candidate is stacked on PR #48's green CI source; these are fresh local candidate checks, not a new remote CI receipt. Commands run from the release worktree with Node 22.23.2, pnpm 10.30.3 and npm 10.9.8; full logs and the local report are under ignored `test-results/release-0.13.0/`.

| Command | Outcome |
| --- | --- |
| `pnpm install --frozen-lockfile` | PASS |
| `pnpm test` | PASS: 930 tests, 6 existing production-invite opt-in skips |
| `pnpm lint` | PASS: no errors, 3 existing warnings in unchanged files |
| `pnpm check:types` | PASS |
| `pnpm check:contrast` | PASS: 98 pairs |
| `pnpm build:pkg` | PASS, including generated metadata/tokens and locale package boundary |
| `pnpm check:package` with the exact digest below | PASS on isolated retry: exact-digest boundary, clean React/Next webpack+Turbopack types/SSR/RSC and all globals/split frame/lock checks |
| `pnpm build:storybook` | PASS: runnable UI/Brand Docs, fonts and notice checks |
| `pnpm test:rollout` | PASS: 351 tests, 1 existing pinned-pnpm opt-in skip |
| Chromium command below | PASS: 171 cases, 13.5 minutes; all four requested specs |
| Fresh frozen-source build and archive comparison below | PASS: separate install/build/pack; byte-identical `cmp` and SHA-256 |

The artwork preflight `curl -s -o /dev/null -w '%{http_code}' https://naeil.dev/images/whale.png` returned 200 before the package gate. Its live artwork check remains before the frame matrix, unchanged.

The initial package attempt passed the boundary, clean React build/types/SSR, all six live artwork cases, production/development StrictMode mixed imports, font fallback and Chromium extensions, then timed out in the WebKit extension specimen at `check-consumer-browser.ts:230` clicking “Save preferences” while waiting for visible/enabled/stable. Frame/Next phases were not reached. The original failure is retained in `package.log`; Vite also logged nonfatal development font serving-allow-list warnings. Chromium was running concurrently. The unchanged-byte isolated retry after that suite completed passed the full package gate, including the same WebKit step, all React/Next globals/split frame checks, and webpack/Turbopack builds with SSR/RSC/types. Both archive-producing phases matched the retained SHA-256. No timeout, source, gate order or artwork mock was changed. This is an observed timing failure followed by a successful retry, not an uninterrupted green run or a proven contention root cause. The retry log is `package-retry.log`; its artwork preflight was also 200.

```sh
NAEIL_UI_STORYBOOK_PORT=6128 NAEIL_UI_FIXTURE_PORT=6129 NAEIL_UI_EXPECTED_ARCHIVE_SHA256=bbb123d9c07fa58534e7c3e1f8f71207b1ec1ac3a14e076976ea893b96fc762e NAEIL_UI_CONSUMER_EVIDENCE="$PWD/test-results/release-0.13.0/consumers" pnpm check:package

NAEIL_UI_STORYBOOK_PORT=6126 NAEIL_UI_FIXTURE_PORT=6127 pnpm exec playwright test e2e/chrome-pairs.spec.ts e2e/service-header.spec.ts e2e/naeil-header.spec.ts e2e/canonical-chrome.spec.ts --project=chromium --workers=3 --fully-parallel
```

The retained archive was produced only after committing the frozen source:

```sh
pnpm build:pkg
npm pack --ignore-scripts --json --pack-destination test-results/release-0.13.0/pack
```

A fresh tracked-source extraction, separate dependency install and fresh package build verify reproducibility inside the release worktree:

```sh
mkdir -p test-results/release-0.13.0/reproduction/source test-results/release-0.13.0/reproduction/pack
git archive --format=tar 08ee159909c93a6dfd9f18da1b68e9c74f66f672 | tar -xf - -C test-results/release-0.13.0/reproduction/source
cd test-results/release-0.13.0/reproduction/source
pnpm install --frozen-lockfile
pnpm build:pkg
npm pack --ignore-scripts --json --pack-destination ../pack
cmp ../pack/naeil-ui-0.13.0.tgz ../../../../docs/releases/0.13.0/naeil-ui-0.13.0.tgz
shasum -a 256 ../pack/naeil-ui-0.13.0.tgz
```

## Preparation scope and files

The source commit changes `package.json`, generated `src/lib/ui-release.ts`, `examples/react/package.json`, `scripts/fixtures/next/package.json`, `README.md`, `CHANGELOG.md`, `STATUS.md`, `docs/package-release.md`, `examples/react/README.md` and `AGENTS.md`. The evidence commit adds only this README, `archive.json` and `naeil-ui-0.13.0.tgz`. No earlier release directory or receipt changed. The fresh read-only review independently checked all member hashes, the reproduced archive, metadata/pins and maintainer instructions; it found no static preparation defect and identified the initial package-gate failure as a blocker; the unchanged-byte retry subsequently passed. Final identity checks verified source/version metadata, all member hashes, reproduction bytes, the three evidence paths and unchanged source files.

## Maintainer publication commands (not executed)

Run from a checkout containing this receipt after review/merge and CI acceptance. The owner publishes manually and supplies the OTP interactively; no OTP was requested or consumed during preparation. Do not repack current main. At preparation time (2026-11-12 JST), exact 0.13.0 returned E404 and registry tags were `latest=0.12.0`, `next=0.12.0`. Check availability again immediately before publication; if 0.13.0 exists, reconcile its bytes instead of attempting overwrite. Publish this candidate to `next` and preserve `latest` unless separately approved.

```sh
shasum -a 256 docs/releases/0.13.0/naeil-ui-0.13.0.tgz
npm view @naeil/ui@0.13.0 version dist --json
npm view @naeil/ui dist-tags --json
# Owner only: when still absent and SHA-256 matches bbb123d9c07fa58534e7c3e1f8f71207b1ec1ac3a14e076976ea893b96fc762e:
npm publish docs/releases/0.13.0/naeil-ui-0.13.0.tgz --ignore-scripts --access public --tag next
```

Verify registry bytes and metadata before tagging/releasing; retain fresh exact-version React/Next registry consumer receipts separately from these prepublication archive checks.

```sh
npm view @naeil/ui@0.13.0 version dist time --json
npm view @naeil/ui dist-tags --json
curl --fail --location https://registry.npmjs.org/@naeil/ui/-/ui-0.13.0.tgz --output /tmp/naeil-ui-0.13.0-registry.tgz
cmp docs/releases/0.13.0/naeil-ui-0.13.0.tgz /tmp/naeil-ui-0.13.0-registry.tgz
# Compare dist.shasum/dist.integrity with archive.json; preserve latest=0.12.0; next must be 0.13.0.
git tag -a v0.13.0 08ee159909c93a6dfd9f18da1b68e9c74f66f672 -m '@naeil/ui 0.13.0'
git push origin refs/tags/v0.13.0
gh release create v0.13.0 docs/releases/0.13.0/naeil-ui-0.13.0.tgz docs/releases/0.13.0/archive.json --verify-tag --title '@naeil/ui 0.13.0' --notes-file docs/releases/0.13.0/README.md
```

Docs publication stays separate. After selecting the reviewed full Docs commit, replace the placeholder and dispatch:

```sh
gh workflow run publish-docs-manual.yml --ref main -f reviewed_sha=FULL_REVIEWED_DOCS_COMMIT_SHA -f confirmation=PUBLISH_REVIEWED_DOCS
```

Verify hosted Docs routes, examples, fonts and notices after deployment. Preparation is not registry verification, hosted Docs acceptance, native screen-reader certification, production-auth testing or service adoption. No publication, dist-tag mutation, tag, push/merge, PR/Release creation, workflow dispatch or deployment was executed. The two-commit source/evidence shape matches 0.12.0; extra source guide edits update the React example pin and distinguish the candidate in AGENTS. Browser verification is scoped to the four requested Chromium suites, rather than the precedent's broader engine/site checks.
