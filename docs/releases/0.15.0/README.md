# 0.15.0 release candidate — full-scope re-freeze

Not published. Frozen package source: `0c952a1065f65427d0dabf66142ec3b62345fab4` (full candidate through `6e234c0`). The evidence-only commit retains this receipt and archive; it does not replace the source. This supersedes the withdrawn page-rhythm-only freeze `37187a5`/`70c8222` (withdrawn in `fcf819c`); never publish that earlier archive. Package version remains 0.15.0, which was still absent from npm at this preflight.

`naeil-ui-0.15.0.tgz`: SHA-256 `ff48f00c5b106c7a7ba489cbb834372bd3538e2145efee1ba9a09a2f55aef78d`, 200 regular files, 299216 compressed bytes, 1497814 unpacked bytes. SHA-1 `0675a5d22c4c51007b83703200b8d0cae05b035a`; SRI `sha512-UEY+HqdND2j1HfvncS24ZAFAxUvzBKFmwCbD/oM7fjCQaVvWqSXj6HM5jDtuDt3wZR/If11zmS/+49QwIy7vhg==`. `archive.json` follows the 0.14.0 schema with SHA-1, SRI and each regular member's SHA-256. Its intended dist-tag is `latest`, release tag is `v0.15.0`, and `published` is false.

The full additive minor includes:

