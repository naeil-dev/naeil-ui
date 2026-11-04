> **Historical record preserved on 2026-11-04.** Original body below is unchanged from `5594d7db2e6afde068a1ebfbab14bb8d48ffb427`. This is a dated design/verification record, not an active execution plan or current deployment status. See the [project closeout index](../../design/project-closeout-2026-11-04.md) for disposition and current boundaries.

# Manual accessibility validation plan — 2026-10-03

> **For agentic workers:** Execute the scoped tasks below with a separate GPT-6.1 Sol executor and an independent reviewer. Root owns orchestration, source/artifact identity and acceptance. User requested planning **and execution**; no additional plan approval is required.

**Goal:** Collect real native/human accessibility observations for the published UI without extending the work into product adoption or UI redesign.

**Architecture:** Freeze the published 0.3.0 runtime and the latest deployed 13-family Storybook. Separate human-observed results, tool-assisted exploration, capability diagnostics and unrun platform checks. System permissions, assistive-technology settings and physical devices require an operator; absence of access leaves checks open.

**Tech stack:** Published Storybook, native macOS Safari/VoiceOver, native desktop zoom, Windows/NVDA/high contrast and physical iOS/Android where actually available.

**Spec:** [Current support/manual matrix](../../design/public-ui-support.md) and [prior native capability report](../../design/public-ui-release-validation.md).

## Constraints and review focus

- Source baseline: main `0b00591631d15a2fcbac8cf1d9a0a05629ab64b4`; deployed documentation source `3f446120ba5dcd6fba57218fce4e6b8a3f3a1b16`, same tree. npm 0.3.0/tag/archive remain unchanged.
- Preserve unrelated dirty files in the original main checkout. Use the already isolated publication worktree, branch `chore/manual-a11y-acceptance`.
- Scope is validation and its documentation. No runtime/API/style/token/dependency changes, product adoption, reinstall, blind permission retries or new accounts/costs.
- Preserve user tabs, global zoom/theme/keyboard/VoiceOver preferences. Permission prompts and settings changes must be explicit operator actions. Stop only owned servers/driver sessions/windows.
- AX snapshots, automated Safari/WebKit/axe tests, CSS scaling and mobile emulation do not count as human listening, native page zoom, Windows high contrast or physical-device acceptance.
- Retain prior axe incomplete IDs until the specific affected state is actually assessed. Record examples/consumer responsibilities separately from library defects.

## Task 1 — freeze and prepare (root)

- [x] Read current support, native report and the approved design.
- [x] Confirm latest remote main and clean isolated checkout; create the scoped branch.
- [x] Recheck local OS/browser and nonprompting AX/process state. macOS 27.0.1/Safari 27.0.1; AX trust false; Safari and VoiceOver absent at initial probe. These are capability facts, not accessibility results.
- [x] Ask the operator about Safari automation/VoiceOver participation and available Windows/mobile devices; dependent native/human checks await their response.
- [x] Bind observation targets to the actual 838-file deployed artifact and source. Fresh hosted index/iframe/manager-entry hashes match the retained deployed manifest; no rebuild was performed.

## Task 2 — scenario/runbook and bounded native execution (Sol executor)

**Ownership:** Create `docs/design/public-ui-manual-accessibility-2026-10-03.md`; add only its navigation link to `docs/design/public-ui-support.md`. Private scratch evidence stays outside Git. Root owns this plan. No other repository files may be edited.

- [x] Trace real standalone Usage/Workspace controls and provide exact links, actions, expected results and evidence fields for all 13 families. The runbook covers 16 actual hosted destinations and 22 independently open family/composition/platform records.
- [x] Prioritize keyboard/focus and modal nesting, form errors/labels, selection states, toast announcements, native 200%/400% reflow and long-language text. Plan light/dark and density observations separately; no combination has passed in this run.
- [x] Obtain one bounded actual Safari session capability result. Driver readiness returned HTTP 200; the single session request timed out after 20 seconds without a session ID. The owned driver was stopped; Safari/VoiceOver were absent in before/after process probes. This new timeout does not reproduce or resolve the historical remote-automation error, and closes no component check.
- [ ] If the operator enables the prerequisites, run native browser exploration with visible evidence; distinguish WebDriver actions from human key use. Human VoiceOver announcements require actual operator observations/captions, not guessed speech.
- [ ] Record available Windows/NVDA/high contrast and physical iOS/Android checks only when those devices are present and observed. Otherwise leave them unrun with actionable steps.
- [x] Give each row a status: observed pass, reproduced finding, blocked, not run, or supplementary tool-assisted result. The diagnostic records identify method/date/observed evidence; every human record explicitly remains not run or blocked. Installed tools and successful launches close no component row.

## Task 3 — direct integration and independent scoped review (root + new reviewer)

- [x] Root checks the exact diff, all links, source/artifact hashes and every pass claim against evidence. All 16 hosted IDs and 13 report-relative links resolve; the 838-file artifact archive hash matches the retained deployment receipt. No screenshots or heard speech were produced by this capability-only attempt.
- [x] Freeze the docs and obtain an independent read-only scoped review. Preparation at `39aa68f67ec66ece6a415e34c92b400f452130c0` received no actionable findings. The review independently matched three document hashes, all 838 deployed files, 66 unchanged runtime/configuration files, route/import targets and preserved package identities. It reused the bounded capability evidence and performed no human/browser/AT checks or broad test/build repeat.
- [x] Preserve unresolved manual/platform rows. No new component defect was observed; all 22 human records remain open. If a real defect is found later, document its impact and reproducible state; implementation requires a separate scoped decision.
- [x] Update this ledger and report what was actually completed and the precise operator/device blocker for remaining checks. No manual acceptance or remote publication is claimed. This status append is orchestration prose after the reviewed preparation freeze, not a new accessibility execution or a claim that a later source was independently reviewed.

## Current outcome

The runbook and bounded capability/delivery preparation are complete and independently reviewed at the exact freeze above. Native/human tests have not passed: operator participation and device availability questions remain pending. Root separately verified 66 unchanged runtime/style/token/config/test/dependency files and preservation of the 11 unrelated original dirty files. npm 0.3.0 archive bytes remain unchanged. Execution resumes against the same published runtime when the operator/device prerequisites are available; documentation review does not close these human acceptance rows. Human-operated Safari does not require WebDriver; remote automation is only needed for agent-controlled Safari exploration. Heard VoiceOver output, native zoom observations and actual device results still require the operator.

Root also inspected the retained 94 automatic axe attachments solely to prepare manual review. Their `bypass`, `aria-hidden-focus`, `aria-valid-attr-value` and `color-contrast` incomplete rules remain unresolved. The private inventory preserves explicit state labels or original attachment names and affected targets for the next actual observation; no new axe scan or contrast/keyboard pass was inferred.

## User scope closeout — 2026-10-03

After the preparation result and remaining human/platform prerequisites were explained, the user indicated the existing level of validation was sufficient. This manual execution attempt is closed at preparation; operator questions no longer require an answer. The unchecked native/human steps above are deferred, not completed or passed. All 22 manual records remain open, and prior automated evidence retains its actual scope. No further permissions, device access, runtime changes or publication are pursued by this attempt. The reviewed runbook remains available for a future explicitly requested or product-specific validation session.
