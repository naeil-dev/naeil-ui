# 🏭 Production Readiness Audit Report

**Project:** @naeil/ui (Design System)
**Date:** 2026-03-23
**Stack:** Next.js 16.1.7, React 19, TypeScript (strict), Supabase Auth, Vercel Hobby, next-intl, @react-three/fiber, Tailwind CSS v4, shadcn/ui
**Auditor:** claude-opus-4-6 (OpenClaw Auditor Agent)
**LOC:** ~6,034
**Type:** Re-audit (previous: 2026-03-18)

## Executive Summary

All issues from the previous audit have been remediated. Next.js upgraded to 16.1.7 (CVEs resolved), 27 unit tests added covering critical auth paths, security headers configured, ESLint errors fixed, dead code removed, health check endpoint added, and README rewritten. The project is clean across all automated scans and judgment categories.

**Verdict:** ✅ Production Ready

## Verdict Criteria
- ❌ Not Ready: Any 🔴 Must Fix item exists
- ⚠️ Conditionally Ready: No 🔴, but 3+ 🟡 Should Fix items
- ✅ Production Ready: No 🔴, ≤2 🟡

## Changes Since Previous Audit (2026-03-18)

| Previous Finding | Status | Evidence |
|---|---|---|
| 🔴 Next.js 16.1.6 CVEs (CSRF, DoS, smuggling) | ✅ Fixed | `next@16.1.7` in package.json, `pnpm audit --prod` → 0 vulnerabilities |
| 🔴 Zero test coverage | ✅ Fixed | 4 test files, 27 tests, all passing (vitest 4.1.0) |
| 🟡 Missing security headers | ✅ Fixed | `next.config.ts` adds X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy; `poweredByHeader: false` |
| 🟡 ESLint 7 errors / 7 warnings | ✅ Fixed | `npx eslint .` → 0 errors, 0 warnings |
| 🟡 No health check / observability | ✅ Fixed | `/api/health` endpoint added, auth callback error logging added |
| 🟡 Default README | ✅ Fixed | Project-specific README with stack, env vars, project structure, auth/SSO architecture |
| 🔵 Dead code in hero-scene.tsx | ✅ Fixed | `makeFish`, `makeJellyfish`, `makeTurtle`, `makeWhale` removed; file reduced from 900+ to 739 LOC |

## Score Card

| # | Category | Auto | Judgment | Status |
|---|----------|------|----------|--------|
| 1 | API Contracts & Design | — | ✅ | ✅ Pass |
| 2 | Testing & Verification | ✅ 27 tests | ✅ Critical paths covered | ✅ Pass |
| 3 | Security & Supply Chain | ✅ 0 prod CVEs | ✅ Headers, auth, secrets | ✅ Pass |
| 4 | Configuration & Secrets | — | ✅ | ✅ Pass |
| 5 | Deployment & Release Safety | — | ✅ | ✅ Pass |
| 6 | Data Integrity & Recovery | — | ⬜ N/A | ⬜ Skip |
| 7 | Observability & Operations | — | 🟡 Minimal | 🟡 Warn |
| 8 | Resilience & Fault Tolerance | — | ✅ | ✅ Pass |
| 9 | Documentation & Runbooks | — | ✅ | ✅ Pass |
| 10 | Engineering Hygiene | ✅ ESLint clean | ✅ | ✅ Pass |
| 11 | Framework-Specific (Next.js) | ✅ tsc clean | ✅ Headers, env boundary | ✅ Pass |

**Totals:** ✅ 8 / 🟡 1 / ❌ 0 (of 10 assessed, 1 skipped)

---

## 🔴 Must Fix (0 items)

None.

---

## 🟡 Should Fix (1 item)

### #1 [Observability] Error Tracking Still Missing — No Aggregation or Alerting

- **Evidence:** Auth callback now has `console.error` / `console.warn` for failure cases (lines 43, 47, 65 of `auth/callback/route.ts`). WebGL context events are logged (hero-scene.tsx:581-584). Health endpoint exists at `/api/health`. However, there is no error aggregation service (Sentry, etc.) and no alerting mechanism.
- **Impact:** On Vercel Hobby tier, logs are ephemeral and have limited retention. If auth breaks in production, errors are logged but nobody is notified. For a personal portfolio/showcase site this is low-risk, but for the SSO gateway serving `esg.naeil.dev` it means auth failures could go unnoticed.
- **Fix:** Consider Sentry free tier (`pnpm add @sentry/nextjs`) or Vercel Web Analytics (free) for basic error visibility.
- **Verify:** Trigger a test error and confirm it appears in the tracking dashboard.
- **Effort:** S (30 min for Sentry setup)

