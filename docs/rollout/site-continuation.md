# Exact site continuation and standalone validation

The published release, `reviewedMigration`, original successful naeil request/result and native Estimate/Jev predecessors remain unchanged. `services.naeil.siteContinuationApproval` is a separately reviewed website authorization, embedded in the exact next config already bound by the transition plan. It cannot change package classification or extend the original migration expiration `2026-11-01T21:00:00Z`.

`resolveSiteTarget(release, approval)` returns `{schemaVersion:1,sourceRevision,deploymentId,archive,runtimeSha256,approvalSha256}`. Without an approval it selects only the original `release.siteSourceRevision`/`siteArchive`/`siteRuntimeSha256`; `deploymentId` and `approvalSha256` are null. A continuation request must carry that exact resolved `siteTarget` separately from its original `release`. Its production receipt must echo `siteTargetSha256:fingerprint(siteTarget)`.

An approval has exactly these fields:

```js
{
  schemaVersion: 1, kind: 'standing-site-continuation-approval',
  service: 'naeil', repository: 'naeil-dev/naeil-ui',
  releaseSha256: releaseIdentityDigest(originalRelease),
  oldSourceRevision: originalRelease.siteSourceRevision,
  sourceRevision: exactNewMainCommit, deploymentId: exactDplId,
  source: {root: canonicalRetainedClone, gitSha256: exactUsrBinGitDigest},
  // source.gitDirectory is optional, using the existing protected sibling-Git contract.
  treeSha: exactNewTree, diffSha256: exactFullBinaryDiffDigest,
  files: [
    {path, oldSha256, newSha256, oldMode, newMode, purpose}
  ],
  packageProof: {
    schemaVersion: 1, sourceRevision: exactNewMainCommit,
    archive: {path: separatelyPackedNewSourceArchive, sha256, bytes},
    runtimeSha256: originalRelease.siteRuntimeSha256
  },
  approvedBy, approvalRef, approvedAt, expiresAt, revoked: false
}
```

All commits/digests are exact lowercase SHA values. `collectSiteSourceFacts(source, oldSHA, newSHA)` provides review facts without fetching, checking out, building or packing. It independently checks local ancestry, every changed regular Git blob/mode, complete sorted file inventory, tree and `git diff --no-ext-diff --no-textconv --binary --full-index OLD NEW --` bytes. Review every file's purpose; do not adopt an automatically generated list without reviewing the whole site delta. The clone must use the existing sanitized Git configuration contract, with pinned `/usr/bin/git`. The new-source archive reference is private0600, regular, owned, canonical, single-link and at most64MiB. It has its own path and exact source proof; the old site archive is never renamed as proof. Runtime metadata and public bytes must equal the original frozen npm archive. Reviewer authorization binds the supplied archive to its declared source; validation does not rebuild it.

The observer independently checks main ancestry, latest exact-SHA main-push `verify.yml` CI, latest matching Production Git deployment, trusted `vercel[bot]` publishers, reviewed immutable-URL/GitHub-status/Vercel-API correlation and emitted production identity. An unapproved source returns `site-revision-not-approved`. Runtime equality alone grants no continuation. New current-site verifications append `reverifications` and `siteHead:{request,artifact,production}`; the original request/result stays byte-for-byte historical. The dispatcher compares current target, service/route/profile/verifier and generation before reusing evidence, and repeats live provenance immediately before each native dispatch. Native admission independently requires an operational nested prerequisite request with the same exact control/pointer/generation, configuration inventory, policy, executable closure, service and target as the native request's active configuration. Standalone, unfenced and foreign requests cannot become native authority by wrapping their evidence in a current-epoch envelope. The original predecessor relationship is retained. Native/Python requests receive the original release/siteArchive tuple, without a top-level `siteTarget`.

Transition validation still binds `plan.predecessors.naeil` to the original retained naeil receipt. Only its fresh current-site observation may use the separately approved new target; Estimate/Jev predecessor equality is unchanged. The site approval and proof are rechecked across transition authority boundaries. The Jev history inventory covers every `releases/ui-*` candidate, including malformed entries. Unrelated retained backups/manual artifacts are untouched and are not execution evidence. A historical Jev baseline may retain only its exact archive and manifest: read-only validation checks the `standalone/` namespace, checksums, regular members, directories, internal symlinks, supported inert PAX metadata, full manifest, identity and BUILD_ID without extraction or live-app access.

## Task 8 standalone input contract

The controller runs the actual site check **after integrated review/fixes and final automation freeze**. Task7 provides synthetic evidence only. This entrypoint neither reads an active pointer nor grants native execution; operational observer/verifier transports reject its input kind. STOP remains present. There is no ignore-STOP option or substituted standing policy.

Choose a new private workspace `W`, outside dispatcher/native state and existing credential trees. Precreate owned canonical0700 `W`, `W/inputs` and `W/evidence`. All input/config/approval/asset files are canonical, owned, regular, single-link0600. Evidence writes stay in `W/evidence`. Bind the existing authorized canonical renewing session cache `S` in place through the exact verifier configuration below; its parent remains owned0700 and `S` remains owned, regular, single-link0600. It is mutable and is not pinned to pre-refresh bytes. Session writes grant only the exact cache/marker namespace described below, with no generic write allowance for its external directory. Inputs, evidence and executable/source trees must be separate from that namespace.

Create `W/inputs/request.json` with **exactly**:

