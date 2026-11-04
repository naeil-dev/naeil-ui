# Standing rollout — historical notice

**Historical 0.7.x scope.** The 0.7.2 acceptance completed on October 28 and standing execution was retired on October 29. This retained tooling supports 0.7.x, contract 1 only. Current 0.10.0 publication and Site/Jev/Estimate acceptance are recorded in [the November 4 receipts](../design/shared-language-2026-11-04/implementation-progress.md); their deployment/recovery is outside this runner. Preserve old approvals, transactions, STOP and locks without replaying them against current services.
The old standing rollout system was retired with owner confirmation on 2026-10-29. The main agent disabled and unloaded its launcher before this repository cleanup. The transition, dispatcher, monitor, generation/source approvals, standing adapters and unused rollout workflow have been removed from the repository.

Use the [local rollout runner](local-runner.md) for historical 0.7.x release-specific plans, approval, verification and transaction rollback commands. Use [release preparation](release-preparation.md) for frozen assets and publication checks.

Original epochs, receipts, failures, operational code copies, plist, STOP and control locks remain preserved. Dated [specifications and plans](../superpowers/) and [evidence](evidence/) describe their recorded revisions; they do not authorize restarting the retired launcher. The retained handoff uses the compatible control lock and a read-only historical state decoder.
