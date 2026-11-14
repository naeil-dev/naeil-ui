# 0.16.0 release candidate — shell-owned login and account control

Not published. Frozen package source: `efb6f104eba93c76bf48afd85e2c9c77517320dd` (shell-account implementation through `fd40dcd`, based on published 0.15.0 main `85b1461`). The evidence-only commit retains this receipt and archive; it does not replace the source. Keep both commits without squashing.

`naeil-ui-0.16.0.tgz`: SHA-256 `1c36fcd5aa3147a75e83c60b1e2e1b4289898e0d8d868f758f55b0e963d8321e`, 200 regular files, 303066 compressed bytes, 1514323 unpacked bytes. SHA-1 `172271a96da66bf02644a4a6d021ba5ede9bc228`; SRI `sha512-RQ95L77fMbnSEZ+vgP0Zc1wJtBbdFxUxptL46IRxTnbu8sTQtCck/OWMfVYgzh6l7qbT/AaGm2ln64EBSPCzfA==`. `archive.json` follows the 0.15.0 schema with each regular member's SHA-256. Intended dist-tag: `latest`; release tag: `v0.16.0`; `published`: false.

This additive minor includes:

- Optional `NaeilServiceShell.account: NaeilHeaderAccount` in standalone `/naeil-shell` and provider-backed `/naeil-locale/chrome`. The shell composes the existing localized login/account control with its Link and desktop/mobile header; consumers retain session state, busy/request locks and guarded logout.
- Signed-out login suppression only for a same-app relative login route whose URL pathname equals currentHref (query/hash ignored). Absolute/protocol-relative login URLs never suppress the control; missing/invalid currentHref keeps login. Signed-in menus remain. `account` takes precedence over deprecated `header.authSlot`, with a once-only development warning; omitting it preserves 0.15.0 component behavior.
- Static conformance requires explicit `account` on each shell and rejects `header.authSlot`, including same-file variables/spreads. Runtime exposes `accountCount` for all header markers regardless of visibility; at 1440px at least one is required unless repeatable/comma-list `--no-account` records the exact requested route. Runtime exceptions do not exempt static ownership.
- Updated guides, stories, packed React/Next SSR consumers and unit/type/browser fixtures covering both entries, signed-in/out, login suppression, precedence, guards and CI pass/fail cases. See [frozen changelog](https://github.com/naeil-dev/naeil-ui/blob/efb6f104eba93c76bf48afd85e2c9c77517320dd/CHANGELOG.md) and [shell/CLI guide](https://github.com/naeil-dev/naeil-ui/blob/efb6f104eba93c76bf48afd85e2c9c77517320dd/docs/components/naeil-shell.md).

Chrome contract 1, standalone header APIs, generic/legacy compatibility, styles/tokens and dependency declarations remain unchanged. Main-agent service verification with the development tarball passed abstorm 52/52, jev 24/24, Home 36/36 and estimate 44/44 runtime cases. These development-artifact checks do not establish production adoption or authenticated live acceptance of this frozen archive.

## Comparison with 0.15.0

Compared directly against `docs/releases/0.15.0/naeil-ui-0.15.0.tgz`; both inventories and SHA-256 identities verified: 200 → 200 regular files; **166 byte-identical, 29 changed at the same path, 5 added, 5 removed**. Renamed generated chunks/declarations account for the additions/removals. Changes cover shell/account composition/types, measurements/conformance CLI, release metadata and maintained guidance. All 51 non-dist members match the frozen Git source byte-for-byte. Public export mappings, bin mapping, runtime/peer dependency declarations, CSS/tokens and chrome contract JSON are unchanged. Exact delta (relative to `package/`); every unlisted common member is byte-identical:

```text
+ dist/chunk-DDNU6HA5.js
+ dist/chunk-NV2SFQT5.js
+ dist/chunk-V7TGQKSG.js
+ dist/chunk-WUKUMU5P.js
+ dist/naeil-header-core-DnULjj17.d.ts
- dist/chunk-MKFQOUTD.js
- dist/chunk-MSRLGWVB.js
- dist/chunk-PSTVFJ6Q.js
- dist/chunk-Q635FHBX.js
- dist/naeil-header-core-Bpu6TTB3.d.ts
~ CHANGELOG.md
~ DESIGN.md
~ README.md
~ bin/conformance-runtime.mjs
~ bin/conformance-source.mjs
~ bin/naeil-ui-conformance.mjs
~ dist/components/index.js
~ dist/components/naeil-footer.js
~ dist/components/naeil-header.d.ts
~ dist/components/naeil-header.js
~ dist/components/naeil-shell.d.ts
~ dist/components/naeil-shell.js
~ dist/lib/ui-release.d.ts
~ dist/lib/ui-release.js
~ dist/naeil-locale/chrome.d.ts
~ dist/naeil-locale/chrome.js
~ dist/source/components/naeil-page-measure.d.ts
~ dist/source/components/naeil-page-measure.js
~ dist/source/components/naeil-shell-core.d.ts
~ dist/source/components/naeil-shell-core.js
~ dist/source/components/naeil-shell.d.ts
~ dist/source/lib/ui-release.d.ts
~ dist/source/lib/ui-release.js
~ docs/components/application-layout.md
~ docs/components/naeil-header.md
~ docs/components/naeil-shell.md
~ docs/design/v2-migration.md
~ docs/package-release.md
~ package.json
```

## Local verification

Verification ran on 2026-11-14–15 JST with Node 22.23.2, pnpm 10.30.3 and npm 10.9.8. Logs are under ignored `test-results/release-0.16.0/`. These are local prepublication checks; PR CI, publication, hosted Docs and deployed-service adoption have separate receipts.

| Command | Outcome |
| --- | --- |
| `pnpm install --frozen-lockfile` | PASS |
| `pnpm test` | PASS: 1242 tests, 6 existing opt-in skips |
| `pnpm lint` | PASS: 0 errors, 3 existing warnings in unchanged files |
| `pnpm check:types` | PASS |
| `pnpm check:contrast` | PASS: 98 pairs |
| `pnpm build:pkg` | PASS: release/tokens/brand data and locale package boundary |
| Exact-digest `pnpm check:package` below | PASS: exact archive boundary/installed CLI, React types/SSR/Vite/browser, Next RSC/SSR/types with webpack/Turbopack and globals/split frame/lock checks |
| `pnpm build:storybook` | PASS: 16 UI + 2 Brand Docs, runnable stories, fonts and notices |
| `pnpm test:rollout` | PASS: 351 tests, 1 existing opt-in skip |
| Nine-spec Chromium command below | PASS: 365 tests in all nine requested specs, 8.3 minutes |
| Fresh Git-source own install/build/pack and `cmp` | PASS: byte-identical; independent frozen-lockfile install/build/pack; reproduction directory removed |
| Read-only workflow preflight (`check`, retained digest, latest) | PASS: archive validated and exact 0.16.0 absent from npm |
| Reproduction cleanup and final type check | PASS: reproduction directories removed; final `pnpm check:types` passed |

Actual naeil.dev artwork loaded in the passing packed browser checks; no real HTTP 403/Vercel challenge or artwork retry was observed. The Chromium suite separately passed localhost fixtures for recovering and persistent HTTP 403 responses. Its three retry log lines target `http://127.0.0.1:…/art.svg`; they are synthetic tests, not a live challenge.

The root package build temporarily parked ignored `test-results/` under `node_modules/.release-0.16.0-test-results` to keep generated fixture TypeScript outside declaration compiler discovery, then restored it intact. No tracked source changed during build/pack. Fresh reproduction uses its own frozen-lockfile install/build/pack and is removed after comparison. Package and standalone browser suites run separately, using ports 6146–6149; ports 6665–6669 are never selected.

```sh
NAEIL_UI_STORYBOOK_PORT=6146 NAEIL_UI_FIXTURE_PORT=6147 NAEIL_UI_EXPECTED_ARCHIVE_SHA256=1c36fcd5aa3147a75e83c60b1e2e1b4289898e0d8d868f758f55b0e963d8321e NAEIL_UI_CONSUMER_EVIDENCE="$PWD/test-results/release-0.16.0/consumers" pnpm check:package

NAEIL_UI_STORYBOOK_PORT=6148 NAEIL_UI_FIXTURE_PORT=6149 pnpm exec playwright test e2e/chrome-pairs.spec.ts e2e/service-header.spec.ts e2e/naeil-footer.spec.ts e2e/page-frame.spec.ts e2e/frame.spec.ts e2e/shared-defaults.spec.ts e2e/naeil-shell.spec.ts e2e/naeil-conformance.spec.ts e2e/naeil-conformance-r4.spec.ts --project=chromium --workers=3 --fully-parallel
```

The archive was produced after committing frozen source:

```sh
pnpm build:pkg
npm pack --ignore-scripts --json --pack-destination test-results/release-0.16.0/pack
```

Fresh tracked-source reproduction (from repository root; keep logs outside `reproduction/`, remove it even after a failed check):

```sh
mkdir -p test-results/release-0.16.0/reproduction/source test-results/release-0.16.0/reproduction/pack
git archive --format=tar efb6f104eba93c76bf48afd85e2c9c77517320dd | tar -xf - -C test-results/release-0.16.0/reproduction/source
cd test-results/release-0.16.0/reproduction/source
pnpm install --frozen-lockfile
pnpm build:pkg
npm pack --ignore-scripts --json --pack-destination ../pack
cmp ../pack/naeil-ui-0.16.0.tgz ../../../../docs/releases/0.16.0/naeil-ui-0.16.0.tgz
shasum -a 256 ../pack/naeil-ui-0.16.0.tgz
cd ../../../..
rm -rf test-results/release-0.16.0/reproduction
pnpm check:types
```

Read-only publish preflight (executed; no dispatch/publication):

```sh
RELEASE_VERSION=0.16.0 RELEASE_SHA256=1c36fcd5aa3147a75e83c60b1e2e1b4289898e0d8d868f758f55b0e963d8321e RELEASE_DIST_TAG=latest node scripts/ci/npm-release.mjs check
```

## Preparation scope

The source commit advances package version, generated `/release` and React/Next fixture pins to 0.16.0 and updates `README.md`, `CHANGELOG.md`, `STATUS.md`, `docs/package-release.md`, `AGENTS.md` and `examples/react/README.md`. The evidence commit adds only this README, `archive.json` and `naeil-ui-0.16.0.tgz`. Keep source/evidence separate without squashing; later maintained docs or main builds must not replace the frozen archive. Historical release directories and other worktrees remain untouched. Preparation pushes `feat/shell-account-20261114` and opens a PR to main; it does not merge, publish, create tags/Releases, dispatch workflows, change registry/settings or deploy.

## Maintainer publication commands (not executed)

After review, merge without squashing and wait for accepted CI. Dispatch from reviewed `main`, then obtain owner approval for protected **`npm-publish`** after checking run source, version, digest and dist-tag. Required reviewers and trusted publishing must already be configured as described in [operations](https://github.com/naeil-dev/naeil-ui/blob/main/docs/rollout/auto-update.md#one-time-owner-setup). Publish this retained archive directly to **`latest`**, preserving **`next=0.13.0`** unless separately moved. Do not rebuild from current main.

The read-only preflight confirmed exact 0.16.0 absent from npm. Published baseline is `latest=0.15.0`, `next=0.13.0`. Check again immediately before publication; if the version exists, inspect identity instead of republishing.

```sh
shasum -a 256 docs/releases/0.16.0/naeil-ui-0.16.0.tgz
npm view @naeil/ui@0.16.0 version dist --json
npm view @naeil/ui dist-tags --json
# Owner only, while version is absent, with reviewed digest and environment approval:
gh workflow run publish-npm.yml -R naeil-dev/naeil-ui --ref main -f version=0.16.0 -f sha256=1c36fcd5aa3147a75e83c60b1e2e1b4289898e0d8d868f758f55b0e963d8321e -f dist_tag=latest
# Approve the waiting npm-publish environment job after reviewing it.
```

Manual exact-archive OTP fallback only if the workflow has not published; the owner supplies the OTP. None was requested or consumed during preparation:

```sh
npm publish docs/releases/0.16.0/naeil-ui-0.16.0.tgz --access public --tag latest --ignore-scripts --otp=OTP
```

After publication, verify registry shasum/SRI, download and compare bytes, and retain fresh exact-version React/Next registry-consumer receipts. The workflow does not create a source tag/Release, deploy Docs or certify adoption. Automatic provenance is supported for public-repository trusted publishing; private repositories do not receive provenance.

```sh
npm view @naeil/ui@0.16.0 version dist time --json
npm view @naeil/ui dist-tags --json
curl --fail --location https://registry.npmjs.org/@naeil/ui/-/ui-0.16.0.tgz --output /tmp/naeil-ui-0.16.0-registry.tgz
cmp docs/releases/0.16.0/naeil-ui-0.16.0.tgz /tmp/naeil-ui-0.16.0-registry.tgz
# Expected latest=0.16.0; preserve next=0.13.0.
# Separate owner actions after registry verification:
git tag -a v0.16.0 efb6f104eba93c76bf48afd85e2c9c77517320dd -m '@naeil/ui 0.16.0'
git push origin refs/tags/v0.16.0
gh release create v0.16.0 docs/releases/0.16.0/naeil-ui-0.16.0.tgz docs/releases/0.16.0/archive.json --verify-tag --title '@naeil/ui 0.16.0' --notes-file docs/releases/0.16.0/README.md
```

Hosted Docs publication is separate; choose the full reviewed source and verify hosted routes/examples/fonts/notices after dispatch:

```sh
gh workflow run publish-docs-manual.yml --ref main -f reviewed_sha=FULL_REVIEWED_DOCS_COMMIT_SHA -f confirmation=PUBLISH_REVIEWED_DOCS
```

Service update PRs follow publication to `latest`; deployments retain separate owner approval. Local checks do not establish live trusted-publishing, production authentication, native screen-reader or physical-device acceptance.
