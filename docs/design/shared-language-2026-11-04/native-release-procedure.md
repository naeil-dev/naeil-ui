# One-release 0.10.0 native deployment review (proposal; no operation performed)

Reviewed 2026-11-04. Scope: Jev and Estimate managed launchd services on this Mac. This is a manual one-release procedure for review, not permission to run it. It does not invoke or change the 0.7.x runner, native gates, sealed wrapper, old transaction journals or old approvals. Do not execute a command block unless all preceding gates for its exact service pass. No DNS/tunnel change, unrelated process signal, business initialization, credential reset or database restore is part of deployment or code rollback.

## Current ownership observed read-only

| Service | Managed job | Listener | Executable | Working directory |
|---|---|---|---|---|
| Jev | gui/501/dev.naeil.jev | 2466; observed PID83407 | /Users/jaymini/.local/bin/node; v22.23.2 | /Users/jaymini/.local/share/jev/app (real directory) |
| Estimate | gui/501/dev.naeil.estimate | 2473; observed PID9732 | /Users/jaymini/.local/share/estimate-runtime/node-v24.21.0-darwin-arm64/bin/node; v24.21.0 | /Users/jaymini/.local/share/estimate-app/releases/259f9e0a1f13-1d470ae5cd09/app |

Both observed jobs/listeners have UID501, PPID1, matching mapped Node executable and cwd. Estimate lock PID alone was checked and equals9732; its nonce was neither output nor retained. These are observations, **not future signal authority**. Fresh ownership and idle checks must occur immediately before each stop, including recovery stops. I did not check live business contents, Jev leases, idle connections or capture any data. Public-service-metadata.json is a metadata receipt, not an activation grant.

Current plists:

- `/Users/jaymini/Library/LaunchAgents/dev.naeil.jev.plist`: KeepAlive true; arguments `[ /Users/jaymini/.local/bin/node, --env-file=/Users/jaymini/.local/share/jev/server.env, /Users/jaymini/.local/share/jev/app/server.js ]`; cwd is app; fixed PORT2466/HOSTNAME127.0.0.1/NODE_ENVproduction. No explicit sender setting in plist. server.env contents were not read.
- `/Users/jaymini/Library/LaunchAgents/dev.naeil.estimate.plist`: KeepAlive true, ExitTimeOut20; arguments `[ dedicated Node24, /Users/jaymini/.local/share/estimate-app/current/app/server.js ]`; cwd current/app. DATA_DIR is `/Users/jaymini/.local/share/estimate/data`; credential/signing paths are `/Users/jaymini/.local/share/estimate/auth/credential.json` and `.../signing.key`. Runtime mode production, ESTIMATE_SERVE and NEXT_MANUAL_SIG_HANDLE retained. No explicit sender setting in plist. Secret environment values were not inspected/output.

Estimate current is an absolute symlink to `/Users/jaymini/.local/share/estimate-app/releases/259f9e0a1f13-1d470ae5cd09`. Do not apply a symlink deployment recipe to Jev's real app directory.

## Exact candidates and environment boundary

Jev frozen bytes:

- Archive `/Users/jaymini/.local/share/naeil-shared-language/2026-11-04/jev-final/jev-final.tar.gz`.
- SHA256 `ab7767a9c8f592b28f09b8660b9aa6cca6f2650df3671fd4ea9093984d3d74b0`.
- Authoritative byte inventory `jev-final/preservation.json`, key `entries`; preserved standalone `jev-final/standalone`.
- Source `5f4b1fc07415e450252444efa89f42722b491552`; BUILD_ID `G2swU7GBFotEIQR2tJRGv`; public artifact `jev-ui07-5f4b1fc07415`; UI0.10.0/contract1.
- UI archive SHA256 `a4a1e312f2f608358a10f9019c248af37a8172bb116d3bc506144442cb963fb4`.

Estimate successor frozen bytes:

- Archive `/Users/jaymini/.local/share/naeil-shared-language/2026-11-04/estimate-final/cookie-rotation-cf8ed5e/estimate-cf8ed5ebef08.tgz`.
- SHA256 `a2ffe5b18d08f0e737db1f41842efad209284ae1cafe840f116aa393010e4885`.
- Release directory `.../cookie-rotation-cf8ed5e/release/cf8ed5ebef08-9712b1345b03`.
- manifest SHA256 `d0e6815dd8ee427b1d035b1aaf56d8cc43cb8797d776a204aee206082cbd715a`.
- Source `cf8ed5ebef085807737438521ad9db5f5c045f8b`; releaseId `cf8ed5ebef08-9712b1345b03`; artifactId/BUILD_ID `2a37c7a5-6b50-418f-b035-836c8ad06ceb`; UI0.10.0/contract1.
- The successor supersedes cdff34f because it fixes refreshed-cookie loss. Do not deploy the superseded archive. Root verified the successor final receipt and full 2940-entry artifact inventory; see local-final-receipt.json. Fresh activation checks below remain required.