---

## 🔵 Nice to Have (3 items)

### #1 [Security] DevDependency CVEs (shadcn → hono, eslint → flatted)

- **Evidence:** `pnpm audit` shows 8 vulnerabilities, all in devDependencies:
  - 5 via `shadcn` → `@modelcontextprotocol/sdk` → `hono` / `@hono/node-server` / `express-rate-limit`
  - 2 via `eslint` → `file-entry-cache` → `flat-cache` → `flatted`
  - **None ship to production** — `pnpm audit --prod` returns clean.
- **Fix:** Update `shadcn` and `eslint` when new versions are available. Low priority since these are build-time only.
- **Effort:** S

### #2 [Performance] 3D Hero Scene — Consider Lazy-Loading Canvas

- **Evidence:** `hero-scene.tsx` (739 LOC) loads 6 PNG sprite textures. The adaptive tier system (low/medium/high based on `hardwareConcurrency`, `deviceMemory`, `prefers-reduced-motion`) is well-designed. IntersectionObserver pauses rendering when out of view.
- **Fix:** Consider dynamic-importing the `<Canvas>` component with `ssr: false` to avoid bundling Three.js in the initial JS payload.
- **Effort:** S

### #3 [Security] Content-Security-Policy Header Not Set

- **Evidence:** Security headers include X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy. CSP is not present. For a site using Three.js with WebGL and inline styles from Tailwind CSS, configuring CSP requires careful nonce/hash setup to avoid breaking the 3D scene.
- **Assessment:** Given the complexity of CSP with WebGL + Tailwind + React Three Fiber, and the site's small attack surface (no user-generated content, no custom API endpoints), the risk is low. The existing X-Frame-Options: DENY and X-Content-Type-Options: nosniff cover the most common vectors.
- **Effort:** M (requires testing to avoid breaking WebGL)

---

## ⬜ Not Assessed

| Category | Reason |
|----------|--------|
| Data Integrity & Recovery | No database in this project — Supabase Auth is external SaaS |
| Build Validation (`next build`) | Vercel CI successfully deploys on every push; build is verified through deployment pipeline |

---

## Automated Scan Summary

| Tool | Result | Status |
|------|--------|--------|
| **tsc --noEmit** | 0 errors (strict mode ✅) | ✅ Pass |
| **eslint** | 0 errors, 0 warnings | ✅ Pass |
| **pnpm audit --prod** | 0 vulnerabilities | ✅ Pass |
| **pnpm audit** (all) | 5 high, 3 moderate — all devDeps only | 🔵 Info |
| **vitest run** | 4 files, 27 tests, all passing (202ms) | ✅ Pass |
| **Lockfile** | `pnpm-lock.yaml` present (392KB) | ✅ Pass |
| **Escape hatches** | 0 `as any`, 0 `@ts-ignore`, 0 `@ts-expect-error`, 0 `as unknown` | ✅ Pass |
| **Env var boundary** | All `process.env` usage is `NEXT_PUBLIC_*` or `NODE_ENV` — correct | ✅ Pass |
| **Secrets in git** | None found | ✅ Pass |
| **TODO/FIXME/HACK** | 0 found | ✅ Pass |
| **Live site headers** | HSTS ✅, X-Frame-Options: DENY ✅, X-Content-Type-Options: nosniff ✅, Referrer-Policy ✅, Permissions-Policy ✅, no X-Powered-By ✅ | ✅ Pass |
| **Health endpoint** | `/api/health` responds with `{ ok: true, service: "naeil-ui" }` | ✅ Pass |

---

## Phase 2: Category Details

### Category 1: API Contracts & Design — ✅ Pass

Minimal API surface: one `GET` route handler (`/auth/callback`) and one health check (`/api/health`). The auth callback validates redirect URLs via `isAllowedRedirect()` which only permits same-domain (`naeil.dev` / `*.naeil.dev`) or relative paths. No custom API endpoints.

### Category 2: Testing & Verification — ✅ Pass

**New since last audit:**
- 4 test files covering all critical auth utilities:
  - `cookie-domain.test.ts` (7 tests) — validates `.naeil.dev` domain logic, localhost/IP handling, null/undefined
  - `redirect.test.ts` (8 tests) — validates relative paths, same-domain, subdomain, blocks external/javascript URIs/malformed URLs
  - `avatar.test.ts` (5 tests) — validates deterministic hashing, bounds checking, edge cases
  - `routes.test.ts` (7 tests) — validates protected route regex with/without locale prefix
- Test runner: vitest 4.1.0, configured with path aliases
- All 27 tests pass in 202ms

