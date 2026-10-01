# Public UI readiness — execution and verification

This is the current task record. Earlier design and workflow reports retain their original dates and scope; they do not approve this work. DESIGN.md and the shared UI v2 specification remain the visual authority.

## Baseline and boundaries

- Remote main was fetched and independently read on 2026-10-02: `d963dc5c1bbd49a1159d445edbb4c30309d96db9`.
- Work is isolated on `feat/public-ui-readiness`, based on that remote commit. Both existing checkouts are preserved. The original main checkout has 11 unrelated modified/untracked files; a private content-hash baseline is retained for a final preservation check.
- npm registry read on 2026-10-02: versions `0.1.0`, `0.2.0`; latest `0.2.0`, published 2026-03-22. No GitHub Releases were listed. Registry publication and GitHub Releases are separate actions.
- Preserve approved neutral colors, Pretendard/Japanese companion, density, content widths, restrained motion, Radix behavior and consumer overrides. Site content and agent tooling are separate products.
- GPT-6.1 Sol (`gpt-6.1-sol`) is exposed by the agent runtime and was confirmed in provider model discovery. New execution agents are used for each stage; implementation and review have different owners. The orchestrator owns this record, dependency decisions, integration, direct verification and PR preparation.

## Stages and ownership

| Stage | Owner / scope | Depends on | Acceptance / status |
| --- | --- | --- | --- |
| 1. Public entry | Sol medium executor; separate Sol high reviewer | Baseline | Complete at `27aea4a`; three starting paths, notices/support, portable setup and historical hygiene. Independent review found no actionable defects; registry/version wording receives the final structure update in Stage 2 |
| 2. Distribution | New Sol high executor: manifests/lockfile/build/exports/package checks/clean consumer/CI/release and migration guidance | Stage 1 reviewed; import inventory and registry facts | Complete at `8bbbdf6`; independent scoped review found no actionable defects. Site-free core payload/dependencies, explicit compatibility policy, clean consumption and verification CI |
| 3. Usage and validation | New Sol high executor: 11-family guides/stories/browser coverage/preview configuration/support claims | Stage 2 reviewed structure | Implementation verified and ready for frozen independent review; individually discoverable API/state/accessibility guidance, actual Storybook and multi-engine checks; honest manual limits |
| 4. Demand-led extension | New Sol high executor: consumer/example demand audit; justified minimal implementation or composition guidance | Stage 3 review | Read-only audit complete; Tabs/Textarea adopted from actual call sites, FormField/radio composition guidance. Writes wait for Stage 3 review |

Source is frozen during each independent review. Findings are addressed by the executor; only affected checks are repeated after a fix. No concurrent writes to the same files. Each stage review is scoped to its diff and risk.

## Verification and unresolved items

- Directly inspect public imports and reachable consumer use before selecting the smallest package boundary. Do not drop deep imports silently.
- Re-run relevant units/types/lint, token generation drift, contrast, package build/payload and clean tarball consumption, site compatibility, Storybook build and rendered results. Add relevant Firefox/WebKit, zoom/high contrast, keyboard/state cases. Distinguish Playwright WebKit from Safari and automated checks from screen-reader use.
- Check local source and installed skill separately; install only after focused review and applicable tests, without exposing or moving credentials.
- Prepare a reviewable PR; check whether main merge and previews trigger external deployments. Do not publish npm, create a Release, merge main or deploy docs/site without applicable authorization. A deployment configuration is not a deployed site.
- Remaining decisions: third-party notices, release/deployment topology, support matrix and actual extension demand.

## Distribution decisions (inventory reviewed)

- Stage 2 scope extension: DESIGN.md link destinations may be changed to stable repository URLs for packed-guide usability; approved prose and numeric rules must be preserved.
- Keep one package and the current source layout. `/ui` is the documented React core; the existing root remains the framework compatibility barrel. Next/next-intl are optional peers used by the compatibility paths; next-themes remains a React runtime dependency for existing Toaster/theme behavior.
- Use exact shared deep entries instead of wildcard compilation; preserve observed consumer imports for Nav, Footer, ThemeProvider, ThemeToggleIcon and LocaleSwitcher. Document every excluded website path and consumer-owned i18n request/messages configuration. Keep root, `/ui`, `/utils` and CSS contracts.
- Move website dependencies to development-only tooling and exclude website modules/messages/art/tooling from the npm payload. The website continues to run in this repository.
- Prepare `0.3.0` (unpublished); `v2` denotes the design generation. Registry `0.2.0` has 15 files and no files for its declared deep wildcard targets; checkout baseline pack has 115 files and includes hero/cursor/Supabase/login modules. These observations must not be confused with a completed release.
- A reachable consumer pins `0.1.0` and scans old `src` paths for Tailwind. Preserve its actual imports and document migration to compiled `dist` plus shared CSS. Copied UI in other reachable consumers is evidence for composition demand, not installed-package use. No consumer repositories are changed.
- Require real isolated tarball installs for React without Next and for the observed framework imports; the old repository-symlink fixture is insufficient evidence of clean installation.
- GitHub deployment history confirms Vercel Production deployments for recent main commits. Main merge may deploy the brand site. Private vulnerability reporting and GitHub Pages are currently disabled; documentation must not promise either is active.

