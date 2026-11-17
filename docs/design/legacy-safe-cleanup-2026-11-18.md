# Legacy safe cleanup — 2026-11-18

Scope: retain all public imports, named exports, component props, CSS entrypoints and existing client/server boundaries. This is implementation/verification only; publication, release preparation and deployment are outside this PR. Frozen release artifacts are unchanged. `stories/.gitkeep` is removed; actual stories remain under src.

## Deprecations

`Nav`/`Footer` have `@deprecated` JSDoc on their function exports and one warning per adapter module in development, following the existing shell warning pattern. Owned services move to `NaeilServiceShell`; other products move to `Navigation`/`SiteFooter`. Shell `header.authSlot` warns even without `account`; its compatibility rendering and account precedence are unchanged. Standalone `NaeilHeader.authSlot` remains supported.

All three name the same removal target: **next minor that removes deprecated APIs**, with notice. No removal date/version is selected. The [maintained application guide](../components/application-layout.md#deprecated-apis), shell guide and migration/navigation guidance carry the replacements. Warnings are suppressed in production and tolerate hosts without a process global. Existing logo stories and packed Next adapters deliberately remain as compatibility coverage.

## Barrel cause and compatible fix

`sideEffects: ["**/*.css"]` already exists and is correct. The tsup split bundle coalesces unrelated top-level Radix namespace aliases/initializers and CVA calls. Downstream pruning within those chunks is compiler-dependent: Select/popover/focus initialization survives a Button-only import, especially with Next client references. This is not a missing CSS metadata problem.

`scripts/build-ui-entry.mjs` now replaces only `dist/components/ui/index.js` with a `"use client"` facade re-exporting the already-shipped separate primitive modules under `dist/source/components/ui`. `Navigation` deliberately retains its original bundled module reference so its controlled-sheet React context stays identical to standalone header/account controls; the packed generic Navigation + standalone account regression checks closure, callback count, confirmation focus and lock cleanup. Its declaration path, export map and client boundary stay fixed. Other bundled entries/chunks remain in place for root/header/shell consumers; this does not consolidate or retire the double build. No new export is needed. Deep Button/Badge variant helpers and /utils remain server safe. No runtime dependency, CSS, bootstrap, token, theme policy or component behavior changes.

## Packed production measurements

Each scenario gets a separate clean production build using the existing packed-consumer fixture manifests. Button and Dialog probes have no shell/provider import; the shell probe includes the root `NaeilThemeProvider`, signed-out account, PageHeader **and Button+Dialog** to detect duplication. All import from the packed archive, without source aliases, dependency externalization or optimizePackageImports overrides.

Total initial JS asset references in built HTML, unique URL once, raw bytes and sum of per-asset gzip level 9. Framework runtime and Next's emitted legacy nomodule polyfill are included; this is an emitted asset inventory, not a measured modern-browser network transfer or service saving. CSS and font assets are separate. Source archive hashes, resolved versions, per-file sizes/hashes and lock hashes are in [bundles.json](legacy-safe-cleanup-2026-11-18/bundles.json). Node 22.23.2; Next 16.4.6; runtime versions match this repository's installed pnpm lock (React 19.2.3, Radix 1.4.3, tailwind-merge 3.5.0).

| Compiler | Probe | JS raw B before → after | JS gzip B before → after | gzip saved B |
| --- | --- | ---: | ---: | ---: |
| vite | button | 245,317 → 225,394 | 75,432 → 70,794 | 4,638 |
| vite | dialog | 279,339 → 259,961 | 86,831 → 82,318 | 4,513 |
| vite | shell | 510,752 → 495,194 | 129,624 → 125,867 | 3,757 |
| webpack | button | 659,012 → 593,030 | 204,641 → 182,482 | 22,159 |
| turbopack | button | 704,446 → 601,236 | 215,814 → 184,262 | 31,552 |
| webpack | dialog | 690,348 → 626,276 | 213,469 → 193,552 | 19,917 |
| turbopack | dialog | 736,711 → 634,609 | 224,351 → 195,518 | 28,833 |
| webpack | shell | 881,777 → 865,701 | 239,688 → 236,280 | 3,408 |
| turbopack | shell | 904,908 → 878,269 | 246,887 → 241,315 | 5,572 |

Full shell is smaller in every compiler. Retaining Navigation’s original context module leaves Button/Dialog byte totals unchanged; webpack full-shell gzip changes by one byte versus the earlier naive facade. Vite savings are below 5 KB gzip; the change is retained because the Button-only Next savings are 22,159 B (webpack) and 31,552 B (Turbopack), with no full-shell regression. These are not extrapolated to the four services. The survey's ~30 KB esbuild result is a different bundler/probe, not a Vite claim.

CSS output is unchanged for every matching probe: Vite 200,731 raw / 57,835 gzip B; webpack 202,932 / 56,133; Turbopack 202,929 / 58,253. No font changes. The probe preserves installed locks/output in the chosen output directory. To reproduce against this source baseline:

```sh
pnpm install --frozen-lockfile
pnpm build:pkg
mkdir -p /tmp/candidate
npm pack --ignore-scripts --pack-destination /tmp/candidate
pnpm exec tsx scripts/measure-ui-bundles.ts /tmp/baseline/naeil-ui-0.18.1.tgz /tmp/probe-before
pnpm exec tsx scripts/measure-ui-bundles.ts /tmp/candidate/naeil-ui-0.18.1.tgz /tmp/probe-after
```

Build the baseline archive from source c76bf765 in a separate worktree; do not repack frozen release directories. The script fixes runtime versions from the installed repository baseline for both archives. Generated consumer lockfiles retain the complete toolchain closure; reuse the same output directories for a locked repeat. Keep both archives separate even though the version is unchanged.

## Tarball compatibility

Final pack has **423 files** before/after, no added/removed members, **47 identical export-map keys**, all **74 `/ui` runtime named exports** unchanged, and all **71 declaration files** identical after excluding JSDoc/comments. CSS/font/bootstrap bytes are unchanged. Package compressed/unpacked bytes: 8,560,562/9,896,222 → 8,558,024/9,882,098. This is a locally built maintained-source baseline, not the frozen registry archive.

[tarball.json](legacy-safe-cleanup-2026-11-18/tarball.json) records full hashes, export map and every changed member. The 19 content differences are completely accounted for:

- `dist/components/ui/index.js`: replace coalesced module implementation with the client facade (22,897 → 3,309 B).
- `dist/components/index.js`, `dist/source/components/nav.js`, `dist/source/components/footer.js`: dev-only adapter deprecation warnings.
- `dist/components/naeil-shell.js`, `dist/naeil-locale/chrome.js`, `dist/source/components/naeil-shell-core.js`: synchronized shell slot warning, including legacy-only callers.
- `dist/components/index.d.ts`, `dist/components/naeil-shell.d.ts`, `dist/naeil-locale/chrome.d.ts`, `dist/source/components/nav.d.ts`, `dist/source/components/footer.d.ts`, `dist/source/components/naeil-shell-core.d.ts`: JSDoc only; no semantic type change.
- `docs/components/application-layout.md`, `docs/components/naeil-shell.md`, `docs/components/navigation.md`, `docs/design/v2-migration.md`: maintained deprecation/replacement guidance.
- `CHANGELOG.md`: Unreleased entries; `package.json`: build command runs the facade generator, no export/dependency/version changes.

The benchmark/paint/packed-consumer archive is the final maintained-source pack recorded in the tarball receipt; **every dist/style/font/license/bin byte matches**. Probe scripts and this report are not shipped. The placeholder was never a tarball member. No emitted chunk name/file is added or removed; other entries retain their existing graph.

## Consumer guide follow-up (report only)

No consumer repository or consumer patch file is changed. Paths/lines below are at the survey's fetched snapshots: Co-STORM 8a6f2f7; jev f17cd84. The main agent will route these wording corrections to their service repositories.

| File:line | Stale guidance | Corrected wording |
| --- | --- | --- |
| `Co-STORM-Lab/web/README.md:47–48` | Direct legacy Nav/Footer composition and direct authSlot account instructions | Use `NaeilServiceShell` + root `NaeilThemeProvider` from `@naeil/ui/naeil-locale/chrome` under `NaeilLocaleProvider`; pass session/busy/guarded logout through shell `account`, menu/routing state through `header` and `Link`/`onNavigate`. Nav/Footer and shell header.authSlot are deprecated compatibility; removal target: next minor that removes deprecated APIs, with notice. |
| `jev/README.md:24–25` | Direct legacy Nav/Footer composition and authSlot instructions | Use the provider-backed `NaeilServiceShell` + root `NaeilThemeProvider`; pass session/busy/guarded logout through shell `account`. The shell supplies canonical header/footer/account; keep application routing/save guards. Nav/Footer and shell header.authSlot are deprecated compatibility; removal target: next minor that removes deprecated APIs, with notice. |
| `jev/DESIGN.md:52,80` | Legacy composition at line 52; account/authSlot instruction at line 80 | Owned Jev uses `NaeilServiceShell` from `@naeil/ui/naeil-locale/chrome`, root `NaeilThemeProvider` and `account={account}`. Keep pending state/request lock above the shell. `Navigation`/`SiteFooter` remain supported for other product menus; standalone header authSlot remains supported. Nav/Footer and shell header.authSlot have the same removal target/notice above. |

## Verification

- `pnpm install --frozen-lockfile`, `pnpm lint` (0 errors, 3 existing warnings), `pnpm check:types`: PASS.
- `pnpm test`: 71 files passed / 1 skipped; 1,115 tests passed / 6 skipped. Includes SSR rendering parity, dev-only once warnings, legacy-only shell slot and account precedence.
- `pnpm test:rollout`: 354 passed / 1 skipped; `pnpm check:contrast`: PASS.
- `pnpm build:pkg`, `pnpm build:storybook`, `pnpm build`: PASS. Storybook verifies 16 UI + 2 Brand Docs pages, runnable usage stories, fonts and notices; browser tests exercise that built artifact.
- [Packed context regression](legacy-safe-cleanup-2026-11-18/context-regression.json): PASS for final archive (sheet closes, one callback, confirmation owns focus, locks clean up); a counterfactual facade using deep Navigation reproduces the broken context (sheet remains open). The same regression is now required in every packed frame consumer.
- Final `pnpm check:package:boundary`: PASS (final archive SHA in tarball receipt). Affected browser run: 620 passed / 2 skipped / 17 failed (639 total). Sixteen failures are the real decorative image not loading in Firefox/WebKit (trace records HTTP 403); one WebKit skip-link focus case also failed 3 isolated repeats. A package-free HTML reproduction shows this Mac WebKit leaves BODY active after Tab while Chromium focuses the first anchor; Linux CI remains the final browser gate. Packed consumers and subsequent retry/CI results are recorded in the PR verification receipt. The local live-artwork check encountered HTTP 403 `x-vercel-mitigated: challenge` for `https://naeil.dev/images/whale.png`; those image-loading failures are reported separately from component behavior and are not mocked or waived.
- Packed `pnpm test:theme-paint`: PASS, **162/162** runs (Next webpack/Turbopack + Vite, 3 engines × 6 conditions × 3 repeats), **0 wrong background/content frames**, 0 script errors, correct hydration. [Summary](legacy-safe-cleanup-2026-11-18/theme-paint.json). Chromium captures compositor PNG frames including blank backgrounds; Firefox/WebKit claims are limited to raster checkpoints. No painted-frame coverage is inferred from RAF/DOM alone.

Final CI status is recorded by the PR checks. No merge, tag, publish, release preparation or deploy is performed.
