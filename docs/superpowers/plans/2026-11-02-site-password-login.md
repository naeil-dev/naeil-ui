# S2 implementation plan
- [x] Add failing tests for site-direct ordering, dispatch admission, lost results, marker/generation/session checks, expiry and neutral OTP.
- [x] Add isolated server operations/actions and localized canonical forms; minimal proxy/callback gates; preserve S1 boundaries.
- [x] Verify focused auth/routes, types/lint, client graph/build and rendered states under pgrep guard; record evidence and open unmerged PR.

Delivery split: server-only contract/policy/tests first, then server actions/tests, then the assigned feat/login-password-and-email-link branch adds forms/routes/i18n. Three stacked PRs stay unmerged, each ≤800 net lines. No intermediate PR enables redirects to an absent change page.