## Results and evidence

### Stage 1 — implemented and independently reviewed

- Frozen source: `27aea4a05ef83c23b28955e10915d947d4d4240b`; review compared against the fetched baseline. Public README/docs, MIT/full shadcn notice/OFL copies, support templates, metadata and portable explicit 21st command selection are implemented. Past evidence is anonymized without changing reviewed source hashes or numeric outcomes.
- Separate Sol high reviewer ran Python 8/8, local Chromium/axe helper 28/28, seven independent CLI probes (legacy Python launcher, spaced paths, explicit command, missing/empty executable and timeout), Markdown target and historical JSON preservation checks. No actionable findings. The orchestrator directly reran Python 8/8 and Node 28/28, baseline package units 37/37 and 40 contrast pairs, and the existing TypeScript check.
- Detailed dated scope/limits: [onboarding validation](../../design/public-onboarding-validation.md). Live 21st API/auth, native discovery, external generation and Supabase were not exercised. This focused current review does not retroactively approve all older workflow changes or external product quality.
- Carry forward: unknown website-art provenance, fetched site font notice, disabled private vulnerability reporting, final packed notice inclusion and source/npm version distinction. Original checkouts remain untouched.
- Local installation integration: backed up the existing user skill, copied the seven reviewed delivery files for revision `2026-10-02.1`, verified every file byte-for-byte and the existing Claude symlink, and passed skill-creator structural validation. The orchestrator reran Python 8/8 against the installed executable and Node 28/28 against the installed browser checker using temporary copies of the same tests with only project/target paths changed. Credentials, MCP configuration and unrelated skill files were untouched. Fresh native agent discovery and real API connection are separate unverified states.

### Browser availability probe

Chromium 153.0.8010.12 and Playwright WebKit 26.6 launched and rendered a local button. Installed Playwright Firefox 155.0 failed to launch on this Mac with `Could not find profile folder`, including an explicit temporary-profile probe. This is an environment failure, not a passing application check or Safari certification. Stage 3 will run available engines and retain a Firefox CI path and the local limitation.

### Deployment-boundary source lookup

The orchestrator used research-router capture/offline inspection to read Vercel's official [Git configuration](https://vercel.com/docs/project-configuration/git-configuration#git.deploymentenabled), updated 2026-08-25, accessed 2026-10-02 (relevant body range 8000–16000; retained full-body SHA-256 `aa659bde4ecfdcf3fcdea6ab5efffba8f2b2e4a7c71d862046379bd2bd3f0825`). A branch map can disable this review branch while leaving unspecified branches unchanged. Any matching true rule enables deployment, so do not add a wildcard true rule. Executor will add the branch-specific guard and public source record before any remote push. This documents intended behavior; actual no-deployment status must still be checked after pushing.

Further implementation, review, direct-check and publication results will be appended here with actual commands, scope and limits. Historical test counts are not carried forward as current evidence.

### Stage 3 carry-forward checks

- Storybook currently copies the website public directory. Documentation output must avoid redistributing unrelated site art with unknown provenance; use only necessary documentation assets and ship font/component notices with preview output.
- Keep the 11 existing families individually discoverable and document exact wrapper defaults and consumer responsibilities; native Radix behavior is not proof of assistive-technology testing.
- Test real zoom/reflow and forced-colors behavior where supported, without relabelling viewport shrinking as all browser zoom or emulation as Windows/Safari/screen-reader certification.

### Stage 3 inspection authority

The orchestrator read the installed Impeccable 4.4.0 skill and its audit/harden/craft guidance and executed its context loader against `.storybook/preview.tsx`. It found an existing approved design and no PRODUCT.md; this scoped documentation/accessibility work uses the incumbent DESIGN/tokens and does not require a new visual-world interview. The accepted brief overrides generic motion, type and palette advice. This is context loading and playbook inspection; the later browser/state work supplies execution evidence, not a blanket accessibility score.

### Stage 2 — implementation frozen; review pending

Executor reports fresh passing units 37, contrast 40, types, lint (one inherited site warning), token drift, package/site/Storybook builds, Chromium Workspace 8, helper Node 28/Python 8 and frozen installation. The actual archive contains 70 files / 284,492 unpacked bytes with 24 explicit deep entries and eight runtime dependencies. Both isolated npm tarball consumers build (React without Next; separate Next compatibility fixture). Root independently ran `pnpm check:package:boundary`, inspected the manifest/entry/import/consumer/CI/migration diffs and the actual dark Workspace screenshot. Root requested and executor reconciled stale migration claims about peers, dependency reduction and wildcard retention. DESIGN prose/tokens/component APIs remain unchanged; only two DESIGN link targets changed.

