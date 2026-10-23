# Package verification and release policy

**0.7.1 release in progress — 2026-10-23.** The owner authorized publication and the selected three-service continuous rollout. Current registry baseline: **0.6.0**. Version 0.7.1 is the first intended published 0.7.x release: canonical footer/release identity from the unpublished 0.7.0 candidate, plus shared account presentation. Record actual publication and deployment receipts before reporting completion. The completed [0.6.0 release](https://github.com/naeil-dev/naeil-ui/releases/tag/v0.6.0) remains evidence for its published application frame; do not republish it. Verified 0.5.0, 0.4.0 and 0.3.0 evidence remains dated history. UI v2 names a design generation, not an npm major. Future breaking changes require an explicit migration and version decision. Version-scoped installation is in the [README](../README.md#use-the-ui).

## Architecture

One repository contains the shared package and the separate Next.js brand/example website. `@naeil/ui/ui` provides React primitives and generic Navigation/SiteFooter. The opt-in React-only `@naeil/ui/naeil-header` provides the complete actual naeil.dev branded header and `NaeilHeaderAccountControl`; see [its consumer contract](components/naeil-header.md). Owned apps render that control in `authSlot` and supply session state, pending state and guarded callbacks above the header. The legacy root is a framework compatibility entry with static Next/next-intl imports, even when selecting only Logo or a heading; React-only consumers use the documented shared deep modules. Next and next-intl are optional peers, not optional behavior inside the root. Supply them when importing that entry, Nav, Footer, or i18n/routing. Theme controls and Toaster use the framework-independent React library next-themes, retained as a runtime dependency.

Owned services use `@naeil/ui/naeil-footer` for the canonical localized destinations in full/compact variants; generic SiteFooter and legacy Footer retain their APIs. Footer navigation adapters preserve application save/flush decisions and modified-click behavior. `@naeil/ui/release` is server-safe metadata; it contains no application artifact, credential or environment. Applications compile their own allowlisted artifact/source identity. See [the footer contract](components/naeil-footer.md). Current coordinator policy, selected services, activation and recovery evidence are maintained in the [rollout records](https://github.com/naeil-dev/naeil-ui/tree/main/docs/rollout); historical disabled-policy statements describe their dated checkpoints. Publishing a package, creating an update PR or merging it never establishes complete consumer rollout. Home Console is outside the selected shared-UI rollout.

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

CI runs these checks and a separate actual Storybook/browser job. Configured browser projects run Chromium, Firefox and WebKit in CI. Verification and manual Pages jobs use the pinned Playwright 1.63.0 image, mounted-directory ownership correction and a version/browser launch preflight before builds; CI does not download browsers or OS packages during those jobs. Local Chromium/WebKit results and the historical Firefox launch block remain distinguished in the [support matrix](design/public-ui-support.md), [dated Stage 3 verification](design/public-ui-stage3-verification.md) and [Stage 4 extension verification](design/public-ui-stage4-verification.md). Automated axe/keyboard checks are not manual screen-reader or native Safari certification. The website build checks compatibility independently from package consumption; fonts fetched through next/font may require network access. Supabase OAuth and deployed behavior remain separate checks.

At baseline `bcf99fca3467ae2b1cd29d54fa24f2569fb6001c`, both [push CI](https://github.com/naeil-dev/naeil-ui/actions/runs/36945564443) and [PR CI](https://github.com/naeil-dev/naeil-ui/actions/runs/36945943651) passed package-and-site and failed the browser job. Linux Firefox application coverage passed in those runs. The [final correction follow-up](design/public-ui-final-verification.md) preserves that baseline and the initial local freeze evidence, then records independent scoped review approval and successful [push CI](https://github.com/naeil-dev/naeil-ui/actions/runs/36948276767) and [PR CI](https://github.com/naeil-dev/naeil-ui/actions/runs/36948280881) at exact correction commit `9f90493abb4fb1186c948084026c3f4c04074013`. The PR browser job passed 209 tests with 4 expected Firefox/WebKit forced-colors skips; package-and-site and optional helper checks passed. The downloaded CI preview also passed actual Chromium/WebKit subpath navigation/font checks. This acceptance applies to that source; [merged PR checks](https://github.com/naeil-dev/naeil-ui/pull/1/checks) retain the release-preparation checks. Subsequent documentation changes require their own verification. Publication and manual platform acceptance remain separate.

The explicit font-notice regression gate copies the real React fixture config into scratch and installs only its existing Vite/Tailwind-plugin/font dependencies, with scripts disabled. It loads the installed fixture Vite and checks output ownership and exact OFL bytes. Like clean-consumer checks, it requires network for uncached npm dependencies and cleans scratch on failure.

## Publication and deployment

### 0.7.1 frozen release and maintained Docs — 2026-10-23

The authorized release preserves these immutable identities:

| Item | Identity |
| --- | --- |
| Package source and intended `v0.7.1` tag | `32108fd8e1cb1db6dae24a09f3ca72ac9a91f618` |
| Frozen archive | `docs/rollout/frozen/naeil-ui-0.7.1.tgz` |
| Archive SHA-256 | `ecd656c595fd63516417eef58a5e2624d1f1bf928ba0465761292d05502ab3f8` |
| Archive size / contents | 167705 compressed bytes; 139 files; 904985 unpacked bytes |
| Chrome contract | 1, with matching frozen frame/account references |

Publish the frozen archive directly with scripts disabled; do not build or pack maintained main and call it the same frozen release. Exact-archive validation is retained in the [dated account-correction evidence](https://github.com/naeil-dev/naeil-ui/tree/main/docs/rollout/evidence/account-correction-2026-10-17). [CI run 39859416335](https://github.com/naeil-dev/naeil-ui/actions/runs/39859416335) passed at `041c3c4f61755eca422d9a5727b32adc8c02a1f4`, including 563 unit tests and 380 browser tests (5 and 4 expected skips respectively), contrast, package/site and consumer checks. Its rebuilt archive differs because maintained guides changed; that CI is current compatibility evidence, not byte-identical frozen validation.

The archive's bundled guides are an immutable preparation snapshot, including 0.6.0 installation copy. Release notes must point to maintained instructions. Deploy Docs from a separately reviewed commit containing current guidance, the `v0.7.1` link correction and the corrected manual workflow. Record that Docs SHA, workflow run, deployment and actual hosted checks separately; retain `v0.7.1` at the frozen package source.

After publication, independently download the registry archive with an empty cache, compare its hash, integrity, length and all 139 files to the frozen archive, and install exact `@naeil/ui@0.7.1` from npmjs in separate fresh React/Next fixtures. Check types, production builds, root/deep imports, release/footer/account SSR and the React fixture's absence of Next/Supabase/Three. Packed local checks do not substitute for registry consumption. Publication, registry-consumer, GitHub Release, hosted Docs and per-service rollout outcomes remain pending until their actual receipts are recorded. Native/manual, real OAuth and global service-discovery evidence retain their separate scopes and limits.

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

Maintained Storybook resolves relative Markdown guide links against `v0.7.1`, whose frozen package source is `32108fd8e1cb1db6dae24a09f3ca72ac9a91f618`. That tag is independent of the reviewed Docs deployment SHA. Hosted verification checks that the pinned links resolve; the unpublished `v0.7.0` tag is not a valid target. Historical foundation/source-authority links remain at their original revisions. Freeze subsequent documentation changes separately from immutable release archives.

The authorized 0.3.0 release completed main merge, npm 0.3.0, a GitHub Release and hosted Docs as recorded above. The release maintainer performs external authentication and publication; documentation preparation does not itself execute those operations. The automatic verification workflow does not publish or deploy. Record native/manual observations with their actual scope and carry unrun checks as limitations; do not substitute automated WebKit/axe checks or publication authorization for human certification.

The procedure preserves the distinction between preparation and external verification. Use the intended version in place of `VERSION`; future releases require their own authorization and frozen source/archive:

1. Review the changelog, migration, dated verification and the [2026-10-02 native environment report](design/public-ui-release-validation.md). Its capability blockers leave all native/manual acceptance rows open and add no native component pass. Confirm maintained links, actual Storybook Docs/Usage and legal notices for the intended source. Record unresolved manual coverage without inventing passes.
2. When freezing a new release, build and inspect an archive with `npm pack --ignore-scripts --json --pack-destination /path/to/candidate`; preserve its SHA-256, file list and source revision outside the archive. Run boundary/relative-link checks and clean packed consumers with `NAEIL_UI_EXPECTED_ARCHIVE_SHA256` set to that digest; confirm both generated archives match the candidate. For already frozen 0.7.1, rehash the existing file and retain its exact-archive evidence; maintained guide updates must not replace it.
3. Check registry availability for `@naeil/ui@VERSION` immediately before publication. Publish the verified archive with `--ignore-scripts`, then independently verify registry version/time, integrity, dist-tag and archive bytes, followed by fresh exact-version registry consumers. If that version already exists, inspect equality rather than attempt overwrite; a changelog or install command alone proves none of these.
4. Create the release tag/GitHub Release for the recorded source and retain version, artifact identity, validation scope and support limitations.
5. Publish the reviewed Storybook artifact through the manual Pages workflow below. Verify the actual hosted URL, subpath Docs-to-Usage navigation, fonts and notices over HTTP before reporting it live.

npm publication, GitHub Releases, main merge and hosted Docs are distinct operations. Production deployment of the brand website remains a separate scope; shared-package checks do not clear unknown site-art or fetched-site-font provenance.

`vercel.json` disables Git deployments only for `feat/public-ui-readiness`. Other branches retain Vercel's default behavior, so merging or pushing another branch requires a separate deployment decision. The automatic GitHub Actions checks are verification-only; enabling repository workflows is not evidence of a hosted site or approved release.

## Storybook preview artifact

`pnpm build:storybook` builds 17 actual Docs pages: 15 UI families (the 13 primitives plus Navigation and SiteFooter) and Brand / Logo and NaeilHeader. Interactive examples include the complete branded header, JapaneseApplication, canonical footer ReferenceFull/ReferenceCompact and AccountStates. Canonical footer/account examples live within existing stories, without a separate NaeilFooter Docs family. It copies generated documentation notices and approved canonical brand SVGs, bundles locally installed Pretendard/Noto Sans JP and disables Vite publicDir. The artifact check verifies real Docs/story entries, exact MIT/shadcn/font notices, brand references and absence of website public images/SVGs/HTML. It does not claim those excluded site assets have cleared rights.

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

After the 0.7.1 Docs deployment, verify the manager and iframe under `/naeil-ui/`, all 15 UI and 2 Brand Docs pages, their Usage examples, NaeilHeader JapaneseApplication, canonical footer full/compact destinations, and signed-out/signed-in/menu/busy account states. Check pinned `v0.7.1` guide links, canonical artwork and official image references, local fonts and exact LICENSE/THIRD_PARTY_NOTICES/font notices over HTTP. Retain the deployment URL, Docs source SHA, workflow run and observed results separately from the package source/tag. Hosted Storybook uses simulated data and requires no Supabase project, design API key or external font server. Only the reviewed Storybook directory is uploaded; website public assets stay excluded.

Normal builds are network-independent after dependency installation. Vite collects notices for actual preview modules; checked-in manager notices conservatively cover named embedded packages and versions from Storybook 10.4.6's original source lock. `check-storybook` fails if a named embedded module lacks a full notice. Four vendored tiny modules have no embedded version in that lock/comments; their original npm notice source is explicitly marked, without an exact-version claim. The exact use-composed-ref@1.4.0 tarball/repository provides MIT metadata but no standalone notice; its metadata plus full declared terms are retained without inventing a year/holder. The client-only@0.0.1 React marker retains its exact metadata and the original React MIT notice. Other missing notices fail the build; no generic MIT fallback passes arbitrary packages.

For a Storybook dependency upgrade, first build the new preview to obtain fresh manager scripts, then run `python3 scripts/refresh-storybook-notices.py` (read-only npm/source retrieval plus a local notice-file update), review its source/notice changes, and rebuild. The refresh is opt-in and needs network; the build never retrieves legal/reference material silently. Keep all generated `licenses/` JSON/text files with the preview. The standalone React consumer likewise emits exact installed code/font notices with its production output.
