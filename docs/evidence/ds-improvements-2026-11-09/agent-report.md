# DS improvements — 2026-11-09

Worktree: `/Users/jaymini/.paseo/worktrees/28nele6j/ds-improvements-20261109`  
Branch: `feat/ds-improvements-20261109`; unchanged HEAD `8bdace588df5d93fa86b9764cfa6a972e7b21f28`; package `0.11.0`.

## Result

Both scoped tasks and all requested verification commands completed successfully.

- Added optional `closeLabel?: string` to DialogContent and DialogFooter, both defaulting to `"Close"`. Content's showCloseButton remains true; Footer's remains false. Existing exports, forwarded props and className merging remain intact.
- Removed duplicate close controls from the localized design page, Korean workspace, Usage and nested-dialog examples. Existing Usage remains available. Added UI/Dialog/LocalizedClose (ko/ja/en) and UI/Button/FeedbackColors.
- Documented additive compatibility and error vs destructive roles. Added four Dialog SSR unit checks and a source/docs color-use regression check. Added real Storybook browser checks for localization, dismissal, focus return and light/dark accessibility.
- No existing unsafe `text-destructive` usage was found. Existing `text-destructive-foreground` remains valid.

## Verification

| Command | Exit | Result |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | 0 | Dependencies installed; lockfile unchanged |
| `pnpm lint` | 0 | 0 errors; 3 pre-existing warnings |
| `pnpm check:types` | 0 | TypeScript passed; repeated after browser-test addition |
| `pnpm test` | 0 | 860 passed, 6 skipped; 50 files passed, 1 skipped |
| `pnpm exec vitest run src/lib/design/__tests__/dialog.test.ts src/lib/design/__tests__/feedback-colors.test.ts` | 0 | 5 passed in 2 files |
| `pnpm check:contrast` | 0 | All contrast checks passed |
| `pnpm build:pkg` | 0 | Package/declarations built; locale package PASS |
| `pnpm build:storybook` | 0 | Storybook artifact PASS; 15 UI + 2 Brand Docs pages |
| `pnpm check:package` | 0 | Packed boundary PASS (175 files); clean React/Next builds, types, SSR, browser checks and globals/split CSS frame checks all PASS |
| `NAEIL_UI_STORYBOOK_PORT=6227 NAEIL_UI_FIXTURE_PORT=6228 pnpm test:browser e2e/component-usage.spec.ts e2e/ui-v2.spec.ts` | 0 | 196 passed, 2 skipped, 3.4 minutes; Chromium, Firefox, WebKit |
| `pnpm exec eslint e2e/component-usage.spec.ts` | 0 | Added browser tests passed lint |
| `git diff --check` | 0 | No whitespace errors |

Logs are adjacent to this report. Built declarations include both `closeLabel?: string` properties. Light/dark 390px workspace-dialog screenshots were visually inspected: footer Cancel retained, duplicate X absent.

## Limits and deviations

- The requested `pnpm test:browser -- <spec>` syntax caused this pnpm/Playwright setup to launch all 1,203 tests instead of filtering. That run was interrupted (exit 130); the corrected command above ran both requested relevant specs completely.
- The color scanner allows the exact prohibition phrase in common.md, since the requested guidance itself names the forbidden class; it still rejects that class in examples and source, including variant/opacity usage. The valid `text-destructive-foreground` companion is excluded.
- Unit rendering follows the existing Node SSR pattern with only Radix Portal replaced by a children passthrough; real open Root/Content/Close are retained. Real portal/dismissal/focus behavior was verified in all three browser engines.
- Existing conditional production-auth tests account for six unit skips; Firefox/WebKit forced-colors conditions account for two browser skips. No new tests skipped.
- Additional changes within scope: removed the existing Usage custom X and nested-dialog built-in X to obey the one-close rule, added browser regression cases, and recorded actual Impeccable usage in frontend-sources.md as AGENTS.md requires.
- Lint warnings are in docs/design/logo-study-2026-10-09/verify_browser.mjs, docs/rollout/evidence/account-correction-2026-10-17/verify-public.mjs, and src/app/auth/return/[...rejected]/route.ts. Storybook/consumer builds also emit non-fatal chunk-size/tooling warnings.
- No commit, push, tag, publication, version bump, AGENTS.md edit, hand-edit to generated theme.css, or edits in another worktree.

