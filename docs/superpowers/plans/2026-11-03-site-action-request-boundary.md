# Site Action Request Boundary Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline. The main coordinator owns independent review and runner scheduling; do not spawn agents.

**Goal:** Stop an off-owner Server Action before Next's recursive locale-worker forwarding while preserving valid auth actions.

**Architecture:** Read the pinned build's server action manifest into a server-only policy. The proxy evaluates POST action IDs and delivered paths before ordinary session/locale processing. Build tracing carries the private manifest into the packaged proxy runtime.

**Tech Stack:** Next16.1.7, TypeScript, host Node22+, Vitest, existing auth actions.

**Spec:** `docs/superpowers/specs/2026-11-03-site-action-request-boundary.md`

## Global constraints

- New `fix/site-bd-action-boundary` workspace based on revised #34 c439; preserve original016 and all v2 refs/receipts.
- No Next/package/UI changes, hosted/remote changes, owner browser use or deletion.
- Only existing local B/D correction authorization; runner starts require main slot and host/allDocker guard.
- 409 JSON off-owner mailPaused differs intentionally from canonical200Flight; unavailable metadata fails closed.
- Existing source-bound failing reproduction is the regression baseline. Write new test cases before implementation; run their pending matrix only in the allocated slot.

## Review focus

- Unknown manifest metadata/worker grammar must reject finitely without disabling the boundary.
- Caller forwarded headers and ambiguous encoded paths cannot gain owner status.
- Header logout/recovery on blog dynamic paths must remain admitted.
- C/service-return protection takes precedence and keeps its own response contracts.
- Packaged proxy must receive the private manifest; local success is not Vercel acceptance.

## Task 1: Boundary, packaging and regressions

**Files:**
- Create `src/lib/auth/action-request-boundary.ts` and `src/lib/auth/__tests__/action-request-boundary.test.ts`.
- Modify `src/proxy.ts` only at the pre-session boundary.
- Modify `next.config.ts` only for dist-relative server-manifest path and output tracing.
- Update `docs/spec-auth.md` and existing mail-gate spec to link the explicit dispatch contract.

**Interfaces:** `actionRequestBoundary(request: NextRequest): Promise<Response | null>` returns null only for an admitted request or an ordinary non-action request. Internal parser maps trusted manifest IDs to supported worker patterns; no body/session/client read.

- [ ] Write literal input/output regressions for owner/mail409/other409/malformed400/stale404/unavailable503 and forwarded/raw/encoded variants; call the real proxy with the external session boundary made observable.
- [ ] Preserve the prior real `/projects` loop as baseline RED; record that the new unit matrix remains pending until a slot is granted, rather than claiming an unexecuted red run.
- [ ] Implement strict manifest loading, supported worker parsing and path matching; insert after protected namespaces and before ordinary redirects/Auth/intl.
- [ ] Bind manifest path to actual build/development dist directory; require server trace inclusion.
- [ ] Run scoped type/lint/diff checks (static checks may run during main backend tests).
- [ ] In the allocated slot, run host-Node affected/full Vitest with existing no-delete teardown adapter, preserving fixture paths and raw exit before postchecks.
- [ ] Build a new exact source and preserve/restore only Next's generated tsconfig include difference. Verify middleware trace and client boundary.
- [ ] Run fresh standalone HTTP without NODE_OPTIONS/preload. An independent external loopback observer counts actual incoming forwarded HTTP without changing responses. Rejecting off-owner probes must produce409/400/404/503, forwarding0, auth upstream0. Verify global logout/clearLocalSession and OAuth/password owner controls separately.
- [ ] Coordinate exact new-tree actual GoTrue/REST first-change lifecycle through main; preserve source manifests and receipts for independent review.
- [ ] Commit local source, write an updated #34 split ref/version and report. No push, PR, merge, deployment or cleanup.

## Decisions and progress

The broad manifest approach was chosen after comparing the smaller internal-forwarded rejection. That smaller alternative bounds recursion only after one forwarding and loses the mailPaused result in Next's `200 {}` fallback. Main explicitly accepted the 409 JSON dispatch contract and required schema/tracing/packaged verification. Product implementation remains limited to the files above. RED first hit a next-intl navigation ESM harness import error (0 tests); the preserved second run uses the actual proxy with only the unused navigation adapter mocked and observed 47 expected failures / 20 preservation passes before product implementation. C canonical proxy delegation and its real POST route are checked together. Product boundary implementation then began; full-suite and compiled/packaged proof remain pending.
