# Standing rollout for naeil.dev, Estimate and Jev

The owner requested all three follow-ups on2026-10-23: maintained documentation, public frozen UI0.7.1, and continuous service rollout. Home Console and Baby remain excluded. The [design](../superpowers/specs/2026-10-23-standing-ui-release.md) and [implementation checklist](../superpowers/plans/2026-10-23-standing-ui-release.md) describe this work. Operational activation and publication receipts are recorded separately; implementation alone is not an enabled job.

## Package, site and automation sources

The npm0.7.1 archive stays byte-identical to frozen source `32108fd8e1cb1db6dae24a09f3ca72ac9a91f618`, SHA256 `ecd656c595fd63516417eef58a5e2624d1f1bf928ba0465761292d05502ab3f8`. Its tag is `v0.7.1`. That old package source must never replace the website's newer shared-login source.

The existing Vercel Git integration deploys reviewed application main. Each release manifest separately binds `siteSourceRevision`, an immutable `siteArchive` made by packing that exact site source, and `siteRuntimeSha256`. `package-runtime.mjs` compares every public runtime/export/style/contract file and resolver, platform and dependency metadata against the frozen npm package; only `README.md`, `DESIGN.md`, `CHANGELOG.md` and Markdown under `docs/` may differ. The maintained site archive is evidence, not another npm0.7.1 upload.

The local worker runs a fixed reviewed automation checkout, independent of either release source. GitHub Releases provide data and exact assets, never executable commands or native configuration. Public repository PR workflows do not run on the production host.

## Authorized automatic lane

Only `naeil`, `estimate`, `jev` execute, in that order. [standing-services.json](standing-services.json) contains concrete production routes, locale/auth states and anonymous central-login probes. It explicitly describes representative live chrome coverage; parameterized business records and mutation/save/stream scenarios remain isolated consumer test gates. Historical discovery of other domains stays in [services.json](services.json).

Initial0.7.1 adoption verifies the actual current shared-session artifacts, archives/manifests, ownership, protected/public routes and independent chrome/account references. It does not fabricate a0.7.0 predecessor or adopt the retained password-auth application as an automatic recovery target.

Ordinary unattended changes begin with consecutive0.7.x patches, contract1, fix-only release classification and an unexpired private policy. The chosen initial operational window is90days through0.7.99. Contract/API/DOM changes and expired authorization stop for a reviewed migration. The release publisher still produces and validates each new package/reference; the worker then updates the selected services without per-app manual deployment commands.

## Execution and recovery

The launchd worker polls published stable releases on the existing host, freezes the exact tag/asset identities, validates package and reference hashes, and records an invocation before dispatch. It first proves the exact Git/Vercel website source and live UI, then runs each native consumer's update, test, build, package, managed activation and production check. Native clones come from the private remotes; Estimate uses the filtered history and source SHA correspondence map.

Native adapters bind dedicated runtimes, current manifests, process/listener/lock ownership and unchanged configuration. They preserve business data, take private backups with restore proofs, and stop/start only the owned service naturally. Automatic recovery selects only the exact verified shared-session-compatible predecessor. It changes code and preserves the latest data. Current/previous/failed releases and recovery evidence are retained.

The shared STOP file blocks new stages. A dispatched command with uncertain completion remains stopped for reconciliation; removing a lock/marker is not a retry strategy. Inspect the recorded operation phase, exact current identity, listener ownership and data lock before following a native recovery procedure. No force kill, lease deletion, data initialization, historical database restoration or fallback to retired authentication is part of rollout.

The website observer correlates successful Git deployments with the current public identity. An early CI or deployment failure does not prove which artifact is live; recovery requires a fresh identity and platform inspection. A site failure stops native rollout and retains its result for operator recovery through the existing platform. The observer does not perform Vercel rollback.

## Private verification and evidence

Protected checks use an existing authorized account through a private renewing Supabase session. Rotation persists atomically before browser use, and the refreshed session must outlive the entire configured verification deadline plus five minutes. Revocation, expiry, another user, overlapping refresh or an ambiguous refresh outcome stops verification; it never falls back to anonymous success. Public routes use independent anonymous contexts. Sessions, action configs, backups and raw native logs stay owner-only outside the repositories.

Verification binds identity before/after, exact routes and structural markers, frozen geometry/colors, canonical links, menu/theme/focus behavior and account styles. It does not collect account names, email, business content or browser traces, click logout, call a model, or change central grants. The production standing verifier disables screenshots; isolated tests exercise destructive and dirty-state flows.

A complete receipt names the three selected services and exact release/source/artifact/reference identities. Installation and successful baseline adoption are distinct from a later genuine-release end-to-end observation. Do not invent a patch to demonstrate success or describe a future release as tested before it exists.

## Release assets

Each stable GitHub Release supplies `release.json`, the exact npm archive, frozen chrome and account references, and the separate site package archive when site/package source differs. The manifest includes `releaseId`, exact version/predecessor, package `sourceRevision`, `siteSourceRevision`, archive/reference URLs and SHA256 values, `siteRuntimeSha256`, contract version and reviewed change classes. All URLs are version-scoped GitHub release assets. npm byte identity and fresh registry React/Next consumption remain separate publication checks.

The old Actions/prebuilt adapters in [automation.md](automation.md) are retained historical preparation. They are not the installed standing execution path and must not be enabled to bypass the current native/shared-session gates.

## Operator checks

The private configuration records the immutable automation checkout, complete trusted executable/helper hashes, explicit execution PATH, existing account session, service configs and bounded policy. Native consumers remain on dedicated `rollout/standing` branches; changes since each reviewed source may include only the exact UI dependency, lockfile and vendored package. Recompute pins only after reviewing the changed code, never as automatic recovery from a mismatch.

With the configured Node executable, `scripts/rollout/standing-dispatcher.mjs plan /absolute/private/config.json` validates configuration without dispatch. `poll` performs one bounded pass. The local `dev.naeil.ui-standing-rollout` LaunchAgent supplies a five-minute cadence and obtains the existing GitHub credential in memory through a fixed local launcher.

Create the configured `policy.stopFile` to block new stages. Inspect the private dispatcher `summary.json`, `state.json` and per-release `receipt.json`; an uncertain invocation or native marker needs an explicit state reconciliation. Preserve the marker and current data while determining which stage completed. Do not delete a marker to induce a replay. An expired authorization window requires a new reviewed policy before further patches run.
