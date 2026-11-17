# 0.18.0 release candidate — shared theme preference

**Unpublished candidate.** Frozen package source: `40f630b4b04639df9ae363eac60568e783448d58`. This archive-only commit adds this README, `archive.json` and the tgz; it does not replace the source. Preserve source and archive commits without squashing. Merge, tag/Release, npm publication, hosted Docs and deployment were not performed and remain separate owner actions.

`naeil-ui-0.18.0.tgz`: SHA-256 `f60776d5feb59a381fe39b716d404010221e01b10e8bf877a76a741f167ca34a`, **421 regular files**, **8557089 compressed bytes**, **9885168 unpacked bytes**. SHA-1 `6fe0c791e1b127ceeb9ce799c9bbabe6bb64f904`; SRI `sha512-vbbkf5Cfu4L2IoH6cSbrRvHufH4GVclVeqRjXNQ4NuANA9iD6JBOuxIJElgz2srtyIyR0IwGfLwP4blUEx/Ong==`. `archive.json` retains each regular member's SHA-256. Intended dist-tag is `latest`, subject to owner approval; do not change `next` without separate authorization. Intended source tag: `v0.18.0`; `published: false` is this preparation snapshot.

## Scope and migration

- `naeil_theme_v1` stores only an explicit light/dark/system preference. The locale host rule scopes it to Domain=naeil.dev on HTTPS naeil.dev/subdomains (Secure, SameSite=Lax, Path=/, one year). Every other host uses a host-only cookie, Secure on HTTPS. Home uses another registrable host and cannot share this cookie.
- The strictly validated cookie wins over per-origin `theme` localStorage before the next-themes first-paint script and hydration initializer. A missing/invalid cookie leaves remembered local values/default dark unchanged. Existing local values never write a cookie. Storage denial keeps the dark default; cookie denial retains local persistence. Another site adopts a choice on next load; same-origin tab synchronization remains next-themes. No cross-domain live sync is added.
- Upgrade abstorm, estimate, jev and Home to 0.18.0 and update their lockfiles. Existing root `NaeilThemeProvider`/shared shell controls need no additional theme integration after the 0.17.0 migration. Leave owned-service footer meta empty: the runtime checker now reports non-empty meta; public standalone/generic `meta` APIs remain compatible.
- Supplied-state live comparisons record rendered themes and count mismatches between naeil.dev sites under the same OS scheme. Fresh runtime conformance strips only theme preference cookies/storage while retaining authentication.

See the [frozen migration checklist](https://github.com/naeil-dev/naeil-ui/blob/40f630b4b04639df9ae363eac60568e783448d58/docs/design/v2-migration.md#0180-consumer-migration), [changelog](https://github.com/naeil-dev/naeil-ui/blob/40f630b4b04639df9ae363eac60568e783448d58/CHANGELOG.md) and [shell contract](https://github.com/naeil-dev/naeil-ui/blob/40f630b4b04639df9ae363eac60568e783448d58/docs/components/naeil-shell.md). Package metadata, generated release entry and React/Next fixture pins are 0.18.0. Existing release directories, tags and brand releases are unchanged.

## Verification boundary

The archive was built from committed source with `pnpm build:pkg` and `npm pack --ignore-scripts --json`. Keep exact-digest package-boundary/clean React and Next consumer checks, independent source reproduction, browser results and PR CI receipts in the external preparation report. This README does not imply registry publication or deployed-service acceptance. Local WebKit first-Tab focus and Firefox official-artwork HTTP 403 are known Mac environment issues; full CI is the matrix gate.

Live authenticated service rollout, real devices and native Safari/VoiceOver are not verified by preparation. Official network artwork and unresolved redistribution/provenance limits remain in THIRD_PARTY_NOTICES.md. Hosted Docs require a separately reviewed source and receipt.

## Remaining owner-only operations

Review the PR and accepted CI, then merge without squashing only with owner authorization and a separate website deployment decision. Before publication, rehash this retained archive and check registry version availability; use the protected publishing workflow with version `0.18.0`, SHA-256 `f60776d5feb59a381fe39b716d404010221e01b10e8bf877a76a741f167ca34a` and an explicitly approved dist-tag. Never rebuild maintained main to replace the frozen bytes or republish an existing version. After registry byte/integrity verification and fresh exact-version registry consumers, create the source tag at `40f630b4b04639df9ae363eac60568e783448d58` and retain the tgz/metadata in its Release. Approve hosted Docs and service dependency/deployment changes separately. Follow the [release procedure](https://github.com/naeil-dev/naeil-ui/blob/40f630b4b04639df9ae363eac60568e783448d58/docs/package-release.md#release-procedure).
