# Account and language integration plan

Authority: [integration contract](../specs/2026-10-17-console-account-language-integration.md) and [full handoff](../../rollout/account-language-handoff-2026-10-17.md).

- [x] Read handoff; verify seven original Git states, frozen archive/reference hashes, active editor ownership and completed site merge CI.
- [x] Create separate latest-UI worktrees for site, Estimate and Jev. Delegate disjoint app changes and central independent review under handoff authorization.
- [ ] Site: selectively integrate invitation confirmation/recovery, preserve latest common header, repair verified auth/return-location defects and run current checks.
- [x] Estimate: reconcile central session/access/recovery into latest shared chrome, expose verified identity, preserve Japanese-only UI and every save/data guard; run current app checks.
- [x] Jev: transfer auth provenance from independent snapshot, expose identity through common account control, verify logout/stream/draft and per-service language/history; run current app checks.
- [ ] Central: independent source review, fresh owned local Auth/DB verification, invitation and per-service grant matrix; distinguish known unrelated Home failures.
- [ ] Root: inspect actual diffs, tests, screenshots, current artifacts and identities; resolve integration findings and record evidence/limits.
- [ ] Prepare exact candidate artifacts, deployment order, initial allow-table template, provider/callback/signup/SMTP gates and fail-closed recovery. No automatic production activation.
- [ ] Update status/result documents and report completed implementation/verification versus blocked external/operational checks, with only necessary remaining user decisions.
