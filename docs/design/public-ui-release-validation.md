# Native environment and remaining manual validation — 2026-10-02

**Native/manual acceptance remains open.** This follow-up records actual local capability probes and their blockers at accepted checkout `79d9382f62166e99eeb26c785e690bf90cbb5379`. It does not change the shared UI, close prior accessibility findings, certify every supported platform, or make a publication decision. Existing automated results remain in [the final verification report](public-ui-final-verification.md); maintained support policy is in [the support matrix](public-ui-support.md).

## Actual environment and execution

| Probe | Observed result | Scope |
| --- | --- | --- |
| `sw_vers` | macOS 27.0.1, build `26A434` | Actual local OS. |
| `/usr/bin/safaridriver --version` | Safari 27.0.1, build `22625.1.29.11.28` | Installed native SafariDriver; version alone is not application verification. |
| Owned SafariDriver `/status` | `ready: true` | Driver started on a newly allocated local port. Readiness did not establish a session. |
| Actual `POST /session` with `browserName: safari` | HTTP 500, `session not created`; exact message below | No usable Safari automation session and no application page/control assertions. |
| AppleEvents no-prompt preflight | Initially `-600` while Safari was absent; subsequently `-1744` | Initial result was application-not-running, not permission acceptance. Subsequent result is `errAEEventWouldRequireUserConsent`. No AppleScript event was sent to request consent. |
| `AXIsProcessTrusted()` without a prompt | `false` | The diagnostic process lacked Accessibility trust. Native keyboard/menu control and accessible-tree inspection were not established. |
| VoiceOver process check; VoiceOver Utility Info.plist | VoiceOver not running; Utility version 10, build 993 installed | VoiceOver was not enabled or executed. No speech/captions were observed, and no screen-reader usability pass is claimed. |
| Playwright Firefox default launch | Firefox 155.0, build `15526.9.2`; process exit 1, `Could not find profile folder` | Failed before loading the application. |
| One Firefox follow-up with an existing new canonical temporary profile | Same exit 1 and `Could not find profile folder` | Explicit isolated persistent profile did not resolve the failure. Profile removed; no reinstall, global preference change or further blind retry. |
| Existing Storybook served on an owned random loopback port | `index.html`, `iframe.html`, `index.json` and one asset from each bundled font family returned HTTP 200 with bytes identical to disk | Artifact delivery only. Neither rendered font selection nor Safari layout was observed. |

SafariDriver's exact session error:

> Could not create a session: You must enable 'Allow remote automation' in the Developer section of Safari Settings to control Safari via WebDriver.

No global preference, TCC setting, VoiceOver state or existing browser profile was changed. The failed SafariDriver session attempt nevertheless launched Safari, which had not been running initially. It returned no session/window identifier. Existing or restored windows were not inspected, navigated or closed, and no global Safari quit/kill was issued. The owned driver and local artifact server were stopped. An operator's settings confirmation alone must not be promoted to acceptance: a future retry must obtain an actual successful `/session` response before testing pages.

## Artifact and source identity

This run reused the existing local `storybook-static` build without rebuilding or editing it. Its full sorted relative-path SHA-256 manifest contains **838 files**, and the manifest text has SHA-256 `0f996659cf9892376a897e9fb389732274c27cb0fa0def75e6baf86169015614`. Each line is `<file SHA-256><two spaces><relative POSIX path><newline>`, sorted by path. This identifies the reused artifact; it does not independently prove that it is a downloaded CI artifact or establish its build provenance.

