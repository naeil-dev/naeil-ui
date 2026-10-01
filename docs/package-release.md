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

CI runs these checks and a separate actual Storybook/browser job. Current browser tests use the configured engine; installing three engines does not claim coverage of all three. Automated axe/keyboard checks are not manual screen-reader or native Safari certification. The website build checks compatibility independently from package consumption; fonts fetched through next/font may require network access. Supabase OAuth and deployed behavior remain separate checks.

## Publication and deployment

Before any release, review changelog, migration, all verification results and actual rendered Storybook output; inspect `npm pack --dry-run --json` and test the intended archive. Check registry availability again. Obtain explicit publication authorization before `npm publish`, a release tag or GitHub Release. No workflow here publishes or deploys. npm publication, GitHub Releases and website deployment are separate actions.

`vercel.json` disables Git deployments only for `feat/public-ui-readiness`. Other branches retain Vercel's default behavior, so merging or pushing another branch requires a separate deployment decision. GitHub Actions is verification-only; enabling repository workflows is not evidence of a hosted site or approved release.