```js
{
  schemaVersion: 1, kind: 'standing-site-read-only',
  release: originalMaterializedRelease,
  service: exactApprovedNaeilServiceWithoutRolloutCommand,
  idempotencyKey: uniqueRecordedReadOnlyKey,
  attemptId: uniqueAttempt, // 1..100 letters/digits/period/underscore/hyphen; not . or ..
  expectedIdentity: {
    schemaVersion: 1, appId: 'naeil', artifactId: exactDeploymentId,
    sourceRevision: exactOriginalOrApprovedSource,
    ui: {version: originalMaterializedRelease.version, contractVersion: '1'}
  },
  outputDirectory: W + '/evidence/' + uniqueAttempt,
  referencePath: originalMaterializedRelease.contract.path,
  maxEvidenceAgeSeconds: exactApprovedLifetime // integer1..21600
  // Add siteTarget only for a separately approved continuation, using resolveSiteTarget.
}
```

`release` retains all original published fields; only known runner-local asset `.path` values may be materialized elsewhere. Frozen0.7.1/0.7.2 manifests/assets are not changed to add expectations. Their exact compatibility expectations remain part of the pinned automation. `service` includes the exact reviewed observer correlation settings, routes, render states, routing-profile digests and `verification` timeout/options. At least one concrete public and one protected route specimen are mandatory. Do not derive expectations from the live site.

While the implementation PRs remain unmerged, the recorded current0.7.2 site is source `40a3928e24cd2f0141be3e605eed0a75260938fd`, deployment `dpl_FeF4E7wF2prnPixVT3dRPKsm3ksy`; no continuation approval is fabricated for this case. These are retained observations, not a claim of a new live check. Root must verify that they remain current. If main/deployment moves, obtain a separately reviewed exact target before proceeding.

Create `W/inputs/verifier.json` with exactly:

```js
{
  schemaVersion: 1, evidenceRoot: W + '/evidence',
  services: {naeil: exactSameServiceAsRequest},
  session: {
    supabaseUrl: exactApprovedHostedSupabaseOrigin,
    anonKey: approvedPublicAnonKey, userId: exactAuthorizedAccountId,
    stateFile: existingCanonicalAuthorizedSessionCache // S, used in place
  }
}
```

Use the existing authorized account and session; an expired access token can renew through its existing refresh token. Do not move/copy the token, create a second rotating cache or obtain a second login. The pinned config binds the exact Supabase origin, public key, account and canonical `S` path. The established shared lock is `S.refresh-lock`, the pending marker is `S.refresh-lock/pending.json`, and the consumed marker is `S.last-refresh.json`. Only lock mkdir/rmdir, atomic writes to `S` and pending, and the pending-to-last rename are allowed. Atomic writer temporaries are only `S.UUID.tmp` and `S.refresh-lock/pending.json.UUID.tmp`, with UUIDv4 names, private single-link0600 files and an 8MiB serialized bound. Existing marker/lock ownership, canonical paths and modes are checked; symlinks, hardlinks and unrelated siblings are refused. No external session directory is generally writable. Evidence remains in W.

Renewal rereads the original cache after obtaining that same shared lock and persists rotation back to `S`. An existing/ambiguous lock prevents credential replay and stays available for explicit reconciliation. Hooks revalidate exact approval/input/config/executable/account bindings before session and browser actions/writes; approval loss after a refresh request retains the old cache and unresolved pending marker. Protected verification never falls back to anonymous. Public routes keep anonymous browser contexts; screenshots/traces/account text are not persisted.

After freezing the inputs, create `W/inputs/authorization.json` with exactly:

```js
{
  schemaVersion: 1, kind: 'standing-site-read-only-approval',
  input: fileReference(W + '/inputs/request.json'),
  verificationConfig: fileReference(W + '/inputs/verifier.json'),
  workspaceDirectory: W,
  automation: {root: exactExecutingReviewedCheckout, sha256: automationDigest(root)},
  trustedFiles: exactApprovedExecutableAndHelperPins,
  approvedBy, approvalRef, approvedAt, expiresAt, revoked: false
}
```

The authorization is the explicitly reviewed trust anchor. `fileReference` is `{path,sha256,bytes}` and each JSON/transport/evidence object is at most2097152bytes. Pin the approval's **file bytes SHA256**, not `fingerprint(approval)`, in the invocation:

```sh
node scripts/rollout/site-continuation.mjs validate --authorization /absolute/W/inputs/authorization.json EXACT_APPROVAL_FILE_SHA256
```

The library equivalent is `validateSiteReadOnly(request,{authorization:{path,sha256,bytes}})`. Injected GitHub/fetch/verification functions are synthetic test seams; the CLI uses the actual provenance APIs and the same protected/public production renderer, frozen account/chrome references and approved session refresh as operational verification. It spawns no native command. Existing GitHub metadata credentials and, only for the explicitly selected `vercel-api` correlation, `NAEIL_STANDING_VERCEL_TOKEN` are used in memory; do not print them. `github-status` correlation needs no broader Vercel token.

Success writes `W/evidence/ATTEMPT/result.json` with kind `standing-site-read-only-result`, `state:'production-verified'`, `mutationAttempted:false`, approval/input/verifier-config/automation SHA256 values, exact `siteTarget`, artifact/provenance and production receipt. The production receipt has `phase:'site-read-only'`, `siteTargetSha256`, independent expectations/reference/account digests, exact routes/identity and current `checkedAt`. Renderer evidence remains in that attempt directory. Provenance is checked again after rendering and receipt age is checked again after the final awaits. An existing attempt directory cannot be reused; approve a new exact attempt. Errors emit a generic diagnostic and exit1; there is no partial success receipt.

Retain the approval, exact inputs, result/reference hashes, sanitized command/exit and session-refresh marker outcome privately. Do not publish session JSON or private configuration. Any later relevant automation/config/route/profile/reference/site-target drift requires fresh verification. A standalone result is acceptance evidence for root; it is never imported as active-generation authority. After separately approved cutover, the dispatcher still appends fresh current-generation naeil evidence before native progress.
