# Shared UI release convergence

Status: implementation authorized; publication, production replacement and standing automatic activation require the concrete policy/artifact decision below. This work does not repeat the completed 0.6.0 release.

## Outcome and boundaries

Every discovered owned user-facing service must be registered and consume the canonical `NaeilHeader` and footer. A compatible shared release must eventually update, validate, build, deploy and verify every eligible consumer without per-app human actions. Rebuilding applications is expected; atomic switching and live code replacement in open tabs are not required.

Keep fixed package versions, current repositories, routing, business navigation, authentication boundaries and product-purpose widths. No runtime remote code, new shell, SSO, product redesign or blanket React rewrite. DESIGN.md remains authority: 1600px border-box frame, clamp(16px, 2.4vw, 40px) gutters, 640px reading/settings and 480px short forms. Estimate's deliberate 1440px content region remains.

## Shared contract

- Add opt-in React-only `@naeil/ui/naeil-footer`, composing existing SiteFooter and Logo. Canonical content is localized EN/KO/JA navigation to projects, blog and the existing naeil GitHub destination. Both full and compact variants retain these destinations and the brand home link; compact may omit the descriptive tagline. No invented legal claims or social accounts.
- Preserve generic SiteFooter and old Next/next-intl Footer imports and explicit content/style overrides. The website uses the canonical composition; generic or legacy overrides do not by themselves certify canonical adoption.
- SiteFooter gains `onNavigate(event, item)` for every group link including explicit external/native anchors. The canonical composition routes all default links through supplied Link, including absolute URLs, and forwards `onNavigate` for its brand. The adapter must forward anchor events/target and preserve modifier clicks. Consumers retain async save/flush, failure, logout and dirty-state policy.
- Header/footer emit package and chrome-contract identifiers. Applications expose only `{schemaVersion, appId, artifactId, sourceRevision, ui:{version,contractVersion}}` at `/.well-known/naeil-ui.json`, bound at build time. Never expose full manifests, private paths, environment or personal data. Missing production identity fails verification.
- The next candidate is 0.7.0 because it adds canonical footer adoption and a navigation interception contract. It is not automatically approved as a compatible patch. Existing 0.6.0 remains immutable.

## Inventory and rollout

`docs/rollout/services.json` links origins/routes, actual runtime artifact/source evidence, deployment mechanism, installed UI, adoption, policy and unresolved blockers. Include non-adopted, dormant, Access-protected and unknown services. API/health/callback and third-party Access UI are excluded explicitly; an application's login/admin UI is not implicitly excluded. DNS inventory completeness is separate from observed domain coverage.

Release inputs pin source, package archive SHA-256, reference SHA-256 and contract. Per-app receipts distinguish update/PR pending, failed gate, not deployed, activation pending and production verified; approved exceptions require evidence. Aggregate completion requires all registered required paths and no unresolved inventory coverage. PR merge/package publication is never completion.

Adapters run explicit application-owned update, verification/build, package, deployment/activation and browser checks. Unconfigured adapters stay blocked. Prepare an opt-in policy proposal: only reviewed same-contract patches after real app gates, serialized activation, stop on failure and code-only rollback to a verified prior schema-compatible immutable artifact. No force-kill, manual lock deletion, data initialization/restoration, tunnel/auth changes or tab reloads. Standing policy remains disabled until owner approves concrete scope and recovery rules.

## Independent evidence

Freeze the reviewed chrome contract and actual reference rendering independently from each consumer. Compare matching viewport/locale/theme/fonts and permitted toolbar differences; measure outer frames and brand offsets against approved values and reference, not consumer CSS tokens. Check canonical destinations, package/contract identity, no horizontal overflow, keyboard/mobile dismissal and existing application save guards. Compare short/tall routes and direct/client/back transitions in app tests. Every production canonical route declares public/protected access; protected screens require visible structural state markers and reject a visible login gate. Check destination/state before and after browser interactions. Bind each route receipt and route exception to its exact path, locale, state and chrome adapter; a route exception never closes its entire service. Require mutually exclusive light/dark classes during actual theme changes.

Unit/types/lint/contrast, actual Storybook, clean packed React/Next, affected product suites and browser captures are required. Each evidence set records source/archive identity and actual commands. Frozen standalone tests must remove NODE_PATH/NODE_OPTIONS resolution fallbacks and confirm the served artifact identity before browser execution; dependencies cannot come from the mutable worktree. Preserve validated internal package links when Node resolution depends on their physical ancestry. Existing native assistive technology, physical-device and full-provider OAuth limitations remain. Public verification must not access business or family records.

## Initial reconciliation

2026-10-16: shared HEAD and remote main/tag 0.6.0 are `549c501cee0f6c9374920785b5fce1c235c7bafd`; estimate HEAD is `0e1bcaf6292018d0d57cbbe3e6f26196f7cd7258`, no remote. Both supplied worktrees were clean. New local branches `feat/shared-ui-rollout` preserve previous branches. Estimate current artifact remains `b305c0432420-4928a714c529`, source `b305c043242001a5bf4e2204ed7ea68d112071e7`, UI file archive 0.5.0. No runtime changed.
