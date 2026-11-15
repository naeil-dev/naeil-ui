# Screen frame contract — 0.17.0 implementation receipt

Scope: approved post-audit PLAN stage 2 rows 1–6, D1–D6. Authority: DESIGN.md “Screen frame contract (2026-11-15)”. Worktree: `frame-0170`, branch `feat/frame-contract-0.17.0`. This is local implementation evidence. Actual naeil.dev/four-service/private-network parity is **not measured** here. Package version remains 0.16.0; no push, PR, tag, release archive, publication or deployment.

Implementation commits: `eb060f9` (shared frame, fonts, tokens and regressions), `b386f68` (catalog shell, localized errors and capture tooling), `1623b4e` (Firefox subpixel assertion). The final receipt/CHANGELOG commit is identified by the handoff and git history.

## Implementation and acceptance

“Met” below means the specified local implementation acceptance, not production rollout acceptance.

| Task | Main files | Local acceptance | Result |
| --- | --- | --- | --- |
| D1 frame | `naeil-shell-core.tsx`, `components.css`, `tokens/ui.json`, shell/frame browser fixtures | One `.ui-service-shell[data-naeil-shell]`; `min-height:100dvh`, column, growing main. Short footer bottom 900/844px, viewport gap **0px**; long content→footer **96px**. No-footer main bottom 900/844px. | **Met** in globals/split × ko/ja/en × 1440×900/390×844, Chromium/Firefox/WebKit. Focused suite: 43 passed, 2 CDP-only skips. |
| D2 rendered fonts | `build-fonts.ts`, `tokens/typography.json`, generated `fonts.css`/`typography.css`, updated specs/assertions | Japanese Latin/digits actually use Pretendard; Japanese glyphs use Noto. | **Met**, Chromium CDP `CSS.getPlatformFontsForNode`. Built-site `400 Regular — 本文`: Pretendard Variable **13 glyphs**, Noto Sans JP **3 glyphs**. The Noto “Thin” platform family label is variable-font metadata; CSS weight is 400. |
| D3 font entry | `package.json`, `build-fonts.ts`, site/Storybook/examples/consumer checks, font notices | Consumers import only `@naeil/ui/fonts.css`; Korean pages get ≤1 Noto-definition stylesheet and no Noto font file. | **Met locally**: all four Korean route/width captures request **1 stylesheet containing Noto definitions, 0 Japanese font files**. Clean packed Next/Vite results are scoped below; the normal package gate is blocked by external artwork. |
| D3 chrome tokens | `tokens/typography.json`, `build-tokens.ts`, generated `typography.css` | Actual chrome typography is token-generated, preserving pixels. | **Met**. Preserve exceptions **20/28**, **16/24**, **14/20**, supporting/footer **14/21.875**. They intentionally differ from content roles 20/29, 16/25, 14/22. No silent typography role substitution. |
| D4 base text | `build-tokens.ts`, `typography.css`, `components.css`, `globals.css` | Split-import body line height 25px. Semantic colours/font stack identical to globals. | **Met**, all three engines: **25px**. Explicit generic body override still yields 18px/36px, serif and RGB(1,2,3); canonical chrome remains 16px. |
| D6 errors | `naeil-locale/server.ts`, generated error styles, locale `not-found.tsx`, ko/ja/en messages | Dark error document and return links; localized missing-blog page inside shell. | **Met locally**: fallback background **RGB(11,12,14)**, foreground **RGB(239,240,243)**, 25px baseline and `/`, `/ko`, `/ja` links. Six localized missing-post captures each have one frame/header/footer and a visible localized home link. |
| D5 site | locale layouts, `nav-wrapper.tsx`, `nav-server-wrapper.tsx`, `auth-slot.tsx`, site landing CSS | `/projects` uses the same frame; Projects/Blog and no service suffix. | **Met locally**: one shared frame in all six short-page captures. `service="main"` is the only new shell profile input. Account session/busy/request-lock/logout state remains above the shell. |

