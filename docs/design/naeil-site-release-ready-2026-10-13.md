# naeil.dev release candidate — 2026-10-13

Implementation and private review are complete. This note prepares the final production decision; it does not authorize a push, merge, production deployment, npm publication or public Storybook release.

## Verified destination

- Repository: `naeil-dev/naeil-ui`; default branch `main`.
- Remote main, local HEAD and most recent successful Production deployment all point to `515fa2699a0bb182bc4d99e7bf0b41fb326185df`.
- GitHub deployment `7009831199`, created 2026-10-12, is successful. Its recorded environment is `https://design-system-gh21tjzwk-naeils-projects.vercel.app`.
- GitHub repository API confirms push/maintain access. Vercel CLI is not installed here; direct dashboard/API rollback access was not certified.
- `vercel.json` disables Git deployment only for `feat/public-ui-readiness`. The current `review-nav-footer-setup` branch is not exempt. A branch push can create a Preview deployment; merging to main can deploy Production. GitHub verification itself does not publish npm or public Docs.
- No open PR exists for the current branch. The current work remains uncommitted in the original workspace.

## Reviewed change

Shared Navigation/SiteFooter replace independent site frame implementations while preserving existing links, complete footer content, public imports and application-owned routing/auth/locales. The desktop project group is two columns and opens on hover; leaving dismisses it even after mouse click. Keyboard use and the mobile Dialog remain supported.

Home project content, blog index/article, login states and `/design` use the approved neutral type/spacing/control rules. Localized `Page — naeil` titles and route-specific canonicals replace inherited page metadata. Existing hero assets and project page bodies (`projects`, `cc`, `sa`, `pkm`, `baby-agent`, `project-layout.tsx`) remain unchanged. Naeil Home is not included.

Source versions: the original site evidence and later hover evidence are separately hashed. Readiness check reconciled their latest hashes across 50 implementation/test/script files and found no drift. The served Next build ID matches the final hover snapshot. `release-source-manifest.json` freezes the reviewed implementation/configuration bytes for the eventual commit review.

## Validation

- Final site/package/Storybook builds, types, contrast, packed React-only and Next consumers pass.
- Unit suite: 51 tests / 11 files pass. Full repository lint: no errors; the existing logo-study warning is unrelated. The unused variable in this task's evidence script was removed without behavior changes.
- Site implementation matrix: 288 conditions and 20 axe audits, with their original source scope recorded. Final hover source: 48 actual-site conditions across Chromium/WebKit, ko/en/ja, light/dark, 320/390/1440/2560px.
- Final shared browser run: 35 checks pass; one unchanged brand screenshot times out under concurrent load and passes in the separate recheck. This is not a single 36-pass run. Hover/click-leave, keyboard, mobile and multiple-group regressions pass in both engines.
- Actual private site and standalone sample were checked for hover opening and click-then-leave dismissal. See the integration report and `site-integration-evidence/hover-*`.
- Firefox profile launch, physical devices, VoiceOver and complete signed-in OAuth/session/logout remain unverified. Consumer Vite font allow-list warnings remain documented; final consumer checks pass.

## Final application sequence, subject to production authorization

1. Commit the reviewed shared/site implementation and relevant evidence; exclude ignored secrets, generated build directories and temporary fixtures. Reconcile the commit against the source manifest before pushing.
2. Push the branch and open a PR against main using the prepared PR text. A Vercel Preview may be created by this push. Wait for package/site and Storybook/browser CI; fix any actual CI failure before merging.
3. Merge the reviewed PR to main and observe the resulting Vercel Production deployment. Record the exact merge SHA, deployment ID, state and environment URL; status alone is insufficient.
4. Verify actual `https://naeil.dev` localized titles/canonicals, project hover/click-leave, mobile dialog, footer and blog/login/design rendering. Use the existing browser scripts with `SITE_URL=https://naeil.dev`, retaining new production results separately from local evidence. Do not use the legacy `verify-deploy.sh` as proof of source freshness: it neither follows locale redirects nor checks a deployed revision.
5. If production has a material regression, revert the new merge through the same Git/Vercel path to restore the verified `515fa26` behavior. The rollback source is known; direct Vercel promotion privileges are not assumed. Preserve deployment and failed-check evidence.

No package version bump, npm publish, public Storybook deployment or Naeil Home change is included in this application sequence.


2026-10-14: User explicitly approved the prepared commit, PR, merge and naeil.dev production application. npm publication, public Storybook deployment and Naeil Home changes remain excluded. Deployment outcome will be recorded separately after CI and live verification.
