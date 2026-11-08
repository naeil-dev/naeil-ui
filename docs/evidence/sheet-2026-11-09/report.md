# Public Sheet — local implementation report

Worktree: `/Users/jaymini/.paseo/worktrees/28nele6j/sheet-20261109`  
Branch: `feat/sheet-20261109`  
Base/unchanged HEAD: `8bdace588df5d93fa86b9764cfa6a972e7b21f28`  
Package: `@naeil/ui@0.11.0` (unchanged); uncommitted local implementation, 2026-11-09.

Sheet implementation, docs and export wiring are complete. All requested validation commands completed successfully; warning and skipped-test details are recorded below. No commit, push, publication, tag, version bump or new dependency was made. No other worktree was modified.

## Public API

Both `@naeil/ui/ui` and `@naeil/ui/components/ui/sheet` expose:

`Sheet`, `SheetTrigger`, `SheetClose`, `SheetPortal`, `SheetOverlay`, `SheetContent`, `SheetHeader`, `SheetFooter`, `SheetTitle`, `SheetDescription`.

`SheetContent` adds `side?: "right" | "left" | "top" | "bottom"` (right), `showCloseButton?: boolean` (true), and `closeLabel?: string` (Close). It owns its portal/overlay and forwards Radix Content props/refs/handlers. Left/right are full height and `min(100%, var(--ui-width-short-form))` wide (480px default); top/bottom are full width, content-height up to `100dvh`. All sides scroll internally. Consumer classes override width/padding. Shared raised surface, strong edge border, inner-edge radius, panel-padding token and 120ms opacity animation are reused. X is 40px, at least 44px on mobile/coarse pointer. Radix owns focus trapping, Escape, dismissal and trigger restoration. Header/Footer are layout divs; Footer introduces no implicit close button.

## Changed files (18)

- `docs/components/README.md`
- `docs/components/sheet.md`
- `docs/design/v2-migration.md`
- `e2e/component-usage.spec.ts`
- `package.json`
- `scripts/check-consumers.ts`
- `scripts/check-package.ts`
- `scripts/check-storybook.ts`
- `scripts/fixtures/next/app/page.tsx`
- `src/components/ui/index.ts`
- `src/components/ui/sheet.stories.tsx`
- `src/components/ui/sheet.tsx`
- `src/lib/design/__tests__/exports.test.ts`
- `src/lib/design/__tests__/sheet.test.ts`
- `src/stories/sheet-examples.tsx`
- `src/styles/components.css`
- `tsconfig.build.json`
- `tsup.deep.config.ts`

The existing Dialog implementation and its sibling closeLabel work were not changed. Shared CSS only extends the existing mobile close-button sizing selectors to Sheet.

## Commands and results

All commands ran in the worktree above. Node `v22.23.2`, pnpm `10.30.3`.

