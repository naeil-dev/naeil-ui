# Console authentication, account control and language integration

Scope: integrate locally verified Console authentication into the latest deployed UI, without deploying the old authentication branches. Implementation and verification are authorized; live grants, provider/signup/SMTP settings and production activation require the final operational decision described in the handoff.

## Baselines and isolation

| App | Latest UI base | Authentication provenance | New isolated worktree |
| --- | --- | --- | --- |
| naeil.dev | `9f83816` (production `ff37223`, subsequent documentation only) | invitation `ede9f7b`, recovery `bb83a99` from `review-naeil-ko-homepage` | `../naeil-account-language` |
| AB Estimate | `8c3e043` | `feature/naeil-console-access` / `af7d6ea` | `../../1bnldk74/estimate-account-language` |
| Jev | `6b5fd15` (production `35dd474`, subsequent preparation only) | independent snapshot `36002aa9`, product `13f2829` | `../../3tl6a87q/jev-account-language` |
| Console | existing isolated `dd8fa93c` | Home OpenSpec `naeil-console-access` | `../../3qtenke4/naeil-home-account-language`, narrow reproduced logout/dependency fixes; original untouched |

The existing approved central access rules remain authoritative: valid user, active member/service, explicit grant, no administrator bypass, fresh server decision per protected request, no legacy password fallback. Keep Estimate's shared schema3/revision/business data contract and Jev's quota/stream enforcement. Existing worktrees, user changes, production data/backups and environment values remain untouched.

## UI and session state contract

| State | Shared header | Consumer behavior |
| --- | --- | --- |
| Anonymous or expired | `NaeilHeaderAccountControl` signed-out | Provider login with validated local return path; protected API401 |
| Authenticated and allowed | Same shared signed-in control | Verified display name/email in menu only; protected data after current server decision |
| Authenticated, denied/blocked | Same verified identity when available | No protected data;403 recovery and guarded account switch |
| Authentication/access lookup unavailable | Retain known state only where valid; no invented identity |503 with retry; do not erase drafts or turn a temporary failure into successful logout |
| Logout pending | Shared busy state | One request lock above both header mounts; retry after failure; local session termination remains possible after revoke/outage |

Account switching uses the existing shared logout followed by provider login. No new account-menu item, profile editor, global logout or automatic SSO. Dirty/save guards apply to account actions and navigation. Estimate preserves raw invalid input, restore files,409 state and explicit export/discard recovery; reauthentication in another tab requires explicit identity/revision recheck.

UI0.7.1 archive, tokens, styles, header/footer/account composition remain frozen. No package behavior change is currently required. The separate invitation confirmation response retains its reviewed isolation/CSP and explicit confirmation; ordinary OAuth cannot accept an invitation.

## Language and return-location policy

| App | Support | Existing storage/routing to preserve |
| --- | --- | --- |
| naeil.dev | ko / ja / en | next-intl localized URL and origin-local locale cookie; locale switch preserves query/hash |
| Jev | ko / ja / en | `useAppLanguage`, URL `lang` and origin-local preference; preserve current draft/result and handle history |
| AB Estimate | ja | No language selector; Japanese body and shared chrome |

Do not implement Estimate body translation, shared/account language storage, or cross-domain cookie/session synchronization. Verify reload, direct entry, supported/invalid locale, back/forward and login/logout return paths. Authentication destinations are validated canonically before use; preserving location never permits an open redirect.

## Verification and operational boundary

Run each integrated app's relevant full checks and current security regressions. Distinguish synthetic transport/browser fixtures, actual local Auth/Postgres and external provider/production evidence. Exercise401/403/503, grant revoke/block, legacy cookie rejection, exact Origin/CSRF, PKCE replay/refresh/logout races, restart contracts, Estimate shared revision conflicts, and Jev quota/stream behavior. Compare actual shared account rendering at390/768/1440/1920, light/dark, supported locales, desktop/mobile, keyboard/Escape and emulated touch.

Use only newly owned synthetic fixtures; historical55321/55322 ownership is not assumed. No user editing tab reloads or production data reads. Package exact source/artifact/hash with synthetic configuration only. Prepare provider/callback/signup/SMTP and initial verified-UUID allow-table requirements, fresh writer ownership/data preservation, staged stop/recovery steps. After central enforcement begins, rollback must retain enforcement or stop protected routes; old password-only artifacts are not a safe fallback.

Production UI0.7.1 rollout is already complete. This work produces a new authentication integration candidate, separately reported as implemented, verified, packaged, not deployed, or operationally verified.

The user confirmed the existing initial policy during implementation: Jay is the sole intended initial Console administrator; Jev/Estimate use an explicit per-member allow table. This confirms the design, not actual identity registration, live grants or production activation. The [transition review](../../rollout/account-language-transition-2026-10-17.md) lists the concrete remaining gates, including Vercel invitation state continuity and Home current-source reconciliation.
