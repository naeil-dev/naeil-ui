# Package publishing and service auto-update

This is the operating contract for `abstorm`, `estimate`, `jev` and `home`. Adding this guide and the npm workflow does not activate or verify their Dependabot, merge workflows or deployments. Record setup and the first successful run separately. Historical release archives and receipts remain immutable.

## One-time owner setup

1. In `naeil-dev/naeil-ui` → Settings → Environments, create **`npm-publish`**. Add required reviewer(s) under deployment protection rules and save. Ensure the repository's GitHub plan supports and enforces required reviewers; do not dispatch until protection is effective. Disable administrator bypass of protection where available; do not bypass approval. Referencing an environment in YAML can create an unprotected environment and does not install review rules.
2. In npm → `@naeil/ui` → Settings → Trusted publishing, add a GitHub Actions publisher: organization/user **`naeil-dev`**, repository **`naeil-ui`**, workflow filename **`publish-npm.yml`**, environment **`npm-publish`**. Allow **Publish**. All names must match exactly. No `NPM_TOKEN`/`NODE_AUTH_TOKEN` secret is used by this workflow.
3. Review and merge the workflow through the normal source-review process. A maintainer dispatches it from a reviewed ref with `version`, the frozen archive's `sha256` and `dist_tag` (`next` by default). Before approving the waiting environment job, verify the run's ref/SHA, inputs and retained release receipt/archive. GitHub releases the job only after environment approval. The job checks out that dispatch SHA, validates the exact archive and registry absence, then publishes it without rebuilding or running lifecycle scripts. It checks registry integrity/shasum afterward; retain the run and registry/consumer verification receipt.
4. After the first successful trusted publish, optionally select npm's setting to disallow token publishing. Keep account MFA and recovery access. Manual OTP publication remains the documented owner fallback under the account's publishing policy.
5. In each service, configure a daily npm Dependabot entry for the application directory and `@naeil/ui`, and the `naeil-ui-automerge` workflow with the repository permissions and branch protection needed to merge only approved dependency updates. Verify a real PR before treating automation as active. This UI-repository change does not install service configuration.

Trusted publishing needs a GitHub-hosted runner, Node **22.14.0+** and npm **11.5.1+** ([npm documentation](https://docs.npmjs.com/trusted-publishers), checked 2026-11-12). The workflow uses Node 22 and pins npm 11.21.2. OIDC provides short-lived publish authorization. npm generates provenance automatically for supported public-repository publishes; private repositories have no provenance even for public packages. The environment approval is required in either case.

## Routine flow

Owner-approved frozen-archive publish → owner-approved promotion to npm `latest` → daily Dependabot PR in each service → service CI → `naeil-ui-automerge` guard checks → merge. **Deployment stays manual per service.** Publishing, promoting, merging and deploying require their own evidence; a green UI-package run does not prove service acceptance.

The publish input can select `latest` only with explicit owner approval. Normally publish to `next`, verify the registry archive and clean consumers, then have the owner promote that exact version to `latest` separately. Dependabot proposes versions only up to `latest`; the publish workflow does not perform a later promotion.

Each service's merge workflow must verify the Dependabot author, an update limited to `@naeil/ui` within the installed major, its explicit manifest/lockfile allowlist, all required successful checks on the current PR head SHA, and that the head SHA is still unchanged at merge time. Reject unrelated edits, missing checks, stale results and a changed head. Major updates require manual review. The [version policy](../package-release.md#consumer-auto-update-version-policy) reserves public API/header-contract breaks for a new major; on 0.x, a header break requires 1.0.0 rather than another minor.

## Stop, pause and rollback

- Stop publication on an approval/configuration problem, archive/version/hash mismatch, registry error or existing version. Never treat network failure as absence. If the post-publication registry check fails, inspect the already-published version and run; do not retry publishing. An existing npm version is immutable.
- Stop promotion or service merging on a suspected public API/header break, failing or missing service CI, unrelated files/dependencies, changed head SHA or an unavailable guard. Correct the release/version policy before continuing. Do not weaken checks to clear a PR.
- Pause one service by disabling/removing its `@naeil/ui` Dependabot entry (or setting that entry's `open-pull-requests-limit: 0`) and/or disabling `naeil-ui-automerge` in Actions. Dependabot pause alone does not stop existing PRs: disable the merge workflow and cancel in-flight runs/queued auto-merges as needed. Close or hold pending PRs. To pause publication, do not dispatch/approve the environment job; cancel any pending run.
- Roll back a service by reverting the dependency merge commit through its normal reviewed PR/CI process, restoring manifest and lockfile together. Redeploy the accepted revision manually if needed. Pause automation first so it cannot immediately reapply the version. The owner may deprecate the affected npm version and decide any `latest` correction separately; this workflow does neither. Keep the archive and record the incident and replacement version rather than overwriting it.

The [release procedure](../package-release.md#release-procedure) retains exact-archive preparation, manual OTP publication, registry verification, source tags and separate hosted Docs steps.