The site retains a root theme provider for siblings such as Toaster; the shell's nested provider reuses it. The content layout no longer repeats frame padding or main. Landing artwork stays site-owned: an absolute section is anchored to the full shell, while its placeholder preserves flow and main keeps the existing content cap. Three engines × 390/1440/2560px confirm hero x/y 0, height 844/900px, width equal to the actual available root width, main ≤1600px, no horizontal overflow and a header still fixed after scrolling. Chromium's reserved 15px gutter produces available widths 375/1425/2545px; Firefox/WebKit reported 390/1440/2560px.

## Font delivery decision and generic consumers

The first font-entry implementation referenced dependency paths in CSS URLs. Vite and Next Turbopack accepted them, but clean Next webpack treated them as relative paths and failed. The final build instead copies only the **216 referenced WOFF2 files, 8,181,044 bytes**, byte-for-byte to `dist/fonts/`; the generated public stylesheet uses package-relative URLs. Source font packages remain development dependencies because the packed artifact delivers the bytes itself. Consumers install/import neither font package and need no resolver configuration. Generated binaries stay out of git.

`@fontsource-variable/noto-sans-jp@5.3.0` replaces four weight stylesheets with one weight-axis definition set. The previous four independently gzipped stylesheets total **127,688 bytes** (400:31,919; 500:31,922; 600:31,930; 700:31,917). Variable `wght.css` is **31,249 gzip bytes**, a 75.5% reduction. The complete generated font entry, including Pretendard and its Latin alias, is **166,908 raw / 45,301 gzip bytes**. These are source-CSS compression measurements, not a production transfer-size claim. `unicode-range` controls font-file requests. Static Noto remains only for immutable historical fixtures. Package/consumer OFL notices are retained; no font binary is modified.

Generic split consumers now receive semantic body background/foreground, the shared stack and 16/25 instead of browser/Tailwind defaults (commonly 16/24). `:where(...)` in `@layer base` keeps explicit consumer styles in control. Generic Navigation/SiteFooter and legacy Nav/Footer retain their APIs and supported overrides. The shell is the opt-in protected frame. `theme.css` alone and JS-only imports do not acquire the body baseline or fonts.

## Chrome baseline recapture

Command:

```sh
pnpm exec tsx scripts/build-chrome-fixtures.ts
pnpm exec tsx scripts/capture-chrome-baseline.ts /tmp/naeil-0170-baseline-final --fixtures http://127.0.0.1:6190
```

Evidence: `/tmp/naeil-0170-baseline-final/receipt.json`, pair JSON and header/footer/viewport PNGs. Chromium 153.0.8010.12, dark, signed out, ko/ja/en × 1440×900/390×844 × short/long: **12 pairs**. Independent registry 0.16.0 archive SHA-256: `1c36fcd5aa3147a75e83c60b1e2e1b4289898e0d8d868f758f55b0e963d8321e`. Compiled fixture/CSS/font hashes are in the receipt; its source HEAD predates the implementation commits, so those content hashes identify the checked dirty source.

- Strict normalized DOM equality passes after removing only the new frame wrapper, version attributes and generated IDs.
- Korean/English: **0 chrome style/geometry differences**, using the existing 0.01px float tolerance.
- Japanese raw comparisons: **68 differences per desktop row / 60 per mobile row**. They are font-family plus Latin-derived width and brand text trim geometry (226 family, 22 width, 4 y and 4 height differences across four rows).
- Apply only the approved D2 policy **outside** the extracted historical fixture, then compare again: **0 remaining differences** for all Japanese rows. Colour, font size/weight, line height, spacing and structure remain checked. No broad Japanese-difference exemption is accepted.
- Short candidate footer gap **0px**, long content→footer **96px**. `CHANGELOG.md` records this structural/font delta under unreleased 0.17.0. Frozen `docs/releases/*`, tags and `brand/naeil/<version>/` are unchanged.

## Commands and actual outcomes

Logs live under `/tmp/naeil-0170-*`. The normal gates retain their existing assertions. A failed external-artwork check is not reported as a pass.

