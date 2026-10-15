# Independent shared-header source/image review

Reviewer: separate `/root/shared_header_final_review` agent, 2026-10-15. This is a pre-freeze review of actual source, archives, recorded results and opened images. No implementation/test changes, installs, builds, tests, servers, credentials, private data, user tabs, publishing or deployment were performed by this reviewer. Only this report was written.

## Verdict and outstanding gates

No required source or visual correction found in the reviewed implementation and images. The website and estimate genuinely use the same complete header composition. This verdict does not certify the later frozen archive, final standalone test results or an installed/public release.

| Severity | Finding / evidence | Disposition |
| --- | --- | --- |
| P1 verification gate | Storybook recheck1 ended with 61 pass / 1 WebKit theme failure; the subsequent strengthened stability RED also reproduced a reset in Chromium. Evidence: `storybook/recheck1/browser.log`, `stability-red.log`, `.storybook/preview.tsx`. | Closed for the corrected fixture: inspected updated synchronization (apply a changed Storybook global once), strengthened delayed-state assertion, `storybook/recheck2/browser.log` 62/62 pass and its passed `.last-run.json`. Initial failures remain historical evidence. No package runtime change was involved. |
| Pending final verification | Product `full/results.json`, complete navigation evidence and fresh login screenshots were unavailable at the initial report checkpoint. | Final suite result and missing image checks must be reconciled before release acceptance. Generated files alone are not reviewer inspection. |
| Retained limitations | 256 raw incomplete nodes in the product 48-route matrix, 8 shell-menu incomplete nodes, and earlier unresolved accessibility/manual/device findings. | Remain open; zero reported Axe violations does not resolve these. |

## Scope and source findings

Read the home guard, shared and estimate AGENTS, both DESIGN files, estimate PRODUCT/STATUS, current shared-header specs/plans in both worktrees, component/provenance guidance and the review brief. Reviewed the actual header/catalog, Nav/NavWrapper/SiteControls, generic Navigation, shared CSS, Storybook provider/story, relevant unit/browser tests, package entry/build configuration, estimate AppFrame/CSS integration and its diff from the supplied base.

- `src/components/naeil-header.tsx` owns Logo, catalog rendering, translated header controls, toolbar/auth placement and the fixed frame. `naeil-header-content.ts` owns five canonical projects, three header dictionaries and official artwork references. Website NavWrapper imports this module and supplies routing/locale/auth state. Estimate imports the packed `/naeil-header` and `/ui` SiteFooter and removes approximately 800 lines of copied chrome. This is whole-header commonization, not a menu/style copy.
- Generic `src/components/ui/navigation.tsx` is unchanged from the shared base. Legacy Nav retains public props, custom brand/frame/labels, consumer next-intl project/nav translations, arbitrary locale fallback, explicit native external links and current-project overrides. A custom projects list bypasses the canonical catalog; hidden projects do not invoke project lookups.
- Default absolute destinations use the supplied Link; estimate's unchanged GuardedLink routes both cross-origin and same-origin navigation through the existing async save guard. Header brand, grouped projects and Blog reach that adapter. Native modified clicks remain native. Explicit `external` overrides retain generic native-anchor semantics; documented `onNavigate` interception is required when a consumer opts into such overrides. Estimate does not set those overrides.
- `onNavigate` receives brand and menu events and can prevent native navigation. Header brand handlers run the supplied `brandLinkProps.onClick` before `onNavigate`; an already-prevented event stays prevented. Estimate's existing GuardedLink delays its passed callback until save permission and then performs routing; it does not offer a separate callback-cancellation contract. That behavior predates this extraction and has not been changed or advertised as new functionality.
- SSR uses a false server snapshot and disabled theme button until mount. `useTheme` has no framework/backend import; a consumer's next-themes provider is documented as required for effective switching. Missing provider renders safely via next-themes' no-op default; this review does not describe an enabled no-op control as functional theme support. Corrected actual-provider browser evidence tests live switching.
- Portalled Popover/Dialog keep generic Radix focus/dismissal behavior and globally addressable shared styles. Hover travel tolerance, keyboard takeover, Escape/focus return, touch/focus trap, locale selection, reduced motion and blocked-image content have explicit passing Storybook cases. This reviewer read their recorded output, rather than rerunning them.
- Shared header remains 1280px border-box / 65px fixed chrome with 24px inner gutters, desktop 160px brand reservation and 16px gap. Product body/footer remain max1600px, company sidebar252px, and settings/purpose widths stay consumer-owned. New fixed-header offsets cover shell padding, sticky summary/sidebar/settings save and relevant focus/section margins. No tokens were changed.
- Estimate GuardedLink and logout implementations are byte-identical within the AppFrame diff; storage, money calculations, schema, raw-draft/autosave state and session logic have no source change in the reviewed diff. Navigation tests explicitly exercise invalid raw values, held save acknowledgements, 401/409/503, all five projects, brand/Blog, modifier/middle clicks and logout recovery. Their final full-run status remains a separate gate.
- Artwork references are official `https://naeil.dev/images/*.png`; visible captions/destinations do not depend on image success. The archive contains zero PNG/JPG/WebP files. THIRD_PARTY_NOTICES retains unresolved artwork provenance and network dependency. Repository MIT is not artwork clearance. Estimate advertises neither extra languages nor OAuth/SSO.

