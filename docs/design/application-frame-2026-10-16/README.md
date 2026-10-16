# Shared application frame — 2026-10-16

Implemented in the `review/content-widths` worktree based on `04229adbecac302efbf50ab2b8a3a40edb0a04bb`. This is a local 0.5.0 candidate update, not registry publication, website deployment or external application adoption.

## Contract and decision

The owner preferred the inspected Naeil Home width and authorized updating the design system and improving shared navigation/footer adoption. `DESIGN.md` now makes the 1600px outer frame and `clamp(16px, 2.4vw, 40px)` gutters shared defaults. The frame includes padding. Lists use the remaining region (1520px on a 1920px viewport); reading/settings remain 640px and short forms 480px. Neutral colors, Pretendard, existing control sizes and restrained motion stay under DESIGN's authority.

`src/tokens/ui.json` owns the values and `pnpm build:tokens` generates the exported CSS. `.ui-app-frame`, Navigation and SiteFooter share the same rule. NaeilHeader and legacy Nav/Footer inherit it. Public imports, props, inherited tokens and explicit utility overrides remain available. Website hero/project content is outside the shared package scope.

Adoption improvements address observed gaps: the standalone React example still named the 0.4.0 archive while importing the 0.5.0 header; its validation previously replaced that dependency before checking it. A new version guard catches this first. The migration guide demonstrated a custom header and linked an old example. Current guides now show actual shared compositions and link to the maintained example. The shipped [application layout guide](../../components/application-layout.md) includes consumer-agent rules, because installing a package does not load this repository's AGENTS.md in another project.

## References and actual tool use

