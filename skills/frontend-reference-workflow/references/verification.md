# Rendered verification

Use the project's existing tests first. This helper complements them; it does not certify a design or replace product interaction tests.

## Derive the acceptance contract

Copy relevant rules from the actual DESIGN.md/tokens into project notes with source sections, expected values, and applicable screens/states. Keep the authority separate from measurements. Record exceptions explicitly. If a rule is absent, mark it unspecified rather than importing a value from a past project.

For each substantial changed screen, cover representative desktop and touch sizes, a wide viewport when the product uses one, relevant light/dark themes, and changed loading/empty/error/long-content/editor states. Choose cases based on the changed behavior; a tiny copy fix does not require this whole matrix.

Document how the shared system is consumed: imports/version or copied revision/adaptations/update responsibility. Do not require an unrelated dependency migration merely to improve one screen.

## Browser helper

Dependencies: an existing project installation of `@playwright/test` or `playwright`, `@axe-core/playwright`, and its Chromium browser. The script does not install them. Missing dependencies/browser are **blocked**, not a successful check; use an equivalent existing tool or prepare the needed setup under the user's authorization.

Create a project-specific JSON config. This example illustrates a project whose documented body font is 16px and touch target 44px; these are not universal defaults:

```json
{
  "authority": "DESIGN.md: typography and control size sections; reviewed for this task",
  "baseURL": "http://127.0.0.1:18477",
  "rules": {
    "touchMin": 44,
    "expectations": [{"selector": "body", "css": {"fontSize": "16px"}}]
  },
  "cases": [
    {"name": "dashboard light", "path": "/", "colorScheme": "light", "viewport": {"width": 1440, "height": 1000}, "readySelector": "main"},
    {"name": "dashboard dark wide", "path": "/", "colorScheme": "dark", "viewport": {"width": 2560, "height": 1000}, "readySelector": "main"},
    {"name": "dashboard touch", "path": "/", "colorScheme": "dark", "viewport": {"width": 390, "height": 844}, "touch": true, "readySelector": "main"}
  ]
}
```

Run through Node, replacing the paths with the actual installed skill and project:

```sh
node <skill>/scripts/browser-check.cjs --config <project>/checks.json --project <project> --out <project>/evidence/browser.json
```

Use only an authorized preview/fixture. The CLI opens fresh contexts without login cookies, enables reduced motion for stable measurements, navigates configured pages, and does not perform mutation flows. Each case requires a name, positive viewport dimensions and a readySelector that identifies ready content (not merely the loading shell). It waits for DOM content and that selector instead of network idle, so polling need not block preparation. Touch cases also enable mobile layout emulation; a layout viewport that differs from the configured width is a finding (check the viewport meta tag and overflowing layout). The default colorScheme is dark; every result records the requested theme, touch flag and configured viewport. This emulates prefers-color-scheme, not application class/storage toggles. Prepare class/storage-driven themes with project tests before calling auditPage and record the actual active theme. Authenticated or interactive states should use the project's own Playwright setup and import `auditPage` after preparing the state:

```js
const { auditPage } = require('/absolute/skill/scripts/browser-check.cjs');
// page belongs to an explicit browser.newContext(), already prepared by the project's test.
const result = await auditPage(page, projectRules, AxeBuilder);
```

The caller supplies `AxeBuilder` from its installed `@axe-core/playwright`. Close contexts/browser in finally blocks. Store JSON alongside the state name, viewport, theme and exact commands. Screenshots are separate visual-review evidence, not automatically captured by this helper. CSS expectations use exact computed values (for example `rgb(...)` for colors), not token spellings.

## Interpret results

- `needs-work`: axe WCAG2/2.1 AA violations, page overflow, viewport mismatch or a failed/missing visible CSS expectation.
- `needs-review`: no automatic failures, but axe could not determine a result or a control's visible box is below the configured touch minimum.
- `automated-checks-passed`: only the executed automatic checks passed. This is not “design complete.”
- `blocked`: page preparation or execution failed; inspect the safe diagnostic before claiming coverage. Fatal setup errors replace the requested output report with a blocked record to avoid reusing an earlier success.
- Use the report's top-level `status` or the process exit code for the overall verdict; an empty `results` array on setup failure is not a pass. The overall status prioritizes blocked, needs-work, then needs-review.

CLI exits 0 only when all configured cases pass automatically, 1 for findings/review/blocked cases, 2 for setup failure.

`touchMin` is supplied by the project. Without it, touch is `not-configured`; with a fine pointer, it is `not-applicable-fine-pointer`. Neither establishes touch compliance. The helper measures light-DOM visible controls, including common interactive ARIA roles. Noninteractive tabindex=-1 anchors and clipped 1px skip links are excluded from touch candidates but still need appropriate keyboard tests. Transparent native overlays remain touch candidates. Transparent form mirrors with pointer-events:none are excluded; aria-hidden alone does not prove an element cannot receive pointer input. Inline links can have accessibility-standard exceptions; evaluate them against the project rule, not a blanket exception. The script reports page-level scroll overflow only; clipped/ellipsized content and overflow within scroll regions require visual review. For other limitations: custom canvas, shadow-root and iframe interactions require project-specific checks. Borderline measurements use a 0.5px rounding tolerance.

A small switch/checkbox graphic may have a larger label or pseudo-element click area. Inspect actual hit testing around the control and overlap with neighbors, record the evidence and disposition, and correct genuine undersized targets. Do not automatically call every small graphic a violation or automatically excuse it because a label exists. Axe `incomplete` results also need inspection. Do not suppress a reported node merely to get a green status.

## Separate checks still needed

- Contrast: automated axe results cover text in the current state. Separately measure essential control boundaries, focus rings and selected/state indicators against the project standard (for example the shared DESIGN.md requirement of 3:1). Inspect relevant placeholder/hover/selected text and document applicable disabled/inactive exceptions; a rest-state text pass is not evidence for these states.
- Keyboard: tab order, visible focus, Enter/Space, dialog/menu Escape and focus return, disabled behavior.
- States: prepare and inspect relevant editors/dialogs, empty/error/loading, long/localized text; a closed dialog scan says nothing about its contents.
- Motion: explicitly check normal and reduced-motion behavior; a run with motion disabled is not a motion test.
- Visual review: hierarchy, density, alignment, space use and product flow against screenshots at the agreed sizes.
- Shared reuse: actual package imports and consumption checks only when package behavior/integration changed; copied-source checks should verify provenance and document synchronization.

Use a compact ledger in existing task notes:

| Criterion + authority | Screen/state/mode | Method + evidence | Result / remaining action |
|---|---|---|---|
| Project rule | Actual tested state | Command/report/screenshot | pass, fail, manual-review, not-run or blocked |

A required fail, unreviewed finding or not-run item keeps verification incomplete. The final response can still explain implemented work and remaining limitations accurately. Fixes should stay within the authorized task.


## Testing this skill's helpers

Regression tests live in the repository source, not the user skill installation. They resolve dependencies from that repository and can be invoked from another working directory with an absolute test path:

```sh
node --test <repo>/skills/frontend-reference-workflow/tests/browser-check.test.cjs
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s <repo>/skills/frontend-reference-workflow/tests -p 'test_*.py'
```

The stdio helper targets the configured macOS/Linux Python launcher. It handles server requests separately from responses and cleans the launcher's process group on shutdown. Windows transport/cleanup has not been implemented or verified.