| Command | Actual result / evidence |
| --- | --- |
| `pnpm install --frozen-lockfile` | **PASS**, first action in the designated worktree. |
| `pnpm lint` | **PASS**, 0 errors / 3 existing warnings (historical logo/rollout scripts and rejected-auth route). `/tmp/naeil-0170-lint-closeout.log`. |
| `pnpm check:types` | **PASS**, exit 0. `/tmp/naeil-0170-types-closeout.log`. |
| `pnpm test` | **PASS**, 61 files passed / 1 skipped; **1,243 tests passed / 6 skipped**. `/tmp/naeil-0170-unit-final.log`. |
| `pnpm check:contrast` | **PASS**, lowest margin **0.33**, control boundary. `/tmp/naeil-0170-contrast-final.log`. |
| `pnpm build:pkg` | **PASS**, including token/font generation and locale package boundary. `/tmp/naeil-0170-build-pkg-closeout.log`. |
| `pnpm check:package` | **FAIL / external dependency blocked**. Packed boundary, clean React type/build/SSR/conformance, notices and light/dark form/font checks pass. Whole-header check stops at `https://naeil.dev/images/whale.png`: browser image fails without a usable response; direct HTTP probe returns Vercel **403**, `retry-after:30`. `/tmp/naeil-0170-package-check-5.log`. |
| Supplemental consumer run | **PASS**, exit 0, for all remaining clean React/Vite and Next webpack/Turbopack base/globals/split builds, types/SSR and actual production frame/lock interactions. Same `check-consumers.ts` source with only the `checkConsumerBrowser(core)` call omitted in a temporary, uncommitted copy; logs explicitly mark that call **NOT CHECKED**. The omitted function includes the packed whole-header browser check, not just one network request. This is **not** a passing `check:package`. `/tmp/naeil-0170-consumers-supplemental.log`; diagnostic copy `/tmp/naeil-0170-consumers-local.ts`. |
| `pnpm build:storybook` | **PASS**, including the literal public `@naeil/ui/fonts.css` import; 16 UI + 2 Brand Docs pages, **80 actual preview package notices / 254 manager notices**. `/tmp/naeil-0170-storybook-closeout.log`. |
| Final built Storybook check | **PASS**, Japanese estimate shell at 1440/390px on Chromium/Firefox/WebKit: **6 passed**. `/tmp/naeil-0170-storybook-browser-closeout.log`. |
| `pnpm build` | **PASS**, Next 16.1.7 production build. `/tmp/naeil-0170-site-build-confirmed.log`. |
| `pnpm test:browser` | **FAIL**, all three engines completed: **1,608 passed / 58 skipped / 20 failed**, 36.1 minutes. Failure breakdown below. `/tmp/naeil-0170-browser-all-final.log`; traces/screenshots under `test-results/fixture-6197/`. |
| `NAEIL_UI_CHROME_ONLY=1 NAEIL_UI_FIXTURE_PORT=6193 pnpm test:browser e2e/frame-contract.spec.ts` | **PASS**, Chromium/Firefox/WebKit: **43 passed, 2 skipped** (non-Chromium CDP). `/tmp/naeil-0170-frame-browser-final.log`. |
| Focused chrome-pair regression | **PASS**, 16 tests: representative Japanese mobile/desktop plus every generic/compatibility profile × globals/split. `/tmp/naeil-0170-chrome-pairs-regression.log`. |
| Bounded full-suite failure rerun | **PASS**, 9 tests across Chromium/Firefox/WebKit, one worker: serialized measurement, timer-reopen/no-preference and desktop hover bridge. `/tmp/naeil-0170-browser-bounded-rerun.log`. |
| Skip-link isolated rerun | **FAIL**, Chromium/Firefox pass, WebKit fails the first-Tab focus assertion: **2 passed / 1 failed**. `/tmp/naeil-0170-skip-link-rerun.log`; trace under `test-results/fixture-6199/`. |
| `node --test scripts/site-auth-slot.test.mjs scripts/consumer-font-notices.test.mjs` | **PASS**, 3 tests. `/tmp/naeil-0170-site-regression-final.log`. |
| `pnpm check:package:boundary` | **PASS**, **418 files / 9,878,186 unpacked bytes**, including all 216 unchanged font assets and required notices. `/tmp/naeil-0170-package-boundary-closeout-2.log`. The first closeout attempt correctly rejected a CHANGELOG link to a repository-only receipt; it now names that repository path without a broken packed-document link. |
| `pnpm exec tsx scripts/build-fonts.ts --check`, `git diff --check` | **PASS**, unchanged generated font CSS/binaries and no whitespace errors. `/tmp/naeil-0170-fonts-drift-closeout.log` (success is silent). |
| `pnpm exec eslint e2e/naeil-conformance.spec.ts` | **PASS**, final subpixel assertion patch. `/tmp/naeil-0170-conformance-test-lint.log`. |
| Built-site `pnpm start --hostname 127.0.0.1 --port 6186`, `pnpm exec tsx scripts/capture-frame-preview.ts` | **PASS**, 29 measurement rows / 53 PNGs including the required short/long set and wide-landing checks. `/tmp/naeil-0170-preview-confirmed.log`, `/tmp/naeil-0170-site-server-final.log`. |
| Frozen/boundary diff against `f0640de` | **PASS**, no changes in `docs/releases/`, `brand/naeil/`, `measureNaeilPage`, static/runtime checker implementations or `live-artwork.ts`. `package.json` still reports **0.16.0**. |

