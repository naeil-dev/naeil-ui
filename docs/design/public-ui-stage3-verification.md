# Public UI usage verification — 2026-10-02

The original Stage 3 implementation was verified locally against the original source hashes below, based on frozen Stage 2 `8bbbdf62d9a3cc6794d2c5fcf7cfafeca034dbb8`, and frozen at `80732074349b35d41e31b674f248171101481742`. Independent review found one P3 Avatar example accessibility issue; the focused correction and its replacement hashes are recorded separately below, pending an independent scoped recheck. This evidence does not authorize publication. No commit, push, package publication, workflow dispatch or site deployment was performed by either executor.

Authority: DESIGN.md, the shared v2 specification/migration and actual wrappers/installed primitive declarations. Scope: maintained guides and runnable Docs/Usage for all 11 existing families, accessibility/resilience examples, documented public support, independently packed consumption, preview asset/notices boundary and manual-only deployment preparation. The public export allowlist, approved palette/fonts, numeric foundations and product/site scope remain unchanged.

## Original frozen broad verification

Local execution used Node 22.23.2, pnpm 10.30.3 and Playwright 1.63.0 on macOS. Installed browser metadata identifies Chromium 153.0.8010.12, WebKit 26.6 and Firefox 155.0.

| Command / check | Observed result |
| --- | --- |
| `pnpm test` | 7 suites, **37/37 passed**. |
| `pnpm check:types` | Passed. |
| `pnpm lint` | 0 errors; one pre-existing unused `locale` warning in the website blog route. Generated preview/test reports are excluded from lint. |
| `pnpm build:tokens` then `git diff --exit-code -- src/styles/theme.css` | Passed; generated CSS has no drift. No generated CSS was hand-edited. |
| `pnpm check:contrast` | **40/40 semantic pairs passed** across light/dark. |
| `pnpm build:pkg` | Bundled/deep builds and declarations passed, including the internal-only helper entry. |
| `pnpm check:package` | Packed boundary and clean independently installed React + Next consumers passed. Finalized guide/report links and payload also passed `pnpm check:package:boundary`. |
| Independent React browser | 390px light/dark: actual local Pretendard Korean/Latin + Noto Sans JP faces loaded; no page overflow; native required-field rejection, preserved localized input and save recovery passed. Deliberately blocked fonts remained unavailable while fallback form stayed operable. **47 actual consumer-code package notices** and exact consumer-owned font OFLs passed. |
| Mixed public imports | Bundled `/ui` and deep menu imports passed overlapping inert ownership in both close orders, forced removal, existing inert preservation, object refs and focus restoration. Independently installed Vite development mode confirmed **two StrictMode effect setups**, then reran the same checks; production mode also passed. |
| `pnpm build:storybook` | 11 actual built Docs entries + 11 runnable Usage entries; exact repo/shadcn/OFL copies and bundled fonts; no website images/SVG/HTML copied. **74 actual Vite preview package notices + 254 conservative manager package-version notice entries** passed. |
| `python3 scripts/refresh-storybook-notices.py` | Opt-in source/npm refresh actually completed: 254 complete entries. Python syntax check also passed. Ordinary builds use checked-in notice bodies offline. |
| `pnpm exec playwright test --project=chromium --project=webkit` | **111 passed, 1 expected skip, 0 failures (1.7m)**. The skip is WebKit forced-colors emulation; Chromium's control/state/focus probe passed. Both projects rendered all 11 actual manager Docs pages. |
| Single Firefox Docs test | Failed before application launch: `Could not find profile folder`. This is an installed-browser environment block, not a passing Firefox application result. Firefox stays configured in CI; no remote CI pass is claimed. |
| `git diff --check` | Passed. |

Browser coverage includes default/compact/light/dark, 320px localized open overlays, keyboard/modal traps and trigger restoration, disabled/mixed/radio/menu/submenu states, real submitted values, invalid/loading/error/retry forms and toast loading/action/keyboard behavior. Axe runs use WCAG 2/2.1/2.2 A/AA tags on whole documents including opened overlays, with full violations/incomplete attachments. No rule is suppressed or threshold reduced. The addon is set to manual in external-axe test URLs to avoid concurrent axe instances; the external scan still runs normally. Finite theme/open animations settle before scans. Incomplete findings are preserved for manual review.

## Reproductions and repairs

Chromium forced-colors emulation reproduced an invisible Switch: both track and thumb became Canvas white. Shared CSS now uses system-color boundaries/track/thumb states and retains visible focus; no numeric token or normal-theme palette change was made.

Radix-managed hidden Select/menu background branches remained programmatically focusable and produced whole-document `aria-hidden-focus` findings. The internal helper follows Radix's `data-aria-hidden` ownership, adds inert, and restores each element's original inert state. A document-owned symbol registry coordinates bundled/deep/multiple module instances. Default modal, nonmodal, nested Dialog/Select, forced unmount, callback-ref cleanup, object refs and consumer handlers were checked. This remains the main global-interaction review surface; arbitrary consumer focus/outside overrides and third-party overlay combinations require their own acceptance checks.