- Inspected the user-provided Naeil Home on port 2455 with Paseo browser screenshots/geometry at 1280, 1920 and 390px. Its 1600px frame/gutter supplied the proposal; the owner's subsequent approval establishes the shared rule. Aside's attachment attempt timed out at `Page.enable`; its REPL was exited, and it is not claimed as the successful inspection tool.
- Read [Carbon 2x Grid](https://www.carbondesignsystem.com/building-blocks/foundations/2x-grid/overview) for task-based grid decisions, [WCAG reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) for narrow screens/local table scrolling, and [Visual Presentation](https://www.w3.org/WAI/WCAG22/Understanding/visual-presentation.html) for long-line readability. Carbon's 1584px breakpoint is not this package's token; the last source describes an AAA criterion, not a universal AA width requirement.
- Applied repository frontend-reference-workflow revision 2026-10-02.1 and its layout/verification references; instruction hashes are retained. Impeccable 4.4.0 context ran once, followed by layout/craft-floor review and one scoped detector run (`detector.json`: no findings). The approved repository design overrides generic aesthetic advice. No Refero, 21st, Component Gallery, Kinetics or image-generation call was made for this task.

## Verification

| Check | Result and evidence |
| --- | --- |
| Regression before implementation | New frame check failed against the old built Storybook: expected 1600, received 1280. Version guard rejected the stale 0.4.0 fixture before correction. |
| Unit / types / lint | 72 tests in 13 files pass; types pass; lint has 0 errors and 1 pre-existing warning in `logo-study-2026-10-09/verify_browser.mjs`. See corresponding logs. |
| Token contrast | `pnpm check:contrast` passes light/dark text, selected states, focus and essential control-boundary pairs. No color changes were made. |
| Builds | Package, Storybook and Next website production builds pass. Storybook checks 17 actual Docs pages, fonts and bundled notices. |
| Storybook browsers | `browser.log`: 316 pass, 2 conditional non-Chromium forced-colors cases skipped. Chromium/Firefox/WebKit cover frame, navigation, canonical header, UI-v2, component usage and brand specs. |
| Geometry / overrides | 320/390/768/1440/1920/2560px in both themes; header/main/footer align, list fills available width, settings stay 640px. Root 1100px/20px and explicit `max-w-7xl px-0` overrides pass. Independent reviewer also checked 806/807/820/1920px and common-subtree overrides. |
| Packed consumers | `consumers.log`: clean React-only and Next production consumers pass; installed header/main/footer geometry at 390/1440/1920px, light/dark; locale/theme/navigation, mobile behavior, fonts, form recovery and existing mixed-import regressions pass. |
| Final archive boundary | `boundary-final.log`: 125 files, 877603 unpacked bytes; SHA-256 `3fbe618f51183d27d9afe2279aa0f8241bfa647fa9db3e7b5d3227247224ec92`. Final document links pass after converting links to unpacked examples into maintained repository URLs. Runtime is unchanged since packed-consumer validation. |
| Native scrollbars / visual capture | `verify.mjs`, `measurements.json`: 8 Storybook cases with native scrollbars, actual theme/font checks, route comparisons and short/tall geometry. Site phase is separately blocked below; the script exits 1 for that limitation. |
| Independent code review | No remaining critical/important/minor findings. Two stale documentation pointers were corrected and rechecked. Review did not claim external rollout or actual-site runtime validation. |

The 24 distinct whole-header axe scans in local `test-results` contain no violations but include 12 `aria-valid-attr-value` and 18 `color-contrast` incomplete records (each report is also copied as a Playwright attachment). These are not silently treated as passes. Axe could not resolve popup control IDs or the background under two multiline Japanese descriptions. `review-incompletes.mjs`/`incomplete-review.json` verify live open-dialog targets and all five description contrast pairs in both themes across three engines. The actual desktop light and mobile dark menu screenshots were inspected for clipping/overlap; labels remain readable. This disposition is limited to these fixtures and does not certify assistive-technology behavior.

### Composition result

Inspected all eight captured Storybook images, plus `before-home-light-1920.png` and current 1440px light/390px dark menu captures from the browser suite. The before/after Home comparison uses the same Korean fixture, light theme and 1920×1000 viewport. Header, wide content and footer now share their left anchor. Switching to settings preserves those anchors while centering its 640px region. Japanese canonical navigation remains readable on desktop and collapses to the shared mobile sheet. The dense list has a useful wider reading/metadata area and a separate 300px detail column; on mobile it reflows vertically with wrapping text. Sparse compositions intentionally retain open space rather than stretching a form.

Native classic scrollbars reduce available width by 15px on this runner. All three frames remain mutually aligned. At 1920px, a short→tall change without a scroll policy moves their centered start 160→152.5px. Applying the documented consumer-owned `html { scrollbar-gutter: stable; }` holds both states at 152.5px. Shared components do not impose document scroll policy.

Functional behavior and shared-width compliance pass in the tested package/Storybook scopes. Visual composition was reviewed against the approved frame and purpose-specific widths. Actual website rendering is not included in this verdict.

## Remaining boundaries

- The website build passes, but the isolated local server returns 500 because `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are absent. `/ko` and `/ko/design` runtime comparisons are blocked (`measurements.json.site`); no secret file was read or authentication behavior changed. Re-run with the consumer's configured environment before deploying the site.
- Live Naeil Home migration and its prior contrast, nested-control and touch findings remain open as recorded in `docs/design/navigation-footer-integration.md`. Shared-component tests do not close those findings.
- External applications must upgrade the package, integrate shared components in their root layout, copy the applicable consumer-agent rules and run their own route checks. Physical-device/VoiceOver acceptance, real provider sign-in, npm publication and deployment remain outside this change.

To reproduce, build package/Storybook, run the commands in the logs and the six selected Playwright specs. For the custom captures, serve Storybook on 6007 and a configured production website on 3097, then run `node docs/design/application-frame-2026-10-16/verify.mjs`; run `review-incompletes.mjs` against the same Storybook. Source hashes identify the checked implementation. Historical screenshots were preserved; the whole-header suite now writes new captures to `test-results/naeil-header` by default.
