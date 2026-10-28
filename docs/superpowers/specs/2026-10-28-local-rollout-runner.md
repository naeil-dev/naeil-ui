# Single-owner local rollout runner

Owner decision: 2026-10-28. Replaces the generation/rebind design; existing operational copies and evidence remain read-only. Scope is @naeil/ui 0.7.x, naeil verification and Estimate/Jev deployment on one owner Mac. 0.8.0 is reported only.

## Contract and authority

One immutable release plan identifies the published release/tag/source, archive and reference digests, ordered services (`naeil`, `estimate`, `jev`), current artifacts and exact consumer inputs. One owner approval file binds its digest, release identity, archive digest and target services; it has no expiry. STOP or deletion of approval cancels forward work at stage boundaries. A separate new STOP path keeps the old launcher stopped during acceptance. No implicit approval is synthesized from historical policy/migration records.

Rollback is independent of STOP, approval presence, release discovery and verifier availability. It can restore only the previous artifact durably recorded for that transaction. Keep native process ownership checks, SQLite backup/restore verification and code/data separation. Never automatically repeat a native invocation whose outcome is unknown.

## Execution and persistence

Use an explicit local CLI: prepare/discover, status, run, verify, rollback. Discovery proposes releases; it never approves them. Run sequentially: release integrity → naeil verify → Estimate prepare/test/deploy/verify → Jev prepare/test/deploy/verify. Imported completed services are verify-only and cannot enter deploy. Verify actual authenticated and anonymous production with the existing verifier/session lock. Retain isolated consumer preflight, source/lockfile/build/test/E2E/artifact checks. Consumer validity is bound to actual input bytes and tools, not runner generation.

One exclusive machine lock covers all releases and commands, including rollback. Write a small per-release `state.json` atomically (fsync + rename) and append immutable attempt JSON receipts. Persist native intent including previous/candidate artifact before invoking native code. On restart, incomplete verification/preparation can retry; unresolved deploy/rollback intent becomes `manual-recovery`. A dead lock is never stolen while its worker/child may still run. No generation, rebind, per-action closure fence, schema2 object store or staged approval chain.

Failures record `{stage, reasonCode, status, timeout, retryable}` without secrets or raw process/DOM output. Network/HTTP 403/408/429/5xx verification failures use bounded backoff and resume at the same safe stage. Identity/digest/UI mismatches become `held`; corrected inputs can be rechecked explicitly, never silently redeployed. Authentication expiry is `auth-required`; ambiguous session rotation remains manual recovery. Known deployment followed by failed verification retains rollback capability; unknown native result is never retried automatically. STOP during an in-flight native operation permits completion/receipt or transaction rollback, but prevents subsequent forward work.

## Interfaces and implementation ownership

- Core: `scripts/rollout/local-runner.mjs`, `local-runtime.mjs` and their tests. Config holds `stateDirectory`, `lockFile`, `stopFile`, `approvalFile`, `plan` (release + services). Dependency interface: `validateRelease`, `prepare`, `inspect`, `deploy`, `verify`, `rollback`; every callback receives `{plan, service, transaction, directory}`. Native mutations belong only to `deploy`/`rollback`. CLI production wiring is integrated by main.
- Consumers: `local-consumers.mjs` and tests; simplify existing consumer adapters/native protocol as needed. Reuse isolated preflight and build checks. Agree exact request/response shapes with core before crossing file ownership. Native helper keeps legacy receipts readable but gains no legacy authority bypass.
- Verification/integrity: main initially owns production verifier integration, release validation and old-state import; Astra reviews the design and each completed stage. Shared file edits are handed off explicitly.

## Acceptance and retirement

Synthetic tests cover 403→retry, STOP and revoked approval, process interruption, rollback without approval, duplicate execution, wrong archive/plan digest, auth expiry and ambiguous native outcome. Main runs tests and eslint. Import 0.7.2 identities/receipts into a new directory, retaining old epoch unchanged; independently verify naeil/Estimate without deployment. Prepare the exact Jev candidate and rollback target before requesting the one owner approval. Run Jev and verify all three with the new runner. Only after owner confirmation disable/bootout the old launcher and remove retired source paths (transition, old state/dispatcher/monitor and unused Actions deployment); preserve deployed copies, original operational records and failed attempts. No merge, consumer push, npm/release/tag or notifications.
