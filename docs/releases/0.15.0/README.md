# 0.15.0 release candidate

Not published. Frozen package source: `37187a5778582fba4d40d237e9296ad5d11828fa`. The evidence-only commit retains this receipt and archive; it does not replace the source. `naeil-ui-0.15.0.tgz`: SHA-256 `ae5b92ea139c098d052718ee94421d8ca436924a3ba8b0786fb8f2ed0dda889f`, 175 regular files, 258577 compressed bytes, 1365715 unpacked bytes. SHA-1 `52f05ee157e52b3d752035dd151d948566f6de29`; SRI `sha512-hNhJjg+oepEXVjQMQIHBMHDSo/iBscYfkaWax/vEu6lJ2tiJd04IVOMfvEp7guByzVVdxKZNPT2K4s4Ybr32Hg==`. `archive.json` follows the 0.14.0 schema with SHA-1, SRI and each regular member's SHA-256.

This additive minor includes page-rhythm commits `70fd5fb`, `e569a11` and `bf1758a` on main `10d799b`: page top/title/header/bottom tokens (48/12/32/96px), `.ui-app-main` for fixed-header clearance and vertical spacing, shared page-header/description/actions classes, and `PageHeader` from the root and typography entries. DESIGN.md establishes the shared page rhythm and dark theme default; naeil.dev content pages use the shared frame, including title-first mobile ordering. Existing classes, `PageTitle`, prior token values and chrome contract 1 remain unchanged. Consumers adopt the shared main/header composition deliberately; this receipt does not establish their adoption or deployment.

Compared directly with `docs/releases/0.14.0/naeil-ui-0.14.0.tgz`, both regular-member inventories/hashes verified: 175 → 175 files; **151 byte-identical, 22 changed at the same path, 2 added, 2 removed**. Runtime/type changes add and export `PageHeader`; shared CSS adds its composition and page-rhythm rules, and generated theme CSS adds only the four new page variables. Other runtime changes are release metadata and generated chunk references. Maintained documentation also incorporates the separately recorded 0.14.0 publication/service receipts. Dependency declarations, locale runtime/messages, chrome contract JSON and artwork remain unchanged; no image bytes were added. The exact changed-member set follows (paths relative to `package/`); every unlisted common member is byte-identical.

| Category | Members |
| --- | --- |
| Added | `dist/chunk-B5I5C7HY.js`, `dist/chunk-HZJVHWWB.js` |
| Removed | `dist/chunk-6ALD3HCS.js`, `dist/chunk-AUPZJH56.js` |

Changed at the same path:

```text
CHANGELOG.md
DESIGN.md
README.md
dist/components/index.d.ts
dist/components/index.js
dist/components/naeil-footer.js
dist/components/naeil-header.js
dist/lib/ui-release.d.ts
dist/lib/ui-release.js
dist/naeil-locale/chrome.js
dist/source/components/index.d.ts
dist/source/components/index.js
dist/source/components/typography.d.ts
dist/source/components/typography.js
dist/source/lib/ui-release.d.ts
dist/source/lib/ui-release.js
docs/components/application-layout.md
docs/design/v2-migration.md
docs/package-release.md
package.json
src/styles/components.css
src/styles/theme.css
```

## Local verification

Node 22.23.2, pnpm 10.30.3, npm 10.9.8. Full local logs are under ignored `test-results/release-0.15.0/`. These are local prepublication checks; PR CI, registry publication, hosted Docs and service adoption require separate receipts.

| Command | Outcome |
| --- | --- |
| `pnpm install --frozen-lockfile` | PASS |
| `pnpm test` | PASS: 969 tests, 6 existing production-invite opt-in skips |
| `pnpm lint` | PASS: 0 errors, 3 existing warnings in unchanged files |
| `pnpm check:types` | PASS |
| `pnpm check:contrast` | PASS: 98 pairs |
| `pnpm build:pkg` | PASS, including generated metadata/tokens and locale package boundary |
| `pnpm check:package` with the exact digest below | PASS: exact archive boundary, clean React/Next types/SSR/RSC and globals/split frame/lock checks under webpack and Turbopack (850.9s) |
| `pnpm build:storybook` | PASS: 16 UI + 2 Brand Docs, runnable stories, fonts and exact notice coverage |
| `pnpm test:rollout` | PASS: 351 tests, 1 existing pinned-pnpm opt-in skip |
| Chromium command below | PASS: 292 cases, 7.7 minutes (467.0s), all six requested specs |
| Fresh frozen-source build and archive comparison below | PASS: own install/build/pack, byte-identical `cmp` and SHA-256; reproduction directory removed |
| Workflow read-only preflight (`check`, version 0.15.0, retained digest, tag latest) | PASS: archive validated and version absent from npm; no publish/dispatch |
| Reproduction cleanup and final type check | PASS: no ignored release reproduction directories remain; `pnpm check:types` passed after cleanup and again after the complete browser run |

