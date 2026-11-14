# Service shell conformance r3 verification — 2026-11-14

Follow-up on `feat/page-frame-20261114`, starting from `787ddd3`. Implementation commits: `6b35dc2`, `6bcf35a`, `5bef794`, `43b69b8`. This remains unpublished 0.15.0; no main integration, publication, tag, workflow dispatch or service deployment is included.

## Static and type coverage

143 conformance cases use fresh passing Next/Vite fixture apps and mutate one policy at a time. They cover entry reachability and service mismatch, named/namespace/local aliases, direct chrome/main landmarks, theme imports/re-exports and document writes, unrelated provider/storage reads, protected CSS tokens (including --color-* aliases)/selectors/typography, PageHeader props, class token boundaries and unrelated data, required globals/split CSS, nested/dynamic/public duplicate icons, object/spread metadata and aliased title options, unresolved review-needed diagnostics, Vite root/unresolved base, line-scoped ignores, exclusions and installed-bin symlinks.

Shell tests include the public `NaeilServiceShellProps` JSX-wrapper pattern on both entries, optional-never known forbidden keys and unknown-key rejection. Packed React typechecking also compiles the public wrapper and imports `measureNaeilPage`; packed CLI fixtures verify both static success/failure and runtime missing-dependency exit 2.

An independent read-only review found five additional static parsing gaps. All were reproduced with failing fixtures and fixed: typed/referenced generateMetadata, helper-call prefixes with trailing expressions, root className writes versus harmless reads, className boundaries before unrelated data attributes, and JSX-looking strings counted as adoption. The focused shell/static/runtime set then passed 185 tests; no review findings remain deferred.

## Runtime coverage

23 runtime rule/dependency tests cover passing measurements and each failing measurement, half-pixel tolerances, omitted descriptions, exact no-footer permission, icon path/query/size variants, SVG preference and consumer-local `playwright`/`@playwright/test` resolution.

Five real Storybook runtime e2e tests execute the CLI for ko/ja/en in four fresh viewport/scheme contexts per route (1440×900 and 390×844, OS light/dark), plus paired footer/no-footer routes and an intentionally broken body=14px fixture. Two additional local HTTP-server cases verify 403→200 recovery and persistent-403 failure after three real requests, honoring Retry-After and loading the actual served SVG bytes. The full runtime/retry file passes 7 tests.

The exported function is serialized into the page and observes real DOM changes; hidden trailing children do not replace the last content block.

The complete requested Chromium set passed **349 tests in 8.5 minutes**. Existing shell geometry covers four services × three locales × two widths × two OS schemes (48 measurements), plus skip-link focus, remembered theme/account action and recorded Home login without a footer. The frozen `e2e/chrome-pairs.spec.ts` source is unchanged.

Evidence: [all 48 measurements](service-shell-r3-evidence/measurements.json), [desktop](service-shell-r3-evidence/desktop.png), [mobile](service-shell-r3-evidence/mobile.png). Both screenshots were visually inspected.

## Gates

| Gate | Result |
| --- | --- |
| `pnpm test` | PASS: 1,154 passed, 6 skipped |
| `pnpm test:rollout` | PASS: 351 passed, 1 skipped |
| `pnpm check:types` | PASS |
| `pnpm lint` | PASS: 0 errors, 3 existing warnings |
| `pnpm check:contrast` | PASS: all light/dark pairs |
| `pnpm build:pkg` | PASS: messages, brand, locale boundaries and tokens included |
| `pnpm check:package` (6107/6108) | PASS, exit 0: packed CLI, React SSR/browser, Next webpack/Turbopack RSC/SSR and globals/split frame consumers |
| `pnpm build:storybook` | PASS: artifact, notices and fonts |
| Requested Playwright set (6107/6108) | PASS: 349/349 |

Existing lint warnings are in the historical logo browser evidence script, account-correction evidence script, and auth rejection route. They are unrelated to this change.

## Verification infrastructure correction

An initial packed Next/split G1 baseline measured body margin before the fixture's asynchronously imported CSS arrived (8px before, 0px after unlock), failing the existing exact restoration assertion. The generated fixture stylesheet now declares a readiness sentinel; baseline measurement waits for that stylesheet to apply. No assertion is weakened and no shipped presentation behavior changes. The full packed gate was rerun with this correction, but the live artwork check then encountered repeated Vercel 403 responses (also reproduced on the naeil.dev root). Several retries and longer request intervals encountered the same failure. Once the domain recovered, the exact full gate was restarted. The verifier now retries only explicit image HTTP 403 responses at the same URL, respects Retry-After, and still fails after three attempts; no image mock, byte substitution or skipped assertion is counted as a pass. The final full run passed every phase and exited 0, including live artwork and Next Turbopack split frame interactions. A separate direct Next webpack RSC/SSR check also passed but was stopped once the full gate could resume; it is not substituted for the full result.

The final color-token-alias correction changes only the static CLI. A freshly packed installed-bin check then passed for both Next and Vite: valid app exit 0, protected color-alias fixture exit 1, and absent consumer Playwright exit 2. The complete consumer gate above used the preceding static-bin snapshot; its React/CSS/runtime bytes are unchanged by this correction.

## Scope and decisions

The implementation follows the requested spec and follow-up. Static graph resolution is deliberately limited to relative imports, as requested; unresolved metadata/base values fail for review. Harmless document class reads are allowed while className/classList/setAttribute writes remain prohibited. Runtime checks apply to the explicitly listed routes and use consumer-installed Playwright without a new DS dependency. Actual deployed service/authenticated-route acceptance remains owned by service rollout work.
