# 0.14.0 release candidate

Not published. Frozen package source: `c7dd7655d98134591de2d660f6d9f92b11caffce`. The evidence-only commit retains this receipt and archive; it does not replace the source. `naeil-ui-0.14.0.tgz`: SHA-256 `d194490f2d439d4e89a26b96bd46b49fb524ef466b09e98d658ff9e18e42e749`, 175 regular files, 257780 compressed bytes, 1353637 unpacked bytes. SHA-1 `f6f066024c2ed01eeb3141152f0f9ed06b0f6fd9`; SRI `sha512-KTyMSjkE/zdD5ARqHwayRvh81iIOkXMBddbSyDp6ASZp3kI4/6w5kEE1Ksi4av+DN3IsoJp4VU8bh1ZQPItKPQ==`. `archive.json` uses the 0.13.1 schema with SHA-1, SRI and each regular member's SHA-256.

This additive minor includes identity/footer commits `1b25ea2` and `bb255f3` on main `dbf069b`: `naeilServiceName`/`naeilDocumentTitle` (server-safe through `/naeil-locale`, also exposed by client header/chrome entries), derived `localeMetadata` service names with deprecated explicit `serviceName` still honored, strict opt-in full `NaeilFooter service` profiles, localized error documents with `.naeil <service>` titles and `/icon.svg`, and adoption guidance. Chrome contract 1 and omitted-service legacy chrome output remain unchanged. Services must serve the shared brand-kit `/icon.svg` before deploying and adopt through their identity PRs rather than a bare dependency bump.

Compared directly with `docs/releases/0.13.1/naeil-ui-0.13.1.tgz`, both inventories/member hashes verified: 172 → 175 regular members; **136 byte-identical, 33 changed at the same path, 6 added, 3 removed**. Changed runtime/type members implement identity helpers, footer service overloads/guards, shared service declarations, locale metadata/error documents and release markers; generated chunk imports follow those changes. CSS, tokens, shared message JSON, dependencies and `contracts/naeil-chrome.v1.json` are byte-identical. No artwork/icon bytes were added. The exact changed-member set follows (all paths relative to `package/`); every unlisted common member is byte-identical.

| Category | Members |
| --- | --- |
| Added | `dist/chunk-6ALD3HCS.js`, `dist/chunk-AUPZJH56.js`, `dist/naeil-locale/chunk-BU4R463Z.js`, `dist/naeil-services-CQuWDmDm.d.ts`, `dist/source/components/naeil-services.d.ts`, `dist/source/components/naeil-services.js` |
| Removed | `dist/chunk-ESTQITQO.js`, `dist/chunk-L25A4OKY.js`, `dist/naeil-header-data-BvISJ4RV.d.ts` |

Changed at the same path:

```text
CHANGELOG.md
DESIGN.md
README.md
dist/components/index.js
dist/components/naeil-footer.d.ts
dist/components/naeil-footer.js
dist/components/naeil-header.d.ts
dist/components/naeil-header.js
dist/lib/ui-release.d.ts
dist/lib/ui-release.js
dist/naeil-locale/chrome.d.ts
dist/naeil-locale/chrome.js
dist/naeil-locale/index.d.ts
dist/naeil-locale/index.js
dist/naeil-locale/server.d.ts
dist/naeil-locale/server.js
dist/source/components/naeil-footer-core.d.ts
dist/source/components/naeil-footer-core.js
dist/source/components/naeil-footer.d.ts
dist/source/components/naeil-footer.js
dist/source/components/naeil-header-core.d.ts
dist/source/components/naeil-header-core.js
dist/source/components/naeil-header.d.ts
dist/source/components/naeil-header.js
dist/source/lib/ui-release.d.ts
dist/source/lib/ui-release.js
docs/components/application-layout.md
docs/components/naeil-footer.md
docs/components/naeil-header.md
docs/components/naeil-locale.md
docs/design/v2-migration.md
docs/package-release.md
package.json
```

## Local verification

Node 22.23.2, pnpm 10.30.3, npm 10.9.8. Full local logs are under ignored `test-results/release-0.14.0/`. These are local prepublication checks; PR CI, registry publication, hosted Docs and service adoption require separate receipts.

