# Preparing standing release assets

These commands prepare local files only. Publication, registry consumption, exact-SHA main CI and Git/Vercel deployment remain separate checks. Use a genuine reviewed patch; do not create a release solely to exercise the worker. Never regenerate the published0.7.1 assets.

## Exact source and reference capture

Use separate clean checkouts for package and site, each detached at its reviewed full40-hex main SHA. Run `pnpm install --frozen-lockfile` and `pnpm build:pkg` in each; require `git status --porcelain` to remain empty, then run `npm pack --ignore-scripts --json --pack-destination /absolute/new-private-pack-directory`. The package archive becomes frozen input; retain its bytes. Pack the site independently from the exact site source, even when only documentation differs. `node scripts/rollout/package-runtime.mjs FROZEN.tgz SITE_PACK.tgz` must pass. The preparer repeats this comparison.

In the **package-source** checkout, compare a fresh local pack with the frozen archive using `package-runtime.mjs`, then build and serve the reference Storybook:

```sh
pnpm build:storybook
pnpm preview:storybook
```

The Storybook identity at `/naeil-release.json` must report the package SHA, matching UI version/contract and `frozen:true`. Capture uses the existing `Brand/NaeilHeader` reference stories and synthetic `AccountStates` story. The supplied archive is hashed and bound to the resulting JSON. The source/build and archive association still requires the publisher's clean-source packing and runtime comparison; browser identity alone cannot prove which archive supplied a bundle. No production authentication is needed.

The existing chrome CLI is:

```sh
node scripts/verify-ui-production.mjs capture /absolute/chrome-capture.json
```

`chrome-capture.json` contains:

```json
{
  "origin": "http://127.0.0.1:6007",
  "contractPath": "/absolute/package-checkout/contracts/naeil-chrome.v1.json",
  "archivePath": "/absolute/frozen-package.tgz",
  "archiveSha256": "REPLACE_WITH_ARCHIVE_SHA256",
  "sourceRevision": "REPLACE_WITH_PACKAGE_SHA",
  "outputDir": "/absolute/new-chrome-capture-directory"
}
```

Leave `allowDevelopment` unset. Its output is `reference.json`, with the contract locale/viewport/theme/footer-variant matrix and representative screenshots. Use a fresh directory; this older chrome tool permits overwrites. Account capture now has a maintained wrapper around `scripts/account-render.mjs`:

```sh
node scripts/rollout/capture-account-reference.mjs /absolute/account-capture.json
```

`account-capture.json` contains:

```json
{
  "origin": "http://127.0.0.1:6007",
  "archivePath": "/absolute/frozen-package.tgz",
  "sourceRevision": "REPLACE_WITH_PACKAGE_SHA",
  "version": "REPLACE_WITH_VERSION",
  "outputPath": "/absolute/private-reference-directory/account.json"
}
```

The account output parent must exist with mode0700; the file is created exclusively with mode0600. Capture is limited to a loopback Storybook, Japanese synthetic signed-in state, desktop1440/mobile390 and light/dark themes, matching the account matrix used by standing verification. It checks the frozen build identity, archive version, rendered version, font readiness and overflow, then records `frozen:true`. It opens menus, focuses the first action and measures styles; it never invokes logout. Frozen0.7.1's historical account file has no `frozen` field; it remains untouched. New preparation requires that field on both references.

## Assemble and check the draft

Create an input JSON with explicit paths and provenance:

```json
{
  "version": "REPLACE_WITH_VERSION",
  "previousVersion": "REPLACE_WITH_PREVIOUS_VERSION",
  "sourceRevision": "REPLACE_WITH_PACKAGE_SHA",
  "siteSourceRevision": "REPLACE_WITH_SITE_SHA",
  "archivePath": "/absolute/frozen-package.tgz",
  "siteArchivePath": "/absolute/clean-site-pack.tgz",
  "chromeReferencePath": "/absolute/new-chrome-capture-directory/reference.json",
  "accountReferencePath": "/absolute/private-reference-directory/account.json",
  "changes": ["fix"],
  "outputDirectory": "/absolute/new-release-assets-directory"
}
```

`releaseId` is optional and defaults to `naeil-ui-<version>`. Inputs use lowercase full revisions and consecutive stable0.7.x versions. The output directory must not exist; preparation creates it with mode0700 and creates all six assets with mode0600, preserving input bytes. Validation failures before creation leave no output; if an I/O failure interrupts writing, preserve the partial directory for inspection and choose a fresh destination.

```sh
node scripts/rollout/prepare-release.mjs prepare /absolute/prepare-input.json
```

Upload **all six** files to the draft: versioned npm archive, site archive, chrome reference, account reference, `release.json`, `site-runtime-verification.json`. The manifest uses only `https://github.com/naeil-dev/naeil-ui/releases/download/v<version>/<name>` URLs. [release.example.json](release.example.json) shows its current schema with placeholders. Preparation validates the real worker's `assertManifest` contract locally; it performs no GitHub writes or npm publication.

Export the draft's actual GitHub asset inventory as a JSON array with `name`, `url` (the API's `browser_download_url`), numeric `size`, and `digest` (`sha256:<64 lowercase hex>`). Do not construct the listing from local files: it must describe the uploaded draft. A missing server digest needs investigation; the check does not accept an absent digest as evidence.

```sh
node scripts/rollout/prepare-release.mjs check /absolute/new-release-assets-directory /absolute/draft-assets.json
```

The check requires exactly one matching remote asset per manifest input and both generated JSON assets; names, version-scoped URLs, sizes and SHA256 digests must match the local files. Resolve every mismatch while the release is a draft. Publish only after the [release order and release window](standing-rollout.md#publishing-the-next-patch-release) gates pass. Do not modify assets or tag afterward.
