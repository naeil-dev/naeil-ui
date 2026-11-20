# 0.20.0 release candidate — deprecated API removal

**Unpublished candidate.** Frozen source: `6483fb46a8315bb02ee8bc878d5997d4060b0b61`. This archive-only commit adds the tgz, inventory and release declaration without replacing that source. Preserve both commits without squashing. Publication, tag/Release, hosted Docs and service adoption are recorded separately in STATUS.md.

`naeil-ui-0.20.0.tgz`: SHA-256 `2521084625b387f3947e2755cb2d46a7fee0fca1c7b366c1d9fc56f17c6ca4cd`; **8554288 compressed bytes**, **9867021 unpacked bytes**, **421 regular files**. SHA-1 `5d95d85acc1efb0c497c02fac456f62abad93e25`; SRI `sha512-CI5b2UQPEfVCguEcBAKTYZS1twiJnllp0Sg/xk4Fp4h2JLPudk1vPpFFaApT7+g3B67xwnj/Nix7yP1dKtzUXQ==`. `archive.json` records every regular member's SHA-256. Intended source tag: `v0.20.0`; intended stable dist-tag: `latest`. The `published: false` field is this preparation snapshot; this declaration executes no publication.

## Scope and consumer change

Remove legacy `Nav`/`NavProps`/`Footer`/`FooterProps`, the `components/nav` and `components/footer` export paths and shell `header.authSlot` input. Owned services use shell `account`; generic Navigation/SiteFooter, standalone Header/Footer/account, the internal Header slot and all other deep entries remain. Delete the retired site archive and two helpers,66 site message leaves per locale, six planning documents and unused shadcn. All34 invitation leaves remain. The four fetched consumer snapshots have no removed-API code use; after publication they update the exact dependency/lockfile and run their normal adoption checks. See [migration](../../design/v2-migration.md#0200-consumer-migration).

Main's narrow full-footer rule, storm/abstorm identities, summary control boundary and equal-bottom grid/flex measurement remain. Existing chrome-pairs comparison rules and frozen baselines are unchanged because these removals do not change retained chrome rendering.

## Verification boundary

Built in an isolated export of the committed source with `pnpm install --frozen-lockfile`, `pnpm build:pkg` and `npm pack --ignore-scripts --json`. Source gates passed lint (three existing warnings), types, unit1123 passed/6 skipped, contrast, shared/site messages, package/Storybook/website builds. Exact-archive consumer, painted-frame, language and final-head CI results are retained outside this repository and in PR #71 CI artifacts. Local live-artwork403/ORB and Mac WebKit first-Tab limitations remain distinct from the CI gate. No artwork check is bypassed; no native/manual certification or service deployment is claimed.
