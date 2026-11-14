# Shell account ownership — 2026-11-14

Owner-approved additive change for planned 0.16.0. Start: origin/main 85b1461, branch feat/shell-account-20261114. Keep package version 0.15.0 until a separate release step; no freeze, publish, tag, main merge or workflow dispatch.

- [x] Add optional account union to both shell entries; compose the existing account control with locale/Link and existing desktop/mobile behavior.
- [x] Compare login/current URL pathnames only; suppress signed-out control on the login page, not signed-in controls. account wins over deprecated header.authSlot with a once-only development warning. Omitting account preserves 0.15 compatibility.
- [x] Static CI requires explicit account= on each shell and rejects header.authSlot, including same-file object spreads/variables. Runtime returns accountCount from all header markers regardless of visibility; desktop requires at least one unless --no-account lists the requested route. Repeated flags and comma lists supported.
- [x] Test both entries, SSR/type variants, Link, precedence, login exceptions, source fixtures and real browser behavior. Update stories/packed consumers/starter/docs without changing standalone header contracts or frozen B1.
- [x] Run requested unit/rollout/types/lint/build/package/Storybook/Chromium gates, commit with coauthor, push feature branch, pack /tmp/shell-pack/naeil-ui-account-dev.tgz and record SHA-256.

Login equality is exact URL pathname equality after URL parsing (queries/fragments/origins do not affect it). Missing currentHref keeps the login control. Invalid URLs do not suppress it. Services continue to own auth state, guarded login routing and async logout locking; shell provides presentation only. Runtime exceptions are explicit and do not exempt static account ownership.

## Verification — 2026-11-14

Implementation: `5d505bc6d5b0f3a06abb8bde39f8b538656ff034` (`feat(shell): own account presentation and enforce conformance`), pushed to `origin/feat/shell-account-20261114`. No changes to main, frozen release files, B1 source, package version, publication or deployment.

| Gate | Result |
| --- | --- |
| `pnpm test` | PASS: 1,240 passed, 6 skipped |
| `pnpm test:rollout` | PASS: 351 passed, 1 skipped |
| `pnpm check:types` | PASS |
| `pnpm lint` | PASS: 3 existing warnings |
| `pnpm build:pkg` | PASS, repeated after the implementation commit |
| `NAEIL_UI_STORYBOOK_PORT=6107 NAEIL_UI_FIXTURE_PORT=6108 pnpm check:package` | PASS: installed React SSR/types/Vite/browser, Next RSC/SSR/types in Webpack and Turbopack, globals/split CSS frame/lock checks, installed CLI Next/Vite pass/fail cases |
| `pnpm build:storybook` | PASS: artifact, notices and fonts |
| Requested Chromium set, ports 6107/6108, 3 workers, fully parallel | PASS: 186 tests in 5 files, 7.0 minutes |
| Final `pnpm check:package:boundary` | PASS: 200 files; digest equals the final dev tarball below |

The Chromium set is `chrome-pairs.spec.ts`, `service-header.spec.ts`, `naeil-shell.spec.ts`, `naeil-conformance.spec.ts` and `naeil-conformance-r4.spec.ts`. New fixtures cover both shell entries' localized signed-out SSR/Link and signed-in busy state, exact login path matching, account precedence/development warning, missing account and forbidden literal/variable/spread authSlot inputs, guarded desktop/mobile login links, hidden header markers versus markers outside the header, and repeated/comma-list exact-route runtime exceptions. Existing r4 bypass and B1 coverage remains intact.

The initial package attempt stopped in a newly added test because its replacement string omitted fixture whitespace; the corrected test asserts that the source input exists before modifying it. The full rerun passed. A Storybook Link adapter's hook dependency was also corrected before the final lint/build/browser run. No production artwork 403 retry was needed in the passing package run. Final maintained migration/header documentation was checked again through the packed-boundary gate after the full consumer run; only those documentation bytes differ from that consumer archive.

Local logs: `/tmp/shell-account-test.log`, `/tmp/shell-account-rollout.log`, `/tmp/shell-account-types-final.log`, `/tmp/shell-account-lint-final.log`, `/tmp/shell-account-build-final.log`, `/tmp/shell-account-package-retry.log`, `/tmp/shell-account-storybook-final.log`, `/tmp/shell-account-browser.log`, `/tmp/shell-account-boundary-final.log` (expected archive SHA-256 enforced).

## Development artifact

Built after pushing the implementation commit, using `npm pack --ignore-scripts --pack-destination /tmp/shell-pack`; renamed without modifying archive bytes:

- Path: `/tmp/shell-pack/naeil-ui-account-dev.tgz`
- SHA-256: `bf2c4dcf98bd056a78d7cc827e5d93e47baaa9d253c554bbbf10f9773ce81362`
- Internal version: `0.15.0`, 200 files. This is an unpublished planned 0.16.0 development candidate, not a release freeze.

No implementation deviations from the owner-approved account task. The additional maintained header/migration edits remove stale shell authSlot guidance; standalone header examples/contracts remain supported.
