# 0.19.0 release candidate — storm service id

**Unpublished candidate.** Frozen source: `f9618fb3242950706772e21af1fcd832c8a66ca8`. This archive-only commit adds the tgz, inventory and receipt without replacing the source. Preserve both source and archive commits without squashing. Publication, tag/Release, Docs and deployment are recorded separately in STATUS.md.

`naeil-ui-0.19.0.tgz`: SHA-256 `5a149eb9b475a9c9df35795ffbc998ea398dc82dff59f425b1d1a237a5695031`; **8560693 compressed bytes**, **9886880 unpacked bytes**, **423 regular files**. SHA-1 `fdcd4d2aece15c4b5899bb14ae22cb8e7e58ec5f`; SRI `sha512-G927xvvnhEKjB2KZuaniRkt8oOx8/c1lFTThvgZc7f+dDK0y+dZv8hg2IkvRewiRBYsYcIM9nqK8Uc6I/RYnMw==`. `archive.json` records each regular member's SHA-256. Intended source tag: `v0.19.0`; intended dist-tag: `latest` (owner approval 2026-11-19). The `published: false` field is this preparation snapshot.

## Scope and consumer change

- Adds the owned service id `storm` for the abstorm rename decided on 2026-11-19: `NaeilServiceShell service="storm"` renders `.naeil storm`; locale routing binds `https://storm.naeil.dev` with the same protected routes as `abstorm`; the naeil.dev login return allowlist accepts the new origin; `naeil-ui-conformance --service storm` is accepted. `abstorm` stays valid during the move. This is a minor release because the public `NaeilService`/`NaeilServiceId` unions gain a member; consumers with exhaustive switches over them add a `storm` case.
- Runtime conformance treats a native `<summary>` as one control boundary. A 44px flex disclosure control with its label in a child span was measured from the span (105.5px instead of the real 96px content→footer gap). The storm deployment gate found it; regression route `/flex-summary` reproduces 105.5px before and passes after.

No other consumer change.

## Verification boundary

Built from committed source after removing `dist/`, using `pnpm build:pkg` and `npm pack --ignore-scripts --json`. Local gates: `pnpm test` (1123 passed), `check:types`, `build:storybook`, e2e naeil-shell/service-header/naeil-header/naeil-footer/conformance on Chromium and Firefox (296 passed before the measurement fix; conformance/shell 154 passed after it), boundary/clean packed consumers with `NAEIL_UI_EXPECTED_ARCHIVE_SHA256` set to this digest. Full PR #75 CI runs on the source and archive commits before merge. The storm origin is not live yet.
