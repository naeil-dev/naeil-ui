# Rollout automation — historical notice

**Historical 0.7.x scope.** The 0.7.2 acceptance completed on October 28 and standing execution was retired on October 29. This retained tooling supports 0.7.x, contract 1 only. Current 0.10.0 publication and Site/Jev/Estimate acceptance are recorded in [the November 4 receipts](../design/shared-language-2026-11-04/implementation-progress.md); their deployment/recovery is outside this runner. Preserve old approvals, transactions, STOP and locks without replaying them against current services.
The standing worker and earlier Actions/prebuilt rollout path were retired on 2026-10-29. Their workflow, adapters, bot update orchestration and policy/expiry execution paths have been removed. The disabled [policy](policy.json) and [adapter configuration](adapters.json) remain inert historical snapshots; their command strings are not supported entry points.

For historical 0.7.x tooling, see the [local rollout runner](local-runner.md) and [release preparation](release-preparation.md). The runner executes one pinned release with one approved plan; it adds no scheduler. The package/site verification workflow and manually dispatched Docs publication workflow remain separate.

Dated [plans and specifications](../superpowers/) and [evidence](evidence/) retain the original scope and limitations. Operational copies, STOP, locks, artifacts, backups and failed receipts are preserved.