**Neither Jev nor Estimate needs a production-secret rebuild merely because acceptance used synthetic runtime fixtures.** Their auth origins/keys, app origin and sender flag are server runtime reads. Jev's generated Next config has no inlined env; Estimate's has only `NAEIL_UI_BUILD_IDENTITY`. Both app layouts are request-dynamic and pass `process.env.NAEIL_LOCALE_SEND_ENABLED === '1'` into the common controller. The exact same Jev build passed sender0/sender1 and public APP_ORIGIN fixture tests. Read-only bounded scan of both candidate `.next` JS trees found no known fixture key/55531/55421 literals. This is not a secret scan or arbitrary-environment attestation.

The source note was reviewed read-only by the Jev delegate and then integrated by main. The original note and SHA are retained in local-final-receipt.json. The current proposal adds no runtime code or reusable deployment runner.

**Site differs:** `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are inlined into browser/server bundles. A Site build made with local synthetic settings cannot be deployed by replacing runtime variables; it needs a fresh production-bound build, new identity/receipts and relevant checks. The Site sender flag is server-runtime for request-rendered pages but can be captured in prerendered output, so validate actual production route output after building. Do not generalize Site's compile-time requirement to these two native apps.

For Jev/Estimate, use only the existing managed production configuration at startup. Never start the production app with Playwright's auth/model preload, test DB/data paths, fixture key, `JEV_TEST_*`, `NAEIL_PREFLIGHT_MODE`, temporary runtime settings or `NODE_OPTIONS --import` overrides. Do not copy `.env`, server.env, auth files, data, logs, locks or test fixtures into candidate code. Source/build identity is compile-time and immutable; senderoff is runtime. Rebuilding changes the artifact and requires a new frozen receipt.

## Preparation gates (before any stop)

1. Confirm the single current release authorization names these exact candidates, current installed predecessors, senderoff, preservation scope and recovery. Acquire one new manual operation lock with exclusive mkdir under `.../operational-preparation/manual-010.lock`, recording owner PID/start and phase. Refuse an existing lock; never remove it without dead-owner/reconciliation review. Inspect current managed jobs and exclude concurrent operators. Historic wrapper state/PIDs/approvals do not grant or prevent a newly authorized operation by themselves.
2. Recompute archive/manifest hashes, full code inventories and symlink containment. Validate no runtime/private member is packaged. For Jev compare every preservation.json entry and reject extras; for Estimate compare manifest artifactFiles, public identity, sourceFiles/package hash and BUILD_ID. Extract only into a new same-filesystem staging directory; reject absolute paths, `..`, special files and symlinks escaping the staged tree. A plain unvalidated tar extraction is not a gate.
3. Record fresh live predecessor identity, full code inventory and original pointer/directory identity. Preserve exact installed code; the old rebuilt fallback worktree is not a byte-identical installed predecessor. For Estimate verify current manifest and entire app inventory. Confirm compatible current schema3/shared-session enforcement; do not use older password-only/schema1/schema2 code. The old native helper's exact server/domain equality gate cannot simply be relaxed: source changes require the reviewed new compatibility evidence.
4. Fresh data capture outside rolling backups and separate from code: Jev uses SQLite online-backup API with read-only source, integrity check and a second stopped capture; never raw-copy only state.sqlite while WAL is active. Capture latest schema/data fingerprint privately, not row output. Estimate captures exact current estimates.json plus **every** backups file, bounded schema3/revision and calculation equivalence, repeated stable hash/inventory checks. Preserve credential/key/env/plist metadata only, and retain original plist privately if making the narrow sender field change. No old snapshot is restored during activation or code rollback.
5. Pin metadata of existing data roots, Jev server.env/password/key paths and preserved release directories, Estimate auth paths and both executable/plist files. Do not hash/copy/read secret-file contents. Data snapshot operations belong to the authorized activation, not this read-only review.
6. Senderoff must be explicit in the newly loaded managed process. Recommended concrete config delta: add only `EnvironmentVariables.NAEIL_LOCALE_SEND_ENABLED = "0"` to each existing plist, preserving all other fields/values and original permissions/ownership. Prepare/review a private copy first; compare parsed dictionaries after removing that one key and require equality. Install atomically with fsync only as part of the authorized operation, retaining the original. Node process env overrides Jev's `--env-file`; this prevents a file value from enabling sends. Do not use `launchctl setenv` (global) or assume `env ... launchctl bootstrap` configures the child's environment. Do not dump plist environment contents. Restore pre-operation plist only for an approved full recovery, keeping senderoff on any receiver-compatible rollback.

## Fresh ownership checks, executable commands

Run these read-only checks at preparation **and again immediately before stop**. Assign the PID from the current single listener, never from this note:

```sh
/bin/launchctl list
/usr/sbin/lsof -nP -iTCP:2466 -sTCP:LISTEN -t
/usr/sbin/lsof -nP -iTCP:2473 -sTCP:LISTEN -t
/bin/ps -p "$fresh_pid" -o uid=,ppid=,lstart=,comm=
/usr/sbin/lsof -a -p "$fresh_pid" -d cwd -Fn
/usr/sbin/lsof -a -p "$fresh_pid" -d txt -Fn
/usr/sbin/lsof -nP -a -p "$fresh_pid" -iTCP -sTCP:ESTABLISHED -Fp
```

Filter `launchctl list` to the exact label without `launchctl print` (which exposes environment). Require one matching launchd PID/listener; UID501/PPID1; executable equals pinned node; cwd equals exact active app; unchanged start-time and inode metadata. Ensure no extra owned/unowned process has cwd in that active app/release. For Estimate require application-lock pid equals the managed PID; do not output its nonce. For Jev require zero rows in operational leases and no established connections twice with a short interval. For Estimate wait for no active request/writer work and stable latest-data snapshot. A busy service defers; never delete leases, remove writer locks, force-kill, or assume a closed browser means idle.

## Jev code transition (reviewed operation commands, not executed)

Use a unique transaction directory under `/Users/jaymini/.local/share/jev/releases/manual-010-<receipt-id>` with0700 mode. Populate `staged-app` with verified candidate bytes, keep `previous-app` and `failed-app` initially absent. All moves remain on the same filesystem. Log/fsync each intended phase before mutation.

After fresh ownership/idle/preservation checks and verified online backup:

```sh
/bin/launchctl bootout gui/501/dev.naeil.jev
```

Poll for natural job removal, no listener2466, death of the exact old PID/start and no app-cwd process. Bound wait60s; if anything survives, stop the procedure and retain evidence. Do not rename code. After complete stop, make the stopped SQLite backup and ensure metadata/data expectations still match.

```sh
mv /Users/jaymini/.local/share/jev/app "$jev_transaction/previous-app"
mv "$jev_transaction/staged-app" /Users/jaymini/.local/share/jev/app
/bin/launchctl bootstrap gui/501 /Users/jaymini/Library/LaunchAgents/dev.naeil.jev.plist
```

Fsync both affected parent directories after each rename. If the second rename fails while no service started, verify directory states and restore previous-app to app before restarting. Do not blindly rerun moves. Bootstrap happens once with the reviewed senderoff plist and existing server.env; ambiguous bootstrap results require inspection, not repeat calls.

Within a bounded30s readiness gate require new managed job/listener/executable/cwd and exact candidate identity:

```sh
curl --fail --silent --show-error --max-time 3 http://127.0.0.1:2466/api/health
curl --fail --silent --show-error --max-time 3 http://127.0.0.1:2466/.well-known/naeil-ui.json
```

Require health `{ok:true}`, exact identity/source/UI/build bytes, private no-store where applicable, existing data path/inode and auth/config metadata unchanged, no database migration/data regression. Then run public HTTPS three-language document/Flight/auth-recovery and senderoff checks with the approved verification account boundary. No live model comparison or business write is needed for this receiver gate. The package's rendered public header identity alone does not prove auth/RSC behavior.

## Estimate code transition (reviewed operation commands, not executed)

Stage the complete verified successor release directory at:

`/Users/jaymini/.local/share/estimate-app/releases/cf8ed5ebef08-9712b1345b03`

Use a new sibling `.staging` directory; compare every final app entry/manifest before one rename into the final releaseId. Never overwrite an existing release with different bytes. Source archive may remain in durable evidence; manifest plus app are required at runtime. Keep predecessor `259f9e0a1f13-1d470ae5cd09` intact.

After fresh full latest-data/backups capture, compatibility and ownership gates:

```sh
/bin/launchctl bootout gui/501 /Users/jaymini/Library/LaunchAgents/dev.naeil.estimate.plist
```

Wait for job removal, exact PID/start death, no2473 listener, no process cwd in the release, and **natural disappearance** of `/Users/jaymini/.local/share/estimate/data/.estimate.lock.json`. Bound wait60s; retained lock or worker means stop/manual recovery, never unlink the lock. Recompare stopped data/backups and protected metadata before switching.

Atomic symlink replacement (only after verifying current still resolves to recorded predecessor):

```python
from pathlib import Path
import os
root = Path('/Users/jaymini/.local/share/estimate-app')
target = root / 'releases/cf8ed5ebef08-9712b1345b03'
previous = root / 'releases/259f9e0a1f13-1d470ae5cd09'
assert (root / 'current').is_symlink() and (root / 'current').resolve() == previous
staged = root / '.current-manual-010.tmp'
assert not staged.exists() and not staged.is_symlink()
os.symlink(str(target), staged)
os.replace(staged, root / 'current')
fd = os.open(root, os.O_RDONLY)
os.fsync(fd)
os.close(fd)
```

```sh
/bin/launchctl bootstrap gui/501 /Users/jaymini/Library/LaunchAgents/dev.naeil.estimate.plist
curl --fail --silent --show-error --max-time 3 http://127.0.0.1:2473/api/health
curl --fail --silent --show-error --max-time 3 http://127.0.0.1:2473/.well-known/naeil-ui.json
```

Require new launchd/listener/lock PID equality and pinned Node24/cwd, current pointer and entire candidate inventory, exact UUID/source/UI identity, then-current schema3 main/every-backup preservation and auth/config metadata. Run receiver-off public HTTPS route/auth/RSC/cookie-rotation checks; do not infer success from an anonymous200 or health only. Any requested save/restart-persistence exercise is a separately explicit business-write test with fresh preservation—not automatic permission from this code deploy.

## Recovery is phase- and identity-bound

- **Before stop:** failure leaves service untouched; preserve staging/logs. Release only this operation's demonstrably owned lock after journaling not-started.
- **After stop but before switch:** confirm exact old app/pointer remains; bootstrap the original verified managed configuration; verify old health/identity/current data. Do not rerun preparation as if no partial operation occurred.
- **After switch/start failure:** inspect managed ownership anew. Stop only the new candidate's verified job; if candidate crashed, require no live/unowned app process or listener (and no Estimate lock) before switching. Ambiguous state remains manual recovery. Keep candidate code as failed evidence. Jev moves candidate app to this transaction's failed-app, then recorded previous-app to app. Estimate atomically replaces current with the **recorded verified predecessor** using the same temp-symlink/os.replace pattern. Restart the correct managed plist. Recheck predecessor identity, data/backups, auth/config metadata and public behavior. Never restore an older DB/JSON snapshot or discard a current revision.
- **After public locale exposure:** installed pre-0.10 predecessors are emergency fallback only. They do not preserve the new locale address contract. If used, withdraw rollout completion and record locale URLs returning their tested fail-closed responses. The fresh rebuild of8fa67de is only bounded fallback evidence; installed previous-app bytes are the concrete recovery target. Estimate older password-only/schema1/schema2 targets are forbidden. If enforcement or current schema compatibility cannot be proven, keep protected access stopped and seek forward repair.
- **Normal language-compatible rollback:** once this receiver is validated, retain this exact0.10 artifact and disable sender at runtime (restart the same managed service with sender0 after the same preservation/ownership gates). No rebuild is required for these two sender switches. Never point a sender-active fleet to a locale-incapable receiver as an ordinary rollback.
- Run services sequentially. Keep senderoff across all owned receivers until cross-service deployment receipts agree; enabling sends is a later concrete action. Preserve every original/final plist, code predecessor, archive, fresh data capture and phase receipt. No old automation approval/PID or polling timestamp is reusable authority.

## Review conclusions / remaining preparation

1. The unchanged0.7.x guard is correct: local-consumers.mjs and jev-native.py explicitly reject0.10; Estimate additionally demands identical server/domain inventory. Do not invoke these helpers with a fabricated version or patch their guards. The proposed one-release manual operation must reproduce relevant safety checks with newly bound inputs.
2. Current Jev/Estimate frozen code is environment-portable for their server runtime configuration; Site's synthetic NEXT_PUBLIC build is not. Rebuilding Jev/Estimate solely to read production secrets is unnecessary and would invalidate tested-byte identity.
3. Jev rewrite does not use public APP_ORIGIN as internal transport authority. Its tested standalone passed public APP_ORIGIN plus HTTPS forwarding headers over loopback for all3roots. Estimate cf8 successor includes its separately reviewed rewrite/cookie fixes; use the successor receipt.
4. Current ownership is concretely established above. Fresh idle checks, production data baselines, senderoff plist delta/install and actual public activation/rollback remain unperformed. The main plan should bind their reviewed outputs before the final operation; do not describe this review as deployment-ready execution evidence.
