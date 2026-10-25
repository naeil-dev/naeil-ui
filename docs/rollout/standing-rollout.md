# Standing rollout for naeil.dev, Estimate and Jev

The owner requested all three follow-ups on2026-10-23: maintained documentation, public frozen UI0.7.1, and continuous service rollout. Home Console and Baby remain excluded. The [design](../superpowers/specs/2026-10-23-standing-ui-release.md) and [implementation checklist](../superpowers/plans/2026-10-23-standing-ui-release.md) describe this work. Operational activation and publication receipts are recorded separately; implementation alone is not an enabled job.

## Package, site and automation sources

The npm0.7.1 archive stays byte-identical to frozen source `32108fd8e1cb1db6dae24a09f3ca72ac9a91f618`, SHA256 `ecd656c595fd63516417eef58a5e2624d1f1bf928ba0465761292d05502ab3f8`. Its tag is `v0.7.1`. That old package source must never replace the website's newer shared-login source.

The existing Vercel Git integration deploys reviewed application main. Each release manifest separately binds `siteSourceRevision`, an immutable `siteArchive` made by packing that exact site source, and `siteRuntimeSha256`. `package-runtime.mjs` compares every public runtime/export/style/contract file and resolver, platform and dependency metadata against the frozen npm package; only `README.md`, `DESIGN.md`, `CHANGELOG.md` and Markdown under `docs/` may differ. The maintained site archive is evidence, not another npm0.7.1 upload.

The local worker runs a fixed reviewed automation checkout, independent of either release source. GitHub Releases provide data and exact assets, never executable commands or native configuration. Public repository PR workflows do not run on the production host.

## Authorized automatic lane

Only `naeil`, `estimate`, `jev` execute, in that order. [standing-services.json](standing-services.json) contains concrete production routes, locale/auth states and anonymous central-login probes. It explicitly describes representative live chrome coverage; parameterized business records and mutation/save/stream scenarios remain isolated consumer test gates. Historical discovery of other domains stays in [services.json](services.json).

Initial0.7.1 adoption verifies the actual current shared-session artifacts, archives/manifests, ownership, protected/public routes and independent chrome/account references. It does not fabricate a0.7.0 predecessor or adopt the retained password-auth application as an automatic recovery target.

Ordinary unattended changes begin with consecutive0.7.x patches, contract1, fix-only release classification and an unexpired private policy. A frame/DOM/guard patch additionally needs a private `reviewedMigration` approval for that exact release and every selected service (see [automation.md](automation.md)); without it the worker blocks the release. The chosen initial operational window is90days through0.7.99. Contract/API/DOM changes and expired authorization stop for a reviewed migration. The release publisher still produces and validates each new package/reference; the worker then updates the selected services without per-app manual deployment commands.

## Execution and recovery

The launchd worker polls published stable releases on the existing host, freezes the exact tag/asset identities, validates package and reference hashes, and records an invocation before dispatch. It first proves the exact Git/Vercel website source and live UI, then runs each native consumer's update, test, build, package, managed activation and production check. Native clones come from the private remotes; Estimate uses the filtered history and source SHA correspondence map.

Native adapters bind dedicated runtimes, current manifests, process/listener/lock ownership and unchanged configuration. They preserve business data and stop/start only the owned service naturally. Jev takes a SQLite backup with a scratch restore proof; Estimate captures private copies of its data and backups, reads every copy back against the snapshot hashes, restores them into a scratch directory to prove the bytes and schema3 revision (`proof.json`), and verifies the live bytes are unchanged before and after the transition. Neither proof restores over live data. Automatic recovery selects only the exact verified shared-session-compatible predecessor. It changes code and preserves the latest data. Current/previous/failed releases and recovery evidence are retained.

The shared STOP file blocks new stages; it never abandons a stage already in flight. The dispatcher records `stopped` (or `authorization-expired`/`disabled`) in its summary without creating a durable block, and resumes from the same release record once STOP is removed. Before any change, Estimate reports STOP as `deferred`; after its consumer source update it reports `gate-failed` with `stopped-after-source-update` (runtime untouched). Once the Estimate bridge has requested the service stop, it completes the bounded switch and start despite STOP or approval expiry, or keeps the durable phase for recovery. Jev's native transaction already restores its previous code after a failure that follows the stop.

