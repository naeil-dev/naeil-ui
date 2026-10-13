# Navigation and footer integration — 2026-10-13

## Contract

User direction: improve the public navigation/footer and converge with Naeil Home rather than maintain independent implementations. Preserve existing imports and consumer configuration. Implementation and deployment are separate.

Authority: DESIGN.md (neutral light/dark surfaces, Pretendard, 16px controls, 44px touch targets, 120/180ms motion, reduced motion). Application frame width belongs to the product; reading/settings/list widths do not constrain navigation. Keep existing site frame width through its adapter; do not promote Naeil Home's 1600px frame to a shared token.

Inspected reference: authenticated Naeil Home, desktop dark, 2026-10-13, via Aside snapshot and screenshot. Its header uses a brand + AI group (dashboard/API keys/model connections), status, settings, language, theme and logout. Source inspection found an independent react-i18next header, routing/dirty-guard integration, mobile Sheet and brand footer in its mobile menu. The local main checkout differs from the preserved branded implementation; neither is assumed to be the exact deployed revision. Live deployment migration requires identifying that source revision first.

Reuse: introduce framework-independent Navigation and SiteFooter in @naeil/ui/ui, then make existing Next/next-intl Nav and Footer compatibility adapters consume them. Keep providers, dictionaries, authentication, navigation guards, menu data and product status in the consumer. Shared visual controls do not imply cross-site cookies or preference synchronization.

Acceptance: standalone Storybook examples for website and Home composition; desktop/mobile, light/dark, keyboard dismissal/focus return, current link, long labels, route changes, frame anchors independent of content widths; package build, packed React-only consumption, relevant tests and contrast. Do not claim live Home migration from a demo/import alone.

Carry-forward: prior product contrast, nested-control and touch findings remain unverified for the live product. This change must not close them based on a shared component test.

Tools/instructions: repository frontend-reference-workflow 2026-10-02.1 and installed /Users/jaymini/.agents/skills/frontend-reference-workflow/SKILL.md 2026-10-05.1, layout/verification references; Impeccable context + extract procedure + craft floor; Aside guide + REPL guide. Existing visual authority and inspected product supply the pattern; no external design discovery or code retrieval is needed.

## Verification

Implemented: React-only Navigation/SiteFooter public exports and deep imports, legacy Nav/Footer adapters, configuration/slot expansion, container-based mobile layout, Radix focus/dismissal, shared style/token wiring, standalone stories, and consumer/agent guidance. The 64px row, opaque surface and click/keyboard groups are documented visual/behavior changes; legacy props/imports remain.

| Area | Evidence | Result |
| --- | --- | --- |
| Types and scoped lint | pnpm check:types; ESLint changed components | pass |
| Existing unit regressions | pnpm test | 46 tests / 9 files pass |
| Token contrast | pnpm check:contrast | light/dark text, state, focus and boundary pairs pass |
| Storybook build | pnpm build:storybook | 15 Docs/Usage families, bundle notices and brand checks pass |
| Packed consumers | navigation-footer-evidence/consumers.log | clean React-only + Next builds, deep imports, fonts and existing consumer browser scenarios pass |
| Functional browser checks | navigation-footer-evidence/browser.log; e2e/navigation.spec.ts; e2e/brand.spec.ts | 30 Chromium/WebKit tests pass; keyboard open/Escape/focus return, mobile focus trap, route-width invariance, resize dismissal, locale selection, long labels and reduced motion |
| Rendered rule checks | navigation-footer-evidence/checks.json + rendered.json | no violations, overflow or touch findings; Pretendard loaded; helper status needs-review for lazy-mounted Radix aria-controls |
| ARIA manual disposition | navigation-footer-evidence/aria-review.json | closed triggers have aria-expanded=false; opening resolves the controlled ID and sets true. Retain raw helper result; no node suppression |
| Visual composition | inspected home-desktop-menu-dark.png, website-light.png, home-dark.png, mobile-menu-light.png | consistent shared header/footer, readable hierarchy, stable frame around narrow content; synthetic stories, not live product parity |
| Firefox | browser launch plus /private/tmp retry | environment blocked: browser exits with “Could not find profile folder” before page load; no Firefox pass claimed |