| Command | Exit | Result / evidence |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` (first command) | 0 | Lockfile unchanged; 1108 packages reused. pnpm reported ignored build scripts for @parcel/watcher, @swc/core, msw. |
| `pnpm lint` | 0 | 0 errors, 3 pre-existing warnings; [log](lint.log). |
| `pnpm check:types` | 0 | Passed; [log](check-types.log). |
| `pnpm test` | 0 | 49 files passed, 1 skipped; 866 tests passed, 6 skipped; [log](test.log). |
| `pnpm check:contrast` | 0 | All contrast checks passed; [log](check-contrast.log). |
| `pnpm build:pkg` | 0 | ESM/declaration/token/locale boundary build passed; [log](build-pkg.log). |
| `pnpm build:storybook` | 0 | Build, notices, fonts and artifact checks passed: 16 UI + 2 Brand Docs; [log](build-storybook.log). |
| `pnpm check:package` | 0 | Packed boundary PASS (178 files); clean React and Next imports/types/production builds/SSR PASS from both `/ui` and the deep path; both globals and split CSS frame/lock browser matrices PASS. [Full log](check-package.log). |
| `NAEIL_UI_STORYBOOK_PORT=16017 NAEIL_UI_FIXTURE_PORT=16018 pnpm exec playwright test e2e/component-usage.spec.ts --grep '[Ss]heet\|[Dd]ialog'` | 0 | **84 passed (2.1m)** across Chromium, Firefox and WebKit; [log](playwright.log). |
| `pnpm check:package:boundary` (after final rebuild) | 0 | PASS: 178 files, 1,286,775 unpacked bytes; [log](package-boundary-final.log). |
| `git diff --check` | 0 | Passed. |

The 3 unchanged lint warnings are `docs/design/logo-study-2026-10-09/verify_browser.mjs:34`, `docs/rollout/evidence/account-correction-2026-10-17/verify-public.mjs:87`, and `src/app/auth/return/[...rejected]/route.ts:8`. The 6 skipped tests are the existing opt-in production invitation boundary suite (`NAEIL_INVITE_PRODUCTION_TEST` gate); it was not enabled for this Sheet task. Builds emit non-fatal large-chunk/third-party directive notices; the final package rebuild also warns about pnpm configuration in the extracted baseline fixtures.

New unit tests first failed 11/11 because the public Sheet API did not exist, then passed 11/11 after implementation. Node SSR tests replace only Radix Portal's unavailable DOM destination; browser tests use the real portal and Radix focus behavior.

The initial browser run was **66 passed / 18 failed**: new Chromium geometry assertions incorrectly compared against the raw viewport instead of the existing stable-gutter root width. Traces showed 320→305, 390→375, and right edge 1440→1425. The test now measures `document.documentElement.getBoundingClientRect().width`; the package gutter contract was preserved. [Initial log](playwright-initial.log). Independent read-only review identified the same test issue and found no additional concrete implementation/API/package defect. The corrected complete selected suite passed 84/84.

Final rebuilt archive SHA-256: `bbba4df748e8fa96af617a41b78766a6efbec9c9698755260bc727bce4609740`, identical to the archive used by the full packed consumer run.

## Browser coverage and screenshots

Built Storybook Docs and Usage; open focus, Tab/Shift+Tab containment, Escape and X dismissal, trigger focus restoration; ko/ja/en exact accessible close labels; 320/390/1440px, light/dark; no document or sheet horizontal overflow; 480px desktop width and full height; 40/44px close sizing; axe WCAG scans; all four edges with long internal scrolling; reduced motion. Existing Dialog and nested Dialog/Select checks also pass. Screenshots capture the actual built Storybook iframe with Sheet open.

| Theme | Viewport | Locale screenshots |
| --- | --- | --- |
| light | 1440 × 900 | [ko](light-1440-ko.png) · [ja](light-1440-ja.png) · [en](light-1440-en.png) |
| light | 390 × 900 | [ko](light-390-ko.png) · [ja](light-390-ja.png) · [en](light-390-en.png) |
| dark | 1440 × 900 | [ko](dark-1440-ko.png) · [ja](dark-1440-ja.png) · [en](dark-1440-en.png) |
| dark | 390 × 900 | [ko](dark-390-ko.png) · [ja](dark-390-ja.png) · [en](dark-390-en.png) |

All 12 PNG dimensions were verified. Visual samples inspected: light 390 ko/ja, light 1440 en, dark 390 en/ja, dark 1440 ko; no clipping or overlap observed. The 15px right strip in Chromium is the existing reserved root scrollbar gutter.

Packed frame evidence: `test-results/packed-consumer/{react,next}-{globals,split}-default-frame.json`; default local browser launch was used, with no deterministic classic/overlay wrappers configured.

Playwright HTML report: `playwright-report/fixture-16018/index.html`. Axe result attachments and test evidence: `test-results/fixture-16018/`.

## Decisions and limits

- A separate `src/stories/sheet-examples.tsx` keeps Sheet examples focused while reusing existing localized sample copy; this was explicitly allowed by the request.
- Motion is the existing opacity-only 120ms `ui-popup` convention, with no new slide or decorative effect. No numeric token changed.
- The existing generic package root does not export Dialog primitives; Sheet follows Dialog through `/ui` and the explicit deep path, preserving all existing exports.
- Packed consumer evidence covers compiled imports, types, exports and SSR from both `/ui` and the deep path. Open Sheet behavior is verified in built Storybook, not a separately opened packed Sheet browser fixture.
- No hosted deployment, publication, consumer adoption, physical mobile device or manual assistive-technology testing was performed. These are outside this local implementation request.
