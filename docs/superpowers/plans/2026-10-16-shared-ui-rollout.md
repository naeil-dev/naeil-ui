# Shared UI rollout implementation

Spec: [approved direction and contracts](../specs/2026-10-16-shared-ui-rollout.md).

1. [x] Reconcile supplied worktrees, remote main and allowed production manifest metadata; isolate changes on new branches.
2. [ ] Record discovered services/routes with actual artifact/source evidence and unresolved coverage.
3. [ ] Migrate estimate to exact 0.6.0, shared frame and independent geometry expectations; preserve business/save/auth behavior.
4. [ ] Implement canonical footer/guard/version contract, site adoption and packed candidate 0.7.0.
5. [ ] Integrate candidate in estimate; migrate additional apps only after production-source identity is established.
6. [ ] Implement pinned release fan-out, fail-closed states, policy gate, artifact identity and recovery contracts.
7. [ ] Freeze independent reference and compare actual rendered chrome; test wrong consumer override, stale identity and partial rollout failure.
8. [ ] Run shared/package/Storybook/browser and consumer checks, inspect actual diffs/artifacts/screens, obtain separate review and fix findings.
9. [ ] Record exact candidate, per-app production state, remaining blockers and concrete publication/activation proposal. External release requires its own decision; standing activation remains disabled.

Ownership: main agent owns shared contract, integration, reference checks and final acceptance. GPT-6.1-Sol/high workers own estimate implementation, read-only operational inventory, and rollout automation in separate file scopes. Implementation and final review are separated. No agent is authorized to mutate production or user data during preparation.

Verification results and artifact identities will be recorded in `docs/rollout/verification.md`; do not turn planned checks into passes. Completed 0.6.0 release receipts remain at their existing GitHub Release and dated docs.
