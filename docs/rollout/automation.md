# Rollout automation — historical notice

The standing worker and earlier Actions/prebuilt rollout path were retired on 2026-10-29. Their workflow, adapters, bot update orchestration and policy/expiry execution paths have been removed. The disabled [policy](policy.json) and [adapter configuration](adapters.json) remain inert historical snapshots; their command strings are not supported entry points.

Use the [local rollout runner](local-runner.md) and [release preparation](release-preparation.md). The runner executes one pinned release with one approved plan; it adds no scheduler. The package/site verification workflow and manually dispatched Docs publication workflow remain separate.

Dated [plans and specifications](../superpowers/) and [evidence](evidence/) retain the original scope and limitations. Operational copies, STOP, locks, artifacts, backups and failed receipts are preserved.