Consumer examples corrected 320px/200% root-text wrapping and used percentage-based dialog max-height for the separate 200% CSS-zoom probe. These probes are not native desktop browser zoom. macOS WebKit's default navigation requires Option+Shift+Tab to include buttons; the toast test uses that setting and verifies actual document/trigger focus return. No Sonner component repair was needed.

Earlier local manager loads intermittently failed with `ERR_CONNECTION_RESET`/`ERR_SOCKET_NOT_CONNECTED` from Python's local static server, leaving a spinner/unstyled state. The verification/local-preview route now uses a persistent Node static server. The fresh complete suite passed through it; earlier failed runs are diagnostic history rather than final validation.

## Artifact and image review

The local reproducible preview is `storybook-static/`, served with `pnpm preview:storybook`; CI is configured to upload `storybook-preview` and browser results, but no hosted artifact or remote passing execution is claimed. Local Storybook results/HTML report, Firefox launch log, packed-consumer captures, command logs and a built manager Docs screenshot were retained privately; they are not npm payload or checked-in evidence. This checked-in dated command/source record and its reproducible commands identify the verified scope.

Actually opened and visually inspected final captures: Chromium light 2560px/default workspace; WebKit dark 2560px/default workspace; WebKit light and Chromium dark 390px/compact workspace; WebKit light and Chromium dark mobile open dialogs; Chromium forced-colors Switch; packed React light/dark/font-fallback pages; and the actual built Button manager Docs page. The inspected captures show bounded content, wrapped multilingual text, stacked mobile panels, visible overlay recovery/focus and distinguishable forced-color Switch states. Screenshot inspection does not certify every glyph, viewport or screen-reader behavior. Matching engine/theme/mobile captures for the remaining combinations are retained, but are not claimed as separately visually inspected.

Preview notices preserve complete installed/original LICENSE/NOTICE bodies, including Lucide's mixed ISC/Feather MIT text. Source-less use-composed-ref@1.4.0 has exact MIT metadata plus full declared terms, explicitly without an invented copyright holder/year. Four manager vendored modules lack exact embedded versions; their conservative original npm notice sources are identified without an exact-version claim. Next-vendored manifests omit versions and are similarly labeled. These concrete inventory/source limitations remain visible in the notice JSON and [source ledger](https://github.com/naeil-dev/naeil-ui/blob/main/docs/design/frontend-sources.md); this is artifact-level notice preservation, not blanket provenance or legal certification. Unknown website-art rights remain unresolved, with those assets excluded.

## Unrun / blocked acceptance

Screen readers, actual Safari, native desktop 200%/400% zoom, actual Windows high contrast, physical iOS/Android devices, all peer-version combinations, deployed behavior and arbitrary consumer overrides were not tested. Local Firefox application checks are blocked as above. Use the [support matrix and manual acceptance checklist](public-ui-support.md) before a release. The manual-only Pages workflow/recipe is prepared, unexecuted, and still requires future explicit publication authorization and protected-environment setup.

## Original frozen source identity

SHA-256 identifies the scope of the original broad run frozen at `80732074349b35d41e31b674f248171101481742`. These historical hashes remain attached to that run; only the affected files have replacement hashes in the focused follow-up below. Orchestration-plan edits are outside executor ownership.

| File | SHA-256 |
| --- | --- |
| `src/lib/design/modal-inert.ts` | `4cb6e1bab2d651d1724c994a2eb03aa2211281c3e2a2f9525a96d31fb152815c` |
| `src/components/ui/select.tsx` | `27aa623255a7992f044a3882ba71450e75942b2d3062daee7b99476a653ed32e` |
| `src/components/ui/dropdown-menu.tsx` | `b9f398c3bff1aa4c7fca7eed16ea4e9a10f7e933d0c67015dda0ccaec13fac02` |
| `src/styles/components.css` | `5bd58b7a6ada0945e9457c9b642dcb4f25283c43d1d341130681b4310c847d1d` |
| `src/stories/component-examples.tsx` | `5a8c33b840047c91f3669a4d1c30c41d9ff3ac363d3b885b1026bc04041f7dd5` |
| `e2e/component-usage.spec.ts` | `90204b7035c5cfb04be5931d026b43a56a0ca265329a22ce476f09958502e980` |
| `playwright.config.ts` | `6621ef61f8b47b90716ae5848cb9fc75458f6176de18a7bce12dd9c5b0a7a28b` |
| `scripts/serve-storybook.ts` | `190d65a8dae7eec2dedfdf574198ea2d603f92ca4a023bfb50b91da0df5a2370` |
| `scripts/bundled-notices.ts` | `6f0514cb7c818c8246f9efdbb339c80b22f0501dfe8754337e90f4cc6d484ddf` |
| `.storybook/manager-notices.json` | `8e13782901d7c31845d313861cb3251dd90e47b38a995be82d67f51daad34f8c` |
| `scripts/check-consumer-browser.ts` | `09144d0bac7b91a1e0524cbb4f18a475d403008ff79cf8563aa2b46716bdb838` |
| `examples/react/src/App.tsx` | `865fbabe907ddad39f22724f744de582075f88e1acdb71c6fd39db5901dfa2c1` |
| `package.json` | `6d327bae94fae383eb37c3c0e9c6f0b8e06d4291b3c77075ed509820ed925665` |
| `pnpm-lock.yaml` | `807b43593d1362afe9278091a5220dc146ecfb46b210f45fb2a68ddb0f56e65c` |
| `.storybook/main.ts` | `162591a47e0b2095be02d24ffb4c13e9be33e5c36e455389c992d7f08ae1ea74` |