- Page-rhythm tokens (48/12/32/96px), `.ui-app-main`, `PageHeader` and its last-child/actions fixes, shared naeil.dev content frames and title-first mobile ordering.
- Strict standalone `@naeil/ui/naeil-shell` and provider-backed `/naeil-locale/chrome`: `NaeilServiceShell`, fixed children-only `NaeilThemeProvider`, PageHeader, icon/title helpers and reusable `measureNaeilPage`/`NaeilPageMeasurements`. Shell-owned skip link, header, focusable main and full/footer=false contract preserve consumer routing/auth/save ownership; forbidden overrides are rejected/ignored as documented. naeil.dev retains its no-service catalog header/footer and adopts the shared root theme provider.
- Generated server-safe `naeilIcons` from `/naeil-locale`, with canonical brand 1.1.1 digests and icon link declarations. Kit/image bytes are not newly bundled.
- The installed `naeil-ui-conformance` bin: Node-built-in static Next/Vite source checks, plus runtime mode using consumer-installed Playwright. Runtime accepts route/footer exceptions, storage-state authentication, repeatable request headers, expected final statuses, explicit redirects and route readiness selectors, then checks actual settled identity/rhythm/visible-content geometry. Static reachability does not prove execution; runtime acceptance covers the listed routes only. See [the frozen changelog](https://github.com/naeil-dev/naeil-ui/blob/0c952a1065f65427d0dabf66142ec3b62345fab4/CHANGELOG.md) and [shell/CLI guide](https://github.com/naeil-dev/naeil-ui/blob/0c952a1065f65427d0dabf66142ec3b62345fab4/docs/components/naeil-shell.md) for every option and limit.

Chrome contract 1, standalone/generic/legacy compatibility APIs and existing token values remain unchanged. This archive does not establish real-service adoption, authenticated production acceptance or deployment.

Compared directly with `docs/releases/0.14.0/naeil-ui-0.14.0.tgz`, both regular-member inventories/hashes verified: 175 → 200 files; **128 byte-identical, 40 changed at the same path, 32 added, 7 removed**. New members include the shell/theme/measurement/icon modules, six CLI modules and shell guide; updated members include public exports/types, shared messages/skip copy, styles/tokens, release metadata and maintained guides. Generated chunk/member names follow those changes. Runtime dependency declarations and chrome contract JSON remain unchanged. The exact delta follows (paths relative to `package/`); every unlisted common member is byte-identical.

```text
+ bin/conformance-metadata.mjs
+ bin/conformance-project.mjs
+ bin/conformance-runtime.mjs
+ bin/conformance-source.mjs
+ bin/naeil-icons.generated.mjs
+ bin/naeil-ui-conformance.mjs
+ dist/chunk-MKFQOUTD.js
+ dist/chunk-MSRLGWVB.js
+ dist/chunk-PSTVFJ6Q.js
+ dist/chunk-Q635FHBX.js
+ dist/chunk-RGD3BXAS.js
+ dist/components/naeil-shell.d.ts
+ dist/components/naeil-shell.js
+ dist/naeil-footer-core-CQNIPwWH.d.ts
+ dist/naeil-header-core-Bpu6TTB3.d.ts
+ dist/naeil-locale/chunk-JMKNZDHQ.js
+ dist/naeil-locale/en-SW6YALNA.js
+ dist/naeil-locale/ja-P6SD2IX7.js
+ dist/naeil-locale/ko-7277BUY2.js
+ dist/naeil-locale/messages-Dzs5znBi.d.ts
+ dist/source/components/naeil-page-measure.d.ts
+ dist/source/components/naeil-page-measure.js
+ dist/source/components/naeil-shell-core.d.ts
+ dist/source/components/naeil-shell-core.js
+ dist/source/components/naeil-shell.d.ts
+ dist/source/components/naeil-shell.js
+ dist/source/components/naeil-theme-provider.d.ts
+ dist/source/components/naeil-theme-provider.js
+ dist/source/naeil-locale/icons.generated.d.ts
+ dist/source/naeil-locale/icons.generated.js
+ dist/typography-KEfpuP91.d.ts
+ docs/components/naeil-shell.md
- dist/chunk-6ALD3HCS.js
- dist/chunk-AUPZJH56.js
- dist/naeil-locale/chunk-24IL53QO.js
- dist/naeil-locale/en-ZC66VDHP.js
- dist/naeil-locale/ja-DKIEQUG7.js
- dist/naeil-locale/ko-CY6663RZ.js
- dist/naeil-locale/messages-BuQvB-u2.d.ts
~ CHANGELOG.md
~ DESIGN.md
~ README.md
~ dist/components/index.d.ts
~ dist/components/index.js
~ dist/components/naeil-footer.d.ts
~ dist/components/naeil-footer.js
~ dist/components/naeil-header.d.ts
~ dist/components/naeil-header.js
~ dist/lib/ui-release.d.ts
~ dist/lib/ui-release.js
~ dist/naeil-locale/checker.d.ts
~ dist/naeil-locale/chrome.d.ts
~ dist/naeil-locale/chrome.js
~ dist/naeil-locale/index.d.ts
~ dist/naeil-locale/index.js
~ dist/naeil-locale/messages.d.ts
~ dist/naeil-locale/messages.js
~ dist/naeil-locale/server.d.ts
~ dist/naeil-locale/server.js
~ dist/source/components/index.d.ts
~ dist/source/components/index.js
~ dist/source/components/naeil-messages-context.d.ts
~ dist/source/components/typography.d.ts
~ dist/source/components/typography.js
~ dist/source/lib/ui-release.d.ts
~ dist/source/lib/ui-release.js
~ dist/source/naeil-locale/messages/en.json
~ dist/source/naeil-locale/messages/ja.json
~ dist/source/naeil-locale/messages/ko.json
~ docs/components/README.md
~ docs/components/application-layout.md
~ docs/components/common.md
~ docs/components/naeil-footer.md
~ docs/components/naeil-header.md
~ docs/design/v2-migration.md
~ docs/package-release.md
~ package.json
~ src/styles/components.css
~ src/styles/theme.css
```

## Local verification

Node 22.23.2, pnpm 10.30.3, npm 10.9.8. Fresh logs are under ignored `test-results/release-0.15.0-refreeze-6e234c0/`, separate from the withdrawn candidate's earlier results. These are local prepublication checks; PR CI, npm publication, hosted Docs and service adoption require separate receipts.

| Command | Outcome |
| --- | --- |
| `pnpm install --frozen-lockfile` | PASS |
| `pnpm test` | PASS: 1201 tests, 6 existing production-invite opt-in skips |
| `pnpm lint` | PASS: 0 errors, 3 existing warnings in unchanged files |
| `pnpm check:types` | PASS |
| `pnpm check:contrast` | PASS: 98 pairs |
| `pnpm build:pkg` | PASS: generated metadata/tokens/brand data and locale package boundary |
| Exact-digest `pnpm check:package` below | PASS: exact archive boundary, installed CLI, clean React/Next types/SSR/RSC/shell and globals/split frame/lock checks under webpack/Turbopack (836.7s) |
| `pnpm build:storybook` | PASS: 16 UI + 2 Brand Docs, shell stories, fonts and exact notice coverage |
| `pnpm test:rollout` | PASS: 351 tests, 1 existing pinned-pnpm opt-in skip |
| Nine-spec Chromium command below | PASS: 357 cases, 8.7 minutes (527.7s), all nine requested specs |
| Fresh frozen-source own install/build/pack and `cmp` | PASS: byte-identical; SHA-256 matched; reproduction directory removed |
| Read-only workflow preflight (`check`, retained digest, latest) | PASS: archive validated and exact 0.15.0 absent from npm |
| Reproduction cleanup and final type check | PASS: no ignored release reproduction directories remain; final `pnpm check:types` passed |

Actual naeil.dev artwork loaded during the packed browser checks; no real HTTP 403/Vercel challenge or artwork retry was observed in this run. The Chromium suite separately passed localhost-fixture tests for both recovering and persistent HTTP 403 responses. Their three retry log lines target `http://127.0.0.1:…/art.svg`; they are synthetic fixtures, not a live challenge observation. An initial final-log assertion matched these fixture lines too broadly and was corrected after inspecting their URLs; the requested test suites themselves passed.

The root build/pack temporarily parked ignored `test-results/` under `node_modules/.release-0.15.0-refreeze-test-results` so generated fixture TypeScript stayed outside compiler discovery, then restored it intact. No source changed during the build. The fresh extraction used its own frozen-lockfile install/build/pack, and its byte-identical comparison completed before its ignored reproduction directory was removed. Logs and the compared digest remain outside that directory. Package and standalone browser suites run separately; ports 6665–6669 are never selected.

```sh
NAEIL_UI_STORYBOOK_PORT=6146 NAEIL_UI_FIXTURE_PORT=6147 NAEIL_UI_EXPECTED_ARCHIVE_SHA256=ff48f00c5b106c7a7ba489cbb834372bd3538e2145efee1ba9a09a2f55aef78d NAEIL_UI_CONSUMER_EVIDENCE="$PWD/test-results/release-0.15.0-refreeze-6e234c0/consumers" pnpm check:package

NAEIL_UI_STORYBOOK_PORT=6148 NAEIL_UI_FIXTURE_PORT=6149 pnpm exec playwright test e2e/chrome-pairs.spec.ts e2e/service-header.spec.ts e2e/naeil-footer.spec.ts e2e/page-frame.spec.ts e2e/frame.spec.ts e2e/shared-defaults.spec.ts e2e/naeil-shell.spec.ts e2e/naeil-conformance.spec.ts e2e/naeil-conformance-r4.spec.ts --project=chromium --workers=3 --fully-parallel
```

The archive was produced only after committing the new frozen source:

```sh
pnpm build:pkg
npm pack --ignore-scripts --json --pack-destination test-results/release-0.15.0-refreeze-6e234c0/pack
```

Fresh tracked-source reproduction (run from repository root; retain logs outside `reproduction/`):

```sh
mkdir -p test-results/release-0.15.0-refreeze-6e234c0/reproduction/source test-results/release-0.15.0-refreeze-6e234c0/reproduction/pack
git archive --format=tar 0c952a1065f65427d0dabf66142ec3b62345fab4 | tar -xf - -C test-results/release-0.15.0-refreeze-6e234c0/reproduction/source
cd test-results/release-0.15.0-refreeze-6e234c0/reproduction/source
pnpm install --frozen-lockfile
pnpm build:pkg
npm pack --ignore-scripts --json --pack-destination ../pack
cmp ../pack/naeil-ui-0.15.0.tgz ../../../../docs/releases/0.15.0/naeil-ui-0.15.0.tgz
shasum -a 256 ../pack/naeil-ui-0.15.0.tgz
cd ../../../..
rm -rf test-results/release-0.15.0-refreeze-6e234c0/reproduction
pnpm check:types
```

Read-only publish preflight (no dispatch/publication):

```sh
RELEASE_VERSION=0.15.0 RELEASE_SHA256=ff48f00c5b106c7a7ba489cbb834372bd3538e2145efee1ba9a09a2f55aef78d RELEASE_DIST_TAG=latest node scripts/ci/npm-release.mjs check
```

## Preparation scope

The source commit updates six release-facing documents: `CHANGELOG.md`, `README.md`, `STATUS.md`, `docs/package-release.md`, `AGENTS.md` and `examples/react/README.md`. Package version, generated `/release` and both fixture pins were already 0.15.0 and were verified without changing them. The evidence commit adds only this README, `archive.json` and `naeil-ui-0.15.0.tgz`. Preserve both commits without squashing: the archive is bound to the new frozen source, not the withdrawn source or a later main rebuild. Historical published release directories and other worktrees remain untouched. Preparation commits and pushes `feat/page-frame-20261114`; no PR creation, merge, publish, tag/Release, workflow dispatch, registry/settings change or deployment occurs.

A fresh-context read-only release review found no Critical, Important or Minor issues. It independently verified both archive manifests and hashes, all 51 non-dist members against the new frozen source, exact 0.14.0 delta lists, schema/version/latest/tag flags, documentation/options and publication commands. Feature correctness and pending runtime gates were outside that review; the executor completed the fresh requested gates above. Final commit/push verification remains part of preparation.

## Maintainer publication commands (not executed)

After review, merge without squashing and wait for accepted CI. Dispatch from reviewed `main`, then obtain owner approval for the protected **`npm-publish`** environment after reviewing run SHA, version, new digest and tag. Required reviewers and trusted publisher must already be configured as in the [operations guide](https://github.com/naeil-dev/naeil-ui/blob/main/docs/rollout/auto-update.md#one-time-owner-setup). Intended publication is directly to **`latest`**; preserve **`next=0.13.0`** unless separately moved. Never publish the withdrawn archive, and never rebuild this archive from current main.

Registry checked 2026-11-14 JST: `latest=0.14.0`, `next=0.13.0`; the read-only preflight confirmed E404 for exact 0.15.0. Check again immediately before publication; if it exists, inspect its identity rather than republishing.

```sh
shasum -a 256 docs/releases/0.15.0/naeil-ui-0.15.0.tgz
npm view @naeil/ui@0.15.0 version dist --json
npm view @naeil/ui dist-tags --json
# Owner only: when still absent, with the new reviewed digest and environment approval:
gh workflow run publish-npm.yml -R naeil-dev/naeil-ui --ref main -f version=0.15.0 -f sha256=ff48f00c5b106c7a7ba489cbb834372bd3538e2145efee1ba9a09a2f55aef78d -f dist_tag=latest
# Approve the waiting npm-publish environment job after reviewing it.
```

Manual exact-archive OTP fallback, only if the workflow has not published the version; the owner supplies the OTP. None was requested/consumed during preparation:

```sh
npm publish docs/releases/0.15.0/naeil-ui-0.15.0.tgz --access public --tag latest --ignore-scripts --otp=OTP
```

After publication, verify registry shasum/SRI, download and compare bytes, and retain fresh exact-version React/Next registry-consumer receipts. The workflow does not create a source tag/Release, deploy Docs or certify adoption. Automatic provenance is supported for public-repository trusted publishing; private repositories do not receive provenance.

```sh
npm view @naeil/ui@0.15.0 version dist time --json
npm view @naeil/ui dist-tags --json
curl --fail --location https://registry.npmjs.org/@naeil/ui/-/ui-0.15.0.tgz --output /tmp/naeil-ui-0.15.0-registry.tgz
cmp docs/releases/0.15.0/naeil-ui-0.15.0.tgz /tmp/naeil-ui-0.15.0-registry.tgz
# Expected latest=0.15.0; preserve next=0.13.0.
# Separate owner actions after registry verification:
git tag -a v0.15.0 0c952a1065f65427d0dabf66142ec3b62345fab4 -m '@naeil/ui 0.15.0'
git push origin refs/tags/v0.15.0
gh release create v0.15.0 docs/releases/0.15.0/naeil-ui-0.15.0.tgz docs/releases/0.15.0/archive.json --verify-tag --title '@naeil/ui 0.15.0' --notes-file docs/releases/0.15.0/README.md
```

Hosted Docs publication is separate; select the full reviewed Docs source and verify hosted routes/examples/fonts/notices after dispatch:

```sh
gh workflow run publish-docs-manual.yml --ref main -f reviewed_sha=FULL_REVIEWED_DOCS_COMMIT_SHA -f confirmation=PUBLISH_REVIEWED_DOCS
```

Daily Dependabot PRs and guarded service merges follow publication to `latest`; deployment remains manual. These local checks are not live trusted-publishing, production authentication, native screen-reader or physical-device acceptance. The two-commit freeze/schema follows 0.14.0; standalone browser scope is the nine requested Chromium specs.