Local site builds/start use deliberately synthetic settings `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:9` and `NEXT_PUBLIC_SUPABASE_ANON_KEY=naeil-local-preview-placeholder`; no `.env*` was read. The preview has no real authenticated session.

The full browser command is:

```sh
NAEIL_UI_STORYBOOK_PORT=6187 NAEIL_UI_FIXTURE_PORT=6197 pnpm test:browser --fully-parallel --workers=6
```

The bounded rerun command was:

```sh
NAEIL_UI_STORYBOOK_PORT=6188 NAEIL_UI_FIXTURE_PORT=6198 pnpm test:browser e2e/naeil-conformance.spec.ts e2e/canonical-chrome.spec.ts e2e/naeil-header.spec.ts --workers=1 --grep 'exported measurement|timer-reopen.*no-preference|desktop hover bridges'
```

The final built Storybook command was:

```sh
NAEIL_UI_STORYBOOK_PORT=6200 NAEIL_UI_FIXTURE_PORT=6201 pnpm test:browser e2e/naeil-shell.spec.ts --workers=1 --grep 'shell rhythm estimate/ja/(1440|390)/OS-dark'
```

Earlier package attempts exposed notice assertions and the webpack font-path defect; both were corrected. Earlier browser attempts exposed obsolete element-wide Noto expectations and the short-page exact-gap assumption; assertions/fixtures were updated to the approved contract. The initial complete Chromium run was 530 passed / 32 failed before the comparison-policy correction; the targeted 16-test rerun passes. Interrupted earlier runs are not acceptance evidence.

Full run by engine:

| Engine | Passed | Skipped | Failed |
| --- | ---: | ---: | ---: |
| Chromium | 554 | 0 | 8 |
| Firefox | 532 | 27 | 3 |
| WebKit | 522 | 31 | 9 |

The 20 failures are retained as follows:

