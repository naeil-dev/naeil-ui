# 0.18.2 release candidate — narrow full footer

**Unpublished candidate.** Frozen source: `d7a919a910b474c62f028660c82e254b8c8f1e6a`. This archive-only commit adds the tgz, inventory and receipt without replacing the source. Preserve both source and archive commits without squashing. Publication, tag/Release, Docs and deployment are recorded separately in STATUS.md.

`naeil-ui-0.18.2.tgz`: SHA-256 `350488ae717b68d15ede2ebe95cda7bb435a6a3f3113b1f040be5e53f15974ed`; **8559359 compressed bytes**, **9884314 unpacked bytes**, **423 regular files**. SHA-1 `f9d6c125b078b98d96b2a5363c4b94a9ebaea1b9`; SRI `sha512-EnRagZ6ygoyzV3j3EkYRSX3CpGIRf20EqblVT5HeUFZO/XLdgtLLGksSl1YEalZi60yWeF/OK+YikB3CEqYddA==`. `archive.json` records each regular member's SHA-256. Intended source tag: `v0.18.2`; intended dist-tag: `latest` (owner approval 2026-11-18). The `published: false` field is this preparation snapshot.

## Scope and consumer change

No consumer migration. Below a 26rem footer frame (320–390px phones in every locale; Japanese also orphaned at 390px before), the full `NaeilFooter`/`SiteFooter` brand row spans the width and Navigation/Social sit side by side beneath it, instead of the last group wrapping alone (abstorm visual QA V18). Wider frames (≥480px viewport, including 768/1024/1440/1920) render identical boxes. Props, h2 headings and link names are unchanged.

Also included, all compatible: once-only development deprecation warnings for legacy Next `Nav`/`Footer`, `/ui` barrel pruning (packed Button-only JS smaller), localized `LocaleSwitcher` accessible names, rollout CLI help. See the [frozen changelog](https://github.com/naeil-dev/naeil-ui/blob/d7a919a910b474c62f028660c82e254b8c8f1e6a/CHANGELOG.md).

## Verification boundary

Built from committed source after removing `dist/`, using `pnpm build:pkg` and `npm pack --ignore-scripts --json`. Local gates: `pnpm test` (1115 passed), `check:types`, `check:contrast`, `build:storybook`, boundary/clean packed consumers with `NAEIL_UI_EXPECTED_ARCHIVE_SHA256` set to this digest. New footer e2e covers ko/ja/en × 320/360/390/768/1440 × light/dark in Chromium/Firefox/WebKit; chrome-pairs apply the accepted narrow-footer rule to historical B1/0.8.0 sides. PR #72 CI passed all 15 checks. Mac WebKit header whale-image and first-Tab skip-link failures reproduce identically on the 0.18.1 CSS and are environmental. Live service comparison is not established by this candidate.
