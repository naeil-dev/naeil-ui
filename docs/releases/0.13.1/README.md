# 0.13.1 release candidate

Not published. Frozen package source: `7cd45d5ea0025f66f486c2e9a6e05de2ddfe6395`. The evidence-only commit retains this receipt and archive; it does not replace the source. `naeil-ui-0.13.1.tgz`: SHA-256 `9503cd729e161b0fe443014c995abdfb0f4e1c4ae8f1b6b3871df17a4b7a032f`, 172 regular files, 249361 compressed bytes, 1332193 unpacked bytes. `archive.json` uses the 0.13.0 schema with SHA-1, SRI and each regular member's SHA-256.

This docs-only patch is intended to exercise protected trusted publishing and the services' auto-update flow. Comparing main `63a032f` (#50) with frozen 0.13.0 source `08ee159`, the only changed package-shipped file is `docs/package-release.md`: consumer same-major policy, a new major for public API/header-contract breaks (1.0.0 for a header break while on 0.x), and protected publication guidance. The workflow, guard script/tests, agent/index links and operations guide stay outside the npm payload. No non-doc package change occurred on main over that interval.

The candidate updates version metadata, React/Next pins and maintained release guidance to 0.13.1. Component implementations, public APIs, dependencies, styles, header structure/geometry and chrome contract 1 are unchanged; runtime release markers identify the new version. Comparing the two archives, changed non-doc members are only `package.json`, `dist/lib/ui-release.{js,d.ts}`, `dist/source/lib/ui-release.{js,d.ts}`, two generated chunks (`chunk-5BXZPDHZ.js` → `chunk-ESTQITQO.js`, `chunk-A2DCQVTP.js` → `chunk-L25A4OKY.js`) and their imports in `dist/components/{index,naeil-header,naeil-footer}.js` and `dist/naeil-locale/chrome.js`. Each differs only in the version string or generated chunk references; all other non-doc members are byte-identical. Changed Markdown members are README, CHANGELOG and the release guide. Historical release directories, archives and receipts remain untouched.

## Local verification

Node 22.23.2, pnpm 10.30.3, npm 10.9.8. Full local logs are under ignored `test-results/release-0.13.1/`. These are local prepublication checks; PR CI, registry publication, hosted Docs and service adoption require separate receipts.

| Command | Outcome |
| --- | --- |
| `pnpm install --frozen-lockfile` | PASS |
| `pnpm test` | PASS: 947 tests, 6 existing production-invite opt-in skips |
| `pnpm lint` | PASS: 0 errors, 3 existing warnings in unchanged files |
| `pnpm check:types` | PASS |
| `pnpm check:contrast` | PASS: 98 pairs |
| `pnpm build:pkg` | PASS, including generated metadata/tokens and locale package boundary |
| `pnpm check:package` with the exact digest below | PASS on first isolated run (830.3s): exact archive boundary, clean React/Next types/SSR/RSC and globals/split frame/lock checks under webpack and Turbopack |
| `pnpm build:storybook` | PASS: 16 UI + 2 Brand Docs, runnable stories, fonts and exact notice coverage |
| `pnpm test:rollout` | PASS: 351 tests, 1 existing pinned-pnpm opt-in skip |
| Chromium command below | PASS: 113 cases, 6.2 minutes, both requested specs |
| Fresh frozen-source build and archive comparison below | PASS: own install/build/pack, byte-identical `cmp` and SHA-256 |
| Workflow read-only preflight (`check`, version 0.13.1, retained digest, tag latest) | PASS: archive validated and version absent from npm; no publish/dispatch |

The artwork preflight `curl -s -o /dev/null -w '%{http_code}' https://naeil.dev/images/whale.png` returned 200 before the package gate. The live artwork check remains before the frame matrix, unchanged. Package and browser suites run separately.

```sh
NAEIL_UI_STORYBOOK_PORT=6146 NAEIL_UI_FIXTURE_PORT=6147 NAEIL_UI_EXPECTED_ARCHIVE_SHA256=9503cd729e161b0fe443014c995abdfb0f4e1c4ae8f1b6b3871df17a4b7a032f NAEIL_UI_CONSUMER_EVIDENCE="$PWD/test-results/release-0.13.1/consumers" pnpm check:package

NAEIL_UI_STORYBOOK_PORT=6148 NAEIL_UI_FIXTURE_PORT=6149 pnpm exec playwright test e2e/chrome-pairs.spec.ts e2e/service-header.spec.ts --project=chromium --workers=3 --fully-parallel
```

The archive was produced only after committing the frozen source:

```sh
pnpm build:pkg
npm pack --ignore-scripts --json --pack-destination test-results/release-0.13.1/pack
```

A fresh tracked-source extraction with its own install/build/pack checks reproducibility:

```sh
mkdir -p test-results/release-0.13.1/reproduction/source test-results/release-0.13.1/reproduction/pack
git archive --format=tar 7cd45d5ea0025f66f486c2e9a6e05de2ddfe6395 | tar -xf - -C test-results/release-0.13.1/reproduction/source
cd test-results/release-0.13.1/reproduction/source
pnpm install --frozen-lockfile
pnpm build:pkg
npm pack --ignore-scripts --json --pack-destination ../pack
cmp ../pack/naeil-ui-0.13.1.tgz ../../../../docs/releases/0.13.1/naeil-ui-0.13.1.tgz
shasum -a 256 ../pack/naeil-ui-0.13.1.tgz
```