Prepared version 0.3.0 remains unpublished. The Vercel review-branch guard and verification-only GitHub workflow are implemented but not remotely exercised. Final expanded support claims and documentation assets are Stage 3. This implementation report is not independent review approval.

### Stage 2 — independent review complete

Frozen commit `8bbbdf62d9a3cc6794d2c5fcf7cfafeca034dbb8` was separately reviewed against Stage 1. Reviewer found no actionable spec/quality defects and independently built the package and clean React/Next tarball consumers, checked 37 units, 40 contrast pairs, types, lint, generated CSS drift and whitespace. Reviewer did not rerun site/Storybook/browser builds or claim visual inspection; those executor results and the root's actual screenshot inspection remain separately attributed. Remote CI/deployment behavior is still unexercised.

Stage 3 execution is unlocked. Ruling: verify consumer-owned local Pretendard/Japanese font delivery in the independent example without adding font packages to UI runtime dependencies — the clean-consumer acceptance includes font delivery; fallback alone is a distinct documented state. If font loading fails, report that failure rather than labelling fallback as loaded. Stage 4 is a fresh GPT-6.1 Sol/high executor created through Paseo after the internal collaboration thread capacity was reached; runtime metadata independently confirms its model/effective reasoning. Its read-only demand audit may run while Stage 3 implements, but changes wait for Stage 3 review.

Newly available Superpowers process guidance is applied to remaining delegation/review/final verification. The already reviewed stages are not re-dispatched. This existing task record remains the single public orchestration ledger, per the user's instruction; private task briefs/review artifacts are scratch evidence. No new visual-world decision or interview is needed for the approved scope.

### Stage 4 read-only demand proposal

The new executor traced route-reachable Tabs call sites in three distinct reachable products (one installed-package consumer and two copied-UI products), excluding worktrees, snapshots and wrapper definitions. Native multiline inputs repeat across one copied-UI product's brief/description, composer and correction/editor flows; another product's native file editor is corroborating multiline demand, not a second styled-wrapper adopter. Proposed minimal APIs: Radix Tabs/List/Trigger/Content forwarding existing props/ref/className; native Textarea props/ref with rows=2 and vertical resize defaults. No new dependencies, business orchestration, autosizing/send-on-Enter/editor logic or unsupported variant API. Root will verify the private source provenance before accepting implementation results.

Ruling: adopt the two evidenced minimal families after Stage 3 review, and solve FormField through label/help/error composition — actual repeated call sites support these boundaries without a form-state abstraction. RadioGroup is deferred: no existing RadioGroup/native-radio use was observed, but one routed product has candidate single-choice button composition. The guide must explain fieldset/legend + same-name radios, compact Select and action/toggle distinctions; absence of an existing wrapper is not absence of need. If the inferred common contracts are wrong, the cost is a small public API to maintain or revise; isolated examples and migration/API checks constrain that risk. No Stage 4 source writes are unlocked yet.

Composition documentation remains Stage 3-owned until its review. Stage 4 will inspect and extend the finished guide sequentially, avoiding simultaneous edits.

### Direct demand evidence check

Root verified all 36 inventory source/manifest SHA-256 records against current files and directly read route imports/render chains and representative Tabs/multiline/exclusive-choice call sites. Tabs in all three products is local/copied Radix usage, including inside the product that separately installs @naeil/ui 0.1.0; it is not adoption of a previously shipped package Tabs API. Four reached compositions across three products support the minimal shared contract. Multiple plain form/composer/correction fields support Textarea; consumer-owned autoresize and file-editor logic are outside its API. The candidate exclusive-choice workflow uses aria-pressed buttons, supporting the deferred-radio composition discussion. No live consumer execution or quality certification is inferred from this structural inspection. Private inventory digest `8ae4ed62fcc2842ef87f5da870a60f6e3a17d9f48bf3467b4f4a47c0785b1da8`; it is not a public runnable link or a credential record.

### Stage 3 reproduced defects and scope ruling

Expanded engine checks reproduced Switch thumb/track color collapse in Chromium forced-colors and whole-document axe findings for focusable aria-hidden background under opened modal menu/Select. Consumer long-action/text-scaling examples and transition/automatic-addon timing also need correction. Ruling: permit a shared internal inert coordinator and the corresponding compiled internal-only entry in `tsup.deep.config.ts`/build config — do not add a public export or alter the framework allowlist/API. Preserve previous inert state, nested/overlapping overlay lifetime and focus return; target Radix-managed hidden background rather than all consumer aria-hidden nodes. Cover default modal and explicit nonmodal behavior, nested close/restoration, trigger focus, consumer handlers/refs and existing inert state. If incorrect, this adds global focus interaction risk; focused engine regressions and the independent Stage 3 review must resolve it before proceeding. Do not suppress the axe rule or change modal defaults to obtain a pass.