The root build/pack temporarily parked ignored `test-results/` under `node_modules/.release-0.15.0-test-results` to keep generated fixture TypeScript outside compiler discovery, then restored that directory intact. No source changed during the build. The fresh tracked-source reproduction uses its own frozen-lockfile install/build/pack. Old ignored `test-results/release-*/reproduction` directories are removed before checks, and the new reproduction directory is removed after use; logs and the compared SHA-256 stay outside that directory.

Package and standalone browser suites run separately. No ports 6665–6669 are used.

```sh
NAEIL_UI_STORYBOOK_PORT=6146 NAEIL_UI_FIXTURE_PORT=6147 NAEIL_UI_EXPECTED_ARCHIVE_SHA256=ae5b92ea139c098d052718ee94421d8ca436924a3ba8b0786fb8f2ed0dda889f NAEIL_UI_CONSUMER_EVIDENCE="$PWD/test-results/release-0.15.0/consumers" pnpm check:package

NAEIL_UI_STORYBOOK_PORT=6148 NAEIL_UI_FIXTURE_PORT=6149 pnpm exec playwright test e2e/chrome-pairs.spec.ts e2e/service-header.spec.ts e2e/naeil-footer.spec.ts e2e/page-frame.spec.ts e2e/frame.spec.ts e2e/shared-defaults.spec.ts --project=chromium --workers=3 --fully-parallel
```

The archive was produced only after committing the frozen source (keep generated test fixtures outside TypeScript discovery during build/pack):

```sh
pnpm build:pkg
npm pack --ignore-scripts --json --pack-destination test-results/release-0.15.0/pack
```

A fresh tracked-source extraction with its own install/build/pack checks reproducibility. Run from the repository root, preserve logs outside `reproduction/`, and remove that ignored directory after comparison:

```sh
mkdir -p test-results/release-0.15.0/reproduction/source test-results/release-0.15.0/reproduction/pack
git archive --format=tar 37187a5778582fba4d40d237e9296ad5d11828fa | tar -xf - -C test-results/release-0.15.0/reproduction/source
cd test-results/release-0.15.0/reproduction/source
pnpm install --frozen-lockfile
pnpm build:pkg
npm pack --ignore-scripts --json --pack-destination ../pack
cmp ../pack/naeil-ui-0.15.0.tgz ../../../../docs/releases/0.15.0/naeil-ui-0.15.0.tgz
shasum -a 256 ../pack/naeil-ui-0.15.0.tgz
cd ../../../..
rm -rf test-results/release-0.15.0/reproduction
pnpm check:types
```

Read-only workflow preflight (no workflow dispatch or publication):

```sh
RELEASE_VERSION=0.15.0 RELEASE_SHA256=ae5b92ea139c098d052718ee94421d8ca436924a3ba8b0786fb8f2ed0dda889f RELEASE_DIST_TAG=latest node scripts/ci/npm-release.mjs check
```

## Preparation scope

The source commit changes the same ten paths as 0.14.0: `package.json`, generated `src/lib/ui-release.ts`, `examples/react/package.json`, `scripts/fixtures/next/package.json`, `README.md`, `CHANGELOG.md`, `STATUS.md`, `docs/package-release.md`, `examples/react/README.md` and `AGENTS.md`. The evidence commit adds only this README, `archive.json` and `naeil-ui-0.15.0.tgz`. Preserve both commits when merging: **do not squash**, because the archive is bound to the frozen source SHA. Historical release directories, archives and receipts remain untouched. Preparation commits and pushes branch `feat/page-frame-20261114`; no PR creation, merge, publish, tag/Release, workflow dispatch, registry/settings change or deployment occurs. Other worktrees are untouched.