Browser cases: 320px long-label/reduced-motion check; 390/1440/2560px light/dark Home composition; Korean plus English language switching. Legacy logo/application checks also cover the existing brand specimens. Rest-state helper includes a 390px coarse-pointer context; interactive tests inspect 44px link/control rectangles. Motion audits wait for the normal 120ms entrance to settle before reading contrast; a separate reduced-motion test verifies 0s animation. The initial failures found missing data-slot hooks on portalled navigation surfaces; those were corrected to inherit the shared reduced-motion rule. Popup stacking uses the existing overlay layer so toolbar popups appear above the mobile dialog.

Live Home was inspected in Korean/dark at 1376×1237; the comparable synthetic desktop-menu screenshot uses the same viewport/theme/language. It is a reference comparison, not an after screenshot of the live app. No page footer was present in the inspected live desktop DOM; the compact footer is an available shared composition. No user/account dashboard screenshot was copied into repository evidence.

Remaining scope: live Home source identification + package adoption and product regression checks (including unsaved-change navigation, auth/settings, actual supported language/theme providers and desktop/mobile comparison). Publishing, deployment, real-device and assistive-technology checks were not performed. Historical product accessibility findings remain open. Shared implementation is ready for consumer integration; live cross-site convergence is not complete.

The instruction identities and final implementation hashes are recorded in navigation-footer-evidence/source-hashes.json. Later changes require relevant rechecks.

## Standalone sample requested by user

`docs/design/navigation-footer-sample.html` embeds the actual current Navigation stories, React runtime, compiled shared CSS, Pretendard Variable and notices. It opens from a local file without a development server. Build with `pnpm exec tsx scripts/build-navigation-sample.ts`; preview-only controls switch Home/website/long labels, iframe width and theme. No shared component behavior was changed for packaging.

Verified local-file rendering, desktop navigation, mobile sheet, page changes, both theme controls, website/footer switching and no outer overflow at 390px. Typecheck passed. The private preview serves only this HTML on 127.0.0.1:6008 through Tailscale Serve HTTPS port 6447; the `.html` route downloads the file. Stop the preview proxy with `tailscale serve --https=6447 off`. Existing 443 and 2455 services are unchanged.

## Desktop brand alignment and sample deployment — 2026-10-13

User approved aligning the first menu after `.naeil` / `.naeil Home` and deploying the shared sample. Added `ui.navigation-brand-width` (160px), applied only at the existing desktop container breakpoint; mobile retains intrinsic brand width. Consumers can override the CSS variable consistently across their product frame. The existing 16px gap and footer compositions remain unchanged.

At the same 1440×1000 outer sample viewport, Korean/light, the iframe brand starts at x=79. Before this change Home's first menu started at x=237.1875 and website's at x=191.9375. Both now start at x=255, with a 160px brand area and 16px gap. Mobile brand widths remain approximately 142.19px and 96.94px. See `navigation-footer-evidence/alignment.json` and the inspected `aligned-home.png` / `aligned-website.png`.

Rebuilt and served at https://jay-macmini-2.tail165003.ts.net:6447/ (download route also HTTP 200). Verified 32 deployed sample cases in Chromium/WebKit across 1440/820/390/320px, light/dark and both compositions: equal desktop menu x positions, intrinsic mobile brands, mobile menu open/Escape, no page errors or inner/outer overflow. The 320px sample controls had a pre-existing intrinsic select-width overflow; constrained those preview-only selects to their label width.

Fresh checks: generated tokens, typecheck, contrast, package and Storybook builds, packed React/Next consumption, and all 30 navigation/brand Chromium/WebKit tests pass. Logs: `alignment-browser.log`, `alignment-consumers.log`, `alignment-storybook.log`, `alignment-package-build.log`. Initial concurrent typechecking raced package cleanup of dist/tokens.ts; a subsequent run after the package build passed. Previous raw rendered-helper/ARIA evidence is historical; alignment evidence and fresh browser tests verify the changed spacing. Firefox remains environment-blocked as previously recorded.

