# 0.19.1 release candidate — conformance grid measurement

**Unpublished candidate.** Frozen source: `91018553e96562fea0cd0331f70789c14ff459da`. This archive-only commit adds the tgz, inventory and receipt without replacing the source. Preserve both source and archive commits without squashing. Publication, tag/Release, Docs and deployment are recorded separately in STATUS.md.

`naeil-ui-0.19.1.tgz`: SHA-256 `d1918aa2046a04c33d19c0d74a17617d60d856dd04257209b80a3f05f40effbb`; **8560925 compressed bytes**, **9887921 unpacked bytes**, **423 regular files**. SHA-1 `202ebda96991b450b7494ca8a67a05f99771e0e0`; SRI `sha512-c8tx6diG7+IoPWUer/yk88bbJtobqKP2PNcJ9jDF6e81u2EZn9DmJxkOVHxxfNjdlUSJ0Foagxn/q7YpbEjSnw==`. `archive.json` records each regular member's SHA-256. Intended source tag: `v0.19.1`; intended dist-tag: `latest` (owner approval 2026-11-19). The `published: false` field is this preparation snapshot.

## Scope and consumer change

Runtime conformance measures every child that shares the lowest box bottom (stretched grid/flex items) and uses the lowest content among them, instead of descending only into the first. Found by the storm 30-condition deployment check (experts page, 768px: 103px vs real 96px). Regression route `/grid-tie` fails at 146px before and passes after. No rendering or consumer API change.

## Verification boundary

Built from committed source after removing `dist/`, using `pnpm build:pkg` and `npm pack --ignore-scripts --json`. Local gates: `pnpm test` (1123 passed), `check:types`, conformance r4 (12), conformance/shell/page-frame on Chromium and Firefox (402 passed), boundary/clean packed consumers with `NAEIL_UI_EXPECTED_ARCHIVE_SHA256` set to this digest. PR #77 CI passed all 15 checks on the source commit.