A fresh-context read-only review verified the ten-path source scope, both archives and every member hash, all 44 non-dist new archive members against the frozen source, metadata schema, publication instructions and historical-file preservation. It found no Critical, Important or Minor release-preparation issues. Requested runtime gates and the independent rebuild were completed by the executor as recorded above.

## Maintainer publication commands (not executed)

After review, merge without squashing and wait for accepted CI. Dispatch the protected workflow from `main`, then obtain owner approval for its **`npm-publish`** environment job after reviewing the run SHA, version, digest and tag. Required reviewers and the npm trusted publisher must already be configured as in the [operations guide](https://github.com/naeil-dev/naeil-ui/blob/main/docs/rollout/auto-update.md#one-time-owner-setup). Publication is intended directly to **`latest`**; **`next` stays 0.13.0** unless separately moved. No workflow is dispatched during preparation.

Registry checked 2026-11-14 JST: exact 0.15.0 returned E404 in the read-only preflight; `latest=0.14.0`, `next=0.13.0`. Check availability again before publication. If 0.15.0 exists, inspect its identity instead of republishing. Never rebuild the publication archive from current main.

```sh
shasum -a 256 docs/releases/0.15.0/naeil-ui-0.15.0.tgz
npm view @naeil/ui@0.15.0 version dist --json
npm view @naeil/ui dist-tags --json
# Owner only: when still absent, with the reviewed digest and environment approval:
gh workflow run publish-npm.yml -R naeil-dev/naeil-ui --ref main -f version=0.15.0 -f sha256=ae5b92ea139c098d052718ee94421d8ca436924a3ba8b0786fb8f2ed0dda889f -f dist_tag=latest
# Approve the waiting npm-publish environment job in GitHub after reviewing it.
```

Manual exact-archive OTP fallback, only if the workflow has not already published the version. The owner supplies the OTP; none was requested or consumed during preparation:

```sh
npm publish docs/releases/0.15.0/naeil-ui-0.15.0.tgz --access public --tag latest --ignore-scripts --otp=OTP
```

After publication, verify registry integrity/shasum against `archive.json`, download and compare bytes, and retain fresh exact-version React/Next registry-consumer receipts. The workflow verifies integrity/shasum but does not create a source tag/Release, deploy Docs or certify service adoption. Automatic provenance is supported for public-repository trusted publishing; private repositories do not receive provenance. Keep that actual scope in the publication receipt.

```sh
npm view @naeil/ui@0.15.0 version dist time --json
npm view @naeil/ui dist-tags --json
curl --fail --location https://registry.npmjs.org/@naeil/ui/-/ui-0.15.0.tgz --output /tmp/naeil-ui-0.15.0-registry.tgz
cmp docs/releases/0.15.0/naeil-ui-0.15.0.tgz /tmp/naeil-ui-0.15.0-registry.tgz
# Expected latest=0.15.0; preserve next=0.13.0.
# Separate owner actions after registry verification:
git tag -a v0.15.0 37187a5778582fba4d40d237e9296ad5d11828fa -m '@naeil/ui 0.15.0'
git push origin refs/tags/v0.15.0
gh release create v0.15.0 docs/releases/0.15.0/naeil-ui-0.15.0.tgz docs/releases/0.15.0/archive.json --verify-tag --title '@naeil/ui 0.15.0' --notes-file docs/releases/0.15.0/README.md
```

Hosted Docs publication remains separate. Select the reviewed full Docs source before dispatching, then verify hosted routes/examples/fonts/notices:

```sh
gh workflow run publish-docs-manual.yml --ref main -f reviewed_sha=FULL_REVIEWED_DOCS_COMMIT_SHA -f confirmation=PUBLISH_REVIEWED_DOCS
```

Daily Dependabot PRs and guarded service merges follow publication to `latest`; service deployment stays manual. This receipt is not live trusted-publishing validation, service rollout, production authentication or native screen-reader certification. The two-commit freeze and archive schema follow 0.14.0; standalone browser scope is the six requested Chromium suites.
