# Behavior evaluation — 2026-09-29

## Baseline

Before editing the skill, a separate agent (`/root/workflow_baseline`) read the existing entrypoint and tools reference against a dashboard completion scenario with copied CSS, metadata-only search, absent native MCP tools, unit-test success and one desktop screenshot.

It correctly rejected premature completion and requested rendering/interaction checks. Two imprecise directions remained: it proposed replacing copied CSS/custom controls with package primitives despite the bounded task, and distinguished a manual playbook pass from an “official workflow” without a concrete executable completion record. It did not have a reusable client or browser measurement helper to invoke. This is a decision-level probe, not a complete product execution and not evidence that all prior instructions failed.

The real baseline failures are independently recorded in `../relaydock-workflow-audit.md`: rendered contrast/nested-interactive issues and project touch-size omissions survived the original workflow. The updated skill adds a reusable measurement path and explicit review/evidence requirements for that demonstrated gap.

Before implementation, helper-availability assertions failed (browser helper absent; MCP client absent). After implementation, behavioral tests run real local browser fixtures and real subprocess JSON-RPC exchanges. The bad browser fixture is expected to produce findings; the repaired fixture must pass. Tests exercise outcomes rather than matching skill wording.

## Independent forward scenarios

Agent `/root/workflow_forward_test` read the updated repository skill/references without the prior audit conclusions and answered five separate task situations. These are instruction-interpretation tests; actual tool execution is covered separately by executable tests.

| Scenario | Observed response |
|---|---|
| One-word copy change | Reuse existing design; avoid reference discovery and full test matrix; verify relevant layout only. |
| Significant management UI, copied CSS, green units, one screenshot | Record authority/reuse/state criteria; do not require unrelated package migration; incomplete until appropriate rendered/interaction checks exist. |
| Explicit21st request, native tools absent, configured launcher present | Use bundled status/search, avoid new ad hoc bridge, preserve secrets, separate metadata search from retrieval/adoption. |
| Playbook steps and automation complete, dialog/keyboard untested | Recognize actual playbook execution; keep required UI verification incomplete and identify missing states. |
| Project48px rule,18px switch graphic with larger label, deadline pressure | Use48px from project; inspect actual hit area and overlap; neither blindly fail small graphic nor excuse it merely because a label exists. |

All five responses matched the intended decisions. This small evaluation does not establish universal agent compliance or complete aesthetic quality.

## Review-driven regression checks

Opus review identified that combined defects could conceal missing status conditions. Isolated overflow/incomplete fixtures now fail when their respective decision condition is removed in a temporary copy. Mobile viewport, malformed expectations, touch-candidate filtering, protocol server-request/blank-line handling and descendant cleanup were also tested before and after correction. See the adjacent test logs and mutation-results.json.