When an Estimate activation fails after the stop has begun, the adapter recovers automatically only if the retained marker belongs to this exact attempt's activation, its phase is a known pre-verification phase, `current` points to the predecessor or candidate, STOP is absent and the code-only rollback approval is active. It then runs the bridge `recover` action bound to the marker digest and verifies the predecessor in production. Any other condition keeps `activation-pending`, the lock and the marker for an operator.

A dispatched command with uncertain completion remains stopped for reconciliation; removing a lock/marker is not a retry strategy. A nonzero exit with a bound, owner-only result of `gate-failed`, `activation-pending`, `review-required` or `not-deployed` is recorded as that result. Missing, unbound or timed-out output stays `uncertain`. Estimate idempotency ledgers record terminal outcomes and retain earlier ledgers as history files; a proven pre-change deferral is retried on the next poll. If cached evidence for an earlier service is older than `maxEvidenceAgeSeconds` while a later service still runs, the dispatcher re-verifies the same artifact read-only and appends the new receipt; failure blocks with `cached-evidence-reverification-failed`. No force kill, lease deletion, data initialization, historical database restoration or fallback to retired authentication is part of rollout.

The website observer correlates successful Git deployments with the current public identity. An early CI or deployment failure does not prove which artifact is live; recovery requires a fresh identity and platform inspection. A site failure stops native rollout and retains its result for operator recovery through the existing platform. The observer does not perform Vercel rollback.

## Private verification and evidence

Protected checks use an existing authorized account through a private renewing Supabase session. Rotation persists atomically before browser use, and the refreshed session must outlive the entire configured verification deadline plus five minutes. Revocation, expiry, another user, overlapping refresh or an ambiguous refresh outcome stops verification; it never falls back to anonymous success. Public routes use independent anonymous contexts. Sessions, action configs, backups and raw native logs stay owner-only outside the repositories.

Verification binds identity before/after, exact routes and structural markers, frozen geometry/colors, canonical links, menu/theme/focus behavior and account styles. It does not collect account names, email, business content or browser traces, click logout, call a model, or change central grants. The production standing verifier disables screenshots; isolated tests exercise destructive and dirty-state flows.

A complete receipt names the three selected services and exact release/source/artifact/reference identities. Installation and successful baseline adoption are distinct from a later genuine-release end-to-end observation. Do not invent a patch to demonstrate success or describe a future release as tested before it exists.

## Release assets

Each stable GitHub Release supplies `release.json`, the exact npm archive, frozen chrome and account references, and the separate site package archive when site/package source differs. The manifest includes `releaseId`, exact version/predecessor, package `sourceRevision`, `siteSourceRevision`, archive/reference URLs and SHA256 values, `siteRuntimeSha256`, contract version and reviewed change classes. All URLs are version-scoped GitHub release assets. npm byte identity and fresh registry React/Next consumption remain separate publication checks.

The old Actions/prebuilt adapters in [automation.md](automation.md) are retained historical preparation. They are not the installed standing execution path and must not be enabled to bypass the current native/shared-session gates.

## Publishing the next patch release

Preserve the frozen0.7.1 archive, references, tag and assets. For the next genuine fix patch, follow this order:

1. Commit the package source on main and wait for a successful **push** run of `.github/workflows/verify.yml` for that exact SHA. Freeze the npm archive from that clean source.
2. Select the exact site source SHA on main; require its successful push verification run and its Git/Vercel production deployment. Pack the separate site archive from that clean SHA and compare its public runtime with the frozen npm archive.
3. Generate chrome and account references from the frozen package's reviewed source/archive using the [maintained capture commands](release-preparation.md). Run `node scripts/rollout/prepare-release.mjs prepare INPUT.json` to validate provenance fields, runtime parity and reference metadata, and assemble a fresh private asset directory.
4. Create a **draft** release with every prepared asset, including `release.json` and `site-runtime-verification.json`. Export its actual asset listing and run `node scripts/rollout/prepare-release.mjs check OUTPUT_DIRECTORY DRAFT_ASSETS.json`. Publish only after that check and the separate npm byte-identity/registry-consumption checks pass.