| Command | Outcome |
| --- | --- |
| `pnpm install --frozen-lockfile` | PASS |
| `pnpm test` | PASS: 967 tests, 6 existing production-invite opt-in skips |
| `pnpm lint` | PASS: 0 errors, 3 existing warnings in unchanged files |
| `pnpm check:types` | PASS |
| `pnpm check:contrast` | PASS: 98 pairs |
| `pnpm build:pkg` | PASS, including generated metadata/tokens and locale package boundary |
| `pnpm check:package` with the exact digest below | PASS: exact archive boundary, clean React/Next types/SSR/RSC and globals/split frame/lock checks under webpack and Turbopack |
| `pnpm build:storybook` | PASS: 16 UI + 2 Brand Docs, runnable stories, fonts and exact notice coverage |
| `pnpm test:rollout` | PASS: 351 tests, 1 existing pinned-pnpm opt-in skip |
| Chromium command below | PASS: 130 cases, 6.7 minutes, all three requested specs |
| Fresh frozen-source build and archive comparison below | PASS: own install/build/pack, byte-identical `cmp` and SHA-256 |
| Workflow read-only preflight (`check`, version 0.14.0, retained digest, tag latest) | PASS: archive validated and version absent from npm; no publish/dispatch |

Reproducibility correction: the first root build discovered generated TypeScript fixtures under ignored `test-results/`, causing only `dist/source/i18n/routing.d.ts` to select a different equivalent Next `RedirectType` import path. Its initial comparison failed; the first package run was stopped and superseded. Temporarily moving `test-results/` to `node_modules/.release-0.14.0-test-results` during the root build/pack removed those generated inputs from compiler discovery, then the directory was restored intact. No source file changed. The resulting root archive is byte-identical to the independent fresh tracked-source build, and all exact-digest checks below use that corrected archive. The initial comparison also had an incorrect relative path (exit 2); the corrected path exposed the declaration difference before it was resolved. Logs retain both attempts.

```sh
NAEIL_UI_STORYBOOK_PORT=6146 NAEIL_UI_FIXTURE_PORT=6147 NAEIL_UI_EXPECTED_ARCHIVE_SHA256=d194490f2d439d4e89a26b96bd46b49fb524ef466b09e98d658ff9e18e42e749 NAEIL_UI_CONSUMER_EVIDENCE="$PWD/test-results/release-0.14.0/consumers" pnpm check:package

NAEIL_UI_STORYBOOK_PORT=6148 NAEIL_UI_FIXTURE_PORT=6149 pnpm exec playwright test e2e/chrome-pairs.spec.ts e2e/service-header.spec.ts e2e/naeil-footer.spec.ts --project=chromium --workers=3 --fully-parallel
```

The archive was produced only after committing the frozen source (keep generated test fixtures outside TypeScript discovery during build/pack):

```sh
pnpm build:pkg
npm pack --ignore-scripts --json --pack-destination test-results/release-0.14.0/pack
```

A fresh tracked-source extraction with its own install/build/pack checks reproducibility:

```sh
mkdir -p test-results/release-0.14.0/reproduction/source test-results/release-0.14.0/reproduction/pack
git archive --format=tar c7dd7655d98134591de2d660f6d9f92b11caffce | tar -xf - -C test-results/release-0.14.0/reproduction/source
cd test-results/release-0.14.0/reproduction/source
pnpm install --frozen-lockfile
pnpm build:pkg
npm pack --ignore-scripts --json --pack-destination ../pack
cmp ../pack/naeil-ui-0.14.0.tgz ../../../../docs/releases/0.14.0/naeil-ui-0.14.0.tgz
shasum -a 256 ../pack/naeil-ui-0.14.0.tgz
```

Read-only workflow preflight (no workflow dispatch or publication):

```sh
RELEASE_VERSION=0.14.0 RELEASE_SHA256=d194490f2d439d4e89a26b96bd46b49fb524ef466b09e98d658ff9e18e42e749 RELEASE_DIST_TAG=latest node scripts/ci/npm-release.mjs check
```

## Preparation scope

