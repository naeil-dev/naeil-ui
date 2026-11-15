# 0.17.0 release candidate — screen frame and packaged fonts

**Unpublished candidate.** Frozen package source: `fdbeb58d57dd8f8bf6bd0ab63abd3d1ad72d5c65`. The archive-only commit adds this README, `archive.json` and the tgz; it does not replace the source. Preserve source and archive commits without squashing. Owner approval of the D1/D2 preview visuals does not authorize merge, publication, tags/Release, hosted Docs or deployment.

`naeil-ui-0.17.0.tgz`: SHA-256 `cdec8ac3a6b6c145ae59466cb58c3669f1f21dc6097c2d1f623a8af38169cd6f`, **417 regular files**, **8555651 compressed bytes**, **9877127 unpacked bytes** (approximately 9.9 MB). SHA-1 `4372ab1791cc51d5d4dec42603c5836ba4540ebd`; SRI `sha512-xV/CyOEqN8eHIhcaL5HURFA10ZuND8HJ6IgjDJt4hKZehLAGWiGxbCZ/oMj77lbAhvqiOZe+R6SaiDWHoBGaMA==`. `archive.json` retains every regular member's SHA-256. Intended dist-tag is `latest`, subject to owner approval; preserve `next=0.13.0` unless separately authorized. Intended source tag: `v0.17.0`; `published: false` is this preparation snapshot.

## Scope and required migration