## Focused P3 Avatar follow-up — 2026-10-02

The named generic AvatarGroup lacked a supported role, and AvatarGroupCount's generic-div `aria-label` did not convey the additional-member count. The consumer-owned Usage example now supplies `role="group"` and keeps the visual `+3` in an `aria-hidden` span with actual `sr-only` text, `3 additional members`. The Avatar guide documents both compositions. No package component runtime, API, style, token or override changed.

The existing Avatar mobile checks now require the exact group accessibility snapshot, including both named fallback images and the additional-member text; they also check the loaded image, failed-image fallback and visual count. Full axe violations/incomplete attachments remain unsuppressed, and Avatar checks additionally reject any `aria-prohibited-attr` incomplete result. The existing actual Docs checks verify that the rebuilt guide includes the correction.

| Focused command / check | Observed result |
| --- | --- |
| `pnpm build:storybook` | Passed: 11 built Docs/Usage entries, exact notices/fonts and asset boundary; 74 preview + 254 manager notice entries. |
| `pnpm exec playwright test e2e/component-usage.spec.ts --grep avatar --project=chromium --project=webkit` | **6/6 passed (5.6s)**: actual manager Avatar Docs in both engines; 320px light/dark compact Usage in both engines, including loaded/failed/missing image content and localized reflow. |
| Actual snapshot / axe inspection | All four Usage snapshots expose group `Team members`, images `Alex Lee`/`田中 遥`, and text `3 additional members`, with no accessible `+3` duplicate. All four scans have **0 violations** and **no `aria-prohibited-attr` incomplete**. The sole remaining incomplete rule is `bypass` on the standalone story document's `html` (no heading/landmark/skip link); retained for manual review, outside this group/count correction. |
| Actual visual inspection | Opened rebuilt Avatar manager Docs through Aside REPL; inspected its capture and a Chromium capture of the corrected guide section, plus all four Chromium/WebKit light/dark 320px Usage captures. Circular graphics, overlapping group, visual `+3` and localized wrapping remain intact; accessible count text is visually hidden. |
| `pnpm check:types`, `pnpm lint`, `pnpm check:contrast` | Passed; lint retains only the pre-existing website unused-`locale` warning; **40/40** semantic contrast pairs pass. |
| Final `pnpm check:package:boundary` and packed Avatar guide inspection | Passed: the freshly packed consumer-facing guide matches repository bytes and includes the named-group role and actual hidden count text; document links and package boundary pass. |
| `git diff --check` | Passed. |

Focused command logs, browser HTML report with full attachments, extracted axe/snapshot attachments, four Usage screenshots, actual manager Docs snapshots/captures, packed tarball/content inspection and replacement source hashes were retained privately, separately from the original broad artifacts. This checked-in dated command/source record and the reproducible commands in this record describe that correction. The original **111 passed / 1 expected skip** browser result, unit/package-runtime/clean-consumer results and manual/environment limitations are historical frozen evidence; the full browser suite, package runtime build and clean React/Next consumer browser checks were not rerun for this example/packed-guide-only correction. No new screen-reader, Safari or Firefox pass is claimed.

The following SHA-256 values supersede only these affected files for the focused follow-up. Source is frozen for the independent scoped recheck; the orchestrator owns the orchestration record and any later freeze commit.

| File | Focused follow-up SHA-256 |
| --- | --- |
| `src/stories/component-examples.tsx` | `4386e8ca9b7cf58da083258568bb97427bf331c237d52396399202081f1eb04a` |
| `e2e/component-usage.spec.ts` | `ed9f67d33283e07d3c3698a6035ae21a1598cbccaabc7466c0dfb9eddfb75a99` |
| `docs/components/avatar.md` | `5be6ff754f98336a6a5ace144ed7d757ec92929eaf38d0af42c686f102041231` |
