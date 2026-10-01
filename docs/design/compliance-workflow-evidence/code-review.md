# Compliance workflow code review

> Archived evidence: personal paths/session IDs anonymized; original hashes/results retain dated scope. External scratch artifacts are unavailable here and were not rerun.

Reviewed current uncommitted changes against HEAD `00bf90b4e8be836f711a7ddc46a0096fdc66c263`, including untracked layout reference and tests. Read-only review; no worktree edits, installation, external APIs, RelayDock changes or subagents.

## Finding

**P2 — Reject explicit null instead of silently disabling comparisons**  
`skills/frontend-reference-workflow/scripts/browser-check.cjs:405`

`const comparisons = config.layoutComparisons ?? []` normalizes an explicitly invalid `null` to an empty array before `validateComparisons` can reject it. A malformed/generated config therefore returns an overall success without running the intended cross-route checks, contrary to the requirement that invalid configurations cannot pass. Omission can remain optional, but a present non-array should be rejected.

Concrete reproduction: use the new layout fixture with settings on `/shifted` (352px navigation shift), then set `config.layoutComparisons = null`. Run the normal CLI against the fixture. Actual output: exit code `0`, top-level status `automated-checks-passed`, `layoutComparisons: []`. Expected: fatal invalid configuration (`blocked`, exit `2`) before navigation. Repro saved at `<historical-scratch>/compliance-null-comparison.test.cjs`; command: `node --test --test-name-pattern='review reproduction' <historical-scratch>/compliance-null-comparison.test.cjs`. Its expected-block assertion fails with `0 !== 2`.

Suggested correction: default only when the property is undefined, pass explicit null through to the array validator, and include null among invalid-configuration regression cases.

## Verification and assessment

- `node --test skills/frontend-reference-workflow/tests/*.test.cjs`: **16 passed, 0 failed**. This includes existing auditPage behavior and the five new comparison tests.
- New comparison behavior measures configured rectangle properties, uses max-minus-min spread, rejects unknown/distinctness/property/tolerance and mode errors, blocks unequal document language and unavailable pages, catches missing/ambiguous landmarks, and integrates comparison statuses in exit code and report.
- Exact checker-source SHA is recorded in successful and blocked reports.
- Documentation keeps the application frame separate from content widths, avoids a shared RelayDock 1600px requirement, preserves unresolved findings, and limits automated-pass claims. No numeric token or product-code change appears in the diff.
- No other actionable correctness findings established within this review.

## Reviewed source identity

- Browser checker workflow revision: `2026-09-30`.
- `skills/frontend-reference-workflow/scripts/browser-check.cjs`: SHA-256 `da368c8a93655ca05c9e6021eebb96eaf6d733e5c9564ce5d5dd8998fb69536f`.
- `skills/frontend-reference-workflow/tests/layout-comparison.test.cjs`: SHA-256 `46915df985d9c6fee882bf9030c9c304773439226b761313db007aa94eea4280`.
- `skills/frontend-reference-workflow/references/layout.md`: SHA-256 `906aaa7dd587b6c2c241ef1ff2d87dbba03e8728f24e3aa658e419755e8632b4`.

## Declined-to-judge scope

This code/local-fixture review does not certify visual composition, accessibility, optimal frame widths, live RelayDock behavior, class-driven theme activation, translation correctness, package/Storybook behavior, installation, publishing, deployment, or historical source accuracy in the follow-up lessons report. No product code or tokens changed, so package/UI checks were not rerun. The not-yet-written deployment report was not judged. Initial page geometry cannot establish navigation transitions or dynamic-state stability; the changed documentation explicitly retains those limitations.