## Changed files

- `DESIGN.md`
- `docs/components/badge.md`
- `docs/components/button.md`
- `docs/components/common.md`
- `docs/components/dialog.md`
- `docs/design/frontend-sources.md`
- `e2e/component-usage.spec.ts`
- `src/app/[locale]/(content)/design/page.tsx`
- `src/components/ui/button.stories.tsx`
- `src/components/ui/dialog.stories.tsx`
- `src/components/ui/dialog.tsx`
- `src/stories/component-examples.tsx`
- `src/stories/ui-v2-demo.tsx`
- `src/lib/design/__tests__/dialog.test.ts`
- `src/lib/design/__tests__/feedback-colors.test.ts`

## Exact Dialog API/source diff

```diff
diff --git a/src/components/ui/dialog.tsx b/src/components/ui/dialog.tsx
index 899c92e..4935704 100644
--- a/src/components/ui/dialog.tsx
+++ b/src/components/ui/dialog.tsx
@@ -48,9 +48,11 @@ function DialogContent({
   className,
   children,
   showCloseButton = true,
+  closeLabel = "Close",
   ...props
 }: React.ComponentProps<typeof DialogPrimitive.Content> & {
   showCloseButton?: boolean;
+  closeLabel?: string;
 }) {
   return (
     <DialogPortal data-slot="dialog-portal">
@@ -70,7 +72,7 @@ function DialogContent({
             className="ui-focus absolute top-2 right-2 flex size-10 items-center justify-center rounded-sm text-muted-foreground hover:text-foreground transition-colors ui-focus disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
           >
             <XIcon />
-            <span className="sr-only">Close</span>
+            <span className="sr-only">{closeLabel}</span>
           </DialogPrimitive.Close>
         )}
       </DialogPrimitive.Content>
@@ -91,10 +93,12 @@ function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
 function DialogFooter({
   className,
   showCloseButton = false,
+  closeLabel = "Close",
   children,
   ...props
 }: React.ComponentProps<"div"> & {
   showCloseButton?: boolean;
+  closeLabel?: string;
 }) {
   return (
     <div
@@ -108,7 +112,7 @@ function DialogFooter({
       {children}
       {showCloseButton && (
         <DialogPrimitive.Close asChild>
-          <Button variant="outline">Close</Button>
+          <Button variant="outline">{closeLabel}</Button>
         </DialogPrimitive.Close>
       )}
     </div>
```


# Follow-up #9–#10 — NaeilFooter defaults and compact alignment

Completed in the same worktree without commits, publication or version changes. No further edits to Dialog files, AGENTS.md or DESIGN.md. Concurrent owner changes to workflow width tokens/docs are separate from these six files.

## Changes

- `docs/components/naeil-footer.md`: starter omits variant; full is the shared default and compact requires a deliberate recorded exception.
- `docs/components/application-layout.md`: canonical application starter omits variant and carries the same guidance.
- `src/components/naeil-header.stories.tsx`: Usage/JapaneseApplication now inherit NaeilFooter's default; explicit ReferenceCompact/En/Ko demonstrations remain compact.
- `src/components/ui/site-footer.stories.tsx`: GuardedLinks inherits the default; the intentional Compact story remains unchanged.
- `src/styles/components.css`: three-line rule applies `align-self: flex-start` only to direct compact footer link groups. Existing frame `align-items: center`, spacing, wrapping, brand and meta behavior stay intact.
- `e2e/naeil-footer.spec.ts`: checks starter behavior, all ko/ja/en × light/dark × 390/1440 compact combinations, title alignment, links, targets, overflow, measured geometry and screenshots.

Search found no additional copyable NaeilFooter examples in src/stories. Generic SiteFooter examples in navigation.md and v2-migration.md are different-product examples, not owned-service starters, and were retained.

## Before/after measurements

Actual built Storybook ReferenceCompact, ReferenceCompactKo and ReferenceCompactEn; no synthetic replacement footer. Baseline Chromium reproduced six desktop alignment failures and three non-default starter failures (9 expected failures / 7 passed, exit 1).