This deployment updates the standalone sample only. Live Home on port 2455, naeil.dev and npm publication remain outside this deployment; live migration and historical product findings remain open.

## Menu composition candidate — 2026-10-13

Contract: user approved the prior menu unification recommendation and requested a shared sample, not an operating-site rollout. Match the supplied naeil.dev screenshot's icon/title/description structure while retaining DESIGN.md typography, semantic surfaces, touch sizes and motion. Website project catalog uses two desktop columns; Home uses one; mobile is always one column. Preserve the existing 160px brand reservation and frame anchors independently of content widths. Prior live-product findings remain open.

Implementation: opt-in NavigationGroup.columns (default 1), 320/640px menu width tokens capped by available viewport space, 12px panel radius, shared 40px icon area/16px gap/12px entry padding. Group links use selected surface + semibold title + decorative check, without underlining descriptions; aria-current and visible keyboard focus remain. Status badges sit in the title row. The website sample shows five existing project identities and their descriptions/statuses; the standalone build injects the existing product PNGs. These images are not included in package/Storybook artifacts. The compatibility Nav adapter has not opted into two columns; this is a candidate shown by the sample. Footer behavior and the existing sample footer compositions remain unchanged.

Sample served at https://jay-macmini-2.tail165003.ts.net:6447/; default selection is now website, with Home and long-label comparisons in the selector. Both themes and mobile widths are available. Build: pnpm exec tsx scripts/build-navigation-sample.ts.

Validation: typecheck and scoped ESLint passed; tokens regenerated; contrast, package build, packed React/Next consumption and actual Storybook build passed. All 30 existing navigation/brand Chromium/WebKit browser cases passed. The saved check-menu-sample.mjs verifies 40 served cases (1440/2560/900/390/320px × light/dark × website/Home × Chromium/WebKit): desktop column count, mobile one-column, current state, icon loads, Enter/Escape/focus return, route changes, touch targets, overflow, and stable brand/menu anchors. At 1440px, menus are 640px/320px respectively and the first menu position matches across both compositions. The four English website accessibility cases are recorded in menu-axe.json.

Visual review: inspected menu-website-dark.png and menu-home-light.png together, plus menu-website-light-390.png. Final screenshots with viewport suffixes reflect the tokenized project accents. The design keeps the supplied screenshot's recognizable project artwork/layout, adapting its smaller typography and surface colors to the approved common system. Functional behavior, shared-rule compliance and visual composition were checked separately. Raw earlier alignment/helper evidence is historical; this section and menu-prefixed artifacts describe the new candidate. No Firefox, real-device or assistive-technology completion claimed.

Axe follow-up: four English cases reported no violations but retained color-contrast incomplete entries (2 desktop / 1 mobile per theme) because background overlap could not be resolved automatically. The saved check-menu-axe.mjs additionally measures each description's rendered foreground and nearest opaque surface (selected link, popover or sheet), converts computed colors through sRGB canvas and verifies at least 4.5:1. The raw incomplete records are retained alongside those measurements; this is a scoped manual disposition, not a claim of complete accessibility certification.

## Actual naeil.dev integration candidate — 2026-10-13

The user approved applying the shared system across naeil.dev, excluding dedicated project page bodies, and explicitly included `/design`. Actual site Nav now opts into the approved two-column desktop project menu; mobile remains one column. The full Footer retains the existing logo/tagline/GitHub/X/project/blog/social content. Site-owned localized Button/Select controls, accessible account triggers, frame offsets, document language and title/canonical/sitemap metadata accompany home/blog/login/design composition updates. This supersedes the earlier statement that the compatibility adapter had not opted in.

