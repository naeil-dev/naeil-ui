# Durable invitation implementation plan

Authority: [design](../specs/2026-10-18-durable-invitation-design.md), parent-assigned local-only implementation scope. Execute inline in this isolated worktree; no commits, pushes, hosted changes or edits to frozen artifacts.

- [x] Write and run failing private JSON config and durable route/restart tests.
- [x] Add the forward SQL004 transaction store, service-only RPCs, phase/CAS/fence/lease/expiry checks and focused pgTAP/concurrency tests in Home under its new OpenSpec change.
- [x] Add bounded AES-GCM store client and explicit server JSON config; preserve secure-file compatibility and reject Vercel memory mode.
- [x] Connect the existing handler with durable claims and acceptance checkpoints; retain all Host/Origin/CSRF, fixed-recipient and typed-denial behavior.
- [x] Add test-first P2 fixes: same-browser explicit fresh resend creates a separate handle while preserving old rows; expiry is rechecked after the awaited verifying checkpoint.
- [x] Add six executed-script regressions for an unavailable create or whole-response/cookie loss: GET retains the fresh envelope for explicit restaging before a separate confirm, including old staged/invalid/uncertain cookies.
- [x] Verify candidate/receipt/acceptance ambiguity, concurrent handlers, stale workers, expiry, resend/cancel and replay with synthetic unit transports and a parent-scheduled real local fixture.
- [x] Run scoped and full site tests, types, scoped lint and an isolated build; record exact results/limits without modifying frozen receipts.
- [x] Obtain final read-only review closing P1/P2; freeze a new artifact bound to 218 mapped source inputs with development sourceRevision, preserving the superseded build.

Review focus: an uncommitted candidate checkpoint must never reverify; a stale worker must not overwrite a newer checkpoint; release must not overwrite an ambiguous checkpoint; receipt recording must be known and persisted before acceptance; a generic upstream401/403 must not destroy a recoverable verified identity. A fresh resend must not revive uncertain proof, stale tabs must not change or confirm the fresh transaction, and a checkpoint response arriving after absolute expiry must cause zero verify calls.

The earlier local build `/private/tmp/naeil-invite-durable-verify-20261018-nhdi07do` predates these P2 corrections and is superseded. Its immutable files are preserved. Freeze a new artifact only after final source review and current actual-harness results.

Final local evidence: [verification](../verification/2026-10-18-durable-invitation-local.md). Parent owns final compiled HTTP/browser checks and overall rollout integration.
