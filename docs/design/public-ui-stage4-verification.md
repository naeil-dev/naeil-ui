# Demand-led extension verification — 2026-10-02

The approved minimal Tabs/Textarea extension and field/native-radio composition guidance are implemented and locally verified. Prepared `@naeil/ui@0.3.0` remains unpublished. This separate record extends reviewed Stage 3 `7d67fbde2370477fc164312106515a354b1a335a`; implementation began on checkout `f1d6a79799c329b09e861123f6da4d1aecb0a3a4`. Stage 3's original/follow-up hashes, 11-family results and limitations remain historical. Its two artifact-location paragraphs received prose-only hygiene edits.

[Demand decision](component-demand.md), [13-family component index](../components/README.md), [composition guide](../components/composition.md), [support/manual acceptance](public-ui-support.md) and [actual source/tool usage](https://github.com/naeil-dev/naeil-ui/blob/81fd395031dc5b20074c4d915a8585360ce2d28a/docs/design/frontend-sources.md) define the scope. No RadioGroup/FormField API, new dependency, token value, business feature or consumer-repository edit was added. Existing public imports, consumer overrides, neutral visual contracts and mixed-entry inert behavior are retained.

## Reproduce from the tested checkout

Environment: Node 22.23.2, pnpm 10.30.3, Playwright Chromium 153.0.8010.12 and WebKit 26.6. `pnpm-lock.yaml` identifies installed dependency versions. WebKit is a test engine, not actual Apple Safari.

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm check:types
pnpm lint
pnpm check:contrast
pnpm build:pkg
pnpm build:storybook
pnpm exec playwright install chromium firefox webkit
pnpm test:browser --project=chromium --project=webkit
pnpm check:package
NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=public-build-fixture pnpm build
pnpm check:types
pnpm check:package:boundary
git diff --exit-code -- src/styles/theme.css src/tokens pnpm-lock.yaml
git diff --check
```

The browser command serves the actual `storybook-static/` output through the configured local preview server. Open `pnpm preview:storybook` and navigate to UI / Tabs or Textarea / Docs and Usage. `pnpm check:package` packs the built sources, inspects the exact export/doc/CSS/notices boundary and independently installs clean React and Next fixtures; it needs network access for uncached dependencies and removes temporary installs. The site build uses explicit non-secret public fixture values and does not exercise OAuth/backend behavior. Full configured browser execution is `pnpm test:browser`; local Firefox remains blocked before application launch as documented below.

## Final observed results

| Gate | Final observed result |
| --- | --- |
| Units | 8 suites, 41 tests passed, including four new native forwarding/export/Radix state and mounting regressions. |
| Types | Passed, including a fresh run after the website build. |
| Lint | Zero errors; one inherited unused `locale` warning in the blog route. |
| Token contrast | All 46 light/dark pairs passed. Generated theme, token JSON and lockfile have no diff. |
| Package build | Bundle, exact deep entries, declarations, import repair and token generation passed. |
| Actual Storybook build | 13 built Docs pages and 13 Usage stories passed artifact checks; 75 actual preview package notices and 254 conservative manager version notices retained. Local fonts/notices present; website public assets excluded. |
| Full local browser suite | **140 passed, 2 expected skips** in Chromium/WebKit (2.2 minutes). Both skips are Chromium-only forced-colors tests in WebKit. No earlier partial/failing run is final passing evidence. |
| Focused correction rerun | 17 passed, 1 expected WebKit forced-colors skip before the final full suite. |
| Clean packed React | Independent Vite production build/types/SSR/CSS, light/dark loaded fonts and readable deliberate font fallback passed; 48 actual production package notices retained. |
| Packed mixed-entry compatibility | Original bundled/deep inert ownership, overlapping close orders, forced unmount, object refs, focus/original-inert restoration and development StrictMode replay passed. |
| Packed extensions | Chromium and WebKit passed core/deep Tabs and deep Textarea, refs, consumer class override, RTL/disabled keyboard, native rows/form/newline/required behavior and 390px checks. |
| Clean packed Next | Production build, types and prerendered observed root/deep imports passed, including both extension controls. |
| Website compatibility | Production build passed; backend/auth/deployment unexercised. |
| Final document/package boundary | Fresh actual packed boundary and document-link checks passed after completing this record/source ledger. |
| Whitespace/source drift | `git diff --check` and token/generated-theme/lockfile drift checks passed. |

The native textarea keeps omitted `rows` at the DOM default of two, vertical resizing, visible label/help/error links, Enter/newline behavior, required validation and editable invalid recovery. Native same-name radios were keyboard/click exercised and submitted through FormData alongside Select; action buttons and `aria-pressed` toggles remain distinct. Tabs checks cover horizontal automatic and controlled vertical/manual activation, disabled skipping, Home/End/loop override, matching roles/IDs, default unmount/draft reset, explicitly hidden force-mounted state retention and packed RTL navigation. There is no invented initial selected value.

## Corrected findings and rendered evidence

Initial runs reproduced a literal escaped newline in the read-only example, focus clipping when a localized tab exceeded its local scroll viewport, and long-word panel overflow under enlarged text. The example now uses an actual newline. Individual triggers are capped to list width and may wrap/grow above density minima; the list stays on one scrolling keyboard axis. Panels break long words. Complete accessible names and visible focus are retained without shrinking text. The guide describes 40/36px minimum heights and a 44px mobile/coarse minimum, rather than fixed single-line geometry.

Rendered checks also exposed an inactive `border-transparent` utility overriding the active selection border; inactive transparency moved to shared component styles so the neutral active border renders while consumer utility overrides remain available. Explicit `leading-normal` prevents Tailwind's text utility from replacing the required 25px control line height. Final focused and full-suite runs above include these corrections.

Across both engines, themes and densities, rendered selected-tab text measured 13.28–13.46:1, selection border against selection 12.01–12.20:1 and against canvas 13.69–15.53:1. Textarea text measured 15.11–17.17:1, placeholder 5.71–8.07:1, normal/error boundaries at least 3.03:1 and focus outlines at least 5.83:1. These are actual opaque computed-color measurements; disabled-opacity styles are not treated as readable metadata.

Extension axe scans reported zero violations. Their retained incomplete results comprise 16 `bypass` records for isolated story documents without application landmarks/headings and eight `color-contrast` records for partially occluded inactive tabs in the local scroll region. These are not erased or counted as automatic passes: application skip-navigation remains consumer-owned, and selected/control contrast is separately computed and inspected. Axe does not establish screen-reader announcement quality or complete offscreen-content contrast coverage.

Actually opened and visually inspected final captures: Chromium light/comfortable desktop Tabs, Chromium dark/compact desktop Tabs; WebKit light/comfortable and dark/compact invalid Textarea; Chromium dark/compact 320px Tabs and WebKit dark/compact 320px Textarea; Chromium forced-colors Tabs and invalid Textarea; packed WebKit 390px extension form/RTL tabs and Chromium blocked-font fallback; actual built manager Tabs Docs in Chromium and Textarea Docs in WebKit. They show restrained neutral selection, wrapped multilingual labels, distinct invalid text/boundaries, visible focus, locally scrolling tab content and stacked mobile actions. Native textarea content may scroll within its chosen rows. Other captures are retained but not claimed as individually visually inspected.

Full logs, browser HTML report/JSON attachments and captures were retained privately. They are neither npm payload nor checked-in evidence; this dated command/source record and the reproducible commands above identify the verified scope. No remote CI result, hosted preview, npm publication or website deployment is claimed.

## Source identities

SHA-256 values below identify the tested runtime, examples and verification inputs. This report does not hash itself; the final private freeze inventory additionally covers every scoped changed file and packed artifact. Later documentation-only integration must identify its own tested commit/results rather than relabeling this runtime evidence.

| Tested source | SHA-256 |
| --- | --- |
| `src/components/ui/tabs.tsx` | `f1a3cad395afa0ce62e0aff7e7342ed6fff112fc4f14480ebecf9038fef1e289` |
| `src/components/ui/textarea.tsx` | `3a4e0363fe83e53795e0cd6a0ed9800392862015240ae62f1cc588fdf334865b` |
| `src/components/ui/index.ts` | `2c2ef2e6953d25c400a8bd5855bf29df6658452a6cba59712324675d4d13512b` |
| `src/styles/components.css` | `fa9ee1e1b96838471f4e9421ada70cb1253987d1417bd3d1e04d385abc37b4b0` |
| `src/stories/extension-examples.tsx` | `097736d45caf3d9c429af0f1dc10a54cc19739f50f7530f2330c301a99746e56` |
| `src/components/ui/tabs.stories.tsx` | `6e5567c898a3f9ebb1caf81f5507afbf0f394e7ea2bf21d2cdca838dad97546a` |
| `src/components/ui/textarea.stories.tsx` | `85eed758be89aacec89d6c3db1f03c174f043d590b4022552dc09254e3ed27f9` |
| `src/lib/design/__tests__/extension.test.ts` | `b6dfebe0eea5e01a6ca61f659d704660131d709d42d63123a7be37ddda06ca31` |
| `e2e/extension.spec.ts` | `7952a7bdab421789ce8f24dc1101db12bbee0ee50c37e9e42988f08871bc96c8` |
| `e2e/component-usage.spec.ts` | `3cc6c7308a083acc472647d6d3d6783b58618b51311ba67987b78b9dea658899` |
| `examples/react/src/App.tsx` | `30a2f8d3ccf763693d6250f2f04c5f1ce1c726e5d08203410c0c2425a36d8f75` |
| `scripts/fixtures/next/app/page.tsx` | `4aea9477428076b8a84f610c5a34e767ffd147aafa9025ecf7491f712b9b0ce9` |
| `scripts/check-consumer-browser.ts` | `f996fffa3bc3be008f39e0f9939146fc67571e0c6c94f5ff90bd122ee7c8a5eb` |
| `scripts/check-consumers.ts` | `a255263ed81cce4131d4d53c403347117e0c1c41b4443efb47ae833a922ee165` |
| `scripts/check-package.ts` | `3563e55d58a6320c829fc78b8b12e34a3c5eb5da44981823a38a1432ba58c4ec` |
| `scripts/check-storybook.ts` | `c37e3a71c5f0fc97176e69505a34c06d2131d9007fe7f2295db5ab55c1b82a5a` |
| `scripts/check-contrast.ts` | `1ffa7b157cf5b4fd675075b08dc6c3262aa80cbf47ee36bc3a6540e53e795a89` |
| `package.json` | `4a9eef65a9481ae89cbe685c4f943ac72a28b42559dfb1970079eae8851b4ee1` |
| `tsup.deep.config.ts` | `9ea59bc77b1a5ef0ca13b15c8f047f12166107f480b952b1bfed316111767497` |
| `tsconfig.build.json` | `96879c865714d3eae2c8551afd5fcc7519cc4673e2275bd3de88296da9bef6d0` |
| `docs/components/composition.md` | `62a7b8f799e555099385e79f2f51daf5c89720c0406a9dbe3e8152072f2c04de` |
| `docs/design/component-demand.md` | `0b36339d49f3cea5e613681f8a3272feae4872440508e81d67608ec315ed13f1` |

Installed Radix Tabs 1.1.13 `dist/index.js` SHA-256: `07fc8818ac9e6968155e50eec2ff16f89330cda1034b56b3b91edc606760fb78`; `dist/index.d.ts`: `7a14bf21ae8a29d64c42173c08f026928daf418bed1b97b37ac4bb2aa197b89b`. These are the installed files inspected for primitive defaults/forceMount semantics, not a claim of new copied visual code. Repository frontend-reference-workflow revision 2026-10-02.1 entry SHA-256: `ecada9f24d5ebbce5ac207d5225200ca2d76d08ea9f9f1d3b46d4e956a17d7b8`; its verification guidance: `b504804320724354584885782fe5522ca002028e647b3e146743649cb0a50efe`.

## Remaining limits

Local Firefox's inherited `Could not find profile folder` launch block was not freshly rerun for Stage 4; no Firefox application pass is claimed. CI retains all three configured engines, which is not evidence of a remote passing run. Actual Safari, NVDA/VoiceOver or other assistive technology, physical iOS/Android, actual Windows high contrast and native desktop 200%/400% zoom remain manual. 320px/390px viewports, 200% CSS root-text scaling, CSS zoom and Chromium forced-colors media emulation are bounded substitutes, not those manual acceptances. No physical IME session, every locale/glyph/peer version or consumer-specific route/draft behavior is certified. Site-art rights findings carried forward in existing notices remain unresolved; excluding website assets does not clear their rights.

## Documentation-only link follow-up — 2026-10-02

The full-runtime results and source hashes above belong to the tested implementation frozen at **`81fd395031dc5b20074c4d915a8585360ce2d28a`**. This later destination-only pass pins maintained repository navigation/source-authority links and the Storybook guide URL base to that exact commit. Original upstream/historical URLs, canonical repository/homepage links, Stage 3 evidence and all component runtime/style/API/dependency/export contracts remain unchanged. The original demand SHA-256 `0b36339d49f3cea5e613681f8a3272feae4872440508e81d67608ec315ed13f1` and composition hash in the original table still identify their **81fd** bodies; they are not replacement hashes for this follow-up.

Rendered inspection initially found 84 unresolved sibling Markdown link instances across 26 Docs pages: the existing formatter handles `./`, `../` and `common.md`, while bare names such as `composition.md` remained relative to the preview server. Affected sibling destinations now use explicit `./` paths; the formatter's behavior is unchanged. Future release policy requires versioned navigation/source links to the tested revision and rebuilt Docs/tarball target verification.

Scoped final checks: rebuilt Storybook passed **13 Docs + 13 Usage** and the existing notices/fonts/site-asset boundary; **26 rendered Docs tests passed** in Chromium/WebKit. Separate actual DOM inspection checked 288 pinned repository link instances (22 distinct destinations) across those 26 pages, with zero unresolved local Markdown or wrong-revision targets. Static inspection checked 26 maintained commit destinations and 129 relative destinations; every pinned target exists in the exact local Git tree. This establishes source identities, not remote HTTP availability before the commit is pushed. Actual new Tabs Docs/Chromium and Textarea Docs/WebKit captures were opened and inspected. Types passed; lint had zero errors and the inherited blog warning; whitespace and unchanged-runtime checks passed. A fresh packed-guide boundary check passed after this record was completed. Original broad browser, units/contrast and clean-consumer results were not rerun or relabeled for link destinations; their prior source binding and manual/environment limits remain in force.

Reproduce the affected rendered/packed checks from the follow-up source:

```sh
pnpm build:storybook
pnpm exec playwright test e2e/component-usage.spec.ts --grep 'actual built Docs guide' --project=chromium --project=webkit
pnpm check:types
pnpm lint
pnpm check:package:boundary
git cat-file -e 81fd395031dc5b20074c4d915a8585360ce2d28a:src/components/ui/tabs.tsx
git cat-file -e 81fd395031dc5b20074c4d915a8585360ce2d28a:CONTRIBUTING.md
git diff --check
```

For each maintained destination, inspect its Docs anchor `href` and use `git cat-file -e COMMIT:PATH` as illustrated above to check that exact target; relative repository/tarball links must resolve within their respective payload. Full per-file replacement hashes, DOM target inventories, check logs, packed artifact and captures were retained privately in a separate follow-up inventory. Key replacement source identities are below; the report does not hash itself. No publication, deployment, remote CI, Firefox or new manual acceptance pass is claimed.

| Follow-up source | Replacement SHA-256 |
| --- | --- |
| `docs/design/component-demand.md` | `e91aa9fa452620a1bb50e37bf24bf9856454b2bd46bf2440ee4374c5b338b0fc` |
| `docs/components/composition.md` | `6e034cb2f47d0dcdc360cac326114cd61fc443504aea2757a041eb8c465c40da` |
| `src/stories/guide.ts` | `74f093522a08c7059f464f47d9bf053b0e571c5864efb325637a190723668409` |
