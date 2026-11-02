# S2 site login verification

Site-only composition on UI main ce56dd7. Shared components/tokens and S1-owned invite/session helpers are unchanged. No deployment or publication performed.

- Focused auth/login Vitest: 542 passed, 5 existing opt-in production-invite tests skipped. Includes existing S1 invite/proxy/session tests. TypeScript, changed-file ESLint and production webpack build passed.
- Independent source review found retry-binding/concurrent-start bugs; regression tests failed first (same-generation re-login; ambiguous HTTP408/429), then passed after preserving operation bindings, deriving stable admission UUIDs and narrowing confirmed rejection codes. A pinned-GoTrue password-grant 400/user_banned regression also passed.
- Production Next HTTP seam: password login → must-change page → failed completion → completion-only retry. Exactly one user-password PUT and one admin-marker PUT. This is synthetic Auth transport, not a real GoTrue/SMTP/IdP test.
- Rendered login/change pages: ko/en/ja × light/dark × 390-touch/1440-desktop, 24 states; scoped axe WCAG2/2.1 AA found zero violations, no horizontal overflow, keyboard field order passed, controls ≥44px touch/40px desktop, Pretendard loaded. Three representative captures below were visually inspected. No baseline pixel comparison or general accessibility certification is claimed.
- Client module-graph regression and all 47 built client JS chunks exclude the private canary. App logs exclude fixture password/JWT/private canaries. Real credentials were not used.

Run focused checks: `pnpm exec vitest run src/lib/auth 'src/app/[locale]/login' --maxWorkers=1`, `pnpm exec tsc --noEmit`, changed-file `pnpm exec eslint`, and `pnpm exec next build --webpack` with fictional public Supabase settings. Wait for other pytest/Vitest processes before heavy checks. Build/render tests use isolated loopback Next/Auth seams; both owned processes are stopped afterward.

Hosted gates remain: GoTrue SQL008/audit/trigger contract, actual password/reauthentication policy, Google/GitHub and existing-user email delivery. Shared-package behavior is unchanged, so Storybook/packed-consumer checks are not claimed. Human merge remains separate and redeploys the site.

[한국어 로그인·모바일](login-ko-light-390.png) · [한국어 강제 변경·모바일](change-ko-light-390.png) · [日本語ログイン・desktop dark](login-ja-dark-1440.png)
