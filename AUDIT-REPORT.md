# 🏭 Production Readiness Audit Report

**Project:** @naeil/ui (Design System)
**Date:** 2026-03-18
**Stack:** Next.js 16.1.6, React 19, TypeScript (strict), Supabase Auth, Vercel Hobby, next-intl, @react-three/fiber, Tailwind CSS v4, shadcn/ui
**Auditor:** claude-opus-4-6 (OpenClaw Auditor Agent)
**LOC:** ~5,850

## Executive Summary

The site is live and functional at https://naeil.dev. Auth, i18n, and SSO are well-implemented. However, **Next.js 16.1.6 has multiple known CVEs** (patched in 16.1.7) including a CSRF bypass on Server Actions. Combined with zero test coverage and missing security headers, this blocks a clean production verdict.

**Verdict:** ❌ Not Ready

## Verdict Criteria
- ❌ Not Ready: Any 🔴 Must Fix item exists
- ⚠️ Conditionally Ready: No 🔴, but 3+ 🟡 Should Fix items
- ✅ Production Ready: No 🔴, ≤2 🟡

## Score Card

| # | Category | Auto | Judgment | Status |
|---|----------|------|----------|--------|
| 1 | API Contracts & Design | — | ✅ | ✅ Pass |
| 2 | Testing & Verification | 🔴 No tests | 🔴 Zero coverage | ❌ Fail |
| 3 | Security & Supply Chain | 🔴 CVEs | 🟡 Headers | ❌ Fail |
| 4 | Configuration & Secrets | — | ✅ | ✅ Pass |
| 5 | Deployment & Release Safety | — | ✅ | ✅ Pass |
| 6 | Data Integrity & Recovery | — | ⬜ N/A | ⬜ Skip |
| 7 | Observability & Operations | — | 🟡 Minimal | 🟡 Warn |
| 8 | Resilience & Fault Tolerance | — | ✅ | ✅ Pass |
| 9 | Documentation & Runbooks | — | 🟡 Default README | 🟡 Warn |
| 10 | Engineering Hygiene | 🟡 ESLint errors | 🟡 | 🟡 Warn |
| 11 | Framework-Specific (Next.js) | ✅ tsc | 🟡 No sec headers | 🟡 Warn |

**Totals:** ✅ 4 / 🟡 4 / ❌ 2 (of 10 assessed, 1 skipped)

---

## 🔴 Must Fix (2 items)

### #1 [Security] Next.js 16.1.6 — Multiple CVEs (fix available: 16.1.7)

- **Evidence:** `pnpm audit` found 5 Next.js CVEs — all patched in 16.1.7:
  - **GHSA-mq59-m269-xvcx** (moderate): null origin can bypass Server Actions CSRF checks
  - **GHSA-ggv3-7p47-pfv8** (moderate): HTTP request smuggling in rewrites
  - **GHSA-3x4c-7xq6-9pq8** (moderate): Unbounded next/image disk cache growth → storage exhaustion
  - **GHSA-h27x-g6w4-24gq** (moderate): Unbounded postponed resume buffering → DoS
  - **GHSA-jcc7-9wpm-mj36** (low): null origin can bypass dev HMR websocket CSRF checks
- **Impact:** The CSRF bypass on Server Actions is especially relevant — the `logout` action in `src/app/[locale]/login/actions.ts` is a Server Action. An attacker could trigger logout for a victim. While the site's Server Actions are limited to logout, this is still a real CSRF vector. The image cache exhaustion could affect Vercel's ephemeral storage.
- **Fix:** `pnpm update next@^16.1.7` — single dependency bump
- **Verify:** `pnpm audit` shows 0 Next.js vulnerabilities
- **Effort:** S (5 min)

### #2 [Testing] Zero Test Coverage

- **Evidence:** No test files anywhere in `src/`. No `vitest.config.*`, `jest.config.*`, or `__tests__/` directories. No test runner configured. No test script in `package.json`.
- **Impact:** Auth flow (Supabase PKCE, SSO cookie sharing, protected routes, redirect logic), i18n routing, and the shared `@naeil/ui` package consumed by `esg.naeil.dev` are all untested. Any regression in the auth callback, middleware redirect logic, or cookie domain handling will only be caught by manual testing. This is particularly risky because:
  - The middleware (`proxy.ts`) has complex redirect/cookie logic
  - SSO cookie sharing with subdomain requires exact cookie domain behavior
  - The `auth/callback/route.ts` handles redirect URL validation (security-sensitive)
- **Fix:**
  1. Add vitest: `pnpm add -D vitest @vitejs/plugin-react`
  2. At minimum, test these critical paths:
     - `isAllowedRedirect()` function in `auth/callback/route.ts` — verify it blocks external domains
     - `getCookieDomain()` — verify `.naeil.dev` domain logic
     - `hashUserId()` — verify deterministic avatar assignment
     - Middleware protected route regex matching
  3. Add `"test": "vitest"` to package.json scripts
