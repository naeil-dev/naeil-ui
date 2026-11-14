# Service shell conformance r4 verification — 2026-11-14

Follow-up from `f89bb99`, implementation `5f407cd`, on `feat/page-frame-20261114`. Version remains unpublished 0.15.0. No main integration, publication, tag, workflow dispatch or service deployment.

## Source boundary corrections

- PageHeader policy reads only its own attributes/resolved spreads, including style/className expressions. Descendant JSX in actions/description, even inside a spread object, may style its own controls.
- Next identity roots are exported metadata/generateMetadata declarations or export lists/re-exports in app layout/page/template/route files. Imported helper bodies, local callable helpers, namespace/default/named imports, aliases, object/spread metadata and localeMetadata options are inspected. Unrelated metadata locals/exports, example strings and uncalled nested helpers are excluded. Missing/unresolved helper output still requires review.
- The nearest parent tsconfig/jsconfig supplies baseUrl/paths, with relative extends and defining-config directories respected. This covers Next/Vite entry reachability and metadata helpers, including --app src. Project-root public icon aliases are inspected even when outside that source directory.
- Theme checks apply to provider inputs/spreads, not forcedTheme data strings/product props. CSS splits top-level selector lists, allowing scoped article elements and :is/:where lists while rejecting qualified global html/body roots.
- Static root icon aliases using canonical digests are allowed, including apple-touch-icon.png. Different root aliases and automatic Next route icons fail; dynamic/directory route icons always fail. Unreferenced nested historical/product public assets may have different bytes; explicit icon links or route metadata declarations still fail.

## Runtime guarantee and fixtures

The CLI accepts a Playwright storage-state file and repeatable headers, expected statuses and redirect permissions. Every viewport/scheme gets a fresh context with the same authentication, removing only localStorage theme from each supplied origin and leaving the file unchanged. Invalid core storage/header/status/redirect inputs fail before browser launch. Status assessment uses the final navigation response after settling, including client navigation; expected error pages receive the same measurements.

Final same-origin paths must match the request, acquire an unlocalized ko/ja/en prefix, or match an explicit redirect target. Unrecorded server and history redirects fail. Icon hrefs retain absolute URLs and must have the document origin; ICO fragments/query strings cannot hide a 32x32 size.

measureNaeilPage now returns the document URL and PageHeader→next content spacing (32px ±0.5). Footer spacing descends normal-flow layout wrappers to the lowest terminal element border box/direct trailing text line; ancestor padding/borders/margins stay in the measured gap. A 64px wrapper padding changes 96px to 160px and fails. Transparent header wrappers and text directly inside main retain their boundaries. Hidden/zero-height/script/fixed/absolute nodes do not replace visible content.

176 static fixture tests and 35 runtime/dependency/validation tests pass (211 total). The full unit suite passes 1,199 tests, with 6 existing skips. A fresh read-only review's P2 cases were reproduced RED and corrected GREEN: metadata export lists, spread descendants, string/nested returns, selector boundaries, core storage validation, ICO fragments, transparent wrapper spacing and direct main text. Client-side history redirects and allowed navigation 200→404 also have real browser regressions.

The focused Chromium set passes 12 tests: actual Storybook shells for ko/ja/en, footer/no-footer and deliberate divergence, serializable measurements, two real 403 retry HTTP cases, authenticated four-context requests, intentional 403/404 and mismatch checks, HTTP/client redirects, wrapper/32px/icon-origin measurements and transparent/direct-text boundaries. The frozen B1 chrome-pairs source is unchanged.

## Gates

| Gate | Result |
| --- | --- |
| CLI Vitest suites | PASS: 211/211 |
| pnpm test | PASS: 1,199 passed, 6 skipped |
| pnpm check:types | PASS; no leftover reproduction directories |
| pnpm lint | PASS: zero errors, three historical warnings |
| pnpm build:pkg | PASS, including messages/brand/tokens/locale boundaries |
| check:package (6107/6108) | PASS, exit 0: packed CLI, React SSR/browser, Next webpack/Turbopack RSC/SSR and globals/split frame consumers |
| Focused Chromium runtime files (6107/6108) | PASS: 12/12 |
| Final archive boundary | PASS: 200 files, exact SHA-256 matched |
| Final archive installed-style CLI | PASS: Next/Vite valid/invalid fixtures and new runtime flags/dependency hint |
| Final archive runtime CLI (6107/6108) | PASS: 5/5 authenticated/error/redirect/measurement browser cases |

Historical lint warnings are the logo/account browser evidence scripts and auth rejection route, unchanged by r4.

The full consumer run used the initial r4 packed snapshot and passed real artwork checks without a Vercel 403 retry. Subsequent review corrections to the lexical CLI and measurement function were covered by the final 211-case/full-unit/type/lint/build and 12-case browser runs above; final archive boundary and installed-bin checks verify the delivered bytes separately.

## Development archive

Pushed implementation/docs through `0341a82`, rebuilt, and packed with scripts disabled: `/tmp/shell-pack/naeil-ui-shell-dev-r4.tgz`.

SHA-256: `15b0e1e1a4b850267b49b3b3c31426ecf5e0d2f1db8a010c9bfc43fdb2c4f511`.

The exact archive's bin ran through an installed-style symlink for Next/Vite source fixtures, and all five r4 HTTP/browser cases ran with the CLI extracted from this archive (including cookies/headers/theme stripping, expected/mismatched error statuses and HTTP/client redirects). The boundary check matched the same digest. This receipt and the implementation plan are not packed files, so recording them does not change archive bytes.

## Limits

No functional deviation from the owner follow-ups. Static analysis is bounded and does not execute JS: an uncalled function containing shell JSX can satisfy source adoption. Runtime mode is the route/rendering guarantee. General JS execution/scoping, runtime module loaders, nested CSS interpretation and NodeNext extension substitution remain outside this lexical checker. Terminal content-box semantics are defined in the shell guide. Actual deployed/authenticated-service acceptance is separate from these controlled authenticated fixtures.
