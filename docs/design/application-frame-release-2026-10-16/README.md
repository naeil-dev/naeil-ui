# 0.6.0 release preparation — 2026-10-16

The owner authorized deployment after accepting the 1600px shared frame. Registry inspection showed that 0.5.0 was already published on 2026-10-15, so this update uses 0.6.0. Public default widths change deliberately; imports and consumer overrides remain compatible.

Scope: merge the reviewed changes, publish the frozen npm archive, publish the matching Storybook through the existing manual Pages workflow, and deploy naeil.dev through its existing Vercel integration. External application upgrades are separate.

The earlier implementation evidence in `../application-frame-2026-10-16/` retains its original candidate metadata and missing-local-auth runtime block. Release preparation updates active guides, fixture versions and package metadata. It also fixes Storybook sibling Markdown guide URLs and pins the relative guide base to the release tag. A focused test reproduced the unresolved-layout-link failure before the correction.

Current local release checks: 74 unit tests pass; types pass; lint has 0 errors and the unchanged logo-study warning; package and Storybook builds pass. The frozen 125-file archive is 161100 compressed bytes, SHA-256 `e94e0b728adbaabc4a23df795e363980b071436699a10765d4ccc6460948f32f`. Boundary and clean-consumer checks enforce that digest. Remote CI, registry publication and deployments are recorded after execution in the GitHub release, rather than claimed by this preparation note.

After publication, `pnpm add --save-exact @naeil/ui@0.6.0` installs this contract. Roll back a consumer by pinning its prior version or retaining explicit 1280px/24px frame and 1200px list tokens. Site rollback uses the preceding verified Vercel deployment; published npm versions are immutable and will not be overwritten.