| File | SHA-256 |
| --- | --- |
| `storybook-static/index.html` | `f351829970d55bcb8799daecbc2dcf96ce55faa8950f7c115273ae0faf2b1176` |
| `storybook-static/iframe.html` | `db62cb99d67cc6e87ce6cc3d3e5de3c366ad9d16498cd165df7012fb77971ef6` |
| `storybook-static/index.json` | `b4543eb1f0cbcb643ead1ee59b1c06de9271e38b8154cf3d62ac698796264993` |
| `e2e/ui-v2.spec.ts` | `2ab2032eea88a52c752f1ec153c217d3eb8f59e8d833e4f6564c6a382c233de8` |
| `e2e/extension.spec.ts` | `83f90028ca04d8fade46b6261e6363916f4aad09f44113106ed6a5ecdb7b54b4` |
| `src/styles/theme.css` | `210ce5a83f61eb1f856f405d2a25b1a2e1be835329c2b251221e4d052ba4fece` |

The served index contains `ui-v2--workspace`, `ui-tabs--usage` and `ui-textarea--usage`, pointing to their real repository stories. Raw capability responses, launch logs, served-byte comparisons and the full artifact manifest were retained outside the repository. No Safari screenshot, Safari DOM probe, native AX snapshot or observed screen-reader output was produced. Earlier Playwright WebKit results are separate engine evidence; they are not a substitute for native Safari. Earlier Linux Firefox application passes remain valid for their recorded source/run, while this local launch blocker remains unresolved.

## Reproduction and native checks still required

For a manual run, serve the unchanged build from the repository root on a newly allocated port:

```sh
python3 -m http.server 0 --bind 127.0.0.1 --directory storybook-static
```

Read the actual port from the server output. Use a new window owned by the tester and record its identity; preserve other windows and the user's theme, zoom, keyboard-navigation and assistive-technology settings. Close only the owned window and stop only the owned server/driver. Do not enable automation or change system settings as a side effect of a test script. The exact Safari settings blocker above must be resolved by the operator before automated native checks can run.

The session request used in this run was:

```json
{"capabilities":{"alwaysMatch":{"browserName":"safari"}}}
```

It was sent to a locally launched `/usr/bin/safaridriver -p <unused-port>` at `POST http://127.0.0.1:<unused-port>/session`. Record the actual response and browser capabilities. A successful session may support WebDriver keyboard actions and programmatic DOM assertions; label those as automated native Safari checks. They do not establish human keyboard or screen-reader usability, and browser UI page zoom needs separate evidence.

Open `/iframe.html?id=ui-v2--workspace&viewMode=story&globals=a11y.manual:!true`, and family stories using `/iframe.html?id=ui-<family>--usage&viewMode=story&globals=theme:light;density:comfortable;a11y.manual:!true`. Repeat with `theme:dark` and `density:compact` as appropriate. The verified dot notation `a11y.manual:!true` avoids concurrent automatic addon scans when a controlled axe scan is actually used. It does not disable or replace human checks.

The expected behavior below comes from the actual `e2e/ui-v2.spec.ts`, `e2e/component-usage.spec.ts` and `e2e/extension.spec.ts`, rather than inferred component names. **All rows remain unrun in native Safari in this follow-up.**

