# Site B/D email hold implementation plan

Contract written before code: [spec](../specs/2026-11-03-site-bd-mail-gates.md). Baseline: #34 `88e0bbe298350b09c64692a01c293e9ecd375775`; #35 excluded.

- [x] Add strict server-only email/invitation opt-ins without changing private JSON parsing.
- [x] Guard email actions and every invitation entry before dependency/state access; preserve first-change/recovery and enabled-path behavior.
- [x] Pass the email boolean from both server pages; add localized paused copy and an inert invitation state in the existing design.
- [x] Add action, UI, strict-config and invitation replay regressions; keep old invitation suites explicitly opted in.
- [ ] Run scoped static checks and full Vitest on host Node only after the main grants the host-wide runner slot and pgrep is clear. Prepare isolated local rendering/HTTP evidence if available; no owner browser/shared fixture.
- [ ] Record source-bound local evidence and a local commit; return deployment-order proposal and remaining gates to the main for independent review. No push/PR/merge/deploy.
