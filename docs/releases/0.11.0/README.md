# 0.11.0 release candidate

**Outcome:** published to npm `next` at 2026-11-08T05:46:51Z from this frozen archive and promoted to `latest` on 2026-11-11 with owner approval. The text below is the unchanged preparation-time record; its "unpublished", "not executed" and "preserve latest" wording describes that stage.

Unpublished additive API candidate (`api` + declaration `fix`). The frozen package source is `3cba75785fb8903eeaeadfb390c64581a34af4e9`; later evidence-only commits do not replace that source. The archive is `naeil-ui-0.11.0.tgz`, SHA-256 `7b59f6556102416d5abcef26f5886335515888a4d2b16c704716821735b6b864`, 175 regular files, 230036 compressed bytes and 1267876 unpacked bytes. `archive.json` contains SHA-1, SRI and every member's SHA-256.

AB Storm gets five protected UI routes at its exact owned origin, plus lowercase `abstorm` identity on fail-closed documents. Existing auth/API/health protocol handling suffices. The current app has no favicon and its `/new?copy=` form uses the same page. Unregistered catch-all history fallbacks are intentionally not registered UI. Consumer integration is separate from this package release.

A clean installed consumer exposed a pre-existing locale declaration defect: tsup's JSON plugin emitted initializers inside `.d.ts`. The added build-only normalizer converts that JSON subset to ambient types and fails on unsupported initializer shapes. Its fix changes no runtime imports or message loading: all 65 JavaScript members match the pre-fix candidate byte for byte. The packed React fixture imports locale API/types and runs `tsc` with library checks enabled; the independent Next fixture retains the existing root/deep import coverage. Existing service routing, default chrome/footer catalogs, shared messages, peer dependencies and chrome contract 1 remain unchanged. The historical 0.7.x `docs/rollout/release.json` is untouched.

## Maintainer publication commands (not executed)

Run from a checkout containing this receipt after review/merge and CI acceptance. Do not repack current main for publication. Check npm availability immediately before publication; if 0.11.0 exists, reconcile its bytes instead of attempting overwrite. At preparation time, the registry returned E404 for 0.11.0 and tags were `latest=0.7.2`, `next=0.10.0`.

```sh
shasum -a 256 docs/releases/0.11.0/naeil-ui-0.11.0.tgz
npm view @naeil/ui@0.11.0 version dist --json
npm view @naeil/ui dist-tags --json
# Only when still absent and the frozen digest matches:
npm publish docs/releases/0.11.0/naeil-ui-0.11.0.tgz --ignore-scripts --access public --tag next
```

Verify registry bytes and metadata before tagging/releasing; retain fresh exact-version React/Next registry consumer receipts separately from the prepublication archive checks.

```sh
npm view @naeil/ui@0.11.0 version dist time --json
npm view @naeil/ui dist-tags --json
curl --fail --location https://registry.npmjs.org/@naeil/ui/-/ui-0.11.0.tgz --output /tmp/naeil-ui-0.11.0-registry.tgz
cmp docs/releases/0.11.0/naeil-ui-0.11.0.tgz /tmp/naeil-ui-0.11.0-registry.tgz
# Preserve latest; next must resolve to 0.11.0.
git tag -a v0.11.0 3cba75785fb8903eeaeadfb390c64581a34af4e9 -m '@naeil/ui 0.11.0'
git push origin refs/tags/v0.11.0
gh release create v0.11.0 docs/releases/0.11.0/naeil-ui-0.11.0.tgz docs/releases/0.11.0/archive.json --verify-tag --title '@naeil/ui 0.11.0' --notes-file docs/releases/0.11.0/README.md
```

Docs publication is separate. After selecting the reviewed full Docs commit, replace the placeholder and dispatch:

```sh
gh workflow run publish-docs-manual.yml --ref main -f reviewed_sha=FULL_REVIEWED_DOCS_COMMIT_SHA -f confirmation=PUBLISH_REVIEWED_DOCS
```

Verify the hosted Docs routes, examples, fonts and notices after deployment. Package preparation is not registry verification, hosted Docs acceptance, native screen-reader certification, production authentication testing or AB Storm adoption. Main merges deploy naeil.dev via Vercel; merge remains the maintainer's decision.