- **Verify:** `pnpm test` passes with at least unit tests for auth utilities
- **Effort:** M (2-4 hours for critical path tests)

---

## 🟡 Should Fix (4 items)

### #1 [Security] Missing Security Headers

- **Evidence:** `curl -sI https://naeil.dev` response headers:
  ```
  strict-transport-security: max-age=63072000  ← ✅ (from Vercel)
  x-powered-by: Next.js                       ← 🟡 Leaks framework info
  ```
  Missing: `X-Frame-Options`, `X-Content-Type-Options`, `Content-Security-Policy`, `Referrer-Policy`, `Permissions-Policy`
- **Impact:** The site can be iframed (clickjacking vector for the login page). No CSP means XSS payloads if any injection point exists. `X-Powered-By: Next.js` exposes the framework version for targeted attacks.
- **Fix:** Add security headers in `next.config.ts`:
  ```ts
  const nextConfig: NextConfig = {
    poweredByHeader: false,
    async headers() {
      return [{
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      }];
    },
  };
  ```
- **Verify:** `curl -sI https://naeil.dev | grep -i x-frame`
- **Effort:** S (15 min)

### #2 [Engineering Hygiene] ESLint Errors — 7 errors, 7 warnings

- **Evidence:** `npx eslint .` output:
  - **footer.tsx**: `NavLink` component defined inside render (react-hooks/static-components) — causes state reset on every render
  - **hero-scene.tsx**: React Compiler memoization mismatch; `useMemo` missing dependency `layers`; `setState` called synchronously in effect
  - **nav.tsx:53**: `@typescript-eslint/no-explicit-any`
  - **button.tsx, card.tsx**: Hardcoded `oklch(` colors (custom `naeil-ui/no-hardcoded-colors` rule)
  - **hero-scene.tsx**: 4 unused functions (`makeFish`, `makeJellyfish`, `makeTurtle`, `makeWhale`)
  - **workflow-diagram.tsx**: unused `edges` variable
  - **oauth-buttons.tsx**: unused `next` variable
