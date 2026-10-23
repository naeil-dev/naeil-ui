# Published UI and standing rollout implementation plan

> **For agentic workers:** Use the existing delegated file ownership below. The owner already requested autonomous implementation and parallel work.

**Goal:** Publish exact UI0.7.1, maintain current documentation, and install verified standing rollout for naeil, Estimate and Jev.

**Architecture:** A trusted local pull dispatcher observes exact Git/Vercel site deployment, then invokes native consumer adapters serially. Shared private browser verification and durable per-release state bind the result to frozen package/reference assets.

**Tech Stack:** Node, Python, pnpm, Playwright, launchd, GitHub Releases, existing Vercel Git integration.

**Spec:** [Standing release design](../specs/2026-10-23-standing-ui-release.md).

## Global constraints

Preserve frozen0.7.1 bytes, original worktrees/bundles, all business/auth state, current/previous releases and recovery evidence. Home/Baby remain excluded. No retired per-app auth, new infrastructure, UI redesign or account merging.

## Review focus

- Replaced release assets or tag: reject before any app mutation.
- Protected route without valid session: fail rather than certify a login page.
- Crash after dispatch/activation: retain uncertain state, never replay blindly.
- Current0.7.1 baseline: verify actual shared-session artifact, never fabricate predecessor.
- Site package source differs from current app source: preserve SSO and compare actual public runtime closure.

## Tasks and ownership

- [ ] Docs agent: maintained guides, guide links/test and manual Pages workflow. Run focused tests/lint; later verify actual hosted Docs. Main reviews before merge.
- [ ] Dispatcher agent: `scripts/rollout/standing-dispatcher.mjs`, optional `standing-config.mjs`/`standing-github.mjs`, `naeil-standing-observer.mjs` and tests. Pin private config and executable trust; test asset drift, ordering, lock, STOP, uncertain state and receipt validation.
- [ ] Jev agent: new `scripts/rollout/jev-*` adapter/native modules and tests. Reuse version-independent candidate and lifecycle boundaries; isolate clone; test idle/ownership/preservation/rollback and adoption.
- [ ] Main/Estimate owner: isolated filtered clone `ops/code-activation.mts`, current shared-session regression tests and standing wrapper. Preserve original private remote source mapping and business-lock/storage contracts.
- [ ] Main: `scripts/verify-ui-production.mjs`, `scripts/rollout/standing-verification.mjs`, private session provider and tests. Add explicit context factory, account masking/reference, exact request/result bindings and refresh persistence; test missing/revoked session and origin scoping.
- [ ] Main: site compiled source identity regression and actual emitted/deployed verification; current selected route inventory and auth boundaries; runtime/package closure comparison.
- [ ] Main: npm authentication, exact archive publication, fresh registry React/Next consumption, GitHub tag/release/assets; separate current Docs deployment.
- [ ] Main: review all diffs, run appropriate aggregate checks and required CI; install pinned worker, private policy/config, verified adoption baselines; exercise safe pipeline/STOP/recovery and inspect loaded launchd state.
- [ ] Main: publish only sanitized completion receipts, update maintained rollout guidance and local operations result. Clearly retain any unexercised future-release limitation.

## Shared native interface

Adapter input/output paths are `NAEIL_ROLLOUT_INPUT`/`NAEIL_ROLLOUT_OUTPUT`, private JSON files. Input carries `schemaVersion:1`, release, reviewed service/policy, `idempotencyKey`, `attemptId`, and `mode:standing|adopt`. No release controls commands. Output echoes binding fields and returns `production-verified`, `deferred` with `mutationAttempted:false`, `gate-failed`, or `activation-pending` with exact artifact and production verification.

The configured private verifier executable uses `NAEIL_VERIFY_INPUT`/`NAEIL_VERIFY_OUTPUT`. Request extends the adapter envelope with phase, artifact, expectedIdentity, referencePath and outputDirectory. Successful response echoes release/service/idempotency/attempt/phase plus `passed:true`, identity, referenceSha256, checkedAt and routes. No session material enters either envelope.

Tests for critical auth/lifecycle behavior start with an observed failing case. Main independently reviews diffs and reruns applicable checks before integration. Production operations begin only with concrete, digest-bound configuration and retained recovery artifact; the owner's authorization is already supplied.
