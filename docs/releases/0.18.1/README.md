# 0.18.1 release candidate — first painted background

**Unpublished candidate.** Frozen source: `c5e22afab53e3ad43e2bfe33c86f887e99a248fb`. This archive-only commit adds the tgz, inventory and receipt without replacing the source. Preserve both source and archive commits without squashing. No merge, tag/Release, npm/Docs publication or deployment was performed.

`naeil-ui-0.18.1.tgz`: SHA-256 `3406de4b80e63f3d50c3c0eb41c309d2beca0a85364e89815c1f9714093ac29d`; **8560632 compressed bytes**, **9894629 unpacked bytes**, **423 regular files**. SHA-1 `0a13c5526304395668b669cf239b069ef301e668`; SRI `sha512-yARAMgCmvbY24FzAALViJfWreuZkBlJ1kGP6WZHZCVb6MkEJ1eQKk8n9Z/yRhowHXN9+fsktMR++atG+2Q4lDQ==`. `archive.json` records each regular member's SHA-256. Intended source tag: `v0.18.1`; intended dist-tag: `latest`, subject to separate owner authorization. The `published: false` field is this preparation snapshot.

## Scope and consumer change

Estimate's measured upgrade to 0.18.0 introduced a wrong blank CSS background frame before correct first contentful paint; its deployed 0.17 comparator passed. The stricter packed streaming fixture also exposes an older 0.17 body-script timing window. The 0.18 preflight seeded storage but deferred normal class application to a second inline script; a trace captures Paint between those scripts, even in the same HTTP chunk.

0.18.1 resolves and applies class/color scheme atomically in the provider fallback. It also adds the server-safe `@naeil/ui/theme-bootstrap` entry: **add `NaeilThemeScript` in the root Next head outside Suspense, or inject `naeilThemeBootstrap` into Vite HTML with head-prepend**, while keeping the root provider. A version bump alone improves the body path but does not guarantee zero pre-content backgrounds. Consumers with CSP authorize the inline script through their nonce/hash. The site's root layout adopts the head integration.

abstorm, estimate, jev and Home upgrade to 0.18.1/update lockfiles and add that head integration after publication. Cookie scope, strict validation, explicit-choice-only writes, local/default precedence, storage-denied dark behavior and same-origin tab sync are preserved. Home remains separate by registrable host. Consumers from 0.17 also leave owned-service footer meta empty; the runtime checker reports a non-empty row, while generic/standalone public APIs remain available.

See the [frozen migration](https://github.com/naeil-dev/naeil-ui/blob/c5e22afab53e3ad43e2bfe33c86f887e99a248fb/docs/design/v2-migration.md#0181-consumer-migration), [head setup](https://github.com/naeil-dev/naeil-ui/blob/c5e22afab53e3ad43e2bfe33c86f887e99a248fb/docs/components/naeil-shell.md#first-painted-background-0181) and [changelog](https://github.com/naeil-dev/naeil-ui/blob/c5e22afab53e3ad43e2bfe33c86f887e99a248fb/CHANGELOG.md). Version, generated release entry and React/Next fixture pins are 0.18.1. Older release directories, tags and brand versions are unchanged.

## Verification boundary

Built from committed source using `pnpm build:pkg` and `npm pack --ignore-scripts --json`. The external execution report retains exact-digest boundary/clean consumer checks, clean-source reproduction, HTML byte/chunk order, raw PNG frames, trace and CI identity. Chromium compositor sampling covers packed streaming Next webpack/Turbopack, React/Vite and the local production site for all six cookie/local/default/denial conditions. Firefox/WebKit provide narrower pre-hydration and loaded raster checkpoints. The initial local after matrix passed 162 runs with no wrong background/content frames; provider-only Next runs improved on the exposed 0.17 fixture window, without claiming a universal body-script guarantee.

Standard local release gates passed. The shell browser suite had the known Mac WebKit first-Tab focus failure; full PR CI is the matrix gate. Live production consumers, authenticated cross-service comparison, real devices, native Safari/VoiceOver and human visual certification are not established by this candidate. Artwork network/provenance limits remain in THIRD_PARTY_NOTICES.md. See STATUS.md for current publication/adoption state; historical frozen receipts retain their snapshots.

## Remaining operations

Review the PR and its completed CI before any separately authorized merge. Rehash this retained archive and check registry availability before publication. Publishing, source tag/GitHub Release, hosted Docs and consumer deployments require separate owner actions. Do not rebuild maintained main to replace frozen bytes or publish an existing version. Follow the [release procedure](https://github.com/naeil-dev/naeil-ui/blob/c5e22afab53e3ad43e2bfe33c86f887e99a248fb/docs/package-release.md#release-procedure).
