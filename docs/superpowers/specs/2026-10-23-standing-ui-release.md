# Published UI and standing three-service rollout

The owner authorized documentation modernization, publication of frozen UI 0.7.1, and standing automatic rollout on 2026-10-23. This extends the October16 rollout design to the actual shared-session production architecture. Home Console and Baby remain outside this work.

## Release and source boundaries

- Publish the existing 0.7.1 archive SHA256 `ecd656c595fd63516417eef58a5e2624d1f1bf928ba0465761292d05502ab3f8`, package source `32108fd8e1cb1db6dae24a09f3ca72ac9a91f618`, unchanged. Preserve frozen chrome/account references and validate registry downloads with fresh React/Next installs.
- The package tag identifies those frozen bytes. Maintained Docs and the Git-integrated website use separately reviewed current source, including shared SSO. Never deploy the old package tag as the website.
- Each future release supplies immutable, version-specific archive, chrome/account references and manifest, with exact digests, package source and reviewed site revision. Site public package runtime output must match the package, allowing only maintained documentation differences.

## Standing execution

A pinned trusted local launchd worker on the existing host polls published GitHub releases. Public release contents cannot select code, commands, credentials, origins or operational configuration. Keep private configuration, session state and durable receipts outside source. Enumerate stable releases in order, bind release/tag/assets, and serialize `naeil`, `estimate`, `jev`.

Existing UI0.7.1 is adopted only after exact artifact and current production verification; never invent a UI0.7.0 predecessor. Subsequent automatic updates are consecutive 0.7.x patches with contract1 and reviewed fix-only changes. Engineering defaults are a 90-day authorization window and patch upper bound0.7.99; expiry or a contract/API/DOM change stops automation for review.

Naeil uses existing Git/Vercel automatic deployment, with exact reviewed application SHA, emitted build identity and protected/public browser checks. Native consumers use isolated private clones, pinned runtimes, exact vendored archive updates, tests/build/package, protected live checks, and application-owned lifecycle handling. Estimate uses only its filtered remote history; original Git/bundles remain unchanged.

## Verification and preservation

Production verification checks immutable identity before/after, frozen frame/account reference, concrete route markers, locale/theme/viewports, navigation and safe auth boundaries. A private session provider renews an existing authorized session, retains rotations atomically, and fails closed on revocation. Public routes remain anonymous. Capture shared chrome only, masking account identity; no business text, model requests, logout, grant changes or data writes in standing checks. Isolated tests verify dirty/save/logout/stream guards.

Native activation rechecks current artifact, ownership, configuration metadata and idle state, backs up data with a scratch restore proof, and uses natural managed stop/start. Preserve current, prior and failed code plus all recovery material. Rollback is code-only to the verified shared-session-compatible predecessor and preserves latest data. Never delete locks/leases, force-kill, reset databases, or restore historical data as code rollback.

Durable pre-invocation records prevent replay of uncertain operations. Failed or interrupted mutations stop later services; a STOP file is checked at stage boundaries and never abandons a native transition already past its stop request. No success from exit status alone: validate exact release/service/attempt/identity/reference/route receipts. Aggregate completion means the three selected services, not every discovered domain.

## Acceptance

Document publication receipts, actual hosted Docs, deployed site identity, installed worker trust/config binding, three-service baseline, and stop/uncertainty/recovery tests. Exercise genuine native pipeline operation safely. A future-release end-to-end run must be described as unexercised unless an actual new authorized release is published and observed; do not invent a patch solely for a green demonstration.