**Remaining gaps (acceptable for project scope):**
- No integration tests (acceptable — Supabase Auth is external SaaS)
- No E2E tests (acceptable — portfolio site with simple user journeys)
- No load testing (acceptable — static site on Vercel CDN)

### Category 3: Security & Supply Chain — ✅ Pass

**Excellent:**
- 0 production CVEs (`pnpm audit --prod` clean)
- All security headers configured and verified on live site
- `poweredByHeader: false` — no framework disclosure
- TypeScript strict mode with 0 escape hatches
- `.env*` in `.gitignore`, no secrets in git history
- Lockfile committed and used
- `isAllowedRedirect()` blocks open redirect attacks
- `getCookieDomainFromHost()` safely scopes SSO cookies
- PKCE OAuth flow (Supabase default)
- `auth_redirect_to` cookie: `httpOnly: true, sameSite: lax, maxAge: 600`
- Auth callback has error logging for failed sessions

**Note:** DevDependency CVEs exist (hono, flatted) but don't ship to production.

### Category 4: Configuration & Secrets — ✅ Pass

- Config via env vars (12-factor) ✅
- Only `NEXT_PUBLIC_*` vars exposed to client (intentionally public — Supabase URL and anon key are designed to be client-safe) ✅
- Vercel env vars for production ✅
- No hardcoded secrets in code ✅
- No debug defaults in production ✅

### Category 5: Deployment & Release Safety — ✅ Pass

- Vercel CI/CD pipeline (git push → deploy) ✅
- Vercel provides instant rollback via dashboard ✅
- No database migrations to manage ✅
- No manual deploy steps ✅

### Category 7: Observability & Operations — 🟡 Warn

**Improved since last audit:**
- Health check endpoint at `/api/health` ✅
- Auth callback error logging (`console.error` for session exchange failures) ✅
- WebGL context lost/restored logging ✅
- Blocked redirect warnings logged ✅

**Still missing:**
- Error aggregation/alerting (Sentry or equivalent)
- Structured logging format (JSON) — current logging uses `console.*`
- Log rotation (Vercel handles this, but with limited retention on Hobby)

### Category 8: Resilience & Fault Tolerance — ✅ Pass

- Vercel handles process management, scaling, restarts ✅
- WebGL context lost/restored handling ✅
- Reduced-motion fallback (CSS gradient) ✅
- IntersectionObserver pauses 3D scene when out of view ✅
- Adaptive performance tiers for different devices ✅
- Graceful auth failure handling (redirects to /login) ✅
- Auth callback has try/catch with error logging ✅

### Category 9: Documentation & Runbooks — ✅ Pass

**New since last audit:**
- Project-specific README with:
  - Tech stack ✅
  - Prerequisites (Node.js 22+, pnpm) ✅
  - Environment variables table ✅
  - Getting started instructions (correct `pnpm` commands) ✅
  - Project structure ✅
  - Auth/SSO architecture description ✅

### Category 10: Engineering Hygiene — ✅ Pass

- ESLint: 0 errors, 0 warnings ✅
- Type escape hatches: 0 ✅
- TODO/FIXME/HACK: 0 ✅
- Dead code removed (hero-scene.tsx reduced from 900+ to 739 LOC) ✅
- Package manager consistent (pnpm throughout) ✅
- No large commented-out code blocks ✅

### Category 11: Framework-Specific (Next.js) — ✅ Pass

- **TypeScript strict mode:** ✅ enabled
- **Server vs Client env vars:** ✅ Only `NEXT_PUBLIC_*` and `NODE_ENV` in client code
- **SSR/SSG strategy:** ✅ `generateStaticParams` for locale pages
- **Security headers:** ✅ All configured in `next.config.ts`
- **Image optimization:** ✅ Using `next/image`
- **Middleware:** ✅ Well-structured — handles i18n + auth + protected routes + cookie sync
- **`poweredByHeader: false`:** ✅

### Privacy & Compliance

- **PII handling:** Minimal — only Supabase-managed user email/name in avatar dropdown
- **Cookie consent:** Sets `NEXT_LOCALE` and Supabase auth cookies. For a personal portfolio site, low-risk. Note if EU compliance becomes relevant.
- **Logs don't contain PII:** ✅ Error logs only contain error messages, not user data

---

## Summary of Action Items

| Priority | Item | Effort |
|----------|------|--------|
| 🟡 Should Fix | Add error tracking service (Sentry free tier) | S (30 min) |
| 🔵 Nice to Have | Update shadcn/eslint to resolve devDep CVEs | S |
| 🔵 Nice to Have | Lazy-load Canvas component for smaller initial bundle | S |
| 🔵 Nice to Have | Add CSP header (complex with WebGL) | M |
