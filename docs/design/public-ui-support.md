# Public UI support and manual acceptance

Prepared `@naeil/ui@0.3.0` remains unpublished. This matrix describes the current examples/checks, not every consumer or every allowed dependency version. [Dated Stage 3 results](public-ui-stage3-verification.md) identify commands, source hashes and local limitations.

| Environment / capability | Contract and evidence |
| --- | --- |
| React / ReactDOM | Host React 19; clean packed fixture uses 19.2.3 with library type checks enabled. |
| Styling | Tailwind 4 source scanning plus shared globals or theme + components CSS. Clean React production CSS/JS and actual browser fixture are checked. |
| Next compatibility | Optional Next 15/16 and next-intl 4 peers; separate clean fixture checks Next 16.1.7/next-intl 4.8.3. This is not every peer-version combination. |
| Chromium | Actual local Playwright Chromium application checks; see exact build in dated evidence. |
| Playwright WebKit | Actual local engine checks. It is not installed Apple Safari certification. |
| Firefox | Configured CI project. Local installed Firefox fails before the application with `Could not find profile folder`; local application checks are blocked. CI configuration is not a remote passing result. |
| Mobile | 320/390 CSS-pixel viewports, responsive controls/content and screenshots. Emulation is not physical iOS/Android device testing. |
| Scaling / zoom | Separate 320px viewport, 200% CSS root text scaling and 200% CSS zoom probes; native desktop browser zoom remains manual. No CDP pinch claim. |
| Forced colors | Chromium media emulation with control/focus/state checks. Actual Windows high contrast, Firefox forced colors and WebKit forced colors remain manual/unrun. |
| Fonts | Storybook and the independent consumer deliver local Pretendard and Noto Sans JP with OFL notices. Explicit loaded-face probes check representative Korean/Latin/Japanese; they do not certify every glyph/weight. Deliberate blocked-font checks verify readable fallback. |
| Accessibility | Axe WCAG 2/2.1/2.2 A/AA scopes plus keyboard/state checks including open overlays. Screen-reader announcements and real assistive technology remain manual. |
| Motion | Shared reduced-motion emulation, overlays and toast loading checked. Custom consumer motion needs separate checks. |

The public API surface is the exact manifest allowlist. [Component guides](../components/README.md) and the [consumer migration guide](v2-migration.md) explain defaults, overrides and consumer-owned labels/errors/state.

## Manual acceptance before a release

Record actual OS, browser/version, assistive technology, result and evidence for each check; do not check boxes based on axe or installed tooling.

- Use NVDA with Windows Firefox/Chromium and VoiceOver with actual Safari. Hear labels/descriptions, errors, switch checked state, checkbox mixed state, selected language, dialog title and toast outcomes once; verify appropriate live regions and focus return.
- Use native desktop browser zoom at 200% and 400% and OS text enlargement. Check 320 CSS-pixel equivalent reflow, clipped labels, dialogs with long content and persistent recovery controls; do not substitute pinch/CSS zoom for this acceptance.
- Use actual Windows high contrast themes. Confirm text, input boundaries, focus outlines, switch thumb/track and checked/mixed indicators remain distinguishable, including disabled states.
- On physical iOS Safari and Android Chrome, check keyboard opening, native input zoom, 44px targets, choice-target hit areas and lack of adjacent overlap, scrollable overlays and portrait/landscape.
- Check keyboard-only consumer flows after overriding classes/focus/outside handlers. Keep Tab order logical, modal focus inside, Escape available, and focus returned to an appropriate action, including triggerless/removed-trigger compositions.
- Test font failure/offline/slow loading, long Korean/English/Japanese and product-specific errors/loading/empty/retry with real data. Confirm persistent errors/recovery do not disappear with a toast.

No screen reader, physical device, native Safari or Windows check is claimed as completed by this implementation. Publishing the package, enabling a hosted preview, merging main and deploying the brand website are separate decisions.
