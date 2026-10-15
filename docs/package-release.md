# Package verification and release policy

This policy covers the intended **@naeil/ui 0.5.0 release candidate**. Final source/archive verification, registry publication and new hosted deployments are pending. Verified 0.4.0 (2026-10-11) and 0.3.0 publication evidence below remains dated history. UI v2 names a design generation, not an npm major. Future breaking changes require an explicit migration and version decision. Version-scoped installation is in the [README](../README.md#use-the-ui).

## Architecture

One repository contains the shared package and the separate Next.js brand/example website. `@naeil/ui/ui` provides React primitives and generic Navigation/SiteFooter. The opt-in React-only `@naeil/ui/naeil-header` provides the complete actual naeil.dev branded header; see [its consumer contract](components/naeil-header.md). The legacy root is a framework compatibility entry with static Next/next-intl imports, even when selecting only Logo or a heading; React-only consumers use the documented shared deep modules. Next and next-intl are optional peers, not optional behavior inside the root. Supply them when importing that entry, Nav, Footer, or i18n/routing. Theme controls and Toaster use the framework-independent React library next-themes, retained as a runtime dependency.

Website tools remain development dependencies so maintainers can develop both products. npm tarball consumers install only component runtime dependencies and their host React/ReactDOM. Build entries, package exports and packed checks constrain the public boundary. There is no bundled website action, Supabase helper, Three/hero/cursor module, blog engine or full application message catalog. The opt-in header includes only its three header dictionaries and canonical project catalog. Its five decorative images reference official `https://naeil.dev/images/*.png` URLs and require network access; no image bytes are bundled, and unresolved artwork redistribution provenance remains in [third-party notices](../THIRD_PARTY_NOTICES.md).

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

`check:package:boundary` inspects an actual `npm pack --ignore-scripts` archive for every declared export, runtime dependencies, source aliases, relative imports, required CSS/tokens/documents/notices and forbidden website payload. `check:consumers` separately installs that tarball with npm into two temporary directories. It builds the reusable React example with Vite/Tailwind, type-checks with library checks enabled, imports shared deep modules, checks SSR and CSS, and asserts Next/Supabase/Three are absent. A separate Next production build exercises root exports and the deep paths observed in the reachable Next consumer, with consumer-owned messages and no auth backend. Neither fixture uses repository dependency symlinks. Network access is needed for uncached npm dependencies; temporary installs are removed on completion or failure.

For a frozen release candidate, both archive-producing checks can enforce the reviewed SHA-256 before extraction or consumer installation:

```sh
# Replace the placeholder with the frozen archive's full lowercase SHA-256.
NAEIL_UI_EXPECTED_ARCHIVE_SHA256=FULL_LOWERCASE_SHA256 pnpm check:package
```

Each check hashes its actual `npm pack` output and prints the digest. An unset expectation preserves normal development checks; a defined malformed or mismatched digest fails. Record matching boundary and clean React/Next results against the final archive, then reconcile package metadata, source revision and the consumer lock/archive identities. A provisional pack pass does not verify later documentation or archive bytes.

CI runs these checks and a separate actual Storybook/browser job. Configured browser projects run Chromium, Firefox and WebKit in CI. Local Chromium/WebKit results and the Firefox environment launch block are distinguished in the [current support matrix](design/public-ui-support.md) and [dated Stage 3 verification](design/public-ui-stage3-verification.md) and [Stage 4 extension verification](design/public-ui-stage4-verification.md); configured CI is not a recorded remote pass. Automated axe/keyboard checks are not manual screen-reader or native Safari certification. The website build checks compatibility independently from package consumption; fonts fetched through next/font may require network access. Supabase OAuth and deployed behavior remain separate checks.

At baseline `bcf99fca3467ae2b1cd29d54fa24f2569fb6001c`, both [push CI](https://github.com/naeil-dev/naeil-ui/actions/runs/36945564443) and [PR CI](https://github.com/naeil-dev/naeil-ui/actions/runs/36945943651) passed package-and-site and failed the browser job. Linux Firefox application coverage passed in those runs. The [final correction follow-up](design/public-ui-final-verification.md) preserves that baseline and the initial local freeze evidence, then records independent scoped review approval and successful [push CI](https://github.com/naeil-dev/naeil-ui/actions/runs/36948276767) and [PR CI](https://github.com/naeil-dev/naeil-ui/actions/runs/36948280881) at exact correction commit `9f90493abb4fb1186c948084026c3f4c04074013`. The PR browser job passed 209 tests with 4 expected Firefox/WebKit forced-colors skips; package-and-site and optional helper checks passed. The downloaded CI preview also passed actual Chromium/WebKit subpath navigation/font checks. This acceptance applies to that source; [merged PR checks](https://github.com/naeil-dev/naeil-ui/pull/1/checks) retain the release-preparation checks. Subsequent documentation changes require their own verification. Publication and manual platform acceptance remain separate.

The explicit font-notice regression gate copies the real React fixture config into scratch and installs only its existing Vite/Tailwind-plugin/font dependencies, with scripts disabled. It loads the installed fixture Vite and checks output ownership and exact OFL bytes. Like clean-consumer checks, it requires network for uncached npm dependencies and cleans scratch on failure.

## Publication and deployment

### Intended 0.5.0 release — pending

The owner authorized npm publication, reviewed main integration and naeil.dev deployment for the whole-header change. Authentication and actual execution are separate from authorization. At this documentation checkpoint no 0.5.0 registry version, tag/release, new hosted Docs, production site deployment or final archive identity is claimed. Freeze and verify the complete candidate before following the procedure below; record each external outcome independently.

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

The deployed Storybook's component guide URL base uses the 0.3.0 publication-status documentation snapshot `04c5b8cce145a4c387763db6f28d29e62f7664c7`. Runtime/API source-authority links retain tested component snapshot `81fd395031dc5b20074c4d915a8585360ce2d28a`; those foundation links remain valid and were rechecked during 0.4.0 hosted verification. The README documentation index points to the maintained main-branch index. Verify targets at their respective revisions and preserve original sources, dated approval scope and runtime evidence. Freeze subsequent documentation changes separately from immutable release archives.

The authorized 0.3.0 release completed main merge, npm 0.3.0, a GitHub Release and hosted Docs as recorded above. The release maintainer performs external authentication and publication; documentation preparation does not itself execute those operations. The automatic verification workflow does not publish or deploy. Record native/manual observations with their actual scope and carry unrun checks as limitations; do not substitute automated WebKit/axe checks or publication authorization for human certification.

The procedure preserves the distinction between preparation and external verification. Use the intended version in place of `VERSION`; future releases require their own authorization and frozen source/archive:

1. Review the changelog, migration, dated verification and the [2026-10-02 native environment report](design/public-ui-release-validation.md). Its capability blockers leave all native/manual acceptance rows open and add no native component pass. Confirm maintained links, actual Storybook Docs/Usage and legal notices for the intended source. Record unresolved manual coverage without inventing passes.
2. Build and inspect a fresh archive with `npm pack --ignore-scripts --json --pack-destination /path/to/candidate`; preserve its SHA-256, file list and source revision outside the archive. Run boundary/relative-link checks and clean packed consumers with `NAEIL_UI_EXPECTED_ARCHIVE_SHA256` set to that digest; confirm both generated archives match the candidate.
3. Check registry availability for `@naeil/ui@VERSION` immediately before publication. Publish the verified candidate archive, then verify the registry version, integrity and dist-tag; a changelog or install command alone proves none of these.
4. Create the release tag/GitHub Release for the recorded source and retain version, artifact identity, validation scope and support limitations.
5. Publish the reviewed Storybook artifact through the manual Pages workflow below. Verify the actual hosted URL, subpath Docs-to-Usage navigation, fonts and notices over HTTP before reporting it live.

npm publication, GitHub Releases, main merge and hosted Docs are distinct operations. Production deployment of the brand website remains a separate scope; shared-package checks do not clear unknown site-art or fetched-site-font provenance.

`vercel.json` disables Git deployments only for `feat/public-ui-readiness`. Other branches retain Vercel's default behavior, so merging or pushing another branch requires a separate deployment decision. The automatic GitHub Actions checks are verification-only; enabling repository workflows is not evidence of a hosted site or approved release.

## Storybook preview artifact

`pnpm build:storybook` builds 17 actual Docs pages: 15 UI families (the 13 primitives plus Navigation and SiteFooter) and Brand / Logo and NaeilHeader. Interactive Usage examples include the complete branded header and its JapaneseApplication adapter. It copies generated documentation notices and approved canonical brand SVGs, bundles locally installed Pretendard/Noto Sans JP and disables Vite publicDir. The artifact check verifies real Docs/story entries, exact MIT/shadcn/font notices, brand references and absence of website public images/SVGs/HTML. It does not claim those excluded site assets have cleared rights.

CI uploads `storybook-preview` after a successful build; it is a downloadable static artifact, not a hosted deployment. Download/unzip it and serve the extracted directory (containing index.html):

```sh
pnpm preview:storybook
# Or pass the downloaded artifact directory: pnpm preview:storybook /path/to/preview
# Open http://127.0.0.1:6007 and choose UI / a family / Docs or Usage.
```

Run the command from this checkout after installing its dependencies. It serves the built or downloaded static artifact with persistent HTTP connections; a conventional static host works as well. Do not open iframe.html directly as a file; use HTTP. Preserve LICENSE, THIRD_PARTY_NOTICES.md and licenses/ with the artifact. The static preview needs no backend, credentials or external font server. The whole-header decorative project images reference the official site and require network access; failed images retain usable text and destinations. Third-party dependency code also retains its own bundled/license notices.

### Authorized GitHub Pages publication

The public Docs destination [https://naeil-dev.github.io/naeil-ui/](https://naeil-dev.github.io/naeil-ui/) serves source `e8fe5afc13788a0cac0244b72e78975812f4a2ee` following the 2026-10-11 [Pages run 38114879574](https://github.com/naeil-dev/naeil-ui/actions/runs/38114879574). The [0.4.0 release](https://github.com/naeil-dev/naeil-ui/releases/tag/v0.4.0) records deployed source and hosted HTTP/navigation checks; the 0.3.0 deployment above remains history. Pages uses `build_type=workflow` and a **github-pages** main-only deployment branch policy. See [Docs workflow status](https://github.com/naeil-dev/naeil-ui/actions/workflows/publish-docs-manual.yml) for subsequent deployments; preview artifact checks above establish local artifact behavior only.

`.github/workflows/publish-docs-manual.yml` is an explicit `workflow_dispatch` recipe with no PR/push trigger. Pages is configured to use **GitHub Actions**; the **github-pages** environment permits deployment from main only. Run the authorized workflow from main with the exact reviewed source SHA; configuration alone does not establish a successful deployment. The workflow file does not enable Pages itself. A default-branch merge can separately invoke the brand site's existing Vercel integration; that production deployment and its asset/font provenance require separate handling.

Select **Publish reviewed UI docs (manual only)** in Actions (or use the command below), supply the exact full reviewed source SHA and type `PUBLISH_REVIEWED_DOCS`. The job checks out that SHA, rebuilds/verifies its actual preview/notices, runs the configured three-engine browser suite, and deploys only the Pages artifact through its environment. Failed checks do not reach deploy. Native observations and remaining manual limitations belong in the release evidence; the workflow does not certify them.

```sh
# Release maintainer: replace with the exact frozen source commit.
gh workflow run publish-docs-manual.yml -f reviewed_sha=FULL_REVIEWED_COMMIT_SHA -f confirmation=PUBLISH_REVIEWED_DOCS
```

After a 0.5.0 deployment, verify the manager and iframe under `/naeil-ui/`, all 15 UI and 2 Brand Docs pages, their Usage examples and NaeilHeader JapaneseApplication, canonical artwork and official image references, Docs links, local fonts and exact LICENSE/THIRD_PARTY_NOTICES/font notices. Retain the deployment URL, source SHA and observed HTTP/navigation results. Hosted Storybook uses simulated data and requires no Supabase project, design API key or external font server. Only the reviewed Storybook directory is uploaded; website public assets stay excluded.

Normal builds are network-independent after dependency installation. Vite collects notices for actual preview modules; checked-in manager notices conservatively cover named embedded packages and versions from Storybook 10.4.6's original source lock. `check-storybook` fails if a named embedded module lacks a full notice. Four vendored tiny modules have no embedded version in that lock/comments; their original npm notice source is explicitly marked, without an exact-version claim. The exact use-composed-ref@1.4.0 tarball/repository provides MIT metadata but no standalone notice; its metadata plus full declared terms are retained without inventing a year/holder. The client-only@0.0.1 React marker retains its exact metadata and the original React MIT notice. Other missing notices fail the build; no generic MIT fallback passes arbitrary packages.

For a Storybook dependency upgrade, first build the new preview to obtain fresh manager scripts, then run `python3 scripts/refresh-storybook-notices.py` (read-only npm/source retrieval plus a local notice-file update), review its source/notice changes, and rebuild. The refresh is opt-in and needs network; the build never retrieves legal/reference material silently. Keep all generated `licenses/` JSON/text files with the preview. The standalone React consumer likewise emits exact installed code/font notices with its production output.