## Identity checked independently

Both HEADs still identified the supplied bases during review: shared `b667a8483d711376e23fae881cb90ce123a090df`; estimate `040d8cf653932689a5f8cd78521793cb2a0f73af`. Reviewed changes were working-tree content, not a frozen committed release.

Recomputed SHA256 for all 18 paths in current `review-source-hashes.json`; every path matched. The Storybook preview changed during the test-owner correction; its current hash below was reread and checked after that correction.

| Shared file | SHA256 |
| --- | --- |
| `src/components/naeil-header.tsx` | `e66bcda95edea9064d504325512027a134bd3e160fd20002352e5868871d128f` |
| `src/components/naeil-header-content.ts` | `0ca6d2c52375eca7c33aabe225818c9c706cae50aae71ccecec81203d9db6093` |
| `src/components/nav.tsx` | `8ed823a8820e971f1451662acd0963f18299c6779c9acd9f66e2e83528f738cb` |
| `src/components/nav-wrapper.tsx` | `f76ef9b8a41b697899d5b84f1308509b3aaace17bda6f78b2aa3b4e2a2082881` |
| `src/components/site-controls.tsx` | `13c5a9535114db683346cc4f64e642a5f76f225e18a3f415dd87680a24c56244` |
| `src/styles/components.css` | `3ab63be0b863d9ed113a574b5e711d391fbbf891518351b4f3205f4753f68cfb` |
| `.storybook/preview.tsx` | `27e1b133de0c9e4ef3d0f2556fd1075b07b2ffffc920240c0e21de2ac9d03581` |
| `src/components/naeil-header.stories.tsx` | `16874d9151c991d1d03c45f5f9b1d953e4bea8e3c02f4d779c8f51e101e6ffc2` |
| `package.json` | `4b3997c649a3056b9066731ceec8bf32150966ebb6e7e0d2bc98370a81e119f8` |
| `tsup.config.ts` | `be511c8e08098b30a2c24fbd01ea53cdd3ab77f8a9cad04d080df25bddc0ae14` |
| `tsup.deep.config.ts` | `dcdce5845b875f3cf41ed4a2e92d3f1e64985cd87372b4f59301c1f362267dd1` |
| `tsconfig.build.json` | `4fe5da9e98500b391f2cf87b7669db0d69bf5ce4782491dee24e9de760ed7baa` |

| Estimate file | SHA256 |
| --- | --- |
| `src/components/app-frame.tsx` | `8833d78a90f21192f459e6b79d4261575cee7aaceb5db3636eccc55e43c9a641` |
| `src/app/globals.css` | `fa3d5bef274beb94aa578b1957f6439e0dbed75c37842c6cbd56a107f8db7c6f` |
| `src/features/estimates/estimates.css` | `d3fe7a916551ea68b4bf303f1c9f939b6560b74ef847401253876eee603829ba` |
| `src/features/estimates/editor-navigation.css` | `5d4b2f4b96ae5f859d7b417e49662ce26c31a6afabc0bca03e57d243b834624f` |
| `src/features/settings/settings.css` | `04f87d7257c9899eaa22c69d09f500be7418922a05c5effd2536c88c5b0b36e6` |
| `scripts/package-standalone.mts` | `914ddf1a008d25a1611777d9996c9684fda2eca47e5d1350cbc93de0d5792efb` |

Observed estimate candidate archive SHA256 `7259f34a5d2d4f683a711a29fc1574879bb7986aca1a20943fc5b0ccec940802`; package.json `4e42ce52559cd24079fc5bf70535a3b9cd7a5015265f31e878717215533defe3`; pnpm-lock.yaml `3ef2c83eab4a3dbe1047a70c0a7065d325b186e4ed641973be830a1ef51b4f7c`. All are review-time identities, subject to final packaging/documentation changes.

Inspected tar contents directly without extraction/writes. Packed CSS, built header entry and deep header/catalog were byte-identical to shared current dist. Traversed the header entry's three reachable chunks: imports are React, next-themes, Radix, Lucide, class variance/clsx/tailwind-merge, with no Next, next-intl, Supabase or site auth/backend import. Optional Next peers remain optional in package metadata. Existing clean packed React/Next log reports pass. Final freeze/source/archive provenance still belongs to main.

