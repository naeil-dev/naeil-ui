# Service shell conformance r4 implementation plan

> **For agentic workers:** Execute inline with superpowers:executing-plans; use one fresh final reviewer. Steps use checkbox syntax.

**Goal:** Remove abestimate source-analysis false positives and support authenticated/error-route runtime measurements.

**Architecture:** Keep the shipped CLI dependency-free. Parse JSX attribute boundaries, scope Next metadata to route exports, share project import resolution (relative/baseUrl/paths) between graph walking and helper inspection, and pass sanitized authentication inputs to fresh Playwright contexts.

**Tech Stack:** Node ESM, TypeScript fixtures, Vitest and Playwright.

**Spec:** Owner's r4 follow-up to `docs/superpowers/specs/2026-11-14-naeil-service-shell.md`, including repeatable expected HTTP status.

## Global constraints

- Only identity-footer-20261113 / feat/page-frame-20261114; unpublished 0.15.0.
- Keep r3 bypass regressions and B1 unchanged. No new DS dependency.
- Ports 6107/6108; never 6665–6669. No main/publish/tag/workflow/deployment.
- Feature push is authorized. Every commit has the requested Claude Opus 5.5 trailer.
- Pack `/tmp/shell-pack/naeil-ui-shell-dev-r4.tgz`, report SHA-256 in Korean.

## Review focus

- JSX in actions/description can contain its own style/class props; only PageHeader's own attributes are forbidden.
- Only exported route metadata is an identity root, while imported helper bodies, aliases, re-exports and unresolved helpers cannot hide violations.
- `--app src` must find parent tsconfig/jsconfig; paths/baseUrl targets use the defining config's directory.
- Auth state must reach all four contexts but the stored theme must not; invalid state/header/status inputs fail before browser launch.
- Expected HTTP failures still undergo geometry checks; unspecified routes require 2xx after redirects. Unexpected final route paths fail unless explicitly allowed; only ko/ja/en locale aliases normalize automatically.
- Measure the last terminal visible normal-flow content box through layout wrappers; wrapper padding/borders/margins contribute to the gap. Check PageHeader→next content 32px and same-origin icons.

### Task 1: Static source correction

**Files:** bin/conformance-source.mjs, new bin/conformance-project.mjs and bin/conformance-metadata.mjs, bin/naeil-ui-conformance.mjs, conformance fixtures/tests.

- [x] Add failing fixtures for nested PageHeader JSX, unrelated metadata locals, exported route forms/imported helpers, parent paths/baseUrl and missing helper/violation regressions.
- [x] Implement own-attribute scanning, shared import resolution and route-rooted metadata/helper inspection. Retain existing conservative object/spread and helper-prefix checks.
- [x] Run all static fixtures green and commit with the runtime correction (the shared CLI owns both changes).

### Task 2: Authenticated and intentional error routes

**Files:** bin/conformance-runtime.mjs, bin/naeil-ui-conformance.mjs, runtime tests and e2e/naeil-conformance.spec.ts.

- [x] Add failing CLI/runtime fixtures for storage-state, repeated headers, expected-status and allowed redirects pass/mismatch; assert state theme stripping, wrapper padding, 32px gap and same-origin icons in a real browser.
- [x] Add runtime options, sanitize only localStorage theme keys, apply state/headers to every context, require exact expected or default 2xx response and final route path before accepting measurements.
- [x] Run runtime suites/e2e green and commit with the shared CLI correction.

### Task 3: Verification and delivery

- [x] Update shell API/CLI docs, changelog and package required-file checks; request one fresh final review and fix substantive findings RED→GREEN.
- [x] Run CLI suites, pnpm test/check:types/lint/build:pkg and full check:package (6107/6108); retain outputs and any real Vercel retry failures.
- [x] Commit/push, rebuild and pack r4, verify artifact CLI/boundary and SHA-256; report in Korean.

## Execution ledger

- Start: git pull --ff-only already up to date at f89bb99, clean worktree.
- Root causes: PageHeader uses a whole-opening-tag regex including nested JSX; metadata expressions match every local name regardless of route/export; entry graph skips all non-relative imports; runtime creates contexts without auth inputs and rejects every non-2xx response.
- Ruling: execute the owner's concrete correction without another approval menu. Keep localeMetadata bypass tests, relocating Next metadata cases to actual exported route metadata where needed by the corrected scope; Vite retains its initial-title check.
- Static RED: 11 initial new failures reproduced, followed by added spread/provider-data/selector/icon-handler cases. GREEN: all 164 static cases pass, preserving metadata object/spread/prefix and alias bypass checks at exported route roots.
- Additional owner scope: directory icon handlers are forbidden; product subdirectory icons and scoped article element selectors are allowed. forcedTheme policy applies to provider inputs. Document that uncalled shell functions can satisfy static reachability; runtime is the guarantee.
- Latest icon ruling supersedes blanket duplicates: allow canonical-byte aliases and unreferenced nested historical public assets; root aliases with different bytes, automatic Next route icons with different bytes, dynamic/route handlers and explicit extra declarations fail. Parent public assets are checked even with --app src.
- Review: one fresh read-only reviewer reproduced P2s in export-list route roots, own spread boundaries, string/nested function returns, qualified/scoped CSS selectors, storage schema validation, ICO fragment sizes, transparent wrapper spacing and direct main text. All have RED→GREEN regression coverage. Final status assessment occurs after settling; real client navigation 200→allowed404 passes and an unrecorded history redirect fails.
- Latest verification: 211 static/runtime unit cases green (176 static + 35 runtime), full unit suite 1,199 passed/6 skipped; types and lint pass (three historical warnings), package build passes. Runtime/browser file set 12/12 passed, including actual Storybook shell, real auth/error/redirect HTTP fixtures and measurement regressions. No B1 changes or reproduction directories.
- Review rulings: general JS execution/scoping, runtime module loading, nested CSS interpretation and NodeNext extension substitution remain bounded lexical-analysis limitations; no arbitrary interpreter is added. Terminal-box semantics define layout-wrapper measurement. Full deployed/authenticated service acceptance remains consumer work; this task verifies controlled authenticated fixtures and packed artifacts.
- Complete package gate exited 0: packed CLI, React and Next webpack/Turbopack RSC/SSR with globals/split frame interactions all passed. Live artwork loaded without a 403 retry. Initial r4 packed snapshot used for that full consumer run; later review fixes have final unit/type/lint/build/runtime coverage and get an exact delivered-archive boundary/CLI check.
- Delivery: 5f407cd implementation and 0341a82 docs pushed, rebuilt/packed to /tmp/shell-pack/naeil-ui-shell-dev-r4.tgz. SHA-256 15b0e1e1a4b850267b49b3b3c31426ecf5e0d2f1db8a010c9bfc43fdb2c4f511. Exact archive boundary passed (200 files); installed-style Next/Vite CLI passing/failing/dependency fixtures passed; extracted archive CLI passed all five r4 Chromium HTTP/auth/error/redirect cases. Receipt-only files are excluded from the archive.
- Final exact-archive audit: reran the complete check:package with expected SHA pinned to that same delivered digest. Two attempts stopped at live whale image HTTP unknown (no 403 status); real HTTP and isolated Chromium probes both returned 200. Subsequent exact-digest run passed real image loading at every viewport/theme, all React and Next webpack/Turbopack globals/split consumers, and exited 0. Temporary requestfailed logging removed; no assertion/URL/image-byte substitution. This supersedes the earlier initial-snapshot-only caveat.
