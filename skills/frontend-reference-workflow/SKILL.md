---
name: frontend-reference-workflow
description: Use when building a new frontend page, when the user dislikes or requests a substantial improvement to its design, or explicitly mentions Refero, awesome-design-md, 21st.dev, Component Gallery, Kinetics, or Impeccable. Skip reference discovery for routine copy, spacing, and bug fixes unless explicitly requested.
---

# Frontend references

Workflow revision: **2026-10-01.1**. At a substantial task boundary, read the current entrypoint and record its path/revision plus SHA-256 (and hashes of references actually read) in task evidence. An installation update does not refresh instructions already read by a running agent; reload relevant references when resuming after an update.

Use real references to resolve a concrete design decision, then verify the rendered result against the project's approved system. Preserve prior authorization and choices.

## Establish the task contract

Read applicable instructions, DESIGN.md, existing tokens/components and the target screen. For substantial work, record a compact contract in the project's existing design/task notes (if none exist, create one concise task note in its established docs location):

- **Scope:** changed screens/states and existing approval; distinguish shared foundations from product composition.
- **Authority:** source path/section or token for each relevant font, color, size, width and motion rule; record approved exceptions. Do not transplant another project's numeric values.
- **Reuse:** actual package/version/imports, or pinned copied source plus adaptations and update responsibility. Do not describe copied CSS as package/component integration. A migration is a separate scope decision, not an automatic prerequisite.
- **Gaps:** unresolved decisions and references needed; existing answers require no new discovery.
- **Acceptance:** affected states, viewport/input modes, expected checks and evidence locations. Include product-relevant wide screens, not just one desktop size.
- **Layout (when changing frame, navigation, widths or columns):** follow [layout.md](references/layout.md); distinguish application-frame invariants from content widths and record comparable routes, content/locale fixtures and width rationale.
- **Carry-forward:** previous findings with their affected scope, current status and evidence needed to close them. A new layout review does not automatically close accessibility findings.

For a new direction, show source URLs/images and a concrete proposal before applying it. Wait only for decisions not already authorized. Durable instruction additions follow the same existing-approval rule.

## Choose references by the gap

| Decision | Route |
|---|---|
| Unsettled visual direction | Read an actual DESIGN file from [Refero](https://styles.refero.design) or [awesome-design-md](https://github.com/VoltAgent/awesome-design-md). Pin source/revision; integrate approved rules without overwriting the established system. |
| Missing component pattern | Announce the gap and intended query/retrieval; use 21st search, then [Component Gallery](https://component.gallery) and relevant original guidance. Reuse existing primitives; inspect license, dependencies and interaction before adopting code. |
| Necessary motion | Read the specific [Kinetics](https://kinetics.colorion.co) example. Preserve the project's motion budget and reduced-motion behavior. |
| Substantial finishing requested or agreed in task scope | Read the installed official `impeccable` skill and relevant polish/distill playbook; perform its inspection and corrections within the approved design. Use bolder only for a requested stronger direction. |

Record **gap → source actually read → adopted/adapted or rejected decision → affected files**. Search metadata is discovery, not inspection of component code. Marketing references are not accessibility evidence. A playbook is executed by following its procedure; reading it or running engine-probe/context alone is not execution. No standalone polish/distill shell verb is implied.

## Use verified tools

Discover available tools first. For 21st, use exposed native MCP tools, or the existing configured launcher through the bundled read-only client described in [tools.md](references/tools.md). Reuse this client instead of writing an ad hoc protocol bridge. Check current usage before retrieval; do not hardcode quota or silently retry auth/payment failures.

Missing required tooling: identify the dependency, prepare concrete setup, and ask to install only when not already authorized. Never imitate an unavailable tool. On unreadable sources, try the authorized browser; if still unreadable, stop that source-dependent step and request pasted content or an accessible alternative. Continue independent work.

Keep secrets in the approved credential store. New accounts, charges and hosted uploads require their applicable authorization. Existing authorized included usage does not require repeated approval.

## Verify and report

For substantial UI work, follow [verification.md](references/verification.md). Use existing project tests and the bundled browser helper where compatible. Measure approved foundations, current-state text contrast, page overflow, nested controls and touch areas. Separately check non-text/state contrast (control boundaries, focus and selected indicators), keyboard/focus, relevant states, long/localized content, motion and visual hierarchy. Read automation's manual-review results. Unit-test success or a polished screenshot does not establish these checks.

Fix in-scope failures and recheck affected behavior. Report unrelated inherited problems without silently expanding scope. Do not change acceptance thresholds to obtain a pass.

Finish with: **changes; reference/tool evidence; checks and tested scope; remaining failures/manual reviews/unverified items**. Distinguish installed, read, searched, retrieved, adopted, executed, skipped and blocked. An automated pass describes only the checks run; unresolved required checks mean verification is incomplete. Keep detailed evidence in project notes, not a lengthy user-facing tool diary.

For layout work, report functionality, shared-design compliance and visual composition separately. Preserve the runnable check/config and reports; identify the final checked revision or hashes and any later edits with their scoped rechecks.
