# Service shell conformance r3 implementation plan

> **For agentic workers:** Execute inline with superpowers:executing-plans; use one fresh final reviewer. Steps use checkbox syntax.

**Goal:** Close the independent review's static-check gaps and verify deployed shell pages in a fresh browser profile.

**Architecture:** Keep the static CLI dependency-free, with relative import reachability and conservative object resolution (unresolved metadata requires review). A standalone, serializable `measureNaeilPage` function supplies measurements to both consumer tests and the CLI, which resolves Playwright from the consumer project.

**Tech Stack:** Node ESM, TypeScript/React, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-14-naeil-service-shell.md` plus the owner's nine-point r3 follow-up.

## Global constraints

- Work only in identity-footer-20261113, branch feat/page-frame-20261114; keep 0.15.0 unpublished.
- No new runtime dependency, main push, publication, tag or workflow dispatch; feature push is authorized.
- Use ports 6107/6108; never 6665–6669. Preserve chrome-pairs B1 and frozen archives.
- Every commit ends with the requested Claude Opus 5.5 coauthor trailer.
- Produce `/tmp/shell-pack/naeil-ui-shell-dev-r3.tgz` and SHA-256 after all gates.

## Review focus

- Aliased/namespace JSX and shell code disconnected from framework entries must not bypass adoption checks.
- Metadata spreads/identifiers and unresolved calls must not silently bypass identity checks.
- Unrelated data strings, component storage keys and class substrings must remain valid.
- Consumer-installed Playwright, packed entry paths and npm bin symlinks must work without DS-only dependencies.
- Missing DOM nodes, hidden final children and explicit no-footer routes must produce useful runtime diagnostics.

### Task 1: Static gate and types

**Files:** `bin/naeil-ui-conformance.mjs`, new focused `bin/conformance-source.mjs`, conformance fixtures/tests, `src/components/naeil-shell-core.tsx`, shell type tests.

- [x] Add paired fixtures for entry reachability/service aliases, theme imports/writes, protected CSS/classes/PageHeader, metadata/icons/title resolution and Vite base. Run the focused Vitest suite and observe the new failures.
- [x] Implement import graph/alias resolution and conservative object traversal; require CSS and restrict theme props to provider tags. Keep existing diagnostics/ignores and realpath bin entry handling.
- [x] Reproduce typed `NaeilServiceShellProps` JSX spreads; change Exact's shape to include known optional-never keys while rejecting unknown keys. Check both shell entries and forbidden root/nested inputs.
- [ ] Run focused tests and types; commit the independently testable correction.

### Task 2: Runtime gate

**Files:** new `src/components/naeil-page-measure.ts`, new `bin/conformance-runtime.mjs`, shell exports/tsup, runtime unit tests, new `e2e/naeil-conformance.spec.ts`, shell stories, packed checks.

- [x] Add failing runtime/measurement tests for valid pages and each failing measurement, dependency errors and no-footer routes.
- [x] Export self-contained `measureNaeilPage()` and add CLI `--url`, `--routes`, `--no-footer`; resolve consumer Playwright, create four fresh contexts per route and print a table with exit 1/2 semantics.
- [x] Check main identity, 48/12/96 ±0.5 gaps, 32/42/600 title, body 16, fresh dark, canonical icon rel/path/type and ICO size, title suffix.
- [ ] Run CLI against real shell Storybook pages; exercise packed export and bin; commit.

### Task 3: Docs, review and delivery

**Files:** `DESIGN.md`, spec, `docs/components/naeil-shell.md`, AGENTS/CHANGELOG/verification evidence as needed.

- [x] Make shell-owned header/nine-input contract consistent while preserving standalone semantics; document every static/runtime rule, review-needed diagnostics and consumer Playwright installation.
- [ ] Run all requested unit/rollout/types/lint/contrast/build/package/Storybook/browser gates; inspect results, fix failures, retain evidence.
- [ ] Request one independent final review and address substantive findings with regression tests.
- [ ] Commit, push feature branch, rebuild/pack r3 artifact and record hash; report in Korean.

## Execution ledger

- Start: `git pull` was already up to date at 787ddd3; working tree clean.
- Ruling: continue the explicitly requested implementation without another design/plan approval — the owner supplied exact behavior and delivery commands; no product decision remains open.

- Static/type RED: 71 new policy failures and two typed-wrapper TS2322 errors reproduced. GREEN: focused shell/conformance suites initially 175 tests, types passed.
- Runtime: real Storybook CLI e2e 5/5 passed, including explicit no-footer and deliberate body=14 fixture. Full unit suite initially 1144 passed/6 skipped.
- Final review: independent fresh reviewer found five P2 static parsing issues; each reproduced RED then fixed GREEN (183 focused tests). Typed/referenced generateMetadata, complete helper-call matching, document reads vs className writes, class attribute bounds, and string-literal JSX are covered. No deferred minors.
- Ruling: harmless document class reads remain valid; className writes are forbidden alongside classList/setAttribute mutations — enforcement follows theme-write policy without blocking read-only feature checks.
- Ruling: Vite shorthand/unresolved base also fails review — an unresolved base is not evidence for the required root deployment.
- Review scope: deployed consumer/authenticated service behavior is outside this library implementation; packed/runtime fixtures and the requested complete gates provide local evidence. No release/publish/deployment is performed.

- Gate investigation: the first packed Next/split run failed G1 unlock restoration (before margin 8px, closed 0px). Generated Next frame imports its CSS asynchronously with the client app; DOM readiness/two paints did not prove CSS readiness. Added a sentinel in the generated fixture's actual stylesheet and wait for it before baseline measurements. This changes only verification infrastructure, not shipped styles or runtime behavior; all original compensation assertions remain exact.