Never add, replace or delete assets, or move the tag, after publication: the worker blocks with `published-release-changed`. GitHub platform immutable releases is currently false; worker-side immutability checks still apply. Keep other main merges outside the release window until the observer verifies the selected site SHA. If another revision is live, the observer defers with `site-revision-not-live`. Main pushes no longer cancel each other's CI; a cancelled exact-SHA run is treated as waiting and can be re-run. Local preparation does not prove main ancestry, successful CI, clean-source packing or a live deployment.

## Monitoring

After **every** dispatcher poll, including a nonzero exit, the private launcher should run `node scripts/rollout/standing-monitor.mjs CONFIG --dispatcher-exit N`. Installing this hook in the live launcher is a separate reviewed operation. The monitor reads private `summary.json` and `state.json`, writes current `alerts.json`, and persists first-seen timers, notification history, cleared alerts and delivery failures in `monitor.json` (0600). `monitor-notification.json` contains the notifications selected for the current delivery attempt.

Blocked state, nonzero dispatcher exit, missing state/summary or observations older than20minutes alert immediately. Waiting/deferred states alert after6hours; authorization warns within14days and alerts on expiry; STOP warns after24hours. Stable fingerprints notify on first observation, escalation and at most once per24hours while present. Optional `config.monitor` settings are `staleSeconds`, `waitingSeconds`, `expiryWarningSeconds`, `stopWarningSeconds` and `repeatSeconds`, subject to the bounds in [standing-monitor.mjs](../../scripts/rollout/standing-monitor.mjs).

Delivery to a person requires an explicitly configured `monitor.notifier` (`file`, `args`, `timeoutMs`): an absolute executable pinned in `trustedFiles`, invoked without a shell with the private payload path in `NAEIL_STANDING_ALERT_FILE`. Script arguments must also be pinned. Child output is never copied into alerts; notifier failure is recorded without crashing the monitor. With no notifier, new notifications produce bounded stderr lines. **No external notifier or recipient is configured yet.**

## Operator checks

The private configuration records the immutable automation checkout, complete trusted executable/helper hashes, explicit execution PATH, existing account session, service configs and bounded policy. Native consumers remain on dedicated `rollout/standing` branches; changes since each reviewed source may include only the exact UI dependency, lockfile and vendored package. The updater rejects package metadata changes outside `dependencies["@naeil/ui"]` and lockfile changes outside the UI importer/package/snapshot blocks before committing; any other dependency graph change requires review. Recompute pins only after reviewing the changed code, never as automatic recovery from a mismatch.

Dependency-update commits made by the worker on each consumer’s local `rollout/standing` branch are not pushed automatically. Include those clones (or a git bundle of `rollout/standing`) in the recovery inventory before replacing a host.

With the configured Node executable, `scripts/rollout/standing-dispatcher.mjs plan /absolute/private/config.json` validates configuration without dispatch. `poll` performs one bounded pass. The local `dev.naeil.ui-standing-rollout` LaunchAgent supplies a five-minute cadence and obtains the existing GitHub credential in memory through a fixed local launcher. Child transport forwards `GH_TOKEN`, `GITHUB_TOKEN` and `NAEIL_STANDING_VERCEL_TOKEN` only to the naeil observer rollout invocation, never to verifiers, native adapters or native bridges.

Create the configured `policy.stopFile` to block new stages. `standing-dispatcher.mjs inspect CONFIG` reads the blocked record, each service's bound result, the retained `output.json`, Estimate lock/marker/ledger presence and the live public identities without changing anything. `standing-dispatcher.mjs reconcile CONFIG RELEASE_ID SERVICE_ID RESOLUTION --approved-by NAME --reason TEXT` accepts only `retry-pre-mutation` (a bound result proves `mutationAttempted=false`) and `retry-after-gate-failure` (a bound gate failure proves the runtime was untouched, the Estimate lock and marker are absent and the live identity equals the previously verified artifact). It appends the prior record, approver and reason to the release history and lets the next poll start a new attempt. Uncertain or runtime-changing native work is never reconciled this way: preserve the marker and current data, determine which stage completed and use the native recovery procedure. Do not delete a marker to induce a replay. An expired authorization window requires a new reviewed policy before further patches run.
