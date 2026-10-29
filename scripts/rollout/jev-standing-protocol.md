# Jev standing adapter — historical protocol

The standing adapter and dispatcher described below were retired on 2026-10-29. This document preserves the old envelope and evidence semantics; its configuration and commands are historical. Current execution uses the [local rollout runner](../../docs/rollout/local-runner.md). The maintained `jev-native.py` accepts only local envelopes; the original helper fixture and retained transaction fingerprints remain unchanged.

`jev-standing-adapter.mjs` implements the standing dispatcher envelope. `jev-native.py` owns the native transaction; `jev-candidate.mjs` prepares the isolated consumer browser suite. Historical Jev CLIs and the owner checkout remain unchanged. The dedicated clone is `~/.local/share/naeil-ui-rollout/consumers/jev`, branch `rollout/standing`.

## Invocation and private configuration

Configure the dispatcher command as an absolute Node executable with argv containing the absolute `jev-standing-adapter.mjs` path, `shell:false`, and an adequate bounded timeout. Supply owned0600 JSON through `NAEIL_ROLLOUT_INPUT` and `NAEIL_ROLLOUT_OUTPUT`.

```js
{
  schemaVersion: 1,
  release, service, policy, trustedFiles, executionPath,
  idempotencyKey, attemptId,
  mode: 'adopt' // or 'standing'
}
```

For an owner-provisioned input file, the same entry point executes either mode; the reviewed dispatcher invokes it with `shell:false`:

```sh
NAEIL_ROLLOUT_INPUT=/PRIVATE/jev-attempt.input.json NAEIL_ROLLOUT_OUTPUT=/PRIVATE/jev-attempt.output.json /ABSOLUTE/REVIEWED/node /ABSOLUTE/rollout/jev-standing-adapter.mjs
```

The canonical private config path is `service.adapterOptions.standingConfigPath`. `JEV_ROLLOUT_CONFIG` is a compatibility fallback. Provision the disabled example at `/tmp/jev-standing-config.example.json`; replace every placeholder before enabling it. Private state/artifact directories must be owned0700. The trusted-file closure supplied by the dispatcher is rehashed at every gate, including native and verifier boundaries.

- `executionPath` is taken from the private config or dispatcher input. If both exist, they must match. Every explicit PATH directory must be canonical and absolute. Prefer `/Library/Developer/CommandLineTools/usr/bin/git` ahead of `/usr/bin/git`; optional `gitExecutable` must equal the first PATH git. Node/pnpm/Python and the verifier executable are absolute; Node/pnpm versions are pinned.
- Git runs with system/global config disabled and command-level hooks, fsmonitor and commit/tag signing disabled. The synchronous generic updater receives the same clean environment as install/build/package commands.
- `reviewedSourceRevision` is the full reviewed consumer commit, initially `e1f1cee27b90bd516b58797b4efadb697ea23a8c`. Before and after the updater, after build and after browser tests, require that commit to be an ancestor of clean `rollout/standing` HEAD. Its cumulative diff may change only `package.json`, `pnpm-lock.yaml` and `vendor/naeil-ui-*.tgz`; all post-update checks also require the exact updater-returned HEAD. An unrelated committed app change requires a separate review and a new private pin.
- `baselineArtifact` pins current app ID, full application source revision, UI version/contract, `packageSha256`, archive path/SHA, canonical manifest SHA/path, immutable digest-containing storage reference and BUILD_ID. This is the shared-session artifact, never its historical password predecessor.
- `native.databaseIdentity` is `[st_dev, st_ino, mode & 0777, st_uid]`; live size/mtime are deliberately excluded. `envMetadata` and `passwordMetadata` are `[st_dev, st_ino, st_size, str(st_mtime_ns), mode & 0777, st_uid]`: tuple index3 is a canonical decimal **string**, while the other entries are integers. Nanosecond timestamps exceed JavaScript's exact number range; never encode them as JSON numbers or accept a rounded fallback. The example timestamp is illustrative and must be replaced with the exact `str(os.stat(path).st_mtime_ns)`. `envKeys` contains exact key names only. `preserveDirectoryIdentities` maps every `preserveDirectories` absolute path to `[st_dev, st_ino, mode & 0777, st_uid]`; retain the current shared-session release and its `previous-app`.
- Pin exact plist bytes, label, argv, cwd, KeepAlive, native Node version and shared-session env-key contract. Values/credentials are never carried in requests/results. The native helper reads configured env values only during an authorized invocation, never logs them, and preserves their metadata.
- `verificationCommand` is `{file:absolute,args:[...],timeoutMs}` (`executable` alias accepted). If browser assets use a custom cache, provision optional absolute `browserDirectory`.

Runtime script closure under `scripts/rollout/`: `jev-standing-adapter.mjs`, `jev-candidate.mjs`, `jev-native.py`, `rollout.mjs`, `update-consumer.mjs`, `route-contract.mjs` and `standing-config.mjs`. Python uses the standard library only. Provision full `trustedFiles` hashes for these scripts, the configured canonical Node/pnpm/Python/git executables, `/usr/bin/tar`, `/usr/sbin/lsof`, `/bin/ps`, `/bin/launchctl`, and the configured common verifier plus its dependency closure. The consumer's dynamically imported `scripts/candidate-files.mjs` has only Node standard-library imports; its bytes and all build/test scripts are bound by the reviewed source/allowed diff checks. The copied browser harness has the separate fixture manifest/provenance checks below. If `trustedFiles` is also supplied in private config, it must equal the dispatcher input. Test files and this document are not runtime imports.

## Adoption and subsequent patches

`adopt` requires a live approved policy scoped to Jev, unexpired authorization and inactive STOP. It binds exact configured current0.7.1 app/source/archive/manifest/package, performs native inspection, common protected production verification and a second native inspection, then records the verified baseline. It requires no prior artifact or patch-window/migration exemption. Native adoption accepts `inspect` only.

