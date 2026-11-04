# Project branch and workspace closeout — 2026-11-04

User authorization: appropriately integrate and finish the remaining project branches, PRs and workspaces. This plan implements that request; it does not reopen the accepted shared-language design or activate deferred invitation delivery.

Baseline: accepted main `7da3d1cdcfa6f27cdf87d1aa561ff4f2784c45c3`, integration branch `integrate/project-closeout-20261104`. Audit and verified backup receipts: `/Users/jaymini/.local/share/naeil-ui-closeout/2026-11-04/` (`preservation.json`, `pre-closeout.bundle`, three `*-audit.md` reports and archive manifests).

## Global Constraints

- Preserve @naeil/ui 0.10.0, all public APIs, current shared-language runtime, `/`, `/ko`, `/ja`, auth/return/save guards, and frozen 0.7.1 source/tag/reference bytes. No package publication or release tag change.
- Preserve protected `outgoing-anaconda`, its untracked October 29 remediation plan, ignored operational evidence, old runner approvals/STOP/locks/runtime pins and all unrelated common-checkout edits. Do not replay historical approvals or run the 0.7.x runner against 0.10.0.
- Invitation integration keeps strict `NAEIL_INVITE_ACCEPT_ENABLED === "true"` and the production ingress hold. No SMTP/DNS/provider/DB/WAF/gate changes or outgoing mail. Hosted invitation activation remains a separate, explicit operation.
- Keep Baby/Home and consumer services outside this integration. A new Site deployment triggered by the authorized main merge must be verified on its exact source/artifact; existing shared-language acceptance is immutable historical evidence.
- Archive only owned, inactive workspaces after verified backups include ignored evidence. Do not archive the active root workspace or discard unique files to make a list look complete.

## Task 1: Integrate final legacy runner

Merge final `feat/local-rollout-runner-20261028` at `6d15cbc376495779896aa428b3154a4a3f07ae7a` into the integration branch, retaining its history. Resolve package.json by preserving current version, exports, dependencies and build, changing only `scripts.rollout` to the local CLI. Preserve current 12 browser shards; accept full checkout history for runner fixtures. Resolve README/release guide with current 0.10.0 release receipts and explicitly historical 0.7.x-only runner scope. Do not restore retired standing execution.

Validate rollout Node tests, Python native-helper tests, account/site verification helpers and source diff/pins. PR26 is superseded by stronger independent catalog expectations; PR27–29 are absorbed/superseded through the final runner. Close them only after the replacement reaches main.

## Task 2: Integrate dormant invitation session delivery

Merge PR35 head `a2bcc3336a7501ea8c8dbfae09896f5f361752ed` with current main behavior, using `invite-audit.md` as the detailed conflict inventory. Keep current locale catalogs, nonce/CSP helper and default-off checks. Deliver every independent Set-Cookie header. Preserve inert GET, browser binding, retry/idempotence and account-switch consent. Port new delivery/switch/signin/finish/switchButton states into all three site catalogs; preserve current locale routing, sender gate and paused script guards.

Update enabled-path fixtures/teardown and gate tests for POST status after re-enabling. Add meaningful coverage for combined locale/cookie/paused behavior. Run serial full Vitest, catalogs, lint/types and compiled production invitation tests with owned fake config. Document completed historical SQL011/H5/drain separately from outstanding SMTP, invitation-specific rate protection and hosted final-source acceptance. No production activation.

## Task 3: Preserve historical homepage/Console work

Selectively import the three October15 Console design/review/plan documents from `35f750357f90fe24ec0ca8c51b8e98b89facd997`, retaining bodies with explicit historical banners. Append only its two unique provenance sections to current frontend-sources. Preserve the seven-file standalone mockup with its provenance and licenses in a verified archive; record the archive locator rather than making it a supported product. Include six ignored hero production-evidence files in the full backup. Do not merge stale product source. Check preserved bytes, relative links and whitespace.

The supplemental audit of all 45 local refs found no additional runtime work. Also preserve the two manual-accessibility preparation/closeout documents and two original Estimate design documents with historical banners, plus the Estimate provenance section. Keep the 309-file header publication/brand study/other historical archive and the 1,137-file untracked auth evidence archive outside maintained source with exact verified indexes. Do not reopen deferred manual accessibility or old Estimate implementation tasks. Update the stale AGENTS release checkpoint to the verified `latest=0.7.2`, `next=0.10.0` record without changing behavioral instructions.

## Task 4: Review, merge and close

Run the combined required package/site checks and independent review. Push one reviewable integration PR with explicit disposition of #26–29 and #35; wait for required checks on its current head, then use the authorized merge. Verify resulting main CI and automatic Site deployment, including three locales, paused invitations, identity and preserved auth. Record exact rollback target before merge. Close only actually superseded old PRs with replacement evidence.

Archive terrific-buffalo after final backup comparison and selective preservation. Retain active outgoing-anaconda with a clear completed/history title and preserved recovery evidence; do not interrupt the root session. Remove only safely merged local refs or explicitly backed-up superseded refs. Recheck open PRs, workspaces, tags, operational evidence and protected files. Record final disposition and any deferred activation requirements in a closeout receipt.

## Progress

- Four already-integrated inactive workspaces archived after full archive hash verification; their local merged refs removed. One obsolete loopback-only Storybook preview was retired after exact process ownership checks.
- Baseline main unit suite: 791 passed, 5 skipped. Audits completed for runner, invitation and homepage history.
- Implementation, combined checks, integration PR and deployment verification pending.