Review preview: https://jay-macmini-2.tail165003.ts.net:6448/ko . The earlier 6447 standalone sample and Home 2455 remain unchanged. Source and evidence: [site integration report](naeil-site-integration-2026-10-13.md), `site-integration-evidence/`. This repository's local source consumes the new components; no claim that npm 0.4.0 contains them.

Fresh shared checks: package/contrast/clean React+Next consumption/Storybook pass, 30 Navigation/brand Chromium+WebKit tests pass. Actual Next preview:288 route conditions with no failures,20 full-page axe checks with no violations; additional interaction/detail/metadata checks and bounded rechecks are recorded in the site report. Main inspected the screenshots. Lazy Radix aria-controls manual disposition and OAuth/Firefox/real-device/signed-in limitations remain explicit. Excluded project bodies and hero sources are unchanged; prior live Home findings are not closed.

Implementation is review-ready. Production naeil.dev, npm publication, public Storybook deployment and Naeil Home operating-source adoption are not performed by this task. All changes remain uncommitted in the existing worktree.


### Desktop hover follow-up (2026-10-13)

User feedback restores mouse-hover opening in the shared Navigation. Mouse click does not pin the menu; leaving the trigger/panel dismisses it after pointer-travel tolerance. Keyboard and touch remain supported. Internal DESIGN/token/Radix implementation and actual Playwright browser results are the sources; no new external design lookup, Aside session or imagery generation. Existing implementation agent independently reviewed multiple-group focus behavior. See `docs/design/naeil-site-integration-2026-10-13.md` and the separate `site-integration-evidence/hover-*` evidence for final validation and source hashes. Site review port6448 and standalone sample6447 are updated; production/npm/public Storybook remain unchanged.


Release preparation follow-up: user requested continuation after hover review. Read-only GitHub checks confirm main and successful Vercel Production deployment7009831199 both match515fa26; current branch has no open PR. Final source reconciliation reports no drift across50 previously validated implementation/test files;56 source/config hashes are frozen in `site-integration-evidence/release-source-manifest.json`. Full lint passes with one pre-existing logo-study warning after removing this task's unused evidence variable. Review-ready application/rollback sequence and PR text are prepared in `naeil-site-release-ready-2026-10-13.md` and `site-integration-evidence/release-pr-body.md`. No commit/push/merge/production/npm/public Storybook action was executed. The handoff explicitly reserves production approval for the final step, now ready for that decision.


### Production application completed — 2026-10-14

User authorized commit/PR/merge/deployment. PR #5 merged as `00a17a81264dba43266f5670453f6585669f7384`; Vercel Production deployment7049743975 succeeded for that SHA. PR and main CI both pass (51 unit tests;263 browser tests pass,4 conditional forced-colors cases skipped). Linux CI includes Firefox navigation coverage; actual-site coverage is Chromium/WebKit. On https://naeil.dev,288 route conditions,48 hover/touch/keyboard conditions,20 axe audits,4 interaction flows and21 route metadata checks pass. Existing project bodies and hero source are unchanged. Full provider login, physical devices and VoiceOver remain unverified. No npm publication, public Storybook deployment or Naeil Home change. New production evidence is retained separately in `docs/design/site-production-2026-10-14/README.md`; post-deploy records are included in the user-requested workspace closeout.


2026-10-14 title follow-up: user changed the official naeil.dev metadata spelling to `.naeil`, including the leading period. Rules in DESIGN/AGENTS/v2-migration and actual Next/social metadata are synchronized. PR #6 / production `a111e90` deployed successfully;60 actual production title/social/canonical cases and client/back/locale flows pass. See `docs/design/dotted-site-title-2026-10-14/README.md`. Earlier `naeil` validation records remain dated history.


2026-10-14 workspace closeout: user requested preserving all remaining production verification records in the repository and stopping the local review service. Port3010 Next preview stopped; only its Tailscale HTTPS6448 proxy was removed. Home2455, default443 and the separately approved sample6447 proxy were left unchanged. Start the next login task from updated main in a new workspace; actual provider sign-in/session/logout remains the first unverified flow. Closeout changes documentation/evidence only, with no runtime/package changes.