| Check | Reproduction and expected result |
| --- | --- |
| Dialog (`ui-dialog--usage`) | Focus “Edit workspace”, Enter: focus “Workspace name”. Tab and Shift+Tab remain inside the modal. Empty save keeps focus and shows invalid state; long Korean/English/Japanese input survives recovery. Save completion and Escape return focus to the trigger. Confirm visible focus and scrollable content. |
| Select (`ui-select--usage`; workspace language input) | Enter opens value options; type `e` focuses English in the family story; Enter selects it and restores trigger focus. Submit reports `en`. Loading disables the trigger; empty state exposes retry. In the workspace, End focuses the final Japanese option, ArrowUp focuses English; Escape closes without changing the selected value. Check disabled-option skipping and popup scrolling. |
| DropdownMenu (`ui-dropdownmenu--usage`) | ArrowDown opens “Workspace actions” on “Copy reference”. Next eligible item is mixed “Show completed”; Enter changes it to checked and restores trigger focus. Radio action updates sort text. ArrowRight on “More actions” enters “Export details”; activation reports completion. Escape restores trigger focus. |
| Tabs (`ui-tabs--usage`) | Automatic horizontal arrows skip “Unavailable”, activate History and loop; Home/End work. Temporary panel draft resets after unmount. Vertical manual tabs move focus with arrows but change selection only on Enter/Space; disabled looping stops at the end. Retained hidden draft remains intact. Localized long tab labels scroll inside their tablist with the focused last tab visible. |
| Textarea (`ui-textarea--usage`) | Empty save focuses “Workspace notes”, sets invalid and displays the persistent error. Enter Korean/English/Japanese and a newline; editing clears invalid state without losing content. Confirm native two/four rows and resize policy. Native radio arrows change delivery; labels activate their radio. Save shows busy state then “Saved digest / en. (Example)”. |
| Light/dark, density and long content | Compare matching window dimensions and content. Use all three languages, long labels and multiline errors. Check focus and field boundaries, disabled state, overlays, persistent errors/retry, and text wrapping. Keep application frame and purpose-specific content widths separate. |
| Narrow window / mobile layout | In a desktop Safari narrow window record actual `innerWidth`, minimum supported window size, overflow and overlay scrolling. A desktop narrow window or responsive emulator is not a physical mobile pass. Physical-device checks remain below. |
| Native 200% and 400% page zoom | Use Safari's native page-zoom control in the owned window. Record the browser UI percentage and baseline/zoomed `innerWidth`, screenshots, long-dialog scrollability, labels and persistent recovery actions. Check the 320 CSS-pixel equivalent when attainable. CSS `zoom`, root font-size changes and device/media emulation do not meet this row. Restore owned-window zoom. |

Native controls can depend on the user's keyboard-navigation setting. Record it and actual key sequences; do not silently change a global setting to make a test pass. Screenshot inspection, DOM measurements, WebDriver focus assertions and AX snapshots should each be labeled with their actual method.

## Remaining human/platform acceptance

| Environment / task | Current status and evidence to collect |
| --- | --- |
| Safari 27.0.1 with VoiceOver | Blocked here by absent AppleEvents consent/Accessibility trust and no safe observed-output path. With an operator, preserve/restore VoiceOver state; observe actual speech or real captions for labels/help/errors, switch checked, checkbox mixed, selected language, dialog title/focus return, selected tabs/panels, textarea/radio values and toast outcomes once. Axe, AX snapshots and `say` are not screen-reader acceptance. |
| Windows with NVDA and actual high contrast | No Windows environment was exercised. Record Windows/browser/NVDA versions; hear the same state transitions and check real high-contrast text, field boundaries, focus, switch/checkbox indicators, selected tab and invalid textarea in enabled/disabled states. Chromium forced-colors emulation does not close this row. |
| Physical iOS Safari / Android Chrome | No physical device was exercised. Record hardware/OS/browser, portrait/landscape, software keyboard opening, native input auto-zoom, 44px targets without adjacent overlap and scrollable overlays. Desktop/mobile emulation does not close this row. |
| OS text enlargement, font/network failure and product-specific flows | Actual OS text enlargement and human fallback/readability checks remain open. Test long real data, slow/offline font loading and persistent error/empty/retry states in the consuming app. HTTP font delivery above does not prove loaded-face rendering or fallback usability. |
| Consumer keyboard overrides and prior axe incompletes | Recheck consumer class/focus/outside-handler overrides, nested Dialog/Select, removed/triggerless focus return and logical Tab order. Preserve prior `aria-hidden-focus`, `aria-valid-attr-value`, `bypass` and `color-contrast` incomplete findings until the affected states are reviewed; a launch diagnostic closes none of them. |

Record source/artifact identity, tester, date, actual OS/browser/AT version, method, expected/observed behavior, screenshot or observed-output evidence and remaining findings for each completed row. This report adds no native component pass and leaves all human/platform acceptance rows open.