## Actual images opened

Paths below are relative to the indicated evidence root. Every listed image was opened through the image viewer; other generated screenshots were not automatically treated as reviewed.

Shared evidence root: `/Users/jaymini/.paseo/worktrees/28nele6j/shared-naeil-header/docs/evidence/shared-naeil-header-2026-10-15`.

- All eight `image-review/{ja,ko}-{390,768,1440,2560}-menus.png` contact sheets, each showing both themes and live/candidate. This covers 32 underlying menu conditions through sheets; it is not a claim each underlying PNG was opened separately.
- Actual `live/` and `candidate/` header PNGs for every `{ja,ko}-{390,1440}-{light,dark}` combination: 16 actual files.
- Actual `live/` and `candidate/` footer PNGs for `ja-390-light`, `ja-1440-dark`, `ko-390-dark`, `ko-1440-light`: 8 actual files.
- Under each `storybook/recheck1/screenshots/` and `storybook/recheck2/screenshots/`: `chromium-light-1440-menu.png`, `webkit-dark-390-menu.png`, `webkit-dark-2560-header.png`, `chromium-light-768-header.png`: 8 actual files. Recheck1 screenshots are historical; recheck2 validates the corrected provider fixture.

Estimate evidence root: `/Users/jaymini/.paseo/worktrees/1bnldk74/estimate-v1/docs/evidence/shared-naeil-header-2026-10-15`.

- `full/shell_evidence_dir/shell-{light,dark}-{390,768,1440,2560}.png`: all 8 conditions, header/list/footer including focused brand; desktop1440 captures show the open shared menu.
- `full/shell_evidence_dir/menu-{light,dark}-390.png`: mobile one-column catalog, theme and actual logout, with no fake locale selector.
- `targeted-recheck1/shared_header/editor-1440-dark.png`, `calendar-2560-dark.png`, `settings-1440-light.png`.
- `full/calendar_preview_acceptance_evidence_dir/frame-saved-editor-light-390.png`, `long-table-viewport-light-390.png`, `long-project-viewport-light-2560.png`.
- `full/company_layout_evidence_dir/dense-list-light-390.png`, `dense-list-light-768.png`, `dense-list-dark-1440.png`, `dense-calendar-light-390.png`, `dense-calendar-dark-1440.png`, `editor-dark-1440.png`, `settings-light-2560.png`, `sticky-dark-390.png`.

Observed result: live/candidate header alignment, logo size, typography, catalog order, descriptions, badges and desktop/mobile composition match in inspected conditions. Product body remains wider than branded chrome on wide screens. Long multilingual names wrap without moving global navigation. Sidebar/weekly/settings and sticky controls remain visually separate from fixed chrome. Products deliberately have different auth/locale slots; the estimate's Japanese-only state is explicit. Full site footer and compact product footer retain their respective content.

## Recorded verification assessed

Read current 16-condition live/candidate measurements and comparison: all16 have no anchor difference over1px, no root overflow and loaded decorative images. The visual conclusion above also uses opened images; the JSON alone does not establish parity.

Read product targeted geometry and its assertions: 1280px header frame,65px height,1600px main/footer and stable route anchors, accounting for the15px reserved scrollbar gutter. Read completed `full/company_layout_evidence_dir/matrix.json`: 48 records / 6 routes per condition, header height65 throughout, brand x24 on390/768, x96.5 on1440, x656.5 on2560, y10 throughout; zero root overflow and zero Axe violations. Its256 raw incomplete nodes remain unresolved. `dense.json` has8conditions, and shell checks have10records/zero violations with8raw incomplete menu nodes.

Read shared unit output65pass/12files, token-contrast output (light/dark pairs pass), clean packed-consumer recheck output, corrected Storybook62pass and relevant tests/source. No independent execution of these checks is claimed. The browser output supports portal travel, keyboard/touch/focus, SSR-mounted controls, blocked imagery and the actual Docs surface. Product full suite was still being populated at the report checkpoint; no full pass is inferred from screenshots or source.

## Remaining boundaries

Main must reconcile final frozen source/archive/package/lock identities and affected checks after final packaging; this report is not a frozen-commit or installed-artifact attestation. Product final full-suite results and missing navigation/login image evidence require completion/review. Publishing, shared-main merge, site deployment and estimate local/public replacement are separate main-owned operations and are not certified here.

Retain Firefox profile-launch environment block, native Safari/hardware/assistive technology/zoom/virtual keyboard, exhaustive manual rendered contrast and historical incomplete observations. Candidate site evidence uses signed-out local dummy configuration; real OAuth/SSO and fresh public-owner edit/save are unverified. Official artwork remains a network dependency with unresolved redistribution provenance. No external design tool was run by this reviewer.