## Preparation scope

The source commit changes the same ten paths as 0.13.0: `package.json`, generated `src/lib/ui-release.ts`, `examples/react/package.json`, `scripts/fixtures/next/package.json`, `README.md`, `CHANGELOG.md`, `STATUS.md`, `docs/package-release.md`, `examples/react/README.md` and `AGENTS.md`. The evidence commit adds only this README, `archive.json` and `naeil-ui-0.13.1.tgz`. Preserve both commits when merging: **do not squash**, because the archive is bound to the frozen source SHA. A fresh read-only review independently verified both inventories/member hashes, the version/chunk-only non-doc comparison, frozen source/pins, unchanged historical files and publication instructions; it found no material static gap. Preparation is authorized to push the branch and open a PR; no merge, publish, tag, Release, workflow dispatch, registry/settings change or deployment is performed.

## Maintainer publication commands (not executed)

Preferred route: after review, merge without squashing and wait for accepted CI. Dispatch the protected workflow from `main`, then approve its **`npm-publish`** environment job after reviewing the run SHA, version, digest and tag. Required reviewers and the npm trusted publisher must already be configured as in the [operations guide](https://github.com/naeil-dev/naeil-ui/blob/main/docs/rollout/auto-update.md#one-time-owner-setup). This patch is owner-approved directly to **`latest`** so Dependabot can propose it; **`next` stays 0.13.0** unless separately moved. No workflow is dispatched during preparation.

Registry checked 2026-11-13 JST: exact 0.13.1 returned E404, `latest=0.12.0`, `next=0.13.0`. 0.13.0 was published 2026-11-12T09:46:59.973Z; its downloaded bytes match the retained SHA-256 `bbb123d9c07fa58534e7c3e1f8f71207b1ec1ac3a14e076976ea893b96fc762e`. Check availability again before publication. If 0.13.1 exists, inspect its identity instead of republishing. Never rebuild the publication archive from current main.

```sh
shasum -a 256 docs/releases/0.13.1/naeil-ui-0.13.1.tgz
npm view @naeil/ui@0.13.1 version dist --json
npm view @naeil/ui dist-tags --json
# Owner only: when still absent, with the reviewed digest and environment approval:
gh workflow run publish-npm.yml -R naeil-dev/naeil-ui --ref main -f version=0.13.1 -f sha256=9503cd729e161b0fe443014c995abdfb0f4e1c4ae8f1b6b3871df17a4b7a032f -f dist_tag=latest
# Approve the waiting npm-publish environment job in GitHub after reviewing it.
```

Manual exact-archive OTP fallback, only if the workflow has not already published the version. The owner supplies the OTP; none was requested or consumed during preparation:

```sh
npm publish docs/releases/0.13.1/naeil-ui-0.13.1.tgz --access public --tag latest --ignore-scripts --otp=OTP
```

After publication, verify registry integrity/shasum against `archive.json`, download and compare bytes, and retain fresh exact-version React/Next registry-consumer receipts. The workflow verifies integrity/shasum but does not create a source tag/Release, deploy Docs or certify service adoption. Automatic provenance is supported for public-repository trusted publishing; private repositories do not receive provenance. Keep that actual scope in the publication receipt.

```sh
npm view @naeil/ui@0.13.1 version dist time --json
npm view @naeil/ui dist-tags --json
curl --fail --location https://registry.npmjs.org/@naeil/ui/-/ui-0.13.1.tgz --output /tmp/naeil-ui-0.13.1-registry.tgz
cmp docs/releases/0.13.1/naeil-ui-0.13.1.tgz /tmp/naeil-ui-0.13.1-registry.tgz
# Expected latest=0.13.1; preserve next=0.13.0.
# Separate owner actions after registry verification:
git tag -a v0.13.1 7cd45d5ea0025f66f486c2e9a6e05de2ddfe6395 -m '@naeil/ui 0.13.1'
git push origin refs/tags/v0.13.1
gh release create v0.13.1 docs/releases/0.13.1/naeil-ui-0.13.1.tgz docs/releases/0.13.1/archive.json --verify-tag --title '@naeil/ui 0.13.1' --notes-file docs/releases/0.13.1/README.md
```

Hosted Docs publication remains separate. Select the reviewed full Docs source before dispatching, then verify hosted routes/examples/fonts/notices:

```sh
gh workflow run publish-docs-manual.yml --ref main -f reviewed_sha=FULL_REVIEWED_DOCS_COMMIT_SHA -f confirmation=PUBLISH_REVIEWED_DOCS
```

Daily Dependabot PRs and guarded service merges follow publication to `latest`; service deployment stays manual. This receipt is not live trusted-publishing validation, service rollout, production authentication or native screen-reader certification. The two-commit freeze and archive schema follow 0.13.0; browser scope is the two requested Chromium suites.