Root also inspected the current preview output: repo/shadcn and font notices are copied, but complete bundled runtime dependency licenses were not visible. Stage 3 must verify and preserve notices for code actually bundled in the documentation artifact, and avoid unsupported claims that installation alone preserves them in a deployed bundle. This remains an open artifact check until corrected/reviewed. Consumer font OFL copying is already implemented in the example build.

### Coordination recovery

A toolset refresh removed the orchestrator's native collaboration messenger. Approval was retained in the task record and the executor's unlock marker linked a plain scope-ruling file; the original Stage 3 executor subsequently read it and continues the approved work. A freshly created Sol high completion-planning agent made no source edits/builds and is reserved for the independent frozen-source review instead; there is no competing implementation ownership. Stage 4 remains locked. This infrastructure event does not reset reviewed progress or justify duplicate broad implementation/review loops.

Native coordination is available again. Stage 3 is finishing notice collection, mixed-entry inert lifecycle checks and fresh complete artifact/browser verification before freeze. A failed build and the browser run against that incomplete output are not passing evidence. The independent reviewer has only performed read-only risk planning; final source review has not started.

### Preservation and publication checkpoint

The orchestrator rechecked the 11 original-main file hashes and complete dirty status: both match the saved baseline. The original worktree is clean. The seven installed skill delivery files still match reviewed source and the existing Claude link resolves correctly. Remote main remains `d963dc5c1bbd49a1159d445edbb4c30309d96db9`; npm still lists only 0.1.0/0.2.0 with latest 0.2.0. These are current read-only observations, not publication or deployment results.

### Stage 3 — implementation evidence and source freeze

The executor finalized [dated verification](../../design/public-ui-stage3-verification.md): 11 guides and built Docs/Usage pages, actual local fonts/fallback, preview-only assets and complete original notice bodies with explicitly recorded metadata/version limits; dispatch-only Pages preparation remains unexecuted. Reproduced Switch forced-colors and Radix-hidden background defects are repaired without changing the approved palette, token numbers, public exports or modal defaults. A document-owned registry coordinates mixed bundled/deep imports; production and confirmed development StrictMode replay checks cover overlap, both close orders, refs, forced removal and original inert restoration.

Fresh executor results: 37 units, 40 contrast pairs, types/lint/token drift/package builds, 111 Chromium/WebKit checks passed with one expected WebKit forced-colors skip; clean React/Next packed consumers passed. Final archive: 96 files / 369,506 unpacked bytes. Local Firefox fails before application launch; manual screen readers/native zoom/Windows high contrast/physical devices/actual Safari remain unrun. Source/notice limits are explicit rather than claimed resolved by automation.

Root directly reran 37 units, types, lint (zero errors, the same inherited site warning), all 40 contrast pairs and whitespace validation. Root opened the actual WebKit dark mobile Dialog, Chromium light 2560px workspace and Chromium forced-colors Switch images. All 15 report hashes and 72 changed executor-file hashes match current files; root's record is separately owned. The source is now committed for the separate Stage 3 review; no Stage 4 edits are unlocked and no remote actions have occurred.

### Stage 3 — independent review and focused correction

Separate Sol high review of frozen `80732074349b35d41e31b674f248171101481742` against Stage 2 completed: no core/package/deployment blocker, one P3 example finding. Avatar's named generic group/count divs do not convey the intended names; root confirmed the actual markup. A dedicated new Sol high executor owns only example semantics, corresponding guide/assertions and focused evidence, because the original executor's resume tool is unavailable. Stage 4 remains locked until this correction is verified and independently rechecked.

The reviewer independently passed 37 units, types/lint/40 contrast/token drift, actual package/clean consumers/Storybook, 111 Chromium/WebKit checks with one expected skip, and 30 additional in-memory overlay lifecycle/cancellation/nonmodal/StrictMode probes. It inspected fresh rendered captures and exact notices. Firefox's pre-application block was reproduced. Website build, remote execution/deployment and manual platforms were not run in this review; previous workflow revisions and Stage 4 are outside its assessment.

The focused executor corrected only the Avatar Usage composition, guide, assertions and dated follow-up evidence. Root inspected the complete four-file diff and replacement hashes, then directly ran the actual built Docs/Usage Avatar checks: 6/6 passed in Chromium/WebKit. The group has a supported named role and the visual count has actual accessible text; no package API/runtime/style/token changed. The earlier anchored grep selected no tests and supplies no validation evidence. This narrow correction is frozen next for independent scoped recheck; the original broad results remain dated evidence.
