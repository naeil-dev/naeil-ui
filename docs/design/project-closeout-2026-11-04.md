# Project closeout and historical preservation — 2026-11-04

This index records selective preservation and the integration-branch disposition at `3dd4fe115cde4a99499c30a10fe2346174bd5159`. The final runner and dormant invitation delivery are integrated locally. Combined review/checks, the replacement PR, main merge, old PR closure and resulting Site deployment verification are still pending at this checkpoint; this document is not their completion receipt. The [closeout plan](../superpowers/plans/2026-11-04-project-closeout.md) defines those remaining steps.

Current package status is [published and registry-verified 0.10.0](shared-language-2026-11-04/implementation-progress.md), with verified tags `latest=0.7.2`, `next=0.10.0`. Frozen package sources, tags and archive bytes remain immutable. Hosted Docs, service acceptance and any new Site deployment require separate receipts. Historical assertions below do not certify today's runtime.

## Branch and PR dispositions

| Work | Preserved or integrated outcome | Remaining closeout |
| --- | --- | --- |
| [PR #26](https://github.com/naeil-dev/naeil-ui/pull/26), `f2bef4b` | Superseded by final runner's independently frozen exact catalog expectations; the old version-derived image count is not imported. | Close only after replacement reaches main. |
| [PR #27](https://github.com/naeil-dev/naeil-ui/pull/27), `5d95c23` | Its history is retained through final runner ancestry; the earlier generation/approval design is superseded. | Close after replacement reaches main. |
| [PR #28](https://github.com/naeil-dev/naeil-ui/pull/28), `6c42981` | Useful preflight/artifact/verification safeguards survive in final runner; retired standing dispatch does not. | Close after replacement reaches main. |
| [PR #29](https://github.com/naeil-dev/naeil-ui/pull/29), `71958c1` | History retained; generation rebind and trusted-closure cache remain retired. | Close after replacement reaches main. |
| Final local runner, `6d15cbc376495779896aa428b3154a4a3f07ae7a` | Merged locally in `eb51ccf`, preserving current 0.10.0 package and shared-language work. The runner supports historical **0.7.x, contract 1 only**. | Complete combined review and main integration; never replay old approvals against 0.10.0. |
| [PR #35](https://github.com/naeil-dev/naeil-ui/pull/35), `a2bcc3336a7501ea8c8dbfae09896f5f361752ed` | Dormant session delivery merged locally in `3dd4fe1` with current locale/auth guards. | Complete combined validation/main integration and close with replacement evidence. `NAEIL_INVITE_ACCEPT_ENABLED === "true"` remains required; production ingress hold remains. This does not activate invitation delivery. |
| `review-naeil-ko-homepage`, `35f750357f90fe24ec0ca8c51b8e98b89facd997` | Hero work already integrated; old invitation/auth/runtime work is superseded. Preserve only dated documents and archived study/evidence. | Final selective-import and backup recheck before retiring its workspace. |

The supplemental comparison of all 45 local refs found no additional runtime feature to integrate. Ancestor or patch-equivalent refs need no duplicate source import. Unique historical refs remain recoverable through the bundle and archive indexes below. Current auth, shared-language implementation, package APIs and frozen 0.7.1 reference bytes are not replaced by these historical snapshots.

## Seven preserved documents

Each file retains its original body byte-for-byte after a new historical notice. `historical-import-manifest.json` in the private evidence directory records source revision, original SHA-256 and imported SHA-256 for all seven files.

| Historical source | Documents | Interpretation |
| --- | --- | --- |
| Console `35f750357f90fe24ec0ca8c51b8e98b89facd997` | [Design](../superpowers/specs/2026-10-15-naeil-console-access-design.md), [review and local receipts](../superpowers/specs/2026-10-15-naeil-console-access-review.md), [plan](../superpowers/plans/2026-10-15-naeil-console-access.md) | October 15 facts and remaining checkboxes are historical, not reopened work or current operating status. Existing failures and source/runtime limitations remain visible. |
| Manual accessibility `5594d7db2e6afde068a1ebfbab14bb8d48ffb427` | [Runbook](public-ui-manual-accessibility-2026-10-03.md), [preparation closeout](../superpowers/plans/2026-10-03-manual-accessibility-validation.md) | User closed the attempt at preparation. All 22 human/manual records remain open/deferred, not passed; operator questions are not reopened. |
| Original Estimate `5fb1c464d83ad5da95c9286a39328c15634b7f67` | [Design](../superpowers/specs/2026-10-09-estimate-app-design.md), [plan](../superpowers/plans/2026-10-09-estimate-app.md) | Original password/0.3.0-era architecture predates current Console and shared-language integration; no old implementation tasks are activated. |

[Frontend sources](frontend-sources.md#historical-provenance-preserved-on-2026-11-04) appends exactly the two missing Console entries and the Estimate entry without replacing current provenance. Historical links to external worktrees, scratch artifacts or archived-only files may not resolve from this checkout. They are retained as original evidence locators, not presented as newly verified runnable instructions.

## Verified private archives

Archive base: `~/.local/share/naeil-ui-closeout/2026-11-04/`. These are private local recovery artifacts, not public downloads or files shipped in npm. Full member indexes and SHA-256 receipts are beside the archives; keep those indexes with any moved copy. The audit sources are `worktree-audit.md`/`.json`, `rollout-audit.md`/`rollout-audit-inventory.json`, `invite-audit.md` and `supplemental-local-refs-audit.md`/`.json`.

| Artifact | Verified scope and receipt | Archive SHA-256 |
| --- | --- | --- |
| `pre-closeout.bundle` | All pre-existing local refs verified; `preservation.json` and `historical-residuals-manifest.json`. Committed history only. | `fe88abeb5499bd673bec2546743f26ddcdb8027fbd838eab79fcd3593fa520cb` |
| `terrific-buffalo.full-workspace.tar.gz` | 55,442 files verified against `terrific-buffalo-full-backup.json`; includes ignored files and the local provenance modification. | `575b160427502b3a050655c6625bd04db137297d9161e890dd41d7c07ad96df3` |
| `historical-residuals.tar.gz` | 309 exact files in `historical-residuals-manifest.json`: 128 header publication records, 177 brand print/trademark study files, two manual-accessibility documents and two Estimate documents. | `41c9925a226117357b170dc1cf88eddea4b6c2bcdcc244009b38dd24d52b41fd` |
| `naeil-account-language.untracked-evidence.tar.gz` | 1,137 files, 25,363,014 bytes, 25 evidence directories; `naeil-account-language-backup.json` and per-file hashes in `supplemental-local-refs-audit.json`. The worktree remains retained. | `4de3a729f8ce37b227ad7961d9cf57467b43cc679f10c90b7bb8451e47b79055` |

The full terrific-buffalo archive preserves all seven `docs/design/console-mockup/` files together: `index.html`, `README.md`, `PretendardVariable.woff2`, `Pretendard-OFL.txt`, `Lato-OFL.txt`, `logo-light.svg` and `logo-dark.svg`. The local `frontend-sources.md` entry, `2026-10-15 — Naeil Home Console HTML 목업`, remains with the study and in `terrific-buffalo.working-tree.patch`. Its simulated behavior, font licenses and brand-rights distinction are preserved. It is not a supported product or evidence of canonical shared-header parity.

The same full archive includes six ignored files under `docs/design/hero-sunset-study-2026-10-12/cinemagraph/`: `production-1440-dark.png`, `production-1440-light.png`, `production-390-dark.png`, `production-390-light.png`, `production-results.json` and `production-verification-output.txt`. Their original hashes are indexed in the full-backup receipt. A Git bundle or untracked-only archive would not preserve these ignored production records. Their October 12 assertions have not been rerun by this documentation import.

Completed header 0.5.0 publication is preserved under archive prefix `feat__shared-naeil-header/docs/evidence/shared-naeil-header-2026-10-15/`, including final `release.md` and `verification.md` from `32dcf29`. The [checked-in candidate checkpoint](../evidence/shared-naeil-header-2026-10-15/release.md) retains its earlier pending body with a historical notice. The archive records the exact 124-file release, registry consumers and separate hosted Docs/site/local-preview receipts; it does not make 0.5.0 current. The brand archive prefix is `resume__logo-building/docs/design/logo-print-trademark-2026-10-11/`, from `8c2d264`; physical print/color proof remains deferred and preliminary research does not grant trademark clearance.

## Workspace checkpoint and recovery

Four inactive visible workspaces were archived after verified full backups: `ugly-wolverine`, `massive-bullfrog`, `spiky-kolibri` and `pure-chicken`. Receipts are `completed-workspace-backups.json`, `archived-completed-workspaces.json` and `archived-pure-chicken.json`; the last also records merged local-ref removal. The owned obsolete pure-chicken loopback preview was retired with separate process-ownership receipts. `terrific-buffalo` remains pending final import/backup comparison. Active `outgoing-anaconda`, its untracked plans and ignored operational evidence remain protected. Other checked-out/manual/operational candidates are not implicitly retired by a branch audit.

Recover committed history into a new directory, without overwriting any active worktree:

```sh
archive_dir="$HOME/.local/share/naeil-ui-closeout/2026-11-04"
shasum -a 256 "$archive_dir/pre-closeout.bundle"
# Compare with the exact bundle SHA-256 above before continuing.
git bundle verify "$archive_dir/pre-closeout.bundle"
git bundle list-heads "$archive_dir/pre-closeout.bundle"
git clone --no-checkout "$archive_dir/pre-closeout.bundle" naeil-ui-closeout-recovery
git -C naeil-ui-closeout-recovery switch --detach 35f750357f90fe24ec0ca8c51b8e98b89facd997
```

The bundle verification command runs from an existing Git repository. Use the listed ref/commit for a different historical snapshot. Untracked/ignored artifacts require the separate archives: verify the archive SHA-256 against its receipt, inspect members with `tar -tzf`, then extract only into a new empty recovery directory. Verify recovered member hashes against the corresponding manifest before using them. Archived operational metadata and old approvals are evidence, not authority to replay a deployment or activate invitations.
