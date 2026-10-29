# Standing rollout — historical notice

The old standing rollout system was retired with owner confirmation on 2026-10-29. The main agent disabled and unloaded its launcher before this repository cleanup. The transition, dispatcher, monitor, generation/source approvals, standing adapters and unused rollout workflow have been removed from the repository.

Use the [local rollout runner](local-runner.md) for the current release-specific plan, approval, verification and transaction rollback commands. Use [release preparation](release-preparation.md) for frozen assets and publication checks.

Original epochs, receipts, failures, operational code copies, plist, STOP and control locks remain preserved. Dated [specifications and plans](../superpowers/) and [evidence](evidence/) describe their recorded revisions; they do not authorize restarting the retired launcher. The retained handoff uses the compatible control lock and a read-only historical state decoder.
