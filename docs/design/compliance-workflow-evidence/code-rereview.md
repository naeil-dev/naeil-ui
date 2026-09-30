# Scoped re-review: explicit null layout comparisons

Result: **P2 finding resolved; no findings in the reviewed fix.**

The fix at `skills/frontend-reference-workflow/scripts/browser-check.cjs:405-407` defaults only an omitted/undefined `layoutComparisons` to `[]`. Explicit null now reaches the existing array validator and produces a blocked report. The invalid-configuration regression list at `skills/frontend-reference-workflow/tests/layout-comparison.test.cjs:119` includes null.

Checks independently executed:

- `node --test --test-name-pattern='rejects invalid comparisons' skills/frontend-reference-workflow/tests/layout-comparison.test.cjs`: 1 selected test passed, including all 11 invalid-config mutations. It asserts exit code 2, blocked report, and zero fixture requests.
- `node --test --test-name-pattern='review reproduction' /tmp/compliance-null-comparison.test.cjs`: the original review reproduction now passes; observed CLI exit `2` and report status `blocked`.

Reviewed SHA-256 identities:

- `skills/frontend-reference-workflow/scripts/browser-check.cjs`: `df95d249b2446116486a121de931ab19d027d3afcc58d4842a2189f884ed3f0b`
- `skills/frontend-reference-workflow/tests/layout-comparison.test.cjs`: `dd83d8c7ea1c374b831bbd8680c1e423a2cf9f5fb0013233c22c6a7dd6634509`

Scope: only the previously reported null-defaulting defect and its regression coverage. This is not a renewed review of unrelated files or later changes, visual/accessibility certification, installation or deployment verification. No product/worktree edits, installation, external API use, or delegation performed. The report was written outside the worktree.
