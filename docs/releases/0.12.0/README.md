# 0.12.0 release candidate

**Outcome:** published to npm `next` at 2026-11-10T21:39:32Z from this frozen archive and promoted to `latest` on 2026-11-11 with owner approval. Tag `v0.12.0`, the GitHub Release and hosted Docs are recorded in [STATUS.md](../../../STATUS.md) and [package-release.md](../../package-release.md). The text below is the unchanged preparation-time record; its "unpublished", "not executed" and "preserve latest" wording describes that stage.

Unpublished additive minor API candidate. The frozen package source is `e03af076b725d742c4b319aca5ebb2379e2f0258`; later evidence-only commits do not replace that source. The archive is `naeil-ui-0.12.0.tgz`, SHA-256 `7f5f01407c576e3c5fa956cf76ebfb3a8ef59b58619de99da68351974aca721b`, 178 regular files, 236177 compressed bytes and 1292928 unpacked bytes. `archive.json` contains SHA-1, SRI and every member's SHA-256.

PR #42 (`0d1cb08`) adds optional `closeLabel` to DialogContent/DialogFooter with unchanged defaults, documents and tests error versus destructive roles, uses NaeilFooter's default `full` in starters, aligns compact footer link groups to the top unless the consumer supplies an `items-*` container override, and adds the 896px `ui.width-workflow` token / `data-ui-layout="workflow"`. Locale service registration remains a documentation-only proposal. PR #43 (`047de96`) adds public Sheet primitives at `@naeil/ui/ui` and `@naeil/ui/components/ui/sheet`.

Package version, generated `/release` metadata and clean React/Next fixture versions are 0.12.0. Existing Sheet root/deep import, type and SSR consumer checks are retained. Existing APIs, peer dependencies and chrome contract 1 remain unchanged; historical archives, receipts and the 0.7.x rollout runner are untouched. The local verification report is `test-results/release-0.12.0/report.md`; preparation and automated browser checks do not establish consumer adoption or native/manual certification.

## Local verification

Unit tests passed 871 with 6 existing opt-in production-auth skips. Types, lint (3 existing warnings), token drift, contrast, package/Storybook/site builds and font notices passed. Exact-digest boundary and clean React/Next consumers passed, including all eight globals/split CSS and classic/overlay frame matrices. A fresh build from the frozen Git source reproduced the archive byte for byte.

The full Chromium/Firefox/WebKit run recorded 1,303 passed, 4 expected forced-colors skips and one Firefox header-hover timeout; that test passed on its single actual isolated rerun without code changes. This is retained as a timing flake observation, not a proven root-cause fix or an uninterrupted green full run. Deterministic classic/overlay jobs each passed all 224 archive comparison/page-frame tests; their 13 Storybook frame tests initially lacked the Storybook server and each passed after correcting the invocation. A temporary reproduction-copy/site-build issue and an empty-test retry filter were also corrected; all original command exits and logs remain in the local report. The reported Vercel image challenge and WebKit P3 opacity flake were not observed. Remote CI, native/manual acceptance and external publication remain unverified.

## Maintainer publication commands (not executed)

Run from a checkout containing this receipt after review/merge and CI acceptance. Do not repack current main for publication. Check npm availability immediately before publication; if 0.12.0 exists, reconcile its bytes instead of attempting overwrite. At preparation time (2026-11-09 JST), the registry returned E404 for 0.12.0 and tags were `latest=0.7.2`, `next=0.11.0`. Promotion of 0.11.0 remains a separate owner action. Publish this candidate to `next` and preserve `latest` unless separately approved.

```sh
shasum -a 256 docs/releases/0.12.0/naeil-ui-0.12.0.tgz
npm view @naeil/ui@0.12.0 version dist --json
npm view @naeil/ui dist-tags --json
# Only when still absent and SHA-256 matches 7f5f01407c576e3c5fa956cf76ebfb3a8ef59b58619de99da68351974aca721b:
npm publish docs/releases/0.12.0/naeil-ui-0.12.0.tgz --ignore-scripts --access public --tag next
```

Verify registry bytes and metadata before tagging/releasing; retain fresh exact-version React/Next registry consumer receipts separately from the prepublication archive checks.

```sh
npm view @naeil/ui@0.12.0 version dist time --json
npm view @naeil/ui dist-tags --json
curl --fail --location https://registry.npmjs.org/@naeil/ui/-/ui-0.12.0.tgz --output /tmp/naeil-ui-0.12.0-registry.tgz
cmp docs/releases/0.12.0/naeil-ui-0.12.0.tgz /tmp/naeil-ui-0.12.0-registry.tgz
# Compare registry dist.shasum/dist.integrity with archive.json; preserve latest; next must resolve to 0.12.0.
git tag -a v0.12.0 e03af076b725d742c4b319aca5ebb2379e2f0258 -m '@naeil/ui 0.12.0'
git push origin refs/tags/v0.12.0
gh release create v0.12.0 docs/releases/0.12.0/naeil-ui-0.12.0.tgz docs/releases/0.12.0/archive.json --verify-tag --title '@naeil/ui 0.12.0' --notes-file docs/releases/0.12.0/README.md
```

Docs publication is separate. After selecting the reviewed full Docs commit, replace the placeholder and dispatch:

```sh
gh workflow run publish-docs-manual.yml --ref main -f reviewed_sha=FULL_REVIEWED_DOCS_COMMIT_SHA -f confirmation=PUBLISH_REVIEWED_DOCS
```

Verify hosted Docs routes, examples, fonts and notices after deployment. Package preparation is not registry verification, hosted Docs acceptance, native screen-reader certification, production authentication testing or service adoption. Main merges deploy naeil.dev via Vercel; merge remains the maintainer's decision. No publication, dist-tag change, tag creation, push, PR, Release, workflow dispatch or deployment was executed for this candidate.