`standing` requires a saved verified predecessor, consecutive0.7.x versions, changes exactly `['fix']`, contract1, and the approved inclusive `policy.patchWindow.{minVersion,maxVersion,contractVersion}`. It checks the old baseline's exact tree/ownership and refreshes its public verification with that baseline's own frozen release/reference before dependency changes. Other migrations require review outside this adapter.

The pipeline updates exact vendored UI bytes and lock in the isolated clone, installs with `--no-frozen-lockfile --ignore-scripts` followed by `--frozen-lockfile --ignore-scripts`, checks every installed package file, runs `pnpm run test`, `typecheck`, `lint`, `build`, and packages an immutable standalone archive. Contained source links are rewritten to relative in-artifact targets. Code tree, source HEAD/branch/cleanliness and installed UI bytes are checked again after browser tests.

The copied Playwright harness retains all auth/guard/behavior assertions. Its reviewed30-file fixture/config SHA is `f35c241851f35bec1f4d5cbdfceec460a381b9ba20b64cb1c74165a82ba45367`. Only two version literals, two contract literals, and the independent account-reference path/digest change. The renderer hash remains pinned. Unknown source drift fails; an explicitly reviewed private `candidateFixtureSha256` can pin a later reviewed fixture set. Original/generated file hashes and helper provenance are retained, and harness bytes are rechecked after tests.

Native staging validates archive members, manifest, identity, BUILD_ID and the exact predecessor. The durable transaction binds attempt/release/service/idempotency, artifacts, complete native config and release fingerprint. Activation checks ownership and idle leases/all established app TCP connections twice, obtains WAL-aware online backup plus scratch restore proof, rechecks policy/config, stops the owned job, proves process/listener/job disappearance, obtains another independent backup/restore proof, swaps only code, and verifies exact loopback health/identity/tree. Current, previous and failed code and all backups remain available.

## Common verifier contract

Each verifier subprocess gets fresh0600 files in `NAEIL_VERIFY_INPUT` / `NAEIL_VERIFY_OUTPUT`. Request fields include the original envelope, `phase`, `artifact`, `origin`, `expectedIdentity`, `referencePath` and private `outputDirectory`. Phases are `adopt`, `production`, `rollback`; refreshing a predecessor uses phase `adopt` with its stored release, while rollback uses phase `rollback` with that same stored release.

The verifier evidence root must contain `<stateDirectory>/attempts/<attemptId>/browser-{adopt,production,rollback}`. Results must echo schema/release/service/idempotency/attempt/phase and return `passed:true`, exact public identity, archive/chrome/account digests, fresh `checkedAt` and every registered route/state key. No credentials/cookies belong in these files.

## Results, uncertainty and recovery

Results are `production-verified`, `deferred`, `gate-failed` or `activation-pending`, with exact binding fields, `mutationAttempted`, artifact and production evidence. Only proven pre-mutation deferrals carry `mutationAttempted:false` and may retry. Failed/uncertain invocation output never exposes child logs or provider details.

Durable `<stateDirectory>/running.lock`, attempt results and native `releases/ui-<attemptId>/transaction.json` prevent automatic replay. Timeout, missing/foreign activation response, surviving process or failed durable evidence write retains the lock and pending state. An operator must reconcile exact current tree, job ownership and saved transaction/evidence; the adapter never steals locks or silently retries uncertainty.

A failed production check may roll back only with live `rollbackApproved:true`, `rollbackScope:'code-only'` and inactive STOP. It stages the captured verified predecessor's archive, preserves rejected/recovery code, uses the same native safety transaction, and verifies the predecessor against its own frozen reference. The full policy/frozen-input/trusted-file gate runs before native rollback, before browser verification and before final native inspection. It never restores DB/password/config or chooses the old password-era `previous-app`.

## Verification and operating limits

Run focused synthetic checks with:

```sh
node --test scripts/rollout/jev-standing-adapter.test.mjs scripts/rollout/jev-candidate.test.mjs
python3 -B scripts/rollout/jev-native.test.py
pnpm exec eslint scripts/rollout/jev-standing-adapter.mjs scripts/rollout/jev-standing-adapter.test.mjs scripts/rollout/jev-candidate.mjs scripts/rollout/jev-candidate.test.mjs
```

Final verification on2026-10-23: focused JavaScript **27/27 passed** (25 adapter,2 candidate), native Python **21/21 passed**, unchanged historical native lifecycle **19/19 passed**, and ESLint exited0. The native count includes the later read-only preflight regression: actual temporary env/password file metadata passes Python→Node→Python JSON transport exactly, while legacy numeric transport and one-nanosecond metadata drift are rejected. The latest broader shared JavaScript run passed **127/127** before the final source-ancestry/rollback review; the27 focused cases and ESLint were rerun after those JS changes. No unchanged broad suite was repeated. The three JS boundary regressions and the timestamp transport regression each reproduced their failure before the fix and then passed.

The synthetic complete CLI test uses real private transports, git update/commit, archive/package/tree checks, copied harness and result bindings with fake app/test/build/native/verifier processes. Native tests use real temporary SQLite/WAL snapshots and code archives with mocked OS operations. A preparation proof copied the actual reviewed30-file Jev suite and checked its transformed manifest. These checks do not establish a real future-release production rollout.

Idle sampling cannot prevent a new ingress request between the final sample and managed stop. The adapter sends no forced signals; launchd's own ExitTimeOut remains an OS constraint. A genuinely published next authorized patch and owner-controlled native activation are still required to exercise the actual future production pipeline. No production activation, credential issuance, real DB/env payload inspection or worker enablement was performed by this implementation task.
