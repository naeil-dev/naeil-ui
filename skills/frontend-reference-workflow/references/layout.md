# Application layout contract

Use for changes to shared navigation, outer frames, content widths or responsive columns. Keep it in the existing task note; this is not a new approval stage or a universal shell component.

Before choosing a correction, compare the affected routes with representative content. Separate the observed symptom from a proposed remedy: “navigation moves between routes” establishes an invariant to restore, not whether every page should become wider or narrower. Reassess a recommendation against measured space and tasks when new evidence contradicts it.

Record these fields:

| Field | Required content |
|---|---|
| Frame | Which routes share navigation anchors/gutters; relevant element selectors; intentional exceptions |
| Content | Purpose-specific widths from project authority; actual available region width; product-specific cap/fluid decision and reason |
| Responsive layout | How internal columns respond to their available width; local table scroll/wrapping behavior |
| Cases | Same viewport, input mode, theme and language for cross-route comparison; sparse/dense and long/localized fixtures; affected loading/error states |
| Evidence | Before/after screenshots actually inspected together; coordinate measurements; functional, shared-rule and composition verdicts |

A shared Header import is not evidence of invariant geometry: parent constraints, route CSS and variable status text can move it. Keep navigation independent of changing inventory/summary counts. Pick frame width from actual tasks and information density. Neither “dashboard” nor “ultrawide” mandates fluid width. Preserve narrow forms within the frame; do not copy another product's numeric cap into shared tokens.

Check column behavior at both constrained and wide available widths. A capped main region inside a wide viewport may still trigger inappropriate viewport breakpoints; use container queries or an equivalent layout that follows the actual region. Inspect sparse records as well as long, dense and localized content. Page overflow passing does not establish readable labels or sensible space use.

The browser helper's optional `layoutComparisons` measures explicit landmarks across cases; see [verification.md](verification.md#cross-route-layout-comparison). Equivalent project measurements are valid. Initial-page comparisons do not prove client-side route transitions, scroll restoration, dynamic loading or browser zoom. Check those in the existing product test flow when affected.

Include short/tall content when scrollbar appearance can change centered anchors. The CLI leaves native scrollbars enabled and records their measured width; project-owned browsers must verify their own launch settings. Inspect actual font loading separately from CSS font-family declarations.

## Review and closure

Give reviewers the task/authority, intended frame invariants, exact routes/states and current artifacts. Ask for actual composition and cross-route inspection when layout changed; code review alone does not establish it. Preserve scripts/configs with reports so the check can be reproduced.

Carry prior issues in the existing ledger with stable identifiers:

| Finding | Affected scope | Previous evidence | Current disposition + evidence |
|---|---|---|---|
| Existing issue ID | Screen/state | Prior measurement, not presumed current | fixed + current recheck; open; or out-of-scope + reason and follow-up |

Keep required unresolved items visible. Separate functional checks, shared-rule compliance (including contrast, interaction semantics and hit areas), and visual composition. Record the final checked files/revision and bounded rechecks after later edits; an earlier review does not cover future modifications.