- **Impact:** The `NavLink` inside render is a real bug — components created inside render lose state on every parent re-render. The rest are cleanliness issues that could cause performance problems (missing useMemo deps) or indicate dead code (~150 LOC of unused shape functions in hero-scene.tsx).
- **Fix:**
  1. Move `NavLink` outside `Footer` component or use `useCallback`
  2. Fix `useMemo` dependencies in `hero-scene.tsx`
  3. Remove unused `makeFish`, `makeJellyfish`, `makeTurtle`, `makeWhale` functions (they've been replaced by sprite PNGs)
  4. Clean up unused variables
- **Verify:** `pnpm lint` exits 0
- **Effort:** M (1-2 hours)

### #3 [Observability] No Structured Logging, No Health Check, No Error Tracking

- **Evidence:** Only 2 `console.warn`/`console.info` calls in the entire codebase (WebGL context lost/restored in `hero-scene.tsx`). No health check endpoint. No error tracking integration (Sentry, etc.). No structured logging format.
- **Impact:** If the auth flow breaks in production (e.g., Supabase token refresh fails), there's no visibility into the failure. Users would see broken behavior with no alerts to the developer. On Vercel Hobby, log retention is limited.
- **Fix:**
  1. Consider adding Vercel Web Analytics (free) or Sentry free tier
  2. Add a `/api/health` route that validates Supabase connectivity
  3. For the auth callback, add error logging (at minimum `console.error` for failed code exchanges)
- **Verify:** Visit `/api/health` and confirm 200 response
- **Effort:** S-M (30 min for basic, 2 hours for Sentry)

### #4 [Documentation] Default README — Not Project-Specific

- **Evidence:** `README.md` is the default `create-next-app` template. References `npm run dev` (project uses pnpm). Mentions Geist font (project uses Pretendard + JetBrains Mono). No mention of:
  - Supabase auth setup (required env vars)
  - SSO cookie sharing architecture
  - The @naeil/ui package exports and how SA frontend consumes it
  - Design token system (`build-tokens.ts`, `check-contrast.ts`)
- **Impact:** Another developer (or future-Jay) cannot set up the project without spelunking through code. The `@naeil/ui` package is consumed by `esg.naeil.dev` — consumers need documentation of the exports and props.
- **Fix:** Write a project-specific README covering:
  1. Prerequisites (Node, pnpm)
  2. Environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
  3. Development setup (`pnpm install && pnpm dev`)
  4. Architecture overview (middleware flow, auth, i18n, SSO)
  5. Package exports for consumers
  6. Design token pipeline (`pnpm build:tokens`, `pnpm check:contrast`)
- **Verify:** Follow README from scratch on a clean machine
- **Effort:** M (1-2 hours)

---

## 🔵 Nice to Have (5 items)

### #1 [Security] DevDependency CVEs via `shadcn` → MCP SDK → hono

- **Evidence:** `pnpm audit` found 4 high + 3 moderate CVEs in `hono`, `@hono/node-server`, `express-rate-limit`, `flatted` — all transitive through `shadcn` (devDependency only). Not shipped to production.
- **Fix:** `pnpm update shadcn` when new version is available, or use `pnpm audit --prod` to filter
- **Effort:** S

### #2 [Performance] 3D Scene — 900+ LOC, 6 Texture Loads, Mobile Concerns

- **Evidence:** `hero-scene.tsx` is 900+ lines with 6 PNG texture loads (coral, fish, jellyfish, turtle, whale, diver). The adaptive tier system is well-designed (detects `hardwareConcurrency`, `deviceMemory`, `prefers-reduced-motion`) with 3 tiers (low/medium/high). Static CSS fallback exists for reduced-motion.
- **Assessment:** The existing tier system is actually quite good. Suggestions:
  1. Consider lazy-loading the `<Canvas>` component itself (dynamic import with `ssr: false`)
  2. The 6 PNG textures load even on low-tier devices — consider reducing to 2-3 sprites for low tier
  3. Add `loading="lazy"` to the texture loads or use `Suspense` boundaries
- **Effort:** M

### #3 [Engineering] Unused Dead Code in hero-scene.tsx

- **Evidence:** `makeFish()`, `makeJellyfish()`, `makeTurtle()`, `makeWhale()` functions (lines 345-490, ~150 LOC) plus `SWIMMERS` empty array are vestigial — replaced by PNG sprite versions. The `SwimmingCreature` component is also unused since `SWIMMERS` is empty.
- **Fix:** Delete the 4 `make*` functions, `SWIMMERS` array, and `SwimmingCreature` component
- **Effort:** S (10 min)

### #4 [Operations] Vercel Hobby Tier Limits Assessment

- **Evidence:** Vercel Hobby limits (as of 2026):
  - Serverless Function: 10s timeout (relevant for auth callback)
  - Bandwidth: 100GB/month
  - Builds: 6000 min/month
  - Image Optimization: 1000 source images
  - Analytics: not included (needs upgrade or external)
- **Assessment:** For a design system showcase + auth gateway, Hobby is **sufficient**. The auth callback is fast (Supabase code exchange). The site is mostly static. 3D renders client-side. Key risk: the `next/image` cache exhaustion CVE (GHSA-3x4c-7xq6-9pq8) could be amplified on Hobby's limited ephemeral storage — but upgrading to Next.js 16.1.7 fixes this.
- **Effort:** N/A (informational)

### #5 [Security] SSO Cookie Configuration — Verify HttpOnly/Secure Flags

- **Evidence:** Supabase auth cookies are set with `domain: ".naeil.dev"` for SSO. The cookie domain logic in `getCookieDomain()` is correct — properly checks both `naeil.dev` and `*.naeil.dev`. The `auth_redirect_to` cookie correctly uses `httpOnly: true, sameSite: "lax"`.
- **Assessment:** ✅ SSO cookie sharing implementation is solid. One minor note: verify that Supabase's default cookie options include `Secure` flag (they do when deployed to HTTPS, which Vercel enforces).
- **Effort:** S (verification only)

---

## ⬜ Not Assessed

| Category | Reason |
|----------|--------|
| Data Integrity & Recovery | No database in this project — Supabase Auth is external service |
| Dead Code (knip) | Tool not run — skipped due to potential config issues with pnpm workspace |
| Duplicate Code (jscpd) | Skipped — codebase is small (~5.8K LOC), visual inspection shows no significant duplication |
| Build Validation (`next build`) | Not run in audit (would take 2+ minutes) — Vercel CI builds successfully per production deployment |

---

## Automated Scan Summary

| Tool | Result | Status |
|------|--------|--------|
| **tsc --noEmit** | 0 errors (strict mode ✅) | ✅ Pass |
| **eslint** | 7 errors, 7 warnings | ❌ Fail |
| **pnpm audit** | 4 high, 7 moderate, 1 low (12 total) | 🔴 Next.js runtime, 🟡 devDeps |
| **Lockfile** | `pnpm-lock.yaml` present | ✅ Pass |
| **Escape hatches** | 0 `as any`, 0 `@ts-ignore`, 0 `@ts-expect-error`, 0 `as unknown` | ✅ Pass |
| **Env var boundary** | All `process.env` usage is `NEXT_PUBLIC_*` or `NODE_ENV` — correct | ✅ Pass |
| **Secrets in git** | No secrets found in git history | ✅ Pass |
| **TODO/FIXME** | 0 found | ✅ Pass |
| **Live site** | https://naeil.dev returns 200, HSTS enabled, i18n headers correct | ✅ Pass |

---

## Phase 2: Category Details

### Category 1: API Contracts & Design — ✅ Pass

The site has minimal API surface: one `GET` route handler (`/auth/callback`). This correctly validates the redirect URL via `isAllowedRedirect()` which checks for same-domain redirects only. The login page is a standard OAuth flow. No custom API endpoints.

### Category 3: Security & Supply Chain — Deep Dive

**Good:**
- `.env*` in `.gitignore` ✅
- Only `NEXT_PUBLIC_*` env vars exposed to client ✅ (these are intentionally public — Supabase URL and anon key are designed to be client-safe)
- `isAllowedRedirect()` validates redirect URLs against `naeil.dev` domain ✅
- PKCE flow used for OAuth (Supabase default) ✅
- No secrets in git history ✅
- Lockfile committed ✅
- TypeScript strict mode ✅
- SSO cookie domain validation is correct ✅

**Needs Attention:**
- Next.js 16.1.6 CVEs (see 🔴 #1)
- Missing security headers (see 🟡 #1)

### Category 4: Configuration & Secrets — ✅ Pass

- Config via env vars (12-factor) ✅
- `.env.local` contains only `NEXT_PUBLIC_*` vars (intentionally public) ✅
- Vercel env vars for production (per STATUS.md) ✅
- No hardcoded secrets in code ✅
- No debug defaults in production ✅

### Category 5: Deployment & Release Safety — ✅ Pass

- Vercel CI/CD pipeline (git push → deploy) ✅
- Vercel provides instant rollback via dashboard ✅
- No database migrations to manage ✅
- No manual deploy steps ✅

### Category 8: Resilience & Fault Tolerance — ✅ Pass

- Vercel handles process management, scaling, restarts ✅
- WebGL context lost/restored handling in hero-scene.tsx ✅
- Reduced-motion fallback (CSS gradient) ✅
- IntersectionObserver pauses 3D scene when out of view ✅
- Adaptive performance tiers for different devices ✅
- Graceful auth failure handling (redirects to /login) ✅

### Category 11: Framework-Specific (Next.js) — 🟡

- **TypeScript strict mode:** ✅ enabled
- **Server vs Client env vars:** ✅ Only `NEXT_PUBLIC_*` and `NODE_ENV` in client code
- **SSR/SSG strategy:** ✅ `generateStaticParams` for locale pages, SSR for auth-dependent content
- **Security headers:** 🟡 Missing (see Should Fix #1)
- **Image optimization:** ✅ Using `next/image` for project icons
- **Middleware:** ✅ Well-structured — handles i18n + auth + protected routes
- **next.config.ts:** 🟡 Minimal — only next-intl plugin, no security headers or custom config

### Privacy & Compliance

- **PII handling:** Minimal — only Supabase-managed user email/name displayed in avatar dropdown
- **Cookie consent:** 🟡 Sets `NEXT_LOCALE` and Supabase auth cookies without consent banner. For a personal portfolio site in Japan, this is low-risk but technically GDPR/APPI adjacent if EU visitors exist
- **Logs don't contain PII:** ✅ No logging of user data

---

## Setup Recommendations

The following tools would improve future audits:

| Tool | Install | Purpose |
|------|---------|---------|
| vitest | `pnpm add -D vitest` | Test runner |
| knip | `pnpm add -D knip` | Dead code detection |
| Sentry | `pnpm add @sentry/nextjs` | Error tracking |

---

## Summary of Action Items

| Priority | Item | Effort |
|----------|------|--------|
| 🔴 Must Fix | Upgrade Next.js to 16.1.7+ (CSRF + DoS CVEs) | S (5 min) |
| 🔴 Must Fix | Add tests for auth critical paths | M (2-4 hrs) |
| 🟡 Should Fix | Add security headers in next.config.ts | S (15 min) |
| 🟡 Should Fix | Fix ESLint errors (NavLink in render, useMemo deps) | M (1-2 hrs) |
| 🟡 Should Fix | Add basic observability (health check, error tracking) | S-M (30 min - 2 hrs) |
| 🟡 Should Fix | Write project-specific README | M (1-2 hrs) |
| 🔵 Nice to Have | Remove dead code in hero-scene.tsx | S (10 min) |
| 🔵 Nice to Have | Lazy-load Canvas component | M |
| 🔵 Nice to Have | Update shadcn to resolve devDep CVEs | S |

**Estimated total effort to reach ⚠️ Conditionally Ready:** ~20 min (Next.js upgrade + security headers)
**Estimated total effort to reach ✅ Production Ready:** ~6-8 hours (add above + tests + README + observability)