The source commit changes the same ten paths as 0.13.1: `package.json`, generated `src/lib/ui-release.ts`, `examples/react/package.json`, `scripts/fixtures/next/package.json`, `README.md`, `CHANGELOG.md`, `STATUS.md`, `docs/package-release.md`, `examples/react/README.md` and `AGENTS.md`. The evidence commit adds only this README, `archive.json` and `naeil-ui-0.14.0.tgz`. Preserve both commits when merging: **do not squash**, because the archive is bound to the frozen source SHA. Historical release directories, archives and receipts remain untouched. Preparation performs no push, PR, merge, publish, tag/Release, workflow dispatch, registry/settings change or deployment. Other worktrees are untouched.

## Maintainer publication commands (not executed)

Preferred route: after review, merge without squashing and wait for accepted CI. **Wait until all four owned-service adoption PRs are ready**, then dispatch the protected workflow from `main` and obtain owner approval for its **`npm-publish`** environment job after reviewing the run SHA, version, digest and tag. Required reviewers and the npm trusted publisher must already be configured as in the [operations guide](https://github.com/naeil-dev/naeil-ui/blob/main/docs/rollout/auto-update.md#one-time-owner-setup). Publication is intended directly to **`latest`** so Dependabot can propose it; **`next` stays 0.13.0** unless separately moved. No workflow is dispatched during preparation.

Registry checked 2026-11-13 JST: exact 0.14.0 returned E404 in the read-only preflight; `latest=0.13.1`, `next=0.13.0`. Check availability again before publication. If 0.14.0 exists, inspect its identity instead of republishing. Never rebuild the publication archive from current main.

```sh
shasum -a 256 docs/releases/0.14.0/naeil-ui-0.14.0.tgz
npm view @naeil/ui@0.14.0 version dist --json
npm view @naeil/ui dist-tags --json
# Owner only: after all four adoption PRs are ready, when still absent, with environment approval:
gh workflow run publish-npm.yml -R naeil-dev/naeil-ui --ref main -f version=0.14.0 -f sha256=d194490f2d439d4e89a26b96bd46b49fb524ef466b09e98d658ff9e18e42e749 -f dist_tag=latest
# Approve the waiting npm-publish environment job in GitHub after reviewing it.
```

Manual exact-archive OTP fallback, only if the workflow has not already published the version. The owner supplies the OTP; none was requested or consumed during preparation:

```sh
npm publish docs/releases/0.14.0/naeil-ui-0.14.0.tgz --access public --tag latest --ignore-scripts --otp=OTP
```

After publication, verify registry integrity/shasum against `archive.json`, download and compare bytes, and retain fresh exact-version React/Next registry-consumer receipts. The workflow verifies integrity/shasum but does not create a source tag/Release, deploy Docs or certify service adoption. Automatic provenance is supported for public-repository trusted publishing; private repositories do not receive provenance. Keep that actual scope in the publication receipt.

```sh
npm view @naeil/ui@0.14.0 version dist time --json
npm view @naeil/ui dist-tags --json
curl --fail --location https://registry.npmjs.org/@naeil/ui/-/ui-0.14.0.tgz --output /tmp/naeil-ui-0.14.0-registry.tgz
cmp docs/releases/0.14.0/naeil-ui-0.14.0.tgz /tmp/naeil-ui-0.14.0-registry.tgz
# Expected latest=0.14.0; preserve next=0.13.0.
# Separate owner actions after registry verification:
git tag -a v0.14.0 c7dd7655d98134591de2d660f6d9f92b11caffce -m '@naeil/ui 0.14.0'
git push origin refs/tags/v0.14.0
gh release create v0.14.0 docs/releases/0.14.0/naeil-ui-0.14.0.tgz docs/releases/0.14.0/archive.json --verify-tag --title '@naeil/ui 0.14.0' --notes-file docs/releases/0.14.0/README.md
```

Hosted Docs publication remains separate. Select the reviewed full Docs source before dispatching, then verify hosted routes/examples/fonts/notices:

```sh
gh workflow run publish-docs-manual.yml --ref main -f reviewed_sha=FULL_REVIEWED_DOCS_COMMIT_SHA -f confirmation=PUBLISH_REVIEWED_DOCS
```

Daily Dependabot PRs and guarded service merges follow publication to `latest`; service deployment stays manual. This receipt is not live trusted-publishing validation, service rollout, production authentication or native screen-reader certification. The two-commit freeze and archive schema follow 0.13.1; browser scope is the three requested Chromium suites.
