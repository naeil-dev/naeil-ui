# Public UI support and manual acceptance

Prepared `@naeil/ui@0.3.0` remains unpublished. Current documentation covers 13 families. This matrix describes the current examples/checks, not every consumer or every allowed dependency version. [Dated Stage 3 results](public-ui-stage3-verification.md) identify commands, source hashes and local limitations. [Stage 4 extension results](public-ui-stage4-verification.md) separately cover Tabs/Textarea and native field/choice composition.

Linux CI at `bcf99fca3467ae2b1cd29d54fa24f2569fb6001c` passed package-and-site in both the [push run](https://github.com/naeil-dev/naeil-ui/actions/runs/36945564443) and [PR run](https://github.com/naeil-dev/naeil-ui/actions/runs/36945943651). Their browser jobs failed: respectively 207 passed/4 skipped/2 failed (axe scan collision and Avatar Docs ambiguity), and 208 passed/4 skipped/1 failed (Avatar Docs ambiguity). Firefox application tests passed in both Linux runs. These failed baseline results remain historical evidence in the [final correction follow-up](public-ui-final-verification.md).

The corrected source `9f90493abb4fb1186c948084026c3f4c04074013` passed independent scoped review with no actionable findings and both actual Linux workflows: [push](https://github.com/naeil-dev/naeil-ui/actions/runs/36948276767) and [PR](https://github.com/naeil-dev/naeil-ui/actions/runs/36948280881). The PR browser suite passed **209 tests with 4 expected forced-colors skips** (two each in Firefox/WebKit); package-and-site and optional helper checks also passed. Root verified the downloaded PR Storybook artifact and its `/naeil-ui/` navigation/fonts in Chromium/WebKit. This evidence applies to that exact source; [live PR checks](https://github.com/naeil-dev/naeil-ui/pull/1/checks) report later documentation-head status. Review/CI acceptance does not complete manual platform checks or authorize publication.

| Environment / capability | Contract and evidence |
| --- | --- |
| React / ReactDOM | Host React 19; clean packed fixture uses 19.2.3 with library type checks enabled. |
| Styling | Tailwind 4 source scanning plus shared globals or theme + components CSS. Clean React production CSS/JS and actual browser fixture are checked. |
| Next compatibility | Optional Next 15/16 and next-intl 4 peers; separate clean fixture checks Next 16.1.7/next-intl 4.8.3. This is not every peer-version combination. |
| Chromium | Actual local checks and 71 application tests passed in the corrected Linux PR run above; exact local build is in dated evidence. This does not certify every Chromium version. |
| Playwright WebKit | Actual local checks and 69 application tests passed in the corrected Linux PR run, with 2 expected forced-colors skips. It is not installed Apple Safari certification. |
| Firefox | 69 Linux application tests passed in the corrected PR run, with 2 expected forced-colors skips; the full CI run passed. Local installed Firefox still fails before the application with `Could not find profile folder`. This does not certify every Firefox version or resolve the local launch block. |
| Mobile | 320/390 CSS-pixel viewports, responsive controls/content and screenshots. Emulation is not physical iOS/Android device testing. |
| Scaling / zoom | Separate 320px viewport, 200% CSS root text scaling and 200% CSS zoom probes; native desktop browser zoom remains manual. No CDP pinch claim. |
| Forced colors | Chromium media emulation with control/focus/state checks. Actual Windows high contrast, Firefox forced colors and WebKit forced colors remain manual/unrun. |
| Fonts | Storybook and the independent consumer deliver local Pretendard and Noto Sans JP with OFL notices. Explicit loaded-face probes check representative Korean/Latin/Japanese; they do not certify every glyph/weight. Deliberate blocked-font checks verify readable fallback. |
| Accessibility | Axe WCAG 2/2.1/2.2 A/AA scopes plus keyboard/state checks including open overlays. Screen-reader announcements and real assistive technology remain manual. |
| Motion | Shared reduced-motion emulation, overlays and toast loading checked. Custom consumer motion needs separate checks. |

The public API surface is the exact manifest allowlist. [Component guides](../components/README.md) and the [consumer migration guide](v2-migration.md) explain defaults, overrides and consumer-owned labels/errors/state.

## Manual acceptance before a release

Record actual OS, browser/version, assistive technology, result and evidence for each check; do not check boxes based on axe or installed tooling.

- Use NVDA with Windows Firefox/Chromium and VoiceOver with actual Safari. Hear labels/descriptions, errors, switch checked state, checkbox mixed state, selected language, dialog title, selected tab/panel, textarea label/help/error, native radio selection and toast outcomes once; verify appropriate live regions and focus return.
- Use native desktop browser zoom at 200% and 400% and OS text enlargement. Check 320 CSS-pixel equivalent reflow, clipped labels, dialogs with long content and persistent recovery controls; do not substitute pinch/CSS zoom for this acceptance.
- Use actual Windows high contrast themes. Confirm text, input boundaries, focus outlines, switch thumb/track and checked/mixed indicators remain distinguishable, including disabled states, selected tab borders and textarea invalid boundaries.
- On physical iOS Safari and Android Chrome, check keyboard opening, native input zoom, 44px targets, choice-target hit areas and lack of adjacent overlap, scrollable overlays and portrait/landscape.
- Check keyboard-only consumer flows after overriding classes/focus/outside handlers. Keep Tab order logical, modal focus inside, Escape available, and focus returned to an appropriate action, including triggerless/removed-trigger compositions.
- Test font failure/offline/slow loading, long Korean/English/Japanese and product-specific errors/loading/empty/retry with real data. Confirm persistent errors/recovery do not disappear with a toast.

No screen reader, physical device, native Safari or Windows check is claimed as completed by this implementation. Publishing the package, enabling a hosted preview, merging main and deploying the brand website are separate decisions.
