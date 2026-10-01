# Documentation

## Maintained public guides

- [Design authority](../DESIGN.md): approved visual rules and shared versus site scope.
- [11 component usage guides](components/README.md): exact wrapper APIs, states, keyboard and consumer responsibilities; matching Storybook Docs and runnable Usage examples.
- [Current support and manual acceptance](design/public-ui-support.md), [Stage 3 verification](design/public-ui-stage3-verification.md) and [preview artifact instructions](package-release.md#storybook-preview-artifact).
- [UI consumer and migration guide](design/v2-migration.md): imports, styles, fonts, density, layout, compatibility.
- [Optional frontend-reference workflow setup](design/frontend-tooling.md): tools, keys, no-key fallback, and helper checks.
- [Brand/example site setup](site-development.md): Next.js and separate Supabase auth configuration.
- [Contributing](../CONTRIBUTING.md), [security](../SECURITY.md), [licenses and provenance](../THIRD_PARTY_NOTICES.md).

## Dated specifications and evidence

[Shared UI v2 specification](superpowers/specs/2026-09-29-shared-ui-v2-design.md) records the implementation scope. [UI v2 verification](design/v2-verification.md) records the 2026-09-29 checks. [Frontend sources](design/frontend-sources.md) records actual reference/tool usage by date.

[Workflow verification](design/frontend-workflow-v2-verification.md), [composition follow-up](design/common-design-compliance-verification.md), [dual review](design/frontend-v2-dual-review.md), and [Low follow-up](design/frontend-v2-low-followup.md) are historical evidence, not current setup instructions or release certification. Opus/Sol approval covers `2026-09-30.2`; `2026-10-01.1` had direct validation without completed independent approval. Current public setup/portability changes have [their own validation scope](design/public-onboarding-validation.md).

The HTML studies in `design/v2-*.html`, older root-level brainstorm/spec/plan/task documents, and `superpowers/plans/` are implementation history. Older palette, typography, Next.js, deployment, and task status statements are retained as past proposals/results; current authority is DESIGN.md, the consumer guide, and the actual manifest/source.

Evidence directories preserve dated logs, source hashes, test counts and reviewer findings. Public hygiene edits anonymize personal paths/session IDs; recorded hashes describe the original reviewed files, not sanitized document bytes or today's source. Scratch artifact names indicate historical external evidence and are not runnable links; only checked-in artifacts are available here. Generalized [workflow lessons](design/relaydock-followup-lessons.md) retain relevant lessons without another product's private audit details.
