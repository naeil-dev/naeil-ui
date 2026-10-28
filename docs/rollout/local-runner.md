# Local rollout runner

Implementation and acceptance are in progress. The enabled old launcher remains stopped; this page does not activate or retire it. See [the owner-approved design](../superpowers/specs/2026-10-28-local-rollout-runner.md).

The runner handles one pinned 0.7.x release on the owner Mac. Its private config names a new release state directory, a machine-wide lock, STOP, the approval file, and a final plan. The plan lists naeil, Estimate, Jev in order, each with `verify-only` or `deploy`. Completed imported services stay `verify-only`. Consumer build/test/E2E candidates and their exact source, lockfile, archive, tool and artifact bytes are checked independently of runner version.

Preparation produces an immutable final plan with each deployment's candidate, previous artifact and consumer-input digest. Generate its approval template with `node scripts/rollout/local-cli.mjs approval-template CONFIG`. Install that exact template as the approval file only after the owner approves the concrete release plan. It has no expiry. Keep the owner decision in the work record; no second approval chain is needed. STOP or removing the file prevents the next forward stage.

Commands accept a private config path:

```sh
node scripts/rollout/local-cli.mjs prepare CONFIG
node scripts/rollout/local-cli.mjs verify CONFIG naeil
node scripts/rollout/local-cli.mjs verify CONFIG estimate
node scripts/rollout/local-cli.mjs run CONFIG
node scripts/rollout/local-cli.mjs status CONFIG
node scripts/rollout/local-cli.mjs rollback CONFIG TRANSACTION_ID
```

`prepare` and `verify` need no deployment approval; they still respect STOP. `run` cannot select a later service and skip its predecessors. Production verification covers public and authenticated routes, account menus and frozen render expectations. Credentials remain inside the verifier child; output contains only bounded diagnostic fields and receipts.

Network/403/rate-limit failures retry with bounded backoff and can resume safely. Identity, digest and UI mismatches remain `held`; explicitly recheck corrected inputs with `--retry-held`. Authentication requiring renewal is reported separately. A native call with no conclusive result becomes `manual-recovery`; it is never automatically repeated. Known failed activation with proven recovery retains its original failure receipt.

Rollback ignores STOP and release approval, using only the transaction's recorded predecessor and retained native helper. Unknown or surviving workers retain the machine lock. `recover-lock CONFIG OWNER_ID` refuses a live owner, child or process group; use it only after reviewing the recorded uncertainty and with any required owner authorization for operational lock changes, then explicitly request the transaction rollback. Do not erase locks or edit state to force a retry.

For the 0.7.2 acceptance, preserve all original epochs, archives and failures. Exclude the old writer with its compatible control lock and check worker absence before final import/acceptance. The release approval includes that concrete exclusion. After all three services are production-verified, obtain the separate owner confirmation to disable/bootout the old launcher and retire its source paths. No naeil/Estimate redeployment, consumer push, package publication or PR merge is part of this acceptance.

The acceptance plan's `handoff` pins the original STOP, stable control pointer/journal/config references, and exact old automation/consumer worker directories. Old poll timestamps do not enter the approval digest. `run` acquires the compatible old control lock, checks workers, then imports exact service facts and records the old state digest in the new directory. It retains that exclusion lock on success or failure until retirement. Worker inspection uses executable/cwd metadata, never process arguments or environment contents. The lock protocol covers the configured launcher path; independently relocated uncooperative workers cannot be identified by directory metadata alone.

The new runner has its own STOP path. Keep the original STOP while acceptance runs; create the new STOP or remove the new approval to cancel forward work. Explicit rollback bypasses the acceptance wrapper and uses the retained transaction. After an interrupted deploy or rollback and explicit dead-worker lock recovery, exact predecessor identity completes reconciliation without stopping the service; exact candidate identity permits only the same transaction rollback using a fresh journal-bound inspection receipt. Mixed identity or a live worker remains manual recovery. Safe rollback deferrals can be retried explicitly; each native retry preserves earlier journals and backup attempts.
