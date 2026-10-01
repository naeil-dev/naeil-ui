# Package verification and release policy

The prepared package is `@naeil/ui@0.3.0`, unreleased. npm latest was `0.2.0` on 2026-10-02. UI v2 names a design generation, not an npm major. A 0.x minor increment communicates this dependency/export boundary change; future breaking changes must receive an explicit migration and version decision.

## Architecture

One repository contains the shared package and the separate Next.js brand/example website. `@naeil/ui/ui` is the React entrypoint. The legacy root is a framework compatibility entry with static Next/next-intl imports, even when selecting only Logo or a heading; React-only consumers use the documented shared deep modules. Next and next-intl are optional peers, not optional behavior inside the root. Supply them when importing that entry, Nav, Footer, or i18n/routing. Theme controls and Toaster use the framework-independent React library next-themes, retained as a runtime dependency.

Website tools remain development dependencies so maintainers can develop both products. npm tarball consumers install only component runtime dependencies and their host React/ReactDOM. Build entries, package exports and packed checks constrain the public boundary. There is no bundled website action, Supabase helper, Three/hero/cursor module, blog engine or application message catalog.

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
pnpm build
pnpm build:storybook
pnpm exec playwright install chromium firefox webkit
pnpm test:browser
```

`check:package:boundary` inspects an actual `npm pack --ignore-scripts` archive for every declared export, runtime dependencies, source aliases, relative imports, required CSS/tokens/documents/notices and forbidden website payload. `check:consumers` separately installs that tarball with npm into two temporary directories. It builds the reusable React example with Vite/Tailwind, type-checks with library checks enabled, imports shared deep modules, checks SSR and CSS, and asserts Next/Supabase/Three are absent. A separate Next production build exercises root exports and the deep paths observed in the reachable Next consumer, with consumer-owned messages and no auth backend. Neither fixture uses repository dependency symlinks. Network access is needed for uncached npm dependencies; temporary installs are removed on completion or failure.

CI runs these checks and a separate actual Storybook/browser job. Configured browser projects run Chromium, Firefox and WebKit in CI. Local Chromium/WebKit results and the Firefox environment launch block are distinguished in the [current support matrix](design/public-ui-support.md) and [dated verification](design/public-ui-stage3-verification.md); configured CI is not a recorded remote pass. Automated axe/keyboard checks are not manual screen-reader or native Safari certification. The website build checks compatibility independently from package consumption; fonts fetched through next/font may require network access. Supabase OAuth and deployed behavior remain separate checks.

## Publication and deployment

Before any release, review changelog, migration, all verification results and actual rendered Storybook output; inspect `npm pack --dry-run --json` and test the intended archive. Check registry availability again. Obtain explicit publication authorization before `npm publish`, a release tag or GitHub Release. The automatic verification workflow does not publish or deploy. The separately prepared manual-only Pages workflow below remains unexecuted and requires a future authorized publication decision. npm publication, GitHub Releases and website deployment are separate actions.

`vercel.json` disables Git deployments only for `feat/public-ui-readiness`. Other branches retain Vercel's default behavior, so merging or pushing another branch requires a separate deployment decision. The automatic GitHub Actions checks are verification-only; enabling repository workflows is not evidence of a hosted site or approved release.

## Storybook preview artifact

`pnpm build:storybook` builds actual Docs pages and interactive Usage examples for all 11 families. It copies only generated documentation notices, bundles locally installed Pretendard/Noto Sans JP and disables Vite publicDir. The artifact check verifies real Docs/story entries, exact MIT/shadcn/font notices and absence of website public images/SVGs/HTML. It does not claim those excluded site assets have cleared rights.

CI uploads `storybook-preview` after a successful build; it is a downloadable static artifact, not a hosted deployment. Download/unzip it and serve the extracted directory (containing index.html):

```sh
pnpm preview:storybook
# Or pass the downloaded artifact directory: pnpm preview:storybook /path/to/preview
# Open http://127.0.0.1:6007 and choose UI / a family / Docs or Usage.
```

Run the command from this checkout after installing its dependencies. It serves the built or downloaded static artifact with persistent HTTP connections; a conventional static host works as well. Do not open iframe.html directly as a file; use HTTP. Preserve LICENSE, THIRD_PARTY_NOTICES.md and licenses/ with the artifact. The static preview needs no backend, credentials or external font server. Third-party dependency code also retains its own bundled/license notices.

To optionally publish documentation later, first review this exact artifact and manual acceptance results, select a static host/path, retain notices and obtain deployment authorization. Upload only the reviewed Storybook directory through that host's documented static-file workflow. A dispatch-only Pages recipe is prepared below; no automatic Pages/Vercel release is introduced here. Main merge can still trigger the separate brand site's existing Vercel Git integration.

### Manual GitHub Pages preparation (not run)

`.github/workflows/publish-docs-manual.yml` is an explicit `workflow_dispatch` recipe. It has no PR/push trigger. After a separate authorized merge of the reviewed workflow, an authorized maintainer must enable Pages with **GitHub Actions** as its source and configure the **github-pages** environment with appropriate reviewers/branch restrictions. Pages is currently disabled; this file does not enable it. Any default-branch merge can separately invoke the existing brand-site Vercel integration.

Only after explicit docs publication authorization and recorded manual acceptance, select **Publish reviewed UI docs (manual only)** in Actions (or use the command below), supply the exact full approved commit SHA and type `PUBLISH_REVIEWED_DOCS`. The job checks out that SHA, rebuilds/verifies its actual preview/notices, runs the configured three-engine browser suite, and deploys only the Pages artifact through the protected environment. Failed checks do not reach deploy. Do not invoke this during implementation/review.

```sh
# Future authorized publication only; replace the full SHA with the reviewed commit.
gh workflow run publish-docs-manual.yml -f reviewed_sha=FULL_REVIEWED_COMMIT_SHA -f confirmation=PUBLISH_REVIEWED_DOCS
```

Normal builds are network-independent after dependency installation. Vite collects notices for actual preview modules; checked-in manager notices conservatively cover named embedded packages and versions from Storybook 10.4.6's original source lock. `check-storybook` fails if a named embedded module lacks a full notice. Four vendored tiny modules have no embedded version in that lock/comments; their original npm notice source is explicitly marked, without an exact-version claim. The exact use-composed-ref@1.4.0 tarball/repository provides MIT metadata but no standalone notice; its metadata plus full declared terms are retained without inventing a year/holder. The client-only@0.0.1 React marker retains its exact metadata and the original React MIT notice. Other missing notices fail the build; no generic MIT fallback passes arbitrary packages.

For a Storybook dependency upgrade, first build the new preview to obtain fresh manager scripts, then run `python3 scripts/refresh-storybook-notices.py` (read-only npm/source retrieval plus a local notice-file update), review its source/notice changes, and rebuild. The refresh is opt-in and needs network; the build never retrieves legal/reference material silently. Keep all generated `licenses/` JSON/text files with the preview. The standalone React consumer likewise emits exact installed code/font notices with its production output.
