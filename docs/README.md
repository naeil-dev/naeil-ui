# Documentation

**0.7.1 published and registry-verified — 2026-10-23.** Current registry baseline: 0.7.1. The first published 0.7.x release includes canonical `NaeilFooter`, `NaeilHeaderAccountControl` and `/release` identity; 0.7.0 remains unpublished. Fresh React/Next registry consumers matched all 139 frozen files and passed their checks. Hosted Docs and service rollout require separate receipts. Current execution uses the [local rollout runner](rollout/local-runner.md). [Release policy and identities](package-release.md#publication-and-deployment) distinguish the frozen package source/tag from maintained guides, hosted Docs and service rollout receipts.

## Maintained public guides

- [Design authority](../DESIGN.md): approved visual rules and shared versus site scope.
- [Component usage guides](components/README.md): 13 primitives, generic navigation/footer and canonical service compositions, with exact APIs, states, keyboard and consumer responsibilities.
- [Application layout](components/application-layout.md), [NaeilHeader and account control](components/naeil-header.md), [NaeilFooter](components/naeil-footer.md): owned-service composition, guards and the shared frame.
- [Current support and manual acceptance](design/public-ui-support.md), [Stage 3 verification](design/public-ui-stage3-verification.md), [Stage 4 extension verification](design/public-ui-stage4-verification.md) and [demand decision](design/component-demand.md) and [preview artifact instructions](package-release.md#storybook-preview-artifact).
- [UI consumer and migration guide](design/v2-migration.md): imports, styles, fonts, density, layout, compatibility.
- [0.4.0 publication and brand 1.1.1](design/naeil-brand-0.4.0-publication.md): exact source/archive, npm, GitHub Release, hosted Docs and production results.
- [Optional frontend-reference workflow setup](design/frontend-tooling.md): tools, keys, no-key fallback, and helper checks.
- [Brand/example site setup](site-development.md): Next.js and separate Supabase auth configuration.
- [Contributing](../CONTRIBUTING.md), [security](../SECURITY.md), [licenses and provenance](../THIRD_PARTY_NOTICES.md).

Current Storybook source defines 17 Docs pages: 15 UI families plus Brand / Logo and NaeilHeader. Canonical footer full/compact and account-state examples live in the existing NaeilHeader/SiteFooter stories. [Hosted Docs](https://naeil-dev.github.io/naeil-ui/) have recorded [0.5.0 verification](https://github.com/naeil-dev/naeil-ui/releases/download/v0.5.0/hosted-docs-verification.json); current source is not evidence of a later deployment. The [0.4.0 release](https://github.com/naeil-dev/naeil-ui/releases/tag/v0.4.0) retains its registry/consumer, hosted Docs and production receipts and [independent brand kit](https://github.com/naeil-dev/naeil-ui/releases/download/v0.4.0/naeil-brand-1.1.1.zip). The approved brand is live on [naeil.dev](https://naeil.dev/). The downloadable Storybook artifact can also be served locally. Native/manual acceptance retains its documented limits; [service adoption and rollout evidence](rollout/inventory.md) has a separate scope.

Guides bundled in each immutable npm archive are its release-preparation snapshot. Maintained GitHub guides record subsequent publication status; source documentation updates do not alter the archive, tag or release asset. Hosted Docs reflect their separately deployed source, recorded in the Pages run. The [0.3.0 release](https://github.com/naeil-dev/naeil-ui/releases/tag/v0.3.0) and earlier verification reports remain dated history.

## Dated specifications and evidence

[Native environment and remaining manual validation — 2026-10-02](design/public-ui-release-validation.md) records actual SafariDriver, AppleEvents/Accessibility and local Firefox blockers at source `79d9382f62166e99eeb26c785e690bf90cbb5379`. No native component pass was obtained; all native/manual acceptance rows remain open. These capability probes are separate from automated Playwright WebKit evidence and human certification.

[Shared UI v2 specification](superpowers/specs/2026-09-29-shared-ui-v2-design.md) records the implementation scope. [UI v2 verification](design/v2-verification.md) records the 2026-09-29 checks. [Frontend sources](design/frontend-sources.md) records actual reference/tool usage by date.

[Workflow verification](design/frontend-workflow-v2-verification.md), [composition follow-up](design/common-design-compliance-verification.md), [dual review](design/frontend-v2-dual-review.md), and [Low follow-up](design/frontend-v2-low-followup.md) are historical evidence, not current setup instructions or release certification. Opus/Sol approval covers `2026-09-30.2`; `2026-10-01.1` had direct validation without completed independent approval. Current public setup/portability changes have [their own validation scope](design/public-onboarding-validation.md).

The HTML studies in `design/v2-*.html`, older root-level brainstorm/spec/plan/task documents, and `superpowers/plans/` are implementation history. Older palette, typography, Next.js, deployment, and task status statements are retained as past proposals/results; current authority is DESIGN.md, the consumer guide, and the actual manifest/source.

Evidence directories preserve dated logs, source hashes, test counts and reviewer findings. Public hygiene edits anonymize personal paths/session IDs; recorded hashes describe the original reviewed files, not sanitized document bytes or today's source. Scratch artifact names indicate historical external evidence and are not runnable links; only checked-in artifacts are available here. Generalized [workflow lessons](design/relaydock-followup-lessons.md) retain relevant lessons without another product's private audit details.
