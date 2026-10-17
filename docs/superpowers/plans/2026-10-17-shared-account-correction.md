# Shared account correction implementation plan

> **For agentic workers:** Use superpowers:executing-plans or superpowers:subagent-driven-development. Existing isolated worktrees are retained; the owner authorized parallel consumer work and correction of the deployed three services.

**Goal:** Give naeil.dev, Estimate and Jev one account-control presentation with their existing authentication and save behavior.

**Architecture:** Shared `NaeilHeaderAccountControl` receives locale and a discriminated signed-in/out account state. Existing authSlot carries this control without changing header compatibility. Consumer adapters retain all I/O.

**Tech Stack:** React19, Radix, Next16, Playwright, exact pnpm archives.

**Spec:** `docs/superpowers/specs/2026-10-17-shared-account-correction.md`

## Constraints and review focus

- Keep1600px/clamp frame,44px targets, neutral tokens, app auth boundaries and source isolation.
- Do not overwrite0.7.0;0.7.1 is a distinct correction candidate.
- Pending logout must not repeat requests or strand keyboard focus.
- Cancel/save failure/401/409 must not bypass Estimate guards.
- Long identity text must not enlarge the shared trigger/menu or overflow mobile.
- Anonymous login must preserve the existing app login destination and modified-click routing.
- Compare focused controls only with equivalent focus; unsupported locales stay absent.

## Tasks

- [x] Shared: fail SSR/browser account tests; implement `NaeilHeaderAccountControl` and site adapter; update actual Storybook and packed fixtures; run units/types/lint/package/build/browser checks.
- [x] Estimate (separate worker): fail authenticated account regression on0.7.0; consume new archive, preserve logout handler, migrate affected tests; verify synthetic guards, app build and e2e.
- [x] Jev (separate worker): fail authenticated account regression on0.7.0; consume new archive and preserve request/navigation; verify failure/busy/locales/mobile, app build and e2e.
- [x] Integration: review actual diffs and artifacts; compare shared account rendering with both real consumer adapters under matched synthetic state; record receipts.
- [x] Deployment: fresh candidate identities, independent release review, code-only deployment/recovery for selected three; public asset/identity verification; update registry and result limits.

Completed one-time correction: [outcome](../../rollout/account-correction-2026-10-17.md). Protected production sessions, real-provider OAuth, live rollback and standing automation remain outside the completed acceptance scope.