- **16 remote-image failures**, Chromium/WebKit × light/dark × 390/768/1440/2560. All stop at the existing `naeil-header.spec.ts:70` assertion that the official whale image is loaded. Firefox's eight corresponding cases pass. No image stub or assertion change was added.
- **One Firefox numeric assertion**, expected exactly 96, received **95.99996948242188** after the font-size mutation changes flex geometry. The final test uses the existing subpixel precision (`toBeCloseTo(96, 2)`). Measurement/checker implementations are unchanged. This corrected test passes on all three engines in the bounded nine-test rerun.
- **Two Firefox interaction failures**, timer-reopen/Escape leaves the sheet visible and desktop hover bridge cannot find the panel. Both pass in the bounded one-worker rerun on all three engines. Their implementation was not changed; the full-run result remains failed.
- **One WebKit first-Tab focus failure**, reproduced in the isolated run. Local diagnostics also reproduce it on a fresh minimal page containing only an anchor, button and main, on the built site, and with the shell frame removed or its flex layout disabled: focus remains on BODY and `document.hasFocus()` becomes false after Tab. Directly focusing the skip link then pressing Enter focuses main on both Storybook and the built site. This evidence does not isolate the exact browser/platform cause and does not establish working sequential keyboard navigation in this WebKit environment. No Mac/browser preference or test assertion was changed to hide the failure.

The skip-link rerun command was `NAEIL_UI_STORYBOOK_PORT=6189 NAEIL_UI_FIXTURE_PORT=6199 pnpm test:browser e2e/naeil-shell.spec.ts --workers=1 --grep 'skip link focuses'`. The full suite's 58 skips include existing engine-specific guards; they are not all CDP skips.

## Screenshots and review

`/tmp/naeil-0170-preview/measurements.json` records final URL, locale, viewport, signed-out state, browser, theme, body metrics, frame/footer measurements and font delivery. English canonical URLs are `/projects` and `/design`; Korean/Japanese use their locale prefixes.

- Required set: short `/projects` and long `/design` × ko/ja/en × 1440×900/390×844. Each has `*-viewport.png`, `*-full.png`, `*-footer.png`.
- `not-found-LOCALE-WIDTH.png`: missing blog post for all six locale/width combinations.
- `japanese-latin-digits-closeup.png`, `locale-fallback-error-dark.png`.
- `landing-ENGINE-WIDTH.png`: three engines × 390/1440/2560px.

Visual inspection covered Japanese short desktop/mobile, long mobile footer, Japanese not-found, Latin/digits close-up, dark locale fallback and the wide landing. Footer placement, spacing, overflow and full-width artwork are coherent. The Japanese not-found heading uses balanced wrapping without changing the shared 32/42 size. This is local composition review, not owner approval of production parity.

Frontend-reference workflow provenance and actual tool use are in `frontend-sources.md`. Existing approved design/components resolve the visual decisions; no new external design reference, artwork or design-tool retrieval was used. Repository Playwright/CDP and local image inspection provide the evidence.

## Remaining risks and boundaries

1. The unchanged runtime conformance checker still requires an exact terminal-content→footer gap of 96px for short pages. Valid short frames can therefore fail it. The legacy CLI regression now uses long content; new browser tests independently check short fill. `measureNaeilPage` and checker implementation are untouched. The separately owned measurement/checker follow-up is required before claiming new-contract runtime conformance.
2. The canonical whale image remains a real external network dependency with its existing redistribution limits. Vercel challenges currently block the normal packed-consumer/header gates. The later checks in `checkConsumerBrowser` (mixed-import modal ownership, blocked-font fallback and extension interactions) are **not checked** by the final normal or supplemental run; the supplemental run omits that whole function. No replacement bytes, altered URL, weakened assertion or frozen-file edit was used to manufacture a pass.
3. The full three-engine browser gate is **not green**. Its two Firefox interaction failures need follow-up if they recur under the release gate; the reproducible WebKit first-Tab issue remains unresolved even though a minimal page fails in the same way. Isolated passes do not erase the original result.
4. Actual service addresses, Home's private-network proxy/icon responses, real signed-in sessions and production pixel parity are **not checked**. Fixture account states and local built-site signed-out captures do not establish these. Publishing/site deployment/consumer rollout remain separate.
5. Font delivery adds **8,181,044 bytes** of unchanged font assets to installation payload (the final unpacked package totals **9,878,186 bytes**). This is not a per-page transfer: Unicode ranges keep unused Japanese files off Korean pages, as measured above.