This 0.x minor includes required consumer changes. Follow the [frozen migration checklist](https://github.com/naeil-dev/naeil-ui/blob/fdbeb58d57dd8f8bf6bd0ab63abd3d1ad72d5c65/docs/design/v2-migration.md#0170-required-consumer-migration), [changelog](https://github.com/naeil-dev/naeil-ui/blob/fdbeb58d57dd8f8bf6bd0ab63abd3d1ad72d5c65/CHANGELOG.md) and [shell/static/runtime contract](https://github.com/naeil-dev/naeil-ui/blob/fdbeb58d57dd8f8bf6bd0ab63abd3d1ad72d5c65/docs/components/naeil-shell.md):

- abstorm, estimate, jev and Home import `@naeil/ui/fonts.css`; remove their own Pretendard/Noto installations/imports and body background/colour/font/line-height rules. Remove app-owned min-height/sticky-footer wrappers; the shell owns viewport fill and 16/25px body text. `service="main"` is for naeil.dev only; services use their own ids.
- Static conformance checks reachable shell import/usage and explicit `account=` only. It no longer claims presentation, theme, CSS or metadata/icon/title correctness. Keep type checks, runtime routes and live comparison.
- Runtime requires the frame: short-page footer bottom at viewport bottom with at least 96px content/footer space; long pages exactly 96px within the existing tolerance; recorded no-footer pages fill main to the viewport. Body must be 16/25px. Default budgets are 10 minutes overall and 15 seconds per step. `--header` values stay at the configured origin, including same-origin redirects. Chromium CDP rendered-font evidence is diagnostic; other engines remain “not measured”.
- Unsupported `asChild` is removed from Checkbox, Switch, SelectTrigger/Content/Item, DialogContent, SheetContent and DropdownMenuCheckboxItem/RadioItem/SubTrigger types. Use supported wrapper structure; Button and supported trigger composition retain it.
- Service auto-merge policy is patch-only. A 0.x minor may require migration; review 0.17.0 manually. Service automation changes and deployments are separate stages and were not performed here.

The archive adds 216 WOFF2 font files. Relative to immutable 0.16.0: 200 → 417 files; 147 byte-identical, 46 changed at the same path, 224 added and 7 removed (including generated chunk renames). Existing exports remain; `./fonts.css` is added. Runtime/peer dependency declarations and bin mappings are unchanged. Every non-dist member matches the frozen Git source byte-for-byte. Historical archives, source tags and brand directories remain unchanged.

## Preparation verification scope

The candidate was built after committing frozen source using `pnpm build:pkg` and `npm pack --ignore-scripts --json`. A separately extracted Git source had its own frozen-lockfile install/build/pack; `cmp` confirmed byte-identical tgz output and the reproduction directory was removed. Exact-digest boundary and clean React/Next consumer results are recorded separately from publication. PR CI and local browser results are separate receipts; do not infer them from the archive's existence. The external preparation report retains command outputs and failures without changing frozen files after publication.

Native Safari/VoiceOver, physical devices, live authenticated service acceptance, production zero-difference comparison and service rollout were not verified by this preparation. Automated browser/axe results do not close those rows. The package retains font/code notices; the official network whale artwork dependency and unresolved site-art/fetched-site-font provenance remain in THIRD_PARTY_NOTICES.md.

## Remaining owner-only steps (not executed)

1. Review PR #60, merge **without squashing** after accepted CI and wait for merged-source checks. Coordinate the separate website deployment approval; package preparation does not authorize it.
2. Rehash the retained tgz and recheck npm version availability immediately before publishing. Dispatch the protected workflow from reviewed `main`, with the exact inputs below, then approve `npm-publish` only after inspecting the ref/SHA, version, digest and dist-tag. `latest` requires explicit owner approval. If 0.17.0 already exists, compare its identity; do not republish. Verify registry integrity/shasum, dist-tags and downloaded bytes, followed by fresh exact-version React/Next registry consumers.

```sh
shasum -a 256 docs/releases/0.17.0/naeil-ui-0.17.0.tgz
npm view @naeil/ui@0.17.0 version dist --json
npm view @naeil/ui dist-tags --json
# Owner only, after registry absence and publication/dist-tag approval:
gh workflow run publish-npm.yml -R naeil-dev/naeil-ui --ref main -f version=0.17.0 -f sha256=cdec8ac3a6b6c145ae59466cb58c3669f1f21dc6097c2d1f623a8af38169cd6f -f dist_tag=latest
# Approve the waiting npm-publish environment job after reviewing it.
# After publication:
curl --fail --location https://registry.npmjs.org/@naeil/ui/-/ui-0.17.0.tgz --output /tmp/naeil-ui-0.17.0-registry.tgz
cmp docs/releases/0.17.0/naeil-ui-0.17.0.tgz /tmp/naeil-ui-0.17.0-registry.tgz
```

3. After registry verification, create/push the annotated source tag at the **frozen source**, then create the GitHub Release with the retained tgz and archive.json. These are separate owner-approved actions.

```sh
git tag -a v0.17.0 fdbeb58d57dd8f8bf6bd0ab63abd3d1ad72d5c65 -m '@naeil/ui 0.17.0'
git push origin refs/tags/v0.17.0
gh release create v0.17.0 docs/releases/0.17.0/naeil-ui-0.17.0.tgz docs/releases/0.17.0/archive.json --verify-tag --title '@naeil/ui 0.17.0' --notes-file docs/releases/0.17.0/README.md
```

4. Separately approve hosted Docs publication for a full reviewed commit that belongs to main. The package source tag must exist so versioned Docs links resolve. Choose the reviewed Docs SHA, dispatch, then verify actual hosted Docs→Usage navigation, fonts and notices over HTTP before reporting them live.

```sh
gh workflow run publish-docs-manual.yml -R naeil-dev/naeil-ui --ref main -f reviewed_sha=FULL_REVIEWED_DOCS_COMMIT_SHA -f confirmation=PUBLISH_REVIEWED_DOCS
```

The [release procedure](https://github.com/naeil-dev/naeil-ui/blob/fdbeb58d57dd8f8bf6bd0ab63abd3d1ad72d5c65/docs/package-release.md#release-procedure) defines the protected workflow, manual owner OTP fallback and separate receipts. No publish workflow was dispatched or approved, no tags/Release were created, no Docs were published and no deployment was initiated during preparation.
