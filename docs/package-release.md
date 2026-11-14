# Package verification and release policy

**Published registry baseline: 0.14.0; verified 2026-11-13 JST.** Tags are `latest=0.14.0`, `next=0.13.0`. Publication, source tags/Releases, hosted Docs and service adoption remain separate receipts.

## Publication receipts

| Version | npm publication | GitHub tag / Release | Hosted Docs |
| --- | --- | --- | --- |
| 0.13.0 | Owner OTP, 2026-11-12T09:46:59Z | `v0.13.0` identifies frozen source `08ee159`; [Release](https://github.com/naeil-dev/naeil-ui/releases/tag/v0.13.0) exists | [Run 43199769203](https://github.com/naeil-dev/naeil-ui/actions/runs/43199769203), reviewed source `63a032f` |
| 0.13.1 | Owner-approved `npm-publish` environment; [publish-npm.yml run 43312637887](https://github.com/naeil-dev/naeil-ui/actions/runs/43312637887), OIDC + provenance; registry time 2026-11-12T23:24:35Z (2026-11-13 JST) | `v0.13.1` → frozen source `7cd45d5`; [Release](https://github.com/naeil-dev/naeil-ui/releases/tag/v0.13.1), completed 2026-11-13 | [Run 43334742614](https://github.com/naeil-dev/naeil-ui/actions/runs/43334742614), reviewed source `dbf069b`, completed 2026-11-13 |
| 0.14.0 | Owner-approved `npm-publish` environment; [publish-npm.yml run 43386755633](https://github.com/naeil-dev/naeil-ui/actions/runs/43386755633), OIDC + provenance, `dist_tag=latest`; registry time 2026-11-13T10:37:22.242Z; all steps succeeded | Annotated `v0.14.0` → frozen source `c7dd765`; [Release](https://github.com/naeil-dev/naeil-ui/releases/tag/v0.14.0) with SHA-256-verified tgz and `archive.json` | [publish-docs-manual run 43414793322](https://github.com/naeil-dev/naeil-ui/actions/runs/43414793322) succeeded, reviewed source `c235091` |

- 0.13.0: frozen source `08ee159909c93a6dfd9f18da1b68e9c74f66f672`, archive SHA-256 `bbb123d9c07fa58534e7c3e1f8f71207b1ec1ac3a14e076976ea893b96fc762e`, 248044 bytes / 172 files ([preparation receipt](https://github.com/naeil-dev/naeil-ui/blob/main/docs/releases/0.13.0/README.md)).
- 0.13.1: frozen source `7cd45d5ea0025f66f486c2e9a6e05de2ddfe6395`, archive SHA-256 `9503cd729e161b0fe443014c995abdfb0f4e1c4ae8f1b6b3871df17a4b7a032f`, 249361 bytes / 172 files ([preparation receipt](https://github.com/naeil-dev/naeil-ui/blob/main/docs/releases/0.13.1/README.md)). Registry shasum `d30db174f4953e50f51fc3241edc41b6abf0cfc3` and `dist.integrity` match [archive.json](https://github.com/naeil-dev/naeil-ui/blob/main/docs/releases/0.13.1/archive.json).
- 0.14.0: frozen source `c7dd7655d98134591de2d660f6d9f92b11caffce`, merged through [PR #53](https://github.com/naeil-dev/naeil-ui/pull/53) as `c235091`. Downloaded registry tarball is byte-identical (`cmp`) to `docs/releases/0.14.0/naeil-ui-0.14.0.tgz`: SHA-256 `d194490f2d439d4e89a26b96bd46b49fb524ef466b09e98d658ff9e18e42e749`, 257780 bytes / 175 files; shasum `f6f066024c2ed01eeb3141152f0f9ed06b0f6fd9`, integrity `sha512-KTyMSjkE/zdD5ARqHwayRvh81iIOkXMBddbSyDp6ASZp3kI4/6w5kEE1Ksi4av+DN3IsoJp4VU8bh1ZQPItKPQ==` match the frozen [archive metadata](https://github.com/naeil-dev/naeil-ui/blob/main/docs/releases/0.14.0/archive.json). The protected run succeeded including “Verify registry integrity and shasum”.

The 0.13.1 publish step succeeded with provenance (Sigstore logIndex `3841181029`), but the **overall workflow run failed** in “Verify registry integrity and shasum”. npm reported that the package was being processed; registry metadata took longer than the six-read/five-second polling window. The owner manually verified the registry tarball byte-for-byte against the frozen archive afterwards, including SHA-256, shasum and integrity; the read-only recheck for this record independently matched both 0.13.0 and 0.13.1. Do not republish an existing version. The verifier now retries only failed requests, with at most 40 reads spaced 15 seconds apart and a ten-minute elapsed deadline including requests; present-but-mismatched or malformed metadata fails immediately. The publish job allows 20 minutes.

Frozen release directories, archives and preparation receipts are unchanged. These registry checks do not establish fresh consumer/service acceptance or native/manual certification. Hosted Docs receipts for each version are listed separately above.

**Historical publication receipt: 0.12.0 published 2026-11-10; registry tags verified 2026-11-11.** Source/tag `e03af076b725d742c4b319aca5ebb2379e2f0258`, frozen archive SHA-256 `7f5f01407c576e3c5fa956cf76ebfb3a8ef59b58619de99da68351974aca721b`, 178 regular files. Registry bytes matched; verified tags are `latest=0.12.0`, `next=0.12.0` ([receipt](https://github.com/naeil-dev/naeil-ui/blob/main/docs/releases/0.12.0/README.md), [GitHub Release](https://github.com/naeil-dev/naeil-ui/releases/tag/v0.12.0)). Earlier baseline 0.10.0 — 2026-11-04: source/tag `455f2f9aedb108606af2f429c18281260eafd2dd`, SHA-256 `a4a1e312f2f608358a10f9019c248af37a8172bb116d3bc506144442cb963fb4`, 175 files, tags then `latest=0.7.2`, `next=0.10.0`. See the [publication and three-service acceptance receipts](https://github.com/naeil-dev/naeil-ui/blob/main/docs/design/shared-language-2026-11-04/implementation-progress.md). Historical releases, archives and receipts remain immutable; hosted Docs require their own receipt. The retained [local runner](https://github.com/naeil-dev/naeil-ui/blob/main/docs/rollout/local-runner.md) is a **0.7.x-only, contract 1** release/recovery tool, outside release and recovery procedures for 0.8.0 and later. UI v2 names a design generation, not an npm major. Version-scoped installation is in the [README](../README.md#use-the-ui).

## 0.15.0 candidate — shared page rhythm

Not published. This additive minor includes page-rhythm commits `70fd5fb`, `e569a11` and `bf1758a` on main `10d799b`: `ui.page-top` 48px, `ui.page-title-gap` 12px, `ui.page-header-gap` 32px and `ui.page-bottom` 96px; `.ui-app-main` for fixed-header clearance and page spacing; `PageHeader` and shared title/description/actions classes; DESIGN.md page-rhythm guidance with the shared dark theme default; and naeil.dev content pages using the shared frame. See [the changelog](../CHANGELOG.md) and [application composition](components/application-layout.md). Existing classes, `PageTitle`, token values, public compatibility APIs and chrome contract 1 remain unchanged. Consumers adopt the shared main/header composition deliberately; package publication alone does not establish service adoption.

Package metadata, generated `/release` and clean React/Next fixture versions are 0.15.0. Freeze bundled source and guide edits in the source/version commit, then retain the exact archive, full member hashes and local verification in a separate evidence-only commit outside the npm payload. Require a byte-identical rebuild from fresh tracked source and preserve both commits without squashing. Keep generated test fixtures outside TypeScript discovery while building/packing and remove ignored `test-results/release-*/reproduction` directories after use. Historical release directories and archives remain untouched.

Registry checked 2026-11-14 JST: `latest=0.14.0`, `next=0.13.0`. Publication is intended directly to `latest` using the reviewed version/SHA-256 and owner approval through the protected `npm-publish` environment; leave `next` unchanged unless separately moved. Manual exact-archive OTP publication remains the fallback. This preparation commits and pushes the candidate branch; it performs no PR creation, merge, publication, tag/Release, workflow dispatch, registry/settings change or deployment. Publication, registry verification, source tag/Release, hosted Docs and service adoption require separate receipts.

## 0.14.0 release — owned-service identity and footer

Published to `latest` on 2026-11-13 through protected trusted publishing as recorded above. This additive minor includes identity/footer commits `1b25ea2` and `bb255f3` on main `dbf069b`: server-safe `naeilServiceName`/`naeilDocumentTitle` from `/naeil-locale`, `localeMetadata` deriving service identity (deprecated explicit `serviceName` remains honored), opt-in full `NaeilFooter service` profiles, and localized error documents with `.naeil <service>` titles and `/icon.svg`. See [compatibility and adoption requirements](../CHANGELOG.md), [footer profiles](components/naeil-footer.md) and [locale guidance](components/naeil-locale.md). Chrome contract 1, public legacy APIs and omitted-service legacy output remain unchanged. Serve the shared brand-kit `/icon.svg` before deployment; owned services adopt through their identity PRs rather than a bare dependency bump.

Package metadata, generated `/release` and clean React/Next fixture versions are 0.14.0. Frozen source and evidence remain separate, preserved without squashing. Maintained guide updates do not alter the published archive, source tag or frozen release files. Publication, registry verification, source tag/Release, hosted Docs and service adoption have separate receipts.

### 0.14.0 service adoption — 2026-11-13

Owner-approved merges and manual deployments completed on 2026-11-13:

| Service | Adoption source | Production receipt |
| --- | --- | --- |
| naeil.dev | `c235091` | Vercel production `/.well-known/naeil-ui.json`: `sourceRevision=c235091`, UI 0.14.0 |
| abstorm | [Co-STORM-Lab #60](https://github.com/naeil-dev/Co-STORM-Lab/pull/60) → `09a0a0c` | Web deployed; API unchanged |
| estimate | [abestimate #10](https://github.com/naeil-dev/abestimate/pull/10) → `f5f5146` | Release `f5f5146db0cf-e04289b4848d` |
| jev | [jev #7](https://github.com/naeil-dev/jev/pull/7) → `d0f52a7` | Release `manual-014-20261113T111006Z` |
| Home | [naeil-home #213](https://github.com/naeil-dev/naeil-home/pull/213) → `0b341c1` | U container `naeil-home-u-current-data-20261113-01` |

Main-agent verification with Aside at approximately 20:30 JST covered naeil.dev, abstorm, estimate and jev × ko/ja/en × 1440/390px: titles `Page — .naeil[ <service>]`, the same three brand-kit icons (SHA-256 prefixes `ab82d465` / `57d6edce` / `dbb6ce9e`) returning 200, full footer with `.naeil` brand and class only `ui-site-footer`, UI 0.14.0 and no overflow. Home was measured only signed out: title `.naeil home`, matching icons and intentionally omitted footer. Signed-in Home remains pending owner confirmation; these observations do not establish native screen-reader or physical-device acceptance.

Remaining observations, not fixed: abstorm's error-page header still uses legacy props; Home's backend OAuth callback template still has title `Sign into RelayDock` and a legacy icon; jev E2E retains four stale header-link expectations and a 0.7.1 shared-chrome reference.

## 0.13.1 release — publication and auto-update policy

Published through protected trusted publishing as recorded above. This docs-only patch exercises the npm workflow and services' auto-update flow. Comparing main `63a032f` with frozen 0.13.0 source `08ee159`, only `docs/package-release.md` changed within the package payload: #50's consumer same-major policy and protected publication guidance. No non-doc package change was found. Component code, public APIs, header structure/geometry, styles and dependencies remain unchanged; release metadata and maintained guidance advance to 0.13.1. Chrome contract 1 stays unchanged.

The owner approved direct publication to `latest` for Dependabot visibility, preserving `next=0.13.0`. The frozen source and evidence commits remain separate; historical preparation receipts are not rewritten after publication. Source tag/Release, hosted Docs and service acceptance have their own receipts; the 0.13.1 tag/Release and hosted Docs completed on 2026-11-13 as recorded above.

## 0.13.0 release — audit fixes and owned-service headers

Published to `next` on 2026-11-12; registry bytes verified against the frozen archive on 2026-11-13 JST. PR #47 supplies the 2026-11-12 audit fixes: server-safe utility imports, locale request/protocol hardening, pressed/theme/typography/accessibility behavior, package payload cleanup and CI checks. PR #48 adds strict opt-in `service` profiles for `abstorm`, `home`, `estimate` and `jev`, canonical lowercase branding and service-only tabs, plus toolbar-only mobile sheets with desktop focus restoration. Legacy props/output and inferred `NaeilHeaderProps` remain supported through service-first/legacy-last overloads. Deprecated brand/status/toolbar escape hatches remain functional without `service`; see [header profiles](components/naeil-header.md) and [compatibility changes](../CHANGELOG.md).

The frozen 0.13.0 package metadata, generated `/release` and clean React/Next fixture versions agree. Chrome contract 1 is unchanged because the service branch is opt-in and the omitted-service legacy contract is preserved; the audit's changed visual defaults and dependency/font guidance are listed in the changelog. Freeze all bundled source and guide edits in the source/version commit, then retain the exact archive, full member hashes and final local gates outside the npm payload in a separate evidence-only commit, as for 0.12.0. Rebuild from that frozen Git source and require byte-identical packing.

The [0.13.0 preparation receipt](https://github.com/naeil-dev/naeil-ui/blob/main/docs/releases/0.13.0/README.md) retains its frozen source, archive identity and prepublication checks. Later publication does not rewrite that archive or historical receipt. Future candidates follow the frozen source/evidence procedure and the protected workflow after [owner setup](https://github.com/naeil-dev/naeil-ui/blob/main/docs/rollout/auto-update.md#one-time-owner-setup).

## Consumer auto-update version policy

Owned services auto-merge same-major `@naeil/ui` updates after their CI and merge guards pass. Any break to a public API or the owned-service header contract (service-profile props, markup, geometry or the header rule) requires a new major, excluding it from automatic merging. While on 0.x, a header-breaking change requires **1.0.0**, not another 0.x minor; subsequent breaks require the next major. This is the project's explicit compatibility policy even though SemVer permits less stability before 1.0.

Dependabot proposes versions only up to npm's `latest` dist-tag. Publication to `next` alone does not reach services; promotion to `latest` is a separate owner decision. See [auto-update operations](https://github.com/naeil-dev/naeil-ui/blob/main/docs/rollout/auto-update.md) for guards, pause and rollback. Service deployment remains manual.

## 0.12.0 release — shared UI refinements and Sheet

This additive minor release includes PR #42 (`0d1cb08`): optional `closeLabel` for `DialogContent`/`DialogFooter` with unchanged defaults, error versus destructive guidance and checks, NaeilFooter starters using default `full`, compact footer link groups aligned to the top unless overridden with consumer `items-*` classes, and `ui.width-workflow` (896px) / `data-ui-layout="workflow"`. The locale service registration proposal is documentation only. PR #43 (`047de96`) adds public Sheet primitives at `@naeil/ui/ui` and `@naeil/ui/components/ui/sheet`.

Published 2026-11-10 to `next` and promoted to `latest` on 2026-11-11 with owner approval (see the receipt above). Tag `v0.12.0` identifies the frozen source. Package version, generated `/release` metadata and clean React/Next fixture versions move together. Future releases require a new frozen source/archive and their own gates; maintained guide edits do not replace this archive. Publication, registry verification, consumer adoption, GitHub Release and hosted Docs remain separate receipts.

## 0.11.0 release — AB Storm locale registry

Published 2026-11-08, this additive release registers AB Storm's five protected UI routes and error-document identity. Tag `v0.11.0` identifies its frozen source; see the [release](https://github.com/naeil-dev/naeil-ui/releases/tag/v0.11.0). The historical 0.7.x runner transaction and chrome contract 1 remain unchanged. Package publication, consumer adoption and hosted Docs require separate receipts.

## Architecture

One repository contains the shared package and the separate Next.js brand/example website. `@naeil/ui/ui` provides React primitives and generic Navigation/SiteFooter. The opt-in React-only `@naeil/ui/naeil-header` provides the complete actual naeil.dev branded header and `NaeilHeaderAccountControl`; see [its consumer contract](components/naeil-header.md). Owned apps render that control in `authSlot` and supply session state, pending state and guarded callbacks above the header. The legacy root is a framework compatibility entry with static Next/next-intl imports, even when selecting only Logo or a heading; React-only consumers use the documented shared deep modules. Next and next-intl are optional peers, not optional behavior inside the root. Supply them when importing that entry, Nav, Footer, or i18n/routing. Theme controls and Toaster use the framework-independent React library next-themes, retained as a runtime dependency.

Owned services use `@naeil/ui/naeil-footer` with their `service` id (always full, no overrides, since 0.14.0) for the canonical localized destinations; without `service` the legacy full/compact variants remain. Generic SiteFooter and legacy Footer retain their APIs. Footer navigation adapters preserve application save/flush decisions and modified-click behavior. `@naeil/ui/release` is server-safe metadata; it contains no application artifact, credential or environment. Applications compile their own allowlisted artifact/source identity. See [the footer contract](components/naeil-footer.md). Historical 0.7.x release plans and transaction recovery use the [local rollout runner](https://github.com/naeil-dev/naeil-ui/blob/main/docs/rollout/local-runner.md); the [rollout records](https://github.com/naeil-dev/naeil-ui/tree/main/docs/rollout) preserve dated evidence and historical policies. Publishing a package, creating an update PR or merging it never establishes complete consumer rollout. Home Console is outside the selected shared-UI rollout.

The [owned-service language runtime](components/naeil-locale.md) exposes `/naeil-locale` for registered routes/locales, `/server` for request routing/configuration, `/client` for the controller/provider, `/messages` for selected dictionaries, `/checker` for message validation and `/chrome` for provider-backed header/account/footer presentation. Owned Next services under `NaeilLocaleProvider` use `/naeil-locale/chrome`; `/naeil-header` and `/naeil-footer` remain standalone React adapters. The shared server/client runtime requires exact `next-intl@4.14.8`.

Website tools remain development dependencies so maintainers can develop both products. npm tarball consumers install only component runtime dependencies and their host React/ReactDOM. Build entries, package exports and packed checks constrain the public boundary. There is no bundled website action, Supabase helper, Three/hero/cursor module, blog engine or full application message catalog. The opt-in header includes only its three header dictionaries and canonical project catalog. Its 0.7.2 default catalog contains naeil-ui and references the official `https://naeil.dev/images/whale.png` URL and require network access; no image bytes are bundled, and unresolved artwork redistribution provenance remains in [third-party notices](../THIRD_PARTY_NOTICES.md).

## Checks

Use Node 22+ and the pinned pnpm version:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm check:types
pnpm lint
pnpm build:tokens
git diff --exit-code -- src/styles/theme.css
pnpm check:contrast
pnpm build:pkg
pnpm check:package
node --test scripts/consumer-font-notices.test.mjs
pnpm build
pnpm build:storybook
pnpm exec playwright install chromium firefox webkit
pnpm test:browser
```

The chrome fixture server and standalone navigation sample use `NAEIL_UI_FIXTURE_PORT`, with the unchanged default defined in `scripts/chrome-fixture-config.ts` in the repository. The same module supplies every fixture URL. An explicit port also isolates generated fixtures, test results and HTML reports by port; leave it unset to retain the existing CI paths. Choose a free integer port from 1 to 65535.

For two concurrent fixture-only runs in one worktree, use separate terminals:

```sh
NAEIL_UI_CHROME_ONLY=1 NAEIL_UI_FIXTURE_PORT=16081 pnpm test:browser e2e/page-frame.spec.ts --project=chromium
NAEIL_UI_CHROME_ONLY=1 NAEIL_UI_FIXTURE_PORT=16082 pnpm test:browser e2e/page-frame.spec.ts --project=chromium
```

`NAEIL_UI_CHROME_ONLY=1` skips the unrelated Storybook server. Full suites still use `NAEIL_UI_STORYBOOK_PORT` for Storybook. Do not overlap an unset-port run (which cleans the default `test-results` directory) with custom-port runs in the same worktree. The standalone sample uses the same port setting: `NAEIL_UI_FIXTURE_PORT=16083 pnpm exec tsx scripts/serve-navigation-sample.ts`. Stop standalone previews after use; Playwright stops its own fixture server.

`check:package:boundary` inspects an actual `npm pack --ignore-scripts` archive for every declared export, runtime dependencies, source aliases, relative imports, required CSS/tokens/documents/notices and forbidden website payload. `check:consumers` separately installs that tarball with npm into two temporary directories. It builds the reusable React example with Vite/Tailwind, type-checks with library checks enabled, imports shared deep modules, checks SSR and CSS, and asserts Next/Supabase/Three are absent. A separate Next production build exercises root exports and the deep paths observed in the reachable Next consumer, with consumer-owned messages and no auth backend. Neither fixture uses repository dependency symlinks. Network access is needed for uncached npm dependencies; temporary installs are removed on completion or failure.

For a frozen release candidate, both archive-producing checks can enforce the reviewed SHA-256 before extraction or consumer installation:

```sh
# Replace the placeholder with the frozen archive's full lowercase SHA-256.
NAEIL_UI_EXPECTED_ARCHIVE_SHA256=FULL_LOWERCASE_SHA256 pnpm check:package
```

Each check hashes its actual `npm pack` output and prints the digest. An unset expectation preserves normal development checks; a defined malformed or mismatched digest fails. Record matching boundary and clean React/Next results against the final archive, then reconcile package metadata, source revision and the consumer lock/archive identities. A provisional pack pass does not verify later documentation or archive bytes.

CI runs these checks and a separate actual Storybook/browser job. Configured browser projects run Chromium, Firefox and WebKit in CI. Verification and manual Pages jobs use the pinned Playwright 1.63.0 image, mounted-directory ownership correction and a version/browser launch preflight before builds; CI does not download browsers or OS packages during those jobs. Local Chromium/WebKit results and the historical Firefox launch block remain distinguished in the [support matrix](design/public-ui-support.md), [dated Stage 3 verification](design/public-ui-stage3-verification.md) and [Stage 4 extension verification](design/public-ui-stage4-verification.md). Automated axe/keyboard checks are not manual screen-reader or native Safari certification. The website build checks compatibility independently from package consumption; fonts fetched through next/font may require network access. Supabase OAuth and deployed behavior remain separate checks.

At baseline `bcf99fca3467ae2b1cd29d54fa24f2569fb6001c`, both [push CI](https://github.com/naeil-dev/naeil-ui/actions/runs/36945564443) and [PR CI](https://github.com/naeil-dev/naeil-ui/actions/runs/36945943651) passed package-and-site and failed the browser job. Linux Firefox application coverage passed in those runs. The [final correction follow-up](design/public-ui-final-verification.md) preserves that baseline and the initial local freeze evidence, then records independent scoped review approval and successful [push CI](https://github.com/naeil-dev/naeil-ui/actions/runs/36948276767) and [PR CI](https://github.com/naeil-dev/naeil-ui/actions/runs/36948280881) at exact correction commit `9f90493abb4fb1186c948084026c3f4c04074013`. The PR browser job passed 209 tests with 4 expected Firefox/WebKit forced-colors skips; package-and-site and optional helper checks passed. The downloaded CI preview also passed actual Chromium/WebKit subpath navigation/font checks. This acceptance applies to that source; [merged PR checks](https://github.com/naeil-dev/naeil-ui/pull/1/checks) retain the release-preparation checks. Subsequent documentation changes require their own verification. Publication and manual platform acceptance remain separate.

The explicit font-notice regression gate copies the real React fixture config into scratch and installs only its existing Vite/Tailwind-plugin/font dependencies, with scripts disabled. It loads the installed fixture Vite and checks output ownership and exact OFL bytes. Like clean-consumer checks, it requires network for uncached npm dependencies and cleans scratch on failure.

## Publication and deployment

### Verified 0.10.0 publication and service acceptance — 2026-11-04

The [registry receipt](https://github.com/naeil-dev/naeil-ui/releases/download/v0.10.0/npm-registry-verification.json) verifies the exact frozen archive listed above, including all 175 regular members. [Release v0.10.0](https://github.com/naeil-dev/naeil-ui/releases/tag/v0.10.0) retains its assets at the frozen source. [Implementation progress](https://github.com/naeil-dev/naeil-ui/blob/main/docs/design/shared-language-2026-11-04/implementation-progress.md) and [acceptance](https://github.com/naeil-dev/naeil-ui/blob/main/docs/design/shared-language-2026-11-04/acceptance.md) record Site, Jev and Estimate separately. Those service identities and recovery procedures are outside the old 0.7.x runner; its preserved approval and transaction must not be reused for this release.

### Historical 0.8.0 registry checkpoint — 2026-10-29

The published 0.8.0 archive matched frozen SHA-256 `6feb5a8cd50265ace584a0855432683b4127119377e08235282eaebd27081084` (139 files, source/tag `3f708e27d05212af7f7a5be769f13f871e8d10c7`). Registry tags at that dated checkpoint were `latest=0.7.2`, `next=0.8.0`. Its Home menu/brand/status/controlled-sheet APIs and package-owned chrome typography remain part of the current public API. This receipt remains historical and does not establish the current registry tags or hosted Docs source.

### Verified 0.7.1 registry publication and maintained Docs — 2026-10-23

The published release preserves these immutable identities:

| Item | Identity |
| --- | --- |
| Package source and pushed `v0.7.1` tag | `32108fd8e1cb1db6dae24a09f3ca72ac9a91f618` |
| Frozen archive | `docs/rollout/frozen/naeil-ui-0.7.1.tgz` |
| Archive SHA-256 | `ecd656c595fd63516417eef58a5e2624d1f1bf928ba0465761292d05502ab3f8` |
| Archive size / contents | 167705 compressed bytes; 139 files; 904985 unpacked bytes |
| Chrome contract | 1, with matching frozen frame/account references |

The frozen archive was published directly with scripts disabled. npm records publication at `2026-10-23T01:14:11.387Z`; `latest` was verified as `0.7.1`. An independent [registry archive](https://registry.npmjs.org/@naeil/ui/-/ui-0.7.1.tgz) download matched the frozen SHA-256, SHA-1, SRI, length and contents. Do not build or pack maintained main and call it the same frozen release. Earlier exact-archive validation is retained in the [dated account-correction evidence](https://github.com/naeil-dev/naeil-ui/tree/main/docs/rollout/evidence/account-correction-2026-10-17). [CI run 39859416335](https://github.com/naeil-dev/naeil-ui/actions/runs/39859416335) passed at `041c3c4f61755eca422d9a5727b32adc8c02a1f4`, including 563 unit tests and 380 browser tests (5 and 4 expected skips respectively), contrast, package/site and consumer checks. Its rebuilt archive differs because maintained guides changed; that CI is current compatibility evidence, not byte-identical frozen validation.

The archive's bundled guides are an immutable preparation snapshot, including 0.6.0 installation copy. Release notes must point to maintained instructions. Deploy Docs from a separately reviewed commit containing current guidance, the `v0.7.1` link correction and the corrected manual workflow. Record that Docs SHA, workflow run, deployment and actual hosted checks separately; retain `v0.7.1` at the frozen package source.

Postpublication registry checks passed on 2026-10-23. Separate fresh React/Next fixtures installed exact `@naeil/ui@0.7.1` from npmjs with independent empty caches and no repository dependency symlinks; every installed file matched the frozen 139-file inventory in both fixtures. Types, production builds, public root/deep import boundaries, release/footer/account SSR and browser checks passed, including the React fixture's absence of Next/Supabase/Three. The retained `registry-receipt.json` and successful `npm-publication-verification.json` bind these checks to the frozen source/archive; the latter records `checkedAt: 2026-10-23T01:19:50.385Z`. At the 01:19 UTC registry checkpoint, the tag had been pushed and the Release draft prepared. GitHub Release publication, hosted Docs and service rollout require separate receipts; see the release assets and [historical 0.7.x rollout runbook](https://github.com/naeil-dev/naeil-ui/blob/main/docs/rollout/local-runner.md). Native/manual, real OAuth and global service-discovery evidence retain their separate scopes and limits.

### 0.6.0 release scope — 2026-10-16

The owner authorized publication and deployment of the shared 1600px frame, responsive gutters and navigation/footer adoption improvements. Use the exact reviewed source and frozen archive; record npm, GitHub Release, Pages and production results independently. Existing consumer applications need their own upgrade and composition migration. The minor increment marks the deliberate default-width change and added public frame tokens/class.

### Verified 0.5.0 publication — 2026-10-15

Registry metadata and the [0.5.0 release](https://github.com/naeil-dev/naeil-ui/releases/tag/v0.5.0) were rechecked on 2026-10-16. npm published at `2026-10-15T21:48:55.614Z`; the release points to `04229adbecac302efbf50ab2b8a3a40edb0a04bb`. Its archive SHA-256 is `8c9203192d967dc4fae65cc00ae80743244e0ae2363fee8c2c0edd9541d07cf9`. Production deployment7093004444 and Pages deployment7093190956 succeeded for that source; the release retains their detailed verification assets. Earlier pending-publication statements describe the preparation checkpoint, not current registry state.

### Verified 0.4.0 publication — 2026-10-11

Brand 1.1.1 is independent of npm 0.4.0. Existing imports/props/slots remain supported; Logo variants, grayscale and theme controls accompany the approved `.naeil` identity. Publication, Docs and production results are recorded in the [publication report](https://github.com/naeil-dev/naeil-ui/blob/main/docs/design/naeil-brand-0.4.0-publication.md).

- npm published `@naeil/ui@0.4.0` at `2026-10-11T05:36:58.047Z`; `latest` was verified as `0.4.0`. [Registry/consumer evidence](https://github.com/naeil-dev/naeil-ui/releases/download/v0.4.0/npm-publication-verification.json) records independent empty-cache React/Next installs, types, production builds and browser contracts.
- [PR #3](https://github.com/naeil-dev/naeil-ui/pull/3) merged as `e8fe5afc13788a0cac0244b72e78975812f4a2ee`; `v0.4.0` points to that source. The [GitHub Release](https://github.com/naeil-dev/naeil-ui/releases/tag/v0.4.0) was published at `2026-10-11T05:45:55Z` with 9 publicly downloadable, byte-verified assets.
- Frozen candidate, merged-source rebuild and registry download are byte-identical: **108 files**, **131,414 compressed bytes**, **772,862 unpacked bytes**, SHA-256 `77fe024ceb631ea76100fdc687f04ee1ae90bfcbb306629cb9dac854226c724f`.
- The independent [brand 1.1.1 ZIP](https://github.com/naeil-dev/naeil-ui/releases/download/v0.4.0/naeil-brand-1.1.1.zip) contains 159 files and passes CRC; SHA-256 `a922a7375b5c3be412c759c0f54b532155f260801ea2bdd9cff43eca66848144`. [Brand evidence](https://github.com/naeil-dev/naeil-ui/releases/download/v0.4.0/brand-publication-verification.json) retains the approved extraction checks.
- [Pages run 38114879574](https://github.com/naeil-dev/naeil-ui/actions/runs/38114879574) deployed that exact source. Actual [hosted checks](https://github.com/naeil-dev/naeil-ui/releases/download/v0.4.0/hosted-docs-verification.json) passed 28 Docs visits, 28 Docs-to-Usage transitions, 4 brand theme checks, 6 exact notices, 4 canonical SVGs, local fonts and pinned links in Chromium/WebKit.
- Vercel production deployment `6991225824` succeeded for the same source. [Production checks](https://github.com/naeil-dev/naeil-ui/releases/download/v0.4.0/production-verification.json) passed 24 homepage/login conditions on [naeil.dev](https://naeil.dev/) across Korean/English/Japanese, desktop/mobile and light/dark, plus 3 exact deployed icons.

Local unit tests passed 46 tests. [Merged-source CI](https://github.com/naeil-dev/naeil-ui/actions/runs/38113742370) passed package/site checks; both that run and the Docs workflow passed 233 browser tests with 4 expected forced-colors skips. Production page checks do not certify full OAuth authentication. Native/manual platform coverage, print/trademark certification and real-consumer adoption retain their documented limits.

The npm archive and release tag retain the reviewed source. These maintained documentation updates record the later publication outcome and do not replace the immutable archive or redeploy the unchanged Storybook runtime. The earlier local Supabase environment failure remains dated evidence; actual production homepage/login rendering was verified separately above.

### Verified 0.3.0 publication — 2026-10-03

- npm published `@naeil/ui@0.3.0` at `2026-10-03T04:14:17.028Z`; `latest` was verified as `0.3.0` that day. [Public machine-readable evidence](https://github.com/naeil-dev/naeil-ui/releases/download/v0.3.0/npm-publication-verification.json) records registry integrity and fresh consumption.
- [PR #1](https://github.com/naeil-dev/naeil-ui/pull/1) merged as `71464f3985d0146c85087411d1e2f07ddaaaaab0`, with the same tree as independently approved `0d51755160b3d8e986c9b464b123fa4beed2689a`. Tag `v0.3.0` points to the merge commit; the [GitHub Release](https://github.com/naeil-dev/naeil-ui/releases/tag/v0.3.0) retains the reviewed archive.
- The registry archive matches the reviewed bytes: **105 files**, **453,120 unpacked bytes**, SHA-256 `b71a81b22354f6b7c17610ef9c02650fbd2a84e4309706e311dd62fe32a66d27`.
- [Hosted Docs](https://naeil-dev.github.io/naeil-ui/) are live following the 2026-10-02 [Pages run 36963256014](https://github.com/naeil-dev/naeil-ui/actions/runs/36963256014). Recorded Chromium/WebKit checks covered all 13 Docs pages, Docs-to-Usage navigation, local fonts and pinned links.

Fresh actual npm installs in separate React/Next apps with empty caches passed types and production builds, production font/fallback checks, mixed-import ownership/StrictMode checks, Chromium/WebKit extension contracts and Next 16.1.7 root/deep prerender. The development overlay probe retains 34 Vite font allowlist warnings and certifies overlay replay only; font success applies to production. Publication did not rerun the full CI/browser suite for unchanged reviewed source/runtime bytes. Native/manual coverage and real-product adoption remain open; see [support limits](design/public-ui-support.md).

The immutable npm archive's bundled guides are the release-preparation snapshot. Maintained GitHub guides record subsequent publication status; documentation-only changes do not alter npm 0.3.0, its tag or release asset. Hosted Docs reflect their separately deployed source.

### Release procedure

Storybook resolves relative Markdown guide and TypeScript source links against `v${version}`, using the version from the package.json being built. Maintained repository guides use relative wrapper-source links so their API authority follows the checkout. The package tag is independent of the reviewed Docs deployment SHA; hosted verification checks links against the build’s package version. Explicit historical evidence links retain their recorded revisions. Freeze subsequent documentation changes separately from immutable release archives; a new version’s links become publicly reachable only when its source tag exists.

The authorized 0.3.0 release completed main merge, npm 0.3.0, a GitHub Release and hosted Docs as recorded above. The release maintainer performs external authentication and publication; documentation preparation does not itself execute those operations. The automatic verification workflow does not publish or deploy. Record native/manual observations with their actual scope and carry unrun checks as limitations; do not substitute automated WebKit/axe checks or publication authorization for human certification.

The procedure preserves the distinction between preparation and external verification. Use the intended version in place of `VERSION`; future releases require their own authorization and frozen source/archive:

1. Review the changelog, migration, dated verification and the [2026-10-02 native environment report](design/public-ui-release-validation.md). Its capability blockers leave all native/manual acceptance rows open and add no native component pass. Confirm maintained links, actual Storybook Docs/Usage and legal notices for the intended source. Record unresolved manual coverage without inventing passes.
2. When freezing a new release, build and inspect an archive with `npm pack --ignore-scripts --json --pack-destination /path/to/candidate`; preserve its SHA-256, file list and source revision outside the archive. Run boundary/relative-link checks and clean packed consumers with `NAEIL_UI_EXPECTED_ARCHIVE_SHA256` set to that digest; confirm both generated archives match the candidate. For already frozen 0.7.1, rehash the existing file and retain its exact-archive evidence; maintained guide updates must not replace it.
3. Check registry availability for `@naeil/ui@VERSION` immediately before publication. After owner setup, prefer `.github/workflows/publish-npm.yml`: dispatch the reviewed ref with `version`, the reviewed archive `sha256` and `dist_tag` (default `next`), then approve through the protected `npm-publish` environment. It validates and publishes only the retained archive using OIDC, without an npm token or rebuild, and verifies registry integrity/shasum. Manual OTP fallback remains: `npm publish docs/releases/VERSION/naeil-ui-VERSION.tgz --access public --tag next --ignore-scripts --otp=OTP`. Independently verify registry version/time, integrity, dist-tag and archive bytes, followed by fresh exact-version registry consumers. If that version already exists, inspect equality rather than attempt overwrite; a failed post-publication check must not trigger another publish. A changelog or install command alone proves none of these.
4. Create the release tag/GitHub Release for the recorded source and retain version, artifact identity, validation scope and support limitations.
5. Publish the reviewed Storybook artifact through the manual Pages workflow below. Verify the actual hosted URL, subpath Docs-to-Usage navigation, fonts and notices over HTTP before reporting it live.

npm publication, GitHub Releases, main merge and hosted Docs are distinct operations. Production deployment of the brand website remains a separate scope; shared-package checks do not clear unknown site-art or fetched-site-font provenance.

The npm workflow requires a stable `MAJOR.MINOR.PATCH` version and lower-case SHA-256. Required reviewers are repository settings, not installed by the YAML: configure them before any dispatch. See [owner setup and publication operations](https://github.com/naeil-dev/naeil-ui/blob/main/docs/rollout/auto-update.md). npm's trusted publishing generates provenance automatically for supported public-repository publishes; private repositories do not receive provenance. Retain that limitation in the publication receipt.

`vercel.json` disables Git deployments only for `feat/public-ui-readiness`. Other branches retain Vercel's default behavior, so merging or pushing another branch requires a separate deployment decision. The automatic GitHub Actions checks are verification-only; enabling repository workflows is not evidence of a hosted site or approved release.


### Historical manual exact-archive preparation for 0.9.0 (following 0.8.0)

The following preparation requirements and deployment hold describe the October 29 checkpoint. The November 4 release and accepted service state are recorded above; this historical section does not describe current service versions or pending approval.

The retained `scripts/rollout/prepare-release.mjs` accepts consecutive stable 0.7.x releases only. Do not change rollout policy, `release.json` or the chrome contract to admit 0.9.0. Use the manual release procedure above: complete G1–G7 from the [adopted root-frame contract](https://github.com/naeil-dev/naeil-ui/blob/434b7d07235316097ca3a55265ee02c1422b0cfd/docs/superpowers/specs/2026-10-29-page-root-scrollbar-gutter.md), including the retained 0.8.0 P1–P5 regressions, freeze the exact source SHA/archive, then run boundary and clean React/Next checks with `NAEIL_UI_EXPECTED_ARCHIVE_SHA256`. The paired browser gate accepts `NAEIL_UI_CHROME_PACKAGE=/absolute/extracted/package` to exercise that exact archive, alongside SHA-512-pinned 0.7.2 and SHA-256-pinned frozen 0.8.0. Reference-only root/lock CSS adjustments are separate hashed fixture files; immutable archives stay untouched. Both classic and overlay jobs require actual probes. Viewport captures have geometry guards; all acceptance measurement precedes any terminal fullPage capture. It retains numeric differences and screenshots for human review; new renders never replace expectations automatically.

Before npm publication, the separately approved source push must make the linked adopted contract at `434b7d07235316097ca3a55265ee02c1422b0cfd` public. Immediately after that push, verify an anonymous HTTP 200 for the exact guide URL and confirm its status says **rev 1, adopted 2026-10-29**. Local link/boundary checks do not establish public reachability. Source push may trigger Vercel deployment and retains its own approval boundary.

Published 0.8.0 adds `appNavigation`, `brandSuffix`, `statusSlot` and controlled/observer sheet props; see [NaeilHeader](components/naeil-header.md) for supported host CSS and consumer-supplied fonts. Default catalog/blog/legacy overrides must remain equivalent to B1. Home Workspace uses the default account toolbar and full footer; LoginGate omits auth/separator and footer (F1/F2). A source rollback must revert adapter, CSS and manifest/lock together; pin-only rollback cannot support the new API.

The shipped guide records the B1 empty-menu desktop limitation, controlled-mobile asynchronous account/focus handoff versus desktop/uncontrolled selection-time behavior, and Home's confirmation-owned desktop cancel fallback. Compatibility comparisons normalize only the contract markers/language/release identity and Radix-generated IDs; SVG/Logo and consumer IDs stay exact. Source or guide corrections require a new archive and exact-archive gates; earlier candidate digests are historical evidence.

Package publication, tag, GitHub Release, main merge and Home deployment each require separate explicit approval. naeil.dev imports this repository's source, so a main merge upgrades its default header to the 0.8.0 API/style plus the 0.9.0 root/lock rule (including Japanese 320px classic F3 wrap) and is held until the owner approves that site impact and timing. Estimate/Jev stay on 0.7.2, and STOP remains. A prepared archive or local gate result grants no publication or rollout authority.

## Storybook preview artifact

`pnpm build:storybook` builds 18 actual Docs pages: 16 UI families (the 14 primitives plus Navigation and SiteFooter) and Brand / Logo and NaeilHeader. Interactive examples include the complete branded header, JapaneseApplication, canonical footer ReferenceFull/ReferenceCompact and AccountStates. Canonical footer/account examples live within existing stories, without a separate NaeilFooter Docs family. It copies generated documentation notices and approved canonical brand SVGs, bundles locally installed Pretendard/Noto Sans JP and disables Vite publicDir. The artifact check verifies real Docs/story entries, exact MIT/shadcn/font notices, brand references and absence of website public images/SVGs/HTML. It does not claim those excluded site assets have cleared rights.

CI uploads `storybook-preview` after a successful build; it is a downloadable static artifact, not a hosted deployment. Download/unzip it and serve the extracted directory (containing index.html):

```sh
pnpm preview:storybook
# Or pass the downloaded artifact directory: pnpm preview:storybook /path/to/preview
# Open http://127.0.0.1:6007 and choose UI / a family / Docs or Usage.
```

Run the command from this checkout after installing its dependencies. It serves the built or downloaded static artifact with persistent HTTP connections; a conventional static host works as well. Do not open iframe.html directly as a file; use HTTP. Preserve LICENSE, THIRD_PARTY_NOTICES.md and licenses/ with the artifact. The static preview needs no backend, credentials or external font server. The whole-header decorative project images reference the official site and require network access; failed images retain usable text and destinations. Third-party dependency code also retains its own bundled/license notices.

### Authorized GitHub Pages publication

The public Docs destination [https://naeil-dev.github.io/naeil-ui/](https://naeil-dev.github.io/naeil-ui/) has recorded [Pages run 38737502303](https://github.com/naeil-dev/naeil-ui/actions/runs/38737502303) for 0.5.0 source `04229adbecac302efbf50ab2b8a3a40edb0a04bb`, rechecked 2026-10-16. Subsequent deployments belong to their release records; this preparation does not establish 0.7.1 hosted publication. Pages uses `build_type=workflow` and a **github-pages** main-only deployment branch policy. See [workflow status](https://github.com/naeil-dev/naeil-ui/actions/workflows/publish-docs-manual.yml).

`.github/workflows/publish-docs-manual.yml` is an explicit `workflow_dispatch` recipe with no PR/push trigger. Pages is configured to use **GitHub Actions**; the **github-pages** environment permits deployment from main only. Run the authorized workflow from main with the exact reviewed source SHA; configuration alone does not establish a successful deployment. The workflow file does not enable Pages itself. A default-branch merge can separately invoke the brand site's existing Vercel integration; that production deployment and its asset/font provenance require separate handling.

Select **Publish reviewed UI docs (manual only)** in Actions (or use the command below), supply the exact full reviewed Docs source SHA and type `PUBLISH_REVIEWED_DOCS`. The job checks out that SHA, corrects mounted-directory ownership before the exact Git check, verifies preinstalled Chromium/Firefox/WebKit in the pinned Playwright image, rebuilds/verifies its actual preview/notices, runs the configured three-engine browser suite, and deploys only the Pages artifact through its environment. Failed checks do not reach deploy. Native observations and remaining manual limitations belong in the release evidence; the workflow does not certify them.

```sh
# Release maintainer: dispatch the corrected workflow from main.
# For 0.7.1, reviewed_sha is the separately reviewed Docs commit, not 32108fd.
gh workflow run publish-docs-manual.yml --ref main -f reviewed_sha=FULL_REVIEWED_DOCS_COMMIT_SHA -f confirmation=PUBLISH_REVIEWED_DOCS
```

After the reviewed Docs deployment, verify the manager and iframe under `/naeil-ui/`, all 16 UI and 2 Brand Docs pages, their Usage examples, NaeilHeader JapaneseApplication, canonical footer full/compact destinations, and signed-out/signed-in/menu/busy account states. Check the guide and source links against the tag matching the built package.json version, canonical artwork and official image references, local fonts and exact LICENSE/THIRD_PARTY_NOTICES/font notices over HTTP. Retain the deployment URL, Docs source SHA, workflow run and observed results separately from the package source/tag. Hosted Storybook uses simulated data and requires no Supabase project, design API key or external font server. Only the reviewed Storybook directory is uploaded; website public assets stay excluded.

Normal builds are network-independent after dependency installation. Vite collects notices for actual preview modules; checked-in manager notices conservatively cover named embedded packages and versions from Storybook 10.4.6's original source lock. `check-storybook` fails if a named embedded module lacks a full notice. Four vendored tiny modules have no embedded version in that lock/comments; their original npm notice source is explicitly marked, without an exact-version claim. The exact use-composed-ref@1.4.0 tarball/repository provides MIT metadata but no standalone notice; its metadata plus full declared terms are retained without inventing a year/holder. The client-only@0.0.1 React marker retains its exact metadata and the original React MIT notice. Other missing notices fail the build; no generic MIT fallback passes arbitrary packages.

For a Storybook dependency upgrade, first build the new preview to obtain fresh manager scripts, then run `python3 scripts/refresh-storybook-notices.py` (read-only npm/source retrieval plus a local notice-file update), review its source/notice changes, and rebuild. The refresh is opt-in and needs network; the build never retrieves legal/reference material silently. Keep all generated `licenses/` JSON/text files with the preview. The standalone React consumer likewise emits exact installed code/font notices with its production output.

### Historical 0.9.0 frame preparation gates

The owner adopted rev 1 on 2026-10-29 for local implementation and verification, including the root opt-out and F3 wrap. Both CSS graphs, theme/JS-only controls, opt-out and false-support branch, short/long route frames, body/content/fixed anchors under nested Radix locks, capture guards, frozen 0.8.0 comparisons and clean installed React/Next production CSS must pass before freezing. The false-support fixture tests a CSS branch, not a real unsupported engine. `build-chrome-fixtures.ts` alone is not clean-consumer proof; `check-consumers.ts` independently installs/builds/exercises both paths in each framework.

Run the normal checks above serially, plus the two deterministic Chromium mode jobs using B0's process-local wrappers, `NAEIL_UI_SCROLLBAR_MODE=classic|overlay` and `NAEIL_UI_SCROLLBAR_WRAPPERS=/absolute/wrapper-directory`. Their 15/0px overflow probes and stable-root frame probes must pass; the diagnostic `--enable-automation` flag exposes actual argv through CDP without changing the mode probe. Preserve exact source/archive SHA-256/SRI/inventory and per-gate commands/exit codes outside the archive. Repeat archive-dependent checks using `NAEIL_UI_CHROME_PACKAGE=/absolute/extracted/package` and `NAEIL_UI_EXPECTED_ARCHIVE_SHA256`.

At the October 29 preparation checkpoint, the candidate was unpublished. The following holds describe that historical checkpoint, not current release or service status. npm/dist-tag, version tag, GitHub Release, push/main merge (= naeil.dev production), hosted Docs and Home bump/deploy remain separate approvals. Home keeps its local root rule until an approved exact-version upgrade removes it; rollback restores manifest/lock and local root rule together. Estimate/Jev remain on 0.7.2 and STOP remains in force.