| Locale | Theme | 1440px title offset before → after | 390px title offset before → after |
| --- | --- | --- | --- |
| ko | light | 22px → 0px | 22px → 0px |
| ko | dark | 22px → 0px | 22px → 0px |
| ja | light | 22px → 0px | 22px → 0px |
| ja | dark | 22px → 0px | 22px → 0px |
| en | light | 22px → 0px | 22px → 0px |
| en | dark | 22px → 0px | 22px → 0px |

All 36 final Chromium/Firefox/WebKit combinations measured **0px** offset (limit ≤1px), with no horizontal overflow at 390px or 1440px. All links retained ≥44px targets. Chromium's 12 matched comparisons kept frameTop=421px, frameHeight=149.875px and brandTop=473.9375px unchanged. Title tops changed from [437,459] to [437,437]. Desktop before/after and mobile screenshots were visually inspected.

- Baseline geometry: [footer/before/measurements.json](footer/before/measurements.json).
- Final 36 measurements: [footer/after/measurements.json](footer/after/measurements.json).
- Baseline screenshots: `footer/before/compact-{ko,ja,en}-{light,dark}-{1440,390}.png` (12).
- Final screenshots: `footer/after/{chromium,firefox,webkit}/compact-{ko,ja,en}-{light,dark}-{1440,390}.png` (36).

## Verification results

All final commands below exited 0.

| Command | Result / log |
| --- | --- |
| `pnpm lint` | 0 errors, same 3 existing warnings; footer-lint.log |
| `pnpm check:types` | PASS; footer-check-types-final.log |
| `pnpm test` | 860 passed / 6 existing conditional production-auth skips; footer-test-final.log |
| `pnpm build:pkg` | PASS including locale package checks; footer-build-pkg.log |
| `pnpm build:storybook` | PASS, actual artifact and notices verified; footer-build-storybook.log |
| `PLAYWRIGHT_JSON_OUTPUT_NAME=test-results/ds-improvements/footer-final-results.json NAEIL_UI_STORYBOOK_PORT=6267 NAEIL_UI_FIXTURE_PORT=6268 pnpm test:browser e2e/naeil-footer.spec.ts e2e/navigation.spec.ts e2e/frame.spec.ts --reporter=list,json` | **117 passed, 0 skipped, 0 flaky**, 2.0m; footer-browser-final.log and footer-final-results.json |
| `pnpm exec eslint e2e/naeil-footer.spec.ts` | PASS after final test-wait correction |
| `pnpm check:package:boundary` | PASS, 175 packed files; footer-package-boundary.log |
| `git diff --check` | PASS |

Initial verification failures are retained rather than hidden:

- The first type check overlapped tsup's `clean: true` removal/recreation of dist/tokens.ts and exited 2 (TS6053). Sequential type checks after package completion passed. No type configuration change was needed.
- The first after-build browser run had 113 passes and four Japanese WebKit timeouts. Trace showed `document.fonts.ready` waiting ~30s despite all font requests returning 200 and no individual face in loading state; a standalone probe reproduced `FontFaceSet.status=loading`. The test now explicitly loads the rendered footer's computed font faces before measurement/capture. It does not skip font loading, alter product code, disable checks or increase timeouts. The final complete three-spec run passed all 117 cases.
- Existing tooling/chunk-size warnings are in the logs. Separate concurrently added workflow-width tokens did not change footer colors, typography, spacing or frame values; this report claims the footer scope and recorded artifacts only.

## Final Chromium screenshot links

- ko light: [1440px](footer/after/chromium/compact-ko-light-1440.png), [390px](footer/after/chromium/compact-ko-light-390.png).
- ko dark: [1440px](footer/after/chromium/compact-ko-dark-1440.png), [390px](footer/after/chromium/compact-ko-dark-390.png).
- ja light: [1440px](footer/after/chromium/compact-ja-light-1440.png), [390px](footer/after/chromium/compact-ja-light-390.png).
- ja dark: [1440px](footer/after/chromium/compact-ja-dark-1440.png), [390px](footer/after/chromium/compact-ja-dark-390.png).
- en light: [1440px](footer/after/chromium/compact-en-light-1440.png), [390px](footer/after/chromium/compact-en-light-390.png).
- en dark: [1440px](footer/after/chromium/compact-en-dark-1440.png), [390px](footer/after/chromium/compact-en-dark-390.png).
